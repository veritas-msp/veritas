import { getBackupJobStatus, compareBackupJobsByStatus } from "../CybersecuritePage/backupJobStatusUtils";
import { formatServeurLieLabel, isBackupJobActive, normalizeServeurLieList, pickBackupJobType, pickBackupJobDestination } from "../EnterprisesPage/backupJobUtils";
const BACKUP_PROVIDER_META = {
  "HYCU Backup": {
    id: "hycu",
    label: "HYCU Backup",
    icon: "mdi:backup-restore",
    image: "/assets/icons/hycu.png"
  },
  Veeam: {
    id: "veeam",
    label: "Veeam",
    icon: "simple-icons:veeam",
    image: null
  },
  "Active Backup for Microsoft 365": {
    id: "active-backup",
    label: "Active Backup",
    icon: "mdi:microsoft-office",
    image: null
  },
  HyperBackup: {
    id: "hyper-backup",
    label: "HyperBackup",
    icon: "mdi:backup-restore",
    image: "/assets/icons/hyperbackup.png"
  }
};
function normalizeProviderId(instanceLogiciel) {
  const raw = String(instanceLogiciel || "").trim();
  if (!raw) return "other";
  return BACKUP_PROVIDER_META[raw]?.id || raw.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "other";
}
function resolveProviderMeta(instanceLogiciel) {
  const known = BACKUP_PROVIDER_META[instanceLogiciel];
  if (known) return known;
  const label = String(instanceLogiciel || "").trim() || "Autre";
  return {
    id: normalizeProviderId(instanceLogiciel),
    label,
    icon: "mdi:backup-restore",
    image: null
  };
}
export function buildBackupFleetRow(job) {
  const provider = resolveProviderMeta(job?.instanceLogiciel);
  const status = getBackupJobStatus(job);
  return {
    id: job?.id,
    clientId: job?.clientId,
    clientName: job?.clientName || "-",
    jobName: job?.nom || "-",
    jobType: pickBackupJobType(job),
    server: formatServeurLieLabel(job?.serveurLie, ""),
    destination: pickBackupJobDestination(job),
    instanceId: job?.instanceId ?? null,
    instanceName: job?.instanceName || job?.instanceLogiciel || "",
    instanceLogiciel: job?.instanceLogiciel || "",
    providerId: provider.id,
    providerName: provider.label,
    providerIcon: provider.icon,
    providerImage: provider.image,
    status,
    lastBackup: job?.last_backup_start ?? job?.rawData?.last_backup_start ?? job?.last_backup_date ?? job?.rawData?.last_backup_date ?? null,
    isMapped: Boolean(job?.isMapped),
    raw: job
  };
}
export function buildBackupFleetFromJobs(jobs = []) {
  return (Array.isArray(jobs) ? jobs : []).filter(job => job?.type === "job").map(job => buildBackupFleetRow(job));
}
export function buildBackupFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const providers = new Set();
  const statusCounts = {
    ok: 0,
    warning: 0,
    critical: 0,
    unmapped: 0,
    hycu: 0
  };
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    if (row.providerId) providers.add(row.providerId);
    if (statusCounts[row.status] != null) statusCounts[row.status] += 1;
  });
  const issues = statusCounts.critical + statusCounts.warning;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    providers: providers.size,
    issues,
    healthScore,
    statusCounts
  };
}
export function groupBackupFleetByProvider(rows = []) {
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const key = row.providerId || "other";
    if (!groups.has(key)) {
      groups.set(key, {
        providerId: key,
        providerName: row.providerName,
        providerIcon: row.providerIcon,
        providerImage: row.providerImage,
        list: []
      });
    }
    groups.get(key).list.push(row);
  });
  return Array.from(groups.values()).sort((a, b) => a.providerName.localeCompare(b.providerName, "fr"));
}
const BACKUP_STATUS_SORT_ORDER = {
  critical: 0,
  warning: 1,
  ok: 2,
  unmapped: 3,
  hycu: 4
};
export function sortBackupFleetRows(rows, sortBy, sortDirection = "asc") {
  const list = [...(Array.isArray(rows) ? rows : [])];
  const mult = sortDirection === "asc" ? 1 : -1;
  const compareStrings = (left, right) => mult * String(left || "").localeCompare(String(right || ""), "fr", {
    sensitivity: "base"
  });
  const compareDates = (left, right) => {
    const leftTime = left ? new Date(left).getTime() : null;
    const rightTime = right ? new Date(right).getTime() : null;
    if (leftTime == null && rightTime == null) return 0;
    if (leftTime == null) return 1;
    if (rightTime == null) return -1;
    return mult * (leftTime - rightTime);
  };
  list.sort((a, b) => {
    const statusCmp = compareBackupJobsByStatus(a.raw, b.raw);
    if (statusCmp !== 0 && sortBy !== "status") return statusCmp;
    switch (sortBy) {
      case "clientName":
        return compareStrings(a.clientName, b.clientName);
      case "jobName":
        return compareStrings(a.jobName, b.jobName);
      case "instanceName":
        return compareStrings(a.instanceName, b.instanceName);
      case "jobsCount": {
        const left = Number(a.jobsCount) || 0;
        const right = Number(b.jobsCount) || 0;
        return mult * (left - right);
      }
      case "version":
        return compareStrings(a.version, b.version);
      case "status":
        {
          const leftRank = BACKUP_STATUS_SORT_ORDER[a.status] ?? 99;
          const rightRank = BACKUP_STATUS_SORT_ORDER[b.status] ?? 99;
          return mult * (leftRank - rightRank);
        }
      case "providerName":
        return compareStrings(a.providerName, b.providerName);
      case "server":
        return compareStrings(a.server, b.server);
      case "lastBackup":
        return compareDates(a.lastBackup, b.lastBackup);
      default:
        return 0;
    }
  });
  return list;
}
export function filterBackupFleetRows(rows, {
  search = "",
  statusFilter = "all",
  providerFilter = "all",
  instanceId = null,
  clientId = null
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];
  const query = search.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(row => row.clientName?.toLowerCase().includes(query) || row.jobName?.toLowerCase().includes(query) || row.jobType?.toLowerCase().includes(query) || row.instanceName?.toLowerCase().includes(query) || row.server?.toLowerCase().includes(query) || row.destination?.toLowerCase().includes(query) || row.providerName?.toLowerCase().includes(query) || row.version?.toLowerCase().includes(query));
  }
  if (instanceId != null && instanceId !== "") {
    filtered = filtered.filter(row => String(row.instanceId) === String(instanceId) && (clientId == null || String(row.clientId) === String(clientId)));
  }
  if (statusFilter === "issues") {
    filtered = filtered.filter(row => row.status === "critical" || row.status === "warning");
  } else if (statusFilter !== "all") {
    filtered = filtered.filter(row => row.status === statusFilter);
  }
  if (providerFilter !== "all") {
    filtered = filtered.filter(row => row.providerId === providerFilter);
  }
  return filtered;
}
function listClientBackupInstances(client) {
  const raw = client?.equipements?.Sauvegarde || client?.equipements?.Backup;
  return Array.isArray(raw?.instances) ? raw.instances : [];
}
function resolveInstanceName(instance) {
  return String(instance?.nom || instance?.name || instance?.logiciel || "").trim();
}
export function buildBackupJobFromInstance(client, instance, job) {
  const clientId = client?.id;
  const instanceId = instance?.id ?? instance?.instanceId;
  const jobId = job?.id || `job-${clientId}-${instanceId}-${job?.nom || ""}`;
  const checkmkMapping = job?.checkmkMapping && typeof job.checkmkMapping === "object" ? job.checkmkMapping : job?.checkmk_host_name || job?.checkmk_service_name ? {
    checkmk_host_name: job.checkmk_host_name || null,
    checkmk_site: job.checkmk_site || null,
    checkmk_service_name: job.checkmk_service_name || null,
    is_active: true
  } : null;
  return {
    id: jobId,
    clientId,
    clientName: client?.name || client?.nom || "-",
    type: "job",
    instanceId,
    instanceName: resolveInstanceName(instance) || instance?.logiciel || "",
    instanceLogiciel: instance?.logiciel || "",
    nom: job?.nom || "",
    typeBackup: pickBackupJobType(job),
    regularite: job?.regularite || "",
    horaire: job?.horaire || "",
    retention: job?.retention || "",
    destination: pickBackupJobDestination(job, instance),
    serveurLie: normalizeServeurLieList(job?.serveurLie),
    stockageLie: job?.stockageLie || "",
    replicationVers: job?.replicationVers || "",
    isDefault: job?.isDefault || false,
    actif: isBackupJobActive(job),
    isMapped: Boolean((checkmkMapping?.checkmk_host_name || checkmkMapping?.checkmk_service_name) || job?.isMapped),
    checkmkMapping,
    last_backup_date: job?.last_backup_date ?? null,
    last_backup_start: job?.last_backup_start ?? null,
    last_backup_duration: job?.last_backup_duration ?? null,
    rawData: job
  };
}
export function buildBackupFleetFromClients(clients = []) {
  const jobs = [];
  (Array.isArray(clients) ? clients : []).forEach(client => {
    listClientBackupInstances(client).forEach(instance => {
      (Array.isArray(instance?.jobs) ? instance.jobs : []).forEach(job => {
        jobs.push(buildBackupJobFromInstance(client, instance, job));
      });
    });
  });
  return buildBackupFleetFromJobs(jobs);
}
export function buildBackupInstanceFleetFromClients(clients = []) {
  const rows = [];
  (Array.isArray(clients) ? clients : []).forEach(client => {
    listClientBackupInstances(client).forEach((instance, index) => {
      const provider = resolveProviderMeta(instance?.logiciel);
      const jobs = Array.isArray(instance?.jobs) ? instance.jobs : [];
      const instanceId = instance?.id ?? instance?.instanceId ?? `instance-${client?.id}-${instance?.logiciel || index}`;
      rows.push({
        id: instanceId,
        clientId: client?.id,
        clientName: client?.name || client?.nom || "-",
        instanceName: resolveInstanceName(instance) || provider.label,
        logiciel: instance?.logiciel || "",
        server: instance?.server || "",
        version: instance?.version || "",
        expiration: instance?.expiration || "",
        jobsCount: instance?.jobsCount ?? jobs.length,
        providerId: provider.id,
        providerName: provider.label,
        providerIcon: provider.icon,
        providerImage: provider.image,
        raw: instance
      });
    });
  });
  return rows;
}
export function buildBackupInstanceFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const providers = new Set();
  let jobs = 0;
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    if (row.providerId) providers.add(row.providerId);
    jobs += Number(row.jobsCount) || 0;
  });
  return {
    total: list.length,
    clients: clientIds.size,
    providers: providers.size,
    jobs
  };
}
