import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchCyberPageData } from "../../api/clients";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getBackupJobStatus, getBackupJobStatusLabel, getBackupJobStatusTitle, isBackupJobMapped } from "../CybersecuritePage/backupJobStatusUtils";
import EquipmentMappingModal from "./EquipmentMappingModal";
import { buildBackupFleetRow } from "./backupMspUtils";
import { getJobDetailCopy } from "./jobDetailPageI18n";
import styles from "./JobDetailPage.module.css";
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
function normalizeIncomingJob(data) {
  if (!data || typeof data !== "object") return null;
  if (data.type === "job" || data.nom || data.jobName) {
    return {
      id: data.id,
      clientId: data.clientId,
      clientName: data.clientName || data.client?.name || "",
      type: "job",
      instanceId: data.instanceId,
      instanceLogiciel: data.instanceLogiciel || data.providerName || "",
      nom: data.nom || data.jobName || data.name || "",
      typeBackup: data.typeBackup || data.jobType || "",
      regularite: data.regularite || "",
      horaire: data.horaire || "",
      retention: data.retention || "",
      destination: data.destination || "",
      serveurLie: data.serveurLie || data.server || "",
      stockageLie: data.stockageLie || "",
      replicationVers: data.replicationVers || "",
      isMapped: Boolean(data.isMapped),
      checkmkMapping: data.checkmkMapping || null,
      last_backup_date: data.last_backup_date ?? data.rawData?.last_backup_date ?? null,
      last_backup_start: data.last_backup_start ?? data.lastBackup ?? data.rawData?.last_backup_start ?? null,
      last_backup_duration: data.last_backup_duration ?? data.rawData?.last_backup_duration ?? null,
      rawData: data.rawData || data
    };
  }
  return null;
}
function findJobInCyberData(clients, {
  jobId,
  clientId,
  instanceId,
  nom
}) {
  const list = Array.isArray(clients) ? clients : [];
  for (const client of list) {
    if (clientId != null && String(client.id) !== String(clientId)) continue;
    const instances = client?.equipements?.Sauvegarde?.instances || [];
    for (const instance of instances) {
      if (instanceId != null && String(instance.id) !== String(instanceId)) continue;
      for (const job of instance.jobs || []) {
        const id = job.id || `job-${client.id}-${instance.id}-${job.nom}`;
        const nameMatch = nom && String(job.nom || "").toLowerCase() === String(nom).toLowerCase();
        if (jobId && String(id) === String(jobId) || !jobId && nameMatch) {
          const checkmkMapping = job.checkmk_host_name || job.checkmk_service_name ? {
            checkmk_host_name: job.checkmk_host_name || null,
            checkmk_site: job.checkmk_site || null,
            checkmk_service_name: job.checkmk_service_name || null,
            is_active: true
          } : null;
          return {
            id,
            clientId: client.id,
            clientName: client.name || client.nom || "",
            type: "job",
            instanceId: instance.id,
            instanceLogiciel: instance.logiciel || "",
            nom: job.nom || "",
            typeBackup: job.type || "",
            regularite: job.regularite || "",
            horaire: job.horaire || "",
            retention: job.retention || "",
            destination: job.destination || "",
            serveurLie: job.serveurLie || "",
            stockageLie: job.stockageLie || "",
            replicationVers: job.replicationVers || "",
            isMapped: !!checkmkMapping,
            checkmkMapping,
            last_backup_date: job.last_backup_date ?? null,
            last_backup_start: job.last_backup_start ?? null,
            last_backup_duration: job.last_backup_duration ?? null,
            rawData: job
          };
        }
      }
    }
  }
  return null;
}
function StatCard({
  icon,
  label,
  value
}) {
  return <div className={styles.statCard}>
      <span className={styles.statCardIcon}>
        <Icon icon={icon} />
      </span>
      <div className={styles.statCardContent}>
        <span className={styles.statCardValue}>{value || "-"}</span>
        <span className={styles.statCardLabel}>{label}</span>
      </div>
    </div>;
}
export default function JobDetailPage({
  jobData,
  onNavigate,
  onUpdate
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getJobDetailCopy(locale), [locale]);
  const {
    formatDateTime
  } = useAppFormatters();
  const [job, setJob] = useState(() => normalizeIncomingJob(jobData));
  const [loading, setLoading] = useState(!normalizeIncomingJob(jobData)?.nom);
  const [mappingOpen, setMappingOpen] = useState(false);
  const refreshFromApi = useCallback(async () => {
    const seed = normalizeIncomingJob(jobData);
    if (!seed?.id && !seed?.clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCyberPageData();
      const clients = Array.isArray(data?.clients) ? data.clients : Array.isArray(data) ? data : [];
      const found = findJobInCyberData(clients, {
        jobId: seed.id,
        clientId: seed.clientId,
        instanceId: seed.instanceId,
        nom: seed.nom
      });
      if (found) {
        setJob(found);
        onUpdate?.(found);
      } else if (seed?.nom) {
        setJob(seed);
      } else {
        setJob(null);
      }
    } catch {
      if (seed?.nom) setJob(seed);
    } finally {
      setLoading(false);
    }
  }, [jobData, onUpdate]);
  useEffect(() => {
    const normalized = normalizeIncomingJob(jobData);
    setJob(normalized);
    if (!normalized?.nom || !normalized?.instanceLogiciel) {
      refreshFromApi();
    } else {
      setLoading(false);
    }
  }, [jobData, refreshFromApi]);
  useEffect(() => {
    if (!window.updateTabTitle || !job) return;
    window.updateTabTitle("JobDetail", {
      id: job.id,
      clientId: job.clientId,
      clientName: job.clientName,
      name: job.nom,
      nom: job.nom
    });
  }, [job]);
  const fleetRow = useMemo(() => job ? buildBackupFleetRow(job) : null, [job]);
  const status = job ? getBackupJobStatus(job) : null;
  const mapped = job ? isBackupJobMapped(job) : false;
  const canMap = status !== "hycu";
  const handleBack = () => {
    onNavigate?.("Hardware");
  };
  const handleOpenClient = () => {
    if (!job?.clientId || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId: job.clientId,
      name: job.clientName
    });
  };
  const handleMappingSaved = mapping => {
    setJob(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        checkmkMapping: mapping || null,
        isMapped: !!(mapping && mapping.checkmk_host_name && mapping.is_active !== false)
      };
      onUpdate?.(next);
      return next;
    });
    setMappingOpen(false);
    try {
      sessionStorage.removeItem("cyber_backups_cache_v1");
      sessionStorage.removeItem("cyber_page_data_cache_v1");
    } catch {}
    window.dispatchEvent(new CustomEvent("veritas:backups-changed"));
  };
  if (loading) {
    return <div className={styles.detailPage}>
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className="spin" />
          <span>{copy.loading}</span>
        </div>
      </div>;
  }
  if (!job) {
    return <div className={styles.detailPage}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:backup-restore" className={styles.emptyIcon} aria-hidden />
          <h2>{copy.empty.title}</h2>
          <p>{copy.empty.text}</p>
          <button type="button" className={styles.backButton} onClick={handleBack} aria-label={copy.back}>
            <Icon icon="mdi:arrow-left" />
          </button>
        </div>
      </div>;
  }
  const mapping = job.checkmkMapping || {};
  const lastBackup = job.last_backup_start ?? job.rawData?.last_backup_start;
  const duration = formatDuration(job.last_backup_duration ?? job.rawData?.last_backup_duration);
  return <div className={styles.detailPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={handleBack} aria-label={copy.back}>
            <Icon icon="mdi:arrow-left" />
          </button>
          <div className={styles.headerTitle}>
            {fleetRow?.providerImage ? <img src={fleetRow.providerImage} alt="" className={styles.headerLogo} /> : <Icon icon={fleetRow?.providerIcon || "mdi:backup-restore"} className={styles.headerLogoIcon} aria-hidden />}
            <div className={styles.headerTitleBlock}>
              <h1>{job.nom || "-"}</h1>
              <div className={styles.headerMeta}>
                {job.clientName ? <span className={styles.headerMetaItem}>{job.clientName}</span> : null}
                {fleetRow?.providerName ? <span className={styles.headerMetaItem}>{fleetRow.providerName}</span> : null}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {job.clientId ? <button type="button" className={styles.headerActionButton} onClick={handleOpenClient} aria-label={copy.openClient} title={copy.openClient}>
              <Icon icon="mdi:office-building-outline" />
            </button> : null}
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{copy.sections.overview}</h2>
          <div className={styles.statsCards}>
            <StatCard icon="mdi:circle-slice-8" label={copy.fields.status} value={<span className={`${styles.statusBadge} ${styles[`status_${status}`] || ""}`} title={getBackupJobStatusTitle(status)}>
                  {getBackupJobStatusLabel(status)}
                </span>} />
            <StatCard icon="mdi:backup-restore" label={copy.fields.solution} value={fleetRow?.providerName} />
            <StatCard icon="mdi:file-tree-outline" label={copy.fields.jobType} value={job.typeBackup} />
            <StatCard icon="mdi:server" label={copy.fields.server} value={job.serveurLie} />
            <StatCard icon="mdi:clock-outline" label={copy.fields.lastBackup} value={lastBackup ? formatDateTime(lastBackup) : "-"} />
            <StatCard icon="mdi:timer-outline" label={copy.fields.lastDuration} value={duration} />
            <StatCard icon="mdi:harddisk" label={copy.fields.destination} value={job.destination} />
            <StatCard icon="mdi:database-outline" label={copy.fields.storage} value={job.stockageLie} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{copy.sections.schedule}</h2>
          <div className={styles.statsCards}>
            <StatCard icon="mdi:calendar-sync" label={copy.fields.regularity} value={job.regularite} />
            <StatCard icon="mdi:clock-time-four-outline" label={copy.fields.schedule} value={job.horaire} />
            <StatCard icon="mdi:archive-clock-outline" label={copy.fields.retention} value={job.retention} />
            <StatCard icon="mdi:swap-horizontal" label={copy.fields.replication} value={job.replicationVers} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{copy.sections.mapping}</h2>
          <div className={styles.mappingBanner}>
            <div className={styles.mappingCopy}>
              <p className={styles.mappingTitle}>
                {status === "hycu" ? copy.mapping.hycuHint : mapped ? copy.mapping.mapped : copy.mapping.unmapped}
              </p>
              {status !== "hycu" && !mapped ? <p className={styles.mappingHint}>{copy.mapping.unmappedHint}</p> : null}
            </div>
            {canMap ? <button type="button" className={`${styles.mapButton} ${mapped ? styles.mapButtonSecondary : ""}`} onClick={() => setMappingOpen(true)}>
                <Icon icon={mapped ? "mdi:link-variant" : "mdi:link-variant-plus"} />
                {mapped ? copy.mapping.editAction : copy.mapping.mapAction}
              </button> : null}
          </div>

          {mapped ? <div className={styles.mappingGrid}>
              <StatCard icon="mdi:server-network" label={copy.fields.host} value={mapping.checkmk_host_name} />
              <StatCard icon="mdi:earth" label={copy.fields.site} value={mapping.checkmk_site} />
              <StatCard icon="mdi:playlist-check" label={copy.fields.service} value={mapping.checkmk_service_name} />
            </div> : canMap ? <p className={styles.mappingHint}>{copy.mapping.none}</p> : null}
        </section>
      </div>

      {mappingOpen ? <EquipmentMappingModal isOpen={mappingOpen} onClose={() => setMappingOpen(false)} equipment={{
      id: job.id,
      name: job.nom,
      nom: job.nom,
      type: "Backup",
      clientId: job.clientId,
      clientName: job.clientName,
      checkmkMapping: job.checkmkMapping || null
    }} requireService={true} onMappingSaved={handleMappingSaved} /> : null}
    </div>;
}
