import { repairRmmInventoryTextFields, repairRmmTextEncoding } from "../../utils/rmmTextEncoding";
export const DEFAULT_OFFLINE_THRESHOLD_MINUTES = 15;
export const DEFAULT_OFFLINE_ALERT_THRESHOLD_HOURS = 48;
export { repairRmmTextEncoding };
export function getRmmInventoryFromEquipment(equipment) {
  const raw = equipment?.rawData;
  if (!raw || typeof raw !== "object") return {};
  let inventory;
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    inventory = {
      ...raw.data,
      ...raw
    };
  } else {
    inventory = raw;
  }
  return repairRmmInventoryTextFields(inventory);
}
export function isRmmManagedEquipment(equipment) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  return Boolean(equipment?.agentManaged || inventory.source === "rmm" || equipment?.rawData?.source === "rmm" || equipment?.rmmAgentId || inventory.agentId || inventory.agent_id);
}
export function getRmmAgentId(equipment) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  return equipment?.rmmAgentId || inventory.agentId || inventory.agent_id || equipment?.rawData?.agent_id || null;
}
export function getRmmAgentVersion(equipment) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  const version = inventory.agentVersion || inventory.agent_version || equipment?.agentVersion || equipment?.agent_version || equipment?.rawData?.agentVersion || equipment?.rawData?.agent_version || null;
  if (version == null || version === "") return null;
  return String(version).trim();
}
/** True when agent version is >= minVersion (e.g. command-poll full sync from 1.0.10). */
export function isRmmAgentVersionAtLeast(version, minVersion) {
  const parse = value => String(value || "").replace(/^v/i, "").split(/[^\d]+/).filter(Boolean).map(part => Number.parseInt(part, 10) || 0);
  const left = parse(version);
  const right = parse(minVersion);
  if (!left.length || !right.length) return false;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const a = left[i] || 0;
    const b = right[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}
export const RMM_COMMAND_POLL_MIN_VERSION = "1.0.10";
export function agentSupportsImmediateFullSync(equipment) {
  return isRmmAgentVersionAtLeast(getRmmAgentVersion(equipment), RMM_COMMAND_POLL_MIN_VERSION);
}
export const DEFAULT_RMM_HEARTBEAT_INTERVAL_MINUTES = 5;
/** Effective heartbeat interval (override / agent settings), clamped 1–1440. */
export function resolveRmmHeartbeatIntervalMinutes(equipment, overrideMinutes) {
  const candidates = [overrideMinutes, equipment?.heartbeatIntervalMinutes, equipment?.heartbeat_interval_minutes, equipment?.rawData?.heartbeatIntervalMinutes, equipment?.rawData?.heartbeat_interval_minutes];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.min(1440, Math.max(1, Math.round(n)));
  }
  return DEFAULT_RMM_HEARTBEAT_INTERVAL_MINUTES;
}
/**
 * Offline threshold used for Online/Offline display.
 * Never shorter than heartbeat + grace, so a healthy agent is not marked offline
 * between two scheduled heartbeats.
 */
export function resolveRmmOfflineThresholdMinutes(equipment, {
  offlineThresholdMinutes,
  heartbeatIntervalMinutes
} = {}) {
  const heartbeat = resolveRmmHeartbeatIntervalMinutes(equipment, heartbeatIntervalMinutes);
  const candidates = [offlineThresholdMinutes, equipment?.offlineThresholdMinutes, equipment?.offline_threshold_minutes, equipment?.offlineThresholdEffectiveMinutes, equipment?.offline_threshold_effective_minutes, equipment?.rawData?.offlineThresholdMinutes, equipment?.rawData?.offline_threshold_minutes];
  let configured = DEFAULT_OFFLINE_THRESHOLD_MINUTES;
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      configured = Math.min(10080, Math.max(1, Math.round(n)));
      break;
    }
  }
  const grace = Math.max(5, Math.ceil(heartbeat * 0.25));
  return Math.max(configured, heartbeat + grace);
}
export function getRmmLastInventoryAt(equipment) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  return equipment?.rmmLastSeenAt || equipment?.last_seen_at || inventory.lastInventoryAt || inventory.collectedAt || equipment?.rawData?.lastInventoryAt || equipment?.rawData?.last_seen_at || equipment?.rawData?.rmm_last_heartbeat || equipment?.rmmLastHeartbeat || null;
}
export function resolveRmmAgentOnline(equipment, offlineThresholdMinutes) {
  if (equipment?.rmmLiveOnline === true || equipment?.rmmLiveOnline === false) {
    return equipment.rmmLiveOnline;
  }
  const inventory = getRmmInventoryFromEquipment(equipment);
  const lastAt = getRmmLastInventoryAt(equipment);
  const threshold = offlineThresholdMinutes != null && Number.isFinite(Number(offlineThresholdMinutes)) ? Number(offlineThresholdMinutes) : resolveRmmOfflineThresholdMinutes(equipment);
  if (lastAt) {
    const ageMs = Date.now() - new Date(lastAt).getTime();
    if (Number.isFinite(ageMs)) {
      return ageMs <= threshold * 60 * 1000;
    }
  }
  const explicit = equipment?.agentOnline ?? inventory.agentOnline;
  if (explicit === true || explicit === false) return explicit;
  return null;
}
export function getRmmAgentStatusKey(equipment, offlineThresholdMinutes) {
  if (!isRmmManagedEquipment(equipment)) return "manual";
  const online = resolveRmmAgentOnline(equipment, offlineThresholdMinutes);
  if (online === true) return "online";
  if (online === false) return "offline";
  return "unknown";
}
export function getRmmLastSeenAgeMs(equipment) {
  const lastAt = getRmmLastInventoryAt(equipment);
  if (!lastAt) return null;
  const ageMs = Date.now() - new Date(lastAt).getTime();
  return Number.isFinite(ageMs) ? ageMs : null;
}
export function isRmmAgentOfflineAlertable(equipment, alertThresholdHours = DEFAULT_OFFLINE_ALERT_THRESHOLD_HOURS) {
  if (!isRmmManagedEquipment(equipment)) return false;
  if (resolveRmmAgentOnline(equipment) !== false) return false;
  const ageMs = getRmmLastSeenAgeMs(equipment);
  if (ageMs == null) return false;
  const thresholdMs = Math.max(1, Number(alertThresholdHours) || DEFAULT_OFFLINE_ALERT_THRESHOLD_HOURS) * 60 * 60 * 1000;
  return ageMs >= thresholdMs;
}
function parseRmmDateTime(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const cimMatch = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.\d+)?(?:([+-])(\d{3}))?$/);
  if (cimMatch) {
    const [, y, mo, d, h, mi, s, sign, offsetStr] = cimMatch;
    const offsetMinutes = offsetStr ? Number(offsetStr) * (sign === "-" ? -1 : 1) : 0;
    const utcMs = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) - offsetMinutes * 60 * 1000;
    const cimDate = new Date(utcMs);
    return Number.isNaN(cimDate.getTime()) ? null : cimDate;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
export function formatRmmDateTime(iso) {
  const date = parseRmmDateTime(iso);
  if (!date) return "-";
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
export function roundStorageGB(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}
export function formatStorageGB(value) {
  const rounded = roundStorageGB(value);
  if (rounded == null) return null;
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}
export function formatDiskUsage(freeGB, sizeGB) {
  if (sizeGB == null || sizeGB <= 0) return null;
  const total = roundStorageGB(sizeGB);
  const used = roundStorageGB(Math.max(0, Number(sizeGB) - Number(freeGB ?? 0)));
  if (total == null || used == null) return null;
  const pct = Math.round(used / total * 100);
  return {
    used: formatStorageGB(used),
    total: formatStorageGB(total),
    pct
  };
}
export function formatHotfixId(hotfix) {
  if (hotfix == null || hotfix === "") return null;
  if (typeof hotfix === "string" || typeof hotfix === "number") return String(hotfix);
  if (typeof hotfix === "object") {
    return hotfix.HotFixID || hotfix.hotFixID || hotfix.id || null;
  }
  return null;
}
export function formatKbId(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^KB/i.test(raw)) return raw.toUpperCase();
  if (/^\d+$/.test(raw)) return `KB${raw}`;
  return raw;
}
function extractHotfixDateRaw(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const nested = value.DateTime ?? value.datetime ?? value.value ?? value.Value ?? value.date ?? value.Date ?? null;
    if (nested != null && nested !== value) return extractHotfixDateRaw(nested);
  }
  return null;
}
function parseHotfixDate(value) {
  const rawValue = extractHotfixDateRaw(value);
  if (rawValue == null || rawValue === "") return null;
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) return rawValue;
  const raw = String(rawValue).trim();
  if (!raw) return null;
  const cimMatch = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (cimMatch) {
    const date = new Date(Number(cimMatch[1]), Number(cimMatch[2]) - 1, Number(cimMatch[3]));
    if (!Number.isNaN(date.getTime())) return date;
  }
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const date = new Date(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
    if (!Number.isNaN(date.getTime())) return date;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}
export function formatHotfixInstalledOn(value) {
  const date = parseHotfixDate(value);
  if (!date) {
    const raw = extractHotfixDateRaw(value);
    return raw && typeof raw === "string" ? raw : null;
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
export function normalizeRecentHotfixes(hotfixes) {
  if (!Array.isArray(hotfixes)) return [];
  return hotfixes.map(item => {
    const id = formatHotfixId(item);
    if (!id) return null;
    const installedOn = item && typeof item === "object" ? item.InstalledOn || item.installedOn || null : null;
    const description = item && typeof item === "object" ? item.Description || item.description || null : null;
    return {
      id: String(id),
      kb: formatKbId(id),
      installedOn,
      installedOnLabel: formatHotfixInstalledOn(installedOn),
      description
    };
  }).filter(Boolean);
}
export function getLatestHotfixLabel(hotfixes) {
  const normalized = normalizeRecentHotfixes(hotfixes);
  const latest = normalized[0];
  if (!latest) return null;
  return latest.kb || latest.id;
}
function normalizeDiskEntry(disk) {
  if (!disk || typeof disk !== "object") return null;
  const sizeGB = disk.sizeGB ?? disk.sizeGb ?? null;
  const freeGB = disk.freeGB ?? disk.freeGb ?? null;
  const drive = disk.drive || disk.device || disk.DeviceID || null;
  const usage = formatDiskUsage(freeGB, sizeGB);
  if (!usage && sizeGB == null) return null;
  return {
    drive,
    sizeGB,
    freeGB,
    pct: usage?.pct ?? null
  };
}
export function getWorstDiskUsage(inventory = {}) {
  const hardware = inventory.hardware || {};
  const disks = Array.isArray(hardware.disks) ? hardware.disks : [];
  let worst = null;
  for (const raw of disks) {
    const disk = normalizeDiskEntry(raw);
    if (!disk || disk.pct == null) continue;
    if (!worst || disk.pct > worst.pct) worst = disk;
  }
  return worst;
}
export function formatWorstDiskLabel(inventory = {}) {
  const worst = getWorstDiskUsage(inventory);
  if (!worst) return null;
  const drive = worst.drive ? `${worst.drive} ` : "";
  return `${drive}${worst.pct}%`;
}
export function getWindowsUpdateStatus(inventory = {}) {
  const updates = inventory.updates || {};
  const pendingCount = updates.pendingCount ?? (Array.isArray(updates.pending) ? updates.pending.length : null);
  if (pendingCount != null) {
    if (pendingCount === 0) {
      return {
        label: "Up to date",
        tone: "good",
        pendingCount: 0,
        hasPendingScan: true
      };
    }
    return {
      label: `${pendingCount} en attente`,
      tone: pendingCount >= 5 ? "bad" : "warn",
      pendingCount,
      hasPendingScan: true
    };
  }
  if (normalizeRecentHotfixes(updates.recentHotfixes).length > 0) {
    return {
      label: "Sync complet requis",
      tone: "neutral",
      pendingCount: null,
      hasPendingScan: false
    };
  }
  return {
    label: "-",
    tone: "neutral",
    pendingCount: null,
    hasPendingScan: false
  };
}
export function formatRmmOsShort(inventory = {}, equipment = null) {
  const editionInfo = getRmmOsEditionInfo(inventory, equipment);
  if (editionInfo.shortLabel) return editionInfo.shortLabel;
  const os = inventory.os || {};
  const name = equipment?.systeme || inventory.systeme || os.name || null;
  const build = os.build || null;
  if (name && build) return `${name} (${build})`;
  return name || build || null;
}
export function formatRmmOsTableLabel(inventory = {}, equipment = null) {
  const info = getRmmOsEditionInfo(inventory, equipment);
  const os = inventory.os || {};
  let base = info.osCaption || os.name || equipment?.systeme || inventory.systeme || null;
  if (base) {
    base = String(base).replace(/^Microsoft\s+/i, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  const displayVersion = info.displayVersion;
  if (base && displayVersion) {
    const lower = base.toLowerCase();
    if (!lower.includes(String(displayVersion).toLowerCase())) {
      return `${base} ${displayVersion}`;
    }
  }
  if (base) return base;
  return info.shortLabel || formatRmmOsShort(inventory, equipment);
}
export function formatRmmOsBuildLabel(inventory = {}) {
  const os = inventory.os || {};
  if (os.patchLabel) {
    return String(os.patchLabel).replace(/^OS Build\s+/i, "").trim();
  }
  if (os.build != null && os.ubr != null) return `${os.build}.${os.ubr}`;
  if (os.build != null) return String(os.build);
  return null;
}
export function getRmmAgentOsDisplay(agent) {
  if (!agent) return {
    label: null,
    build: null,
    iconSource: null
  };
  if (agent.equipment) {
    const inventory = getRmmInventoryFromEquipment(agent.equipment);
    const label = formatRmmOsTableLabel(inventory, agent.equipment);
    const build = formatRmmOsBuildLabel(inventory);
    return {
      label,
      build,
      iconSource: label || agent.os
    };
  }
  return {
    label: agent.os || null,
    build: agent.os_build != null ? String(agent.os_build) : null,
    iconSource: agent.os
  };
}
const WINDOWS_EDITION_ID_LABELS = {
  Professional: "Professionnel",
  ProfessionalWorkstation: "Professionnel pour workstations",
  ProfessionalEducation: "Éducation Professionnel",
  ProfessionalSingleLanguage: "Professionnel (langue unique)",
  ProfessionalCountrySpecific: "Professionnel (pays)",
  Enterprise: "Company",
  EnterpriseS: "Company S",
  EnterpriseG: "Company G",
  Education: "Éducation",
  Core: "Core",
  CoreSingleLanguage: "Core (langue unique)",
  CoreCountrySpecific: "Core (pays)",
  CoreN: "Core N",
  ServerStandard: "Server Standard",
  ServerDatacenter: "Server Datacenter",
  ServerDatacenterCore: "Server Datacenter Core",
  ServerStandardCore: "Server Standard Core",
  ServerRdsh: "Server RDSH",
  IoTEnterprise: "IoT Company",
  CloudEdition: "Cloud Edition"
};
function cleanWindowsLicenseName(value) {
  if (!value) return null;
  return String(value).replace(/^Windows\(R\),\s*/i, "").replace(/\s+edition$/i, "").trim();
}
function parseEditionFromOsCaption(caption) {
  if (!caption) return null;
  const text = String(caption).trim();
  const patterns = [/Windows(?:\s+Server)?\s+[\d.]+\s+(.+?)(?:\s+\d+-bit)?$/i, /Windows\s+(.+?)(?:\s+\d+-bit)?$/i];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const edition = match[1].trim();
      if (edition && !/^microsoft$/i.test(edition)) return edition;
    }
  }
  return null;
}
export function formatRmmEditionId(editionId) {
  if (!editionId) return null;
  const key = String(editionId).trim();
  return WINDOWS_EDITION_ID_LABELS[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function getRmmOsEditionInfo(inventory = {}, equipment = null) {
  const os = inventory.os || {};
  const license = inventory.license || {};
  const licenseName = repairRmmTextEncoding(cleanWindowsLicenseName(license.edition || license.name) || "") || null;
  const captionSource = repairRmmTextEncoding(os.name || inventory.systeme || equipment?.systeme || "") || "";
  const editionFromCaption = parseEditionFromOsCaption(captionSource);
  const edition = repairRmmTextEncoding(licenseName || editionFromCaption || formatRmmEditionId(os.editionId) || "") || null;
  const displayVersion = os.displayVersion || null;
  const build = os.patchLabel || (os.build != null ? String(os.build) : null);
  const osCaption = captionSource || null;
  const licenseLabel = license.activated === true ? "Enabled" : license.activated === false ? "Not enabled" : null;
  const shortParts = [edition, displayVersion].filter(Boolean);
  const shortLabel = shortParts.length ? shortParts.join(" · ") : osCaption;
  return {
    edition,
    editionId: os.editionId || null,
    displayVersion,
    build,
    osCaption,
    licenseName: license.name || license.edition || null,
    licenseActivated: license.activated ?? null,
    licenseLabel,
    shortLabel
  };
}
export function formatRmmRam(inventory = {}, equipment = null) {
  const hardware = inventory.hardware || {};
  const perf = inventory.performance || {};
  const ramGB = roundStorageGB(hardware.ramGB ?? hardware.ramGb ?? null);
  if (perf.ramUsagePct != null && ramGB != null) {
    return `${perf.ramUsagePct}% (${formatStorageGB(ramGB)} Go)`;
  }
  if (ramGB != null) return `${formatStorageGB(ramGB)} Go`;
  return equipment?.memoire || null;
}
export function formatUptime(seconds) {
  const total = Math.floor(Number(seconds));
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total < 60) return "< 1 min";
  const days = Math.floor(total / 86400);
  const hours = Math.floor(total % 86400 / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
export function resolveRmmUptimeLabel(inventory = {}) {
  const perf = inventory.performance || {};
  const fromAgent = formatUptime(perf.uptimeSeconds);
  if (fromAgent) return fromAgent;
  const lastBoot = inventory.os?.lastBoot || inventory.lastBootUpTime || inventory.os?.lastBootUpTime || null;
  if (!lastBoot) return null;
  const boot = new Date(lastBoot);
  if (Number.isNaN(boot.getTime())) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - boot.getTime()) / 1000));
  return formatUptime(seconds);
}
export function formatTemperatureC(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${Math.round(n)} °C`;
}
export function getPerformanceSummary(inventory = {}) {
  const perf = inventory.performance || {};
  return {
    cpuUsagePct: perf.cpuUsagePct ?? null,
    ramUsagePct: perf.ramUsagePct ?? null,
    ramUsedGB: perf.ramUsedGB ?? null,
    ramTotalGB: perf.ramTotalGB ?? inventory.hardware?.ramGB ?? null,
    uptimeSeconds: perf.uptimeSeconds ?? null,
    uptimeLabel: formatUptime(perf.uptimeSeconds),
    processCount: perf.processCount ?? null
  };
}
export function getSensorSummary(inventory = {}) {
  const sensors = inventory.sensors || {};
  const list = Array.isArray(sensors.sensors) ? sensors.sensors : [];
  const maxTempC = sensors.maxTempC ?? null;
  const hasThermalData = maxTempC != null || list.some(item => item?.type === "thermal" && Number.isFinite(Number(item?.value)) && Number(item.value) > 0);
  return {
    maxTempC,
    maxTempLabel: formatTemperatureC(maxTempC),
    hasThermalData,
    sensors: list,
    battery: sensors.battery || null
  };
}
export function getSecuritySummary(inventory = {}) {
  const security = inventory.security || {};
  const hardware = inventory.hardware || {};
  const disks = Array.isArray(hardware.disks) ? hardware.disks : Array.isArray(inventory.disks) ? inventory.disks : [];
  const rawBitLocker = Array.isArray(security.bitLocker) ? security.bitLocker : Array.isArray(security.bitlocker) ? security.bitlocker : null;
  const hasSimpleShape = security.defenderRealtime != null || typeof security.firewall === "boolean" || typeof security.bitlocker === "boolean" || typeof security.bitLocker === "boolean";
  if (hasSimpleShape && !security.defender) {
    const realtime = security.defenderRealtime === true;
    const firewallOn = security.firewall === true;
    const bitlockerOn = security.bitlocker === true || security.bitLocker === true;
    return {
      defender: {
        enabled: realtime,
        realTimeProtection: realtime,
        productVersion: null
      },
      firewall: [{
        profile: "System",
        enabled: firewallOn
      }],
      bitLocker: normalizeBitLockerVolumes(rawBitLocker, disks, bitlockerOn)
    };
  }
  const defender = security.defender || {};
  const firewall = Array.isArray(security.firewall) ? security.firewall : [];
  const bitlockerOn = security.bitlocker === true || security.bitLocker === true || (rawBitLocker || []).some(isBitLockerVolumeOn);
  return {
    defender: {
      enabled: defender.enabled ?? (defender.realTimeProtection != null ? Boolean(defender.realTimeProtection) : undefined),
      realTimeProtection: defender.realTimeProtection ?? defender.enabled,
      productVersion: defender.productVersion || defender.version || null
    },
    firewall,
    bitLocker: normalizeBitLockerVolumes(rawBitLocker, disks, bitlockerOn)
  };
}
function isBitLockerVolumeOn(volume) {
  const text = `${volume?.protection || ""} ${volume?.encryption || ""}`.toLowerCase();
  if (!text.trim()) return false;
  if (/(protection off|off|disabled|unprotect|unknown)/i.test(text)) return false;
  return /(protection on|on|enabled|encrypt|chiff|locked)/i.test(text);
}
function normalizeBitLockerVolumes(rawVolumes, disks = [], bitlockerOnFallback = false) {
  const fromAgent = (Array.isArray(rawVolumes) ? rawVolumes : []).map(vol => {
    const mountPoint = String(vol?.mountPoint || vol?.drive || vol?.deviceId || "").trim();
    if (!mountPoint) return null;
    return {
      mountPoint,
      deviceId: vol?.deviceId || null,
      protection: vol?.protection || (vol?.protectionStatus === 1 ? "On" : vol?.protectionStatus === 0 ? "Off" : "Unknown"),
      encryption: vol?.encryption || (isBitLockerVolumeOn(vol) ? "BitLocker" : "-"),
      protectionStatus: vol?.protectionStatus ?? null,
      conversionStatus: vol?.conversionStatus ?? null
    };
  }).filter(Boolean);
  if (fromAgent.length) {
    const byMount = new Map();
    for (const vol of fromAgent) {
      const key = String(vol.mountPoint).toUpperCase();
      if (!byMount.has(key)) byMount.set(key, vol);
    }
    // Merge fixed disks missing from BitLocker WMI (e.g. letter present in storage only).
    for (const disk of disks) {
      const mount = String(disk?.drive || disk?.device || disk?.letter || "").trim();
      if (!mount) continue;
      const key = mount.toUpperCase();
      if (byMount.has(key)) continue;
      byMount.set(key, {
        mountPoint: mount,
        deviceId: null,
        protection: "Unknown",
        encryption: "-",
        protectionStatus: null,
        conversionStatus: null
      });
    }
    return [...byMount.values()].sort((a, b) => String(a.mountPoint).localeCompare(String(b.mountPoint), undefined, {
      sensitivity: "base"
    }));
  }
  if (disks.length) {
    return disks.map(disk => {
      const mount = String(disk?.drive || disk?.device || disk?.letter || "").trim() || "?";
      // Legacy boolean: false ⇒ all Off; true ⇒ Unknown per volume (we don't know which ones).
      const protection = bitlockerOnFallback ? "Unknown" : "Off";
      return {
        mountPoint: mount,
        deviceId: null,
        protection,
        encryption: bitlockerOnFallback ? "BitLocker?" : "-",
        protectionStatus: null,
        conversionStatus: null
      };
    }).sort((a, b) => String(a.mountPoint).localeCompare(String(b.mountPoint), undefined, {
      sensitivity: "base"
    }));
  }
  return [{
    mountPoint: "C:",
    protection: bitlockerOnFallback ? "On" : "Off",
    encryption: bitlockerOnFallback ? "BitLocker" : "-"
  }];
}
export function formatPendingKb(kb) {
  if (kb == null || kb === "") return null;
  const parts = String(kb).split(",").map(part => formatKbId(part.trim())).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
export function getUpdatesDetail(inventory = {}) {
  const updates = inventory.updates || {};
  const pendingItems = Array.isArray(updates.pendingItems) ? updates.pendingItems : [];
  const driverItems = Array.isArray(updates.driverItems) ? updates.driverItems : [];
  const recentHotfixes = normalizeRecentHotfixes(updates.recentHotfixes);
  const status = getWindowsUpdateStatus(inventory);
  const securityPendingCount = pendingItems.filter(item => /security/i.test(String(item?.title || item?.description || ""))).length;
  return {
    ...status,
    rebootRequired: Boolean(updates.rebootRequired),
    pendingItems,
    driverItems,
    driverCount: updates.driverCount ?? driverItems.length,
    recentHotfixes,
    latestInstalledHotfix: recentHotfixes[0] || null,
    installedHotfixCount: recentHotfixes.length,
    securityPendingCount
  };
}
export function buildWindowsUpdatesPresentation(updatesDetail = {}, {
  lastFullInventoryAt = null
} = {}) {
  const pending = updatesDetail.pendingCount;
  const installed = updatesDetail.installedHotfixCount || 0;
  const reboot = updatesDetail.rebootRequired;
  const scanned = updatesDetail.hasPendingScan;
  const drivers = updatesDetail.driverCount || 0;
  const securityPending = updatesDetail.securityPendingCount || 0;
  let level = "unknown";
  let title = "Patch status unknown";
  let hint = "No Windows Update data for this workstation.";
  let icon = "mdi:shield-search";
  if (scanned) {
    if (reboot && pending === 0) {
      level = "reboot";
      title = "Restart required";
      hint = "Updates are installed but a restart is required to apply them.";
      icon = "mdi:restart-alert";
    } else if (pending === 0 && !reboot) {
      level = "ok";
      title = "System up to date";
      hint = "Windows Update Agent reports no pending software updates.";
      icon = "mdi:shield-check";
    } else if (pending > 0) {
      level = pending >= 5 || securityPending >= 2 ? "critical" : "attention";
      title = securityPending > 0 ? `${pending} pending update${pending > 1 ? "s" : ""} (${securityPending} security)` : `${pending} pending update${pending > 1 ? "s" : ""}`;
      hint = "This workstation is not fully patched. Schedule update installation.";
      icon = "mdi:shield-alert";
    }
  } else if (installed > 0) {
    level = "scan";
    title = "Incomplete missing-updates analysis";
    hint = "Installed patches are known. A full agent sync is required to list missing KBs.";
    icon = "mdi:shield-sync";
  }
  return {
    level,
    title,
    hint,
    icon,
    pending,
    installed,
    reboot,
    scanned,
    drivers,
    securityPending,
    lastFullInventoryAt
  };
}
const RMM_INVENTORY_PLACEHOLDER_TEXT = new Set(["to be filled by o.e.m.", "default string", "system manufacturer", "system product name", "not applicable", "n/a", "none", "system serial number", "serial number", "chassis serial number"]);
export function sanitizeRmmInventoryText(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (RMM_INVENTORY_PLACEHOLDER_TEXT.has(trimmed.toLowerCase())) return null;
  return trimmed;
}
export function getRmmChassisInfo(inventory = {}) {
  const chassis = inventory.chassis || {};
  return {
    manufacturer: sanitizeRmmInventoryText(inventory.fabricant || inventory.marque || inventory.manufacturer || chassis.manufacturer),
    model: sanitizeRmmInventoryText(inventory.modele || inventory.model || chassis.model),
    serial: sanitizeRmmInventoryText(inventory.numeroSerie || inventory.serial || chassis.serialNumber)
  };
}
export function buildRmmAgentRowFromEquipment(equipment, {
  online = null
} = {}) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  const resolvedOnline = online ?? resolveRmmAgentOnline(equipment);
  const updates = getWindowsUpdateStatus(inventory);
  const updatesDetail = getUpdatesDetail(inventory);
  const perf = getPerformanceSummary(inventory);
  const sensor = getSensorSummary(inventory);
  const worstDisk = getWorstDiskUsage(inventory);
  const license = inventory.license || {};
  return {
    id: getRmmAgentId(equipment) || equipment?.id || equipment?.name,
    equipment,
    hostname: getRmmNetbiosName(equipment) || equipment?.name || inventory.hostname || "Poste",
    machine_id: inventory.machineId || null,
    client_name: equipment?.clientName || "-",
    client_id: equipment?.clientId || null,
    online: resolvedOnline ?? false,
    last_seen_at: inventory.lastInventoryAt || inventory.collectedAt || equipment?.rawData?.last_seen_at || null,
    agent_version: getRmmAgentVersion(equipment),
    os: formatRmmOsTableLabel(inventory, equipment),
    os_build: formatRmmOsBuildLabel(inventory),
    ip: equipment?.ip || inventory.network?.ip || inventory.ip || null,
    domain: equipment?.domaine || inventory.domaine || (inventory.domain?.joined ? inventory.domain.name : inventory.domain?.workgroup) || null,
    ram: formatRmmRam(inventory, equipment),
    cpu_pct: perf.cpuUsagePct,
    cpu_label: perf.cpuUsagePct != null ? `${perf.cpuUsagePct}%` : null,
    ram_pct: perf.ramUsagePct,
    temp_c: sensor.maxTempC,
    temp_label: sensor.maxTempLabel,
    disk_label: formatWorstDiskLabel(inventory),
    disk_pct: worstDisk?.pct ?? null,
    disk_drive: worstDisk?.drive || null,
    updates_label: updates.label,
    updates_tone: updates.tone,
    updates_pending: updates.pendingCount,
    updates_reboot_required: updatesDetail.rebootRequired,
    logged_user: inventory.loggedUser || inventory.session?.user || null,
    license_activated: license.activated ?? null,
    license_edition: license.edition || license.name || null,
    last_hotfix: getLatestHotfixLabel(inventory.updates?.recentHotfixes),
    sync_requested_at: null
  };
}
export function getRmmNetbiosName(equipment) {
  if (!equipment) return null;
  const inventory = getRmmInventoryFromEquipment(equipment);
  return inventory.netbios || inventory.hostname || equipment?.netbios || equipment?.rawData?.netbios || equipment?.rawData?.hostname || null;
}
export function getRmmSyncRequestedAt(source = {}) {
  if (!source) return null;
  const candidates = [source];
  if (source.rawData && typeof source.rawData === "object") {
    candidates.push(source.rawData);
    if (source.rawData.data && typeof source.rawData.data === "object") {
      candidates.push(source.rawData.data);
    }
  }
  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;
    if (Object.prototype.hasOwnProperty.call(item, "sync_requested_at") && item.sync_requested_at) {
      return item.sync_requested_at;
    }
    if (Object.prototype.hasOwnProperty.call(item, "syncRequestedAt") && item.syncRequestedAt) {
      return item.syncRequestedAt;
    }
  }
  return null;
}
export function rmmSyncTimestampsMatch(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}
export function resolveRmmSyncRequestState(equipment, override = undefined) {
  if (override === null) {
    return {
      pending: false,
      requestedAt: null
    };
  }
  const requestedAt = override !== undefined ? override : getRmmSyncRequestedAt(equipment);
  const pending = Boolean(requestedAt && Number.isFinite(new Date(requestedAt).getTime()));
  return {
    pending,
    requestedAt: pending ? requestedAt : null
  };
}
export function estimateNextRmmCollectionAt(lastInventoryAt, intervalMinutes = DEFAULT_RMM_HEARTBEAT_INTERVAL_MINUTES) {
  const intervalMs = Math.max(1, Number(intervalMinutes) || DEFAULT_RMM_HEARTBEAT_INTERVAL_MINUTES) * 60 * 1000;
  const now = Date.now();
  if (lastInventoryAt) {
    const lastMs = new Date(lastInventoryAt).getTime();
    if (!Number.isFinite(lastMs)) return null;
    let nextMs = lastMs + intervalMs;
    while (nextMs <= now + 15000) {
      nextMs += intervalMs;
    }
    return new Date(nextMs);
  }
  return new Date(now + intervalMs);
}
export function formatFutureRelativeFrench(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "imminent";
  const diffMin = Math.ceil(diffMs / 60000);
  if (diffMin <= 1) return "dans moins d'une minute";
  if (diffMin < 60) return `dans ${diffMin} min`;
  const diffH = Math.ceil(diffMin / 60);
  if (diffH < 24) return `dans ${diffH} h`;
  return d.toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false
  });
}
export function formatRmmExpectedCollectionLabel(equipment, intervalMinutes, {
  withAbsolute = true
} = {}) {
  if (resolveRmmAgentOnline(equipment) === false) {
    return "agent hors ligne";
  }
  const resolvedInterval = resolveRmmHeartbeatIntervalMinutes(equipment, intervalMinutes);
  const nextAt = estimateNextRmmCollectionAt(getRmmLastInventoryAt(equipment), resolvedInterval);
  if (!nextAt) {
    return withAbsolute ? "prochain passage agent" : "prochain passage";
  }
  const relative = formatFutureRelativeFrench(nextAt);
  if (!withAbsolute) {
    return relative;
  }
  const absolute = formatRmmDateTime(nextAt.toISOString());
  return `${relative} (${absolute})`;
}
export function isRmmSyncPending(source = {}) {
  const syncRequestedAt = getRmmSyncRequestedAt(source);
  if (!syncRequestedAt) return false;
  return Number.isFinite(new Date(syncRequestedAt).getTime());
}
export function isRmmSyncPendingForEquipment(equipment) {
  return isRmmSyncPending(equipment);
}
export function patchEquipmentRmmSyncRequest(equipment, syncRequestedAt) {
  if (!equipment) return equipment;
  const raw = equipment.rawData && typeof equipment.rawData === "object" ? {
    ...equipment.rawData
  } : {};
  const hasNestedData = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data);
  const inner = hasNestedData ? {
    ...raw.data
  } : {
    ...raw
  };
  const SYNC_KEYS = ["syncRequestedAt", "sync_requested_at", "Sync_requested_at", "SyncRequestedAt"];
  if (syncRequestedAt) {
    inner.syncRequestedAt = syncRequestedAt;
  } else {
    for (const key of SYNC_KEYS) {
      delete inner[key];
    }
  }
  if (hasNestedData) {
    raw.data = inner;
  } else {
    Object.assign(raw, inner);
  }
  for (const key of SYNC_KEYS) {
    delete raw[key];
  }
  return {
    ...equipment,
    rawData: raw
  };
}
export function mergeRmmAgentRows(apiRows = [], equipmentRows = []) {
  const byKey = new Map();
  for (const row of equipmentRows) {
    const key = String(row.id || row.hostname || "").toLowerCase();
    if (key) byKey.set(key, row);
  }
  for (const apiRow of apiRows) {
    const key = String(apiRow.id || apiRow.hostname || apiRow.machine_id || "").toLowerCase();
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        online: apiRow.online ?? existing.online,
        last_seen_at: apiRow.last_seen_at || existing.last_seen_at,
        agent_version: apiRow.agent_version || existing.agent_version,
        client_name: apiRow.client_name || existing.client_name,
        sync_requested_at: apiRow.sync_requested_at ?? null
      });
    } else {
      byKey.set(key, {
        id: apiRow.id,
        hostname: apiRow.hostname || apiRow.machine_id || "Poste",
        machine_id: apiRow.machine_id || null,
        client_name: apiRow.client_name || "-",
        client_id: apiRow.client_id || null,
        online: apiRow.online ?? false,
        last_seen_at: apiRow.last_seen_at || null,
        agent_version: apiRow.agent_version || null,
        os: null,
        ip: null,
        domain: null,
        ram: null,
        cpu_pct: null,
        cpu_label: null,
        temp_c: null,
        temp_label: null,
        disk_label: null,
        disk_pct: null,
        updates_label: "-",
        updates_tone: "neutral",
        updates_pending: null,
        sync_requested_at: apiRow.sync_requested_at || null,
        equipment: null
      });
    }
  }
  return [...byKey.values()].sort((a, b) => Number(a.online) - Number(b.online));
}
