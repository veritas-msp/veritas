import { getEquipmentDbId, isCheckMKMappableType } from "../EquipementPage/CheckMKMonitoringStatusBadge";
import { resolveEquipmentMonitorStatus } from "../EquipementPage/equipmentMspUtils";
import { isRmmManagedEquipment } from "../EquipementPage/rmmMonitoringUtils";
import { HARDWARE_TYPE_ORDER } from "./infraHoneycombLayout";
export const INFRA_TYPE_ICONS = {
  Internet: "mdi:web",
  Firewalls: "mdi:shield-outline",
  Servers: "mdi:server",
  Ordinateurs: "mdi:laptop",
  Storage: "mdi:harddisk",
  Switch: "mdi:lan",
  BorneWifi: "mdi:wifi",
  Alimentation: "mdi:power-plug",
  Routeur: "mdi:router-wireless",
  TOIP: "mdi:phone-voip",
  Backup: "mdi:backup-restore",
  Antivirus: "mdi:shield-bug-outline",
  Antispam: "mdi:email-lock-outline",
  NDD: "mdi:web-box",
  CertificatsSSL: "mdi:certificate-outline",
  LicensesAbonnements: "mdi:license",
  TenantMicrosoft: "mdi:microsoft-azure",
  GoogleWorkspace: "mdi:google",
  Campagne: "mdi:bullhorn-outline"
};
export const HONEYCOMB_TYPE_LABELS = {
  Internet: "Internet",
  Firewalls: "Firewall",
  Servers: "Servers",
  Storage: "Storage",
  Switch: "Switch",
  BorneWifi: "WiFi",
  Routeur: "Router",
  Alimentation: "Power",
  TOIP: "TOIP",
  Ordinateurs: "Computers"
};
export function getHoneycombTypeLabel(type, fallback = null) {
  if (fallback) return fallback;
  return HONEYCOMB_TYPE_LABELS[type] || (type?.startsWith("Custom:") ? type.slice(7) : type);
}
export function getInfraTypeIcon(type, fallbackIcon = null) {
  if (fallbackIcon) return fallbackIcon;
  return INFRA_TYPE_ICONS[type] || "mdi:devices";
}
export const INFRA_ZONES = [{
  id: "edge",
  label: "Network & access",
  types: ["Internet", "Firewalls", "Routeur", "Switch", "BorneWifi"]
}, {
  id: "telecom",
  label: "Telecom",
  types: ["TOIP"]
}, {
  id: "power",
  label: "Power",
  types: ["Alimentation"]
}, {
  id: "compute",
  label: "Compute & data",
  types: ["Servers", "Storage", "Ordinateurs"]
}];
const TYPE_ORDER = HARDWARE_TYPE_ORDER;
function normalizeAggregateStatus(status) {
  if (status === "neutral") return "unmonitored";
  if (status === "no_data") return "unmonitored";
  return status;
}
function mapMonitorStatusToInfraStatus(monitorStatus, {
  isRmmManaged = false,
  isMapped = false
} = {}) {
  switch (monitorStatus) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "ok":
      return "ok";
    case "offline":
      return "critical";
    case "no_data":
      if (isRmmManaged || isMapped) return "ok";
      return "unmonitored";
    case "unmapped":
      return "unmonitored";
    case "manual":
    case "neutral":
    default:
      return "neutral";
  }
}
export function buildStatusBreakdown(nodes = []) {
  const counts = {
    critical: 0,
    warning: 0,
    ok: 0,
    unmonitored: 0
  };
  (Array.isArray(nodes) ? nodes : []).forEach(node => {
    const key = node?.status;
    if (key === "critical" || key === "warning" || key === "ok") {
      counts[key] += 1;
      return;
    }
    counts.unmonitored += 1;
  });
  return counts;
}
export function formatStatusBreakdown(counts = {}) {
  const parts = [];
  if (counts.critical > 0) {
    parts.push(`${counts.critical} critical`);
  }
  if (counts.warning > 0) {
    parts.push(`${counts.warning} warning${counts.warning > 1 ? "s" : ""}`);
  }
  if (counts.ok > 0) {
    parts.push(`${counts.ok} OK`);
  }
  if (counts.unmonitored > 0) {
    parts.push(`${counts.unmonitored} unmonitored`);
  }
  return parts.join(" · ");
}
export function aggregateStatusFromNodes(nodes = []) {
  const list = Array.isArray(nodes) ? nodes.filter(Boolean) : [];
  if (list.length === 0) {
    return {
      status: "unmonitored",
      count: 0,
      breakdown: buildStatusBreakdown([]),
      breakdownLabel: ""
    };
  }
  const normalized = list.map(node => normalizeAggregateStatus(node.status));
  const breakdown = buildStatusBreakdown(list);
  let status = "unmonitored";
  if (normalized.some(value => value === "critical")) {
    status = "critical";
  } else if (normalized.some(value => value === "warning")) {
    status = "warning";
  } else if (normalized.some(value => value === "ok")) {
    status = "ok";
  }
  return {
    status,
    count: list.length,
    breakdown,
    breakdownLabel: formatStatusBreakdown(breakdown)
  };
}
export function aggregateCategoryNode(type, nodes = []) {
  const list = Array.isArray(nodes) ? nodes.filter(node => node.type === type) : [];
  const agg = aggregateStatusFromNodes(list);
  return {
    id: `category-${type}`,
    name: type,
    displayName: getHoneycombTypeLabel(type),
    type,
    status: agg.status,
    count: agg.count,
    items: list,
    subtitle: agg.breakdownLabel,
    statusBreakdown: agg.breakdown,
    isCategory: true
  };
}
export function normalizeDisplayType(type) {
  if (type === "NAS") return "Storage";
  return type;
}
export function resolveInfraNodeStatus(equipment, summaries = {}, options = {}) {
  const checkmkEnabled = options.checkmkEnabled !== false;
  const equipmentType = normalizeDisplayType(equipment?.type);
  const mappable = isCheckMKMappableType(equipmentType) || isCheckMKMappableType(equipment?.type);
  const mapping = equipment?.checkmkMapping;
  const isMapped = Boolean(mapping?.checkmk_host_name && mapping?.is_active !== false);
  const dbId = getEquipmentDbId(equipment);
  const summary = dbId ? summaries[dbId] || summaries[String(dbId)] : null;
  const isRmmManaged = isRmmManagedEquipment(equipment);
  const monitorStatus = resolveEquipmentMonitorStatus(equipment, summary, {
    checkmkEnabled,
    isMappable: mappable,
    isMapped
  });
  return mapMonitorStatusToInfraStatus(monitorStatus, {
    isRmmManaged,
    isMapped
  });
}
export function equipmentToInfraNode(equipment, summaries, options = {}) {
  const displayType = normalizeDisplayType(equipment.type);
  return {
    id: equipment.id || getEquipmentDbId(equipment) || `${displayType}-${equipment.name}`,
    name: equipment.name || displayType,
    type: displayType,
    status: resolveInfraNodeStatus(equipment, summaries, options),
    equipment,
    subtitle: equipment.ip || equipment.location || ""
  };
}
export function backupToInfraNode(instance) {
  const name = instance.logiciel || instance.server || "Backup";
  const subtitle = [instance.server, instance.version].filter(Boolean).join(" · ");
  let status = "neutral";
  if (instance.jobsCount > 0 && instance.mappedJobsCount === 0) {
    status = "unmonitored";
  } else if (instance.jobsCount > 0 && instance.mappedJobsCount > 0) {
    status = "ok";
  }
  return {
    id: `backup-${instance.id || name}`,
    name,
    type: "Backup",
    status,
    subtitle,
    equipment: null
  };
}
export function buildInfraMapModel({
  equipment = [],
  summaries = {},
  checkmkEnabled = true
} = {}) {
  const infraOptions = {
    checkmkEnabled
  };
  const nodes = equipment.map(eq => equipmentToInfraNode(eq, summaries, infraOptions));
  nodes.sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.type);
    const bi = TYPE_ORDER.indexOf(b.type);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return (a.name || "").localeCompare(b.name || "", "fr");
  });
  const zones = INFRA_ZONES.map(zone => ({
    ...zone,
    nodes: nodes.filter(node => zone.types.includes(node.type))
  })).filter(zone => zone.nodes.length > 0);
  const counts = {
    total: nodes.length,
    critical: nodes.filter(n => n.status === "critical").length,
    warning: nodes.filter(n => n.status === "warning").length,
    ok: nodes.filter(n => n.status === "ok" || n.status === "neutral").length,
    issues: nodes.filter(n => n.status === "critical" || n.status === "warning").length,
    unmonitored: nodes.filter(n => n.status === "unmonitored" || n.status === "no_data").length
  };
  return {
    zones,
    nodes,
    counts
  };
}
export const INFRA_STATUS_META = {
  critical: {
    label: "Critical",
    color: "#dc2626",
    soft: "rgba(239, 68, 68, 0.48)"
  },
  warning: {
    label: "Warning",
    color: "#d97706",
    soft: "rgba(245, 158, 11, 0.46)"
  },
  ok: {
    label: "OK",
    color: "#15803d",
    soft: "rgba(34, 197, 94, 0.44)"
  },
  neutral: {
    label: "Active",
    color: "#1d4f9e",
    soft: "rgba(43, 95, 171, 0.28)"
  },
  unmonitored: {
    label: "Unmonitored",
    color: "#64748b",
    soft: "rgba(100, 116, 139, 0.38)"
  },
  no_data: {
    label: "No data",
    color: "#64748b",
    soft: "rgba(100, 116, 139, 0.38)"
  }
};
export function getInfraStatusTooltipLabel(status) {
  if (status === "unmonitored" || status === "no_data") return null;
  return INFRA_STATUS_META[status]?.label || null;
}
