import {
  isMonitoringStepEnabled,
  countMonitoringModuleItems,
  MODULE_LABELS,
  MODULE_ICONS,
  MONITORING_MODULE_STEP_ORDER,
  REPORT_TOPIC_GROUPS
} from "../MonitoringSteps";
import { resolveReportEquipmentKey, getSupervisionColumnMeta } from "../supervisionReportInsights";
import { getModuleKeyForEquipment } from "../ReportSummary/reportCategoryCounts";

const INFRA_KEYS = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
const CYBER_KEYS = ["Backup", "Antivirus", "Antispam"];
const CLOUD_KEYS = ["Office365", "NDD"];

const HEALTH_RANK = { critical: 3, warn: 2, ok: 1, unsynced: 0, unmapped: -1 };

function getEquipementList(equipements, key) {
  const list = equipements?.[key];
  return Array.isArray(list) ? list : [];
}

function getSolutionsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.solutions)) return raw.solutions;
  return [];
}

function getBackupInstances(raw) {
  if (!raw) return [];
  if (Array.isArray(raw.instances)) return raw.instances;
  return [];
}

function listModuleEquipments(client, moduleKey) {
  const eq = client?.equipements || {};
  switch (moduleKey) {
    case "Internet":
      return getEquipementList(eq, "Internet");
    case "Firewall":
      return getEquipementList(eq, "Firewalls");
    case "Servers":
      return [...getEquipementList(eq, "Serveurs"), ...getEquipementList(eq, "Servers")];
    case "Storage":
      return [...getEquipementList(eq, "NAS"), ...getEquipementList(eq, "SAN")];
    case "Switch":
      return getEquipementList(eq, "Switch");
    case "BorneWifi":
      return getEquipementList(eq, "BorneWifi");
    case "TOIP":
      return getSolutionsList(eq.TOIP);
    case "Backup":
      return [...getBackupInstances(eq.Sauvegarde), ...getBackupInstances(eq.Backup)];
    case "Antivirus":
      return getSolutionsList(eq.Antivirus);
    case "Antispam":
      return getSolutionsList(eq.Antispam);
    case "Office365": {
      const raw = eq.Office365;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") return [raw];
      return [];
    }
    case "NDD":
      return getEquipementList(eq, "NDD");
    default:
      return [];
  }
}

function equipmentLabel(item, moduleKey) {
  return (
    item?.nom ||
    item?.name ||
    item?.logiciel ||
    item?.domaine ||
    item?.domain ||
    item?.tenantName ||
    item?.tenant ||
    `${MODULE_LABELS[moduleKey] || moduleKey}`
  );
}

function computeCheckMKHealth(raw) {
  if (!raw) return "unsynced";
  const services = Array.isArray(raw.services) ? raw.services : [];
  const events = Array.isArray(raw.events) ? raw.events : [];
  const availability = raw.availability || raw.availabilityData || {};
  const up = typeof availability.up === "number" ? availability.up : null;
  const criticalEvents = events.filter(e => Number(e?.state) === 2).length;
  if (up == null && criticalEvents === 0 && services.length === 0) return "unsynced";
  if ((up != null && up < 95) || criticalEvents >= 5) return "critical";
  if ((up != null && up < 99) || criticalEvents > 0) return "warn";
  return "ok";
}

function getEquipmentMetrics(raw, supervision) {
  const availability = raw?.availability || raw?.availabilityData || {};
  const up = typeof availability.up === "number" ? availability.up : null;
  const events = Array.isArray(raw?.events) ? raw.events.filter(e => Number(e?.state) === 2).length : 0;
  const services = Array.isArray(raw?.services) ? raw.services.length : 0;
  return {
    availability: up,
    events: supervision.mapped ? supervision.events || events : events,
    services,
    supervisionLabel: supervision.mapped ? supervision.label : null
  };
}

function formatAvailability(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `${Number(value).toFixed(1)} %`;
}

function buildWatchReasons({ health, metrics, tickets, alerts, comments, supervision }) {
  const reasons = [];
  if (health === "critical") {
    reasons.push(
      metrics.availability != null
        ? `Disponibilité ${formatAvailability(metrics.availability)}`
        : "État critique"
    );
  } else if (health === "warn") {
    reasons.push(
      metrics.events > 0
        ? `${metrics.events} événement${metrics.events > 1 ? "s" : ""} de surveillance`
        : metrics.availability != null
          ? `Disponibilité ${formatAvailability(metrics.availability)}`
          : "Point à surveiller"
    );
  }
  if (alerts > 0) reasons.push(`${alerts} alerte${alerts > 1 ? "s" : ""}`);
  if (tickets > 0) reasons.push(`${tickets} ticket${tickets > 1 ? "s" : ""}`);
  if (comments > 0) reasons.push(`${comments} note${comments > 1 ? "s" : ""}`);
  if (supervision.mapped && metrics.supervisionLabel && (health === "critical" || health === "warn")) {
    reasons.push(`Supervision : ${metrics.supervisionLabel}`);
  }
  return reasons;
}

function worstHealth(a, b) {
  return (HEALTH_RANK[a] ?? -1) >= (HEALTH_RANK[b] ?? -1) ? a : b;
}

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatDateTimeFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseClientContrat(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function buildSummarySnapshot({
  client,
  equipmentCheckMKData = {},
  monitoringSyncStatus = {},
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  equipmentAlertCounts = {},
  allComments = []
}) {
  if (!client) {
    return {
      clientLabel: "",
      periodLabel: "",
      enabledModules: [],
      stats: {},
      modules: [],
      alerts: [],
      comments: [],
      groups: { infra: [], cyber: [], cloud: [] }
    };
  }

  const startLabel = formatDateFr(client.reportStartDate);
  const endLabel = formatDateFr(client.reportEndDate);
  const periodLabel = startLabel && endLabel ? `${startLabel} → ${endLabel}` : "Période non définie";
  const rawLabel = client?.name || client?.nom || client?.code || "";
  const match = rawLabel.match(/^(\d{2,})-\s*(.*)$/);
  const clientPrefix = match ? match[1] : "";
  const clientMainLabel = match ? match[2] || rawLabel : rawLabel;
  const clientLabel = clientPrefix ? `${clientPrefix} — ${clientMainLabel}` : clientMainLabel;

  const enabledModules = MONITORING_MODULE_STEP_ORDER.filter(key => isMonitoringStepEnabled(client, key));
  const alerts = [];
  const watchPoints = [];
  const modules = [];

  let totalEquipments = 0;
  let criticalCount = 0;
  let warnCount = 0;
  let commentTotal = 0;
  let ticketTotal = 0;
  let alertTotal = 0;
  let monitoredCount = 0;
  let unsyncedCount = 0;

  enabledModules.forEach(moduleKey => {
    const items = listModuleEquipments(client, moduleKey);
    const count = countMonitoringModuleItems(client, moduleKey) || items.length;
    totalEquipments += count;

    let moduleHealth = "ok";
    let moduleComments = 0;
    let moduleTickets = 0;
    let moduleAlerts = 0;
    let moduleCritical = 0;
    let moduleWarn = 0;
    let moduleMonitored = 0;
    let moduleUnsynced = 0;
    const equipmentRows = [];

    items.forEach(item => {
      const equipmentKey = resolveReportEquipmentKey(item, moduleKey);
      const dbId = item?.id != null ? String(item.id) : equipmentKey;
      const comments = Number(equipmentCommentCounts[equipmentKey] || 0);
      const tickets = Number(equipmentTicketCounts[equipmentKey] || 0);
      const alertCount = Number(equipmentAlertCounts[equipmentKey] || 0);
      moduleComments += comments;
      moduleTickets += tickets;
      moduleAlerts += alertCount;

      const supervision = getSupervisionColumnMeta(item, monitoringSyncStatus, equipmentCheckMKData);
      const rawCheckMK = equipmentCheckMKData[dbId] || null;
      const metrics = getEquipmentMetrics(rawCheckMK, supervision);
      let health = "ok";
      if (supervision.mapped) {
        moduleMonitored += 1;
        monitoredCount += 1;
        health = supervision.status === "critical" || supervision.status === "warn" ? supervision.status : computeCheckMKHealth(rawCheckMK);
        if (health === "unsynced" || supervision.status === "unsynced") {
          moduleUnsynced += 1;
          unsyncedCount += 1;
          health = "ok";
        }
      } else if (INFRA_KEYS.includes(moduleKey)) {
        health = computeCheckMKHealth(rawCheckMK);
        if (health === "unsynced") health = "ok";
      }

      moduleHealth = worstHealth(moduleHealth, health);
      if (health === "critical") {
        moduleCritical += 1;
        criticalCount += 1;
      } else if (health === "warn") {
        moduleWarn += 1;
        warnCount += 1;
      }

      const equipmentRow = {
        key: equipmentKey,
        label: equipmentLabel(item, moduleKey),
        site: item?.site || item?.localisation || "",
        health,
        supervision,
        metrics,
        comments,
        tickets,
        alerts: alertCount,
        quantified: {
          availability: metrics.availability,
          availabilityLabel: formatAvailability(metrics.availability),
          events: metrics.events,
          services: metrics.services,
          tickets,
          alerts: alertCount,
          comments
        }
      };
      equipmentRows.push(equipmentRow);

      const watchReasons = buildWatchReasons({
        health,
        metrics,
        tickets,
        alerts: alertCount,
        comments,
        supervision
      });
      const needsWatch = health === "critical" || health === "warn" || alertCount > 0 || tickets > 0;

      if (needsWatch && watchReasons.length > 0) {
        const watchEntry = {
          id: `watch-${equipmentKey}`,
          severity: health === "critical" ? "critical" : health === "warn" || alertCount > 0 ? "warn" : "info",
          moduleKey,
          moduleLabel: MODULE_LABELS[moduleKey] || moduleKey,
          label: equipmentLabel(item, moduleKey),
          site: item?.site || item?.localisation || "",
          reasons: watchReasons,
          quantified: equipmentRow.quantified
        };
        watchPoints.push(watchEntry);

        if (health === "critical" || health === "warn") {
          alerts.push({
            id: `health-${equipmentKey}`,
            type: "surveillance",
            severity: health,
            moduleKey,
            moduleLabel: MODULE_LABELS[moduleKey] || moduleKey,
            label: equipmentLabel(item, moduleKey),
            detail: watchReasons.join(" · ")
          });
        }
        if (alertCount > 0) {
          alerts.push({
            id: `alert-${equipmentKey}`,
            type: "alerte",
            severity: "warn",
            moduleKey,
            moduleLabel: MODULE_LABELS[moduleKey] || moduleKey,
            label: equipmentLabel(item, moduleKey),
            detail: `${alertCount} alerte${alertCount > 1 ? "s" : ""} sur la période`
          });
        }
        if (tickets > 0) {
          alerts.push({
            id: `ticket-${equipmentKey}`,
            type: "ticket",
            severity: "info",
            moduleKey,
            moduleLabel: MODULE_LABELS[moduleKey] || moduleKey,
            label: equipmentLabel(item, moduleKey),
            detail: `${tickets} ticket${tickets > 1 ? "s" : ""} lié${tickets > 1 ? "s" : ""}`
          });
        }
      }
    });

    commentTotal += moduleComments;
    ticketTotal += moduleTickets;
    alertTotal += moduleAlerts;

    const moduleEntry = {
      key: moduleKey,
      label: MODULE_LABELS[moduleKey] || moduleKey,
      icon: MODULE_ICONS[moduleKey] || "mdi:checkbox-marked-outline",
      count,
      health: moduleHealth,
      comments: moduleComments,
      tickets: moduleTickets,
      alerts: moduleAlerts,
      critical: moduleCritical,
      warn: moduleWarn,
      monitored: moduleMonitored,
      unsynced: moduleUnsynced,
      equipments: equipmentRows
    };
    modules.push(moduleEntry);
  });

  const comments = (Array.isArray(allComments) ? allComments : []).map(comment => {
    const isEquipment = comment.scope === "equipment";
    let linkedLabel = "Note générale";
    if (isEquipment) {
      const moduleKey = comment.moduleKey || getModuleKeyForEquipment(comment.equipmentKey);
      const moduleLabel = moduleKey ? MODULE_LABELS[moduleKey] || moduleKey : "";
      const ref = comment.referenceLabel || comment.ticketTitle || "";
      linkedLabel = [moduleLabel, ref].filter(Boolean).join(" · ") || "Équipement";
    }
    return {
      id: comment.id || `${comment.scope}-${comment.createdAt}`,
      text: comment.text || comment.content || "",
      createdAt: comment.createdAt,
      dateLabel: formatDateTimeFr(comment.createdAt),
      linkedLabel,
      isTicket: comment.isTicketComment === true,
      moduleKey: comment.moduleKey || null
    };
  });

  const contrat = parseClientContrat(client?.contrat);
  const groups = {
    infra: modules.filter(m => INFRA_KEYS.includes(m.key)),
    cyber: modules.filter(m => CYBER_KEYS.includes(m.key)),
    cloud: modules.filter(m => CLOUD_KEYS.includes(m.key))
  };

  const severityOrder = { critical: 0, warn: 1, info: 2 };
  const typeOrder = { surveillance: 0, alerte: 1, ticket: 2 };
  alerts.sort((a, b) => {
    const s = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
    if (s !== 0) return s;
    return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
  });

  watchPoints.sort((a, b) => {
    const rank = { critical: 0, warn: 1, info: 2 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });

  return {
    clientLabel,
    clientPrefix,
    clientMainLabel,
    periodLabel,
    contrat,
    enabledModules,
    topicGroups: REPORT_TOPIC_GROUPS,
    stats: {
      modules: enabledModules.length,
      equipments: totalEquipments,
      critical: criticalCount,
      warn: warnCount,
      comments: (Array.isArray(allComments) ? allComments.length : 0) || commentTotal,
      tickets: ticketTotal,
      alerts: alertTotal,
      monitored: monitoredCount,
      unsynced: unsyncedCount,
      vigilance: watchPoints.length
    },
    modules,
    groups,
    alerts: alerts.slice(0, 24),
    watchPoints,
    comments
  };
}

export const SUMMARY_HEALTH_META = {
  ok: { label: "Sain", color: "#047857", bg: "#ecfdf5", icon: "mdi:check-circle" },
  warn: { label: "À surveiller", color: "#b45309", bg: "#fffbeb", icon: "mdi:alert" },
  critical: { label: "Critique", color: "#b91c1c", bg: "#fef2f2", icon: "mdi:alert-octagon" },
  unsynced: { label: "Non sync.", color: "#64748b", bg: "#f1f5f9", icon: "mdi:sync-off" },
  unmapped: { label: "—", color: "#94a3b8", bg: "#f8fafc", icon: "mdi:minus-circle-outline" }
};

export const SUMMARY_ALERT_META = {
  surveillance: { label: "Surveillance", icon: "mdi:radar" },
  alerte: { label: "Alerte", icon: "mdi:bell-alert-outline" },
  ticket: { label: "Ticket", icon: "mdi:ticket-outline" }
};
