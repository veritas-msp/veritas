import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { buildContractFleetRows, buildContractFleetStats, filterContractFleetRows, groupContractFleetByCategory, sortContractFleetRows } from "./contractMspUtils";
function formatDate(value, bcp47 = "en-US") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(bcp47);
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
  const statusMeta = copy.getStatusMeta(row.status);
  const dotColor = statusMeta.tone === "bad" ? "#dc2626" : statusMeta.tone === "warn" ? "#d97706" : "#2b5fab";
  return <tr className={styles.tableRow}>
      <td>
        <span className={styles.statusDot} style={{
        background: dotColor
      }} aria-hidden />
      </td>
      <td>
        <span className={styles.cellName} title={row.name}>
          {row.name}
        </span>
        {row.subtitle ? <span className={styles.cellSub} title={row.subtitle}>
            {row.subtitle}
          </span> : null}
      </td>
      <td className={styles.cellMuted}>{row.type || "-"}</td>
      <td>
        <StatusChip status={row.status} copy={copy} />
      </td>
      <td className={styles.cellMuted}>{formatDate(row.expiration, bcp47)}</td>
      <td>
        {row.clientId ? <button type="button" className={styles.iconBtn} title={copy.viewEnterprise} aria-label={copy.viewEnterprise} onClick={() => onOpenClient?.({
        id: row.clientId,
        name: row.clientName,
        module: row.module
      })}>
            <Icon icon="mdi:open-in-new" width={16} />
          </button> : null}
      </td>
    </tr>;
}
export default function ContractMspDashboard({
  alerts = [],
  licenseAlerts = [],
  loading = false,
  onNavigateClient,
  copy,
  pageCopy,
  bcp47 = "en-US"
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [sortBy, setSortBy] = useState("expiration");
  const [sortDirection, setSortDirection] = useState("asc");
  const fleetRows = useMemo(() => buildContractFleetRows(alerts, licenseAlerts, {
    licenseModuleSections: pageCopy?.licenseModuleSections || [],
    contractType: pageCopy?.contractType || {}
  }), [alerts, licenseAlerts, pageCopy]);
  const stats = useMemo(() => buildContractFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterContractFleetRows(fleetRows, {
    search,
    statusFilter,
    categoryFilter
  }), [fleetRows, search, statusFilter, categoryFilter]);
  const sortedRows = useMemo(() => sortContractFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const categoryGroups = useMemo(() => groupContractFleetByCategory(sortedRows), [sortedRows]);
  const categoryTabs = useMemo(() => {
    const counts = new Map();
    fleetRows.forEach(row => {
      counts.set(row.categoryId, (counts.get(row.categoryId) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([id, count]) => {
      const sample = fleetRows.find(row => row.categoryId === id);
      return {
        id,
        label: sample?.categoryLabel || id,
        count
      };
    }).sort((a, b) => a.label.localeCompare(b.label, copy.locale || "fr"));
  }, [fleetRows, copy.locale]);
  const priorityRows = useMemo(() => fleetRows.filter(row => row.status === "expired" || row.status === "suspended" || row.status === "expiring").sort((a, b) => {
    const rank = {
      expired: 0,
      suspended: 1,
      expiring: 2
    };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    const ta = a.expiration ? new Date(a.expiration).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.expiration ? new Date(b.expiration).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  }).slice(0, 8), [fleetRows]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const toggleCategory = categoryId => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  const colCount = 6;
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
          <KpiCard icon="mdi:file-document-alert-outline" label={copy.kpi.alerts} value={stats.total} tone={stats.total > 0 ? "warn" : "good"} active={statusFilter === "all" && categoryFilter === "all" && !search} onClick={() => {
          setStatusFilter("all");
          setCategoryFilter("all");
          setSearch("");
        }} />
          <KpiCard icon="mdi:office-building-outline" label={copy.kpi.clients} value={stats.clients} tone="neutral" />
          <KpiCard icon="mdi:calendar-remove" label={copy.kpi.expired} value={stats.statusCounts.expired} tone={stats.statusCounts.expired > 0 ? "bad" : "good"} active={statusFilter === "expired"} onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")} />
          <KpiCard icon="mdi:calendar-clock" label={copy.kpi.toRenew} value={stats.statusCounts.expiring} tone={stats.statusCounts.expiring > 0 ? "warn" : "good"} active={statusFilter === "expiring"} onClick={() => setStatusFilter(statusFilter === "expiring" ? "all" : "expiring")} />
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
          const tone = row.status === "expired" || row.status === "suspended" ? "#dc2626" : "#d97706";
          return <button key={row.id} type="button" className={styles.priorityItem} onClick={() => onNavigateClient?.({
            id: row.clientId,
            name: row.clientName,
            module: row.module
          })}>
                  <span className={styles.priorityDot} style={{
              background: tone
            }} />
                  <span className={styles.priorityBody}>
                    <span className={styles.priorityName}>{row.name}</span>
                    <span className={styles.priorityMeta}>
                      {row.type}
                      {row.expiration ? ` · ${formatDate(row.expiration, bcp47)}` : ""}
                    </span>
                  </span>
                  <span className={styles.priorityVerb}>
                    {row.status === "expired" || row.status === "suspended" ? copy.priorityVerbFix : copy.priorityVerbReview}
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

        {categoryTabs.length > 1 ? <div className={styles.filterGroup} role="tablist" aria-label={copy.categoryFilterAria}>
            <button type="button" className={`${styles.filterChip} ${categoryFilter === "all" ? styles.filterChipActive : ""}`} onClick={() => setCategoryFilter("all")}>
              {copy.allCategories}
            </button>
            {categoryTabs.map(tab => <button key={tab.id} type="button" className={`${styles.filterChip} ${categoryFilter === tab.id ? styles.filterChipActive : ""}`} onClick={() => setCategoryFilter(categoryFilter === tab.id ? "all" : tab.id)}>
                {tab.label} {tab.count}
              </button>)}
          </div> : null}

        <span className={styles.toolbarMeta}>
          <strong>{copy.formatCount("alertCount", filteredRows.length)}</strong>
        </span>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{copy.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon={fleetRows.length === 0 ? "mdi:file-check-outline" : "mdi:magnify"} title={fleetRows.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={fleetRows.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label={copy.table.stateAria} />
                  <SortableHeader column="name" label={copy.table.name} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="type" label={copy.table.type} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="expiration" label={copy.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <th aria-label={copy.table.actions} />
                </tr>
              </thead>
              <tbody>
                {categoryGroups.map(group => {
              const collapsed = Boolean(collapsedCategories[group.categoryId]);
              const showSegment = categoryFilter === "all" && categoryGroups.length > 1;
              return <React.Fragment key={group.categoryId}>
                      {showSegment ? <tr className={styles.segmentRow}>
                          <td colSpan={colCount}>
                            <button type="button" className={styles.segmentBtn} onClick={() => toggleCategory(group.categoryId)} aria-expanded={!collapsed}>
                              <span className={styles.segmentLabel}>{group.categoryLabel}</span>
                              <span className={styles.segmentCount}>{group.list.length}</span>
                              <Icon icon={collapsed ? "mdi:chevron-right" : "mdi:chevron-down"} aria-hidden />
                            </button>
                          </td>
                        </tr> : null}
                      {!collapsed ? group.list.map(row => <FleetTableRow key={row.id} row={row} onOpenClient={onNavigateClient} copy={copy} bcp47={bcp47} />) : null}
                    </React.Fragment>;
            })}
              </tbody>
            </table>
          </div>
        </section>}
    </div>;
}
