using System.Diagnostics;
using System.Globalization;
using VeritasAgent.Models;

namespace VeritasAgent.Services;

public sealed class AgentUpdater
{
    private readonly AgentApiClient _api;
    private readonly ILogger<AgentUpdater> _logger;

    public AgentUpdater(AgentApiClient api, ILogger<AgentUpdater> logger)
    {
        _api = api;
        _logger = logger;
    }

    public async Task TryUpdateAsync(AgentConfig config, string? latestVersion, CancellationToken ct, bool force = false)
    {
        if (string.IsNullOrWhiteSpace(config.AgentSecret) || string.IsNullOrWhiteSpace(latestVersion))
            return;
        if (!force && !config.AutoUpdateEnabled)
        {
            _logger.LogDebug("Auto-update disabled by server settings — skipping {Latest}", latestVersion);
            return;
        }
        if (!IsNewer(latestVersion, AgentConstants.AgentVersion))
            return;

        if (force)
            _logger.LogInformation("Forced update requested: {Latest} (current {Current})", latestVersion, AgentConstants.AgentVersion);
        else
            _logger.LogInformation("Update available: {Latest} (current {Current})", latestVersion, AgentConstants.AgentVersion);
        ConfigStore.EnsureDataDirectory();
        var msiPath = Path.Combine(AgentConstants.ProgramDataDir, $"VeritasAgent-Update-{latestVersion}.msi");
        try
        {
            await _api.DownloadMsiAsync(config.ApiUrl, config.AgentSecret!, msiPath, ct);
            var args = $"/i \"{msiPath}\" /qn REBOOT=ReallySuppress /L*v \"{Path.Combine(AgentConstants.LogDir, "update.log")}\"";
            var psi = new ProcessStartInfo
            {
                FileName = "msiexec.exe",
                Arguments = args,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var proc = Process.Start(psi);
            // Do not wait forever — upgrade will stop this process.
            _logger.LogInformation("Started silent MSI update");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Self-update failed");
            try { if (File.Exists(msiPath)) File.Delete(msiPath); } catch { /* ignore */ }
        }
    }

    public static bool IsNewer(string candidate, string current)
    {
        if (!Version.TryParse(Normalize(candidate), out var next)) return false;
        if (!Version.TryParse(Normalize(current), out var cur)) return true;
        return next > cur;
    }

    private static string Normalize(string version)
    {
        var parts = version.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        while (parts.Length < 3) parts = parts.Append("0").ToArray();
        return string.Join('.', parts.Take(4));
    }
}
