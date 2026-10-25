import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspDashboardSkeleton from "../Misc/Skeleton/MspDashboardSkeleton";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import SmartTooltip from "../SmartTooltip";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitScrollFadeShell, uiKitLayoutsStyles as kit } from "../UiKit";
import StatusDot from "../shared/StatusDot/StatusDot";
import { bulkRemoveAntispamSolutions, syncAndPersistAntispamSolution } from "../EnterprisesPage/antispamSolutionUtils";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./AntivirusMspDashboard.module.css";
import { buildAntispamFleetFromClients, buildAntispamFleetStats, filterAntispamFleetRows, sortAntispamFleetRows } from "./antispamMspUtils";
import CyberBulkBar from "./CyberBulkBar";
import { fleetRowKey, useCyberBulkSelection } from "./useCyberBulkSelection";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";


function expiryClass(status) {
  if (status === "expire_bientot") return styles.cellExpiry_warn;
  if (status === "inactif") return styles.cellExpiry_bad;
  return "";
}

function StatusPill({ status, label }) {
  const isActive = status === "actif";
  return (
    <span className={`${layout.statusPill} ${isActive ? layout.statusPillActive : layout.statusPillInactive}`}>
      <StatusDot active={isActive} label="" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function formatLicenseCount(row) {
  if (row?.usedLicenses != null && row?.totalLicenses != null) return `${row.usedLicenses} / ${row.totalLicenses}`;
  if (row?.totalLicenses != null && row.totalLicenses !== "") return String(row.totalLicenses);
  if (row?.usedLicenses != null && row.usedLicenses !== "") return String(row.usedLicenses);
  return "-";
}

function formatDomainCount(value) {
  if (value == null || value === "") return "-";
  return String(value);
}

function SolutionCell({
  label,
  subtitle,
  image,
  icon
}) {
  return <div className={styles.solutionCell}>
      {image ? <img src={image} alt="" className={styles.solutionLogo} /> : icon ? <Icon icon={icon} className={styles.solutionLogoIcon} aria-hidden /> : null}
      <div className={styles.solutionText}>
        <span className={styles.cellName} title={label}>{label}</span>
        {subtitle ? <span className={styles.cellSub} title={subtitle}>{subtitle}</span> : null}
      </div>
    </div>;
}

function isRefreshable(row) {
  return row?.providerId === "mailinblack" && row?.customerId && row?.raw;
}

function FleetTableRow({
  row,
  selected,
  selectLabel,
  onToggleSelect,
  onOpen,
  onMiddleClick,
  getStatusMeta,
  formatDate,
  formatDateTime
}) {
  const statusMeta = getStatusMeta(row.status);
  const openRow = () => onOpen?.(row);
  const rowKey = fleetRowKey(row);
  return <tr className={`${styles.tableRow} ${selected ? styles.selectedRow : ""}`} onClick={openRow} onMouseDown={e => {
    if (e.button === 1) onMiddleClick?.(e, row);
  }} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow();
    }
  }} role="button" tabIndex={0}>
      <td className={styles.checkboxCell} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <input type="checkbox" className={styles.rowCheckbox} checked={selected} onChange={e => onToggleSelect(rowKey, e.target.checked)} onClick={e => e.stopPropagation()} aria-label={selectLabel} />
      </td>
      <td className={styles.cellName}>{row.clientName}</td>
      <td>
        <SolutionCell label={row.solutionLabel || row.providerName || "-"} subtitle={row.solutionSubtitle || null} image={row.providerImage} icon={row.providerIcon || "mdi:email-secure-outline"} />
      </td>
      <td>
        <StatusPill status={row.status} label={statusMeta.label} />
      </td>
      <td className={styles.cellMuted}>{formatLicenseCount(row)}</td>
      <td className={styles.cellMuted}>{formatDomainCount(row.domainesSurveilles)}</td>
      <td className={`${styles.cellExpiry} ${expiryClass(row.status)}`.trim()}>{formatDate(row.expirationDate || row.expiration)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastSync)}</td>
      <td className={styles.rowOpenCell} aria-hidden>
        <Icon icon="mdi:chevron-right" className={styles.rowOpenChevron} />
      </td>
    </tr>;
}

export default function AntispamMspDashboard({
  copy,
  clients = [],
  loading = false,
  onOpenSolution,
  onSolutionsChanged,
  onSync,
  syncing = false
}) {
  const {
    formatDate,
    formatDateTime
  } = useAppFormatters();
  const msp = copy?.msp;
  const as = msp?.antispam;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);
  const fleetRows = useMemo(() => buildAntispamFleetFromClients(clients), [clients]);
  const stats = useMemo(() => buildAntispamFleetStats(fleetRows), [fleetRows]);
  const filteredRows = useMemo(() => filterAntispamFleetRows(fleetRows, {
    search,
    statusFilter,
    providerFilter: "all"
  }), [fleetRows, search, statusFilter]);
  const sortedRows = useMemo(() => sortAntispamFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
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
  } = useCyberBulkSelection(sortedRows, fleetRowKey);
  const pageIds = useMemo(() => paginatedRows.map(fleetRowKey), [paginatedRows]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const toggleSelectAllOnPage = () => {
    toggleMany(pageIds, !allOnPageSelected);
  };
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy, sortDirection, pageSize]);
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);
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
    if (value == null || value === "" || value === 0 || value === "0") return "-";
    return formatDate(value) || "-";
  };
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  const reload = useCallback(async () => {
    await onSolutionsChanged?.();
  }, [onSolutionsChanged]);
  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      const result = await bulkRemoveAntispamSolutions(selectedItems);
      const failed = result.failed?.length || 0;
      if (result.deleted > 0 && failed === 0) toast.success(copy.formatBulkDeleteSuccess(result.deleted));
      else if (result.deleted > 0) toast.warn(copy.formatBulkDeletePartial(result.deleted, failed));
      else toast.error(copy.bulk.toasts.deleteError);
      clearSelection();
      setDeleteOpen(false);
      await reload();
    } catch (error) {
      toast.error(error.message || copy.bulk.toasts.deleteError);
    } finally {
      setBusy(false);
    }
  };
  const handleBulkRefresh = async () => {
    const targets = selectedItems.filter(isRefreshable);
    if (targets.length === 0) {
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
      for (const row of targets) {
        if (controller.signal.aborted) break;
        try {
          const mappingMode = row.raw.mappingMode === "dedicated" || row.raw.mailinblackTenantId ? "dedicated" : "reseller";
          await syncAndPersistAntispamSolution(row.clientId, {
            ...row.raw,
            mappingMode,
            mailinblackTenantId: mappingMode === "dedicated" ? row.raw.mailinblackTenantId : null
          }, {
            signal: controller.signal
          });
          success += 1;
        } catch (error) {
          if (error?.name === "AbortError") break;
          failed += 1;
        }
      }
      if (controller.signal.aborted) return;
      const skipped = selectedItems.length - targets.length;
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
  if (!msp || !as) return null;
  const statusFilterItems = copy.statusFilters || [];
  return <div className={styles.dashboard}>
      {loading ? (
        <MspDashboardSkeleton rows={8} chipCount={4} columnCount={8} label={as.loading} />
      ) : (
        <div className={layout.listBody}>
          <div className={layout.listArea}>
            <div className={layout.panelCard}>
              <UiKitCrmListToolbar
                searchValue={search}
                onSearchChange={setSearch}
                onSearchClear={() => setSearch("")}
                searchPlaceholder={as.searchPlaceholder}
                searchAriaLabel={as.searchPlaceholder}
                clearSearchLabel={msp.clearSearch || "Effacer"}
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
                    <SmartTooltip content={copy.heroActions?.syncAntispam}>
                      <button
                        type="button"
                        className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                        data-guide="cyber-sync"
                        aria-label={copy.heroActions?.syncAntispamAria || copy.heroActions?.syncAntispam}
                        onClick={onSync}
                        disabled={syncing || fleetRows.length === 0}
                      >
                        <Icon icon={syncing ? "mdi:loading" : "mdi:sync"} className={syncing ? styles.spin : undefined} aria-hidden />
                      </button>
                    </SmartTooltip>
                  ) : null
                }
              />

              {filteredRows.length === 0 ? (
                <div className={layout.emptyStateInCard}>
                  <UiKitEmptyState
                    bare
                    icon="mdi:email-off-outline"
                    title={fleetRows.length === 0 ? as.emptyTitle : as.noResultsTitle}
                    text={fleetRows.length === 0 ? as.emptyText : as.noResultsText}
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
                            <th className={styles.checkboxCell}>
                              <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label={copy.bulk.selectAll} />
                            </th>
                            <SortableHeader buttonClassName={styles.thBtn} column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="solutionLabel" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="status" label={msp.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="totalLicenses" label={msp.table.licenses || msp.table.coverage} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="domainesSurveilles" label={msp.table.domains || msp.table.coverage} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="expirationDate" label={msp.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="lastSync" label={msp.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <th className={styles.rowOpenCell} aria-label={as.openDetail || msp.openDetail || "Détail"} />
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRows.map(row => <FleetTableRow key={fleetRowKey(row)} row={row} selected={selectedIds.has(fleetRowKey(row))} selectLabel={copy.formatBulkSelectRow(row.clientName)} onToggleSelect={toggleItem} onOpen={onOpenSolution} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
                        e.preventDefault();
                        onOpenSolution?.(item, {
                          background: true
                        });
                      }} />)}
                        </tbody>
                      </table>
                  </UiKitScrollFadeShell>
                  <div className={`${layout.pagination} ${layout.paginationEmbedded}`}>
                    <div className={layout.paginationLeft}>
                      <span className={layout.paginationLabel}>{msp.rowsPerPage}</span>
                      <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className={layout.paginationRight}>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label={msp.prevPage}>
                        <FaChevronLeft />
                      </button>
                      <span className={layout.paginationInfo}>
                        {copy.formatMspPageInfo(currentPage, totalPages)}
                      </span>
                      <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label={msp.nextPage}>
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {selectedCount > 0 ? (
            <CyberBulkBar copy={copy} selectedCount={selectedCount} allSelected={allSelected} filteredCount={sortedRows.length} busy={busy} onSelectAll={selectAll} onRefresh={handleBulkRefresh} onDelete={() => setDeleteOpen(true)} onClear={clearSelection} />
          ) : null}
        </div>
      )}
      <ConfirmModal open={deleteOpen} variant="danger" title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} confirmLabel={copy.bulk.deleteConfirm} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={handleBulkDelete} />
    </div>;
}
