import { formatStorageGB, getPerformanceSummary, getRmmInventoryFromEquipment, getSensorSummary, getUpdatesDetail, getWindowsUpdateStatus, roundStorageGB } from "./rmmMonitoringUtils";
export const RMM_METRIC_PERIOD_OPTIONS = [{
  days: 1,
  label: "24 h"
}, {
  days: 7,
  label: "7 j"
}, {
  days: 30,
  label: "30 j"
}, {
  days: 90,
  label: "90 j"
}, {
  days: 180,
  label: "6 mois"
}, {
  days: 365,
  label: "1 an"
}, {
  days: 730,
  label: "2 ans"
}];
export function formatMetricPeriodLabel(days) {
  const option = RMM_METRIC_PERIOD_OPTIONS.find(item => item.days === days);
  const label = option?.label || `${days} j`;
  return days === 1 ? `${label} · jour en cours` : `${label} · distribution by day`;
}
export const ZONE_COLORS = {
  normal: "#2b5fab",
  elevated: "#5a82c4",
  critical: "#1a4480",
  used: "#2b5fab",
  free: "#e2e8f0",
  diskUsed: "#2b5fab",
  diskFree: "#e2e8f0",
  updatesOk: "#8b9bb5",
  updatesPending: "#2b5fab",
  updatesUnknown: "#c5d0df",
  tempCool: "#8b9bb5",
  tempWarm: "#5a82c4",
  tempHot: "#2b5fab"
};
function normalizeDriveLabel(drive) {
  const text = String(drive || "").trim().toUpperCase();
  if (!text) return null;
  const letter = text.match(/^([A-Z])/)?.[1];
  return letter ? `${letter}:` : text;
}
export function listInventoryDrives(agent) {
  const inventory = getRmmInventoryFromEquipment(agent?.equipment || {});
  const disks = inventory.hardware?.disks;
  const seen = new Set();
  const drives = [];
  const pushDrive = (label, {
    sizeGB,
    freeGB,
    volumeName = null
  } = {}) => {
    if (!label || seen.has(label)) return;
    seen.add(label);
    const rawSize = sizeGB != null ? Number(sizeGB) : null;
    const rawFree = freeGB != null ? Number(freeGB) : null;
    const normalizedSize = rawSize != null ? roundStorageGB(rawSize) : null;
    const normalizedFree = rawFree != null ? roundStorageGB(rawFree) : null;
    const usedGB = rawSize != null && rawFree != null ? roundStorageGB(Math.max(0, rawSize - rawFree)) : null;
    const pct = rawSize != null && rawSize > 0 && rawFree != null ? Math.round((rawSize - rawFree) / rawSize * 100) : null;
    drives.push({
      label,
      sizeGB: normalizedSize,
      freeGB: normalizedFree,
      usedGB,
      pct,
      volumeName: volumeName ? String(volumeName).trim() : null
    });
  };
  if (Array.isArray(disks)) {
    for (const disk of disks) {
      const label = normalizeDriveLabel(disk.drive || disk.device || disk.DeviceID);
      pushDrive(label, {
        sizeGB: disk.sizeGB ?? disk.sizeGb ?? null,
        freeGB: disk.freeGB ?? disk.freeGb ?? null,
        volumeName: disk.volumeName
      });
    }
  }
  const mapped = inventory.shares?.mappedDrives;
  if (Array.isArray(mapped)) {
    for (const drive of mapped) {
      const label = normalizeDriveLabel(drive.drive);
      const remote = drive.remotePath || drive.provider || null;
      pushDrive(label, {
        sizeGB: drive.sizeGB ?? null,
        freeGB: drive.freeGB ?? null,
        volumeName: remote ? `Network · ${remote}` : "Network"
      });
    }
  }
  drives.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return drives;
}
export function resolveInstantDiskDrives(snapshot) {
  const drives = [...(snapshot?.drives || [])];
  const seen = new Set(drives.map(drive => drive.label));
  const mergeAgentDrive = (label, pct) => {
    if (!label || pct == null) return;
    const existingIndex = drives.findIndex(drive => drive.label === label);
    if (existingIndex >= 0) {
      if (drives[existingIndex].pct == null) {
        drives[existingIndex] = {
          ...drives[existingIndex],
          pct: Number(pct)
        };
      }
      return;
    }
    drives.push({
      label,
      sizeGB: null,
      freeGB: null,
      usedGB: null,
      pct: Number(pct),
      volumeName: null
    });
    seen.add(label);
  };
  mergeAgentDrive(normalizeDriveLabel(snapshot?.diskDrive), snapshot?.diskPct);
  return drives.filter(drive => drive.pct != null || drive.sizeGB != null).sort((a, b) => a.label.localeCompare(b.label, "fr"));
}
export function formatDiskVolumeTitle(disk) {
  if (!disk?.label) return "Disque";
  const label = String(disk.label).trim();
  if (!label) return "Disque";
  if (disk.volumeName) return label;
  return /^[A-Za-z]:/.test(label) ? `Disque ${label}` : label;
}
export function formatDiskVolumeSubtitle(disk) {
  if (!disk?.volumeName) return null;
  return String(disk.volumeName).trim() || null;
}
export function formatDiskVolumeFooter(disk) {
  if (!disk) return null;
  if (disk.usedGB != null && disk.sizeGB != null) {
    return `${formatStorageGB(disk.usedGB)} / ${formatStorageGB(disk.sizeGB)} Go`;
  }
  if (disk.freeGB != null && disk.sizeGB != null) {
    return `${formatStorageGB(disk.freeGB)} Go libres sur ${formatStorageGB(disk.sizeGB)} Go`;
  }
  if (disk.sizeGB != null) {
    return `${formatStorageGB(disk.sizeGB)} Go au total`;
  }
  return null;
}
export function buildMetricSnapshot(agent) {
  const inventory = getRmmInventoryFromEquipment(agent?.equipment || {});
  const perf = getPerformanceSummary(inventory);
  const sensor = getSensorSummary(inventory);
  const updates = getWindowsUpdateStatus(inventory);
  const updatesDetail = getUpdatesDetail(inventory);
  return {
    cpuPct: agent?.cpu_pct ?? perf.cpuUsagePct ?? null,
    ramPct: agent?.ram_pct ?? perf.ramUsagePct ?? null,
    ramUsedGB: roundStorageGB(perf.ramUsedGB),
    ramTotalGB: roundStorageGB(perf.ramTotalGB ?? inventory.hardware?.ramGB ?? null),
    tempC: agent?.temp_c ?? sensor.maxTempC ?? null,
    tempLabel: agent?.temp_label ?? sensor.maxTempLabel ?? null,
    updatesLabel: agent?.updates_label ?? updates.label ?? null,
    updatesTone: agent?.updates_tone ?? updates.tone ?? "neutral",
    updatesPending: agent?.updates_pending ?? updates.pendingCount ?? updatesDetail.pendingItems?.length ?? null,
    diskPct: agent?.disk_pct ?? null,
    diskDrive: agent?.disk_drive ?? null,
    drives: listInventoryDrives(agent)
  };
}
export function buildUsageDonutSegments(usedPct, {
  usedLabel = "Used",
  freeLabel = "Libre"
} = {}) {
  const used = Math.max(0, Math.min(100, Number(usedPct) || 0));
  const free = Math.max(0, 100 - used);
  return [{
    name: usedLabel,
    value: used,
    color: ZONE_COLORS.used
  }, {
    name: freeLabel,
    value: free,
    color: ZONE_COLORS.free
  }];
}
export function buildDiskDonutSegments(disk) {
  if (!disk || disk.pct == null) return [];
  const used = Math.max(0, Math.min(100, disk.pct));
  return [{
    name: "Busy",
    value: used,
    color: ZONE_COLORS.diskUsed
  }, {
    name: "Libre",
    value: 100 - used,
    color: ZONE_COLORS.diskFree
  }];
}
export function resolvePrimaryDiskHistory(disks) {
  if (!disks || typeof disks !== "object") return {
    drive: null,
    history: null
  };
  const keys = Object.keys(disks);
  if (!keys.length) return {
    drive: null,
    history: null
  };
  const preferred = keys.find(key => /^C:/i.test(key)) || keys[0];
  return {
    drive: preferred,
    history: disks[preferred] || null
  };
}
export function computeLoadZoneDistribution(points, {
  warn = 60,
  critical = 85
} = {}) {
  const rows = Array.isArray(points) ? points : [];
  let normal = 0;
  let elevated = 0;
  let criticalCount = 0;
  for (const point of rows) {
    const value = Number(point?.max ?? point?.last);
    if (!Number.isFinite(value)) continue;
    if (value >= critical) criticalCount += 1;else if (value >= warn) elevated += 1;else normal += 1;
  }
  return [{
    name: "Normal",
    value: normal,
    color: ZONE_COLORS.normal
  }, {
    name: "High",
    value: elevated,
    color: ZONE_COLORS.elevated
  }, {
    name: "Critical",
    value: criticalCount,
    color: ZONE_COLORS.critical
  }].filter(item => item.value > 0);
}
export function computeUpdatesDayDistribution(points) {
  const rows = Array.isArray(points) ? points : [];
  let okDays = 0;
  let pendingDays = 0;
  for (const point of rows) {
    const value = Number(point?.last ?? point?.max ?? 0);
    if (!Number.isFinite(value)) continue;
    if (value > 0) pendingDays += 1;else okDays += 1;
  }
  if (okDays === 0 && pendingDays === 0) return [];
  return [{
    name: "Sans MAJ en attente",
    value: okDays,
    color: ZONE_COLORS.updatesOk
  }, {
    name: "MAJ en attente",
    value: pendingDays,
    color: ZONE_COLORS.updatesPending
  }].filter(item => item.value > 0);
}
export function computeTemperatureZoneDistribution(points) {
  const rows = Array.isArray(points) ? points : [];
  let cool = 0;
  let warm = 0;
  let hot = 0;
  for (const point of rows) {
    const value = Number(point?.max ?? point?.last);
    if (!Number.isFinite(value) || value <= 0) continue;
    if (value >= 80) hot += 1;else if (value >= 65) warm += 1;else cool += 1;
  }
  return [{
    name: "< 65 °C",
    value: cool,
    color: ZONE_COLORS.tempCool
  }, {
    name: "65–79 °C",
    value: warm,
    color: ZONE_COLORS.tempWarm
  }, {
    name: "≥ 80 °C",
    value: hot,
    color: ZONE_COLORS.tempHot
  }].filter(item => item.value > 0);
}
export function summarizeHistoryPoints(points) {
  const values = (Array.isArray(points) ? points : []).map(point => Number(point?.last)).filter(Number.isFinite);
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    avg: Math.round(sum / values.length),
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
    days: values.length
  };
}
export function toneClassForPct(pct, {
  warn = 60,
  critical = 85
} = {}) {
  const value = Number(pct);
  if (!Number.isFinite(value)) return "neutral";
  if (value >= critical) return "critical";
  if (value >= warn) return "warn";
  return "good";
}
export function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${Math.round(n)} %`;
}
export function formatTemp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `${Math.round(n)} °C`;
}
export { formatStorageGB } from "./rmmMonitoringUtils";
