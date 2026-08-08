import { buildMonitoringTodoActions } from "./equipmentMspUtils";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import { getBackupJobStatus } from "../CybersecuritePage/backupJobStatusUtils";

const SEVERITY_RANK = {
  critical: 0,
  warning: 1,
  info: 2
};

function severityFromTone(tone, status) {
  if (tone === "bad" || status === "critical" || status === "offline" || status === "expired") return "critical";
  if (tone === "warn" || status === "warning" || status === "expiring" || status === "suspended") return "warning";
  return "info";
}

/**
 * Unified actionable alert item for Monitoring Center Operations view.
 * @typedef {object} SupervisionQueueItem
 * @property {string} id
 * @property {"devices"|"backups"|"contracts"|"rmm"} domain
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
  return actions.map(action => {
    const {
      equipment,
      status,
      issue,
      priority
    } = action;
    const severity = severityFromTone(issue?.tone, status);
    const issueLabel = issue?.label || status || "";
    const title = equipment?.name || options.fallbackName || "—";
    const clientName = equipment?.clientName || "";
    return {
      id: `device-${getEquipmentListKey(equipment)}`,
      domain: "devices",
      severity,
      tone: issue?.tone || status || "warn",
      title,
      subtitle: [clientName, equipment?.type, equipment?.ip].filter(Boolean).join(" · "),
      label: issueLabel,
      clientId: equipment?.clientId ?? null,
      clientName,
      equipment,
      job: null,
      contract: null,
      agent: null,
      ticketSubject: [title, issueLabel].filter(Boolean).join(" — "),
      priority: priority ?? SEVERITY_RANK[severity] ?? 9,
      sortTime: null
    };
  });
}

export function buildBackupQueueItems(jobs = [], options = {}) {
  const list = Array.isArray(jobs) ? jobs : [];
  return list.map(job => {
    const status = getBackupJobStatus(job);
    if (status !== "critical" && status !== "warning") return null;
    const severity = status === "critical" ? "critical" : "warning";
    const title = job.nom || job.name || options.fallbackName || "—";
    const clientName = job.clientName || "";
    const label = status === "critical" ? options.labels?.critical || "Critical" : options.labels?.warning || "Warning";
    return {
      id: `backup-${job.id || `${job.clientId}-${title}`}`,
      domain: "backups",
      severity,
      tone: status === "critical" ? "bad" : "warn",
      title,
      subtitle: [clientName, job.instanceLogiciel || job.typeBackup, job.serveurLie].filter(Boolean).join(" · "),
      label,
      clientId: job.clientId ?? null,
      clientName,
      equipment: null,
      job,
      contract: null,
      agent: null,
      ticketSubject: `${title} — ${label}`,
      priority: SEVERITY_RANK[severity],
      sortTime: job.last_backup_start ? new Date(job.last_backup_start).getTime() : null
    };
  }).filter(Boolean);
}

export function buildContractQueueItems(contractAlerts = [], licenseAlerts = [], options = {}) {
  const items = [];
  for (const alert of Array.isArray(contractAlerts) ? contractAlerts : []) {
    const severity = alert.status === "expired" ? "critical" : "warning";
    const label = options.statusLabels?.[alert.status] || alert.status || "";
    items.push({
      id: `contract-${alert.id}`,
      domain: "contracts",
      severity,
      tone: severity === "critical" ? "bad" : "warn",
      title: alert.name || options.fallbackName || "—",
      subtitle: options.contractTypeLabel || "MSP",
      label,
      clientId: alert.id ?? null,
      clientName: alert.name || "",
      equipment: null,
      job: null,
      contract: {
        ...alert,
        typeKey: "contract"
      },
      agent: null,
      ticketSubject: `${alert.name || ""} — ${label}`.trim(),
      priority: SEVERITY_RANK[severity],
      sortTime: alert.expiration ? new Date(alert.expiration).getTime() : null
    });
  }
  for (const alert of Array.isArray(licenseAlerts) ? licenseAlerts : []) {
    const severity = alert.status === "expired" ? "critical" : "warning";
    const label = options.statusLabels?.[alert.status] || alert.status || "";
    const title = alert.clientName || alert.label || options.fallbackName || "—";
    items.push({
      id: `license-${alert.id}`,
      domain: "contracts",
      severity,
      tone: severity === "critical" ? "bad" : "warn",
      title,
      subtitle: alert.label || alert.moduleLabel || alert.module || "",
      label,
      clientId: alert.clientId ?? null,
      clientName: alert.clientName || "",
      equipment: null,
      job: null,
      contract: {
        ...alert,
        typeKey: alert.module || "license"
      },
      agent: null,
      ticketSubject: `${title} — ${label}`.trim(),
      priority: SEVERITY_RANK[severity],
      sortTime: alert.expiration ? new Date(alert.expiration).getTime() : null
    });
  }
  return items;
}

export function buildRmmQueueItems(offlineAgents = [], options = {}) {
  return (Array.isArray(offlineAgents) ? offlineAgents : []).map(agent => {
    const title = agent.hostname || agent.equipment?.name || options.fallbackName || "—";
    const clientName = agent.client_name || agent.equipment?.clientName || "";
    const label = options.offlineLabel || "Offline";
    return {
      id: `rmm-${agent.id || agent.machine_id || title}`,
      domain: "rmm",
      severity: "critical",
      tone: "bad",
      title,
      subtitle: [clientName, agent.os, agent.ip].filter(Boolean).join(" · "),
      label,
      clientId: agent.client_id || agent.equipment?.clientId || null,
      clientName,
      equipment: agent.equipment || null,
      job: null,
      contract: null,
      agent,
      ticketSubject: `${title} — ${label}`,
      priority: SEVERITY_RANK.critical,
      sortTime: agent.last_seen_at ? new Date(agent.last_seen_at).getTime() : null
    };
  });
}

export function buildUnifiedSupervisionQueue({
  statsItems = [],
  resolveMonitorStatus,
  alertRules = null,
  checkmkEnabled = false,
  isMkMapped = () => false,
  backupJobs = [],
  contractAlerts = [],
  licenseAlerts = [],
  offlineAgents = [],
  labels = {}
} = {}) {
  const devices = resolveMonitorStatus ? buildDeviceQueueItems(statsItems, resolveMonitorStatus, {
    alertRules,
    checkmkEnabled,
    isMkMapped,
    fallbackName: labels.noName
  }) : [];
  const backups = buildBackupQueueItems(backupJobs, {
    labels: labels.backup,
    fallbackName: labels.noName
  });
  const contracts = buildContractQueueItems(contractAlerts, licenseAlerts, {
    statusLabels: labels.contractStatus,
    contractTypeLabel: labels.contractType,
    fallbackName: labels.noName
  });
  const rmm = buildRmmQueueItems(offlineAgents, {
    offlineLabel: labels.offline,
    fallbackName: labels.noName
  });
  return [...devices, ...backups, ...contracts, ...rmm].sort((a, b) => {
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
        notifiedAt: item.sortTime ? new Date(item.sortTime).toISOString() : null,
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
      notifiedAt: state.createdAt || state.updatedAt || (item.sortTime ? new Date(item.sortTime).toISOString() : null),
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
