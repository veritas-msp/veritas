using System.Text.Json;
using VeritasAgent.Models;

namespace VeritasAgent.Services;

/// <summary>Migrates legacy PowerShell agent config (%ProgramData%\VeritasAgent\config.json).</summary>
public static class LegacyMigrator
{
    public static void TryMigrate(ConfigStore store)
    {
        if (File.Exists(AgentConstants.ConfigPath)) return;
        var legacyPath = Path.Combine(AgentConstants.LegacyProgramDataDir, "config.json");
        if (!File.Exists(legacyPath)) return;

        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(legacyPath));
            var root = doc.RootElement;
            var config = new AgentConfig
            {
                ApiUrl = root.TryGetProperty("apiUrl", out var api) ? api.GetString() ?? "" : "",
                EnrollmentToken = root.TryGetProperty("enrollmentToken", out var tok) ? tok.GetString() : null,
                AgentSecret = root.TryGetProperty("agentSecret", out var sec) ? sec.GetString() : null,
                AgentId = root.TryGetProperty("agentId", out var aid) ? aid.GetString() : null,
                ClientId = root.TryGetProperty("clientId", out var cid) ? cid.GetString() : null,
                HeartbeatIntervalMinutes = root.TryGetProperty("heartbeatIntervalMinutes", out var hb) && hb.TryGetInt32(out var minutes)
                    ? Math.Clamp(minutes, 1, 1440)
                    : 5
            };

            if (root.TryGetProperty("collectors", out var collectors) && collectors.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in collectors.EnumerateObject())
                {
                    if (prop.Value.ValueKind is JsonValueKind.True or JsonValueKind.False)
                        config.Collectors[prop.Name] = prop.Value.GetBoolean();
                }
            }

            if (string.IsNullOrWhiteSpace(config.ApiUrl)) return;
            store.Save(config);
            TryRemoveLegacyScheduledTask();
        }
        catch
        {
            // Leave legacy file in place if migration fails.
        }
    }

    private static void TryRemoveLegacyScheduledTask()
    {
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "schtasks.exe",
                Arguments = "/Delete /TN \"VeritasAgentHeartbeat\" /F",
                CreateNoWindow = true,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using var proc = System.Diagnostics.Process.Start(psi);
            proc?.WaitForExit(15_000);
        }
        catch
        {
            // ignore
        }
    }
}
