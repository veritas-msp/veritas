import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import { deleteCampaign, updateClientCampaign } from "../../api/campaigns";
import API_BASE_URL from "../../config";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import SmartTooltip from "../SmartTooltip";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./AntivirusMspDashboard.module.css";
import CyberBulkBar from "./CyberBulkBar";
import CyberBulkEditModal from "./CyberBulkEditModal";
import { useCyberBulkSelection } from "./useCyberBulkSelection";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const HERO_KPI_KEYS = [{
  key: "all",
  icon: "mdi:bullhorn-outline",
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
  return {
    total: list.length,
    statusCounts,
    issues
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
  onAddCampaign,
  onCampaignsChanged
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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);
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
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    clearSelection,
    toggleItem,
    toggleMany,
    selectAll
  } = useCyberBulkSelection(sortedRows);
  const pageIds = useMemo(() => paginatedRows.map(campaign => campaign.id), [paginatedRows]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const toggleSelectAllOnPage = () => {
    toggleMany(pageIds, !allOnPageSelected);
  };
  useEffect(() => () => abortRef.current?.abort(), []);
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
    if (key === "all") return campaignsCopy?.eyebrow || msp?.kpi?.solutions;
    return campaignsCopy?.statusFilters?.[key];
  };
  const reload = useCallback(async () => {
    await onCampaignsChanged?.();
  }, [onCampaignsChanged]);
  const handleBulkEdit = async fields => {
    let updated = 0;
    let failed = 0;
    for (const campaign of selectedItems) {
      try {
        await updateClientCampaign(campaign.client_id, campaign.id, {
          ...campaign,
          ...fields
        });
        updated += 1;
      } catch {
        failed += 1;
      }
    }
    if (updated > 0 && failed === 0) toast.success(copy.formatBulkEditSuccess(updated));
    else if (updated > 0) toast.warn(copy.formatBulkEditPartial(updated, failed));
    else toast.error(copy.bulk.toasts.editError);
    clearSelection();
    await reload();
  };
  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      let deleted = 0;
      let failed = 0;
      for (const campaign of selectedItems) {
        try {
          await deleteCampaign(campaign.id);
          deleted += 1;
        } catch {
          failed += 1;
        }
      }
      if (deleted > 0 && failed === 0) toast.success(copy.formatBulkDeleteSuccess(deleted));
      else if (deleted > 0) toast.warn(copy.formatBulkDeletePartial(deleted, failed));
      else toast.error(copy.bulk.toasts.deleteError);
      clearSelection();
      setDeleteOpen(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };
  const handleBulkRefresh = async () => {
    const msCampaigns = selectedItems.filter(campaign => campaign.type === "microsoft_security" && campaign.client_id);
    const clientIds = [...new Set(msCampaigns.map(campaign => campaign.client_id))];
    if (clientIds.length === 0) {
      toast.info(copy.bulk.toasts.refreshNone);
      return;
    }
    abortRef.current?.abort();
    const controller = createTrackedAbortController();
    abortRef.current = controller;
    setBusy(true);
    let success = 0;
    let failed = 0;
    try {
      for (const clientId of clientIds) {
        if (controller.signal.aborted) break;
        try {
          const endDate = new Date();
          const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          const response = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${clientId}&period=D30&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          success += msCampaigns.filter(campaign => campaign.client_id === clientId).length;
        } catch (error) {
          if (error?.name === "AbortError") break;
          failed += msCampaigns.filter(campaign => campaign.client_id === clientId).length;
        }
      }
      if (controller.signal.aborted) return;
      const skipped = selectedItems.length - msCampaigns.length;
      if (success > 0 && failed === 0) toast.success(copy.formatBulkRefreshSuccess(success));
      else if (success > 0) toast.warn(copy.formatBulkRefreshPartial(success, failed));
      else toast.error(copy.bulk.toasts.refreshError);
      if (skipped > 0) toast.info(copy.formatBulkRefreshSkipped(skipped));
      clearSelection();
      await reload();
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };
  if (!campaignsCopy || !msp) return null;
  return <div className={styles.dashboard}>
      <div className={styles.kpiStrip}>
        {HERO_KPI_KEYS.map(item => {
          const isActive = item.key === "all" ? statusFilter === "all" : statusFilter === item.key;
          const tone = item.key === "suspendue" && stats.issues > 0 ? "warn" : item.tone;
          return <KpiCard key={item.key} icon={item.icon} label={getHeroKpiLabel(item.key)} value={getHeroKpiValue(item.key)} tone={tone} active={isActive} onClick={() => setStatusFilter(item.key === statusFilter && item.key !== "all" ? "all" : item.key)} />;
        })}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={campaignsCopy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {onAddCampaign ? <div className={styles.toolbarActions}>
            <SmartTooltip content={copy.heroActions?.addCampaign || campaignsCopy.emptyCta}>
              <button type="button" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} onClick={onAddCampaign} aria-label={copy.heroActions?.addCampaign || campaignsCopy.emptyCta}>
                <Icon icon="mdi:plus" aria-hidden />
              </button>
            </SmartTooltip>
          </div> : null}
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{campaignsCopy.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:shield-lock-off" title={campaigns.length === 0 ? campaignsCopy.emptyTitle : msp.antivirus.noResultsTitle} text={campaigns.length === 0 ? campaignsCopy.emptyText : msp.antivirus.noResultsText} actionLabel={campaigns.length === 0 ? campaignsCopy.emptyCta : null} onAction={campaigns.length === 0 ? onAddCampaign : null} /> : <section className={styles.panel}>
          <CyberBulkBar copy={copy} selectedCount={selectedCount} allSelected={allSelected} filteredCount={sortedRows.length} busy={busy} onSelectAll={selectAll} onEdit={() => setEditOpen(true)} onRefresh={handleBulkRefresh} onDelete={() => setDeleteOpen(true)} onClear={clearSelection} />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label={copy.bulk.selectAll} />
                  </th>
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
              const openRow = () => onViewCampaign?.(campaign);
              const isSelected = selectedIds.has(campaign.id);
              return <tr key={campaign.id} className={`${styles.tableRow} ${isSelected ? styles.selectedRow : ""}`} onClick={openRow} onMouseDown={e => {
                if (e.button === 1) {
                  e.preventDefault();
                  onViewCampaign?.(campaign, {
                    background: true
                  });
                }
              }} onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openRow();
                }
              }} role="button" tabIndex={0}>
                      <td className={styles.checkboxCell} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                        <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} onChange={e => toggleItem(campaign.id, e.target.checked)} onClick={e => e.stopPropagation()} aria-label={copy.formatBulkSelectRow(campaign.name || campaign.client_name)} />
                      </td>
                      <td className={styles.cellName}>{formatClientDisplay(campaign.client_name || `Client ${campaign.client_id}`)}</td>
                      <td>{campaign.name || "-"}</td>
                      <td className={styles.cellMuted}>{copy.getCampaignTypeLabel(campaign.type) || campaign.type || "-"}</td>
                      <td>{statusMeta.label}</td>
                      <td className={styles.cellMuted}>{formatDisplayDate(campaign.start_date)}</td>
                      <td className={styles.cellMuted}>{formatDisplayDate(campaign.end_date)}</td>
                      <td className={styles.cellMuted}>{Math.max(0, Math.min(100, Number(campaign.global_progress) || 0))}%</td>
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
      <CyberBulkEditModal open={editOpen} kind="campaigns" items={selectedItems} copy={copy} campaignStatuses={copy.campaignStatuses || []} onClose={() => setEditOpen(false)} onSubmit={handleBulkEdit} />
      <ConfirmModal open={deleteOpen} variant="danger" title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} confirmLabel={copy.bulk.deleteConfirm} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={handleBulkDelete} />
    </div>;
}
