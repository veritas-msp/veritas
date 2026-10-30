import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientModules, fetchCyberPageData } from "../../api/clients";
import API_BASE_URL from "../../config";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import SolutionDetailPageLayout from "../EnterprisesPage/SolutionDetailPageLayout";
import SolutionOverviewDataTable from "../EnterprisesPage/SolutionOverviewDataTable";
import {
  getBackupJobStatus,
  getBackupJobStatusLabel,
  getBackupJobStatusTitle,
  isBackupJobMapped
} from "./backupJobStatusUtils";
import {
  buildBackupInstanceDetailPayload,
  findBackupInstanceInClients
} from "../EquipementPage/backupMspUtils";
import { isBackupJobActive } from "../EnterprisesPage/backupJobUtils";
import { bulkSyncBackupJobs, isBackupJobSyncable } from "./backupBulkUtils";
import { getInstanceDetailCopy } from "./instanceDetailPageI18n";
import styles from "./InstanceDetailPage.module.css";

async function fetchBackupJobsLastSync() {
  try {
    const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/last-sync`, {
      credentials: "include"
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.lastSync || null;
  } catch {
    return null;
  }
}

function formatSyncDate(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function formatDuration(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const totalSec = Math.round(value);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
    const hours = Math.floor(min / 60);
    const remMin = min % 60;
    return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  }
  return String(value);
}

function normalizeIncomingInstance(data) {
  if (!data || typeof data !== "object") return null;
  const payload = buildBackupInstanceDetailPayload(data);
  if (!payload.instanceId && !payload.clientId) return null;
  return {
    ...payload,
    jobs: Array.isArray(data.jobs) ? data.jobs : []
  };
}

function instanceIdentityKey(data) {
  if (!data) return "";
  const instanceId = data.instanceId || data.id || "";
  const clientId = data.clientId || "";
  const name = data.instanceName || data.logiciel || "";
  return `${clientId}:${instanceId}:${name}`;
}

async function resolveInstanceFromApi(seed) {
  if (seed?.clientId) {
    const modulesData = await fetchClientModules(seed.clientId);
    const client = {
      id: seed.clientId,
      name: seed.clientName || "",
      equipements: modulesData?.equipements || {}
    };
    const found = findBackupInstanceInClients([client], {
      instanceId: seed.instanceId || seed.id,
      clientId: seed.clientId,
      instanceName: seed.instanceName,
      logiciel: seed.logiciel
    });
    if (found) return found;
  }

  const data = await fetchCyberPageData();
  const clients = Array.isArray(data?.clients) ? data.clients : Array.isArray(data) ? data : [];
  return findBackupInstanceInClients(clients, {
    instanceId: seed.instanceId || seed.id,
    clientId: seed.clientId,
    instanceName: seed.instanceName,
    logiciel: seed.logiciel
  });
}

export default function InstanceDetailPage({ instanceData, onNavigate, onUpdate }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getInstanceDetailCopy(locale), [locale]);
  const { formatDateTime } = useAppFormatters();
  const seed = useMemo(() => normalizeIncomingInstance(instanceData), [instanceData]);
  const identityKey = useMemo(() => instanceIdentityKey(seed || instanceData), [seed, instanceData]);
  const [instance, setInstance] = useState(() => seed);
  const [loading, setLoading] = useState(() => !seed?.instanceName && !seed?.logiciel);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [activeSection, setActiveSection] = useState(
    instanceData?.focusJobId ? "jobs" : "overview"
  );
  const [selectedJobId, setSelectedJobId] = useState(instanceData?.focusJobId || null);
  const loadedKeyRef = useRef("");
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let cancelled = false;
    fetchBackupJobsLastSync().then(lastSync => {
      if (!cancelled && lastSync) setLastSyncAt(lastSync);
    });
    return () => {
      cancelled = true;
    };
  }, [identityKey]);

  const refreshFromApi = useCallback(async (seedPayload) => {
    const current = seedPayload || normalizeIncomingInstance(instanceData);
    if (!current?.clientId && !current?.instanceId) {
      setLoading(false);
      return;
    }
    const hasDisplayableSeed = Boolean(current.instanceName || current.logiciel || current.jobs?.length);
    if (!hasDisplayableSeed) setLoading(true);
    try {
      const found = await resolveInstanceFromApi(current);
      if (found) {
        const next = { ...found, focusJobId: current.focusJobId || null };
        setInstance(next);
        onUpdateRef.current?.(next);
        if (current.focusJobId) setSelectedJobId(current.focusJobId);
      } else if (hasDisplayableSeed) {
        setInstance(current);
      } else {
        setInstance(null);
      }
    } catch {
      if (hasDisplayableSeed) setInstance(current);
      else setInstance(null);
    } finally {
      setLoading(false);
    }
  }, [instanceData]);

  useEffect(() => {
    if (!seed) {
      setInstance(null);
      setLoading(false);
      loadedKeyRef.current = "";
      return;
    }
    setInstance(prev => {
      if (
        prev &&
        instanceIdentityKey(prev) === identityKey &&
        Array.isArray(prev.jobs) &&
        prev.jobs.length > 0 &&
        (!Array.isArray(seed.jobs) || seed.jobs.length === 0)
      ) {
        return {
          ...prev,
          ...seed,
          jobs: prev.jobs
        };
      }
      return seed;
    });
    setSelectedJobId(instanceData?.focusJobId || null);
    if (loadedKeyRef.current === identityKey) return;
    loadedKeyRef.current = identityKey;
    refreshFromApi(seed);
  }, [identityKey, seed, instanceData?.focusJobId, refreshFromApi]);

  useEffect(() => {
    if (!window.updateTabTitle || !instance) return;
    window.updateTabTitle("InstanceDetail", {
      id: instance.instanceId || instance.id,
      instanceId: instance.instanceId || instance.id,
      clientId: instance.clientId,
      clientName: instance.clientName,
      instanceName: instance.instanceName,
      name: instance.instanceName,
      logiciel: instance.logiciel
    });
  }, [instance]);

  const jobs = useMemo(() => (Array.isArray(instance?.jobs) ? instance.jobs : []), [instance]);

  const syncableJobs = useMemo(
    () => jobs.filter(job => isBackupJobSyncable(job) || isBackupJobMapped(job)),
    [jobs]
  );
  const canSync = syncableJobs.some(job => isBackupJobSyncable(job));

  const historyRows = useMemo(() => {
    const list = selectedJobId
      ? jobs.filter(job => String(job.id) === String(selectedJobId))
      : jobs;
    return list
      .map(job => {
        const when = job.last_backup_start || job.last_backup_date || null;
        return {
          id: job.id,
          jobName: job.nom || job.jobName || "-",
          when,
          duration: formatDuration(job.last_backup_duration),
          status: getBackupJobStatus(job),
          sortKey: when ? new Date(when).getTime() : 0
        };
      })
      .filter(row => row.when)
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [jobs, selectedJobId]);

  const handleOpenClient = () => {
    if (!instance?.clientId || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId: instance.clientId,
      name: instance.clientName
    });
  };
  const handleOpenJob = (job, options = {}) => {
    if (!job || !onNavigate) return;
    onNavigate("JobDetail", job, options);
  };
  const handleSelectJob = job => {
    setSelectedJobId(prev => (String(prev) === String(job.id) ? null : job.id));
  };

  const handleSync = useCallback(async () => {
    if (syncing) return;
    if (!canSync) {
      toast.info(copy.syncNone || "Aucun job mappé à synchroniser.");
      return;
    }
    setSyncing(true);
    try {
      const result = await bulkSyncBackupJobs(jobs);
      if (result?.lastSync) setLastSyncAt(result.lastSync);
      if (result.updated > 0) {
        toast.success(
          (copy.syncSuccess || "Synchronisation terminée ({count})").replace(
            "{count}",
            String(result.updated)
          )
        );
      } else {
        toast.info(copy.syncNone || "Aucun job mappé à synchroniser.");
      }
      await refreshFromApi(instance);
      const latest = await fetchBackupJobsLastSync();
      if (latest) setLastSyncAt(latest);
    } catch (err) {
      toast.error(err?.message || copy.syncError || "Échec de la synchronisation");
    } finally {
      setSyncing(false);
    }
  }, [canSync, syncing, jobs, copy, refreshFromApi, instance]);

  const navEntries = useMemo(
    () => [
      {
        key: "overview",
        section: {
          id: "overview",
          label: copy.sections.overview,
          icon: "mdi:information-outline",
          description: copy.sections.overviewSplitHint || copy.sections.overviewHint || ""
        }
      },
      {
        key: "history",
        section: {
          id: "history",
          label: copy.sections.history,
          icon: "mdi:history",
          description: copy.sections.historyHint || ""
        }
      }
    ],
    [copy]
  );

  if (!instance && !loading) {
    return (
      <SolutionDetailPageLayout
        title={copy.solutionTitle || "Sauvegarde"}
        titleIcon="mdi:backup-restore"
        subtitle={copy.empty.title}
        navEntries={[]}
        navAriaLabel={copy.navAria || "Sections"}
      >
        <div className={styles.emptyState}>
          <Icon icon="mdi:backup-restore" className={styles.emptyIcon} aria-hidden />
          <h2>{copy.empty.title}</h2>
          <p>{copy.empty.text}</p>
        </div>
      </SolutionDetailPageLayout>
    );
  }

  const solutionTitle = copy.solutionTitle || "Sauvegarde";
  const clientName = instance?.clientName || null;
  const subtitle = instance?.clientId && onNavigate ? (
    <button type="button" className={styles.subtitleLink} onClick={handleOpenClient}>
      {clientName || copy.openClient}
    </button>
  ) : (
    clientName
  );

  const mappedCount = jobs.filter(isBackupJobMapped).length;
  const instanceLabel = instance?.instanceName || instance?.logiciel || null;
  const mappingHint = mappedCount
    ? (copy.mappingHint || "{mapped}/{total} jobs mappés")
        .replace("{mapped}", String(mappedCount))
        .replace("{total}", String(jobs.length))
    : copy.mappingNone || "Aucun job mappé";
  const footerHint = [instanceLabel, mappingHint].filter(Boolean).join(" · ");

  const instanceRows = useMemo(() => {
    if (!instance) return [];
    return [
      {
        id: instance.instanceId || instance.id || "instance",
        solution: instance.providerName || instance.logiciel || instance.instanceName || "-",
        server: instance.server || "-",
        version: instance.version || "-",
        expiration: instance.expiration || "-",
        jobsCount: jobs.length
      }
    ];
  }, [instance, jobs.length]);

  const instanceColumns = useMemo(
    () => [
      { key: "solution", label: copy.fields.solution, sortValue: row => row.solution || "" },
      { key: "server", label: copy.fields.server, sortValue: row => row.server || "" },
      { key: "version", label: copy.fields.version, sortValue: row => row.version || "" },
      { key: "expiration", label: copy.fields.expiration, sortValue: row => row.expiration || "" },
      {
        key: "jobsCount",
        label: copy.fields.jobsCount,
        sortValue: row => Number(row.jobsCount) || 0
      }
    ],
    [copy]
  );

  const jobColumns = useMemo(
    () => [
      {
        key: "name",
        label: copy.history.job,
        sortValue: row => row.nom || row.jobName || "",
        render: row => (
          <span className={styles.jobNameCell} title={row.nom || row.jobName}>
            {row.nom || row.jobName || "-"}
          </span>
        )
      },
      {
        key: "status",
        label: copy.fields.status,
        sortValue: row => getBackupJobStatus(row),
        render: row => {
          const status = getBackupJobStatus(row);
          const active = isBackupJobActive(row);
          return (
            <>
              <span
                className={`${styles.statusBadge} ${styles[`status_${status}`] || ""}`}
                title={getBackupJobStatusTitle(status)}
              >
                {getBackupJobStatusLabel(status)}
              </span>
              <span className={styles.cellMuted} style={{ marginLeft: "0.4rem" }}>
                {active ? copy.jobs.active : copy.jobs.inactive}
              </span>
            </>
          );
        }
      },
      {
        key: "typeBackup",
        label: copy.fields.jobType,
        sortValue: row => row.typeBackup || "",
        render: row => <span className={styles.cellMuted}>{row.typeBackup || "-"}</span>
      },
      {
        key: "schedule",
        label: copy.fields.schedule,
        sortValue: row => [row.regularite, row.horaire].filter(Boolean).join(" "),
        render: row => (
          <span className={styles.cellMuted}>
            {[row.regularite, row.horaire].filter(Boolean).join(" · ") || "-"}
          </span>
        )
      },
      {
        key: "lastBackup",
        label: copy.fields.lastBackup,
        sortValue: row => {
          const when = row.last_backup_start || row.last_backup_date;
          const ms = when ? new Date(when).getTime() : NaN;
          return Number.isFinite(ms) ? ms : 0;
        },
        render: row => {
          const lastBackup = row.last_backup_start || row.last_backup_date;
          return (
            <span className={styles.cellMuted}>
              {lastBackup ? formatDateTime(lastBackup) : "-"}
            </span>
          );
        }
      },
      {
        key: "duration",
        label: copy.fields.lastDuration,
        sortValue: row => Number(row.last_backup_duration) || 0,
        render: row => (
          <span className={styles.cellMuted}>
            {formatDuration(row.last_backup_duration) || "-"}
          </span>
        )
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        render: row => (
          <div className={styles.jobActions}>
            <button
              type="button"
              className={styles.jobActionBtn}
              title={copy.openJob}
              aria-label={copy.openJob}
              onClick={e => {
                e.stopPropagation();
                handleOpenJob(row);
              }}
            >
              <Icon icon="mdi:open-in-new" aria-hidden />
            </button>
          </div>
        )
      }
    ],
    [copy, formatDateTime]
  );

  const renderInstanceJobsSplit = () => (
    <div className={styles.tablesSplit}>
      <section className={styles.tableBlock} aria-label={copy.sections.overview}>
        <div className={styles.tableBlockHead}>
          <h2 className={styles.sectionTitle}>{copy.sections.overview}</h2>
        </div>
        <div className={styles.tableBlockBody}>
          <SolutionOverviewDataTable
            columns={instanceColumns}
            rows={instanceRows}
            emptyLabel={copy.empty.title}
            emptyIcon="mdi:server-off"
            fillHeight
            searchable
            searchPlaceholder="Rechercher"
          />
        </div>
      </section>

      <section className={styles.tableBlock} aria-label={copy.sections.jobs}>
        <div className={styles.tableBlockHead}>
          <h2 className={styles.sectionTitle}>{copy.sections.jobs}</h2>
        </div>
        <div className={styles.tableBlockBody}>
          <SolutionOverviewDataTable
            columns={jobColumns}
            rows={jobs}
            emptyLabel={loading ? copy.loading : copy.jobs.empty}
            emptyIcon="mdi:briefcase-off-outline"
            fillHeight
            searchable
            searchPlaceholder="Rechercher"
            onRowClick={handleSelectJob}
            onRowDoubleClick={handleOpenJob}
            getRowClassName={row =>
              String(selectedJobId) === String(row.id) ? styles.jobRowActive : ""
            }
          />
        </div>
      </section>
    </div>
  );

  const historyColumns = useMemo(
    () => [
      {
        key: "jobName",
        label: copy.history.job,
        sortValue: row => row.jobName || "",
        render: row => <span className={styles.jobNameCell}>{row.jobName}</span>
      },
      {
        key: "when",
        label: copy.history.when,
        sortValue: row => Number(row.sortKey) || 0,
        render: row => (
          <span className={styles.cellMuted}>{row.when ? formatDateTime(row.when) : "-"}</span>
        )
      },
      {
        key: "duration",
        label: copy.history.duration,
        sortValue: row => row.duration || "",
        render: row => <span className={styles.cellMuted}>{row.duration || "-"}</span>
      },
      {
        key: "status",
        label: copy.history.status,
        sortValue: row => row.status || "",
        render: row => (
          <span
            className={`${styles.statusBadge} ${styles[`status_${row.status}`] || ""}`}
            title={getBackupJobStatusTitle(row.status)}
          >
            {getBackupJobStatusLabel(row.status)}
          </span>
        )
      }
    ],
    [copy, formatDateTime]
  );

  const renderHistory = () => (
    <section className={`${styles.tableBlock} ${styles.historyFill}`} aria-label={copy.sections.history}>
      <div className={styles.tableBlockHead}>
        <h2 className={styles.sectionTitle}>{copy.sections.history}</h2>
        <div className={styles.filterChips}>
          <button
            type="button"
            className={`${styles.filterChip} ${!selectedJobId ? styles.filterChipActive : ""}`}
            onClick={() => setSelectedJobId(null)}
          >
            {copy.jobs.allJobs}
          </button>
          {jobs.map(job => (
            <button
              key={`chip-${job.id}`}
              type="button"
              className={`${styles.filterChip} ${
                String(selectedJobId) === String(job.id) ? styles.filterChipActive : ""
              }`}
              onClick={() => setSelectedJobId(job.id)}
            >
              {job.nom || job.jobName || "-"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.tableBlockBody}>
        <SolutionOverviewDataTable
          columns={historyColumns}
          rows={historyRows}
          emptyLabel={copy.history.empty}
          emptyIcon="mdi:history"
          fillHeight
          searchable
          searchPlaceholder="Rechercher"
          onRowClick={row => {
            const job = jobs.find(j => String(j.id) === String(row.id));
            if (job) handleOpenJob(job);
          }}
        />
      </div>
    </section>
  );

  const renderSection = () => {
    if (activeSection === "history") return renderHistory();
    return renderInstanceJobsSplit();
  };

  const syncAtLabel = formatSyncDate(lastSyncAt);
  const headerMeta = syncAtLabel ? (
    <>
      <Icon icon="mdi:cloud-sync-outline" width={14} height={14} aria-hidden />
      <span>
        {copy.lastSyncLabel || "Dernière sync"} · <strong>{syncAtLabel}</strong>
      </span>
    </>
  ) : (
    <>
      <Icon icon="mdi:cloud-off-outline" width={14} height={14} aria-hidden />
      <span>{copy.lastSyncNever || "Jamais synchronisé"}</span>
    </>
  );

  return (
    <SolutionDetailPageLayout
      title={solutionTitle}
      titleIcon={instance?.providerIcon || "mdi:backup-restore"}
      subtitle={subtitle}
      headerMeta={headerMeta}
      loading={loading && !instance}
      refreshing={syncing}
      loadingMessage={copy.loading}
      onRefresh={handleSync}
      refreshLabel={copy.sync || "Synchroniser"}
      footerHint={footerHint}
      navEntries={navEntries}
      activeSection={activeSection === "jobs" ? "overview" : activeSection}
      onSectionChange={setActiveSection}
      navAriaLabel={copy.navAria || "Sections"}
    >
      <div className={`${styles.contentStack} ${styles.contentStackFill}`}>
        {renderSection()}
      </div>
    </SolutionDetailPageLayout>
  );
}
