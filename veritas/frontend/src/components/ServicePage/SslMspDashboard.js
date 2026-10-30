import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspDashboardSkeleton from "../Misc/Skeleton/MspDashboardSkeleton";
import SmartTooltip from "../SmartTooltip";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitScrollFadeShell, uiKitLayoutsStyles as kit } from "../UiKit";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import { buildSslFleetFromList, buildSslFleetStats, filterSslFleetRows, sortSslFleetRows } from "./sslMspUtils";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";


function expiryClass(statusKey) {
  if (statusKey === "warning") return styles.cellExpiry_warn;
  if (statusKey === "expired" || statusKey === "error") return styles.cellExpiry_bad;
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
  const statusMeta = getStatusMeta(row.statusKey);
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
      <td>{row.hostLabel || row.hostname}</td>
      <td>{statusMeta.label}</td>
      <td className={styles.cellMuted}>{row.issuer || "-"}</td>
      <td className={`${styles.cellExpiry} ${expiryClass(row.statusKey)}`.trim()}>{formatDate(row.expiration)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastChecked)}</td>
      <td className={styles.rowOpenCell} aria-hidden>
        <Icon icon="mdi:chevron-right" className={styles.rowOpenChevron} />
      </td>
    </tr>;
}

export default function SslMspDashboard({
  certificates = [],
  loading = false,
  onOpenClient,
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
  const fleetRows = useMemo(() => buildSslFleetFromList(certificates), [certificates]);
  const stats = useMemo(() => buildSslFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterSslFleetRows(fleetRows, {
    search,
    statusFilter
  }), [fleetRows, search, statusFilter]);
  const sortedRows = useMemo(() => sortSslFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
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
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection,
      defaultSortBy: "clientName",
      defaultSortDirection: "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
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
  if (!copy) return null;
  const statusFilterItems = copy.statusFilters || [];
  return <div className={styles.dashboard}>
      {loading ? (
        <MspDashboardSkeleton rows={8} chipCount={0} columnCount={6} label={copy.loading} />
      ) : (
        <div className={layout.listBody}>
          <div className={layout.listArea}>
            <div className={layout.panelCard}>
              <UiKitCrmListToolbar
                searchVariant="embedded"
                searchValue={search}
                onSearchChange={setSearch}
                onSearchClear={() => setSearch("")}
                searchPlaceholder={copy.searchPlaceholder}
                searchAriaLabel={copy.searchPlaceholder}
                clearSearchLabel={copy.clearSearch || "Effacer"}
                filters={statusFilterItems.map(item => {
                  const count = stats.statusCounts[item.id] || 0;
                  const active = statusFilter === item.id;
                  return <button key={item.id} type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`} onClick={() => toggleStatus(item.id)} disabled={count === 0}>
                      <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                        <Icon icon={item.icon} />
                      </span>
                      <span className={layout.statusChipLabel}>{item.label}</span>
                      <span className={layout.statusChipCount}>{count}</span>
                    </button>;
                })}
                extraActions={
                  onSync ? (
                    <SmartTooltip content={copy.checkAll}>
                      <button
                        type="button"
                        className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                        data-guide="service-sync"
                        aria-label={copy.checkAll}
                        onClick={onSync}
                        disabled={syncing || certificates.length === 0}
                      >
                        <Icon icon={syncing ? "mdi:loading" : "mdi:sync"} className={syncing ? styles.spin : undefined} aria-hidden />
                      </button>
                    </SmartTooltip>
                  ) : null
                }
              />

              {sortedRows.length === 0 ? (
                <div className={layout.emptyStateInCard}>
                  <UiKitEmptyState
                    bare
                    icon="mdi:certificate-outline"
                    title={fleetRows.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch}
                    text={fleetRows.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch}
                  />
                </div>
              ) : (
                <>
                  <UiKitScrollFadeShell
                    className={`${layout.dataTableWrap} ${styles.tableScroll}`}
                    deps={[paginatedRows.length, pageSize, search, statusFilter, sortBy, sortDirection]}
                  >
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <SortableHeader buttonClassName={styles.thBtn} column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="hostname" label={copy.table.hostname} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="issuer" label={copy.table.issuer} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="expiration" label={copy.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="lastChecked" label={copy.table.lastChecked} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <th className={styles.rowOpenCell} aria-label={copy.openDetail || "Détail"} />
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRows.map(row => <FleetTableRow key={row.id} row={row} onOpen={onOpenClient} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
                        e.preventDefault();
                        onOpenClient?.(item);
                      }} />)}
                        </tbody>
                      </table>
                  </UiKitScrollFadeShell>
                  <div className={`${layout.pagination} ${layout.paginationEmbedded}`}>
                    <div className={layout.paginationLeft}>
                      <span className={layout.paginationLabel}>{copy.rowsPerPage}</span>
                      <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className={layout.paginationRight}>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label={copy.prevPage}>
                        <FaChevronLeft />
                      </button>
                      <span className={layout.paginationInfo}>
                        {copy.formatPageOf(currentPage, totalPages)}
                      </span>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label={copy.nextPage}>
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>;
}
