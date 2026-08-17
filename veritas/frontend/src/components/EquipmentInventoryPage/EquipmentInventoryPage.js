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

function InventoryDeviceIcon({
  item,
  className
}) {
  if (item?.isCustom && item.familyIcon) {
    return <Icon icon={item.familyIcon} className={className} aria-hidden />;
  }
  return <EquipmentBrandIcon equipment={item} equipmentType={item?.type} className={className} />;
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
  ].filter(Boolean).join(" ").toLowerCase();
}

function typeLabel(item, locale) {
  if (item?.isCustom) return item.familyLabel || item.familyKey || item.type;
  return getLocalizedEquipmentTypeLabel(item?.familyLabel || item?.type, locale, item?.familyLabel || item?.type || "—");
}

function alertStatusMeta(item, copy) {
  const status = item?.alertStatus || (item?.alertSuspended ? "suspended" : item?.alertsEnabled ? "active" : "disabled");
  if (status === "active") {
    return {
      status,
      label: copy.alertStatus?.active || "Active",
      icon: "mdi:bell-ring-outline",
      className: styles.alertActive
    };
  }
  if (status === "suspended") {
    return {
      status,
      label: copy.alertStatus?.suspended || "Suspended",
      icon: "mdi:bell-sleep-outline",
      className: styles.alertSuspended
    };
  }
  return {
    status: "disabled",
    label: copy.alertStatus?.disabled || "Disabled",
    icon: "mdi:bell-off-outline",
    className: styles.alertDisabled
  };
}

function toEquipmentDetailPayload(item) {
  const uiType = item?.type === "Serveurs" ? "Servers" : item?.type === "Stockage" ? "Storage" : item?.type === "Videosurveillance" ? "Security camera" : item?.type;
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

export default function EquipmentInventoryPage({
  onNavigate
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentInventoryPageCopy(locale), [locale]);
  const { can } = usePermissions();
  const canBulkEdit = can("clients_detail.devices") || can("infrastructure.edit") || can("supervision.manage");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const loadAbortRef = useRef(null);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
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
      if (item.is_active === false) inactive += 1;else active += 1;
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
      if (!map.has(String(item.clientId))) {
        map.set(String(item.clientId), item.clientName || String(item.clientId));
      }
    });
    return [...map.entries()].map(([id, name]) => ({
      id,
      name
    })).sort((a, b) => a.name.localeCompare(b.name, locale, {
      sensitivity: "base"
    }));
  }, [items, locale]);

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
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, locale, {
      sensitivity: "base"
    }));
  }, [items, locale]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      if (clientFilter && String(item.clientId) !== clientFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (statusFilter === "active" && item.is_active === false) return false;
      if (statusFilter === "inactive" && item.is_active !== false) return false;
      if (q && !searchBlob(item).includes(q)) return false;
      return true;
    });
  }, [items, search, clientFilter, typeFilter, statusFilter]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems
  } = useTablePagination(filtered, {
    initialPageSize: 25,
    resetDeps: [search, clientFilter, typeFilter, statusFilter]
  });

  useEffect(() => {
    setOpenMenuKey(null);
  }, [search, clientFilter, typeFilter, statusFilter, page]);

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
      if (checked) next.add(itemId);else next.delete(itemId);
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

  const toggleType = next => {
    setTypeFilter(typeFilter === next ? "" : next);
  };

  const openItem = item => {
    if (!onNavigate || !item) return;
    onNavigate("EquipmentDetail", toEquipmentDetailPayload(item));
  };

  const hasFilters = Boolean(search.trim() || clientFilter || typeFilter || statusFilter !== "all");
  const statusCounts = {
    all: stats.total,
    active: stats.active,
    inactive: stats.inactive
  };

  return <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <MspPageHero eyebrow={copy.eyebrow} title={copy.pageTitle} subtitle={loading ? copy.loadingPortfolio : copy.formatSubtitle(filtered.length, items.length)} icon="mdi:devices" actions={<SmartTooltip content={copy.refresh}>
                <button type="button" className={layout.iconBtn} onClick={load} disabled={loading} aria-label={copy.refresh}>
                  <Icon icon="mdi:refresh" />
                </button>
              </SmartTooltip>} />

          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={layout.toolbar}>
                {!loading ? <div className={layout.statusChips} role="group">
                    {copy.statusFilterItems.map(item => {
                  const count = statusCounts[item.key] || 0;
                  const active = statusFilter === item.key;
                  return <button key={item.key} type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`} onClick={() => setStatusFilter(item.key)} disabled={count === 0}>
                          <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                            <Icon icon={item.icon} />
                          </span>
                          <span className={layout.statusChipLabel}>{item.label}</span>
                          <span className={layout.statusChipCount}>{count}</span>
                        </button>;
                })}
                  </div> : null}
                <select className={layout.sortSelect} value={clientFilter} onChange={e => setClientFilter(e.target.value)} aria-label={copy.filterClientAll}>
                  <option value="">{copy.filterClientAll}</option>
                  {clientOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
                <div className={layout.searchWrap}>
                  <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                  <input type="text" inputMode="search" enterKeyHint="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className={layout.searchInput} aria-label={copy.searchAria} />
                  {search ? <SmartTooltip content={copy.clearSearch}>
                      <button type="button" onClick={() => setSearch("")} className={layout.clearButton} aria-label={copy.clearSearch}>
                        <FaTimes />
                      </button>
                    </SmartTooltip> : null}
                </div>
                <span className={layout.toolbarMeta}>{filtered.length}</span>
              </div>

              {typeOptions.length > 0 ? <div className={`${layout.statusChips} ${styles.typeChipRow}`} role="group" aria-label={copy.filterTypeAria}>
                  <button type="button" className={`${layout.statusChip} ${!typeFilter ? layout.statusChipActive : ""}`} onClick={() => setTypeFilter("")} aria-pressed={!typeFilter}>
                    <span className={`${layout.statusChipIcon} ${layout.kpiIcon_blue}`}>
                      <Icon icon="mdi:devices" />
                    </span>
                    <span className={layout.statusChipLabel}>{copy.filterTypeAll}</span>
                    <span className={layout.statusChipCount}>{items.length}</span>
                  </button>
                  {typeOptions.map(opt => <button key={opt.id} type="button" className={`${layout.statusChip} ${typeFilter === opt.id ? layout.statusChipActive : ""}`} onClick={() => toggleType(opt.id)} aria-pressed={typeFilter === opt.id}>
                      <span className={`${layout.statusChipIcon} ${layout.kpiIcon_gray}`}>
                        <InventoryDeviceIcon item={opt.familyIcon ? {
                    isCustom: true,
                    familyIcon: opt.familyIcon
                  } : {
                    type: opt.id
                  }} className={styles.chipIcon} />
                      </span>
                      <span className={layout.statusChipLabel}>{opt.name}</span>
                      <span className={layout.statusChipCount}>{opt.count}</span>
                    </button>)}
                </div> : null}

              {loading ? <div className={layout.stateBox}>
                  <Icon icon="mdi:loading" className={layout.spinning} />
                  <span>{copy.loading}</span>
                </div> : filtered.length === 0 ? <div className={layout.emptyState}>
                  <Icon icon="mdi:devices" className={layout.emptyStateIcon} />
                  <p className={layout.emptyStateTitle}>{copy.emptyTitle}</p>
                  <p className={layout.emptyStateHint}>{hasFilters ? copy.emptyFiltered : copy.emptyHint}</p>
                </div> : <div className={layout.listBody}>
                  {selectedCount > 0 && canBulkEdit ? <div className={layout.bulkBar}>
                      <div className={layout.bulkInfo}>
                        <strong>{selectedCount}</strong>
                        <span>{selectedCount > 1 ? copy.bulk.selectedPlural : copy.bulk.selected}</span>
                      </div>
                      <div className={layout.bulkActions}>
                        {!allFilteredSelected ? <button type="button" className={layout.bulkBtnGhost} onClick={selectAllFiltered}>
                            {copy.formatSelectAllFiltered(filtered.length)}
                          </button> : null}
                        <button type="button" className={layout.bulkBtn} onClick={() => setBulkModalOpen(true)}>
                          <Icon icon="mdi:pencil-outline" />
                          {copy.bulk.edit}
                        </button>
                        <button type="button" className={layout.bulkBtnGhost} onClick={clearSelection}>
                          {copy.bulk.clearSelection}
                        </button>
                      </div>
                    </div> : null}
                  <div className={layout.listArea}>
                    <div className={layout.dataTableWrap}>
                      <table className={`${layout.dataTable} ${styles.ticketLikeTable}`}>
                        <thead>
                          <tr>
                            {canBulkEdit ? <th className={layout.checkboxCell}>
                                <input type="checkbox" className={layout.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} onClick={e => e.stopPropagation()} aria-label={copy.bulk.selectAll} />
                              </th> : null}
                            <th className={styles.brandCol} aria-hidden />
                            <th>{copy.columns.company}</th>
                            <th>{copy.columns.name}</th>
                            <th>{copy.columns.type}</th>
                            <th>{copy.columns.ip}</th>
                            <th>{copy.columns.serial}</th>
                            <th>{copy.columns.site}</th>
                            <th>{copy.columns.status}</th>
                            <th>{copy.columns.alerts}</th>
                            <th title={copy.alertsMonthHint}>{copy.columns.alertsMonth}</th>
                            <th className={styles.actionsCol}>{copy.columns.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedItems.map(item => {
                      const isSelected = selectedIds.has(item.id);
                      const alertMeta = alertStatusMeta(item, copy);
                      const monthCount = Number(item.alertsLastMonth) || 0;
                      return <tr key={item.id} className={`${layout.dataTableRow} ${isSelected ? layout.selectedRow : ""}`} onClick={() => openItem(item)} onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openItem(item);
                      }
                    }} role="button" tabIndex={0}>
                              {canBulkEdit ? <td className={layout.checkboxCell} onClick={e => e.stopPropagation()}>
                                  <input type="checkbox" className={layout.rowCheckbox} checked={isSelected} onChange={e => toggleItemSelection(item.id, e.target.checked)} aria-label={copy.formatBulkSelectRow(item.name)} />
                                </td> : null}
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
                              <td>
                                <span className={`${styles.alertBadge} ${alertMeta.className}`}>
                                  <Icon icon={alertMeta.icon} aria-hidden />
                                  {alertMeta.label}
                                </span>
                              </td>
                              <td className={styles.countCol} title={copy.alertsMonthHint}>
                                <span className={`${styles.countPill} ${monthCount > 0 ? styles.countPillHot : ""}`}>{monthCount}</span>
                              </td>
                              <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                                <InventoryEquipmentActions equipment={item} locale={locale} menuKey={item.id} openMenuKey={openMenuKey} onOpenChange={setOpenMenuKey} onOpen={openItem} />
                              </td>
                            </tr>;
                    })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {filtered.length > 0 ? <div className={layout.pagination}>
                      <div className={layout.paginationLeft}>
                        <span className={layout.paginationLabel}>{copy.perPage}</span>
                        <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className={layout.paginationRight}>
                        <SmartTooltip content={copy.prevPage}>
                          <button type="button" className={layout.pageBtn} onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label={copy.prevPage}>
                            <FaChevronLeft />
                          </button>
                        </SmartTooltip>
                        <span className={layout.paginationInfo}>{copy.formatPageInfo(page, totalPages)}</span>
                        <SmartTooltip content={copy.nextPage}>
                          <button type="button" className={layout.pageBtn} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label={copy.nextPage}>
                            <FaChevronRight />
                          </button>
                        </SmartTooltip>
                      </div>
                    </div> : null}
                </div>}
            </div>
          </main>
        </div>
      </div>
      <InventoryBulkEditModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} items={selectedItems} onSuccess={handleBulkSuccess} />
    </div>;
}
