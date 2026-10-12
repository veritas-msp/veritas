import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientModules, fetchCyberPageData } from "../../api/clients";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import SolutionDetailPageLayout from "../EnterprisesPage/SolutionDetailPageLayout";
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
import { formatServeurLieLabel, isBackupJobActive } from "../EnterprisesPage/backupJobUtils";
import { bulkSyncBackupJobs, isBackupJobSyncable } from "./backupBulkUtils";
import { getInstanceDetailCopy } from "./instanceDetailPageI18n";
import styles from "./InstanceDetailPage.module.css";

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

function StatCard({ icon, label, value }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statCardIcon}>
        <Icon icon={icon} />
      </span>
      <div className={styles.statCardContent}>
        <span className={styles.statCardValue}>{value || "-"}</span>
        <span className={styles.statCardLabel}>{label}</span>
      </div>
    </div>
  );
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
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedJobId, setSelectedJobId] = useState(instanceData?.focusJobId || null);
  const loadedKeyRef = useRef("");
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

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

  const selectedJob = useMemo(
    () => (selectedJobId ? jobs.find(j => String(j.id) === String(selectedJobId)) : null),
    [jobs, selectedJobId]
  );

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
    if (!canSync || syncing) return;
    setSyncing(true);
    try {
      const result = await bulkSyncBackupJobs(jobs);
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
          description: copy.sections.overviewHint || ""
        }
      },
      {
        key: "jobs",
        section: {
          id: "jobs",
          label: copy.sections.jobs,
          icon: "mdi:briefcase-outline",
          description: copy.sections.jobsHint || ""
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
        eyebrow={copy.eyebrow}
        title={copy.empty.title}
        titleIcon="mdi:backup-restore"
        subtitle={copy.empty.text}
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

  const title = instance?.instanceName || instance?.logiciel || copy.loading;
  const subtitle = instance?.clientId && onNavigate ? (
    <button type="button" className={styles.subtitleLink} onClick={handleOpenClient}>
      {instance.clientName || copy.openClient}
    </button>
  ) : (
    instance?.clientName || null
  );

  const mappedCount = jobs.filter(isBackupJobMapped).length;
  const footerHint = mappedCount
    ? (copy.mappingHint || "{mapped}/{total} jobs mappés")
        .replace("{mapped}", String(mappedCount))
        .replace("{total}", String(jobs.length))
    : copy.mappingNone || "Aucun job mappé";

  const renderOverview = () => (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{copy.sections.overview}</h2>
      <div className={styles.statsCards}>
        <StatCard icon="mdi:backup-restore" label={copy.fields.solution} value={instance.providerName || instance.logiciel} />
        <StatCard icon="mdi:server" label={copy.fields.server} value={instance.server} />
        <StatCard icon="mdi:tag-outline" label={copy.fields.version} value={instance.version} />
        <StatCard icon="mdi:calendar-end" label={copy.fields.expiration} value={instance.expiration} />
        <StatCard icon="mdi:briefcase-outline" label={copy.fields.jobsCount} value={String(jobs.length)} />
      </div>
    </section>
  );

  const renderJobs = () => (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{copy.sections.jobs}</h2>
      </div>
      <p className={styles.sectionHint}>{copy.jobs.selectHint}</p>
      {jobs.length === 0 ? (
        <p className={styles.emptyInline}>{loading ? copy.loading : copy.jobs.empty}</p>
      ) : (
        <div className={styles.jobsTableWrap}>
          <table className={styles.jobsTable}>
            <thead>
              <tr>
                <th>{copy.history.job}</th>
                <th>{copy.fields.status}</th>
                <th>{copy.fields.jobType}</th>
                <th>{copy.fields.schedule}</th>
                <th>{copy.fields.lastBackup}</th>
                <th>{copy.fields.lastDuration}</th>
                <th aria-label={copy.openJob} />
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const status = getBackupJobStatus(job);
                const active = isBackupJobActive(job);
                const selected = String(selectedJobId) === String(job.id);
                const lastBackup = job.last_backup_start || job.last_backup_date;
                return (
                  <tr
                    key={job.id}
                    className={selected ? styles.jobRowActive : undefined}
                    onClick={() => handleSelectJob(job)}
                    onDoubleClick={() => handleOpenJob(job)}
                  >
                    <td className={styles.jobNameCell} title={job.nom || job.jobName}>
                      {job.nom || job.jobName || "-"}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[`status_${status}`] || ""}`}
                        title={getBackupJobStatusTitle(status)}
                      >
                        {getBackupJobStatusLabel(status)}
                      </span>
                      <span className={styles.cellMuted} style={{ marginLeft: "0.4rem" }}>
                        {active ? copy.jobs.active : copy.jobs.inactive}
                      </span>
                    </td>
                    <td className={styles.cellMuted}>{job.typeBackup || "-"}</td>
                    <td className={styles.cellMuted}>
                      {[job.regularite, job.horaire].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className={styles.cellMuted}>
                      {lastBackup ? formatDateTime(lastBackup) : "-"}
                    </td>
                    <td className={styles.cellMuted}>
                      {formatDuration(job.last_backup_duration) || "-"}
                    </td>
                    <td>
                      <div className={styles.jobActions}>
                        <button
                          type="button"
                          className={styles.jobActionBtn}
                          title={copy.openJob}
                          aria-label={copy.openJob}
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenJob(job);
                          }}
                        >
                          <Icon icon="mdi:open-in-new" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderHistory = () => (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{copy.sections.history}</h2>
        </div>
        <p className={styles.sectionHint}>{copy.history.hint}</p>
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
        {historyRows.length === 0 ? (
          <p className={styles.emptyInline}>{copy.history.empty}</p>
        ) : (
          <div className={styles.jobsTableWrap}>
            <table className={styles.jobsTable}>
              <thead>
                <tr>
                  <th>{copy.history.job}</th>
                  <th>{copy.history.when}</th>
                  <th>{copy.history.duration}</th>
                  <th>{copy.history.status}</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map(row => (
                  <tr
                    key={`hist-${row.id}-${row.when}`}
                    onClick={() => {
                      const job = jobs.find(j => String(j.id) === String(row.id));
                      if (job) handleOpenJob(job);
                    }}
                  >
                    <td className={styles.jobNameCell}>{row.jobName}</td>
                    <td className={styles.cellMuted}>{formatDateTime(row.when)}</td>
                    <td className={styles.cellMuted}>{row.duration || "-"}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[`status_${row.status}`] || ""}`}
                        title={getBackupJobStatusTitle(row.status)}
                      >
                        {getBackupJobStatusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedJob ? (
        <section className={styles.section} style={{ marginTop: "0.85rem" }}>
          <h2 className={styles.sectionTitle}>{copy.fields.destination}</h2>
          <div className={styles.statsCards}>
            <StatCard icon="mdi:harddisk" label={copy.fields.destination} value={selectedJob.destination} />
            <StatCard
              icon="mdi:server"
              label={copy.fields.server}
              value={formatServeurLieLabel(selectedJob.serveurLie, "-")}
            />
          </div>
        </section>
      ) : null}
    </>
  );

  const renderSection = () => {
    if (activeSection === "jobs") return renderJobs();
    if (activeSection === "history") return renderHistory();
    return renderOverview();
  };

  return (
    <SolutionDetailPageLayout
      eyebrow={copy.eyebrow}
      title={title}
      titleIcon={instance?.providerIcon || "mdi:backup-restore"}
      subtitle={subtitle}
      loading={loading && !instance}
      refreshing={syncing}
      loadingMessage={copy.loading}
      onRefresh={canSync ? handleSync : undefined}
      refreshLabel={copy.sync || "Synchroniser"}
      footerHint={footerHint}
      navEntries={navEntries}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      navAriaLabel={copy.navAria || "Sections"}
    >
      <div className={styles.contentStack}>{renderSection()}</div>
    </SolutionDetailPageLayout>
  );
}
