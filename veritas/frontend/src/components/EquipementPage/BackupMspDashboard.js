import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaSync } from "react-icons/fa";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { buildBackupFleetFromJobs, buildBackupFleetStats, filterBackupFleetRows, groupBackupFleetByProvider, sortBackupFleetRows } from "./backupMspUtils";
function formatDateTime(value, bcp47 = "en-US") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(bcp47, {
    dateStyle: "short",
    timeStyle: "short"
  });
}
function getHealthTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}
function HealthGauge({
  score,
  label
}) {
  const value = score ?? 0;
  const tone = getHealthTone(score);
  return <div className={`${styles.healthGauge} ${styles[`healthGauge_${tone}`]}`}>
      <svg className={styles.healthRing} viewBox="0 0 120 120" aria-hidden>
        <circle className={styles.healthRingTrack} cx="60" cy="60" r="52" />
        <circle className={styles.healthRingFill} cx="60" cy="60" r="52" style={{
        strokeDasharray: `${value / 100 * 327} 327`
      }} />
      </svg>
      <div className={styles.healthCore}>
        <span className={styles.healthValue}>{score ?? "-"}</span>
        <span className={styles.healthLabel}>{label}</span>
      </div>
    </div>;
}
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
function StatusChip({
  status,
  copy
}) {
  const meta = copy.getStatusMeta(status);
  return <span className={`${styles.chip} ${styles[`chip_${meta.tone}`]}`}>{meta.label}</span>;
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
        <span className={styles.cellName} title={label}>
          {label}
        </span>
        {subtitle ? <span className={styles.cellSub} title={subtitle}>
            {subtitle}
          </span> : null}
      </div>
    </div>;
}
function SortableHeader({
  column,
  label,
  sortBy,
  sortDirection,
  onSort
}) {
  const isActive = sortBy === column;
  return <th className={styles.sortableTh} onClick={() => onSort(column)} aria-sort={isActive ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
      {label}
      {isActive ? sortDirection === "asc" ? " ▲" : " ▼" : ""}
    </th>;
}
function FleetTableRow({
  row,
  onOpen,
  onOpenClient,
  onMiddleClick,
  copy,
  bcp47
}) {
  const statusMeta = copy.getStatusMeta(row.status);
  const dotColor = statusMeta.tone === "bad" ? "#dc2626" : statusMeta.tone === "warn" ? "#d97706" : "#2b5fab";
  return <tr className={styles.tableRow} onClick={() => onOpen?.(row)} onMouseDown={e => {
    if (e.button === 1) onMiddleClick?.(e, row);
  }}>
      <td>
        <span className={styles.statusDot} style={{
        background: dotColor
      }} aria-hidden />
      </td>
      <td>
        {onOpenClient ? <button type="button" className={styles.clientLink} onClick={e => {
        e.stopPropagation();
        onOpenClient(row);
      }}>
            {row.clientName}
          </button> : <span className={styles.cellName}>{row.clientName}</span>}
      </td>
      <td>
        <span className={styles.cellName} title={row.jobName}>
          {row.jobName}
        </span>
      </td>
      <td>
        <StatusChip status={row.status} copy={copy} />
      </td>
      <td>
        <SolutionCell label={row.providerName} subtitle={row.jobType || null} image={row.providerImage} icon={row.providerIcon || "mdi:backup-restore"} />
      </td>
      <td className={styles.cellMuted}>{row.server || "-"}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastBackup, bcp47)}</td>
    </tr>;
}
export default function BackupMspDashboard({
  jobs = [],
  loading = false,
  syncing = false,
  onSync,
  onOpenJob,
  onOpenClient,
  copy,
  bcp47 = "en-US"
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [collapsedProviders, setCollapsedProviders] = useState({});
  const [sortBy, setSortBy] = useState("jobName");
  const [sortDirection, setSortDirection] = useState("asc");
  const fleetRows = useMemo(() => buildBackupFleetFromJobs(jobs), [jobs]);
  const stats = useMemo(() => buildBackupFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterBackupFleetRows(fleetRows, {
    search,
    statusFilter,
    providerFilter
  }), [fleetRows, search, statusFilter, providerFilter]);
  const sortedRows = useMemo(() => sortBackupFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const providerGroups = useMemo(() => groupBackupFleetByProvider(sortedRows), [sortedRows]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const providerTabs = useMemo(() => {
    const counts = new Map();
    fleetRows.forEach(row => {
      counts.set(row.providerId, (counts.get(row.providerId) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([id, count]) => {
      const sample = fleetRows.find(row => row.providerId === id);
      return {
        id,
        label: sample?.providerName || id,
        count
      };
    }).sort((a, b) => a.label.localeCompare(b.label, copy.locale || "fr"));
  }, [fleetRows, copy.locale]);
  const priorityRows = useMemo(() => fleetRows.filter(row => row.status === "critical" || row.status === "warning").sort((a, b) => {
    if (a.status !== b.status) return a.status === "critical" ? -1 : 1;
    if (!a.lastBackup) return 1;
    if (!b.lastBackup) return -1;
    return new Date(a.lastBackup) - new Date(b.lastBackup);
  }).slice(0, 8), [fleetRows]);
  const toggleProvider = providerId => {
    setCollapsedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };
  const handleOpenJob = row => {
    onOpenJob?.(row.raw || row);
  };
  const colCount = 7;
  const syncDisabled = fleetRows.length === 0 || syncing;
  return <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <HealthGauge score={stats.healthScore} label={copy.healthLabel} />
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{copy.eyebrow}</span>
            <h2 className={styles.heroTitle}>{copy.heroTitle}</h2>
            <p className={styles.heroDesc}>{copy.formatHeroDesc(stats.issues)}</p>
          </div>
        </div>
        <div className={styles.kpiRow}>
          <KpiCard icon="mdi:backup-restore" label={copy.kpi.jobs} value={stats.total} tone="neutral" active={statusFilter === "all" && providerFilter === "all" && !search} onClick={() => {
          setStatusFilter("all");
          setProviderFilter("all");
          setSearch("");
        }} />
          <KpiCard icon="mdi:office-building-outline" label={copy.kpi.clients} value={stats.clients} tone="neutral" />
          <KpiCard icon="mdi:check-circle-outline" label={copy.kpi.ok} value={stats.statusCounts.ok} tone="good" active={statusFilter === "ok"} onClick={() => setStatusFilter(statusFilter === "ok" ? "all" : "ok")} />
          <KpiCard icon="mdi:alert-circle-outline" label={copy.kpi.toReview} value={stats.issues} tone={stats.issues > 0 ? "warn" : "good"} active={statusFilter === "issues"} onClick={() => setStatusFilter(statusFilter === "issues" ? "all" : "issues")} />
        </div>
      </section>

      {priorityRows.length > 0 ? <section className={styles.priorityPanel}>
          <header className={styles.priorityHeader}>
            <h3 className={styles.priorityTitle}>{copy.priorityTitle}</h3>
            <span className={styles.toolbarMeta}>
              <strong>{copy.formatAlertCount(priorityRows.length)}</strong>
            </span>
          </header>
          <div className={styles.priorityList}>
            {priorityRows.map(row => {
          const tone = row.status === "critical" ? "#dc2626" : "#d97706";
          return <button key={row.id} type="button" className={styles.priorityItem} onClick={() => handleOpenJob(row)}>
                  <span className={styles.priorityDot} style={{
              background: tone
            }} />
                  <span className={styles.priorityBody}>
                    <span className={styles.priorityName}>{row.jobName}</span>
                    <span className={styles.priorityMeta}>
                      {row.clientName}
                      {row.providerName ? ` · ${row.providerName}` : ""}
                      {row.lastBackup ? ` · ${formatDateTime(row.lastBackup, bcp47)}` : ""}
                    </span>
                  </span>
                  <span className={styles.priorityVerb}>
                    {row.status === "critical" ? copy.priorityVerbFix : copy.priorityVerbReview}
                  </span>
                </button>;
        })}
          </div>
        </section> : null}

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>

        <div className={styles.filterGroup} role="tablist" aria-label={copy.statusFilterAria}>
          {copy.statusFilters.map(filter => <button key={filter.id} type="button" className={`${styles.filterChip} ${statusFilter === filter.id ? styles.filterChipActive : ""}`} onClick={() => setStatusFilter(filter.id)}>
              {filter.label}
            </button>)}
        </div>

        {providerTabs.length > 1 ? <div className={styles.filterGroup} role="tablist" aria-label={copy.providerFilterAria}>
            <button type="button" className={`${styles.filterChip} ${providerFilter === "all" ? styles.filterChipActive : ""}`} onClick={() => setProviderFilter("all")}>
              {copy.allProviders}
            </button>
            {providerTabs.map(tab => <button key={tab.id} type="button" className={`${styles.filterChip} ${providerFilter === tab.id ? styles.filterChipActive : ""}`} onClick={() => setProviderFilter(providerFilter === tab.id ? "all" : tab.id)}>
                {tab.label} {tab.count}
              </button>)}
          </div> : null}

        <span className={styles.toolbarMeta}>
          <strong>{copy.formatCount("jobCount", filteredRows.length)}</strong>
          {stats.providers > 0 ? <>
              {" "}
              · <strong>{copy.formatCount("providerCount", stats.providers)}</strong>
            </> : null}
        </span>

        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconBtn} title={copy.syncJobs} aria-label={copy.syncJobs} onClick={() => onSync?.()} disabled={syncDisabled}>
            <FaSync className={syncing ? styles.spin : undefined} />
          </button>
        </div>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{copy.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon={fleetRows.length === 0 ? "mdi:backup-restore" : "mdi:magnify"} title={fleetRows.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={fleetRows.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label={copy.table.stateAria} />
                  <SortableHeader column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="jobName" label={copy.table.job} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="providerName" label={copy.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="server" label={copy.table.server} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastBackup" label={copy.table.lastBackup} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {providerGroups.map(group => {
              const collapsed = Boolean(collapsedProviders[group.providerId]);
              const showSegment = providerFilter === "all" && providerGroups.length > 1;
              return <React.Fragment key={group.providerId}>
                      {showSegment ? <tr className={styles.segmentRow}>
                          <td colSpan={colCount}>
                            <button type="button" className={styles.segmentBtn} onClick={() => toggleProvider(group.providerId)} aria-expanded={!collapsed}>
                              {group.providerImage ? <img src={group.providerImage} alt="" className={styles.providerLogo} /> : <Icon icon={group.providerIcon || "mdi:backup-restore"} width={16} />}
                              <span className={styles.segmentLabel}>{group.providerName}</span>
                              <span className={styles.segmentCount}>{group.list.length}</span>
                              <Icon icon={collapsed ? "mdi:chevron-right" : "mdi:chevron-down"} aria-hidden />
                            </button>
                          </td>
                        </tr> : null}
                      {!collapsed ? group.list.map(row => <FleetTableRow key={row.id} row={row} onOpen={handleOpenJob} onOpenClient={onOpenClient} onMiddleClick={(e, item) => {
                  e.preventDefault();
                  handleOpenJob(item);
                }} copy={copy} bcp47={bcp47} />) : null}
                    </React.Fragment>;
            })}
              </tbody>
            </table>
          </div>
        </section>}
    </div>;
}
