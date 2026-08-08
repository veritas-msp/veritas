using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using VeritasAgent.Models;

namespace VeritasAgent.Services;

public sealed class ConfigStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public AgentConfig Load()
    {
        EnsureDataDirectory();
        LegacyMigrator.TryMigrate(this);

        AgentConfig config;
        if (File.Exists(AgentConstants.ConfigPath))
        {
            var protectedBytes = File.ReadAllBytes(AgentConstants.ConfigPath);
            var plain = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.LocalMachine);
            var json = Encoding.UTF8.GetString(plain);
            config = JsonSerializer.Deserialize<AgentConfig>(json, JsonOptions) ?? new AgentConfig();
        }
        else
        {
            config = new AgentConfig();
        }

        // Not enrolled yet: always refresh API URL / token / family from bootstrap
        // (reconfigure wizard writes bootstrap; an old config.dat must not win).
        if (string.IsNullOrWhiteSpace(config.AgentSecret))
        {
            var bootstrap = ReadBootstrap();
            if (bootstrap is not null)
            {
                if (!string.IsNullOrWhiteSpace(bootstrap.ApiUrl))
                    config.ApiUrl = bootstrap.ApiUrl.Trim().TrimEnd('/');
                if (!string.IsNullOrWhiteSpace(bootstrap.EnrollmentToken))
                    config.EnrollmentToken = bootstrap.EnrollmentToken.Trim();
                if (!string.IsNullOrWhiteSpace(bootstrap.EquipmentFamily))
                    config.EquipmentFamily = NormalizeFamily(bootstrap.EquipmentFamily);
            }
        }

        return config;
    }

    public void Save(AgentConfig config)
    {
        EnsureDataDirectory();
        var json = JsonSerializer.Serialize(config, JsonOptions);
        var plain = Encoding.UTF8.GetBytes(json);
        var protectedBytes = ProtectedData.Protect(plain, null, DataProtectionScope.LocalMachine);
        var tmp = AgentConstants.ConfigPath + ".tmp";
        File.WriteAllBytes(tmp, protectedBytes);
        File.Move(tmp, AgentConstants.ConfigPath, overwrite: true);
        TryRestrictAcl(AgentConstants.ProgramDataDir);

        // Clear plaintext bootstrap after secrets are persisted.
        if (!string.IsNullOrEmpty(config.AgentSecret) && File.Exists(AgentConstants.BootstrapPath))
        {
            try { File.Delete(AgentConstants.BootstrapPath); } catch { /* ignore */ }
        }
    }

    public static void WriteBootstrap(string apiUrl, string enrollmentToken, string equipmentFamily)
    {
        // Bootstrap only — do not touch logs/ACL that may block a non-service writer.
        // The Windows service (LocalSystem) creates logs and tightens ACL on first run.
        Directory.CreateDirectory(AgentConstants.ProgramDataDir);
        EnsureWritableDataAcl(AgentConstants.ProgramDataDir);

        var payload = new BootstrapConfig
        {
            ApiUrl = apiUrl.Trim().TrimEnd('/'),
            EnrollmentToken = enrollmentToken.Trim(),
            EquipmentFamily = NormalizeFamily(equipmentFamily)
        };
        var json = JsonSerializer.Serialize(payload, JsonOptions);

        try
        {
            File.WriteAllText(AgentConstants.BootstrapPath, json, Encoding.UTF8);
        }
        catch (UnauthorizedAccessException)
        {
            ResetDataAcl(AgentConstants.ProgramDataDir);
            File.WriteAllText(AgentConstants.BootstrapPath, json, Encoding.UTF8);
        }

        // Drop incomplete protected config so the service reloads this bootstrap.
        // Keep config.dat only when it already contains an agent secret (enrolled).
        try
        {
            if (File.Exists(AgentConstants.ConfigPath))
            {
                try
                {
                    var protectedBytes = File.ReadAllBytes(AgentConstants.ConfigPath);
                    var plain = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.LocalMachine);
                    var existing = JsonSerializer.Deserialize<AgentConfig>(Encoding.UTF8.GetString(plain), JsonOptions);
                    if (existing is null || string.IsNullOrWhiteSpace(existing.AgentSecret))
                        File.Delete(AgentConstants.ConfigPath);
                }
                catch
                {
                    File.Delete(AgentConstants.ConfigPath);
                }
            }
        }
        catch
        {
            // best-effort
        }
    }

    private static void ResetDataAcl(string path)
    {
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "icacls.exe",
                Arguments = $"\"{path}\" /inheritance:r /grant:r *S-1-5-32-544:(OI)(CI)F /grant:r *S-1-5-18:(OI)(CI)F /T",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using var proc = System.Diagnostics.Process.Start(psi);
            proc?.WaitForExit(15_000);
        }
        catch
        {
            EnsureWritableDataAcl(path);
        }
    }

    private static BootstrapConfig? ReadBootstrap()
    {
        if (!File.Exists(AgentConstants.BootstrapPath)) return null;
        try
        {
            return JsonSerializer.Deserialize<BootstrapConfig>(File.ReadAllText(AgentConstants.BootstrapPath), JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static string NormalizeFamily(string? family)
    {
        var value = (family ?? "ordinateurs").Trim().ToLowerInvariant();
        return value is "serveurs" or "servers" or "server" ? "serveurs" : "ordinateurs";
    }

    public static void EnsureDataDirectory()
    {
        Directory.CreateDirectory(AgentConstants.ProgramDataDir);
        try
        {
            Directory.CreateDirectory(AgentConstants.LogDir);
        }
        catch (UnauthorizedAccessException)
        {
            // Non-elevated UI may not create logs; the service will.
        }
        TryRestrictAcl(AgentConstants.ProgramDataDir);
    }

    /// <summary>
    /// Ensures Administrators + SYSTEM can write (and optionally the current user during setup).
    /// </summary>
    public static void EnsureWritableDataAcl(string path)
    {
        try
        {
            var dirInfo = new DirectoryInfo(path);
            var security = dirInfo.GetAccessControl();
            var inherit = InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit;
            var admins = new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null);
            var system = new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null);
            security.AddAccessRule(new FileSystemAccessRule(admins, FileSystemRights.FullControl, inherit, PropagationFlags.None, AccessControlType.Allow));
            security.AddAccessRule(new FileSystemAccessRule(system, FileSystemRights.FullControl, inherit, PropagationFlags.None, AccessControlType.Allow));
            // Allow elevated setup wizard (admin token) — already covered by Administrators.
            dirInfo.SetAccessControl(security);
        }
        catch
        {
            // Best-effort when not elevated.
        }
    }

    private static void TryRestrictAcl(string path)
    {
        try
        {
            var dirInfo = new DirectoryInfo(path);
            var security = dirInfo.GetAccessControl();
            security.SetAccessRuleProtection(true, false);
            var admins = new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null);
            var system = new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null);
            var inherit = InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit;
            security.AddAccessRule(new FileSystemAccessRule(admins, FileSystemRights.FullControl, inherit, PropagationFlags.None, AccessControlType.Allow));
            security.AddAccessRule(new FileSystemAccessRule(system, FileSystemRights.FullControl, inherit, PropagationFlags.None, AccessControlType.Allow));
            dirInfo.SetAccessControl(security);
        }
        catch
        {
            // ACL tightening is best-effort (e.g. non-elevated debug runs).
        }
    }
}
