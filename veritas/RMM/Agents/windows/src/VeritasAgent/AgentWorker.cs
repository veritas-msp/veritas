using System.Diagnostics;
using System.Net.NetworkInformation;
using Microsoft.Win32;
using VeritasAgent.Models;
using VeritasAgent.Services;

namespace VeritasAgent;

public sealed class AgentWorker : BackgroundService
{
    private const int CommandPollSeconds = 20;
    private const int FailRetryBaseSeconds = 5;
    private const int FailRetryMaxSeconds = 60;
    private const int ResumeSettleSeconds = 3;

    private readonly ILogger<AgentWorker> _logger;
    private readonly ConfigStore _store;
    private readonly AgentApiClient _api;
    private readonly InventoryCollector _inventory;
    private readonly AgentUpdater _updater;
    private readonly object _waitGate = new();
    private CancellationTokenSource? _waitCts;
    private int _failStreak;
    private int _resumePending;

    public AgentWorker(
        ILogger<AgentWorker> logger,
        ConfigStore store,
        AgentApiClient api,
        InventoryCollector inventory,
        AgentUpdater updater)
    {
        _logger = logger;
        _store = store;
        _api = api;
        _inventory = inventory;
        _updater = updater;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Veritas Agent {Version} starting", AgentConstants.AgentVersion);
        WriteEvent("Service starting — immediate heartbeat");

        SystemEvents.PowerModeChanged += OnPowerModeChanged;
        NetworkChange.NetworkAvailabilityChanged += OnNetworkAvailabilityChanged;

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (Interlocked.Exchange(ref _resumePending, 0) == 1)
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(ResumeSettleSeconds), stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                }

                var intervalMinutes = 5;
                var enrollFailed = false;
                var cycleOk = false;
                var shortRetryAfterUpdate = false;
                AgentConfig? config = null;
                try
                {
                    config = _store.Load();
                    intervalMinutes = Math.Clamp(config.HeartbeatIntervalMinutes <= 0 ? 5 : config.HeartbeatIntervalMinutes, 1, 1440);
                    shortRetryAfterUpdate = await RunCycleAsync(config, stoppingToken);
                    config = _store.Load();
                    intervalMinutes = Math.Clamp(config.HeartbeatIntervalMinutes <= 0 ? 5 : config.HeartbeatIntervalMinutes, 1, 1440);
                    cycleOk = true;
                    _failStreak = 0;
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    enrollFailed = ex.Message.Contains("Enrollment token", StringComparison.OrdinalIgnoreCase)
                                   || ex.Message.Contains("not configured", StringComparison.OrdinalIgnoreCase);
                    _failStreak = Math.Min(_failStreak + 1, 20);
                    _logger.LogError(ex, "Heartbeat cycle failed (streak {Streak})", _failStreak);
                    WriteEvent($"Cycle error: {ex.Message}", EventLogEntryType.Error);
                }

                // Retry faster when not enrolled yet (bad/stale token, waiting for reconfigure).
                if (enrollFailed)
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    continue;
                }

                // After a failed cycle (e.g. network not ready at boot), retry in seconds — not after the full heartbeat interval.
                TimeSpan delay;
                if (!cycleOk)
                {
                    var retrySeconds = Math.Min(FailRetryMaxSeconds, FailRetryBaseSeconds * Math.Max(1, _failStreak));
                    delay = TimeSpan.FromSeconds(retrySeconds);
                    _logger.LogInformation("Retrying heartbeat in {Seconds}s after failure", retrySeconds);
                }
                else if (shortRetryAfterUpdate)
                {
                    delay = TimeSpan.FromSeconds(15);
                    _logger.LogInformation("Short delay after force update attempt — retrying in 15s");
                }
                else
                {
                    delay = TimeSpan.FromMinutes(intervalMinutes) + TimeSpan.FromMilliseconds(Random.Shared.Next(0, 30_000));
                }

                config ??= _store.Load();
                using var waitCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                lock (_waitGate)
                {
                    _waitCts = waitCts;
                }

                try
                {
                    await WaitForNextCycleAsync(config, delay, waitCts.Token);
                }
                catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)
                {
                    // Wake/resume/network — loop immediately for a fresh heartbeat.
                    _logger.LogInformation("Wait interrupted — running heartbeat now");
                    WriteEvent("Wake signal — heartbeat now");
                }
                finally
                {
                    lock (_waitGate)
                    {
                        if (ReferenceEquals(_waitCts, waitCts))
                            _waitCts = null;
                    }
                }
            }
        }
        finally
        {
            SystemEvents.PowerModeChanged -= OnPowerModeChanged;
            NetworkChange.NetworkAvailabilityChanged -= OnNetworkAvailabilityChanged;
        }

        _logger.LogInformation("Veritas Agent stopping");
        WriteEvent("Service stopping");
    }

    private void OnPowerModeChanged(object? sender, PowerModeChangedEventArgs e)
    {
        if (e.Mode != PowerModes.Resume)
            return;
        Interlocked.Exchange(ref _resumePending, 1);
        RequestImmediateCycle("power resume");
    }

    private void OnNetworkAvailabilityChanged(object? sender, NetworkAvailabilityEventArgs e)
    {
        if (!e.IsAvailable)
            return;
        RequestImmediateCycle("network available");
    }

    private void RequestImmediateCycle(string reason)
    {
        _logger.LogInformation("Immediate cycle requested: {Reason}", reason);
        WriteEvent($"Immediate cycle: {reason}");
        lock (_waitGate)
        {
            try
            {
                _waitCts?.Cancel();
            }
            catch
            {
                // ignored
            }
        }
    }

    /// <summary>
    /// Sleep until the next heartbeat, polling /rmm/agent/commands every ~20s
    /// so a full sync request can run without waiting for the full interval.
    /// Cancelled early on power resume / network restore.
    /// </summary>
    private async Task WaitForNextCycleAsync(AgentConfig config, TimeSpan totalDelay, CancellationToken ct)
    {
        var waitStartedAt = DateTime.UtcNow;
        var deadline = waitStartedAt + totalDelay;
        while (!ct.IsCancellationRequested)
        {
            var remaining = deadline - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero)
                return;

            var sliceSeconds = Math.Min(CommandPollSeconds, Math.Max(1, remaining.TotalSeconds));
            await Task.Delay(TimeSpan.FromSeconds(sliceSeconds), ct);

            config = _store.Load();
            if (string.IsNullOrWhiteSpace(config.ApiUrl) || string.IsNullOrWhiteSpace(config.AgentSecret))
                continue;

            try
            {
                var commands = await _api.FetchCommandsAsync(config.ApiUrl, config.AgentSecret!, ct);
                if (commands.HeartbeatIntervalMinutes is int minutes and > 0)
                {
                    var clamped = Math.Clamp(minutes, 1, 1440);
                    if (clamped != config.HeartbeatIntervalMinutes)
                    {
                        _logger.LogInformation("Heartbeat interval updated via command poll: {Old} → {New} min",
                            config.HeartbeatIntervalMinutes, clamped);
                        config.HeartbeatIntervalMinutes = clamped;
                        _store.Save(config);
                        var revisedDeadline = waitStartedAt + TimeSpan.FromMinutes(clamped);
                        if (revisedDeadline < deadline)
                            deadline = revisedDeadline;
                    }
                }

                if (commands.ForceUpdateRequested)
                {
                    var latest = commands.LatestAgentVersion ?? config.LatestServerVersion;
                    _logger.LogInformation("Forced agent update requested via command poll");
                    WriteEvent("Agent update requested (command poll)");
                    await _updater.TryUpdateAsync(config, latest, ct, force: true);
                    // MSI usually stops this process. If we are still alive, heartbeat now to report status.
                    try
                    {
                        await HeartbeatCycleAsync(config, ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Post-update heartbeat failed");
                    }
                    return;
                }

                if (commands.ImmediateHeartbeatRequested)
                {
                    _logger.LogInformation("Immediate heartbeat requested via command poll");
                    WriteEvent("Immediate heartbeat requested (command poll)");
                    return;
                }

                if (!commands.FullSyncRequested)
                    continue;

                _logger.LogInformation("Full sync requested via command poll — running immediately");
                WriteEvent("Full sync requested (command poll)");
                await RunFullSyncAsync(config, ct);
                // Resume normal heartbeat cadence on the next loop iteration.
                return;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (AgentAuthException ex)
            {
                _logger.LogWarning(ex, "Command poll auth failed");
                return;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Command poll failed");
            }
        }

        ct.ThrowIfCancellationRequested();
    }

    private async Task<bool> RunCycleAsync(AgentConfig config, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(config.ApiUrl))
            throw new InvalidOperationException("Agent is not configured (missing API URL). Reinstall with msiexec properties APIURL/TOKEN/FAMILY.");

        if (string.IsNullOrWhiteSpace(config.AgentSecret))
        {
            config = await EnrollAsync(config, ct);
        }

        try
        {
            return await HeartbeatCycleAsync(config, ct);
        }
        catch (AgentAuthException ex)
        {
            _logger.LogWarning(ex, "Auth failed — attempting re-enrollment");
            config.AgentSecret = null;
            _store.Save(config);
            if (string.IsNullOrWhiteSpace(config.EnrollmentToken))
                throw new InvalidOperationException("Agent revoked. Reinstall with a new enrollment token.");
            config = await EnrollAsync(config, ct);
            return await HeartbeatCycleAsync(config, ct);
        }
    }

    private async Task<AgentConfig> EnrollAsync(AgentConfig config, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(config.EnrollmentToken))
            throw new InvalidOperationException("Enrollment token missing. Run VeritasAgent.exe --configure.");

        _logger.LogInformation("Enrolling with server {ApiUrl}", config.ApiUrl);
        var response = await _api.EnrollAsync(config.ApiUrl, new EnrollRequest
        {
            EnrollmentToken = config.EnrollmentToken!,
            MachineId = MachineIdProvider.GetMachineId(),
            Hostname = Environment.MachineName,
            AgentVersion = AgentConstants.AgentVersion,
            EquipmentFamily = config.EquipmentFamily
        }, ct);

        config.AgentSecret = response.AgentSecret;
        config.AgentId = response.AgentId;
        config.ClientId = response.ClientId;
        ApplyRemoteConfig(config, response.Config);
        _store.Save(config);
        _logger.LogInformation("Enrollment succeeded for client {ClientId}", config.ClientId);
        WriteEvent($"Enrolled client={config.ClientId}");
        return config;
    }

    private async Task<bool> HeartbeatCycleAsync(AgentConfig config, CancellationToken ct)
    {
        var light = _inventory.Collect(config.Collectors, "light");
        var response = await _api.HeartbeatAsync(config.ApiUrl, config.AgentSecret!, new HeartbeatRequest
        {
            AgentVersion = AgentConstants.AgentVersion,
            Hostname = light["hostname"] as string ?? Environment.MachineName,
            Inventory = light
        }, ct);

        ApplyRemoteConfig(config, response.Config);
        _store.Save(config);
        WriteEvent("Heartbeat OK");

        if (response.Config?.FullSyncRequested == true)
        {
            _logger.LogInformation("Full sync requested by server");
            await RunFullSyncAsync(config, ct);
        }

        var latest = response.Config?.LatestAgentVersion ?? response.Config?.AgentVersion;
        var forceUpdate = response.Config?.ForceUpdateRequested == true;
        await _updater.TryUpdateAsync(config, latest, ct, force: forceUpdate);
        // If forced update left us running (download/install delayed), contact again soon.
        if (forceUpdate)
        {
            _logger.LogInformation("Force update path finished while process still alive — next cycle soon");
            WriteEvent("Force update still running — short retry");
            return true;
        }
        return false;
    }

    private async Task RunFullSyncAsync(AgentConfig config, CancellationToken ct)
    {
        var full = _inventory.Collect(config.Collectors, "full");
        var fullResponse = await _api.HeartbeatAsync(config.ApiUrl, config.AgentSecret!, new HeartbeatRequest
        {
            AgentVersion = AgentConstants.AgentVersion,
            Hostname = full["hostname"] as string ?? Environment.MachineName,
            Inventory = full
        }, ct);
        ApplyRemoteConfig(config, fullResponse.Config);
        _store.Save(config);
        WriteEvent("Full sync completed");
    }

    private static void ApplyRemoteConfig(AgentConfig config, AgentRemoteConfig? remote)
    {
        if (remote is null) return;
        if (remote.Collectors is not null)
            config.Collectors = new Dictionary<string, bool>(remote.Collectors, StringComparer.OrdinalIgnoreCase);
        if (remote.HeartbeatIntervalMinutes is int minutes and > 0)
            config.HeartbeatIntervalMinutes = Math.Clamp(minutes, 1, 1440);
        if (remote.AutoUpdateEnabled is bool autoUpdate)
            config.AutoUpdateEnabled = autoUpdate;
        if (!string.IsNullOrWhiteSpace(remote.LatestAgentVersion))
            config.LatestServerVersion = remote.LatestAgentVersion;
        else if (!string.IsNullOrWhiteSpace(remote.AgentVersion))
            config.LatestServerVersion = remote.AgentVersion;
    }

    private static void WriteEvent(string message, EventLogEntryType type = EventLogEntryType.Information)
    {
        try
        {
            if (!EventLog.SourceExists(AgentConstants.ServiceName))
                EventLog.CreateEventSource(AgentConstants.ServiceName, "Application");
            EventLog.WriteEntry(AgentConstants.ServiceName, message, type);
        }
        catch
        {
            // Event log may require elevation the first time; file logging still works via ILogger.
        }
    }
}
