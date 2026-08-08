import { getRmmInventoryFromEquipment, isRmmManagedEquipment, getRmmAgentStatusKey, getWindowsUpdateStatus, getWorstDiskUsage } from "../components/EquipementPage/rmmMonitoringUtils";
import { fetchClientModules } from "../api/clients";
import { mapClientHardwareEquipment } from "../api/equipment";
import { filterBySite } from "./siteFilterUtils";
import API_BASE_URL from "../config";
export const FLEET_CHART_COLORS = ["#2b5fab", "#4a8fd4", "#1a3d75", "#6ba3e0", "#3d6eb8", "#8fa8c4", "#5c7cba", "#9eb8e8", "#243047", "#c5d0df"];
export const POWER_PROFILES = {
  desktop: {
    watts: 75,
    label: "Desktop PC"
  },
  laptop: {
    watts: 40,
    label: "Laptop"
  },
  unknown: {
    watts: 55,
    label: "Poste type"
  }
};
export const DEFAULT_FLEET_STATS_OPTIONS = {
  hoursPerDay: 8,
  daysPerMonth: 22,
  pricePerKwh: 0.18,
  staleInventoryDays: 7,
  diskAlertThresholdPct: 85
};
function normalizeBrand(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.includes("dell")) return "Dell";
  if (lower.includes("hewlett") || lower.includes("hp ") || lower === "hp") return "HP";
  if (lower.includes("lenovo")) return "Lenovo";
  if (lower.includes("microsoft") || lower.includes("surface")) return "Microsoft";
  if (lower.includes("asus")) return "ASUS";
  if (lower.includes("acer")) return "Acer";
  if (lower.includes("apple")) return "Apple";
  if (lower.includes("toshiba")) return "Toshiba";
  if (lower.includes("fujitsu")) return "Fujitsu";
  if (lower.includes("msi")) return "MSI";
  if (lower.includes("samsung")) return "Samsung";
  return value.length > 28 ? `${value.slice(0, 25)}…` : value;
}
export function inferPowerProfile(equipment, inventory) {
  const hw = inventory?.hardware || {};
  const chassis = String(hw.chassisType || hw.formFactor || "").toLowerCase();
  if (["laptop", "notebook", "portable"].some(hint => chassis.includes(hint))) return "laptop";
  const osName = String(equipment?.systeme || inventory?.os?.name || "").toLowerCase();
  const hostname = String(equipment?.name || inventory?.hostname || "").toLowerCase();
  const laptopHints = ["laptop", "portable", "book", "surface", "thinkpad", "elitebook", "latitude", "xps", "zenbook", "vivobook"];
  if (laptopHints.some(hint => osName.includes(hint) || hostname.includes(hint))) {
    return "laptop";
  }
  return "desktop";
}
export function inferBrand(equipment, inventory) {
  const hw = inventory?.hardware || {};
  const explicit = hw.manufacturer || hw.vendor || inventory.manufacturer || inventory.vendor;
  if (explicit) return normalizeBrand(explicit) || "Not specified";
  const hostname = String(equipment?.name || inventory?.hostname || "").toLowerCase();
  const osName = String(equipment?.systeme || inventory?.os?.name || "").toLowerCase();
  const cpu = String(hw.cpu || "").toLowerCase();
  const hostnameBrands = [["dell", "Dell"], ["latitude", "Dell"], ["optiplex", "Dell"], ["hp-", "HP"], ["elitebook", "HP"], ["probook", "HP"], ["lenovo", "Lenovo"], ["thinkpad", "Lenovo"], ["surface", "Microsoft"], ["asus", "ASUS"], ["zenbook", "ASUS"], ["acer", "Acer"], ["macbook", "Apple"]];
  for (const [hint, brand] of hostnameBrands) {
    if (hostname.includes(hint) || osName.includes(hint)) return brand;
  }
  if (osName.includes("macos") || cpu.includes("apple")) return "Apple";
  if (cpu.includes("qualcomm")) return "Qualcomm";
  return "Not specified";
}
export function inferModelLabel(equipment, inventory) {
  const hw = inventory?.hardware || {};
  const explicit = hw.model || inventory.model || hw.productName;
  if (explicit) {
    const label = String(explicit).trim();
    return label.length > 42 ? `${label.slice(0, 39)}…` : label;
  }
  const cpu = String(hw.cpu || "").trim();
  if (cpu) {
    const intel = cpu.match(/Intel[^@]*?(i[3579]-?\d+\w*)/i);
    if (intel) return `Intel Core ${intel[1].toUpperCase()}`;
    const ryzen = cpu.match(/(Ryzen\s+\d+\s*\w*)/i);
    if (ryzen) return ryzen[1];
    const cleaned = cpu.replace(/\(R\)|\(TM\)/gi, "").replace(/\s+/g, " ").split("@")[0].trim();
    return cleaned.length > 42 ? `${cleaned.slice(0, 39)}…` : cleaned;
  }
  const profile = inferPowerProfile(equipment, inventory);
  if (profile === "laptop") return "Laptop (unknown model)";
  if (profile === "desktop") return "Desktop (unknown model)";
  return "Not specified";
}
function inferCpuFamily(inventory) {
  const cpu = String(inventory?.hardware?.cpu || "").toLowerCase();
  if (!cpu) return "Not specified";
  if (cpu.includes("apple") || cpu.includes("m1") || cpu.includes("m2") || cpu.includes("m3")) return "Apple Silicon";
  if (cpu.includes("amd") || cpu.includes("ryzen")) return "AMD";
  if (cpu.includes("intel")) return "Intel";
  if (cpu.includes("qualcomm")) return "Qualcomm";
  return "Other";
}
function ramBucket(ramGb) {
  const value = Number(ramGb);
  if (!Number.isFinite(value) || value <= 0) return "Not specified";
  if (value < 8) return "Moins de 8 Go";
  if (value < 16) return "8 – 16 Go";
  if (value < 32) return "16 – 32 Go";
  return "32 Go et +";
}
export function normalizeOsFamily(systeme) {
  const raw = String(systeme || "").trim();
  const s = raw.toLowerCase();
  if (!s) return "Inconnu";
  if (s.includes("windows 11")) return "Windows 11";
  if (s.includes("windows 10")) return "Windows 10";
  if (s.includes("windows server")) return "Windows Server";
  if (s.includes("windows")) return "Windows (other)";
  if (s.includes("macos") || s.includes("mac os")) return "macOS";
  if (s.includes("ubuntu")) return "Ubuntu";
  if (s.includes("debian")) return "Debian";
  if (s.includes("linux")) return "Linux";
  if (raw.length > 36) return `${raw.slice(0, 33)}…`;
  return raw;
}
function increment(map, key) {
  const label = String(key || "").trim() || "Not specified";
  map[label] = (map[label] || 0) + 1;
}
function toDistribution(counts, total, {
  limit = 8,
  otherLabel = "Others"
} = {}) {
  const entries = Object.entries(counts).map(([name, count]) => ({
    name,
    count,
    pct: total > 0 ? Math.round(count / total * 100) : 0
  })).sort((a, b) => b.count - a.count);
  if (entries.length <= limit) return entries;
  const top = entries.slice(0, limit);
  const otherCount = entries.slice(limit).reduce((sum, entry) => sum + entry.count, 0);
  if (otherCount > 0) {
    top.push({
      name: otherLabel,
      count: otherCount,
      pct: total > 0 ? Math.round(otherCount / total * 100) : 0
    });
  }
  return top;
}
export function buildComputerFleetStats(computers, options = {}) {
  const list = Array.isArray(computers) ? computers : [];
  const opts = {
    ...DEFAULT_FLEET_STATS_OPTIONS,
    ...options
  };
  const total = list.length;
  const osCounts = {};
  const brandCounts = {};
  const modelCounts = {};
  const formFactorCounts = {};
  const ramCounts = {};
  const cpuCounts = {};
  const agentVersionCounts = {};
  const diskTierCounts = {};
  const powerByProfile = {
    desktop: 0,
    laptop: 0,
    unknown: 0
  };
  let rmmManaged = 0;
  let manual = 0;
  let online = 0;
  let offline = 0;
  let unknownStatus = 0;
  let domainJoined = 0;
  let workgroupOnly = 0;
  let domainUnknown = 0;
  let updatesUpToDate = 0;
  let updatesPending = 0;
  let updatesUnknown = 0;
  let pendingUpdatesTotal = 0;
  let staleInventory = 0;
  let freshInventory = 0;
  let highDiskUsage = 0;
  let licenseInactive = 0;
  let windows10Count = 0;
  let windows11Count = 0;
  let ramTotalGb = 0;
  let ramKnownCount = 0;
  let diskTotalGb = 0;
  let diskKnownCount = 0;
  for (const equipment of list) {
    const inventory = getRmmInventoryFromEquipment(equipment);
    const osFamily = normalizeOsFamily(equipment?.systeme || inventory?.os?.name);
    increment(osCounts, osFamily);
    if (osFamily === "Windows 10") windows10Count += 1;
    if (osFamily === "Windows 11") windows11Count += 1;
    increment(brandCounts, inferBrand(equipment, inventory));
    increment(modelCounts, inferModelLabel(equipment, inventory));
    const managed = isRmmManagedEquipment(equipment);
    const profile = managed ? inferPowerProfile(equipment, inventory) : "unknown";
    powerByProfile[profile] = (powerByProfile[profile] || 0) + 1;
    increment(formFactorCounts, profile === "laptop" ? "Laptop" : profile === "desktop" ? "Desktop" : "Unidentified");
    const ramGb = Number(inventory?.hardware?.ramGB ?? inventory?.hardware?.ramGb);
    if (Number.isFinite(ramGb) && ramGb > 0) {
      ramTotalGb += ramGb;
      ramKnownCount += 1;
    }
    increment(ramCounts, ramBucket(ramGb));
    increment(cpuCounts, inferCpuFamily(inventory));
    const agentVersion = String(inventory.agentVersion || inventory.agent_version || equipment?.rawData?.agent_version || "").trim();
    if (agentVersion) increment(agentVersionCounts, `v${agentVersion.replace(/^v/i, "")}`);else increment(agentVersionCounts, "Inconnu");
    const disks = Array.isArray(inventory?.hardware?.disks) ? inventory.hardware.disks : [];
    let machineDiskGb = 0;
    for (const disk of disks) {
      const size = Number(disk?.sizeGB ?? disk?.sizeGb);
      if (Number.isFinite(size) && size > 0) machineDiskGb += size;
    }
    if (machineDiskGb > 0) {
      diskTotalGb += machineDiskGb;
      diskKnownCount += 1;
      if (machineDiskGb < 256) increment(diskTierCounts, "< 256 Go");else if (machineDiskGb < 512) increment(diskTierCounts, "256 – 512 Go");else if (machineDiskGb < 1024) increment(diskTierCounts, "512 Go – 1 To");else increment(diskTierCounts, "1 To et +");
    } else {
      increment(diskTierCounts, "Not specified");
    }
    if (!managed) {
      manual += 1;
      domainUnknown += 1;
      continue;
    }
    rmmManaged += 1;
    const statusKey = getRmmAgentStatusKey(equipment);
    if (statusKey === "online") online += 1;else if (statusKey === "offline") offline += 1;else unknownStatus += 1;
    const lastAt = inventory.lastInventoryAt || inventory.collectedAt || null;
    if (lastAt) {
      const ageDays = (Date.now() - new Date(lastAt).getTime()) / 86400000;
      if (Number.isFinite(ageDays) && ageDays > opts.staleInventoryDays) staleInventory += 1;else freshInventory += 1;
    } else {
      staleInventory += 1;
    }
    const updates = getWindowsUpdateStatus(inventory);
    if (updates.pendingCount === 0) updatesUpToDate += 1;else if (updates.pendingCount != null) {
      updatesPending += 1;
      pendingUpdatesTotal += updates.pendingCount;
    } else {
      updatesUnknown += 1;
    }
    const worstDisk = getWorstDiskUsage(inventory);
    if (worstDisk?.pct != null && worstDisk.pct >= opts.diskAlertThresholdPct) {
      highDiskUsage += 1;
    }
    const domain = inventory.domain || {};
    const domainLabel = equipment?.domaine || inventory.domaine || (domain.joined ? domain.name : domain.workgroup) || "";
    if (domain.joined === true || domainLabel && !domain.workgroup) domainJoined += 1;else if (domain.workgroup || String(domainLabel).toUpperCase() === "WORKGROUP") workgroupOnly += 1;else domainUnknown += 1;
    const license = inventory.license || {};
    if (license.activated === false) licenseInactive += 1;
  }
  let monthlyKwh = 0;
  const powerBreakdown = Object.entries(powerByProfile).filter(([, count]) => count > 0).map(([profile, count]) => {
    const watts = POWER_PROFILES[profile]?.watts ?? POWER_PROFILES.unknown.watts;
    const profileKwh = watts / 1000 * opts.hoursPerDay * opts.daysPerMonth * count;
    monthlyKwh += profileKwh;
    return {
      profile,
      label: POWER_PROFILES[profile]?.label ?? profile,
      count,
      watts,
      monthlyKwh: Math.round(profileKwh * 10) / 10
    };
  });
  const monthlyCostEur = monthlyKwh * opts.pricePerKwh;
  const attentionCount = manual + offline + updatesPending + staleInventory + highDiskUsage + licenseInactive;
  return {
    total,
    rmmManaged,
    manual,
    rmmCoveragePct: total > 0 ? Math.round(rmmManaged / total * 100) : 0,
    agentStatus: {
      online,
      offline,
      unknown: unknownStatus
    },
    osDistribution: toDistribution(osCounts, total),
    brandDistribution: toDistribution(brandCounts, total, {
      limit: 6
    }),
    modelDistribution: toDistribution(modelCounts, total, {
      limit: 8
    }),
    formFactorDistribution: toDistribution(formFactorCounts, total, {
      limit: 4
    }),
    ramDistribution: toDistribution(ramCounts, total, {
      limit: 5
    }),
    cpuDistribution: toDistribution(cpuCounts, total, {
      limit: 5
    }),
    diskDistribution: toDistribution(diskTierCounts, total, {
      limit: 5
    }),
    agentVersionDistribution: toDistribution(agentVersionCounts, total, {
      limit: 5
    }),
    domain: {
      joined: domainJoined,
      workgroup: workgroupOnly,
      unknown: domainUnknown
    },
    windowsUpdates: {
      upToDate: updatesUpToDate,
      pending: updatesPending,
      unknown: updatesUnknown,
      pendingTotal: pendingUpdatesTotal
    },
    inventoryFreshness: {
      fresh: freshInventory,
      stale: staleInventory,
      staleThresholdDays: opts.staleInventoryDays
    },
    diskAlerts: highDiskUsage,
    licenseInactive,
    attentionCount,
    lifecycle: {
      windows10: windows10Count,
      windows11: windows11Count,
      windows10Pct: total > 0 ? Math.round(windows10Count / total * 100) : 0
    },
    hardwareSummary: {
      avgRamGb: ramKnownCount > 0 ? Math.round(ramTotalGb / ramKnownCount * 10) / 10 : null,
      totalRamGb: Math.round(ramTotalGb * 10) / 10,
      avgDiskGb: diskKnownCount > 0 ? Math.round(diskTotalGb / diskKnownCount * 10) / 10 : null,
      knownRamCount: ramKnownCount,
      knownDiskCount: diskKnownCount
    },
    power: {
      monthlyKwh: Math.round(monthlyKwh * 10) / 10,
      annualKwh: Math.round(monthlyKwh * 12 * 10) / 10,
      monthlyCostEur: Math.round(monthlyCostEur * 100) / 100,
      annualCostEur: Math.round(monthlyCostEur * 12 * 100) / 100,
      hoursPerDay: opts.hoursPerDay,
      daysPerMonth: opts.daysPerMonth,
      pricePerKwh: opts.pricePerKwh,
      breakdown: powerBreakdown
    },
    fleetHealth: {
      score: total > 0 ? Math.max(0, Math.round(100 - attentionCount / total * 100)) : null,
      label: attentionCount === 0 ? "Fleet under control" : attentionCount <= Math.max(1, Math.floor(total * 0.2)) ? "Watch points" : "Fleet needs attention"
    }
  };
}
export async function loadClientEquipmentForFleetStats(clientId, equipmentType = "Ordinateurs", siteFilter = null) {
  if (!clientId) return [];
  const [modulesData, clientRes] = await Promise.all([fetchClientModules(clientId), fetch(`${API_BASE_URL}/clients/general/${clientId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  }).then(response => response.ok ? response.json() : null).catch(() => null)]);
  const clientForMap = {
    id: clientId,
    equipements: modulesData?.equipements || clientRes?.equipements || {},
    sites: clientRes?.sites || []
  };
  let items = mapClientHardwareEquipment(clientForMap).filter(eq => eq.type === equipmentType);
  if (siteFilter) {
    items = filterBySite(items, siteFilter);
  }
  return items;
}
