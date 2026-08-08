import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import {
  clearPrivateTicketTableColumns,
  savePrivateTicketTableColumns,
  savePublicTicketTableColumns
} from "../../api/tickets";
import {
  DEFAULT_TICKET_TABLE_COLUMNS,
  DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE,
  buildColumnEditorOrder,
  getConfigurableTicketColumns,
  normalizeTicketTableColumnsPageScope,
  visibleColumnsFromEditorOrder
} from "../../utils/ticketTableColumns";
import { interpolate } from "../../i18n/translate";
import styles from "./TicketColumnsModal.module.css";

const COLUMN_LABEL_KEYS = {
  ticket_number: "id",
  title: "subject",
  channel: "channel",
  type: "type",
  category: "category",
  requester: "requester",
  client: "client",
  assigned: "assigned",
  followers: "followers",
  status: "status",
  priority: "priority",
  sla: "sla",
  tasks: "tasks",
  progress: "progress",
  created_at: "created",
  updated_at: "updated"
};

function SortableColumnRow({
  columnId,
  label,
  checked,
  disabled,
  dragDisabled,
  dragAria,
  onToggle
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: columnId,
    disabled: dragDisabled
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.columnRow} ${isDragging ? styles.columnRowDragging : ""} ${checked ? "" : styles.columnRowUnchecked}`.trim()}
    >
      <button
        type="button"
        className={`${styles.dragHandle} ${dragDisabled ? styles.dragHandleDisabled : ""}`.trim()}
        aria-label={dragAria}
        disabled={dragDisabled}
        {...attributes}
        {...listeners}
      >
        <Icon icon="mdi:drag-vertical" aria-hidden />
      </button>
      <label className={styles.columnCheck}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={event => onToggle(columnId, event.target.checked)}
        />
        <span className={styles.columnLabel}>{label}</span>
      </label>
    </div>
  );
}

export default function TicketColumnsModal({
  open,
  onClose,
  onSaved,
  isAdmin = false,
  isCommunity = false,
  pageScope = "ticket",
  initialPublic = null,
  initialPrivate = null,
  columnLabelKeys = null,
  copy
}) {
  const commonCopy = useCommonCopy();
  const columnsCopy = copy?.columnsModal || {};
  const tableCopy = copy?.table || {};
  const titleId = "ticket-columns-modal-title";
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const defaultColumns = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE[scope] || DEFAULT_TICKET_TABLE_COLUMNS;
  const labelKeys = columnLabelKeys || COLUMN_LABEL_KEYS;
  const availableColumns = useMemo(
    () => getConfigurableTicketColumns({ isCommunity, pageScope: scope }),
    [isCommunity, scope]
  );

  const [tab, setTab] = useState("private");
  const [publicColumns, setPublicColumns] = useState(() => [...defaultColumns]);
  const [privateColumns, setPrivateColumns] = useState(null);
  const [columnOrder, setColumnOrder] = useState(() => [...defaultColumns]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const savingRef = useRef(false);
  savingRef.current = saving;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    if (!open) return;
    setTab("private");
    const nextPublic =
      Array.isArray(initialPublic) && initialPublic.length > 0
        ? [...initialPublic]
        : [...defaultColumns];
    const nextPrivate =
      Array.isArray(initialPrivate) && initialPrivate.length > 0
        ? [...initialPrivate]
        : null;
    setPublicColumns(nextPublic);
    setPrivateColumns(nextPrivate);
    setColumnOrder(buildColumnEditorOrder(nextPrivate || nextPublic, availableColumns));
    setError("");
    setSaving(false);
  }, [open, initialPublic, initialPrivate, defaultColumns, availableColumns]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape" && !savingRef.current) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const editingPublic = tab === "public";
  const enabledColumns = editingPublic
    ? publicColumns
    : privateColumns == null
      ? [...publicColumns]
      : privateColumns;
  const draftColumns = visibleColumnsFromEditorOrder(columnOrder, enabledColumns);
  const hasPrivateView = Array.isArray(privateColumns) && privateColumns.length > 0;
  const canEditCurrent = editingPublic ? isAdmin : true;

  const getColumnLabel = columnId => {
    const key = labelKeys[columnId];
    return (key && tableCopy[key]) || tableCopy[columnId] || columnId;
  };

  const setEnabledColumns = nextVisible => {
    if (editingPublic) {
      setPublicColumns(nextVisible);
      return;
    }
    setPrivateColumns(nextVisible);
  };

  const handleTabChange = nextTab => {
    if (saving || nextTab === tab) return;
    setTab(nextTab);
    const nextEnabled =
      nextTab === "public"
        ? publicColumns
        : privateColumns == null
          ? publicColumns
          : privateColumns;
    setColumnOrder(buildColumnEditorOrder(nextEnabled, availableColumns));
  };

  const handleToggle = (columnId, enabled) => {
    if (!canEditCurrent || saving) return;
    const enabledSet = new Set(enabledColumns);
    if (enabled) enabledSet.add(columnId);
    else enabledSet.delete(columnId);
    let nextOrder = columnOrder.includes(columnId)
      ? columnOrder
      : [...columnOrder, columnId];
    const nextVisible = visibleColumnsFromEditorOrder(nextOrder, enabledSet);
    if (nextVisible.length === 0) return;
    if (!columnOrder.includes(columnId)) setColumnOrder(nextOrder);
    setEnabledColumns(nextVisible);
  };

  const handleDragEnd = event => {
    if (!canEditCurrent || saving) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columnOrder.indexOf(active.id);
    const newIndex = columnOrder.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(columnOrder, oldIndex, newIndex);
    setColumnOrder(nextOrder);
    const nextVisible = visibleColumnsFromEditorOrder(nextOrder, enabledColumns);
    if (nextVisible.length === 0) return;
    setEnabledColumns(nextVisible);
  };

  const handleResetPrivate = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await clearPrivateTicketTableColumns(scope);
      setPrivateColumns(null);
      setColumnOrder(buildColumnEditorOrder(publicColumns, availableColumns));
      onSaved?.(result);
      toast.success(columnsCopy.resetSuccess || "Private view reset");
      onClose?.();
    } catch (err) {
      setError(err?.message || columnsCopy.saveError || "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canEditCurrent || saving) return;
    if (!draftColumns.length) {
      setError(columnsCopy.atLeastOne || "Select at least one column.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = editingPublic
        ? await savePublicTicketTableColumns(draftColumns, scope)
        : await savePrivateTicketTableColumns(draftColumns, scope);
      if (editingPublic) {
        setPublicColumns(result.public || draftColumns);
      } else {
        setPrivateColumns(result.private || draftColumns);
      }
      onSaved?.(result);
      toast.success(
        editingPublic
          ? columnsCopy.savePublicSuccess || "Public view saved"
          : columnsCopy.savePrivateSuccess || "Private view saved"
      );
      onClose?.();
    } catch (err) {
      setError(err?.message || columnsCopy.saveError || "Error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.accentBar} aria-hidden />
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:table-column" className={styles.headerIcon} />
            </div>
            <div>
              <h2 id={titleId} className={styles.title}>
                {columnsCopy.title || "Table columns"}
              </h2>
              <p className={styles.message}>
                {columnsCopy.subtitle || "Choose which columns are visible in the ticket list."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={commonCopy.close}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "private"}
            className={`${styles.tab} ${tab === "private" ? styles.tabActive : ""}`.trim()}
            onClick={() => handleTabChange("private")}
            disabled={saving}
          >
            <Icon icon="mdi:account-outline" aria-hidden />
            {columnsCopy.privateTab || "Private view"}
          </button>
          {isAdmin ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "public"}
              className={`${styles.tab} ${tab === "public" ? styles.tabActive : ""}`.trim()}
              onClick={() => handleTabChange("public")}
              disabled={saving}
            >
              <Icon icon="mdi:earth" aria-hidden />
              {columnsCopy.publicTab || "Public view"}
            </button>
          ) : null}
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>
            {editingPublic
              ? columnsCopy.publicHint || "Default columns for all users without a private view."
              : hasPrivateView
                ? columnsCopy.privateHintActive || "Your private columns override the public view."
                : columnsCopy.privateHintInactive ||
                  "No private view yet — the public view is used. Toggle columns to create yours."}
          </p>
          <p className={styles.reorderHint}>
            {columnsCopy.reorderHint || "Drag rows to change the column order in the table."}
          </p>
          {!canEditCurrent ? (
            <p className={styles.adminOnly}>
              {columnsCopy.adminOnly || "Only administrators can edit the public view."}
            </p>
          ) : null}
          <DndContext
            id={`ticket-columns-${scope}-${tab}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
              <div className={styles.columnList}>
                {columnOrder.map(columnId => {
                  const label = getColumnLabel(columnId);
                  const dragAria = columnsCopy.dragColumn
                    ? interpolate(columnsCopy.dragColumn, { name: label })
                    : `Drag ${label}`;
                  return (
                    <SortableColumnRow
                      key={columnId}
                      columnId={columnId}
                      label={label}
                      checked={enabledColumns.includes(columnId)}
                      disabled={!canEditCurrent || saving}
                      dragDisabled={!canEditCurrent || saving}
                      dragAria={dragAria}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {!editingPublic && hasPrivateView ? (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetPrivate}
                disabled={saving}
              >
                <Icon icon="mdi:restore" aria-hidden />
                {columnsCopy.resetPrivate || "Use public view"}
              </button>
            ) : null}
          </div>
          <div className={styles.footerRight}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
            >
              {commonCopy.cancel}
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving || !canEditCurrent}
            >
              <Icon
                icon={saving ? "mdi:loading" : "mdi:content-save-outline"}
                className={saving ? styles.spinner : undefined}
              />
              {saving ? commonCopy.processing : commonCopy.save || columnsCopy.save || "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
