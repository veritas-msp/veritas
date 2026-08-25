import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { getEquipmentInventoryList } from "../../api/equipment";
import { getLocalizedEquipmentTypeLabel } from "../../i18n/equipmentFamilyLabels";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useTablePagination } from "../AdminPage/useTablePagination";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import SmartTooltip from "../SmartTooltip";
import EquipmentBrandIcon from "../EquipementPage/constants/EquipmentBrandIcon";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { getEquipmentInventoryPageCopy } from "./equipmentInventoryPageI18n";
import InventoryEquipmentActions from "./InventoryEquipmentActions";
import InventoryBulkEditModal from "./InventoryBulkEditModal";
import { usePermissions } from "../../contexts/PermissionsContext";
import styles from "./EquipmentInventoryPage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";

function InventoryDeviceIcon({ item, className }) {
  if (item?.isCustom && item.familyIcon) {
    return <Icon icon={item.familyIcon} className={className} aria-hidden />;
  }
  return <EquipmentBrandIcon equipment={item} equipmentType={item?.type} className={className} />;
}

function compactSerial(value) {
  return String(value || "").toLowerCase().replace(/[\s\-_.]/g, "");
}

function searchBlob(item) {
  return [
    item?.name,
    item?.clientName,
    item?.type,
    item?.familyLabel,
    item?.ip,
    item?.serial,
    item?.mac,
    item?.location,
    item?.model
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesInventorySearch(item, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  if (searchBlob(item).includes(q)) return true;
  const serial = compactSerial(item?.serial);
  const qSerial = compactSerial(q);
  return Boolean(qSerial && serial.includes(qSerial));
}

function typeLabel(item, locale) {
  if (item?.isCustom) return item.familyLabel || item.familyKey || item.type;
  return getLocalizedEquipmentTypeLabel(
    item?.familyLabel || item?.type,
    locale,
    item?.familyLabel || item?.type || "—"
  );
}

function alertStatusMeta(item, copy) {
  const status =
    item?.alertStatus || (item?.alertSuspended ? "suspended" : item?.alertsEnabled ? "active" : "disabled");
  if (status === "active") {
    return {
      status,
      label: copy.alertStatus?.active || "Active",
      tone: "ok"
    };
  }
  if (status === "suspended") {
    return {
      status,
      label: copy.alertStatus?.suspended || "Suspended",
      tone: "warn"
    };
  }
  return {
    status: "disabled",
    label: copy.alertStatus?.disabled || "Disabled",
    tone: "off"
  };
}

function supervisionStatusMeta(item, copy) {
  const status = String(item?.supervisionStatus || "inactive").toLowerCase();
  if (status === "critical") {
    return {
      status,
      label: copy.supervisionStatus?.critical || "Critical",
      tone: "warn"
    };
  }
  if (status === "warning") {
    return {
      status,
      label: copy.supervisionStatus?.warning || "Warning",
      tone: "warn"
    };
  }
  if (status === "ok") {
    return {
      status,
      label: copy.supervisionStatus?.ok || "Active",
      tone: "ok"
    };
  }
  return {
    status: "inactive",
    label: copy.supervisionStatus?.inactive || "Inactive",
    tone: "off"
  };
}

function StatusDot({ tone, label }) {
  return (
    <SmartTooltip content={label}>
      <span
        className={`${styles.statusDot} ${
          tone === "ok" ? styles.statusDotOk : tone === "warn" ? styles.statusDotWarn : styles.statusDotOff
        }`}
        aria-label={label}
        role="img"
      />
    </SmartTooltip>
  );
}

function toEquipmentDetailPayload(item) {
  const uiType =
    item?.type === "Serveurs"
      ? "Servers"
      : item?.type === "Stockage"
        ? "Storage"
        : item?.type === "Videosurveillance"
          ? "Security camera"
          : item?.type;
  const dbId = item?.dbId || null;
  return {
    ...item,
    id: dbId || item.id,
    dbId,
    type: uiType,
    clientId: item.clientId,
    clientName: item.clientName,
    name: item.name
  };
}

function compareValues(a, b, locale) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), locale, { sensitivity: "base", numeric: true });
}

function getSortValue(item, key, locale) {
  switch (key) {
    case "company":
      return item.clientName || "";
    case "name":
      return item.name || "";
    case "type":
      return typeLabel(item, locale);
    case "ip":
      return item.ip || "";
    case "serial":
      return item.serial || "";
    case "site":
      return item.location || "";
    case "status":
      return item.is_active === false ? 1 : 0;
    case "alerts":
      return item?.alertStatus || (item?.alertSuspended ? "suspended" : item?.alertsEnabled ? "active" : "disabled");
    case "supervision":
      return item?.supervisionStatus || "inactive";
    case "alertsMonth":
      return Number(item.alertsLastMonth) || 0;
    default:
      return "";
  }
}

export default function EquipmentInventoryPage({ onNavigate }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentInventoryPageCopy(locale), [locale]);
  const { can } = usePermissions();
  const canBulkEdit = can("clients_detail.devices") || can("infrastructure.edit") || can("supervision.manage");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientFilterSearch, setClientFilterSearch] = useState("");
  const [selectedClients, setSelectedClients] = useState(() => new Set());
  const [selectedTypes, setSelectedTypes] = useState(() => new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ key: "company", dir: "asc" });
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const loadAbortRef = useRef(null);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = createTrackedAbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    try {
      const rows = await getEquipmentInventoryList({
        signal: ac.signal
      });
      if (!ac.signal.aborted) setItems(rows);
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(err.message || copy.toastLoadError);
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [copy.toastLoadError]);

  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    items.forEach(item => {
      if (item.is_active === false) inactive += 1;
      else active += 1;
    });
    return {
      total: items.length,
      active,
      inactive
    };
  }, [items]);

  const clientOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      if (item?.clientId == null) return;
      const id = String(item.clientId);
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
        return;
      }
      map.set(id, {
        id,
        name: item.clientName || id,
        count: 1
      });
    });
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, locale, {
        sensitivity: "base"
      })
    );
  }, [items, locale]);

  const filteredClientsForPane = useMemo(() => {
    const q = clientFilterSearch.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter(opt => opt.name.toLowerCase().includes(q));
  }, [clientOptions, clientFilterSearch]);

  const typeOptions = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const key = item?.type;
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }
      map.set(key, {
        id: key,
        name: typeLabel(item, locale),
        count: 1,
        familyIcon: item.isCustom ? item.familyIcon : null
      });
    });
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, locale, {
        sensitivity: "base"
      })
    );
  }, [items, locale]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter(item => {
      if (selectedClients.size > 0 && !selectedClients.has(String(item.clientId))) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(item.type)) return false;
      if (statusFilter === "active" && item.is_active === false) return false;
      if (statusFilter === "inactive" && item.is_active !== false) return false;
      if (q && !matchesInventorySearch(item, q)) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const cmp = compareValues(getSortValue(a, sort.key, locale), getSortValue(b, sort.key, locale), locale);
      return cmp * dir;
    });
    return list;
  }, [items, search, selectedClients, selectedTypes, statusFilter, sort, locale]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems
  } = useTablePagination(filtered, {
    initialPageSize: 25,
    resetDeps: [search, selectedClients, selectedTypes, statusFilter, sort.key, sort.dir]
  });

  useEffect(() => {
    setOpenMenuKey(null);
  }, [search, selectedClients, selectedTypes, statusFilter, page, sort]);

  useEffect(() => {
    setSelectedIds(prev => {
      if (!prev.size) return prev;
      const valid = new Set(items.map(item => item.id));
      const next = [...prev].filter(id => valid.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [items]);

  const pageIds = useMemo(() => paginatedItems.map(item => item.id), [paginatedItems]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(item => selectedIds.has(item.id));
  const selectedItems = useMemo(() => items.filter(item => selectedIds.has(item.id)), [items, selectedIds]);
  const clearSelection = () => setSelectedIds(new Set());
  const toggleItemSelection = (itemId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(item => item.id)));
  };
  const handleBulkSuccess = result => {
    const updated = Number(result?.updated) || 0;
    const failed = Array.isArray(result?.failed) ? result.failed.length : 0;
    if (updated > 0 && failed === 0) toast.success(copy.formatBulkSuccess(updated));
    else if (updated > 0 && failed > 0) toast.warn(copy.formatBulkPartial(updated, failed));
    else toast.error(copy.toasts?.bulkError || copy.toastLoadError);
    clearSelection();
    load();
  };

  const toggleClient = clientId => {
    const id = String(clientId);
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleType = typeId => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setClientFilterSearch("");
    setSelectedClients(new Set());
    setSelectedTypes(new Set());
    setStatusFilter("all");
  };

  const toggleSort = key => {
    setSort(prev =>
      prev.key === key
        ? {
            key,
            dir: prev.dir === "asc" ? "desc" : "asc"
          }
        : {
            key,
            dir: "asc"
          }
    );
  };

  const openItem = item => {
    if (!onNavigate || !item) return;
    onNavigate("EquipmentDetail", toEquipmentDetailPayload(item));
  };

  const hasFilters = Boolean(
    search.trim() || selectedClients.size > 0 || selectedTypes.size > 0 || statusFilter !== "all"
  );
  const statusCounts = {
    all: stats.total,
    active: stats.active,
    inactive: stats.inactive
  };

  const renderSortHeader = (key, label) => {
    const active = sort.key === key;
    return (
      <th
        className={`${styles.sortableTh} ${active ? styles.sortableThActive : ""}`}
        onClick={() => toggleSort(key)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className={styles.sortableThInner}>
          {label}
          <Icon
            icon={active ? (sort.dir === "asc" ? "mdi:arrow-up" : "mdi:arrow-down") : "mdi:unfold-more-horizontal"}
            className={styles.sortIcon}
            aria-hidden
          />
        </span>
      </th>
    );
  };

  const renderFilterItem = (key, label, count, active, onClick, iconNode) => (
    <button
      key={key}
      type="button"
      className={`${styles.filterItem} ${active ? styles.filterItemActive : ""} ${count === 0 ? styles.filterItemDisabled : ""}`}
      onClick={onClick}
      disabled={count === 0 && !active}
    >
      <span className={styles.filterItemMain}>
        <span className={styles.filterItemCount}>{count}</span>
        {iconNode}
        <span className={styles.filterItemLabel}>{label}</span>
      </span>
    </button>
  );

  return (
    <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <MspPageHero
            eyebrow={copy.eyebrow}
            title={copy.pageTitle}
            subtitle={loading ? copy.loadingPortfolio : copy.formatSubtitle(filtered.length, items.length)}
            icon="mdi:devices"
            actions={
              <SmartTooltip content={copy.refresh}>
                <button
                  type="button"
                  className={layout.iconBtn}
                  onClick={load}
                  disabled={loading}
                  aria-label={copy.refresh}
                >
                  <Icon icon="mdi:refresh" />
                </button>
              </SmartTooltip>
            }
          />

          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.inventoryShell}`}>
              <div className={styles.viewsLayout}>
                <aside className={styles.filtersPane} aria-label={copy.filters?.aria || "Filters"}>
                  <div className={styles.filtersPaneSection}>
                    <div className={styles.filtersPaneHeader}>
                      <span className={styles.filtersPaneTitle}>{copy.filters?.search || "Search"}</span>
                      {hasFilters ? (
                        <button type="button" className={styles.filtersPaneAction} onClick={clearFilters}>
                          {copy.filters?.clearAll || "Reset"}
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.filterSearchWrap}>
                      <Icon icon="mdi:magnify" className={styles.filterSearchIcon} aria-hidden />
                      <input
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        className={styles.filterSearchInput}
                        placeholder={copy.searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label={copy.searchAria}
                      />
                      {search ? (
                        <button
                          type="button"
                          className={styles.filterSearchClear}
                          onClick={() => setSearch("")}
                          aria-label={copy.clearSearch}
                        >
                          <FaTimes />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.filtersPaneSection}>
                    <div className={styles.filtersPaneHeader}>
                      <span className={styles.filtersPaneTitle}>{copy.filters?.status || "Status"}</span>
                    </div>
                    <div className={styles.filtersList}>
                      {copy.statusFilterItems.map(item =>
                        renderFilterItem(
                          item.key,
                          item.label,
                          statusCounts[item.key] || 0,
                          statusFilter === item.key,
                          () => setStatusFilter(item.key),
                          <Icon icon={item.icon} className={styles.filterItemIcon} aria-hidden />
                        )
                      )}
                    </div>
                  </div>

                  <div className={`${styles.filtersPaneSection} ${styles.filtersPaneSectionGrow}`}>
                    <div className={styles.filtersPaneHeader}>
                      <span className={styles.filtersPaneTitle}>{copy.filters?.companies || "Companies"}</span>
                      {selectedClients.size > 0 ? (
                        <button
                          type="button"
                          className={styles.filtersPaneAction}
                          onClick={() => setSelectedClients(new Set())}
                        >
                          {copy.filters?.clear || "Clear"}
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.filterSearchWrap}>
                      <Icon icon="mdi:magnify" className={styles.filterSearchIcon} aria-hidden />
                      <input
                        type="text"
                        className={styles.filterSearchInput}
                        value={clientFilterSearch}
                        onChange={e => setClientFilterSearch(e.target.value)}
                        placeholder={copy.filters?.searchCompany || copy.filterClientAll}
                        autoComplete="off"
                        aria-label={copy.filters?.searchCompany || copy.filterClientAll}
                      />
                      {clientFilterSearch ? (
                        <button
                          type="button"
                          className={styles.filterSearchClear}
                          onClick={() => setClientFilterSearch("")}
                          aria-label={copy.clearSearch}
                        >
                          <FaTimes />
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.filtersList}>
                      {filteredClientsForPane.length === 0 ? (
                        <p className={styles.filterHint}>{copy.filters?.noCompanyFound || "—"}</p>
                      ) : (
                        filteredClientsForPane.map(opt =>
                          renderFilterItem(
                            opt.id,
                            opt.name,
                            opt.count,
                            selectedClients.has(opt.id),
                            () => toggleClient(opt.id),
                            <Icon icon="mdi:office-building-outline" className={styles.filterItemIcon} aria-hidden />
                          )
                        )
                      )}
                    </div>
                  </div>

                  <div className={`${styles.filtersPaneSection} ${styles.filtersPaneSectionGrow}`}>
                    <div className={styles.filtersPaneHeader}>
                      <span className={styles.filtersPaneTitle}>{copy.filters?.types || "Types"}</span>
                      {selectedTypes.size > 0 ? (
                        <button
                          type="button"
                          className={styles.filtersPaneAction}
                          onClick={() => setSelectedTypes(new Set())}
                        >
                          {copy.filters?.clear || "Clear"}
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.filtersList}>
                      {typeOptions.map(opt =>
                        renderFilterItem(
                          opt.id,
                          opt.name,
                          opt.count,
                          selectedTypes.has(opt.id),
                          () => toggleType(opt.id),
                          <span className={styles.filterTypeIcon}>
                            <InventoryDeviceIcon
                              item={
                                opt.familyIcon
                                  ? { isCustom: true, familyIcon: opt.familyIcon }
                                  : { type: opt.id }
                              }
                              className={styles.chipIcon}
                            />
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </aside>

                <div className={styles.mainColumn}>
                  {loading ? (
                    <div className={layout.stateBox}>
                      <Icon icon="mdi:loading" className={layout.spinning} />
                      <span>{copy.loading}</span>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className={layout.emptyState}>
                      <Icon icon="mdi:devices" className={layout.emptyStateIcon} />
                      <p className={layout.emptyStateTitle}>{copy.emptyTitle}</p>
                      <p className={layout.emptyStateHint}>{hasFilters ? copy.emptyFiltered : copy.emptyHint}</p>
                    </div>
                  ) : (
                    <div className={styles.listBody}>
                      <div className={styles.tableToolbar}>
                        <span className={styles.tableMeta}>{filtered.length}</span>
                        {selectedCount > 0 && canBulkEdit ? (
                          <div className={layout.bulkActions}>
                            {!allFilteredSelected ? (
                              <button type="button" className={layout.bulkBtnGhost} onClick={selectAllFiltered}>
                                {copy.formatSelectAllFiltered(filtered.length)}
                              </button>
                            ) : null}
                            <button type="button" className={layout.bulkBtn} onClick={() => setBulkModalOpen(true)}>
                              <Icon icon="mdi:pencil-outline" />
                              {copy.bulk.edit}
                            </button>
                            <button type="button" className={layout.bulkBtnGhost} onClick={clearSelection}>
                              {copy.bulk.clearSelection}
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {selectedCount > 0 && canBulkEdit ? (
                        <div className={layout.bulkBar}>
                          <div className={layout.bulkInfo}>
                            <strong>{selectedCount}</strong>
                            <span>{selectedCount > 1 ? copy.bulk.selectedPlural : copy.bulk.selected}</span>
                          </div>
                        </div>
                      ) : null}

                      <div className={styles.listArea}>
                        <div className={layout.dataTableWrap}>
                          <table className={`${layout.dataTable} ${styles.ticketLikeTable}`}>
                            <thead>
                              <tr>
                                {canBulkEdit ? (
                                  <th className={layout.checkboxCell}>
                                    <input
                                      type="checkbox"
                                      className={layout.rowCheckbox}
                                      checked={allOnPageSelected}
                                      onChange={toggleSelectAllOnPage}
                                      onClick={e => e.stopPropagation()}
                                      aria-label={copy.bulk.selectAll}
                                    />
                                  </th>
                                ) : null}
                                <th className={styles.brandCol} aria-hidden />
                                {renderSortHeader("company", copy.columns.company)}
                                {renderSortHeader("name", copy.columns.name)}
                                {renderSortHeader("type", copy.columns.type)}
                                {renderSortHeader("ip", copy.columns.ip)}
                                {renderSortHeader("serial", copy.columns.serial)}
                                {renderSortHeader("site", copy.columns.site)}
                                {renderSortHeader("status", copy.columns.status)}
                                {renderSortHeader("alerts", copy.columns.alerts)}
                                {renderSortHeader("supervision", copy.columns.supervision)}
                                {renderSortHeader("alertsMonth", copy.columns.alertsMonth)}
                                <th className={styles.actionsCol}>{copy.columns.actions}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedItems.map(item => {
                                const isSelected = selectedIds.has(item.id);
                                const alertMeta = alertStatusMeta(item, copy);
                                const supervisionMeta = supervisionStatusMeta(item, copy);
                                const monthCount = Number(item.alertsLastMonth) || 0;
                                const monthTitle = copy.formatAlertsMonthBreakdown
                                  ? copy.formatAlertsMonthBreakdown(
                                      item.alertsNativeLastMonth,
                                      item.alertsSupervisionLastMonth
                                    )
                                  : copy.alertsMonthHint;
                                return (
                                  <tr
                                    key={item.id}
                                    className={`${layout.dataTableRow} ${isSelected ? layout.selectedRow : ""}`}
                                    onClick={() => openItem(item)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openItem(item);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {canBulkEdit ? (
                                      <td className={layout.checkboxCell} onClick={e => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          className={layout.rowCheckbox}
                                          checked={isSelected}
                                          onChange={e => toggleItemSelection(item.id, e.target.checked)}
                                          aria-label={copy.formatBulkSelectRow(item.name)}
                                        />
                                      </td>
                                    ) : null}
                                    <td className={styles.brandCol}>
                                      <InventoryDeviceIcon item={item} className={styles.brandIcon} />
                                    </td>
                                    <td>{item.clientName || "—"}</td>
                                    <td className={layout.colCompany}>{item.name || "—"}</td>
                                    <td>{typeLabel(item, locale)}</td>
                                    <td>{item.ip || "—"}</td>
                                    <td>{item.serial || "—"}</td>
                                    <td>{item.location || "—"}</td>
                                    <td>{item.is_active === false ? copy.status.inactive : copy.status.active}</td>
                                    <td className={styles.dotCol}>
                                      <StatusDot tone={alertMeta.tone} label={alertMeta.label} />
                                    </td>
                                    <td className={styles.dotCol}>
                                      <StatusDot tone={supervisionMeta.tone} label={supervisionMeta.label} />
                                    </td>
                                    <td className={styles.countCol} title={monthTitle}>
                                      <span
                                        className={`${styles.countPill} ${monthCount > 0 ? styles.countPillHot : ""}`}
                                      >
                                        {monthCount}
                                      </span>
                                    </td>
                                    <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                                      <InventoryEquipmentActions
                                        equipment={item}
                                        locale={locale}
                                        menuKey={item.id}
                                        openMenuKey={openMenuKey}
                                        onOpenChange={setOpenMenuKey}
                                        onOpen={openItem}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className={layout.pagination}>
                        <div className={layout.paginationLeft}>
                          <span className={layout.paginationLabel}>{copy.perPage}</span>
                          <select
                            className={layout.paginationSelect}
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <div className={layout.paginationRight}>
                          <SmartTooltip content={copy.prevPage}>
                            <button
                              type="button"
                              className={layout.pageBtn}
                              onClick={() => setPage(Math.max(1, page - 1))}
                              disabled={page <= 1}
                              aria-label={copy.prevPage}
                            >
                              <FaChevronLeft />
                            </button>
                          </SmartTooltip>
                          <span className={layout.paginationInfo}>{copy.formatPageInfo(page, totalPages)}</span>
                          <SmartTooltip content={copy.nextPage}>
                            <button
                              type="button"
                              className={layout.pageBtn}
                              onClick={() => setPage(Math.min(totalPages, page + 1))}
                              disabled={page >= totalPages}
                              aria-label={copy.nextPage}
                            >
                              <FaChevronRight />
                            </button>
                          </SmartTooltip>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <InventoryBulkEditModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        items={selectedItems}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
}
