import { getBackupJobStatus, compareBackupJobsByStatus } from "../CybersecuritePage/backupJobStatusUtils";
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
    jobType: job?.typeBackup || "",
    server: job?.serveurLie || "",
    destination: job?.destination || "",
    instanceLogiciel: job?.instanceLogiciel || "",
    providerId: provider.id,
    providerName: provider.label,
    providerIcon: provider.icon,
    providerImage: provider.image,
    status,
    lastBackup: job?.last_backup_start ?? job?.rawData?.last_backup_start ?? null,
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
  providerFilter = "all"
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];
  const query = search.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(row => row.clientName?.toLowerCase().includes(query) || row.jobName?.toLowerCase().includes(query) || row.jobType?.toLowerCase().includes(query) || row.server?.toLowerCase().includes(query) || row.destination?.toLowerCase().includes(query) || row.providerName?.toLowerCase().includes(query));
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
