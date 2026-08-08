using System.Management;
using System.Runtime.Versioning;
using Microsoft.Win32;

namespace VeritasAgent.Services;

[SupportedOSPlatform("windows")]
public sealed class InventoryCollector
{
    private static readonly HashSet<string> LightCollectors = new(StringComparer.OrdinalIgnoreCase)
    {
        "os", "domain", "session", "network", "hardware", "updates", "performance", "sensors", "security"
    };

    private static readonly HashSet<string> FullOnlyCollectors = new(StringComparer.OrdinalIgnoreCase)
    {
        "chassis", "license", "printers", "shares", "services", "peripherals", "software"
    };

    public Dictionary<string, object?> Collect(IReadOnlyDictionary<string, bool> collectors, string mode)
    {
        var isFull = string.Equals(mode, "full", StringComparison.OrdinalIgnoreCase);
        var inventory = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["machineId"] = MachineIdProvider.GetMachineId(),
            ["hostname"] = Environment.MachineName,
            ["inventoryMode"] = isFull ? "full" : "light",
            ["collectedAt"] = DateTime.UtcNow.ToString("o"),
            ["agentVersion"] = AgentConstants.AgentVersion
        };

        bool Runs(string key, bool defaultEnabled = true)
        {
            if (collectors.TryGetValue(key, out var enabled)) return enabled;
            return defaultEnabled;
        }

        bool Include(string key)
        {
            if (!Runs(key, key != "software")) return false;
            if (isFull) return true;
            return LightCollectors.Contains(key);
        }

        if (Include("os")) CollectOs(inventory);
        if (Include("domain")) CollectDomain(inventory);
        if (Include("session")) CollectSession(inventory);
        if (Include("network")) CollectNetwork(inventory, isFull);
        if (Include("chassis")) CollectChassis(inventory);
        if (Include("hardware")) CollectHardware(inventory, isFull);
        if (Include("updates")) CollectUpdates(inventory, isFull);
        if (Include("license")) CollectLicense(inventory);
        if (Include("performance")) CollectPerformance(inventory);
        if (Include("sensors")) CollectSensors(inventory);
        if (Include("security")) CollectSecurity(inventory);
        if (isFull && Include("printers")) CollectPrinters(inventory);
        if (isFull && Include("shares")) CollectShares(inventory);
        if (isFull && Include("services")) CollectServices(inventory);
        if (isFull && Include("peripherals")) CollectPeripherals(inventory);
        if (isFull && Include("software")) CollectSoftware(inventory);

        return inventory;
    }

    private static void CollectOs(Dictionary<string, object?> inventory)
    {
        var os = QueryObjects("SELECT * FROM Win32_OperatingSystem").FirstOrDefault();
        if (os is null) return;
        var versionDetails = ReadWindowsVersionDetails();
        var displayVersion = versionDetails.displayVersion;
        var caption = Str(os, "Caption");
        inventory["os"] = new Dictionary<string, object?>
        {
            ["name"] = caption,
            ["version"] = Str(os, "Version"),
            ["build"] = Str(os, "BuildNumber"),
            ["displayVersion"] = displayVersion,
            ["ubr"] = versionDetails.ubr,
            ["editionId"] = versionDetails.editionId,
            ["arch"] = Str(os, "OSArchitecture"),
            ["installDate"] = CimDate(os, "InstallDate"),
            ["lastBoot"] = CimDate(os, "LastBootUpTime"),
            ["locale"] = Str(os, "Locale"),
            ["countryCode"] = Str(os, "CountryCode"),
            ["registeredUser"] = Str(os, "RegisteredUser")
        };
        inventory["systeme"] = string.IsNullOrWhiteSpace(displayVersion) ? caption : $"{caption} ({displayVersion})";
    }

    private static void CollectDomain(Dictionary<string, object?> inventory)
    {
        var cs = QueryObjects("SELECT * FROM Win32_ComputerSystem").FirstOrDefault();
        if (cs is null) return;
        var joined = Bool(cs, "PartOfDomain");
        var domainName = joined ? Str(cs, "Domain") : Str(cs, "Workgroup");
        inventory["domain"] = new Dictionary<string, object?>
        {
            ["joined"] = joined,
            ["name"] = domainName,
            ["workgroup"] = Str(cs, "Workgroup"),
            ["pcSystemType"] = cs["PCSystemType"]
        };
        inventory["domaine"] = domainName;
    }

    private static void CollectSession(Dictionary<string, object?> inventory)
    {
        var cs = QueryObjects("SELECT UserName FROM Win32_ComputerSystem").FirstOrDefault();
        var user = Str(cs, "UserName");
        if (!string.IsNullOrWhiteSpace(user)) inventory["loggedUser"] = user;
        inventory["session"] = new Dictionary<string, object?> { ["user"] = user };
    }

    private static void CollectNetwork(Dictionary<string, object?> inventory, bool full)
    {
        var adapters = QueryObjects("SELECT * FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled = TRUE")
            .Select(obj =>
            {
                var ips = ToStringArray(obj["IPAddress"]).Where(ip => ip.Contains('.')).ToArray();
                return new Dictionary<string, object?>
                {
                    ["description"] = Str(obj, "Description"),
                    ["ip"] = string.Join(", ", ips),
                    ["mac"] = Str(obj, "MACAddress"),
                    ["gateway"] = string.Join(", ", ToStringArray(obj["DefaultIPGateway"])),
                    ["dhcp"] = Bool(obj, "DHCPEnabled"),
                    ["dns"] = string.Join(", ", ToStringArray(obj["DNSServerSearchOrder"]))
                };
            }).ToList();

        var nic = adapters.FirstOrDefault(a => !string.IsNullOrWhiteSpace(a["gateway"] as string))
                  ?? adapters.FirstOrDefault();
        if (nic is null) return;

        var primaryIp = ((nic["ip"] as string) ?? "").Split(',')[0].Trim();
        var network = new Dictionary<string, object?>
        {
            ["ip"] = primaryIp,
            ["mac"] = nic["mac"],
            ["dns"] = nic["dns"],
            ["gateway"] = nic["gateway"],
            ["dhcp"] = nic["dhcp"]
        };
        if (full) network["adapters"] = adapters;
        inventory["network"] = network;
        inventory["ip"] = primaryIp;
        inventory["mac"] = nic["mac"];
    }

    private static void CollectChassis(Dictionary<string, object?> inventory)
    {
        var cs = QueryObjects("SELECT Manufacturer, Model FROM Win32_ComputerSystem").FirstOrDefault();
        var bios = QueryObjects("SELECT SerialNumber FROM Win32_BIOS").FirstOrDefault();
        var enclosure = QueryObjects("SELECT ChassisTypes FROM Win32_SystemEnclosure").FirstOrDefault();
        var manufacturer = NormalizeText(Str(cs, "Manufacturer"));
        var model = NormalizeText(Str(cs, "Model"));
        var serial = NormalizeText(Str(bios, "SerialNumber"));
        if (manufacturer is null && model is null && serial is null) return;

        inventory["chassis"] = new Dictionary<string, object?>
        {
            ["manufacturer"] = manufacturer,
            ["model"] = model,
            ["serialNumber"] = serial,
            ["chassisTypes"] = ToIntArray(enclosure?["ChassisTypes"])
        };
        if (manufacturer is not null)
        {
            inventory["fabricant"] = manufacturer;
            inventory["marque"] = manufacturer;
            inventory["manufacturer"] = manufacturer;
        }
        if (model is not null)
        {
            inventory["modele"] = model;
            inventory["model"] = model;
        }
        if (serial is not null)
        {
            inventory["numeroSerie"] = serial;
            inventory["serial"] = serial;
        }
    }

    private static void CollectHardware(Dictionary<string, object?> inventory, bool full)
    {
        var cpu = QueryObjects("SELECT * FROM Win32_Processor").FirstOrDefault();
        var mem = QueryObjects("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem").FirstOrDefault();
        var disks = QueryObjects("SELECT * FROM Win32_LogicalDisk WHERE DriveType = 3")
            .Select(d => new Dictionary<string, object?>
            {
                ["drive"] = Str(d, "DeviceID"),
                ["device"] = Str(d, "DeviceID"),
                ["sizeGB"] = BytesToGb(d["Size"]),
                ["freeGB"] = BytesToGb(d["FreeSpace"]),
                ["fileSystem"] = Str(d, "FileSystem"),
                ["volumeName"] = Str(d, "VolumeName")
            }).ToList();

        var ramGb = mem is null ? null : BytesToGb(mem["TotalPhysicalMemory"]);
        var ramModules = QueryObjects("SELECT Capacity, Speed, Manufacturer, PartNumber, BankLabel, DeviceLocator, FormFactor, MemoryType FROM Win32_PhysicalMemory")
            .Select(m =>
            {
                var capacityGb = BytesToGb(m["Capacity"]);
                return new Dictionary<string, object?>
                {
                    ["capacityGB"] = capacityGb,
                    ["speedMHz"] = ToInt(m["Speed"]),
                    ["manufacturer"] = NormalizeText(Str(m, "Manufacturer")),
                    ["partNumber"] = NormalizeText(Str(m, "PartNumber")),
                    ["bank"] = Str(m, "BankLabel"),
                    ["locator"] = Str(m, "DeviceLocator"),
                    ["formFactor"] = ToInt(m["FormFactor"]),
                    ["memoryType"] = ToInt(m["MemoryType"])
                };
            })
            .Where(m => m["capacityGB"] is double gb && gb > 0)
            .ToList();
        var memoryArray = QueryObjects("SELECT MemoryDevices, MaxCapacity FROM Win32_PhysicalMemoryArray").FirstOrDefault();
        var ramSlotCount = ToInt(memoryArray?["MemoryDevices"]);
        if (ramSlotCount is null or <= 0)
            ramSlotCount = Math.Max(ramModules.Count, 1);

        var hardware = new Dictionary<string, object?>
        {
            ["cpu"] = Str(cpu, "Name"),
            ["cores"] = cpu?["NumberOfCores"],
            ["logicalProcessors"] = cpu?["NumberOfLogicalProcessors"],
            ["maxClockMHz"] = cpu?["MaxClockSpeed"],
            ["currentClockMHz"] = cpu?["CurrentClockSpeed"],
            ["ramGB"] = ramGb,
            ["ramModules"] = ramModules,
            ["ramSlotCount"] = ramSlotCount,
            ["disks"] = disks
        };

        if (full)
        {
            hardware["physicalDisks"] = QueryObjects("SELECT Model, Size, InterfaceType, Status FROM Win32_DiskDrive")
                .Select(d => new Dictionary<string, object?>
                {
                    ["model"] = NormalizeText(Str(d, "Model")),
                    ["sizeGB"] = BytesToGb(d["Size"]),
                    ["interface"] = Str(d, "InterfaceType"),
                    ["status"] = Str(d, "Status")
                }).ToList();
            hardware["gpus"] = QueryObjects("SELECT Name, DriverVersion, AdapterRAM, CurrentHorizontalResolution, CurrentVerticalResolution FROM Win32_VideoController")
                .Where(g =>
                {
                    var name = Str(g, "Name") ?? "";
                    return name.Length > 0 && !name.Contains("Microsoft Basic", StringComparison.OrdinalIgnoreCase)
                           && !name.Contains("Remote Desktop", StringComparison.OrdinalIgnoreCase);
                })
                .Select(g => new Dictionary<string, object?>
                {
                    ["name"] = Str(g, "Name"),
                    ["driver"] = Str(g, "DriverVersion"),
                    ["ramMB"] = ToAdapterRamMb(g["AdapterRAM"]),
                    ["resolution"] = g["CurrentHorizontalResolution"] is not null && g["CurrentVerticalResolution"] is not null
                        ? $"{g["CurrentHorizontalResolution"]}x{g["CurrentVerticalResolution"]}"
                        : null
                }).ToList();
        }

        inventory["hardware"] = hardware;
        if (cpu is not null) inventory["processeur"] = Str(cpu, "Name");
        if (ramGb is not null) inventory["memoire"] = $"{ramGb} GB";
    }

    private static void CollectUpdates(Dictionary<string, object?> inventory, bool full)
    {
        var hotfixes = QueryObjects("SELECT HotFixID, InstalledOn, Description FROM Win32_QuickFixEngineering")
            .Take(15)
            .Select(h => new Dictionary<string, object?>
            {
                ["HotFixID"] = Str(h, "HotFixID"),
                ["InstalledOn"] = Str(h, "InstalledOn"),
                ["Description"] = Str(h, "Description")
            }).ToList();

        var rebootRequired = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") is not null
            || Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending") is not null;

        var updates = new Dictionary<string, object?>
        {
            ["recentHotfixes"] = hotfixes,
            ["rebootRequired"] = rebootRequired
        };
        if (full)
        {
            updates["pending"] = false;
            updates["pendingItems"] = Array.Empty<object>();
            updates["driverItems"] = Array.Empty<object>();
            updates["pendingCount"] = 0;
            updates["driverCount"] = 0;
        }
        inventory["updates"] = updates;
    }

    private static void CollectLicense(Dictionary<string, object?> inventory)
    {
        const string windowsAppId = "55c92734-d682-4d71-983e-04159f45f795";
        var license = QueryObjects("SELECT Name, LicenseStatus, PartialProductKey, ApplicationID FROM SoftwareLicensingProduct")
            .FirstOrDefault(o => string.Equals(Str(o, "ApplicationID"), windowsAppId, StringComparison.OrdinalIgnoreCase)
                                 && !string.IsNullOrWhiteSpace(Str(o, "PartialProductKey")));
        if (license is null) return;
        var status = ToInt(license["LicenseStatus"]);
        inventory["license"] = new Dictionary<string, object?>
        {
            ["edition"] = Str(license, "Name"),
            ["name"] = Str(license, "Name"),
            ["activated"] = status == 1,
            ["status"] = status,
            ["partialKey"] = Str(license, "PartialProductKey")
        };
    }

    private static void CollectPerformance(Dictionary<string, object?> inventory)
    {
        var os = QueryObjects("SELECT TotalVisibleMemorySize, FreePhysicalMemory, LastBootUpTime FROM Win32_OperatingSystem").FirstOrDefault();
        var cpus = QueryObjects("SELECT LoadPercentage FROM Win32_Processor");
        double? cpuLoad = null;
        var loads = cpus.Select(c => ToDouble(c["LoadPercentage"])).Where(v => v is not null).Select(v => v!.Value).ToList();
        if (loads.Count > 0) cpuLoad = Math.Round(loads.Average(), 1);

        double? ramTotal = null, ramFree = null, ramUsed = null, ramPct = null;
        if (os is not null)
        {
            var totalKb = ToDouble(os["TotalVisibleMemorySize"]) ?? 0;
            var freeKb = ToDouble(os["FreePhysicalMemory"]) ?? 0;
            if (totalKb > 0)
            {
                ramTotal = Math.Round(totalKb / 1024.0 / 1024.0, 1);
                ramFree = Math.Round(freeKb / 1024.0 / 1024.0, 1);
                ramUsed = Math.Round((totalKb - freeKb) / 1024.0 / 1024.0, 1);
                ramPct = Math.Round(((totalKb - freeKb) / totalKb) * 100.0, 1);
            }
        }

        int? uptime = null;
        var bootIso = CimDate(os, "LastBootUpTime");
        if (bootIso is not null && DateTime.TryParse(bootIso, out var boot))
            uptime = (int)Math.Max(0, (DateTime.UtcNow - boot.ToUniversalTime()).TotalSeconds);

        inventory["performance"] = new Dictionary<string, object?>
        {
            ["cpuUsagePct"] = cpuLoad,
            ["ramUsagePct"] = ramPct,
            ["ramTotalGB"] = ramTotal,
            ["ramUsedGB"] = ramUsed,
            ["ramFreeGB"] = ramFree,
            ["uptimeSeconds"] = uptime,
            ["processCount"] = System.Diagnostics.Process.GetProcesses().Length
        };
    }

    private static void CollectSensors(Dictionary<string, object?> inventory)
    {
        var sensors = new List<Dictionary<string, object?>>();
        try
        {
            var zoneIndex = 0;
            foreach (var zone in QueryObjects("root\\wmi", "SELECT CurrentTemperature FROM MSAcpi_ThermalZoneTemperature"))
            {
                zoneIndex++;
                var celsius = KelvinTenthToCelsius(zone["CurrentTemperature"]);
                if (celsius is null) continue;
                sensors.Add(new Dictionary<string, object?>
                {
                    ["name"] = $"Thermal zone {zoneIndex}",
                    ["type"] = "thermal",
                    ["value"] = celsius,
                    ["unit"] = "C"
                });
            }
        }
        catch { /* optional */ }

        try
        {
            var battery = QueryObjects("SELECT EstimatedChargeRemaining, BatteryStatus FROM Win32_Battery").FirstOrDefault();
            if (battery is not null)
            {
                sensors.Add(new Dictionary<string, object?>
                {
                    ["name"] = "Battery",
                    ["type"] = "battery",
                    ["value"] = battery["EstimatedChargeRemaining"],
                    ["unit"] = "%",
                    ["status"] = battery["BatteryStatus"]
                });
            }
        }
        catch { /* optional */ }

        inventory["sensors"] = sensors;
    }

    private static void CollectSecurity(Dictionary<string, object?> inventory)
    {
        var defender = false;
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows Defender\Real-Time Protection");
            defender = key?.GetValue("DisableRealtimeMonitoring") is int v ? v == 0 : true;
        }
        catch { /* ignore */ }

        var firewall = QueryObjects("SELECT Enabled FROM Root\\SecurityCenter2\\FirewallProduct").Any()
            || QueryObjects("SELECT * FROM Win32_Service WHERE Name = 'mpssvc' AND State = 'Running'").Any();

        // BitLocker volumes live in a dedicated WMI namespace (not root\CIMV2).
        var bitLockerVolumes = QueryObjects(
                @"root\CIMV2\Security\MicrosoftVolumeEncryption",
                "SELECT DeviceID, DriveLetter, ProtectionStatus, ConversionStatus FROM Win32_EncryptableVolume")
            .Select(v =>
            {
                var status = ToInt(v["ProtectionStatus"]);
                var letter = Str(v, "DriveLetter");
                if (string.IsNullOrWhiteSpace(letter))
                    letter = NormalizeBitLockerMount(Str(v, "DeviceID"));
                var protection = status switch
                {
                    1 => "On",
                    0 => "Off",
                    _ => "Unknown"
                };
                return new Dictionary<string, object?>
                {
                    ["mountPoint"] = letter,
                    ["deviceId"] = Str(v, "DeviceID"),
                    ["protection"] = protection,
                    ["protectionStatus"] = status,
                    ["conversionStatus"] = ToInt(v["ConversionStatus"]),
                    ["encryption"] = status == 1 ? "BitLocker" : "-"
                };
            })
            .Where(v => !string.IsNullOrWhiteSpace(v["mountPoint"] as string))
            .GroupBy(v => (v["mountPoint"] as string)!, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(v => v["mountPoint"] as string, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // If BitLocker WMI is unavailable, still list fixed disks so the UI matches storage.
        if (bitLockerVolumes.Count == 0)
        {
            bitLockerVolumes = QueryObjects("SELECT DeviceID FROM Win32_LogicalDisk WHERE DriveType = 3")
                .Select(d => new Dictionary<string, object?>
                {
                    ["mountPoint"] = Str(d, "DeviceID"),
                    ["protection"] = "Unknown",
                    ["encryption"] = "-"
                })
                .Where(v => !string.IsNullOrWhiteSpace(v["mountPoint"] as string))
                .ToList();
        }

        var anyProtected = bitLockerVolumes.Any(v =>
            string.Equals(v["protection"] as string, "On", StringComparison.OrdinalIgnoreCase));

        inventory["security"] = new Dictionary<string, object?>
        {
            ["defenderRealtime"] = defender,
            ["firewall"] = firewall,
            ["bitlocker"] = anyProtected,
            ["bitLocker"] = bitLockerVolumes
        };
    }

    private static string? NormalizeBitLockerMount(string? deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId)) return null;
        // Prefer a drive letter when DeviceID looks like \\?\Volume{guid}\
        var trimmed = deviceId.Trim();
        if (trimmed.Length == 2 && trimmed[1] == ':') return trimmed.ToUpperInvariant();
        if (trimmed.Length >= 2 && char.IsLetter(trimmed[0]) && trimmed[1] == ':')
            return trimmed[..2].ToUpperInvariant();
        return trimmed;
    }

    private static void CollectPrinters(Dictionary<string, object?> inventory)
    {
        inventory["printers"] = QueryObjects("SELECT Name, DriverName, PortName, Shared, Default FROM Win32_Printer")
            .Select(p => new Dictionary<string, object?>
            {
                ["name"] = Str(p, "Name"),
                ["driver"] = Str(p, "DriverName"),
                ["port"] = Str(p, "PortName"),
                ["shared"] = Bool(p, "Shared"),
                ["default"] = Bool(p, "Default")
            }).ToList();
    }

    private static void CollectShares(Dictionary<string, object?> inventory)
    {
        inventory["shares"] = QueryObjects("SELECT Name, Path, Description FROM Win32_Share")
            .Select(s => new Dictionary<string, object?>
            {
                ["name"] = Str(s, "Name"),
                ["path"] = Str(s, "Path"),
                ["description"] = Str(s, "Description")
            }).ToList();
    }

    private static void CollectServices(Dictionary<string, object?> inventory)
    {
        var interesting = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "WinDefend", "mpssvc", "wuauserv", "EventLog", "RpcSs", "Dhcp", "Dnscache", "LanmanServer", "LanmanWorkstation", "Spooler"
        };
        inventory["services"] = QueryObjects("SELECT Name, DisplayName, State, StartMode FROM Win32_Service")
            .Where(s => interesting.Contains(Str(s, "Name") ?? ""))
            .Select(s => new Dictionary<string, object?>
            {
                ["name"] = Str(s, "Name"),
                ["displayName"] = Str(s, "DisplayName"),
                ["state"] = Str(s, "State"),
                ["startMode"] = Str(s, "StartMode")
            }).ToList();
    }

    private static void CollectPeripherals(Dictionary<string, object?> inventory)
    {
        inventory["peripherals"] = new Dictionary<string, object?>
        {
            ["monitors"] = QueryObjects("SELECT Name, PNPDeviceID FROM Win32_DesktopMonitor")
                .Select(m => new Dictionary<string, object?> { ["name"] = Str(m, "Name"), ["pnpId"] = Str(m, "PNPDeviceID") }).ToList(),
            ["usb"] = QueryObjects("SELECT Name, DeviceID, Status FROM Win32_USBControllerDevice")
                .Take(40)
                .Select(u => new Dictionary<string, object?> { ["name"] = Str(u, "Name"), ["deviceId"] = Str(u, "DeviceID"), ["status"] = Str(u, "Status") })
                .ToList()
        };
    }

    private static void CollectSoftware(Dictionary<string, object?> inventory)
    {
        var apps = new List<Dictionary<string, object?>>();
        foreach (var path in new[]
                 {
                     @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                     @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
                 })
        {
            using var root = Registry.LocalMachine.OpenSubKey(path);
            if (root is null) continue;
            foreach (var subName in root.GetSubKeyNames())
            {
                using var sub = root.OpenSubKey(subName);
                var name = sub?.GetValue("DisplayName") as string;
                if (string.IsNullOrWhiteSpace(name)) continue;
                apps.Add(new Dictionary<string, object?>
                {
                    ["name"] = name.Trim(),
                    ["version"] = sub?.GetValue("DisplayVersion") as string,
                    ["publisher"] = sub?.GetValue("Publisher") as string
                });
                if (apps.Count >= 150) break;
            }
            if (apps.Count >= 150) break;
        }
        inventory["software"] = apps.OrderBy(a => a["name"] as string).Take(150).ToList();
    }

    private static (string? displayVersion, int? ubr, string? editionId) ReadWindowsVersionDetails()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
            if (key is null) return (null, null, null);
            var display = key.GetValue("DisplayVersion") as string;
            int? ubr = key.GetValue("UBR") is int i ? i : null;
            var edition = key.GetValue("EditionID") as string;
            return (display, ubr, edition);
        }
        catch
        {
            return (null, null, null);
        }
    }

    private static List<ManagementObject> QueryObjects(string wql) => QueryObjects(null, wql);

    private static List<ManagementObject> QueryObjects(string? scope, string wql)
    {
        var list = new List<ManagementObject>();
        try
        {
            using var searcher = string.IsNullOrWhiteSpace(scope)
                ? new ManagementObjectSearcher(wql)
                : new ManagementObjectSearcher(scope, wql);
            foreach (ManagementObject obj in searcher.Get())
                list.Add(obj);
        }
        catch
        {
            // collector best-effort
        }
        return list;
    }

    private static string? Str(ManagementBaseObject? obj, string prop)
    {
        if (obj is null) return null;
        try { return obj[prop]?.ToString()?.Trim(); }
        catch { return null; }
    }

    private static bool Bool(ManagementBaseObject? obj, string prop)
    {
        try
        {
            var value = obj?[prop];
            return value switch
            {
                bool b => b,
                int i => i != 0,
                string s => s.Equals("true", StringComparison.OrdinalIgnoreCase) || s == "1",
                _ => false
            };
        }
        catch { return false; }
    }

    private static string? CimDate(ManagementBaseObject? obj, string prop)
    {
        try
        {
            var raw = obj?[prop]?.ToString();
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var dt = ManagementDateTimeConverter.ToDateTime(raw);
            return dt.ToUniversalTime().ToString("o");
        }
        catch { return null; }
    }

    private static string[] ToStringArray(object? value)
    {
        if (value is string[] arr) return arr.Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
        if (value is string s) return new[] { s };
        return Array.Empty<string>();
    }

    private static int[] ToIntArray(object? value)
    {
        if (value is ushort[] us) return us.Select(v => (int)v).ToArray();
        if (value is int[] ints) return ints;
        if (value is short[] sh) return sh.Select(v => (int)v).ToArray();
        return Array.Empty<int>();
    }

    private static double? BytesToGb(object? value)
    {
        var n = ToDouble(value);
        return n is null or <= 0 ? null : Math.Round(n.Value / (1024d * 1024d * 1024d), 1);
    }

    private static double? ToAdapterRamMb(object? value)
    {
        var n = ToDouble(value);
        return n is null or <= 0 ? null : Math.Round(n.Value / (1024d * 1024d), 0);
    }

    private static double? ToDouble(object? value)
    {
        try
        {
            return value switch
            {
                null => null,
                double d => d,
                float f => f,
                int i => i,
                long l => l,
                uint ui => ui,
                ulong ul => ul,
                string s when double.TryParse(s, out var parsed) => parsed,
                _ => Convert.ToDouble(value)
            };
        }
        catch { return null; }
    }

    private static int? ToInt(object? value)
    {
        var d = ToDouble(value);
        return d is null ? null : (int)d.Value;
    }

    private static double? KelvinTenthToCelsius(object? raw)
    {
        var value = ToDouble(raw);
        if (value is null or <= 0) return null;
        return Math.Round((value.Value / 10.0) - 273.15, 1);
    }

    private static string? NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        string[] ignored =
        [
            "To be filled by O.E.M.", "Default string", "System manufacturer", "System Manufacturer",
            "System product name", "System Product Name", "System Serial Number", "Serial Number",
            "Chassis Serial Number", "Not Applicable", "N/A", "None"
        ];
        return ignored.Any(i => trimmed.Equals(i, StringComparison.OrdinalIgnoreCase)) ? null : trimmed;
    }
}
