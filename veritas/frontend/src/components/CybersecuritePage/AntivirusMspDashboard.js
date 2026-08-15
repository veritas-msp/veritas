import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "./AntivirusMspDashboard.module.css";
import { buildAntivirusFleetFromClients, buildAntivirusFleetStats, filterAntivirusFleetRows, sortAntivirusFleetRows } from "./antivirusMspUtils";

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

function expiryClass(status) {
  if (status === "expire_bientot") return styles.cellExpiry_warn;
  if (status === "inactif") return styles.cellExpiry_bad;
  return "";
}

function formatLicenses(used, total) {
  if (used == null && total == null) return "-";
  return `${used != null ? used : "-"}${total != null ? ` / ${total}` : ""}`;
}

function FleetTableRow({
  row,
  onOpen,
  onMiddleClick,
  getStatusMeta,
  formatDate,
  formatDateTime
}) {
  const statusMeta = getStatusMeta(row.status);
  const openRow = () => onOpen?.(row);
  return <tr className={styles.tableRow} onClick={openRow} onMouseDown={e => {
    if (e.button === 1) onMiddleClick?.(e, row);
  }} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow();
    }
  }} role="button" tabIndex={0}>
      <td className={styles.cellName}>{row.clientName}</td>
      <td>{row.solutionLabel || row.providerName || "-"}</td>
      <td>{statusMeta.label}</td>
      <td className={styles.cellMuted}>{row.paymentPlan || "-"}</td>
      <td className={`${styles.cellExpiry} ${expiryClass(row.status)}`.trim()}>{formatDate(row.expirationDate)}</td>
      <td className={styles.cellMuted}>{formatLicenses(row.usedLicenses, row.totalLicenses)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastSync)}</td>
    </tr>;
}

export default function AntivirusMspDashboard({
  copy,
  clients = [],
  loading = false,
  onOpenSolution
}) {
  const {
    formatDate,
    formatDateTime
  } = useAppFormatters();
  const msp = copy?.msp;
  const av = msp?.antivirus;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const fleetRows = useMemo(() => buildAntivirusFleetFromClients(clients), [clients]);
  const stats = useMemo(() => buildAntivirusFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterAntivirusFleetRows(fleetRows, {
    search,
    statusFilter,
    providerFilter: "all"
  }), [fleetRows, search, statusFilter]);
  const sortedRows = useMemo(() => sortAntivirusFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const toggleStatus = next => {
    setStatusFilter(statusFilter === next ? "all" : next);
  };
  const formatDisplayDate = value => {
    if (!value) return "-";
    return formatDate(value) || "-";
  };
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  if (!msp || !av) return null;
  const statusLabels = Object.fromEntries((copy.statusFilters || []).map(filter => [filter.id, filter.label]));
  return <div className={styles.dashboard}>
      <div className={styles.kpiStrip}>
        <KpiCard icon="mdi:shield-search" label={msp.kpi.solutions} value={stats.total} tone="neutral" active={statusFilter === "all"} onClick={() => {
        setStatusFilter("all");
        setSearch("");
      }} />
        <KpiCard icon="mdi:shield-check" label={statusLabels.actif || msp.kpi.active} value={stats.statusCounts.actif} tone="good" active={statusFilter === "actif"} onClick={() => toggleStatus("actif")} />
        <KpiCard icon="mdi:clock-alert-outline" label={statusLabels.expire_bientot} value={stats.statusCounts.expire_bientot} tone="warn" active={statusFilter === "expire_bientot"} onClick={() => toggleStatus("expire_bientot")} />
        <KpiCard icon="mdi:shield-off-outline" label={statusLabels.inactif} value={stats.statusCounts.inactif} tone="bad" active={statusFilter === "inactif"} onClick={() => toggleStatus("inactif")} />
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={av.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{av.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:shield-off-outline" title={fleetRows.length === 0 ? av.emptyTitle : av.noResultsTitle} text={fleetRows.length === 0 ? av.emptyText : av.noResultsText} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortableHeader column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="solutionLabel" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={msp.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="paymentPlan" label={msp.table.plan} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="expirationDate" label={msp.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="usagePercent" label={msp.table.licenses || msp.table.coverage} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastSync" label={msp.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => <FleetTableRow key={row.id} row={row} onOpen={onOpenSolution} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
              e.preventDefault();
              onOpenSolution?.(item, {
                background: true
              });
            }} />)}
              </tbody>
            </table>
          </div>
        </section>}
    </div>;
}
