using VeritasAgent;
using VeritasAgent.Services;
using VeritasAgent.Ui;

// MSI custom action / silent bootstrap:
// VeritasAgent.exe --write-bootstrap <apiUrl> <token> <family>
if (args.Length >= 1 && string.Equals(args[0], "--write-bootstrap", StringComparison.OrdinalIgnoreCase))
{
    var apiUrl = args.ElementAtOrDefault(1) ?? "";
    var token = args.ElementAtOrDefault(2) ?? "";
    var family = args.ElementAtOrDefault(3) ?? "ordinateurs";
    if (string.IsNullOrWhiteSpace(apiUrl) || string.IsNullOrWhiteSpace(token))
    {
        Console.Error.WriteLine("Usage: VeritasAgent.exe --write-bootstrap <apiUrl> <token> [family]");
        return 2;
    }
    ConfigStore.WriteBootstrap(apiUrl, token, family);
    Console.WriteLine("Bootstrap written.");
    return 0;
}

// Interactive setup wizard (launched by MSI after install, or manually)
if (args.Length >= 1 && (
        string.Equals(args[0], "--configure", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(args[0], "--setup", StringComparison.OrdinalIgnoreCase)))
{
    return SetupWizard.Run();
}

// If started interactively (not as a Windows service) and not configured yet, open the wizard.
if (!WindowsServiceHelpers.IsRunningAsService() && !IsConfigured())
{
    return SetupWizard.Run();
}

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddWindowsService(options =>
{
    options.ServiceName = AgentConstants.ServiceName;
});

builder.Logging.ClearProviders();
builder.Logging.AddEventLog(settings =>
{
    settings.SourceName = AgentConstants.ServiceName;
});
builder.Logging.AddConsole();
ConfigStore.EnsureDataDirectory();
builder.Logging.AddProvider(new FileLoggerProvider(AgentConstants.LogDir));

builder.Services.AddSingleton<ConfigStore>();
builder.Services.AddSingleton<AgentApiClient>();
builder.Services.AddSingleton<InventoryCollector>();
builder.Services.AddSingleton<AgentUpdater>();
builder.Services.AddHostedService<AgentWorker>();

using var mutex = new Mutex(true, AgentConstants.MutexName, out var createdNew);
if (!createdNew)
{
    Console.Error.WriteLine("Veritas Agent is already running.");
    return 1;
}

var host = builder.Build();
await host.RunAsync();
return 0;

static bool IsConfigured()
{
    try
    {
        if (File.Exists(AgentConstants.ConfigPath)) return true;
        if (File.Exists(AgentConstants.BootstrapPath)) return true;
        var legacy = Path.Combine(AgentConstants.LegacyProgramDataDir, "config.json");
        return File.Exists(legacy);
    }
    catch
    {
        return false;
    }
}

internal static class WindowsServiceHelpers
{
    public static bool IsRunningAsService()
    {
        try
        {
            // Session 0 + no interactive window station ≈ service context
            if (!Environment.UserInteractive) return true;
            var parent = ParentProcessName();
            return string.Equals(parent, "services", StringComparison.OrdinalIgnoreCase)
                   || string.Equals(parent, "svchost", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return !Environment.UserInteractive;
        }
    }

    private static string? ParentProcessName()
    {
        try
        {
            using var current = System.Diagnostics.Process.GetCurrentProcess();
            var query = $"SELECT ParentProcessId FROM Win32_Process WHERE ProcessId = {current.Id}";
            using var searcher = new System.Management.ManagementObjectSearcher(query);
            foreach (System.Management.ManagementObject obj in searcher.Get())
            {
                var ppid = Convert.ToInt32(obj["ParentProcessId"]);
                using var parent = System.Diagnostics.Process.GetProcessById(ppid);
                return parent.ProcessName;
            }
        }
        catch { /* ignore */ }
        return null;
    }
}
