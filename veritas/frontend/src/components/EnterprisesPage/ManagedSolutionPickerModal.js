import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { getIconPath } from "../../utils/assetHelper";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import formStyles from "./EnterpriseFormModal.module.css";
import pickerStyles from "./AntivirusSolutionPickerModal.module.css";
function PickerRow({
  item,
  index,
  isManaging,
  busy,
  deletingKey,
  itemKey,
  icon,
  image,
  iconColor,
  label,
  meta,
  trailingIcon,
  onSelect,
  onEdit,
  onDelete,
  canReorder = false,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) {
  const isDeleting = deletingKey === itemKey;
  const isDragging = draggedIndex === index;
  const isDragOver = dragOverIndex === index && draggedIndex !== index;
  return <div className={`${pickerStyles.solutionRow} ${isManaging ? pickerStyles.solutionRowManaging : ""} ${isDragOver ? pickerStyles.solutionRowDragOver : ""} ${isDragging ? pickerStyles.solutionRowDragging : ""}`} onDragOver={isManaging && canReorder ? event => onDragOver(event, index) : undefined} onDrop={isManaging && canReorder ? event => onDrop(event, index) : undefined}>
      {isManaging && canReorder ? <button type="button" className={pickerStyles.dragHandle} draggable={!busy} onDragStart={event => onDragStart(event, index)} onDragEnd={onDragEnd} disabled={busy} aria-label={`Reorder ${label}`} title="Drag to reorder">
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button> : null}

      {isManaging ? <div className={pickerStyles.solutionRowStatic}>
          <span className={pickerStyles.solutionIcon} aria-hidden>
            {image ? <img src={getIconPath(image)} alt="" /> : <Icon icon={icon} style={iconColor ? {
          color: iconColor
        } : undefined} />}
          </span>
          <span className={pickerStyles.solutionBody}>
            <span className={pickerStyles.solutionTitle}>{label}</span>
            <span className={pickerStyles.solutionMeta}>{meta}</span>
          </span>
        </div> : <button type="button" className={pickerStyles.solutionRowMain} onClick={() => onSelect(item)} disabled={busy}>
          <span className={pickerStyles.solutionIcon} aria-hidden>
            {image ? <img src={getIconPath(image)} alt="" /> : <Icon icon={icon} style={iconColor ? {
          color: iconColor
        } : undefined} />}
          </span>
          <span className={pickerStyles.solutionBody}>
            <span className={pickerStyles.solutionTitle}>{label}</span>
            <span className={pickerStyles.solutionMeta}>{meta}</span>
          </span>
          {trailingIcon ? <Icon icon={trailingIcon} className={pickerStyles.solutionAction} aria-hidden /> : null}
        </button>}

      {isManaging ? <div className={pickerStyles.solutionRowActions}>
          {onEdit ? <button type="button" className={pickerStyles.solutionIconBtn} onClick={() => onEdit(item)} disabled={busy} aria-label={`Edit ${label}`} title="Edit">
              <Icon icon="mdi:pencil-outline" aria-hidden />
            </button> : null}
          {onDelete ? <button type="button" className={`${pickerStyles.solutionIconBtn} ${pickerStyles.solutionIconBtnDanger}`} onClick={() => onDelete(item, index)} disabled={busy} aria-label={`Delete ${label}`} title="Delete">
              <Icon icon={isDeleting ? "mdi:loading" : "mdi:delete-outline"} className={isDeleting ? formStyles.spinning : ""} aria-hidden />
            </button> : null}
        </div> : null}
    </div>;
}
export default function ManagedSolutionPickerModal({
  open,
  client,
  items = [],
  onClose,
  dialogId,
  eyebrow,
  viewTitle,
  manageTitle,
  headerIcon,
  headerIconClassName,
  shellClassName = "",
  layout = "list",
  tableColumns = [],
  getTableCells,
  getTableSortValue,
  formatCountLabel,
  getViewIntro,
  getManageIntro,
  getItemKey,
  getItemPresentation,
  onSelectItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorderItems,
  addAriaLabel,
  addTitle,
  deleteConfirmTitle,
  confirmDeleteLabel,
  getDeleteConfirmMessage,
  onRefreshIntegration,
  canRefreshIntegration = false,
  refreshIntegrationLabel = "Sync",
  refreshIntegrationTitle = "Refresh data from integration",
  refreshIntegrationBusy = false
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const resolvedDeleteTitle = deleteConfirmTitle || configCopy.confirm.deleteConfiguration.title;
  const resolvedConfirmDeleteLabel = confirmDeleteLabel || common.delete;
  const [isManaging, setIsManaging] = useState(false);
  const [orderedItems, setOrderedItems] = useState(items);
  const [deletingKey, setDeletingKey] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [tableSort, setTableSort] = useState({
    key: null,
    direction: "asc"
  });
  useEffect(() => {
    setOrderedItems(items);
  }, [items, open]);
  useEffect(() => {
    if (!open) {
      setIsManaging(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setPendingDelete(null);
      setTableSort({
        key: null,
        direction: "asc"
      });
    }
  }, [open]);
  useEffect(() => {
    if (isManaging) {
      setTableSort({
        key: null,
        direction: "asc"
      });
    }
  }, [isManaging]);
  const busy = Boolean(deletingKey) || reordering || refreshIntegrationBusy;
  const canManage = Boolean(onEditItem || onDeleteItem || onReorderItems);
  const showRefreshIntegration = Boolean(onRefreshIntegration) && canRefreshIntegration;
  const title = isManaging ? manageTitle || viewTitle : viewTitle;
  const requestDelete = (item, index) => {
    if (!onDeleteItem) return;
    const {
      label
    } = getItemPresentation(item);
    const message = getDeleteConfirmMessage?.(label) || interpolate(configCopy.confirm.deleteSolutionFallback.message, {
      label
    });
    setPendingDelete({
      item,
      index,
      message
    });
  };
  const confirmDelete = async () => {
    if (!pendingDelete || !onDeleteItem) return;
    const {
      item,
      index
    } = pendingDelete;
    const actionKey = getItemKey(item, index);
    setDeletingKey(actionKey);
    try {
      await onDeleteItem(item);
      setPendingDelete(null);
    } finally {
      setDeletingKey(null);
    }
  };
  const persistReorder = useCallback(async nextItems => {
    if (!onReorderItems) return;
    setReordering(true);
    try {
      await onReorderItems(nextItems);
    } finally {
      setReordering(false);
    }
  }, [onReorderItems]);
  const handleDragStart = (event, index) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };
  const handleDragOver = (event, index) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };
  const handleDrop = async (event, dropIndex) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...orderedItems];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    setOrderedItems(next);
    setDraggedIndex(null);
    setDragOverIndex(null);
    await persistReorder(next);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleTableSort = columnKey => {
    if (!columnKey || columnKey === "__actions") return;
    setTableSort(prev => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === "asc" ? "desc" : "asc"
        };
      }
      return {
        key: columnKey,
        direction: "asc"
      };
    });
  };
  const resolveSortValue = useCallback((item, columnKey, index) => {
    if (typeof getTableSortValue === "function") {
      const custom = getTableSortValue(item, columnKey, index);
      if (custom !== undefined) return custom;
    }
    const cells = typeof getTableCells === "function" ? getTableCells(item, index) || {} : {};
    const raw = cells[columnKey];
    if (raw == null) return "";
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") return raw;
    if (React.isValidElement(raw)) {
      const child = raw.props?.children;
      if (typeof child === "string" || typeof child === "number") return child;
      return String(child ?? "");
    }
    return String(raw);
  }, [getTableCells, getTableSortValue]);
  const displayItems = useMemo(() => {
    if (!tableSort.key) {
      return orderedItems.map((item, index) => ({
        item,
        index
      }));
    }
    const direction = tableSort.direction === "desc" ? -1 : 1;
    return orderedItems.map((item, index) => ({
      item,
      index
    })).sort((a, b) => {
      const left = resolveSortValue(a.item, tableSort.key, a.index);
      const right = resolveSortValue(b.item, tableSort.key, b.index);
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      const leftDate = left instanceof Date ? left : null;
      const rightDate = right instanceof Date ? right : null;
      if (leftDate && rightDate) {
        return (leftDate.getTime() - rightDate.getTime()) * direction;
      }
      return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base"
      }) * direction;
    });
  }, [orderedItems, resolveSortValue, tableSort.direction, tableSort.key]);
  if (!open || !client?.id) return null;
  const intro = isManaging ? getManageIntro?.(orderedItems.length) || "Reorder, edit, or delete saved items." : getViewIntro?.(orderedItems.length) || "Select an item to open it, or add a new one.";
  const isTableLayout = layout === "table" && Array.isArray(tableColumns) && tableColumns.length > 0;
  const visibleColumns = isTableLayout ? isManaging ? [...tableColumns, {
    key: "__actions",
    label: "Actions",
    className: pickerStyles.tableActionsCol
  }] : tableColumns : [];
  const sortEnabled = isTableLayout && !isManaging;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={busy ? undefined : onClose} role="presentation">
      <div className={`${formStyles.shell} ${pickerStyles.shell} ${isTableLayout ? pickerStyles.shellWide : ""} ${shellClassName}`.trim()} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={dialogId}>
        <div className={formStyles.accentBar} aria-hidden />
        <header className={`${formStyles.header} ${pickerStyles.header}`}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${headerIconClassName || ""}`} aria-hidden>
              <Icon icon={headerIcon} />
            </div>
            <div className={`${formStyles.headerText} ${pickerStyles.headerTextBlock}`}>
              <p className={formStyles.eyebrow}>{eyebrow}</p>
              <h2 className={formStyles.title} id={dialogId}>
                {title}
              </h2>
              <p className={formStyles.subtitle}>{client.name}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={busy} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={`${pickerStyles.body} ${isTableLayout ? pickerStyles.bodyTable : ""}`}>
          <p className={pickerStyles.intro}>{intro}</p>
          {isTableLayout ? <div className={pickerStyles.tableScroll}>
              <table className={pickerStyles.pickerTable}>
                <thead>
                  <tr>
                    {isManaging && onReorderItems ? <th className={pickerStyles.tableDragCol} aria-label="Reorder" /> : null}
                    {visibleColumns.map(column => {
                const sortable = sortEnabled && column.key !== "__actions" && column.sortable !== false;
                const isSorted = tableSort.key === column.key;
                return <th key={column.key} className={[column.className || undefined, sortable ? pickerStyles.sortableTh : undefined].filter(Boolean).join(" ") || undefined} scope="col" onClick={sortable ? () => handleTableSort(column.key) : undefined} aria-sort={isSorted ? tableSort.direction === "asc" ? "ascending" : "descending" : sortable ? "none" : undefined} title={sortable ? `Sort by ${column.label}` : undefined}>
                          <span className={pickerStyles.thContent}>
                            {column.label}
                            {sortable ? <span className={pickerStyles.sortIndicator} aria-hidden>
                                {isSorted ? tableSort.direction === "asc" ? " ↑" : " ↓" : " ↕"}
                              </span> : null}
                          </span>
                        </th>;
              })}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map(({
              item,
              index
            }) => {
              const itemKey = getItemKey(item, index);
              const cells = typeof getTableCells === "function" ? getTableCells(item, index) || {} : {};
              const {
                label
              } = getItemPresentation(item);
              const isDeleting = deletingKey === itemKey;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;
              return <tr key={itemKey} className={[!isManaging ? pickerStyles.tableRowClickable : "", isDragOver ? pickerStyles.tableRowDragOver : "", isDragging ? pickerStyles.tableRowDragging : ""].filter(Boolean).join(" ") || undefined} onClick={!isManaging && onSelectItem ? () => onSelectItem(item) : undefined} onDragOver={isManaging && onReorderItems ? event => handleDragOver(event, index) : undefined} onDrop={isManaging && onReorderItems ? event => handleDrop(event, index) : undefined}>
                        {isManaging && onReorderItems ? <td className={pickerStyles.tableDragCol}>
                            <button type="button" className={pickerStyles.tableDragHandle} draggable={!busy} onDragStart={event => handleDragStart(event, index)} onDragEnd={handleDragEnd} disabled={busy} aria-label={`Reorder ${label}`} title="Drag to reorder" onClick={event => event.stopPropagation()}>
                              <Icon icon="mdi:drag-vertical" aria-hidden />
                            </button>
                          </td> : null}
                        {visibleColumns.map(column => {
                  if (column.key === "__actions") {
                    return <td key={column.key} className={pickerStyles.tableActionsCol} onClick={event => event.stopPropagation()}>
                              <div className={pickerStyles.tableRowActions}>
                                {onEditItem ? <button type="button" className={pickerStyles.solutionIconBtn} onClick={() => onEditItem(item)} disabled={busy} aria-label={`Edit ${label}`} title="Edit">
                                    <Icon icon="mdi:pencil-outline" aria-hidden />
                                  </button> : null}
                                {onDeleteItem ? <button type="button" className={`${pickerStyles.solutionIconBtn} ${pickerStyles.solutionIconBtnDanger}`} onClick={() => requestDelete(item, index)} disabled={busy} aria-label={`Delete ${label}`} title="Delete">
                                    <Icon icon={isDeleting ? "mdi:loading" : "mdi:delete-outline"} className={isDeleting ? formStyles.spinning : ""} aria-hidden />
                                  </button> : null}
                              </div>
                            </td>;
                  }
                  return <td key={column.key} className={column.cellClassName || undefined}>
                            {cells[column.key] ?? "—"}
                          </td>;
                })}
                      </tr>;
            })}
                </tbody>
              </table>
            </div> : <div className={pickerStyles.solutionList}>
            {orderedItems.map((item, index) => {
              const itemKey = getItemKey(item, index);
              const {
                icon,
                image,
                iconColor,
                label,
                meta,
                trailingIcon
              } = getItemPresentation(item);
              return <PickerRow key={itemKey} item={item} index={index} isManaging={isManaging} busy={busy} deletingKey={deletingKey} itemKey={itemKey} icon={icon} image={image} iconColor={iconColor} label={label} meta={meta} trailingIcon={trailingIcon} onSelect={onSelectItem} onEdit={onEditItem} onDelete={onDeleteItem ? requestDelete : null} canReorder={Boolean(onReorderItems)} draggedIndex={draggedIndex} dragOverIndex={dragOverIndex} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd} />;
            })}
          </div>}
        </div>

        <footer className={`${formStyles.footer} ${pickerStyles.footer}`}>
          <span className={formStyles.footerHint}>
            {formatCountLabel(orderedItems.length)}
            {isManaging ? " · edit mode" : ""}
          </span>
          <div className={`${formStyles.footerActions} ${pickerStyles.footerActions}`}>
            {showRefreshIntegration ? <button type="button" className={`${formStyles.ghostBtn} ${pickerStyles.footerIconBtn}`} onClick={onRefreshIntegration} disabled={busy} aria-label={refreshIntegrationLabel} title={refreshIntegrationTitle}>
                <Icon icon={refreshIntegrationBusy ? "mdi:loading" : "mdi:cloud-sync-outline"} className={refreshIntegrationBusy ? formStyles.spinning : ""} aria-hidden />
              </button> : null}
            {canManage ? <button type="button" className={`${formStyles.ghostBtn} ${pickerStyles.footerIconBtn} ${isManaging ? pickerStyles.footerIconBtnActive : ""}`} onClick={() => setIsManaging(value => !value)} disabled={busy} aria-label={isManaging ? "Finish editing" : "Manage items"} title={isManaging ? "Finish" : "Manage"} aria-pressed={isManaging}>
                <Icon icon={isManaging ? "mdi:check" : "mdi:pencil-outline"} aria-hidden />
              </button> : null}
            {onAddItem ? <button type="button" className={`${formStyles.primaryBtn} ${pickerStyles.addIconBtn}`} onClick={onAddItem} disabled={busy} aria-label={addAriaLabel} title={addTitle || addAriaLabel}>
                <Icon icon="mdi:plus" aria-hidden />
              </button> : null}
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(pendingDelete)} title={resolvedDeleteTitle} message={pendingDelete?.message} confirmLabel={resolvedConfirmDeleteLabel} variant="danger" icon="mdi:delete-outline" loading={Boolean(deletingKey)} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </>;
}
