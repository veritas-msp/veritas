import { buildMonitoringTodoActions } from "./equipmentMspUtils";
import { getEquipmentDbId, getEquipmentListKey } from "../../utils/equipmentIdentity";
import { getBackupJobStatus, getBackupJobStatusTitle } from "../CybersecuritePage/backupJobStatusUtils";
import { formatServeurLieLabel } from "../EnterprisesPage/backupJobUtils";

function joinMeta(parts, clientName = "") {
  const client = String(clientName || "").trim().toLowerCase();
  return (Array.isArray(parts) ? parts : []).map(part => String(part || "").trim()).filter(Boolean).filter(part => !client || part.toLowerCase() !== client).join(" · ");
}

function alertReason(reason, fallback = "") {
  const value = String(reason || "").trim();
  return value || fallback || "—";
}

const SEVERITY_RANK = {
  critical: 0,
  warning: 1,
  info: 2
};

/** CheckMK is currently the only monitoring integration. */
const MONITORING_INTEGRATION_ISSUE_KEYS = new Set(["monitor_critical", "monitor_warning", "no_data"]);

export function isMonitoringIntegrationIssue(issue) {
  return MONITORING_INTEGRATION_ISSUE_KEYS.has(String(issue?.key || ""));
}

export function isEquipmentMappedViaMonitoringIntegration(equipment, {
  checkmkEnabled = true,
  isMkMapped
} = {}) {
  if (checkmkEnabled === false) return false;
  const mapping = equipment?.checkmkMapping;
  const host = String(
    mapping?.checkmk_host_name || mapping?.checkmkHostName || equipment?.checkmk_host_name || ""
  ).trim();
  if (host && mapping?.is_active !== false) return true;
  if (typeof isMkMapped === "function" && isMkMapped(equipment)) return true;
  return false;
}

function pickMonitoringIntegrationIssue(row) {
  const issues = Array.isArray(row?.issues) ? row.issues : [];
  const fromList = issues.find(isMonitoringIntegrationIssue);
  if (fromList) return fromList;
  if (isMonitoringIntegrationIssue(row?.primaryIssue)) return row.primaryIssue;
  return null;
}

function severityFromTone(tone, status) {
  if (tone === "bad" || status === "critical" || status === "offline" || status === "expired") return "critical";
  if (tone === "warn" || status === "warning" || status === "expiring" || status === "suspended") return "warning";
  return "info";
}

/**
 * Unified actionable alert item for Monitoring Center Operations view.
 * The ops queue only contains devices mapped via a monitoring integration (CheckMK).
 * @typedef {object} SupervisionQueueItem
 * @property {string} id
 * @property {"devices"} domain
 * @property {"critical"|"warning"|"info"} severity
 * @property {string} tone
 * @property {string} title
 * @property {string} subtitle
 * @property {string} label
 * @property {string|null} clientId
 * @property {string} clientName
 * @property {object|null} equipment
 * @property {object|null} job
 * @property {object|null} contract
 * @property {object|null} agent
 * @property {string} ticketSubject
 * @property {number} priority
 * @property {number|null} sortTime
 */

export function buildDeviceQueueItems(statsItems, resolveMonitorStatus, options = {}) {
  const actions = buildMonitoringTodoActions(statsItems, resolveMonitorStatus, {
    limit: options.limit ?? 500,
    alertRules: options.alertRules,
    checkmkEnabled: options.checkmkEnabled,
    isMkMapped: options.isMkMapped
  });
  return actions.flatMap(action => {
    const {
      equipment,
      status,
      issue,
      priority
    } = action;
    if (!isEquipmentMappedViaMonitoringIntegration(equipment, options)) return [];
    if (!isMonitoringIntegrationIssue(issue)) return [];
    const severity = severityFromTone(issue?.tone, status);
    const reason = alertReason([issue?.label, issue?.detail].filter(Boolean).join(" — "), status);
    const clientName = equipment?.clientName || "";
    const assetName = equipment?.name || options.fallbackName || "—";
    return {
      id: `device-${getEquipmentListKey(equipment)}`,
      domain: "devices",
      severity,
      tone: issue?.tone || status || "warn",
      title: reason,
      subtitle: joinMeta([assetName, equipment?.type, equipment?.ip], clientName),
      label: reason,
      clientId: equipment?.clientId ?? null,
      clientName,
      equipment,
      job: null,
      contract: null,
      agent: null,
      ticketSubject: [assetName, reason].filter(Boolean).join(" — "),
      priority: priority ?? SEVERITY_RANK[severity] ?? 9,
      sortTime: null
    };
  });
}

/** Build device queue items from server-evaluated fleet issues (Step 2). */
export function buildDeviceQueueItemsFromIssues(issueRows = [], options = {}) {
  return (Array.isArray(issueRows) ? issueRows : []).flatMap(row => {
    const equipment = row?.equipment || {};
    if (!isEquipmentMappedViaMonitoringIntegration(equipment, {
      checkmkEnabled: options.checkmkEnabled !== false,
      isMkMapped: options.isMkMapped
    })) return [];
    const issue = pickMonitoringIntegrationIssue(row);
    if (!issue) return [];
    const status = issue.monitorStatus || row?.monitorStatus || "ok";
    const severity = severityFromTone(issue?.tone, status);
    const reason = alertReason([issue?.label, issue?.detail].filter(Boolean).join(" — "), status);
    const clientName = equipment?.clientName || "";
    const assetName = equipment?.name || options.fallbackName || "—";
    return [{
      id: `device-${getEquipmentListKey(equipment)}`,
      domain: "devices",
      severity,
      tone: issue?.tone || status || "warn",
      title: reason,
      subtitle: joinMeta([assetName, equipment?.type, equipment?.ip], clientName),
      label: reason,
      clientId: equipment?.clientId ?? null,
      clientName,
      equipment,
      job: null,
      contract: null,
      agent: null,
      ticketSubject: [assetName, reason].filter(Boolean).join(" — "),
      priority: issue?.priority ?? row?.priority ?? SEVERITY_RANK[severity] ?? 9,
      sortTime: null
    }];
  });
}

export function buildBackupQueueItems(jobs = [], options = {}) {
  const list = Array.isArray(jobs) ? jobs : [];
  return list.map(job => {
    const status = getBackupJobStatus(job);
    if (status !== "critical" && status !== "warning") return null;
    const severity = status === "critical" ? "critical" : "warning";
    const jobName = job.nom || job.name || options.fallbackName || "—";
    const clientName = job.clientName || "";
    const reason = alertReason(options.labels?.[status] || getBackupJobStatusTitle(status), status);
    return {
      id: `backup-${job.id || `${job.clientId}-${jobName}`}`,
      domain: "backups",
      severity,
      tone: status === "critical" ? "bad" : "warn",
      title: reason,
      subtitle: joinMeta([jobName, job.instanceLogiciel || job.typeBackup, formatServeurLieLabel(job.serveurLie, "")], clientName),
      label: reason,
      clientId: job.clientId ?? null,
      clientName,
      equipment: null,
      job,
      contract: null,
      agent: null,
      ticketSubject: `${jobName} — ${reason}`,
      priority: SEVERITY_RANK[severity],
      sortTime: job.last_backup_start ? new Date(job.last_backup_start).getTime() : null
    };
  }).filter(Boolean);
}

export function buildContractQueueItems(contractAlerts = [], licenseAlerts = [], options = {}) {
  const items = [];
  for (const alert of Array.isArray(contractAlerts) ? contractAlerts : []) {
    const severity = alert.status === "expired" ? "critical" : "warning";
    const reason = alertReason(options.statusLabels?.[alert.status] || alert.status);
    const clientName = alert.name || "";
    items.push({
      id: `contract-${alert.id}`,
      domain: "contracts",
      severity,
      tone: severity === "critical" ? "bad" : "warn",
      title: reason,
      subtitle: joinMeta([options.contractTypeLabel || "MSP"], clientName),
      label: reason,
      clientId: alert.id ?? null,
      clientName,
      equipment: null,
      job: null,
      contract: {
        ...alert,
        typeKey: "contract"
      },
      agent: null,
      ticketSubject: `${clientName} — ${reason}`.trim(),
      priority: SEVERITY_RANK[severity],
      sortTime: alert.expiration ? new Date(alert.expiration).getTime() : null
    });
  }
  for (const alert of Array.isArray(licenseAlerts) ? licenseAlerts : []) {
    const severity = alert.status === "expired" ? "critical" : "warning";
    const reason = alertReason(options.statusLabels?.[alert.status] || alert.status);
    const clientName = alert.clientName || "";
    items.push({
      id: `license-${alert.id}`,
      domain: "contracts",
      severity,
      tone: severity === "critical" ? "bad" : "warn",
      title: reason,
      subtitle: joinMeta([alert.label, alert.moduleLabel, alert.module], clientName),
      label: reason,
      clientId: alert.clientId ?? null,
      clientName,
      equipment: null,
      job: null,
      contract: {
        ...alert,
        typeKey: alert.module || "license"
      },
      agent: null,
      ticketSubject: `${clientName} — ${reason}`.trim(),
      priority: SEVERITY_RANK[severity],
      sortTime: alert.expiration ? new Date(alert.expiration).getTime() : null
    });
  }
  return items;
}

export function buildRmmQueueItems(offlineAgents = [], options = {}) {
  return (Array.isArray(offlineAgents) ? offlineAgents : []).map(agent => {
    const hostName = agent.hostname || agent.equipment?.name || options.fallbackName || "—";
    const clientName = agent.client_name || agent.equipment?.clientName || "";
    const reason = alertReason(options.offlineLabel, "Offline");
    return {
      id: `rmm-${agent.id || agent.machine_id || hostName}`,
      domain: "rmm",
      severity: "critical",
      tone: "bad",
      title: reason,
      subtitle: joinMeta([hostName, agent.os, agent.ip], clientName),
      label: reason,
      clientId: agent.client_id || agent.equipment?.clientId || null,
      clientName,
      equipment: agent.equipment || null,
      job: null,
      contract: null,
      agent,
      ticketSubject: `${hostName} — ${reason}`,
      priority: SEVERITY_RANK.critical,
      sortTime: agent.last_seen_at ? new Date(agent.last_seen_at).getTime() : null
    };
  });
}

export function buildUnifiedSupervisionQueue({
  statsItems = [],
  resolveMonitorStatus,
  deviceIssueItems = null,
  alertRules = null,
  checkmkEnabled = false,
  isMkMapped = () => false,
  labels = {}
} = {}) {
  const deviceOptions = {
    fallbackName: labels.noName,
    alertRules,
    checkmkEnabled,
    isMkMapped
  };
  const devices = Array.isArray(deviceIssueItems)
    ? buildDeviceQueueItemsFromIssues(deviceIssueItems, {
        ...deviceOptions,
        checkmkEnabled: true
      })
    : resolveMonitorStatus
      ? buildDeviceQueueItems(statsItems, resolveMonitorStatus, deviceOptions)
      : [];
  return [...devices].sort((a, b) => {
    const sev = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
    if (sev !== 0) return sev;
    const ta = a.sortTime ?? Number.POSITIVE_INFINITY;
    const tb = b.sortTime ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.priority ?? 9) - (b.priority ?? 9);
  });
}

export function filterSupervisionQueue(items = [], {
  severity = "all",
  domain = "all",
  client = "",
  query = "",
  workflowStatus = "all"
} = {}) {
  const q = String(query || "").trim().toLowerCase();
  const clientFilter = String(client || "").trim().toLowerCase();
  return items.filter(item => {
    if (severity !== "all" && item.severity !== severity) return false;
    if (domain !== "all" && item.domain !== domain) return false;
    if (workflowStatus !== "all") {
      const status = item.workflowStatus || "open";
      if (workflowStatus === "active") {
        if (status === "closed") return false;
      } else if (status !== workflowStatus) {
        return false;
      }
    } else if ((item.workflowStatus || "open") === "closed") {
      return false;
    }
    if (clientFilter) {
      const name = String(item.clientName || "").toLowerCase();
      if (!name.includes(clientFilter) && String(item.clientId || "") !== clientFilter) return false;
    }
    if (!q) return true;
    const hay = [item.title, item.subtitle, item.label, item.clientName, item.domain].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function mergeQueueWithAlertState(items = [], alerts = []) {
  const byId = new Map((Array.isArray(alerts) ? alerts : []).map(a => [a.queueItemId, a]));
  return (Array.isArray(items) ? items : []).map(item => {
    const state = byId.get(item.id);
    if (!state) {
      return {
        ...item,
        workflowStatus: "open",
        alertState: null,
        notifiedAt: null,
        handledByName: null,
        linkedTicketKind: null,
        linkedTicketId: null,
        linkedEventId: null
      };
    }
    return {
      ...item,
      workflowStatus: state.status || "open",
      alertState: state,
      notifiedAt: state.createdAt || null,
      handledByName: state.ackedByName || null,
      linkedTicketKind: state.linkedTicketKind || null,
      linkedTicketId: state.linkedTicketId || null,
      linkedEventId: state.linkedEventId || null
    };
  }).filter(item => item.workflowStatus !== "closed");
}

export function countQueueByWorkflow(items = []) {
  return items.reduce((acc, item) => {
    const status = item.workflowStatus || "open";
    acc[status] = (acc[status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, {
    open: 0,
    acked: 0,
    linked: 0,
    closed: 0,
    total: 0
  });
}

export function countQueueBySeverity(items = []) {
  return items.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    acc.total += 1;
    return acc;
  }, {
    critical: 0,
    warning: 0,
    info: 0,
    total: 0
  });
}

export function countQueueByDomain(items = []) {
  return items.reduce((acc, item) => {
    acc[item.domain] = (acc[item.domain] || 0) + 1;
    return acc;
  }, {
    devices: 0,
    backups: 0,
    contracts: 0,
    rmm: 0
  });
}

/**
 * Prefill payload for TicketCreate when opening a Support ticket from the supervision queue.
 * Category hint matches seeded "Supervision / alerting" (monitoring) or a custom "Monitoring" name.
 */
export function buildSupervisionSupportTicketPrefill(item) {
  const equipment = item?.equipment || item?.agent?.equipment || null;
  const clientId = item?.clientId || equipment?.clientId || null;
  const equipmentId = getEquipmentDbId(equipment) || equipment?.id || null;
  const checkmkHost = equipment?.checkmkMapping?.checkmk_host_name
    || equipment?.checkmkMapping?.checkmkHostName
    || equipment?.checkmk_host_name
    || null;

  const lines = [];
  if (item?.title) lines.push(`Alerte : ${item.title}`);
  if (item?.severity) lines.push(`Sévérité : ${String(item.severity)}`);
  if (item?.clientName) lines.push(`Entreprise : ${item.clientName}`);
  if (equipment?.name) lines.push(`Périphérique : ${equipment.name}`);
  if (equipment?.type) lines.push(`Type : ${equipment.type}`);
  if (equipment?.ip) lines.push(`IP : ${equipment.ip}`);
  if (checkmkHost) lines.push(`Hôte CheckMK : ${checkmkHost}`);
  if (item?.subtitle) lines.push(`Contexte : ${item.subtitle}`);
  if (item?.label && item.label !== item.title) lines.push(`Détail : ${item.label}`);
  lines.push("", "Ticket créé depuis le centre de supervision.");

  return {
    clientId,
    equipmentId,
    title: item?.ticketSubject || [equipment?.name, item?.title].filter(Boolean).join(" — ") || "",
    description: lines.filter((line, index, arr) => line !== "" || (index > 0 && arr[index - 1] !== "")).join("\n").slice(0, 5000),
    category: "monitoring",
    preferPrimaryContact: true
  };
}
