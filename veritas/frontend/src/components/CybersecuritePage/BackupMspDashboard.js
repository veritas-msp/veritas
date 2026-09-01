import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "./AntivirusMspDashboard.module.css";
import { buildBackupFleetFromClients, buildBackupFleetStats, buildBackupInstanceFleetFromClients, buildBackupInstanceFleetStats, filterBackupFleetRows, sortBackupFleetRows } from "../EquipementPage/backupMspUtils";

function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
  active,
  onClick
}) {
  return <button type="button" className={`${styles.kpiCard} ${active ? styles.kpiCardActive : ""}`} onClick={onClick}>
      <span className={`${styles.kpiIcon} ${styles[`kpiIcon_${tone}`]}`}>
        <Icon icon={icon} />
      </span>
      <span className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </span>
    </button>;
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
  formatDateTime
}) {
  const statusMeta = getStatusMeta?.(row.status) || {};
  const dotColor = statusMeta.tone === "bad" ? "#dc2626" : statusMeta.tone === "warn" ? "#d97706" : statusMeta.tone === "good" ? "#16a34a" : "#2b5fab";
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
  onOpenClient
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
  const [pageSize, setPageSize] = useState(10);
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
  if (!msp || !backup) return null;
  const getStatusMeta = copy.getBackupStatusMeta;
  const emptyTitle = sourceRows.length === 0 ? isJobsView ? backup.emptyTitle : backup.emptyInstancesTitle : backup.noResultsTitle;
  const emptyText = sourceRows.length === 0 ? isJobsView ? backup.emptyText : backup.emptyInstancesText : backup.noResultsText;
  return <div className={styles.dashboard}>
      <div className={styles.kpiStrip}>
        {isJobsView ? <>
            <KpiCard icon="mdi:backup-restore" label={backup.kpi.jobs} value={jobStats.total} tone="neutral" active={statusFilter === "all" && !search && !instanceFilter} onClick={() => {
          setStatusFilter("all");
          setSearch("");
          setInstanceFilter(null);
        }} />
            <KpiCard icon="mdi:office-building-outline" label={msp.kpi.enterprises} value={jobStats.clients} tone="neutral" />
            <KpiCard icon="mdi:check-circle-outline" label={backup.kpi.ok} value={jobStats.statusCounts.ok} tone="good" active={statusFilter === "ok"} onClick={() => toggleStatus("ok")} />
            <KpiCard icon="mdi:alert-circle-outline" label={backup.kpi.toReview} value={jobStats.issues} tone={jobStats.issues > 0 ? "warn" : "good"} active={statusFilter === "issues"} onClick={() => toggleStatus("issues")} />
          </> : <>
            <KpiCard icon="mdi:server-outline" label={backup.kpi.instances} value={instanceStats.total} tone="neutral" active={!search} onClick={() => setSearch("")} />
            <KpiCard icon="mdi:office-building-outline" label={msp.kpi.enterprises} value={instanceStats.clients} tone="neutral" />
            <KpiCard icon="mdi:backup-restore" label={backup.kpi.jobs} value={instanceStats.jobs} tone="neutral" />
          </>}
      </div>

      <div className={styles.toolbar}>
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
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={isJobsView ? backup.searchPlaceholder : backup.searchInstancesPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {instanceFilter ? <button type="button" className={`${styles.filterChip} ${styles.filterChipActive}`} onClick={() => setInstanceFilter(null)} title={backup.clearInstanceFilter}>
            {instanceFilter.name} ×
          </button> : null}
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{isJobsView ? backup.loading : backup.loadingInstances}</span>
        </div> : activeRows.length === 0 ? <MspEmptyState icon={sourceRows.length === 0 ? "mdi:backup-restore" : "mdi:magnify"} title={emptyTitle} text={emptyText} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
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
                {isJobsView ? paginatedRows.map(row => <JobTableRow key={row.id} row={row} onOpenClient={onOpenClient} getStatusMeta={getStatusMeta} formatDateTime={formatDisplayDateTime} />) : paginatedRows.map(row => <InstanceTableRow key={`${row.clientId}-${row.id}`} row={row} onOpen={openInstanceJobs} onOpenClient={onOpenClient} />)}
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
        </section>}
    </div>;
}
