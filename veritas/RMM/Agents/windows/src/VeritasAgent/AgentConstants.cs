namespace VeritasAgent;

internal static class AgentConstants
{
    public const string ServiceName = "VeritasAgent";
    public const string AgentVersion = "1.0.13";
    public const string MutexName = @"Global\VeritasAgentSingleton";

    public static string ProgramDataDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Veritas", "Agent");

    public static string LegacyProgramDataDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "VeritasAgent");

    public static string ConfigPath => Path.Combine(ProgramDataDir, "config.dat");
    public static string BootstrapPath => Path.Combine(ProgramDataDir, "bootstrap.json");
    public static string LogDir => Path.Combine(ProgramDataDir, "logs");
}
