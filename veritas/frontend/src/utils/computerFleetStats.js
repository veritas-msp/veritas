import { getRmmInventoryFromEquipment, getRmmChassisInfo, isRmmManagedEquipment, getRmmAgentStatusKey, getWindowsUpdateStatus, getWorstDiskUsage, sanitizeRmmInventoryText, getSecuritySummary } from "../components/EquipementPage/rmmMonitoringUtils";
import { canonicalizeComputerType, getComputerTypeLabel, inferComputerTypeFromInventory } from "../components/EquipementPage/equipmentFormConfig";
import { repairRmmTextEncoding } from "./rmmTextEncoding";
import { fetchClientModules } from "../api/clients";
import { mapClientHardwareEquipment, getAllHardwareEquipment } from "../api/equipment";
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
  "all-in-one": {
    watts: 80,
    label: "All-in-one"
  },
  "mini-pc": {
    watts: 35,
    label: "Mini-PC"
  },
  tablet: {
    watts: 15,
    label: "Tablet"
  },
  unknown: {
    watts: 55,
    label: "Typical workstation"
  }
};
export const DEFAULT_FLEET_STATS_OPTIONS = {
  hoursPerDay: 8,
  daysPerMonth: 22,
  pricePerKwh: 0.18,
  staleInventoryDays: 7,
  diskAlertThresholdPct: 85
};
function flattenTextCandidate(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) return flattenTextCandidate(value[0]);
    return flattenTextCandidate(value.name || value.Name || value.cpu || value.processor || value.model || value.manufacturer || value.marque || "");
  }
  return value;
}
function firstText(...candidates) {
  for (const value of candidates) {
    const cleaned = sanitizeRmmInventoryText(flattenTextCandidate(value));
    if (cleaned) return cleaned;
  }
  return "";
}
function equipmentDataBags(equipment, inventory) {
  const raw = equipment?.rawData && typeof equipment.rawData === "object" ? equipment.rawData : {};
  const nested = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data
    : equipment?.data && typeof equipment.data === "object" && !Array.isArray(equipment.data)
      ? equipment.data
      : {};
  return [equipment, raw, nested, inventory].filter(bag => bag && typeof bag === "object");
}
function pickEquipmentText(equipment, inventory, keys) {
  const bags = equipmentDataBags(equipment, inventory);
  const values = [];
  for (const key of keys) {
    for (const bag of bags) {
      if (bag[key] != null && bag[key] !== "") values.push(bag[key]);
    }
  }
  return firstText(...values);
}
function shortenLabel(value, max = 42) {
  const label = String(value || "").trim();
  if (!label) return "";
  return label.length > max ? `${label.slice(0, max - 3)}…` : label;
}
function parseSizeToGb(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const raw = String(value).trim().replace(",", ".");
  const match = raw.match(/([\d.]+)\s*(to|tb|go|gb|mo|mb|ko|kb)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = String(match[2] || "gb").toLowerCase();
  if (unit === "to" || unit === "tb") return amount * 1024;
  if (unit === "mo" || unit === "mb") return amount / 1024;
  if (unit === "ko" || unit === "kb") return amount / (1024 * 1024);
  return amount;
}
function resolveComputerType(equipment, inventory) {
  const bags = equipmentDataBags(equipment, inventory);
  for (const bag of bags) {
    const type = canonicalizeComputerType(bag.computerType || bag.type);
    if (type) return type;
  }
  return inferComputerTypeFromInventory(inventory) || inferComputerTypeFromInventory(equipment?.rawData) || "";
}
function normalizeBrand(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.includes("dell")) return "Dell";
  if (lower.includes("hewlett") || /\bhp\b/.test(lower) || lower.includes("hp inc")) return "HP";
  if (lower.includes("lenovo")) return "Lenovo";
  if (lower.includes("microsoft") || lower.includes("surface")) return "Microsoft";
  if (lower.includes("asus")) return "ASUS";
  if (lower.includes("acer")) return "Acer";
  if (lower.includes("apple")) return "Apple";
  if (lower.includes("toshiba")) return "Toshiba";
  if (lower.includes("fujitsu")) return "Fujitsu";
  if (lower.includes("msi")) return "MSI";
  if (lower.includes("samsung")) return "Samsung";
  return shortenLabel(value, 28);
}
function resolveCpuText(equipment, inventory) {
  const hw = inventory?.hardware || {};
  return firstText(
    pickEquipmentText(equipment, inventory, ["processeur", "cpu", "processor", "vcpu"]),
    hw.cpu,
    hw.processor
  );
}
export function inferPowerProfile(equipment, inventory) {
  const explicit = resolveComputerType(equipment, inventory);
  if (explicit === "laptop" || explicit === "tablet") return explicit === "tablet" ? "tablet" : "laptop";
  if (explicit === "all-in-one") return "all-in-one";
  if (explicit === "mini-pc") return "mini-pc";
  if (explicit === "desktop") return "desktop";
  const hw = inventory?.hardware || {};
  const chassis = String(hw.chassisType || hw.formFactor || "").toLowerCase();
  if (["laptop", "notebook", "portable"].some(hint => chassis.includes(hint))) return "laptop";
  const osName = String(equipment?.systeme || inventory?.os?.name || "").toLowerCase();
  const hostname = String(equipment?.name || inventory?.hostname || "").toLowerCase();
  const laptopHints = ["laptop", "portable", "book", "surface", "thinkpad", "elitebook", "latitude", "xps", "zenbook", "vivobook"];
  if (laptopHints.some(hint => osName.includes(hint) || hostname.includes(hint))) {
    return "laptop";
  }
  return explicit ? "unknown" : "desktop";
}
export function inferBrand(equipment, inventory) {
  const hw = inventory?.hardware || {};
  const chassis = getRmmChassisInfo(inventory);
  const explicit = firstText(
    pickEquipmentText(equipment, inventory, ["manufacturer", "marque", "fabricant", "vendor"]),
    chassis.manufacturer,
    hw.manufacturer,
    hw.vendor
  );
  if (explicit) return normalizeBrand(explicit) || "Not specified";
  const hostname = String(equipment?.name || inventory?.hostname || equipment?.netbios || "").toLowerCase();
  const osName = String(equipment?.systeme || inventory?.os?.name || "").toLowerCase();
  const cpu = resolveCpuText(equipment, inventory).toLowerCase();
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
  const chassis = getRmmChassisInfo(inventory);
  const explicit = firstText(
    pickEquipmentText(equipment, inventory, ["model", "modele", "modelName", "productName"]),
    chassis.model,
    hw.model,
    hw.productName
  );
  if (explicit) return shortenLabel(explicit) || "Not specified";
  return "Not specified";
}
function inferCpuFamily(equipment, inventory) {
  const cpu = resolveCpuText(equipment, inventory).toLowerCase();
  if (!cpu) return "Not specified";
  if (cpu.includes("apple") || cpu.includes("m1") || cpu.includes("m2") || cpu.includes("m3") || cpu.includes("m4")) return "Apple Silicon";
  if (cpu.includes("amd") || cpu.includes("ryzen")) return "AMD";
  if (cpu.includes("intel") || /\bi[3579]\b/.test(cpu) || cpu.includes("core i") || cpu.includes("xeon") || cpu.includes("celeron") || cpu.includes("pentium")) return "Intel";
  if (cpu.includes("qualcomm") || cpu.includes("snapdragon")) return "Qualcomm";
  return shortenLabel(resolveCpuText(equipment, inventory), 28) || "Other";
}
function inferFormFactorLabel(equipment, inventory) {
  const type = resolveComputerType(equipment, inventory);
  if (type) return getComputerTypeLabel(type) || type;
  return "Not specified";
}
function resolveRamGb(equipment, inventory) {
  const hw = inventory?.hardware || {};
  const fromInventory = Number(hw.ramGB ?? hw.ramGb);
  if (Number.isFinite(fromInventory) && fromInventory > 0) return fromInventory;
  return parseSizeToGb(pickEquipmentText(equipment, inventory, ["memoire", "ram", "memory"]) || hw.ram || hw.memory);
}
function resolveDiskGb(equipment, inventory) {
  const disks = Array.isArray(inventory?.hardware?.disks) ? inventory.hardware.disks : [];
  let machineDiskGb = 0;
  for (const disk of disks) {
    const size = Number(disk?.sizeGB ?? disk?.sizeGb);
    if (Number.isFinite(size) && size > 0) machineDiskGb += size;
  }
  if (machineDiskGb > 0) return machineDiskGb;
  return parseSizeToGb(pickEquipmentText(equipment, inventory, ["stockage", "storage"]) || inventory?.hardware?.storage);
}

/** @returns {"ok"|"blocked"|"unknown"} */
export function assessCpuWin11Likely(cpuText) {
  const cpu = String(cpuText || "").toLowerCase();
  if (!cpu.trim()) return "unknown";
  if (cpu.includes("apple") || /\bm[1-4](?:\s|pro|max|ultra|\b)/.test(cpu) || cpu.includes("apple silicon")) return "ok";
  if (cpu.includes("snapdragon") && (cpu.includes("elite") || cpu.includes("8cx") || cpu.includes("x plus"))) return "ok";

  const genHint = cpu.match(/(\d{1,2})(?:st|nd|rd|th)?\s*gen(?:eration)?/);
  if (genHint) {
    const gen = Number(genHint[1]);
    if (Number.isFinite(gen)) return gen >= 8 ? "ok" : "blocked";
  }

  if (cpu.includes("ryzen") || /\bamd\b/.test(cpu)) {
    const ryzen = cpu.match(/ryzen(?:\s*(?:pro|ai))?(?:\s*[3579])?\s*(\d{4})/i);
    const model = Number(ryzen?.[1]);
    if (Number.isFinite(model) && model >= 1000) {
      return Math.floor(model / 1000) >= 2 ? "ok" : "blocked";
    }
    return "unknown";
  }

  if (cpu.includes("intel") || /\bi[3579]\b/.test(cpu) || cpu.includes("core ultra") || cpu.includes("xeon") || cpu.includes("celeron") || cpu.includes("pentium")) {
    if (cpu.includes("core ultra")) return "ok";
    const intelModel = cpu.match(/i[3579][\s-]*(\d{4,5})/i);
    if (intelModel?.[1]) {
      const digits = intelModel[1];
      const gen = digits.length >= 5 ? Number(digits.slice(0, 2)) : Number(digits[0]);
      if (Number.isFinite(gen) && gen > 0) return gen >= 8 ? "ok" : "blocked";
    }
    return "unknown";
  }

  return "unknown";
}

/**
 * Probable Windows 11 readiness (CPU + RAM + disk). Not Microsoft-certified (no TPM / Secure Boot).
 * @returns {{ status: "on_w11"|"ready"|"blocked"|"unknown", tightRam: boolean, osFamily: string, ramGb: number|null, diskGb: number|null, cpu: string, cpuStatus: string }}
 */
export function assessWin11Readiness(equipment, inventory) {
  const osFamily = normalizeOsFamily(repairRmmTextEncoding(equipment?.systeme || inventory?.os?.name || inventory?.systeme || ""));
  const ramGb = resolveRamGb(equipment, inventory);
  const diskGb = resolveDiskGb(equipment, inventory);
  const cpu = resolveCpuText(equipment, inventory);
  const cpuStatus = assessCpuWin11Likely(cpu);
  const tightRam = Number.isFinite(ramGb) && ramGb >= 4 && ramGb < 8;

  if (osFamily === "Windows 11") {
    return { status: "on_w11", tightRam, osFamily, ramGb, diskGb, cpu, cpuStatus };
  }

  if (osFamily !== "Windows 10") {
    return { status: "unknown", tightRam: false, osFamily, ramGb, diskGb, cpu, cpuStatus };
  }

  const ramKnown = Number.isFinite(ramGb) && ramGb > 0;
  const diskKnown = Number.isFinite(diskGb) && diskGb > 0;
  if (!ramKnown || !diskKnown || cpuStatus === "unknown") {
    return { status: "unknown", tightRam, osFamily, ramGb, diskGb, cpu, cpuStatus };
  }

  const ramOk = ramGb >= 4;
  const diskOk = diskGb >= 64;
  const cpuOk = cpuStatus === "ok";
  if (ramOk && diskOk && cpuOk) {
    return { status: "ready", tightRam, osFamily, ramGb, diskGb, cpu, cpuStatus };
  }
  return { status: "blocked", tightRam, osFamily, ramGb, diskGb, cpu, cpuStatus };
}

function resolveWarrantyDate(equipment, inventory) {
  const raw = pickEquipmentText(equipment, inventory, ["expirationGarantie", "garantie", "warrantyEnd", "warranty_end", "warranty"]);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveInstallDate(equipment, inventory) {
  const raw = pickEquipmentText(equipment, inventory, ["dateInstallation", "installDate", "date_installation", "osInstallDate"])
    || inventory?.os?.installDate
    || inventory?.os?.installedAt
    || null;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** @returns {"expired"|"soon"|"ok"|"unknown"} */
export function assessWarrantyStatus(equipment, inventory, { soonDays = 90 } = {}) {
  const end = resolveWarrantyDate(equipment, inventory);
  if (!end) return "unknown";
  const now = Date.now();
  const ms = end.getTime() - now;
  if (ms < 0) return "expired";
  if (ms <= soonDays * 86400000) return "soon";
  return "ok";
}

function detectDiskKind(disk) {
  const hay = `${disk?.model || ""} ${disk?.interface || ""} ${disk?.mediaType || ""} ${disk?.type || ""}`.toLowerCase();
  if (hay.includes("nvme") || hay.includes("ssd") || hay.includes("solid")) return "ssd";
  if (hay.includes("usb") || hay.includes("external")) return "external";
  if (hay.includes("hdd") || hay.includes("mechanical") || hay.includes("rotat")) return "hdd";
  return "unknown";
}

function assessPrimaryStorageKind(inventory) {
  const physical = Array.isArray(inventory?.hardware?.physicalDisks) ? inventory.hardware.physicalDisks : [];
  if (!physical.length) return "unknown";
  const kinds = physical.map(detectDiskKind);
  if (kinds.some(k => k === "ssd") && !kinds.some(k => k === "hdd")) return "ssd";
  if (kinds.some(k => k === "hdd") && !kinds.some(k => k === "ssd")) return "hdd";
  if (kinds.some(k => k === "ssd") && kinds.some(k => k === "hdd")) return "hybrid";
  return "unknown";
}

function assessBitLockerStatus(inventory) {
  const security = getSecuritySummary(inventory);
  const volumes = Array.isArray(security.bitLocker) ? security.bitLocker : [];
  if (!volumes.length) {
    const raw = inventory?.security || {};
    if (raw.bitlocker === true || raw.bitLocker === true) return "on";
    if (raw.bitlocker === false || raw.bitLocker === false) return "off";
    return "unknown";
  }
  const known = volumes.filter(v => {
    const text = `${v?.protection || ""}`.toLowerCase();
    return text && !text.includes("unknown");
  });
  if (!known.length) return "unknown";
  const onCount = known.filter(v => isBitLockerVolumeOnLoose(v)).length;
  if (onCount === known.length) return "on";
  if (onCount === 0) return "off";
  return "partial";
}

function isBitLockerVolumeOnLoose(volume) {
  const text = `${volume?.protection || ""} ${volume?.encryption || ""}`.toLowerCase();
  if (!text.trim()) return false;
  if (/(protection off|off|disabled|unprotect)/i.test(text)) return false;
  return /(protection on|on|enabled|encrypt|chiff|locked)/i.test(text);
}

function assessDefenderRealtime(inventory) {
  const security = getSecuritySummary(inventory);
  const rt = security?.defender?.realTimeProtection;
  if (rt === true) return "on";
  if (rt === false) return "off";
  return "unknown";
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
  if (!s) return "Not specified";
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
    "all-in-one": 0,
    "mini-pc": 0,
    tablet: 0,
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
  const win11 = {
    on_w11: 0,
    ready: 0,
    blocked: 0,
    unknown: 0,
    tightRam: 0
  };
  const warranty = {
    expired: 0,
    soon: 0,
    ok: 0,
    unknown: 0,
    aging: 0
  };
  const securityPosture = {
    bitlockerOn: 0,
    bitlockerPartial: 0,
    bitlockerOff: 0,
    bitlockerUnknown: 0,
    defenderOn: 0,
    defenderOff: 0,
    defenderUnknown: 0,
    assessed: 0
  };
  const undersizing = {
    ramUnder8: 0,
    diskWarn: 0,
    diskCritical: 0,
    hddOnly: 0,
    ssdOnly: 0,
    hybridStorage: 0,
    storageUnknown: 0
  };
  for (const equipment of list) {
    const inventory = getRmmInventoryFromEquipment(equipment);
    const osFamily = normalizeOsFamily(repairRmmTextEncoding(equipment?.systeme || inventory?.os?.name || inventory?.systeme || ""));
    increment(osCounts, osFamily);
    if (osFamily === "Windows 10") windows10Count += 1;
    if (osFamily === "Windows 11") windows11Count += 1;

    const readiness = assessWin11Readiness(equipment, inventory);
    win11[readiness.status] = (win11[readiness.status] || 0) + 1;
    if (readiness.tightRam) win11.tightRam += 1;

    const warrantyStatus = assessWarrantyStatus(equipment, inventory);
    warranty[warrantyStatus] = (warranty[warrantyStatus] || 0) + 1;
    const installDate = resolveInstallDate(equipment, inventory);
    if (installDate) {
      const ageYears = (Date.now() - installDate.getTime()) / (365.25 * 86400000);
      if (ageYears >= 5) warranty.aging += 1;
    }

    increment(brandCounts, inferBrand(equipment, inventory));
    increment(modelCounts, inferModelLabel(equipment, inventory));
    const managed = isRmmManagedEquipment(equipment);
    const hasComputerType = Boolean(resolveComputerType(equipment, inventory));
    const profile = managed || hasComputerType ? inferPowerProfile(equipment, inventory) : "unknown";
    powerByProfile[profile] = (powerByProfile[profile] || 0) + 1;
    increment(formFactorCounts, inferFormFactorLabel(equipment, inventory));
    const ramGb = resolveRamGb(equipment, inventory);
    if (Number.isFinite(ramGb) && ramGb > 0) {
      ramTotalGb += ramGb;
      ramKnownCount += 1;
      if (ramGb < 8) undersizing.ramUnder8 += 1;
    }
    increment(ramCounts, ramBucket(ramGb));
    increment(cpuCounts, inferCpuFamily(equipment, inventory));
    const agentVersion = String(inventory.agentVersion || inventory.agent_version || equipment?.rawData?.agent_version || "").trim();
    if (agentVersion) increment(agentVersionCounts, `v${agentVersion.replace(/^v/i, "")}`);else increment(agentVersionCounts, "Inconnu");
    const machineDiskGb = resolveDiskGb(equipment, inventory) || 0;
    if (machineDiskGb > 0) {
      diskTotalGb += machineDiskGb;
      diskKnownCount += 1;
      if (machineDiskGb < 256) increment(diskTierCounts, "< 256 Go");else if (machineDiskGb < 512) increment(diskTierCounts, "256 – 512 Go");else if (machineDiskGb < 1024) increment(diskTierCounts, "512 Go – 1 To");else increment(diskTierCounts, "1 To et +");
    } else {
      increment(diskTierCounts, "Not specified");
    }
    const storageKind = assessPrimaryStorageKind(inventory);
    if (storageKind === "ssd") undersizing.ssdOnly += 1;
    else if (storageKind === "hdd") undersizing.hddOnly += 1;
    else if (storageKind === "hybrid") undersizing.hybridStorage += 1;
    else undersizing.storageUnknown += 1;

    if (!managed) {
      manual += 1;
      domainUnknown += 1;
      continue;
    }
    rmmManaged += 1;
    securityPosture.assessed += 1;
    const bitlocker = assessBitLockerStatus(inventory);
    if (bitlocker === "on") securityPosture.bitlockerOn += 1;
    else if (bitlocker === "partial") securityPosture.bitlockerPartial += 1;
    else if (bitlocker === "off") securityPosture.bitlockerOff += 1;
    else securityPosture.bitlockerUnknown += 1;
    const defender = assessDefenderRealtime(inventory);
    if (defender === "on") securityPosture.defenderOn += 1;
    else if (defender === "off") securityPosture.defenderOff += 1;
    else securityPosture.defenderUnknown += 1;

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
    if (worstDisk?.pct != null) {
      if (worstDisk.pct >= opts.diskAlertThresholdPct) {
        highDiskUsage += 1;
        undersizing.diskCritical += 1;
      } else if (worstDisk.pct >= 70) {
        undersizing.diskWarn += 1;
      }
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
  const win11ReadyCount = win11.on_w11 + win11.ready;
  const bitlockerKnown = securityPosture.bitlockerOn + securityPosture.bitlockerPartial + securityPosture.bitlockerOff;
  const defenderKnown = securityPosture.defenderOn + securityPosture.defenderOff;
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
    win11Readiness: {
      ...win11,
      readyCount: win11ReadyCount,
      readyPct: total > 0 ? Math.round(win11ReadyCount / total * 100) : 0,
      disclaimer: "Estimation based on CPU + RAM (≥ 4 GB) + disk (≥ 64 GB). TPM 2.0 and Secure Boot are not collected — probable compatibility, not Microsoft-certified."
    },
    warranty,
    securityPosture: {
      ...securityPosture,
      bitlockerOnPct: bitlockerKnown > 0 ? Math.round(securityPosture.bitlockerOn / bitlockerKnown * 100) : null,
      defenderOnPct: defenderKnown > 0 ? Math.round(securityPosture.defenderOn / defenderKnown * 100) : null
    },
    undersizing,
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
function equipmentTypeMatches(eqType, requestedType) {
  if (!requestedType) return true;
  const actual = String(eqType || "").trim();
  const requested = String(requestedType || "").trim();
  if (!requested || actual === requested) return true;
  const norm = value => String(value || "").trim().toLowerCase();
  const a = norm(actual);
  const b = norm(requested);
  if (a === b) return true;
  const groups = [
    ["ordinateurs", "workstations", "computers"],
    ["servers", "serveurs", "server"],
    ["storage", "stockage", "nas"],
    ["firewalls", "firewall"],
    ["bornewifi", "wifi"],
    ["routeur", "router"],
    ["alimentation", "power"],
    ["internet"],
    ["switch"],
    ["toip"]
  ];
  return groups.some(group => group.includes(a) && group.includes(b));
}

export async function loadClientEquipmentForFleetStats(clientId, equipmentType = "Ordinateurs", siteFilter = null) {
  if (!clientId) return { items: [], clientSsids: [] };
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
  let items = mapClientHardwareEquipment(clientForMap).filter(eq => equipmentTypeMatches(eq.type, equipmentType));
  if (String(equipmentType).startsWith("Custom:") && items.length === 0) {
    const fleet = await getAllHardwareEquipment().catch(() => []);
    items = (Array.isArray(fleet) ? fleet : []).filter(eq => String(eq.clientId) === String(clientId) && equipmentTypeMatches(eq.type, equipmentType));
  }
  if (siteFilter) {
    items = filterBySite(items, siteFilter);
  }
  const clientSsids = Array.isArray(clientRes?.ssids)
    ? clientRes.ssids
    : Array.isArray(clientRes?.ssid)
      ? clientRes.ssid
      : [];
  return {
    items,
    clientSsids
  };
}
