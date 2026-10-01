import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import SmartTooltip from "../SmartTooltip";
import { isBackupJobMapped } from "./backupJobStatusUtils";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./AntivirusMspDashboard.module.css";
import { buildBackupFleetFromClients, buildBackupFleetStats, buildBackupInstanceFleetFromClients, buildBackupInstanceFleetStats, filterBackupFleetRows, sortBackupFleetRows } from "../EquipementPage/backupMspUtils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || "").trim());
}

function resolveJobSyncTarget(row) {
  const raw = row?.raw || row || {};
  const hycuUuid = row?.hycu_job_uuid || raw.hycu_job_uuid || raw.hycuMapping?.hycu_job_uuid || row?.hycuMapping?.hycu_job_uuid;
  if (hycuUuid && row?.clientId != null && isUuid(row.id)) {
    return {
      type: "hycu",
      clientId: row.clientId,
      jobIds: [row.id]
    };
  }
  const mapping = row?.checkmkMapping || raw.checkmkMapping || null;
  const host = mapping?.checkmk_host_name || raw.checkmk_host_name || null;
  const service = mapping?.checkmk_service_name || raw.checkmk_service_name || null;
  const site = mapping?.checkmk_site || raw.checkmk_site || null;
  if ((host || service) && row?.clientId != null) {
    const payload = {
      type: "checkmk",
      clientId: row.clientId,
      hostName: host || undefined,
      site: site || undefined
    };
    if (isUuid(row.id)) payload.jobIds = [row.id];
    return payload;
  }
  return null;
}

async function syncCheckmkSaveJobs(payload = {}) {
  const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/sync`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sync failed");
  return data;
}

async function syncHycuSaveJobs(payload = {}) {
  const res = await fetch(`${API_BASE_URL}/hycu/save-jobs/sync`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "HYCU sync failed");
  return data;
}

async function fetchCheckmkLastSync() {
  const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/last-sync`, {
    credentials: "include"
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.lastSync || null;
}

function SortableHeader({
  column,
  label,
  sortBy,
  sortDirection,
  onSort
}) {
  const isActive = sortBy === column;
  return <th aria-sort={isActive ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
      <button type="button" className={styles.thBtn} onClick={() => onSort(column)}>
        {label}
        {isActive ? sortDirection === "asc" ? " ▲" : " ▼" : ""}
      </button>
    </th>;
}

function SolutionCell({
  label,
  subtitle,
  image,
  icon
}) {
  return <div className={styles.solutionCell}>
      {image ? <img src={image} alt="" className={styles.solutionLogo} /> : icon ? <Icon icon={icon} className={styles.solutionLogoIcon} aria-hidden /> : null}
      <div className={styles.solutionText}>
        <span className={styles.cellName} title={label}>{label}</span>
        {subtitle ? <span className={styles.cellSub} title={subtitle}>{subtitle}</span> : null}
      </div>
    </div>;
}

function StatusChip({
  status,
  getStatusMeta
}) {
  const meta = getStatusMeta?.(status) || {
    label: status || "-",
    tone: "neutral"
  };
  return <span className={`${styles.chip} ${styles[`chip_${meta.tone}`]}`}>{meta.label}</span>;
}

function JobTableRow({
  row,
  onOpenClient,
  getStatusMeta,
  formatDateTime,
  syncTarget,
  syncing,
  onSyncJob,
  syncLabels
}) {
  const statusMeta = getStatusMeta?.(row.status) || {};
  const dotColor = statusMeta.tone === "bad" ? "#dc2626" : statusMeta.tone === "warn" ? "#d97706" : statusMeta.tone === "good" ? "#16a34a" : "#2b5fab";
  const canSync = Boolean(syncTarget);
  return <tr>
      <td>
        <span className={styles.statusDot} style={{
        background: dotColor
      }} aria-hidden />
      </td>
      <td>
        {onOpenClient ? <button type="button" className={styles.clientLink} onClick={() => onOpenClient(row)}>
            {row.clientName}
          </button> : <span className={styles.cellName}>{row.clientName}</span>}
      </td>
      <td>
        <span className={styles.cellName} title={row.jobName}>{row.jobName}</span>
      </td>
      <td className={styles.cellMuted}>{row.instanceName || "-"}</td>
      <td>
        <StatusChip status={row.status} getStatusMeta={getStatusMeta} />
      </td>
      <td>
        <SolutionCell label={row.providerName} subtitle={row.jobType || null} image={row.providerImage} icon={row.providerIcon || "mdi:backup-restore"} />
      </td>
      <td className={styles.cellMuted}>{row.server || "-"}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastBackup)}</td>
      <td>
        <button
          type="button"
          className={styles.rowSyncBtn}
          onClick={() => onSyncJob?.(row)}
          disabled={!canSync || syncing}
          title={canSync ? syncLabels.syncJob : syncLabels.syncUnavailable}
          aria-label={canSync ? syncLabels.syncJobAria : syncLabels.syncUnavailable}
        >
          <Icon icon={syncing ? "mdi:loading" : "mdi:sync"} className={syncing ? styles.spin : undefined} aria-hidden />
        </button>
      </td>
    </tr>;
}

function InstanceTableRow({
  row,
  onOpen,
  onOpenClient
}) {
  const openRow = () => onOpen?.(row);
  return <tr className={styles.tableRow} onClick={openRow} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow();
    }
  }} role="button" tabIndex={0}>
      <td>
        {onOpenClient ? <button type="button" className={styles.clientLink} onClick={e => {
        e.stopPropagation();
        onOpenClient(row);
      }}>
            {row.clientName}
          </button> : <span className={styles.cellName}>{row.clientName}</span>}
      </td>
      <td>
        <span className={styles.cellName} title={row.instanceName}>{row.instanceName || "-"}</span>
      </td>
      <td>
        <SolutionCell label={row.providerName || row.logiciel || "-"} subtitle={row.version || null} image={row.providerImage} icon={row.providerIcon || "mdi:backup-restore"} />
      </td>
      <td className={styles.cellMuted}>{row.server || "-"}</td>
      <td className={styles.cellMuted}>{row.version || "-"}</td>
      <td className={styles.cellName}>{row.jobsCount ?? 0}</td>
    </tr>;
}

export default function BackupMspDashboard({
  copy,
  clients = [],
  loading = false,
  onOpenClient,
  onRefresh,
  onSync,
  syncing = false
}) {
  const {
    formatDateTime
  } = useAppFormatters();
  const msp = copy?.msp;
  const backup = msp?.backup;
  const [view, setView] = useState("jobs");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [instanceFilter, setInstanceFilter] = useState(null);
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jobsLastSyncDate, setJobsLastSyncDate] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingJobId, setSyncingJobId] = useState(null);
  const prevSyncingRef = useRef(false);
  const fleetSyncing = Boolean(onSync ? syncing : syncingAll);
  const isJobsView = view === "jobs";
  const jobRows = useMemo(() => buildBackupFleetFromClients(clients), [clients]);
  const instanceRows = useMemo(() => buildBackupInstanceFleetFromClients(clients), [clients]);
  const jobStats = useMemo(() => buildBackupFleetStats(jobRows), [jobRows]);
  const instanceStats = useMemo(() => buildBackupInstanceFleetStats(instanceRows), [instanceRows]);
  const filteredJobRows = useMemo(() => filterBackupFleetRows(jobRows, {
    search,
    statusFilter,
    instanceId: instanceFilter?.id ?? null,
    clientId: instanceFilter?.clientId ?? null
  }), [jobRows, search, statusFilter, instanceFilter]);
  const filteredInstanceRows = useMemo(() => filterBackupFleetRows(instanceRows, {
    search,
    statusFilter: "all"
  }), [instanceRows, search]);
  const sortedJobRows = useMemo(() => sortBackupFleetRows(filteredJobRows, sortBy, sortDirection), [filteredJobRows, sortBy, sortDirection]);
  const sortedInstanceRows = useMemo(() => sortBackupFleetRows(filteredInstanceRows, sortBy, sortDirection), [filteredInstanceRows, sortBy, sortDirection]);
  const activeRows = isJobsView ? sortedJobRows : sortedInstanceRows;
  const sourceRows = isJobsView ? jobRows : instanceRows;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeRows.slice(start, start + pageSize);
  }, [activeRows, currentPage, pageSize]);
  const mappedJobsCount = useMemo(
    () => jobRows.filter(row => row.isMapped || isBackupJobMapped(row.raw || row)).length,
    [jobRows]
  );

  useEffect(() => {
    let cancelled = false;
    fetchCheckmkLastSync()
      .then(lastSync => {
        if (!cancelled && lastSync) setJobsLastSyncDate(lastSync);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prevSyncingRef.current && !fleetSyncing) {
      fetchCheckmkLastSync()
        .then(lastSync => {
          if (lastSync) setJobsLastSyncDate(lastSync);
        })
        .catch(() => {});
    }
    prevSyncingRef.current = fleetSyncing;
  }, [fleetSyncing]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy, sortDirection, pageSize, view, instanceFilter]);
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection(column === "jobsCount" || column === "lastBackup" ? "desc" : "asc");
  };
  const toggleStatus = next => {
    setStatusFilter(statusFilter === next ? "all" : next);
  };
  const setViewMode = next => {
    if (next === view) return;
    setView(next);
    setStatusFilter("all");
    setSortBy("clientName");
    setSortDirection("asc");
    if (next === "instances") setInstanceFilter(null);
  };
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  const openInstanceJobs = row => {
    setInstanceFilter({
      id: row.id,
      clientId: row.clientId,
      name: row.instanceName || row.providerName || ""
    });
    setView("jobs");
    setStatusFilter("all");
    setSortBy("clientName");
    setSortDirection("asc");
  };

  const refreshClients = useCallback(async () => {
    if (typeof onRefresh === "function") {
      await onRefresh();
    }
  }, [onRefresh]);

  const handleSyncAll = useCallback(async () => {
    if (onSync) {
      onSync();
      return;
    }
    if (syncingAll) return;
    setSyncingAll(true);
    try {
      const data = await syncCheckmkSaveJobs({});
      if (data.lastSync) setJobsLastSyncDate(data.lastSync);
      toast.success(
        data.message && data.updated != null
          ? `${data.message} (${data.updated})`
          : backup?.syncDone || "OK"
      );
      await refreshClients();
    } catch (err) {
      toast.error(err?.message || backup?.syncError || "Error");
    } finally {
      setSyncingAll(false);
    }
  }, [onSync, syncingAll, backup, refreshClients]);

  const handleSyncJob = useCallback(async row => {
    const target = resolveJobSyncTarget(row);
    if (!target || syncingJobId || fleetSyncing) return;
    setSyncingJobId(row.id);
    try {
      let data;
      if (target.type === "hycu") {
        data = await syncHycuSaveJobs({
          clientId: target.clientId,
          jobIds: target.jobIds
        });
      } else {
        data = await syncCheckmkSaveJobs({
          clientId: target.clientId,
          hostName: target.hostName,
          site: target.site,
          jobIds: target.jobIds
        });
      }
      if (data?.lastSync) setJobsLastSyncDate(data.lastSync);
      toast.success(
        data?.message && data?.updated != null
          ? `${data.message} (${data.updated})`
          : backup?.syncDone || "OK"
      );
      await refreshClients();
    } catch (err) {
      toast.error(err?.message || backup?.syncError || "Error");
    } finally {
      setSyncingJobId(null);
    }
  }, [syncingJobId, fleetSyncing, backup, refreshClients]);

  if (!msp || !backup) return null;
  const getStatusMeta = copy.getBackupStatusMeta;
  const emptyTitle = sourceRows.length === 0 ? isJobsView ? backup.emptyTitle : backup.emptyInstancesTitle : backup.noResultsTitle;
  const emptyText = sourceRows.length === 0 ? isJobsView ? backup.emptyText : backup.emptyInstancesText : backup.noResultsText;
  const lastSyncLabel = jobsLastSyncDate
    ? String(backup.lastSyncLabel || "Dernière sync : {date}").replace("{date}", formatDisplayDateTime(jobsLastSyncDate))
    : backup.lastSyncNever || "Dernière sync : jamais";
  const syncLabels = {
    syncJob: backup.syncJob || "Synchroniser ce job",
    syncJobAria: backup.syncJobAria || backup.syncJob || "Synchroniser ce job",
    syncUnavailable: backup.syncUnavailable || "Job non mappé"
  };
  const syncAllDisabled = fleetSyncing || mappedJobsCount === 0;

  return <div className={styles.dashboard}>
      <div className={`${layout.toolbar} ${layout.toolbarWithFilters}`}>
        <div className={styles.viewSwitch} role="radiogroup" aria-label={backup.viewAria}>
          <button type="button" role="radio" aria-checked={!isJobsView} className={`${styles.viewSwitchBtn} ${!isJobsView ? styles.viewSwitchBtnActive : ""}`} onClick={() => setViewMode("instances")}>
            <Icon icon="mdi:server-outline" width={16} aria-hidden />
            {backup.viewInstance}
          </button>
          <button type="button" role="radio" aria-checked={isJobsView} className={`${styles.viewSwitchBtn} ${isJobsView ? styles.viewSwitchBtnActive : ""}`} onClick={() => setViewMode("jobs")}>
            <Icon icon="mdi:briefcase-outline" width={16} aria-hidden />
            {backup.viewJob}
          </button>
        </div>
        <div className={layout.searchWrap}>
          <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
          <input type="search" inputMode="search" enterKeyHint="search" placeholder={isJobsView ? backup.searchPlaceholder : backup.searchInstancesPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className={layout.searchInput} aria-label={isJobsView ? backup.searchPlaceholder : backup.searchInstancesPlaceholder} />
          {search ? <SmartTooltip content={msp.clearSearch || "Effacer"}>
              <button type="button" onClick={() => setSearch("")} className={layout.clearButton} aria-label={msp.clearSearch || "Effacer"}>
                <FaTimes />
              </button>
            </SmartTooltip> : null}
        </div>
        <div className={layout.statusChips} role="group">
          {instanceFilter ? <button type="button" className={`${layout.statusChip} ${layout.statusChipActive}`} onClick={() => setInstanceFilter(null)} title={backup.clearInstanceFilter}>
              <span className={`${layout.statusChipIcon} ${layout.kpiIcon_blue}`}>
                <Icon icon="mdi:server-outline" />
              </span>
              <span className={layout.statusChipLabel}>{instanceFilter.name}</span>
              <span className={layout.statusChipCount}>×</span>
            </button> : null}
          {isJobsView ? (copy.backupStatusFilters || []).map(item => {
            const count = item.id === "ok" ? jobStats.statusCounts.ok || 0 : jobStats.issues || 0;
            const active = statusFilter === item.id;
            return <button key={item.id} type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`} onClick={() => toggleStatus(item.id)} disabled={loading || count === 0}>
                <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                  <Icon icon={item.icon} />
                </span>
                <span className={layout.statusChipLabel}>{item.label}</span>
                <span className={layout.statusChipCount}>{count}</span>
              </button>;
          }) : null}
        </div>
        <span className={styles.toolbarMeta} title={lastSyncLabel}>
          {lastSyncLabel}
        </span>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.iconBtn}
            title={backup.syncJobs}
            aria-label={backup.syncJobsAria || backup.syncJobs}
            onClick={handleSyncAll}
            disabled={syncAllDisabled}
          >
            <Icon icon={fleetSyncing ? "mdi:loading" : "mdi:sync"} className={fleetSyncing ? styles.spin : undefined} aria-hidden />
          </button>
        </div>
      </div>

      {loading ? (
        <PageSkeleton variant="list" rows={8} label={isJobsView ? backup.loading : backup.loadingInstances} />
      ) : activeRows.length === 0 ? <MspEmptyState icon={sourceRows.length === 0 ? "mdi:backup-restore" : "mdi:magnify"} title={emptyTitle} text={emptyText} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                {isJobsView ? <tr>
                    <th aria-label={msp.table.status} />
                    <SortableHeader column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="jobName" label={msp.table.job} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="instanceName" label={msp.table.instance} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="status" label={msp.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="providerName" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="server" label={msp.table.server} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="lastBackup" label={msp.table.lastBackup} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <th aria-label={backup.syncJob || "Sync"} />
                  </tr> : <tr>
                    <SortableHeader column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="instanceName" label={msp.table.instance} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="providerName" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="server" label={msp.table.server} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="version" label={msp.table.version} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="jobsCount" label={msp.table.jobsCount} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  </tr>}
              </thead>
              <tbody>
                {isJobsView ? paginatedRows.map(row => <JobTableRow
                  key={row.id}
                  row={row}
                  onOpenClient={onOpenClient}
                  getStatusMeta={getStatusMeta}
                  formatDateTime={formatDisplayDateTime}
                  syncTarget={resolveJobSyncTarget(row)}
                  syncing={syncingJobId === row.id || fleetSyncing}
                  onSyncJob={handleSyncJob}
                  syncLabels={syncLabels}
                />) : paginatedRows.map(row => <InstanceTableRow key={`${row.clientId}-${row.id}`} row={row} onOpen={openInstanceJobs} onOpenClient={onOpenClient} />)}
              </tbody>
            </table>
            </div>
            {activeRows.length > 0 ? <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <span className={styles.paginationLabel}>{msp.rowsPerPage}</span>
                <select className={styles.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className={styles.paginationRight}>
                <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label={msp.prevPage}>
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>
                  {copy.formatMspPageInfo(currentPage, totalPages)}
                </span>
                <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label={msp.nextPage}>
                  <FaChevronRight />
                </button>
              </div>
            </div> : null}
          </div>
        </section>}
    </div>;
}
