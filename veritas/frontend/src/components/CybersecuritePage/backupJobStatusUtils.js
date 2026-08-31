import { isBackupJobActive } from "../EnterprisesPage/backupJobUtils";
export const BACKUP_JOB_H24_MS = 24 * 60 * 60 * 1000;
export const BACKUP_JOB_H48_MS = 48 * 60 * 60 * 1000;
const STATUS_ORDER = {
  critical: 0,
  warning: 1,
  ok: 2,
  unmapped: 3,
  hycu: 4,
  inactive: 5
};
export function isBackupJobMapped(job) {
  if (!job) return false;
  if (job.isMapped) return true;
  const mapping = job.checkmkMapping;
  if (mapping?.checkmk_host_name || mapping?.checkmk_service_name) return true;
  const raw = job.rawData;
  return !!(job.checkmk_host_name || job.checkmk_service_name || raw?.checkmk_host_name || raw?.checkmk_service_name);
}

/** Shape a raw instance job so getBackupJobStatus can evaluate it. */
export function normalizeBackupJobForStatus(job, instance = {}) {
  if (!job || typeof job !== "object") return null;
  const mapping = job.checkmkMapping && typeof job.checkmkMapping === "object"
    ? job.checkmkMapping
    : job.checkmk_host_name || job.checkmk_service_name
      ? {
          checkmk_host_name: job.checkmk_host_name || null,
          checkmk_site: job.checkmk_site || null,
          checkmk_service_name: job.checkmk_service_name || null,
          is_active: true
        }
      : null;
  return {
    ...job,
    type: "job",
    instanceLogiciel: instance.logiciel || job.instanceLogiciel || job._instanceLogiciel || "",
    isMapped: Boolean(job.isMapped || mapping),
    checkmkMapping: mapping,
    last_backup_start: job.last_backup_start ?? job.lastBackupStart ?? job.rawData?.last_backup_start ?? null,
    last_backup_date: job.last_backup_date ?? job.lastBackupDate ?? job.rawData?.last_backup_date ?? null,
    last_backup_duration: job.last_backup_duration ?? job.lastBackupDuration ?? job.rawData?.last_backup_duration ?? null,
    rawData: job.rawData && typeof job.rawData === "object" ? job.rawData : job
  };
}
export function getBackupJobStatus(job) {
  if (!job || job.type !== 'job') return 'ok';
  if (!isBackupJobActive(job)) return 'inactive';
  if (job.instanceLogiciel === 'HYCU Backup') return 'hycu';
  if (!isBackupJobMapped(job)) return 'unmapped';
  const lastBackupStart = job.last_backup_start ?? job.rawData?.last_backup_start;
  const lastBackupMs = lastBackupStart ? new Date(lastBackupStart).getTime() : null;
  if (lastBackupMs == null || Number.isNaN(lastBackupMs)) return 'critical';
  const age = Date.now() - lastBackupMs;
  if (age > BACKUP_JOB_H48_MS) return 'critical';
  if (age > BACKUP_JOB_H24_MS) return 'warning';
  return 'ok';
}
export function getBackupJobStatusLabel(status) {
  switch (status) {
    case 'critical':
      return 'Error';
    case 'warning':
      return 'Retard';
    case 'ok':
      return 'OK';
    case 'hycu':
      return 'HYCU';
    case 'unmapped':
      return 'Unmapped';
    case 'inactive':
      return 'Inactif';
    default:
      return '-';
  }
}
export function getBackupJobStatusTitle(status) {
  switch (status) {
    case 'critical':
      return 'Last backup more than 48 h ago or unknown';
    case 'warning':
      return 'Last backup more than 24 h ago';
    case 'ok':
      return 'Last backup less than 24 h ago';
    case 'hycu':
      return 'HYCU job · cannot sync with CheckMK';
    case 'unmapped':
      return 'Job not mapped to CheckMK · no alerts until mapping is configured';
    case 'inactive':
      return 'Inactive job · excluded from backup alerts';
    default:
      return '';
  }
}
export function getBackupJobRowStyle(status) {
  switch (status) {
    case 'critical':
      return {
        backgroundColor: '#fee2e2',
        fontWeight: 'bold'
      };
    case 'warning':
      return {
        backgroundColor: '#ffedd5',
        fontWeight: 'bold'
      };
    case 'ok':
      return {
        backgroundColor: '#dcfce7'
      };
    case 'inactive':
      return {
        backgroundColor: '#f3f4f6',
        opacity: 0.78
      };
    default:
      return {
        backgroundColor: '#f9fafb'
      };
  }
}
export function compareBackupJobsByStatus(a, b) {
  const sa = STATUS_ORDER[getBackupJobStatus(a)] ?? 9;
  const sb = STATUS_ORDER[getBackupJobStatus(b)] ?? 9;
  return sa - sb;
}
export function computeBackupJobStats(jobs) {
  const stats = {
    total: 0,
    critical: 0,
    warning: 0,
    ok: 0,
    unmapped: 0,
    hycu: 0,
    inactive: 0,
    issues: 0,
    monitored: 0
  };
  (jobs || []).forEach(job => {
    if (job?.type !== 'job') return;
    stats.total += 1;
    const status = getBackupJobStatus(job);
    if (status === 'critical') stats.critical += 1;else if (status === 'warning') stats.warning += 1;else if (status === 'ok') stats.ok += 1;else if (status === 'unmapped') stats.unmapped += 1;else if (status === 'hycu') stats.hycu += 1;else if (status === 'inactive') stats.inactive += 1;
    if (status === 'critical' || status === 'warning' || status === 'ok') stats.monitored += 1;
  });
  stats.issues = stats.critical + stats.warning;
  return stats;
}
