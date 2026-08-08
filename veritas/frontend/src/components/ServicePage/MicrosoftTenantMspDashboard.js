import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaSync } from "react-icons/fa";
import styles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { buildMicrosoftTenantFleetStats } from "./microsoftTenantMspUtils";
function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return String(Math.round(Number(value)));
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
function getClientNameForSort(value) {
  return (value || "").toString().trim().replace(/^\d+\s*[-\s]*\s*/, "").toLowerCase();
}
function formatClientDisplay(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/\s*-\s*/g, " ");
}
function maskTenantId(tenantId) {
  const rawTenantId = (tenantId || "-").toString();
  if (rawTenantId === "-" || rawTenantId.length <= 4) return "****";
  return `${rawTenantId.slice(0, -4)}****`;
}
function formatSecureScore(current, max) {
  if (current == null || max == null) return "-";
  const c = Number(current);
  const m = Number(max);
  if (Number.isNaN(c) || Number.isNaN(m)) return "-";
  return `${Math.round(c)} / ${Math.round(m)}`;
}
function formatMfaPct(v) {
  return v == null || Number.isNaN(Number(v)) ? "-" : `${Math.round(Number(v))} %`;
}
function buildTenantStats(rows = []) {
  return buildMicrosoftTenantFleetStats(rows);
}
function buildPriorityRows(rows = []) {
  const items = [];
  rows.forEach(row => {
    if (row.status === "inactif") {
      items.push({
        id: `inactive-${row.clientId}`,
        row,
        tone: "bad",
        label: row.clientName,
        meta: row.tenantId || "-",
        verbKey: "priorityVerbInactive"
      });
      return;
    }
    if (row.mfaAdminPct != null && row.mfaAdminPct < 80) {
      items.push({
        id: `mfa-${row.clientId}`,
        row,
        tone: "warn",
        label: row.clientName,
        meta: `MFA ${Math.round(row.mfaAdminPct)} %`,
        verbKey: "priorityVerbMfa"
      });
      return;
    }
    if (row.secureScoreCurrent != null && row.secureScoreMax > 0) {
      const pct = Math.round(row.secureScoreCurrent / row.secureScoreMax * 100);
      if (pct < 60) {
        items.push({
          id: `score-${row.clientId}`,
          row,
          tone: "warn",
          label: row.clientName,
          meta: `Secure Score ${pct} %`,
          verbKey: "priorityVerbScore"
        });
      }
    }
  });
  const toneOrder = {
    bad: 0,
    warn: 1
  };
  return items.sort((a, b) => (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9)).slice(0, 8);
}
export default function MicrosoftTenantMspDashboard({
  tenants = [],
  loading = false,
  syncing = false,
  onSync,
  copy,
  bcp47 = "en-US",
  onOpenTenant,
  onOpenClient
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const stats = useMemo(() => buildTenantStats(tenants), [tenants]);
  const priorityRows = useMemo(() => buildPriorityRows(tenants), [tenants]);
  const filteredRows = useMemo(() => {
    let rows = tenants;
    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(row => (row.clientName || "").toLowerCase().includes(query) || (row.tenantId || "").toString().toLowerCase().includes(query));
    }
    if (statusFilter !== "all") {
      rows = rows.filter(row => row.status === statusFilter);
    }
    return rows;
  }, [tenants, search, statusFilter]);
  const sortedRows = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      switch (sortBy) {
        case "clientName":
          {
            const cmp = getClientNameForSort(a.clientName).localeCompare(getClientNameForSort(b.clientName));
            return cmp * dir;
          }
        case "status":
          {
            const order = {
              actif: 0,
              inactif: 1
            };
            return ((order[a.status] ?? 2) - (order[b.status] ?? 2)) * dir;
          }
        case "tenantId":
          return (a.tenantId || "").toString().localeCompare((b.tenantId || "").toString(), undefined, {
            sensitivity: "base"
          }) * dir;
        case "userCount":
          return ((Number(a.userCount) || 0) - (Number(b.userCount) || 0)) * dir;
        case "totalLicenses":
          return ((Number(a.totalLicenses) || 0) - (Number(b.totalLicenses) || 0)) * dir;
        case "lastSync":
          {
            const ta = a.lastSync ? new Date(a.lastSync).getTime() : 0;
            const tb = b.lastSync ? new Date(b.lastSync).getTime() : 0;
            return (ta - tb) * dir;
          }
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
        case "mfaAdminPct":
          {
            const na = a.mfaAdminPct;
            const nb = b.mfaAdminPct;
            if (na == null && nb == null) return 0;
            if (na == null) return dir;
            if (nb == null) return -dir;
            return (na - nb) * dir;
          }
        case "mfaNonAdminPct":
          {
            const na = a.mfaNonAdminPct;
            const nb = b.mfaNonAdminPct;
            if (na == null && nb == null) return 0;
            if (na == null) return dir;
            if (nb == null) return -dir;
            return (na - nb) * dir;
          }
        default:
          return 0;
      }
    });
  }, [filteredRows, sortBy, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize, sortBy, sortDirection]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const openRow = row => onOpenTenant?.(row);
  const syncDisabled = tenants.length === 0 || syncing;
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
          <KpiCard icon="mdi:microsoft-azure" label={copy.kpi.tenants} value={formatNumber(stats.total)} tone="neutral" active={statusFilter === "all" && !search} onClick={() => {
          setStatusFilter("all");
          setSearch("");
        }} />
          <KpiCard icon="mdi:shield-check" label={copy.kpi.active} value={formatNumber(stats.active)} tone="good" active={statusFilter === "actif"} onClick={() => setStatusFilter(statusFilter === "actif" ? "all" : "actif")} />
          <KpiCard icon="mdi:shield-off" label={copy.kpi.inactive} value={formatNumber(stats.inactive)} tone="bad" active={statusFilter === "inactif"} onClick={() => setStatusFilter(statusFilter === "inactif" ? "all" : "inactif")} />
          <KpiCard icon="mdi:alert-circle-outline" label={copy.kpi.toReview} value={formatNumber(stats.issues)} tone={stats.issues > 0 ? "warn" : "good"} />
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
            {priorityRows.map(item => {
          const dotColor = item.tone === "bad" ? "#dc2626" : "#d97706";
          return <button key={item.id} type="button" className={styles.priorityItem} onClick={() => openRow(item.row)}>
                  <span className={styles.priorityDot} style={{
              background: dotColor
            }} />
                  <span className={styles.priorityBody}>
                    <span className={styles.priorityName}>{item.label}</span>
                    <span className={styles.priorityMeta}>{item.meta}</span>
                  </span>
                  <span className={styles.priorityVerb}>{copy[item.verbKey]}</span>
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
          <strong>{copy.formatCount("tenantCount", filteredRows.length)}</strong>
        </span>

        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconBtn} title={copy.syncTenants} aria-label={copy.syncTenants} onClick={() => onSync?.()} disabled={syncDisabled}>
            <FaSync className={syncing ? styles.spin : undefined} />
          </button>
        </div>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{copy.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon={tenants.length === 0 ? "mdi:microsoft-azure" : "mdi:magnify"} title={tenants.length === 0 ? copy.emptyTitleNone : copy.emptyTitleNoMatch} text={tenants.length === 0 ? copy.emptyTextNone : copy.emptyTextNoMatch} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label={copy.table.stateAria} />
                  <SortableHeader column="clientName" label={copy.table.client} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={copy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="tenantId" label={copy.table.tenantId} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="userCount" label={copy.table.users} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="totalLicenses" label={copy.table.licenses} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="secureScore" label={copy.table.secureScore} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="mfaAdminPct" label={copy.table.mfaAdmins} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="mfaNonAdminPct" label={copy.table.mfaUsers} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastSync" label={copy.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, index) => {
              const dotColor = row.status === "actif" ? "#2b5fab" : "#dc2626";
              return <tr key={`${row.clientId}-${index}`} className={styles.tableRow} onClick={() => openRow(row)} onMouseDown={e => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenTenant?.(row, {
                    background: true
                  });
                }
              }} style={{
                cursor: "pointer"
              }}>
                      <td>
                        <span className={styles.statusDot} style={{
                    background: dotColor
                  }} aria-hidden />
                      </td>
                      <td>
                        {row.clientId && onOpenClient ? <button type="button" className={styles.clientLink} onClick={e => {
                    e.stopPropagation();
                    onOpenClient(row);
                  }} title={copy.viewEnterprise}>
                            {formatClientDisplay(row.clientName)}
                          </button> : <span className={styles.cellName}>{formatClientDisplay(row.clientName)}</span>}
                      </td>
                      <td>
                        <span className={`${styles.chip} ${row.status === "actif" ? styles.chip_good : styles.chip_bad}`}>
                          {copy.status[row.status] || row.status}
                        </span>
                      </td>
                      <td className={styles.cellMuted}>{maskTenantId(row.tenantId)}</td>
                      <td>{row.userCount}</td>
                      <td>{row.totalLicenses}</td>
                      <td>{formatSecureScore(row.secureScoreCurrent, row.secureScoreMax)}</td>
                      <td>{formatMfaPct(row.mfaAdminPct)}</td>
                      <td>{formatMfaPct(row.mfaNonAdminPct)}</td>
                      <td className={styles.cellMuted}>
                        {row.lastSync ? new Date(row.lastSync).toLocaleString(bcp47) : "-"}
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>

          <div className={styles.paginationBar}>
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
              <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label={copy.prevPage}>
                <FaChevronLeft />
              </button>
              <span className={styles.paginationInfo}>
                {copy.formatPageOf(currentPage, totalPages)}
              </span>
              <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label={copy.nextPage}>
                <FaChevronRight />
              </button>
            </div>
          </div>
        </section>}
    </div>;
}
