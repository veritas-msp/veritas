import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import SmartTooltip from "../SmartTooltip";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import { buildDomainFleetFromList, buildDomainFleetStats, buildOvhDomainUrl, filterDomainFleetRows, sortDomainFleetRows } from "./domainMspUtils";

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
  copy,
  onSync,
  syncing = false
}) {
  const {
    formatDate,
    formatDateTime
  } = useAppFormatters();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const fleetRows = useMemo(() => buildDomainFleetFromList(domains), [domains]);
  const stats = useMemo(() => buildDomainFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterDomainFleetRows(fleetRows, {
    search,
    statusFilter,
    providerFilter: "all"
  }), [fleetRows, search, statusFilter]);
  const sortedRows = useMemo(() => sortDomainFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy, sortDirection, pageSize]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);
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
  const statusFilterItems = copy.statusFilters || [];
  return <div className={styles.dashboard}>
      <div className={`${layout.toolbar} ${layout.toolbarWithFilters}`}>
        <div className={layout.searchWrap}>
          <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
          <input type="search" inputMode="search" enterKeyHint="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className={layout.searchInput} aria-label={copy.searchPlaceholder} />
          {search ? <SmartTooltip content={copy.clearSearch || "Effacer"}>
              <button type="button" onClick={() => setSearch("")} className={layout.clearButton} aria-label={copy.clearSearch || "Effacer"}>
                <FaTimes />
              </button>
            </SmartTooltip> : null}
        </div>
        <div className={layout.statusChips} role="group">
          {statusFilterItems.map(item => {
            const count = stats.statusCounts[item.id] || 0;
            const active = statusFilter === item.id;
            return <button key={item.id} type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`} onClick={() => toggleStatus(item.id)} disabled={loading || count === 0}>
                <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                  <Icon icon={item.icon} />
                </span>
                <span className={layout.statusChipLabel}>{item.label}</span>
                <span className={layout.statusChipCount}>{count}</span>
              </button>;
          })}
        </div>
        {onSync ? <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.iconBtn}
              title={copy.syncDomains}
              aria-label={copy.syncDomains}
              onClick={onSync}
              disabled={syncing}
            >
              <Icon icon={syncing ? "mdi:loading" : "mdi:sync"} className={syncing ? styles.spin : undefined} aria-hidden />
            </button>
          </div> : null}
      </div>

      {loading ? (
        <PageSkeleton variant="list" rows={8} label={copy.loading} />
      ) : filteredRows.length === 0 ? <MspEmptyState icon="mdi:web-off" title={fleetRows.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={fleetRows.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
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
                {paginatedRows.map(row => <FleetTableRow key={row.id} row={row} onOpen={handleOpenDomain} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
              e.preventDefault();
              handleOpenDomain(item);
            }} />)}
              </tbody>
            </table>
            </div>
            {sortedRows.length > 0 ? <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <span className={styles.paginationLabel}>{copy.rowsPerPage}</span>
                <select className={styles.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className={styles.paginationRight}>
                <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label={copy.prevPage}>
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>
                  {copy.formatPageOf(currentPage, totalPages)}
                </span>
                <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label={copy.nextPage}>
                  <FaChevronRight />
                </button>
              </div>
            </div> : null}
          </div>
        </section>}
    </div>;
}
