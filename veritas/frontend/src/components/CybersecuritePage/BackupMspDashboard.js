import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspDashboardSkeleton from "../Misc/Skeleton/MspDashboardSkeleton";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import SmartTooltip from "../SmartTooltip";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitScrollFadeShell, uiKitLayoutsStyles as kit } from "../UiKit";
import { isBackupJobMapped } from "./backupJobStatusUtils";
import { bulkRemoveBackupInstances, bulkSyncBackupJobs, isBackupJobSyncable } from "./backupBulkUtils";
import CyberBulkBar from "./CyberBulkBar";
import { fleetRowKey, useCyberBulkSelection } from "./useCyberBulkSelection";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./AntivirusMspDashboard.module.css";
import { buildBackupFleetFromClients, buildBackupInstanceDetailPayload, buildBackupInstanceFleetFromClients, filterBackupFleetRows, sortBackupFleetRows } from "../EquipementPage/backupMspUtils";
import SortableHeader from "../Misc/SortableHeader/SortableHeader";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";

async function syncCheckmkSaveJobs(payload = {}) {
  const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/sync`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sync failed");
  return data;
}

async function fetchCheckmkLastSync() {
  const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/last-sync`, {
    credentials: "include"
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.lastSync || null;
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

function InstanceTableRow({
  row,
  selected,
  selectLabel,
  onToggleSelect,
  onOpen
}) {
  const openRow = () => onOpen?.(row);
  const rowKey = fleetRowKey(row);
  return <tr className={`${styles.tableRow} ${selected ? styles.selectedRow : ""}`} onClick={openRow} onAuxClick={e => {
    if (e.button === 1) {
      e.preventDefault();
      onOpen?.(row, { background: true });
    }
  }} onKeyDown={e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow();
    }
  }} role="button" tabIndex={0}>
      <td className={styles.checkboxCell} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <input type="checkbox" className={styles.rowCheckbox} checked={selected} onChange={e => onToggleSelect(rowKey, e.target.checked)} onClick={e => e.stopPropagation()} aria-label={selectLabel} />
      </td>
      <td className={styles.cellName}>{row.clientName || "-"}</td>
      <td>
        <span className={styles.cellName} title={row.instanceName}>{row.instanceName || "-"}</span>
      </td>
      <td>
        <SolutionCell label={row.providerName || row.logiciel || "-"} subtitle={row.version || null} image={row.providerImage} icon={row.providerIcon || "mdi:backup-restore"} />
      </td>
      <td className={styles.cellMuted}>{row.server || "-"}</td>
      <td className={styles.cellMuted}>{row.version || "-"}</td>
      <td className={styles.cellName}>{row.jobsCount ?? 0}</td>
      <td className={styles.cellName}>{row.jobsMonitored ?? 0}</td>
      <td className={`${styles.cellName} ${row.jobsIssues > 0 ? styles.cellExpiry_bad : ""}`.trim()}>
        {row.jobsIssues ?? 0}
      </td>
      <td className={styles.rowOpenCell} aria-hidden>
        <Icon icon="mdi:chevron-right" className={styles.rowOpenChevron} />
      </td>
    </tr>;
}

export default function BackupMspDashboard({
  copy,
  clients = [],
  loading = false,
  onOpenInstance,
  onRefresh,
  onSync,
  syncing = false
}) {
  const {
    formatDateTime
  } = useAppFormatters();
  const msp = copy?.msp;
  const backup = msp?.backup;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jobsLastSyncDate, setJobsLastSyncDate] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const prevSyncingRef = useRef(false);
  const fleetSyncing = Boolean(onSync ? syncing : syncingAll);
  const jobRows = useMemo(() => buildBackupFleetFromClients(clients), [clients]);
  const instanceRows = useMemo(() => buildBackupInstanceFleetFromClients(clients), [clients]);
  const filteredRows = useMemo(() => filterBackupFleetRows(instanceRows, {
    search,
    statusFilter: "all"
  }), [instanceRows, search]);
  const sortedRows = useMemo(() => sortBackupFleetRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);
  const mappedJobsCount = useMemo(
    () => jobRows.filter(row => row.isMapped || isBackupJobMapped(row.raw || row)).length,
    [jobRows]
  );
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

  useEffect(() => {
    let cancelled = false;
    fetchCheckmkLastSync()
      .then(lastSync => {
        if (!cancelled && lastSync) setJobsLastSyncDate(lastSync);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prevSyncingRef.current && !fleetSyncing) {
      fetchCheckmkLastSync()
        .then(lastSync => {
          if (lastSync) setJobsLastSyncDate(lastSync);
        })
        .catch(() => {});
    }
    prevSyncingRef.current = fleetSyncing;
  }, [fleetSyncing]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, sortDirection, pageSize]);
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const handleSort = column => {
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection,
      defaultSortBy: "clientName",
      defaultSortDirection: "asc",
      getFirstDirection: col =>
        col === "jobsCount" || col === "jobsMonitored" || col === "jobsIssues" ? "desc" : "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
  };
  const formatDisplayDateTime = value => {
    if (!value) return "-";
    return formatDateTime(value) || "-";
  };
  const openInstanceDetail = (row, options = {}) => {
    onOpenInstance?.(buildBackupInstanceDetailPayload(row), options);
  };

  const refreshClients = useCallback(async () => {
    if (typeof onRefresh === "function") {
      await onRefresh();
    }
  }, [onRefresh]);

  const handleSyncAll = useCallback(async () => {
    if (onSync) {
      onSync();
      return;
    }
    if (syncingAll) return;
    setSyncingAll(true);
    try {
      const data = await syncCheckmkSaveJobs({});
      if (data.lastSync) setJobsLastSyncDate(data.lastSync);
      toast.success(
        data.message && data.updated != null
          ? `${data.message} (${data.updated})`
          : backup?.syncDone || "OK"
      );
      await refreshClients();
    } catch (err) {
      toast.error(err?.message || backup?.syncError || "Error");
    } finally {
      setSyncingAll(false);
    }
  }, [onSync, syncingAll, backup, refreshClients]);

  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      const result = await bulkRemoveBackupInstances(selectedItems);
      const failed = result.failed?.length || 0;
      if (result.deleted > 0 && failed === 0) toast.success(copy.formatBulkDeleteSuccess(result.deleted));
      else if (result.deleted > 0) toast.warn(copy.formatBulkDeletePartial(result.deleted, failed));
      else toast.error(copy.bulk.toasts.deleteError);
      clearSelection();
      setDeleteOpen(false);
      await refreshClients();
    } catch (error) {
      toast.error(error.message || copy.bulk.toasts.deleteError);
    } finally {
      setBusy(false);
    }
  };

  const resolveBulkSyncTargets = useCallback(() => {
    const instanceKeys = new Set(selectedItems.map(row => `${row.clientId}:${row.id}`));
    return jobRows.filter(job => {
      if (!isBackupJobSyncable(job)) return false;
      return instanceKeys.has(`${job.clientId}:${job.instanceId}`);
    });
  }, [selectedItems, jobRows]);

  const handleBulkRefresh = async () => {
    const targets = resolveBulkSyncTargets();
    if (targets.length === 0) {
      toast.info(copy.bulk.toasts.refreshNone);
      return;
    }
    setBusy(true);
    try {
      const result = await bulkSyncBackupJobs(targets);
      if (result.lastSync) setJobsLastSyncDate(result.lastSync);
      if (result.updated > 0) toast.success(copy.formatBulkRefreshSuccess(result.updated));
      else toast.error(copy.bulk.toasts.refreshError);
      if (result.skipped > 0) toast.info(copy.formatBulkRefreshSkipped(result.skipped));
      clearSelection();
      await refreshClients();
    } catch (error) {
      toast.error(error?.message || copy.bulk.toasts.refreshError);
    } finally {
      setBusy(false);
    }
  };

  if (!msp || !backup) return null;
  const emptyTitle = instanceRows.length === 0 ? backup.emptyInstancesTitle : backup.noResultsTitle;
  const emptyText = instanceRows.length === 0 ? backup.emptyInstancesText : backup.noResultsText;
  const searchPlaceholder = backup.searchInstancesPlaceholder || backup.searchPlaceholder;
  const lastSyncLabel = jobsLastSyncDate
    ? String(backup.lastSyncLabel || "Dernière sync : {date}").replace("{date}", formatDisplayDateTime(jobsLastSyncDate))
    : backup.lastSyncNever || "Dernière sync : jamais";
  const syncAllDisabled = fleetSyncing || mappedJobsCount === 0 || busy;

  return <div className={styles.dashboard}>
      {loading ? (
        <MspDashboardSkeleton rows={8} chipCount={4} columnCount={9} label={backup.loadingInstances || backup.loading} />
      ) : (
        <div className={layout.listBody}>
          <div className={layout.listArea}>
            <div className={layout.panelCard}>
              <UiKitCrmListToolbar
                searchValue={search}
                onSearchChange={setSearch}
                onSearchClear={() => setSearch("")}
                searchPlaceholder={searchPlaceholder}
                searchAriaLabel={searchPlaceholder}
                clearSearchLabel={msp.clearSearch || "Effacer"}
                extraActions={
                  <>
                    <span className={styles.toolbarMeta} title={lastSyncLabel}>
                      {lastSyncLabel}
                    </span>
                    <SmartTooltip content={backup.syncJobs}>
                      <button
                        type="button"
                        className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                        data-guide="cyber-sync"
                        aria-label={backup.syncJobsAria || backup.syncJobs}
                        onClick={handleSyncAll}
                        disabled={syncAllDisabled}
                      >
                        <Icon icon={fleetSyncing ? "mdi:loading" : "mdi:sync"} className={fleetSyncing ? styles.spin : undefined} aria-hidden />
                      </button>
                    </SmartTooltip>
                  </>
                }
              />

              {sortedRows.length === 0 ? (
                <div className={layout.emptyStateInCard}>
                  <UiKitEmptyState
                    bare
                    icon={instanceRows.length === 0 ? "mdi:backup-restore" : "mdi:magnify"}
                    title={emptyTitle}
                    text={emptyText}
                  />
                </div>
              ) : (
                <>
                  <UiKitScrollFadeShell
                    className={`${layout.dataTableWrap} ${styles.tableScroll}`}
                    deps={[paginatedRows.length, pageSize, search, sortBy, sortDirection]}
                  >
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.checkboxCell}>
                              <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label={copy.bulk.selectAll} />
                            </th>
                            <SortableHeader buttonClassName={styles.thBtn} column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="instanceName" label={msp.table.instance} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="providerName" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="server" label={msp.table.server} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="version" label={msp.table.version} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="jobsCount" label={msp.table.jobsCount} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="jobsMonitored" label={msp.table.jobsMonitored} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableHeader buttonClassName={styles.thBtn} column="jobsIssues" label={msp.table.jobsIssues} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                            <th className={styles.rowOpenCell} aria-label={backup.openDetail || msp.openDetail || "Détail"} />
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRows.map(row => {
                            const rowKey = fleetRowKey(row);
                            return <InstanceTableRow
                              key={rowKey}
                              row={row}
                              selected={selectedIds.has(rowKey)}
                              selectLabel={copy.formatBulkSelectRow(row.instanceName || row.clientName || "")}
                              onToggleSelect={toggleItem}
                              onOpen={openInstanceDetail}
                            />;
                          })}
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
            <CyberBulkBar
              copy={copy}
              selectedCount={selectedCount}
              allSelected={allSelected}
              filteredCount={sortedRows.length}
              busy={busy || fleetSyncing}
              onSelectAll={selectAll}
              onRefresh={handleBulkRefresh}
              onDelete={() => setDeleteOpen(true)}
              onClear={clearSelection}
            />
          ) : null}
        </div>
      )}
      <ConfirmModal open={deleteOpen} variant="danger" title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} confirmLabel={copy.bulk.deleteConfirm} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={handleBulkDelete} />
    </div>;
}
