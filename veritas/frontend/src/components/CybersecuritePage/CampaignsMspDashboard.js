import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import { deleteCampaign, updateClientCampaign } from "../../api/campaigns";
import API_BASE_URL from "../../config";
import MspDashboardSkeleton from "../Misc/Skeleton/MspDashboardSkeleton";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitTable, uiKitTableStyles as tableKit } from "../UiKit";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./AntivirusMspDashboard.module.css";
import CyberBulkBar from "./CyberBulkBar";
import CyberBulkEditModal from "./CyberBulkEditModal";
import { useCyberBulkSelection } from "./useCyberBulkSelection";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";

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
  const [pageSize, setPageSize] = useState(50);
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
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection,
      defaultSortBy: "start_date",
      defaultSortDirection: "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
  };
  const formatDisplayDate = value => {
    if (!value) return "-";
    return formatDate(value) || "-";
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
  const statusFilterItems = copy.campaignStatusFilters || [];
  return <div className={styles.dashboard}>
      {loading ? (
        <MspDashboardSkeleton rows={8} chipCount={0} columnCount={8} label={campaignsCopy.loading} />
      ) : (
        <div className={layout.listBody}>
          <div className={layout.listArea}>
            <div className={layout.panelCard}>
              <UiKitCrmListToolbar
                searchValue={search}
                onSearchChange={setSearch}
                onSearchClear={() => setSearch("")}
                searchPlaceholder={campaignsCopy.searchPlaceholder}
                searchAriaLabel={campaignsCopy.searchPlaceholder}
                clearSearchLabel={msp.clearSearch || "Effacer"}
                filters={statusFilterItems.map(item => {
                  const count = stats.statusCounts[item.id] || 0;
                  const active = statusFilter === item.id;
                  return <button key={item.id} type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`} onClick={() => setStatusFilter(item.id === statusFilter ? "all" : item.id)} disabled={count === 0}>
                      <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                        <Icon icon={item.icon} />
                      </span>
                      <span className={layout.statusChipLabel}>{item.label}</span>
                      <span className={layout.statusChipCount}>{count}</span>
                    </button>;
                })}
                createAction={
                  onAddCampaign
                    ? {
                        label: copy.heroActions?.addCampaign || campaignsCopy.emptyCta,
                        ariaLabel: copy.heroActions?.addCampaign || campaignsCopy.emptyCta,
                        onClick: onAddCampaign,
                        icon: "mdi:plus"
                      }
                    : null
                }
              />

              {filteredRows.length === 0 ? (
                <div className={layout.emptyStateInCard}>
                  <UiKitEmptyState
                    bare
                    icon="mdi:bullhorn-outline"
                    title={campaigns.length === 0 ? campaignsCopy.emptyTitle : msp.antivirus.noResultsTitle}
                    text={campaigns.length === 0 ? campaignsCopy.emptyText : msp.antivirus.noResultsText}
                  />
                  {campaigns.length === 0 && onAddCampaign ? (
                    <button type="button" className={layout.primaryBtn} onClick={onAddCampaign}>
                      <Icon icon="mdi:plus" aria-hidden />
                      {campaignsCopy.emptyCta}
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <UiKitTable
                    fill
                    className={tableKit.tableListFill}
                    deps={[paginatedRows.length, pageSize, search, statusFilter, sortBy, sortDirection]}
                  >
                      <table className={`${tableKit.table} ${tableKit.tableList} ${styles.table}`}>
                        <thead>
                          <tr>
                            <th className={styles.checkboxCell}>
                              <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label={copy.bulk.selectAll} />
                            </th>
                            <SortableHeader buttonClassName={styles.thBtn} column="client_name" label={campaignsCopy.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="name" label={campaignsCopy.table.name} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="type" label={campaignsCopy.table.type} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="status" label={campaignsCopy.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="start_date" label={campaignsCopy.table.startDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="end_date" label={campaignsCopy.table.endDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="global_progress" label={campaignsCopy.table.progress} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="created_at" label={campaignsCopy.table.createdAt} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <th className={styles.rowOpenCell} aria-label={campaignsCopy.openDetail || "Détail"} />
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
                                <td className={styles.rowOpenCell} aria-hidden>
                                  <Icon icon="mdi:chevron-right" className={styles.rowOpenChevron} />
                                </td>
                              </tr>;
                      })}
                        </tbody>
                      </table>
                  </UiKitTable>
                  <div className={`${layout.pagination} ${layout.paginationEmbedded}`}>
                    <div className={layout.paginationLeft}>
                      <span className={layout.paginationLabel}>{campaignsCopy.rowsPerPage}</span>
                      <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className={layout.paginationRight}>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label={campaignsCopy.prevPage}>
                        <FaChevronLeft />
                      </button>
                      <span className={layout.paginationInfo}>
                        {copy.formatCampaignPageInfo(currentPage, totalPages)}
                      </span>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label={campaignsCopy.nextPage}>
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {selectedCount > 0 ? (
            <CyberBulkBar copy={copy} selectedCount={selectedCount} allSelected={allSelected} filteredCount={sortedRows.length} busy={busy} onSelectAll={selectAll} onEdit={() => setEditOpen(true)} onRefresh={handleBulkRefresh} onDelete={() => setDeleteOpen(true)} onClear={clearSelection} />
          ) : null}
        </div>
      )}
      <CyberBulkEditModal open={editOpen} kind="campaigns" items={selectedItems} copy={copy} campaignStatuses={copy.campaignStatuses || []} onClose={() => setEditOpen(false)} onSubmit={handleBulkEdit} />
      <ConfirmModal open={deleteOpen} variant="danger" title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} confirmLabel={copy.bulk.deleteConfirm} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={handleBulkDelete} />
    </div>;
}
