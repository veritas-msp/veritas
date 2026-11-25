import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
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
import { interpolate } from "../../i18n/translate";
import styles from "./EquipmentColumnsModal.module.css";

function SortableColumnRow({ columnId, label, checked, disabled, dragAria, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: columnId, disabled });
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
        className={styles.dragHandle}
        aria-label={dragAria}
        disabled={disabled}
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

function LockedColumnRow({ label }) {
  return (
    <div className={`${styles.columnRow} ${styles.columnRowLocked}`}>
      <span className={styles.lockMark} aria-hidden>
        <Icon icon="mdi:lock-outline" />
      </span>
      <label className={styles.columnCheck}>
        <input type="checkbox" checked disabled readOnly />
        <span className={styles.columnLabel}>{label}</span>
      </label>
    </div>
  );
}

export default function EquipmentColumnsModal({
  open,
  familyLabel = "",
  columns = [],
  initialOrder = [],
  initialEnabled = [],
  lockedColumnIds = [],
  saving = false,
  error = "",
  seedKey = "",
  onClose,
  onSave,
  onReset,
  copy = {}
}) {
  const titleId = "equipment-columns-modal-title";
  const [columnOrder, setColumnOrder] = useState(initialOrder);
  const [enabled, setEnabled] = useState(() => new Set(initialEnabled));
  const [localError, setLocalError] = useState("");
  const savingRef = useRef(saving);
  savingRef.current = saving;
  const initialOrderRef = useRef(initialOrder);
  const initialEnabledRef = useRef(initialEnabled);
  initialOrderRef.current = initialOrder;
  initialEnabledRef.current = initialEnabled;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const labelById = useMemo(() => {
    const map = new Map();
    for (const column of columns) map.set(column.id, column.label || column.id);
    return map;
  }, [columns]);

  useEffect(() => {
    if (!open) return;
    setColumnOrder(Array.isArray(initialOrderRef.current) ? [...initialOrderRef.current] : []);
    setEnabled(new Set(Array.isArray(initialEnabledRef.current) ? initialEnabledRef.current : []));
    setLocalError("");
  }, [open, seedKey]);

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

  const lockedSet = new Set(lockedColumnIds);
  const movableOrder = columnOrder.filter(id => !lockedSet.has(id));
  const lockedOrder = [
    ...columnOrder.filter(id => lockedSet.has(id)),
    ...lockedColumnIds.filter(id => !columnOrder.includes(id))
  ];
  const visibleCount = [...movableOrder, ...lockedOrder].filter(id => lockedSet.has(id) || enabled.has(id)).length;
  const shownError = localError || error;

  const handleToggle = (columnId, checked) => {
    if (saving || lockedSet.has(columnId)) return;
    setEnabled(prev => {
      const next = new Set(prev);
      if (checked) next.add(columnId);
      else next.delete(columnId);
      if (next.size === 0) {
        setLocalError(copy.atLeastOne || "Sélectionnez au moins une colonne.");
        return prev;
      }
      setLocalError("");
      return next;
    });
  };

  const handleDragEnd = event => {
    if (saving) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder(prev => {
      const movable = prev.filter(id => !lockedSet.has(id));
      const locked = [
        ...prev.filter(id => lockedSet.has(id)),
        ...lockedColumnIds.filter(id => !prev.includes(id))
      ];
      const oldIndex = movable.indexOf(active.id);
      const newIndex = movable.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return [...arrayMove(movable, oldIndex, newIndex), ...locked];
    });
  };

  const handleSave = () => {
    const order = [...movableOrder, ...lockedOrder];
    const hidden = movableOrder.filter(id => !enabled.has(id));
    const visible = order.filter(id => lockedSet.has(id) || enabled.has(id));
    if (!visible.length) {
      setLocalError(copy.atLeastOne || "Sélectionnez au moins une colonne.");
      return;
    }
    onSave?.({ order, hidden });
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
                {interpolate(copy.title || "Colonnes — {family}", { family: familyLabel })}
              </h2>
              <p className={styles.message}>
                {copy.subtitle || "Cochez les colonnes à afficher et glissez-les pour changer l’ordre. Ce réglage est enregistré sur votre compte."}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.cancel || "Fermer"}>
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.listHead}>
            <span className={styles.listTitle}>{copy.listTitle || "Colonnes"}</span>
            <span className={styles.reorderHint}>{copy.reorderHint || "Glisser pour réordonner"}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className={styles.columnList}>
              <SortableContext items={movableOrder} strategy={verticalListSortingStrategy}>
                {movableOrder.map(columnId => (
                  <SortableColumnRow
                    key={columnId}
                    columnId={columnId}
                    label={labelById.get(columnId) || columnId}
                    checked={enabled.has(columnId)}
                    disabled={saving}
                    dragAria={interpolate(copy.dragAria || "Déplacer {label}", { label: labelById.get(columnId) || columnId })}
                    onToggle={handleToggle}
                  />
                ))}
              </SortableContext>
              {lockedOrder.map(columnId => (
                <LockedColumnRow
                  key={columnId}
                  label={labelById.get(columnId) || columnId}
                />
              ))}
            </div>
          </DndContext>
          {shownError ? <p className={styles.error}>{shownError}</p> : null}
        </div>
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button type="button" className={styles.resetBtn} onClick={onReset} disabled={saving || !onReset}>
              <Icon icon="mdi:restore" aria-hidden />
              {copy.reset || "Réinitialiser"}
            </button>
          </div>
          <div className={styles.footerRight}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              {copy.cancel || "Annuler"}
            </button>
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving || visibleCount === 0}>
              {saving ? <Icon icon="mdi:loading" className={styles.spinner} aria-hidden /> : null}
              {saving ? (copy.saving || "Enregistrement…") : (copy.save || "Enregistrer")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
