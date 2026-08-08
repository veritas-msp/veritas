using System.Management;
using System.Security.Cryptography;
using System.Text;

namespace VeritasAgent.Services;

public static class MachineIdProvider
{
    public static string GetMachineId()
    {
        var uuid = QueryFirst("SELECT UUID FROM Win32_ComputerSystemProduct", "UUID") ?? "";
        var serial = QueryFirst("SELECT SerialNumber FROM Win32_BIOS", "SerialNumber") ?? "";
        var raw = $"{uuid}|{serial}|{Environment.MachineName}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static string? QueryFirst(string wql, string property)
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(wql);
            foreach (ManagementObject obj in searcher.Get())
            {
                using (obj)
                {
                    var value = obj[property]?.ToString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(value)) return value;
                }
            }
        }
        catch
        {
            // ignore
        }
        return null;
    }
}
