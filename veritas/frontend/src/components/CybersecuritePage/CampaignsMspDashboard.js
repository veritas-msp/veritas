import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import styles from "./AntivirusMspDashboard.module.css";
const HERO_KPI_KEYS = [{
  key: "all",
  icon: "mdi:shield-lock",
  tone: "neutral"
}, {
  key: "active",
  icon: "mdi:shield-check",
  tone: "good"
}, {
  key: "en_preparation",
  icon: "mdi:calendar-clock",
  tone: "neutral"
}, {
  key: "suspendue",
  icon: "mdi:alert-circle-outline",
  tone: "warn"
}];
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
  getCampaignStatusMeta
}) {
  const meta = getCampaignStatusMeta(status);
  return <span className={`${styles.chip} ${styles[`chip_${meta.tone}`]}`}>{meta.label}</span>;
}
function ProgressCell({
  value
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const fillClass = pct >= 100 ? styles.progressFill_good : pct >= 75 ? styles.progressFill_warn : "";
  return <div className={styles.progressCell}>
      <div className={styles.progressTrack}>
        <div className={`${styles.progressFill} ${fillClass}`} style={{
        width: `${pct}%`
      }} />
      </div>
      <span className={styles.progressValue}>{pct}%</span>
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
function getClientNameForSort(value) {
  return (value || "").toString().trim().replace(/^\d+\s*[-\s]*\s*/, "").toLowerCase();
}
function buildCampaignStats(campaigns = []) {
  const list = Array.isArray(campaigns) ? campaigns : [];
  const statusCounts = {
    en_preparation: 0,
    active: 0,
    suspendue: 0,
    inactive: 0
  };
  list.forEach(campaign => {
    if (statusCounts[campaign.status] != null) statusCounts[campaign.status] += 1;
  });
  const issues = statusCounts.suspendue;
  const healthScore = list.length > 0 ? Math.round((list.length - issues) / list.length * 100) : 100;
  return {
    total: list.length,
    statusCounts,
    issues,
    healthScore
  };
}
function formatClientDisplay(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/\s*-\s*/g, " ");
}
export default function CampaignsMspDashboard({
  copy,
  campaigns = [],
  loading = false,
  onViewCampaign,
  onOpenClient,
  onAddCampaign
}) {
  const {
    formatDate
  } = useAppFormatters();
  const campaignsCopy = copy?.campaigns;
  const msp = copy?.msp;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("start_date");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const stats = useMemo(() => buildCampaignStats(campaigns), [campaigns]);
  const filteredRows = useMemo(() => {
    let rows = [...campaigns];
    if (search.trim()) {
      const query = search.toLowerCase();
      rows = rows.filter(campaign => campaign.client_name && campaign.client_name.toLowerCase().includes(query) || campaign.name && campaign.name.toLowerCase().includes(query) || campaign.type && copy.getCampaignTypeLabel(campaign.type).toLowerCase().includes(query));
    }
    if (statusFilter !== "all") {
      rows = rows.filter(campaign => campaign.status === statusFilter);
    }
    return rows;
  }, [campaigns, search, statusFilter, copy]);
  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    const order = sortDirection === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === "start_date" || sortBy === "end_date" || sortBy === "created_at") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
        return (aVal - bVal) * order;
      }
      if (sortBy === "global_progress") {
        aVal = Number(aVal) ?? 0;
        bVal = Number(bVal) ?? 0;
        return (aVal - bVal) * order;
      }
      if (sortBy === "client_name") {
        aVal = getClientNameForSort(aVal);
        bVal = getClientNameForSort(bVal);
        return aVal.localeCompare(bVal, copy?.locale || "fr") * order;
      }
      aVal = (aVal ?? "").toString().toLowerCase();
      bVal = (bVal ?? "").toString().toLowerCase();
      return aVal.localeCompare(bVal, copy?.locale || "fr") * order;
    });
    return rows;
  }, [filteredRows, sortBy, sortDirection, copy?.locale]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);
  const priorityRows = useMemo(() => campaigns.filter(campaign => campaign.status === "suspendue").slice(0, 8), [campaigns]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy, sortDirection, pageSize]);
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
  const formatDisplayDate = value => {
    if (!value) return "-";
    return formatDate(value) || "-";
  };
  const getHeroKpiValue = key => {
    if (key === "all") return stats.total;
    return stats.statusCounts[key] ?? 0;
  };
  const getHeroKpiLabel = key => {
    if (key === "all") return campaignsCopy?.statusFilters?.all || msp?.kpi?.solutions;
    if (key === "suspendue") return msp?.kpi?.todo;
    return campaignsCopy?.statusFilters?.[key];
  };
  if (!campaignsCopy || !msp) return null;
  return <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <HealthGauge score={stats.healthScore} label={campaignsCopy.healthLabel} />
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{campaignsCopy.eyebrow}</span>
            <h2 className={styles.heroTitle}>{msp.heroTitle}</h2>
            <p className={styles.heroDesc}>
              {stats.issues > 0 ? copy.formatCampaignHeroIssues(stats.issues) : campaignsCopy.heroDescOk}
            </p>
          </div>
        </div>
        <div className={styles.kpiRow}>
          {HERO_KPI_KEYS.map(item => {
          const isActive = item.key === "all" ? statusFilter === "all" : statusFilter === item.key;
          const tone = item.key === "suspendue" && stats.issues > 0 ? "warn" : item.tone;
          return <KpiCard key={item.key} icon={item.icon} label={getHeroKpiLabel(item.key)} value={getHeroKpiValue(item.key)} tone={tone} active={isActive} onClick={() => setStatusFilter(item.key === statusFilter && item.key !== "all" ? "all" : item.key)} />;
        })}
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
            {priorityRows.map(campaign => <button key={campaign.id} type="button" className={styles.priorityItem} onClick={() => onViewCampaign?.(campaign)}>
                <span className={styles.priorityDot} style={{
            background: "#dc2626"
          }} />
                <span className={styles.priorityBody}>
                  <span className={styles.priorityName}>{campaign.name}</span>
                  <span className={styles.priorityMeta}>
                    {formatClientDisplay(campaign.client_name)}
                    {campaign.end_date ? ` · ${msp.expPrefix} ${formatDisplayDate(campaign.end_date)}` : ""}
                  </span>
                </span>
                <span className={styles.priorityVerb}>{campaignsCopy.openCampaign}</span>
              </button>)}
          </div>
        </section> : null}

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={campaignsCopy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>

        <div className={styles.filterGroup} role="tablist" aria-label={msp.statusFilterAria}>
          {(copy.campaignStatusFilters || []).map(filter => <button key={filter.id} type="button" className={`${styles.filterChip} ${statusFilter === filter.id ? styles.filterChipActive : ""}`} onClick={() => setStatusFilter(filter.id)}>
              {filter.label}
            </button>)}
        </div>

        <span className={styles.toolbarMeta}>
          <strong>{copy.formatCampaignCount(filteredRows.length)}</strong>
        </span>

        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconBtn} onClick={onAddCampaign} title={campaignsCopy.addTitle}>
            <FaPlus />
          </button>
        </div>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{campaignsCopy.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:shield-lock-off" title={campaigns.length === 0 ? campaignsCopy.emptyTitle : msp.antivirus.noResultsTitle} text={campaigns.length === 0 ? campaignsCopy.emptyText : msp.antivirus.noResultsText} actionLabel={campaigns.length === 0 ? campaignsCopy.emptyCta : null} onAction={campaigns.length === 0 ? onAddCampaign : null} /> : <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label={msp.statusAria} />
                  <SortableHeader column="client_name" label={campaignsCopy.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="name" label={campaignsCopy.table.name} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="type" label={campaignsCopy.table.type} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={campaignsCopy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="start_date" label={campaignsCopy.table.startDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="end_date" label={campaignsCopy.table.endDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="global_progress" label={campaignsCopy.table.progress} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="created_at" label={campaignsCopy.table.createdAt} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(campaign => {
              const statusMeta = copy.getCampaignStatusMeta(campaign.status);
              const dotColor = statusMeta.tone === "bad" ? "#dc2626" : statusMeta.tone === "warn" ? "#d97706" : "#2b5fab";
              return <tr key={campaign.id} className={styles.tableRow} onClick={() => onViewCampaign?.(campaign)} onMouseDown={e => {
                if (e.button === 1) {
                  e.preventDefault();
                  onViewCampaign?.(campaign, {
                    background: true
                  });
                }
              }}>
                      <td>
                        <span className={styles.statusDot} style={{
                    background: dotColor
                  }} aria-hidden />
                      </td>
                      <td>
                        {campaign.client_id && onOpenClient ? <button type="button" className={styles.clientLink} onClick={e => {
                    e.stopPropagation();
                    onOpenClient({
                      clientId: campaign.client_id,
                      name: campaign.client_name
                    });
                  }} title={campaignsCopy.viewClient}>
                            {formatClientDisplay(campaign.client_name || `Client ${campaign.client_id}`)}
                          </button> : <span className={styles.cellName}>
                            {formatClientDisplay(campaign.client_name || `Client ${campaign.client_id}`)}
                          </span>}
                      </td>
                      <td>
                        <span className={styles.cellName} title={campaign.name}>
                          {campaign.name}
                        </span>
                      </td>
                      <td className={styles.cellMuted}>
                        {copy.getCampaignTypeLabel(campaign.type) || campaign.type}
                      </td>
                      <td>
                        <StatusChip status={campaign.status} getCampaignStatusMeta={copy.getCampaignStatusMeta} />
                      </td>
                      <td className={styles.cellMuted}>{formatDisplayDate(campaign.start_date)}</td>
                      <td className={styles.cellMuted}>{formatDisplayDate(campaign.end_date)}</td>
                      <td>
                        <ProgressCell value={campaign.global_progress} />
                      </td>
                      <td className={styles.cellMuted}>{formatDisplayDate(campaign.created_at)}</td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>
          {sortedRows.length > 0 ? <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <span className={styles.paginationLabel}>{campaignsCopy.rowsPerPage}</span>
                <select className={styles.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className={styles.paginationRight}>
                <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label={campaignsCopy.prevPage}>
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>
                  {copy.formatCampaignPageInfo(currentPage, totalPages)}
                </span>
                <button type="button" className={styles.paginationButton} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label={campaignsCopy.nextPage}>
                  <FaChevronRight />
                </button>
              </div>
            </div> : null}
        </section>}
    </div>;
}
