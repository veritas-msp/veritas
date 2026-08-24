import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import { buildMicrosoftTenantFleetStats, formatMicrosoftGlobalScore, isMicrosoftTenantIssue, microsoftScoreTone } from "./microsoftTenantMspUtils";

function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
  active,
  onClick
}) {
  return <button type="button" className={`${styles.kpiCard} ${active ? styles.kpiCardActive : ""}`} onClick={onClick} style={onClick ? undefined : {
    cursor: "default"
  }}>
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
    </tr>;
}

export default function MicrosoftTenantMspDashboard({
  tenants = [],
  loading = false,
  copy,
  onOpenTenant
}) {
  const {
    formatDateTime
  } = useAppFormatters();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  if (!copy) return null;
  const statusLabels = copy.status || {};
  return <div className={styles.dashboard}>
      <div className={styles.kpiStrip}>
        <KpiCard icon="mdi:microsoft-azure" label={copy.kpi.tenants} value={stats.total} tone="neutral" onClick={() => {
        setStatusFilter("all");
        setSearch("");
      }} />
        <KpiCard icon="mdi:shield-star-outline" label={copy.kpi.globalScore} value={formatMicrosoftGlobalScore(stats.globalScore)} tone={microsoftScoreTone(stats.globalScore)} />
        <KpiCard icon="mdi:license" label={copy.kpi.licenses} value={stats.licenseTotal} tone="neutral" />
        <KpiCard icon="mdi:account-group-outline" label={copy.kpi.users} value={stats.userTotal} tone="neutral" />
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
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:microsoft-azure" title={tenants.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={tenants.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortableHeader column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="userCount" label={copy.table.users} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="totalLicenses" label={copy.table.licenses} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="secureScore" label={copy.table.secureScore} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastSync" label={copy.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
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
        </section>}
    </div>;
}
