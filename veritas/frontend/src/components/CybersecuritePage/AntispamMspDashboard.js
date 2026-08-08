import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaSync } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "./AntivirusMspDashboard.module.css";
import { buildAntispamFleetFromClients, buildAntispamFleetStats, filterAntispamFleetRows, groupAntispamFleetByProvider, sortAntispamFleetRows } from "./antispamMspUtils";
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
  getStatusMeta
}) {
  const meta = getStatusMeta(status);
  return <span className={`${styles.chip} ${styles[`chip_${meta.tone}`]}`}>{meta.label}</span>;
}
function CoverageCell({
  users,
  domains,
  formatCoverageUsers,
  formatCoverageDomains
}) {
  if (users == null && domains == null) return <span className={styles.cellMuted}>-</span>;
  const parts = [];
  if (users != null) parts.push(formatCoverageUsers(users));
  if (domains != null) parts.push(formatCoverageDomains(domains));
  return <span className={styles.cellMuted}>{parts.join(" · ")}</span>;
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
  getStatusMeta,
  formatDate,
  formatDateTime,
  formatCoverageUsers,
  formatCoverageDomains
}) {
  const statusMeta = getStatusMeta(row.status);
  const dotColor = statusMeta.tone === "bad" ? "#dc2626" : statusMeta.tone === "warn" ? "#d97706" : "#2b5fab";
  const openRow = () => onOpen?.(row);
  return <tr className={styles.tableRow} onClick={openRow} onMouseDown={e => {
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
        <SolutionCell label={row.solutionLabel || row.providerName} subtitle={row.solutionSubtitle} image={row.providerImage} icon={row.providerIcon} />
      </td>
      <td className={styles.cellMuted}>{row.mappingMode}</td>
      <td>
        <StatusChip status={row.status} getStatusMeta={getStatusMeta} />
      </td>
      <td className={styles.cellMuted}>{formatDate(row.expirationDate || row.expiration)}</td>
      <td>
        <CoverageCell users={row.utilisateursProteges} domains={row.domainesSurveilles} formatCoverageUsers={formatCoverageUsers} formatCoverageDomains={formatCoverageDomains} />
      </td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastSync)}</td>
    </tr>;
}
export default function AntispamMspDashboard({
  copy,
  clients = [],
  loading = false,
  onOpenSolution,
  onOpenClient
}) {
  const {
    formatDate,
    formatDateTime
  } = useAppFormatters();
  const msp = copy?.msp;
  const as = msp?.antispam;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [collapsedProviders, setCollapsedProviders] = useState({});
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const fleetRows = useMemo(() => buildAntispamFleetFromClients(clients), [clients]);
  const stats = useMemo(() => buildAntispamFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterAntispamFleetRows(fleetRows, {
    search,
    statusFilter,
    providerFilter
  }), [fleetRows, search, statusFilter, providerFilter]);
  const sortedRows = useMemo(() => sortAntispamFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const providerGroups = useMemo(() => groupAntispamFleetByProvider(sortedRows), [sortedRows]);
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
    }).sort((a, b) => {
      if (a.id === "mailinblack") return -1;
      if (b.id === "mailinblack") return 1;
      return a.label.localeCompare(b.label, copy?.locale || "fr");
    });
  }, [fleetRows, copy?.locale]);
  const priorityRows = useMemo(() => fleetRows.filter(row => row.status === "inactif" || row.status === "expire_bientot").sort((a, b) => {
    if (a.status !== b.status) return a.status === "inactif" ? -1 : 1;
    if (!a.expirationDate && !a.expiration) return 1;
    if (!b.expirationDate && !b.expiration) return -1;
    const aDate = a.expirationDate || a.expiration;
    const bDate = b.expirationDate || b.expiration;
    return new Date(aDate) - new Date(bDate);
  }).slice(0, 8), [fleetRows]);
  const toggleProvider = providerId => {
    setCollapsedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };
  const colCount = 8;
  const formatDisplayDate = value => {
    if (!value) return "-";
    return formatDate(value) || "-";
  };
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  if (!msp || !as) return null;
  return <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <HealthGauge score={stats.healthScore} label={as.healthLabel} />
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{as.eyebrow}</span>
            <h2 className={styles.heroTitle}>{msp.heroTitle}</h2>
            <p className={styles.heroDesc}>
              {stats.issues > 0 ? copy.formatHeroIssues("antispam", stats.issues) : as.heroDescOk}
            </p>
          </div>
        </div>
        <div className={styles.kpiRow}>
          <KpiCard icon="mdi:email-secure-outline" label={msp.kpi.solutions} value={stats.total} tone="neutral" active={statusFilter === "all" && providerFilter === "all" && !search} onClick={() => {
          setStatusFilter("all");
          setProviderFilter("all");
          setSearch("");
        }} />
          <KpiCard icon="mdi:office-building-outline" label={msp.kpi.enterprises} value={stats.clients} tone="neutral" />
          <KpiCard icon="mdi:shield-check" label={msp.kpi.active} value={stats.statusCounts.actif} tone="good" active={statusFilter === "actif"} onClick={() => setStatusFilter(statusFilter === "actif" ? "all" : "actif")} />
          <KpiCard icon="mdi:alert-circle-outline" label={msp.kpi.todo} value={stats.issues} tone={stats.issues > 0 ? "warn" : "good"} active={statusFilter === "expire_bientot" || statusFilter === "inactif"} onClick={() => setStatusFilter(statusFilter === "expire_bientot" ? "all" : "expire_bientot")} />
        </div>
      </section>

      {priorityRows.length > 0 ? <section className={styles.priorityPanel}>
          <header className={styles.priorityHeader}>
            <h3 className={styles.priorityTitle}>{msp.priorityTitle}</h3>
            <span className={styles.toolbarMeta}>
              <strong>{copy.formatAlertCount(priorityRows.length)}</strong>
            </span>
          </header>
          <div className={styles.priorityList}>
            {priorityRows.map(row => {
          const tone = row.status === "inactif" ? "#dc2626" : "#d97706";
          return <button key={row.id} type="button" className={styles.priorityItem} onClick={() => onOpenSolution?.(row)}>
                  <span className={styles.priorityDot} style={{
              background: tone
            }} />
                  <span className={styles.priorityBody}>
                    <span className={styles.priorityName}>{row.clientName}</span>
                    <span className={styles.priorityMeta}>
                      {row.solutionLabel}
                      {row.solutionSubtitle ? ` · ${row.solutionSubtitle}` : ""}
                      {row.expirationDate || row.expiration ? ` · ${msp.expPrefix} ${formatDisplayDate(row.expirationDate || row.expiration)}` : ""}
                    </span>
                  </span>
                  <span className={styles.priorityVerb}>
                    {row.status === "inactif" ? msp.renew : msp.anticipate}
                  </span>
                </button>;
        })}
          </div>
        </section> : null}

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={as.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>

        <div className={styles.filterGroup} role="tablist" aria-label={msp.statusFilterAria}>
          {(copy.statusFilters || []).map(filter => <button key={filter.id} type="button" className={`${styles.filterChip} ${statusFilter === filter.id ? styles.filterChipActive : ""}`} onClick={() => setStatusFilter(filter.id)}>
              {filter.label}
            </button>)}
        </div>

        {providerTabs.length > 1 ? <div className={styles.filterGroup} role="tablist" aria-label={msp.providerFilterAria}>
            <button type="button" className={`${styles.filterChip} ${providerFilter === "all" ? styles.filterChipActive : ""}`} onClick={() => setProviderFilter("all")}>
              {msp.allProviders}
            </button>
            {providerTabs.map(tab => <button key={tab.id} type="button" className={`${styles.filterChip} ${providerFilter === tab.id ? styles.filterChipActive : ""}`} onClick={() => setProviderFilter(providerFilter === tab.id ? "all" : tab.id)}>
                {tab.label} {tab.count}
              </button>)}
          </div> : null}

        <span className={styles.toolbarMeta}>
          <strong>{copy.formatSolutionCount(filteredRows.length)}</strong>
          {stats.users > 0 ? <>
              {" "}
              · <strong>{copy.formatUserCount(stats.users)}</strong>
            </> : null}
        </span>

        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconBtn} title={as.syncTitle} aria-label={as.syncTitle}>
            <FaSync />
          </button>
        </div>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{as.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:email-off-outline" title={fleetRows.length === 0 ? as.emptyTitle : as.noResultsTitle} text={fleetRows.length === 0 ? as.emptyText : as.noResultsText} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label={msp.statusAria} />
                  <SortableHeader column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="solutionLabel" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="mappingMode" label={msp.table.mode} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={msp.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="expirationDate" label={msp.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="coverage" label={msp.table.coverage} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastSync" label={msp.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
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
                              {group.providerImage ? <img src={group.providerImage} alt="" className={styles.providerLogo} /> : <Icon icon={group.providerIcon || "mdi:email-secure-outline"} width={16} />}
                              <span className={styles.segmentLabel}>{group.providerName}</span>
                              <span className={styles.segmentCount}>{group.list.length}</span>
                              <Icon icon={collapsed ? "mdi:chevron-right" : "mdi:chevron-down"} aria-hidden />
                            </button>
                          </td>
                        </tr> : null}
                      {!collapsed ? group.list.map(row => <FleetTableRow key={row.id} row={row} onOpen={onOpenSolution} onOpenClient={onOpenClient} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} formatCoverageUsers={copy.formatCoverageUsers} formatCoverageDomains={copy.formatCoverageDomains} onMiddleClick={(e, item) => {
                  e.preventDefault();
                  onOpenSolution?.(item, {
                    background: true
                  });
                }} />) : null}
                    </React.Fragment>;
            })}
              </tbody>
            </table>
          </div>
        </section>}
    </div>;
}
