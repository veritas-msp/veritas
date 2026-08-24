import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppFormatters } from "../../hooks/useAppGeneralSettings";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { bulkRemoveAntispamSolutions, syncAndPersistAntispamSolution } from "../EnterprisesPage/antispamSolutionUtils";
import styles from "./AntivirusMspDashboard.module.css";
import { buildAntispamFleetFromClients, buildAntispamFleetStats, filterAntispamFleetRows, sortAntispamFleetRows } from "./antispamMspUtils";
import CyberBulkBar from "./CyberBulkBar";
import { fleetRowKey, useCyberBulkSelection } from "./useCyberBulkSelection";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";

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

function expiryClass(status) {
  if (status === "expire_bientot") return styles.cellExpiry_warn;
  if (status === "inactif") return styles.cellExpiry_bad;
  return "";
}

function formatLicenseCount(value) {
  if (value == null || value === "") return "-";
  return String(value);
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
      <td>{statusMeta.label}</td>
      <td className={styles.cellMuted}>{formatLicenseCount(row.totalLicenses)}</td>
      <td className={styles.cellMuted}>{formatDomainCount(row.domainesSurveilles)}</td>
      <td className={`${styles.cellExpiry} ${expiryClass(row.status)}`.trim()}>{formatDate(row.expirationDate || row.expiration)}</td>
      <td className={styles.cellMuted}>{formatDateTime(row.lastSync)}</td>
    </tr>;
}

export default function AntispamMspDashboard({
  copy,
  clients = [],
  loading = false,
  onOpenSolution,
  onSolutionsChanged
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
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    clearSelection,
    toggleItem,
    toggleAll,
    selectAll
  } = useCyberBulkSelection(sortedRows, fleetRowKey);
  useEffect(() => () => abortRef.current?.abort(), []);
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
  const statusLabels = Object.fromEntries((copy.statusFilters || []).map(filter => [filter.id, filter.label]));
  return <div className={styles.dashboard}>
      <div className={styles.kpiStrip}>
        <KpiCard icon="mdi:email-secure-outline" label={msp.kpi.solutions} value={stats.total} tone="neutral" active={statusFilter === "all"} onClick={() => {
        setStatusFilter("all");
        setSearch("");
      }} />
        <KpiCard icon="mdi:shield-check" label={statusLabels.actif || msp.kpi.active} value={stats.statusCounts.actif} tone="good" active={statusFilter === "actif"} onClick={() => toggleStatus("actif")} />
        <KpiCard icon="mdi:clock-alert-outline" label={statusLabels.expire_bientot} value={stats.statusCounts.expire_bientot} tone="warn" active={statusFilter === "expire_bientot"} onClick={() => toggleStatus("expire_bientot")} />
        <KpiCard icon="mdi:shield-off-outline" label={statusLabels.inactif} value={stats.statusCounts.inactif} tone="bad" active={statusFilter === "inactif"} onClick={() => toggleStatus("inactif")} />
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input type="search" placeholder={as.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spin} width={28} />
          <span>{as.loading}</span>
        </div> : filteredRows.length === 0 ? <MspEmptyState icon="mdi:email-off-outline" title={fleetRows.length === 0 ? as.emptyTitle : as.noResultsTitle} text={fleetRows.length === 0 ? as.emptyText : as.noResultsText} /> : <section className={styles.panel}>
          <CyberBulkBar copy={copy} selectedCount={selectedCount} allSelected={allSelected} filteredCount={sortedRows.length} busy={busy} onSelectAll={selectAll} onRefresh={handleBulkRefresh} onDelete={() => setDeleteOpen(true)} onClear={clearSelection} />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input type="checkbox" className={styles.rowCheckbox} checked={allSelected} onChange={toggleAll} aria-label={copy.bulk.selectAll} />
                  </th>
                  <SortableHeader column="clientName" label={msp.table.enterprise} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="solutionLabel" label={msp.table.solution} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="status" label={msp.table.status} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="totalLicenses" label={msp.table.licenses || msp.table.coverage} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="domainesSurveilles" label={msp.table.domains || msp.table.coverage} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="expirationDate" label={msp.table.expiration} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader column="lastSync" label={msp.table.lastSync} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => <FleetTableRow key={fleetRowKey(row)} row={row} selected={selectedIds.has(fleetRowKey(row))} selectLabel={copy.formatBulkSelectRow(row.clientName)} onToggleSelect={toggleItem} onOpen={onOpenSolution} getStatusMeta={copy.getStatusMeta} formatDate={formatDisplayDate} formatDateTime={formatDisplayDateTime} onMiddleClick={(e, item) => {
              e.preventDefault();
              onOpenSolution?.(item, {
                background: true
              });
            }} />)}
              </tbody>
            </table>
          </div>
        </section>}
      <ConfirmModal open={deleteOpen} variant="danger" title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} confirmLabel={copy.bulk.deleteConfirm} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={handleBulkDelete} />
    </div>;
}
