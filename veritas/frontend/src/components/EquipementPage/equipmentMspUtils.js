import { isMonitorStatusAlertEnabled } from "./supervisionAlertRulesConfig";
import { buildEquipmentMonitoringSummary } from "./equipmentSupervisionUtils";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import { isRmmManagedEquipment, resolveRmmAgentOnline, isRmmAgentOfflineAlertable } from "./rmmMonitoringUtils";
export const EQUIPMENT_MONITOR_META = {
  critical: {
    label: "Critical",
    color: "#ef4444",
    soft: "rgba(239, 68, 68, 0.14)",
    icon: "mdi:alert-octagon"
  },
  warning: {
    label: "Warning",
    color: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.14)",
    icon: "mdi:alert"
  },
  ok: {
    label: "OK",
    color: "#16a34a",
    soft: "rgba(34, 197, 94, 0.12)",
    icon: "mdi:check-circle"
  },
  unmapped: {
    label: "Not mapped",
    color: "#94a3b8",
    soft: "rgba(148, 163, 184, 0.14)",
    icon: "mdi:eye-off-outline"
  },
  neutral: {
    label: "Active",
    color: "#2b5fab",
    soft: "rgba(43, 95, 171, 0.1)",
    icon: "mdi:check"
  },
  no_data: {
    label: "Sans data",
    color: "#94a3b8",
    soft: "rgba(148, 163, 184, 0.14)",
    icon: "mdi:database-off-outline"
  },
  manual: {
    label: "Manuel",
    color: "#64748b",
    soft: "rgba(100, 116, 139, 0.12)",
    icon: "mdi:hand-back-right"
  },
  offline: {
    label: "Offline",
    color: "#ef4444",
    soft: "rgba(239, 68, 68, 0.14)",
    icon: "mdi:laptop-off"
  }
};
const PRIORITY = {
  critical: 0,
  warning: 1,
  offline: 1,
  unmapped: 2,
  no_data: 3
};
export function resolveEquipmentMonitorStatus(equipment, summary, options = {}) {
  const {
    checkmkEnabled = true,
    isMappable = false,
    isMapped = false
  } = options;
  if (equipment?.type === "Ordinateurs") {
    if (isRmmManagedEquipment(equipment)) {
      const online = resolveRmmAgentOnline(equipment);
      if (online === true) return "ok";
      if (online === false) {
        return isRmmAgentOfflineAlertable(equipment) ? "offline" : "ok";
      }
      return "no_data";
    }
    return "manual";
  }
  if (!checkmkEnabled || !isMappable) return "neutral";
  if (!isMapped) return "unmapped";
  return summary?.status || "no_data";
}
export function computeEquipmentHealthScore(counts = {}) {
  const total = counts.total || 0;
  if (total === 0) return null;
  const penalty = ((counts.critical || 0) * 28 + (counts.warning || 0) * 11 + (counts.offline || 0) * 14 + (counts.unmapped || 0) * 4) / total;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
export function buildEquipmentPriorityActions(items = [], resolveStatus, {
  limit = 10,
  alertRules = null
} = {}) {
  const actionable = ["critical", "warning", "offline", "unmapped", "no_data"];
  return [...(Array.isArray(items) ? items : [])].map(equipment => ({
    equipment,
    status: resolveStatus(equipment)
  })).filter(row => actionable.includes(row.status)).filter(row => {
    if (!alertRules) return true;
    return isMonitorStatusAlertEnabled(row.equipment, row.status, alertRules);
  }).sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9)).slice(0, limit);
}
export function buildMonitoringTodoActions(items = [], resolveStatus, {
  limit = 12,
  alertRules = null,
  checkmkEnabled = true,
  isMkMapped = () => false
} = {}) {
  const seen = new Set();
  const actions = [];
  for (const equipment of Array.isArray(items) ? items : []) {
    const monitorStatus = resolveStatus(equipment);
    const summary = buildEquipmentMonitoringSummary(equipment, {
      monitorStatus,
      checkmkEnabled,
      isMkMapped: isMkMapped(equipment),
      alertRules
    });
    if (!summary.issues?.length) continue;
    const key = getEquipmentListKey(equipment);
    if (seen.has(key)) continue;
    seen.add(key);
    const primary = summary.primaryIssue;
    actions.push({
      equipment,
      status: monitorStatus,
      issue: primary,
      priority: primary?.priority ?? 9
    });
  }
  return actions.sort((a, b) => a.priority - b.priority).slice(0, limit);
}
export function countEnabledMonitorAlerts(items = [], resolveStatus, alertRules = null) {
  return (Array.isArray(items) ? items : []).filter(eq => {
    const status = resolveStatus(eq);
    if (!["critical", "warning", "offline"].includes(status)) return false;
    if (!alertRules) return true;
    return isMonitorStatusAlertEnabled(eq, status, alertRules);
  }).length;
}
export function buildMonitorStatusCounts(items = [], resolveStatus, {
  alertRules = null
} = {}) {
  const list = Array.isArray(items) ? items : [];
  const counts = {
    total: list.length,
    critical: 0,
    warning: 0,
    ok: 0,
    unmapped: 0,
    offline: 0,
    neutral: 0,
    no_data: 0,
    manual: 0
  };
  list.forEach(eq => {
    const status = resolveStatus(eq);
    if (counts[status] != null) counts[status] += 1;else counts.neutral += 1;
  });
  counts.issues = countEnabledMonitorAlerts(list, resolveStatus, alertRules);
  return counts;
}
