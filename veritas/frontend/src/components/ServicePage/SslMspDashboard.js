import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaSync } from "react-icons/fa";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { buildSslFleetFromList, buildSslFleetStats, filterSslFleetRows, isSslFleetIssue, sortSslFleetRows } from "./sslMspUtils";
function formatDate(value, bcp47 = "en-US") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(bcp47);
}
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
  statusKey,
  copy
}) {
  const meta = copy.getStatusMeta(statusKey);
  return <span className={`${styles.chip} ${styles[`chip_${meta.tone}`]}`}>{meta.label}</span>;
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
  onOpenClient,
  copy,
  bcp47
}) {
  const meta = copy.getStatusMeta(row.statusKey);
  const dotColor = meta.tone === "bad" ? "#dc2626" : meta.tone === "warn" ? "#d97706" : "#2b5fab";
  return <tr className={styles.tableRow}>
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
        <div className={styles.solutionCell}>
          <Icon icon="mdi:certificate-outline" className={styles.solutionLogoIcon} aria-hidden />
          <div className={styles.solutionText}>
            <span className={styles.cellName} title={row.hostLabel}>
              {row.hostLabel}
            </span>
            {row.issuer && row.issuer !== "-" ? <span className={styles.cellSub} title={row.issuer}>
                {row.issuer}
              </span> : null}
          </div>
        </div>
      </td>
      <td>
        <StatusChip statusKey={row.statusKey} copy={copy} />
      </td>
      <td className={styles.cellMuted}>{row.issuer || "-"}</td>
      <td className={styles.cellMuted}>{formatDate(row.expiration, bcp47)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastChecked, bcp47)}</td>
    </tr>;
}
export default function SslMspDashboard({
  certificates = [],
  loading = false,
  checking = false,
  onCheckAll,
  onOpenClient,
  copy,
  bcp47 = "en-US"
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("status");
  const [sortDirection, setSortDirection] = useState("asc");
  const fleetRows = useMemo(() => buildSslFleetFromList(certificates), [certificates]);
  const stats = useMemo(() => buildSslFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterSslFleetRows(fleetRows, {
    search,
    statusFilter
  }), [fleetRows, search, statusFilter]);
  const sortedRows = useMemo(() => sortSslFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const priorityRows = useMemo(() => fleetRows.filter(row => isSslFleetIssue(row.statusKey)).sort((a, b) => {
    const order = {
      error: 0,
      expired: 1,
      warning: 2
    };
    const diff = (order[a.statusKey] ?? 9) - (order[b.statusKey] ?? 9);
    if (diff !== 0) return diff;
    if (a.daysRemaining == null && b.daysRemaining == null) return 0;
    if (a.daysRemaining == null) return 1;
    if (b.daysRemaining == null) return -1;
    return a.daysRemaining - b.daysRemaining;
  }).slice(0, 8), [fleetRows]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const checkDisabled = fleetRows.length === 0 || checking;
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
          <KpiCard icon="mdi:certificate-outline" label={copy.kpi.certificates} value={stats.total} tone="neutral" active={statusFilter === "all" && !search} onClick={() => {
          setStatusFilter("all");
          setSearch("");
        }} />
          <KpiCard icon="mdi:office-building-outline" label={copy.kpi.clients} value={stats.clients} tone="neutral" />
          <KpiCard icon="mdi:check-circle-outline" label={copy.kpi.active} value={stats.statusCounts.active} tone="good" active={statusFilter === "active"} onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")} />
          <KpiCard icon="mdi:alert-circle-outline" label={copy.kpi.toReview} value={stats.issues} tone={stats.issues > 0 ? "warn" : "good"} active={statusFilter === "warning" || statusFilter === "expired" || statusFilter === "error"} onClick={() => setStatusFilter(statusFilter === "warning" ? "all" : "warning")} />
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
          const meta = copy.getStatusMeta(row.statusKey);
          const tone = meta.tone === "bad" ? "#dc2626" : "#d97706";
          return <button key={row.id} type="button" className={styles.priorityItem} onClick={() => onOpenClient?.(row)}>
                  <span className={styles.priorityDot} style={{
              background: tone
            }} />
                  <span className={styles.priorityBody}>
                    <span className={styles.priorityName}>{row.hostLabel}</span>
                    <span className={styles.priorityMeta}>
                      {row.clientName}
                      {row.expiration ? ` · ${copy.expPrefix} ${formatDate(row.expiration, bcp47)}` : ""}
                    </span>
                  </span>
                  <span className={styles.priorityVerb}>
                    {row.statusKey === "expired" || row.statusKey === "error" ? copy.priorityVerbRenew : copy.priorityVerbAnticipate}
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

        <span className={styles.toolbarMeta}>
          <strong>{copy.formatCount("certificateCount", filteredRows.length)}</strong>
        </span>

        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconBtn} title={copy.checkAll} aria-label={copy.checkAll} onClick={() => onCheckAll?.()} disabled={checkDisabled}>
            <FaSync className={checking ? styles.spin : undefined} />
          </button>
        </div>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{copy.loading}</span>
        </div> : sortedRows.length === 0 ? <MspEmptyState icon={fleetRows.length === 0 ? "mdi:certificate-outline" : "mdi:magnify"} title={fleetRows.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={fleetRows.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label={copy.table.stateAria} />
                  <SortableHeader column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="hostname" label={copy.table.hostname} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="issuer" label={copy.table.issuer} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="expiration" label={copy.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastChecked" label={copy.table.lastChecked} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => <FleetTableRow key={row.id} row={row} onOpenClient={onOpenClient} copy={copy} bcp47={bcp47} />)}
              </tbody>
            </table>
          </div>
        </section>}
    </div>;
}
