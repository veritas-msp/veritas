import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspDashboardSkeleton from "../Misc/Skeleton/MspDashboardSkeleton";
import SmartTooltip from "../SmartTooltip";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import { buildMicrosoftTenantFleetStats, formatMicrosoftGlobalScore, isMicrosoftTenantIssue, microsoftScoreTone } from "./microsoftTenantMspUtils";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";

function KpiCard({
  icon,
  label,
  value,
  tone = "neutral"
}) {
  return <div className={styles.kpiCard}>
      <span className={`${styles.kpiIcon} ${styles[`kpiIcon_${tone}`]}`}>
        <Icon icon={icon} />
      </span>
      <span className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </span>
    </div>;
}


function formatSecureScore(current, max) {
  if (current == null || max == null) return "-";
  const c = Number(current);
  const m = Number(max);
  if (Number.isNaN(c) || Number.isNaN(m)) return "-";
  return `${Math.round(c)} / ${Math.round(m)}`;
}

function displayCount(value) {
  if (value == null || value === "") return "-";
  return String(value);
}

function FleetTableRow({
  row,
  onOpen,
  onMiddleClick,
  statusLabel,
  formatDateTime
}) {
  const openRow = () => onOpen?.(row);
  return <tr className={styles.tableRow} onClick={openRow} onMouseDown={e => {
    if (e.button === 1) onMiddleClick?.(e, row);
  }} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow();
    }
  }} role="button" tabIndex={0}>
      <td className={styles.cellName}>{row.clientName || "-"}</td>
      <td>{statusLabel}</td>
      <td className={styles.cellMuted}>{displayCount(row.userCount)}</td>
      <td className={styles.cellMuted}>{displayCount(row.totalLicenses)}</td>
      <td className={styles.cellMuted}>{formatSecureScore(row.secureScoreCurrent, row.secureScoreMax)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastSync)}</td>
      <td className={styles.rowOpenCell} aria-hidden>
        <Icon icon="mdi:chevron-right" className={styles.rowOpenChevron} />
      </td>
    </tr>;
}

export default function MicrosoftTenantMspDashboard({
  tenants = [],
  loading = false,
  copy,
  onOpenTenant,
  onSync,
  syncing = false
}) {
  const {
    formatDateTime
  } = useAppFormatters();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const stats = useMemo(() => buildMicrosoftTenantFleetStats(tenants), [tenants]);
  const filteredRows = useMemo(() => {
    let rows = Array.isArray(tenants) ? tenants : [];
    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(row => (row.clientName || "").toLowerCase().includes(query) || (row.tenantId || "").toString().toLowerCase().includes(query));
    }
    if (statusFilter === "issues") {
      rows = rows.filter(isMicrosoftTenantIssue);
    } else if (statusFilter !== "all") {
      rows = rows.filter(row => row.status === statusFilter);
    }
    return rows;
  }, [tenants, search, statusFilter]);
  const sortedRows = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      switch (sortBy) {
        case "clientName":
          return (a.clientName || "").localeCompare(b.clientName || "", "fr", {
            sensitivity: "base"
          }) * dir;
        case "status":
          {
            const order = {
              inactif: 0,
              actif: 1
            };
            return ((order[a.status] ?? 2) - (order[b.status] ?? 2)) * dir;
          }
        case "userCount":
          return ((Number(a.userCount) || 0) - (Number(b.userCount) || 0)) * dir;
        case "totalLicenses":
          return ((Number(a.totalLicenses) || 0) - (Number(b.totalLicenses) || 0)) * dir;
        case "secureScore":
          {
            const ratio = row => {
              if (row.secureScoreCurrent == null) return null;
              if (row.secureScoreMax > 0) return row.secureScoreCurrent / row.secureScoreMax;
              return row.secureScoreCurrent;
            };
            const ra = ratio(a);
            const rb = ratio(b);
            if (ra == null && rb == null) return 0;
            if (ra == null) return dir;
            if (rb == null) return -dir;
            return (ra - rb) * dir;
          }
        case "lastSync":
          {
            const ta = a.lastSync ? new Date(a.lastSync).getTime() : 0;
            const tb = b.lastSync ? new Date(b.lastSync).getTime() : 0;
            return (ta - tb) * dir;
          }
        default:
          return 0;
      }
    });
  }, [filteredRows, sortBy, sortDirection]);
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
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  if (!copy) return null;
  const statusLabels = copy.status || {};
  return <div className={styles.dashboard}>
      {loading ? (
        <MspDashboardSkeleton rows={8} chipCount={0} columnCount={6} showKpis kpiCount={4} label={copy.loading} />
      ) : (
        <div className={layout.listBody}>
          <div className={layout.listArea}>
            <div className={layout.panelCard}>
              <div className={styles.kpiStrip}>
                <KpiCard icon="mdi:microsoft-azure" label={copy.kpi.tenants} value={stats.total} tone="neutral" />
                <KpiCard icon="mdi:shield-star-outline" label={copy.kpi.globalScore} value={formatMicrosoftGlobalScore(stats.globalScore)} tone={microsoftScoreTone(stats.globalScore)} />
                <KpiCard icon="mdi:license" label={copy.kpi.licenses} value={stats.licenseTotal} tone="neutral" />
                <KpiCard icon="mdi:account-group-outline" label={copy.kpi.users} value={stats.userTotal} tone="neutral" />
              </div>

              <div className={layout.tableSearchBar}>
                <div className={`${layout.searchWrap} ${layout.searchWrapInCard}`}>
                  <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                  <input type="search" inputMode="search" enterKeyHint="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className={layout.searchInput} aria-label={copy.searchPlaceholder} />
                  {search ? <SmartTooltip content={copy.clearSearch || "Effacer"}>
                      <button type="button" onClick={() => setSearch("")} className={layout.clearButton} aria-label={copy.clearSearch || "Effacer"}>
                        <FaTimes />
                      </button>
                    </SmartTooltip> : null}
                </div>
                {onSync ? <div className={layout.toolbarActions} data-guide="service-sync">
                    <SmartTooltip content={copy.syncTenants}>
                      <button
                        type="button"
                        className={layout.iconBtn}
                        aria-label={copy.syncTenants}
                        onClick={onSync}
                        disabled={syncing || tenants.length === 0}
                      >
                        <Icon icon={syncing ? "mdi:loading" : "mdi:sync"} className={syncing ? styles.spin : undefined} aria-hidden />
                      </button>
                    </SmartTooltip>
                  </div> : null}
              </div>

              {filteredRows.length === 0 ? (
                <div className={layout.emptyStateInCard}>
                  <Icon icon="mdi:microsoft-azure" className={layout.emptyStateIcon} aria-hidden />
                  <p className={layout.emptyStateTitle}>{tenants.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch}</p>
                  <p className={layout.emptyStateHint}>{tenants.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch}</p>
                </div>
              ) : (
                <>
                  <div className={layout.dataTableWrap}>
                    <div className={`${layout.dataTableScroll} ${styles.tableScroll}`}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <SortableHeader buttonClassName={styles.thBtn} column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="userCount" label={copy.table.users} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="totalLicenses" label={copy.table.licenses} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="secureScore" label={copy.table.secureScore} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="lastSync" label={copy.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <th className={styles.rowOpenCell} aria-label={copy.openDetail || "Détail"} />
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRows.map((row, index) => <FleetTableRow key={`${row.clientId}-${index}`} row={row} onOpen={onOpenTenant} statusLabel={statusLabels[row.status] || row.status || "-"} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
                        e.preventDefault();
                        onOpenTenant?.(item, {
                          background: true
                        });
                      }} />)}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
