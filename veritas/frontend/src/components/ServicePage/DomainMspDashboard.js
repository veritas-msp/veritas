import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import { buildDomainFleetFromList, buildDomainFleetStats, buildOvhDomainUrl, filterDomainFleetRows, sortDomainFleetRows } from "./domainMspUtils";

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
  if (status === "expiré") return styles.cellExpiry_bad;
  return "";
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
      <td>{row.domainName}</td>
      <td>{statusMeta.label}</td>
      <td className={styles.cellMuted}>{row.registrar || row.providerName || "-"}</td>
      <td className={`${styles.cellExpiry} ${expiryClass(row.status)}`.trim()}>{formatDate(row.expirationDate)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastSync)}</td>
    </tr>;
}

export default function DomainMspDashboard({
  domains = [],
  loading = false,
  onOpenDomain,
  copy
}) {
  const {
    formatDate,
    formatDateTime
  } = useAppFormatters();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const fleetRows = useMemo(() => buildDomainFleetFromList(domains), [domains]);
  const stats = useMemo(() => buildDomainFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterDomainFleetRows(fleetRows, {
    search,
    statusFilter,
    providerFilter: "all"
  }), [fleetRows, search, statusFilter]);
  const sortedRows = useMemo(() => sortDomainFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
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
  const handleOpenDomain = row => {
    if (onOpenDomain) {
      onOpenDomain(row);
      return;
    }
    window.open(buildOvhDomainUrl(row.domainName), "_blank", "noopener,noreferrer");
  };
  if (!copy) return null;
  const statusLabels = Object.fromEntries((copy.statusFilters || []).map(filter => [filter.id, filter.label]));
  return <div className={styles.dashboard}>
      <div className={styles.kpiStrip}>
        <KpiCard icon="mdi:web" label={copy.kpi.domains} value={stats.total} tone="neutral" active={statusFilter === "all"} onClick={() => {
        setStatusFilter("all");
        setSearch("");
      }} />
        <KpiCard icon="mdi:clock-alert-outline" label={statusLabels.expire_bientot} value={stats.statusCounts.expire_bientot} tone="warn" active={statusFilter === "expire_bientot"} onClick={() => toggleStatus("expire_bientot")} />
        <KpiCard icon="mdi:web-off" label={statusLabels.expiré} value={stats.statusCounts.expiré} tone="bad" active={statusFilter === "expiré"} onClick={() => toggleStatus("expiré")} />
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{copy.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:web-off" title={fleetRows.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={fleetRows.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortableHeader column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="domainName" label={copy.table.domain} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="registrar" label={copy.table.registrar} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="expirationDate" label={copy.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastSync" label={copy.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => <FleetTableRow key={row.id} row={row} onOpen={handleOpenDomain} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
              e.preventDefault();
              handleOpenDomain(item);
            }} />)}
              </tbody>
            </table>
          </div>
        </section>}
    </div>;
}
