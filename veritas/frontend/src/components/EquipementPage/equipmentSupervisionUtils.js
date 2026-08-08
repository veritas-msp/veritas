import { isCheckMKMappableType } from "./CheckMKMonitoringStatusBadge";
import { normalizeServerType } from "./equipmentFormConfig";
import { getExpirationStatus, getMaintenanceLicenseExpiration, formatDateFr } from "./constants/firewallLicenceUtils";
import { formatRmmDateTime, getRmmLastInventoryAt, getRmmInventoryFromEquipment, getWindowsUpdateStatus, getWorstDiskUsage, isRmmManagedEquipment } from "./rmmMonitoringUtils";
import { filterMonitoringIssues, resolveEquipmentFamilyKey } from "./supervisionAlertRulesConfig";
const WARRANTY_TYPES = new Set(["Firewalls", "Servers", "Storage", "NAS"]);
const NETWORK_IP_TYPES = new Set(["Firewalls", "Switch", "Routeur", "Servers", "BorneWifi", "TOIP"]);
function pushIssue(issues, issue) {
  issues.push(issue);
}
function readWarrantyDate(equipment) {
  return equipment?.expirationGarantie || equipment?.rawData?.expirationGarantie || null;
}
function readBatteryDate(equipment) {
  return equipment?.dateBatterie || equipment?.rawData?.dateBatterie || null;
}
function readMaintenanceDate(equipment) {
  const licences = equipment?.licences || equipment?.rawData?.licences || [];
  return getMaintenanceLicenseExpiration(licences) || null;
}
function expirationIssue(keyPrefix, labelPrefix, rawDate, {
  priorityExpired = 1,
  prioritySoon = 2
} = {}) {
  const status = getExpirationStatus(rawDate);
  if (status === "unknown") return null;
  const formatted = formatDateFr(rawDate);
  if (status === "expired") {
    return {
      key: `${keyPrefix}_expired`,
      label: `${labelPrefix} expirede`,
      detail: formatted ? `Since le ${formatted}` : undefined,
      tone: "bad",
      priority: priorityExpired
    };
  }
  if (status === "soon") {
    return {
      key: `${keyPrefix}_soon`,
      label: `${labelPrefix} expires soon`,
      detail: formatted ? `Le ${formatted}` : undefined,
      tone: "warn",
      priority: prioritySoon
    };
  }
  return null;
}
export function buildEquipmentMonitoringSummary(equipment, {
  monitorStatus,
  checkmkEnabled = true,
  isMkMapped = false,
  alertRules = null
} = {}) {
  const issues = [];
  const type = equipment?.type === "NAS" ? "Storage" : equipment?.type;
  const displayType = type || "Device";
  if (monitorStatus === "critical") {
    pushIssue(issues, {
      key: "monitor_critical",
      label: "Alert critical",
      tone: "bad",
      priority: 0
    });
  } else if (monitorStatus === "warning") {
    pushIssue(issues, {
      key: "monitor_warning",
      label: "Warning supervision",
      tone: "warn",
      priority: 1
    });
  } else if (monitorStatus === "offline") {
    pushIssue(issues, {
      key: "agent_offline",
      label: "Agent hors ligne (+48 h)",
      tone: "bad",
      priority: 0
    });
  } else if (monitorStatus === "unmapped" && checkmkEnabled && isCheckMKMappableType(displayType)) {
    pushIssue(issues, {
      key: "unmapped",
      label: "Not mapped to CheckMK",
      tone: "warn",
      priority: 2
    });
  } else if (monitorStatus === "no_data" && checkmkEnabled && isMkMapped) {
    pushIssue(issues, {
      key: "no_data",
      label: "No monitoring data",
      tone: "warn",
      priority: 3
    });
  }
  if (WARRANTY_TYPES.has(displayType)) {
    const serverType = normalizeServerType(equipment?.typeServer || equipment?.rawData?.typeServer || equipment?.rawData?.type || "");
    const skipWarranty = displayType === "Servers" && serverType === "virtuel";
    if (!skipWarranty) {
      const warrantyIssue = expirationIssue("warranty", "Garantie", readWarrantyDate(equipment), {
        priorityExpired: 1,
        prioritySoon: 2
      });
      if (warrantyIssue) pushIssue(issues, warrantyIssue);
    }
  }
  if (displayType === "Firewalls") {
    const maintIssue = expirationIssue("maintenance", "Maintenance license", readMaintenanceDate(equipment), {
      priorityExpired: 0,
      prioritySoon: 1
    });
    if (maintIssue) pushIssue(issues, maintIssue);
  }
  if (displayType === "Alimentation") {
    const batteryIssue = expirationIssue("battery", "Batterie", readBatteryDate(equipment), {
      priorityExpired: 1,
      prioritySoon: 2
    });
    if (batteryIssue) {
      batteryIssue.label = batteryIssue.key === "battery_expired" ? "Battery to replace" : "Battery to monitor";
      pushIssue(issues, batteryIssue);
    }
  }
  if (displayType === "Ordinateurs" && isRmmManagedEquipment(equipment)) {
    const inventory = getRmmInventoryFromEquipment(equipment);
    const updates = getWindowsUpdateStatus(inventory);
    if ((updates.pendingCount ?? 0) > 0) {
      pushIssue(issues, {
        key: "updates_pending",
        label: updates.label,
        tone: updates.tone,
        priority: 1
      });
    }
    const worstDisk = getWorstDiskUsage(inventory);
    if ((worstDisk?.pct ?? 0) >= 90) {
      pushIssue(issues, {
        key: "disk_critical",
        label: `Disk ${worstDisk.pct}% used`,
        detail: worstDisk.drive || undefined,
        tone: "bad",
        priority: 0
      });
    } else if ((worstDisk?.pct ?? 0) >= 80) {
      pushIssue(issues, {
        key: "disk_warn",
        label: `Disk ${worstDisk.pct}% used`,
        detail: worstDisk.drive || undefined,
        tone: "warn",
        priority: 2
      });
    }
  }
  if (NETWORK_IP_TYPES.has(displayType) && !equipment?.ip && !equipment?.rawData?.ipNonFixe) {
    pushIssue(issues, {
      key: "missing_ip",
      label: "IP not set",
      tone: "warn",
      priority: 4
    });
  }
  const displayTypeForRules = equipment?.type === "NAS" ? "Storage" : equipment?.type;
  const filteredIssues = alertRules ? filterMonitoringIssues(issues, displayTypeForRules, alertRules) : issues;
  filteredIssues.sort((a, b) => a.priority - b.priority);
  const tone = filteredIssues.some(i => i.tone === "bad") ? "bad" : filteredIssues.some(i => i.tone === "warn") ? "warn" : "good";
  const warrantyStatus = WARRANTY_TYPES.has(displayType) ? getExpirationStatus(readWarrantyDate(equipment)) : "unknown";
  const maintenanceStatus = displayType === "Firewalls" ? getExpirationStatus(readMaintenanceDate(equipment)) : "unknown";
  return {
    issues: filteredIssues,
    tone,
    isUpToDate: filteredIssues.length === 0,
    label: filteredIssues.length === 0 ? "OK" : tone === "bad" ? "Action requise" : "To monitor",
    primaryIssue: filteredIssues[0] || null,
    warrantyStatus,
    maintenanceStatus,
    warrantyDate: readWarrantyDate(equipment),
    maintenanceDate: readMaintenanceDate(equipment),
    equipmentFamily: resolveEquipmentFamilyKey(displayTypeForRules)
  };
}
export function formatExpirationChip(status, rawDate) {
  if (status === "unknown" || !rawDate) return {
    label: "-",
    tone: "neutral"
  };
  const formatted = formatDateFr(rawDate);
  if (status === "expired") return {
    label: formatted ? `Exp. ${formatted}` : "Expired",
    tone: "bad"
  };
  if (status === "soon") return {
    label: formatted ? `Expire ${formatted}` : "Expiring soon",
    tone: "warn"
  };
  return {
    label: formatted ? `OK · ${formatted}` : "OK",
    tone: "good"
  };
}
export function equipmentHasMonitoringIssues(summary) {
  return Boolean(summary?.issues?.length);
}
export function resolveEquipmentLastCollectionAt(equipment, mkSummary) {
  if (isRmmManagedEquipment(equipment)) {
    const at = getRmmLastInventoryAt(equipment);
    if (at) return {
      at,
      source: "RMM"
    };
  }
  if (mkSummary?.lastSyncedAt) {
    return {
      at: mkSummary.lastSyncedAt,
      source: "CheckMK"
    };
  }
  return null;
}
export function formatEquipmentLastCollection(equipment, mkSummary) {
  const info = resolveEquipmentLastCollectionAt(equipment, mkSummary);
  if (!info?.at) return null;
  return {
    ...info,
    formatted: formatRmmDateTime(info.at)
  };
}
