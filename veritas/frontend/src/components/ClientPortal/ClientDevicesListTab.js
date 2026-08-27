import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaColumns, FaTimes } from "react-icons/fa";
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
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import SmartTooltip from "../SmartTooltip";
import EquipmentBrandIcon from "../EquipementPage/constants/EquipmentBrandIcon";
import { getOsIconName, repairOsLabel } from "../EquipementPage/osIconUtils";
import { getClientPortalCopy } from "./clientPortalI18n";
import {
  formatPortalFieldDisplay,
  getPortalAvailableTableColumns,
  getPortalColumnLabel,
  getPortalEquipmentField,
  getPortalExportType,
  getPortalTableColumns
} from "./portalEquipmentTables";
import portalStyles from "./ClientDashboard.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import styles from "./ClientDevicesListTab.module.css";

const COLUMNS_STORAGE_PREFIX = "veritas_portal_device_columns_v1_";

function readStoredColumns(familyKey, allowedKeys, fallbackKeys) {
  try {
    const raw = localStorage.getItem(`${COLUMNS_STORAGE_PREFIX}${familyKey}`);
    if (!raw) return fallbackKeys;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return fallbackKeys;
    const allowed = new Set(allowedKeys);
    const filtered = parsed.filter(key => allowed.has(key));
    return filtered.length ? filtered : fallbackKeys;
  } catch {
    return fallbackKeys;
  }
}

function writeStoredColumns(familyKey, keys) {
  try {
    localStorage.setItem(`${COLUMNS_STORAGE_PREFIX}${familyKey}`, JSON.stringify(keys));
  } catch {
    // ignore quota / private mode
  }
}

function buildColumnEditorOrder(visibleColumns, availableColumns) {
  const available = Array.isArray(availableColumns) ? availableColumns : [];
  const allowed = new Set(available);
  const seen = new Set();
  const order = [];
  for (const key of Array.isArray(visibleColumns) ? visibleColumns : []) {
    if (!allowed.has(key) || seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of available) {
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  return order;
}

function SortableColumnRow({ columnId, label, checked, locked, dragAria, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: columnId });
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
        {...attributes}
        {...listeners}
      >
        <Icon icon="mdi:drag-vertical" aria-hidden />
      </button>
      <label className={styles.columnCheck}>
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={() => onToggle(columnId)}
        />
        <span>{label}</span>
      </label>
    </div>
  );
}

function toBrandEquipment(item, familyKey) {
  const exportType = getPortalExportType(familyKey);
  const subtype =
    item.typeServer ||
    item.internetType ||
    item.storageType ||
    item.computerType ||
    item.firewallType ||
    item.serverType ||
    "";
  return {
    ...item,
    type: exportType,
    typeServer: item.typeServer || item.serverType || (exportType === "Servers" ? subtype : ""),
    computerType: item.computerType || (exportType === "Ordinateurs" ? subtype : ""),
    manufacturer: item.manufacturer || item.fabricant || item.marque || "",
    rawData: {
      ...(item.rawData && typeof item.rawData === "object" ? item.rawData : {}),
      type: subtype || item.type || "",
      fabricant: item.fabricant || item.manufacturer || item.marque || "",
      marque: item.marque || item.manufacturer || item.fabricant || "",
      fournisseur: item.fournisseur || ""
    }
  };
}

function StateDot({ active, onLabel, offLabel, warn = false, warnLabel = null }) {
  const label = warn ? warnLabel || offLabel : active ? onLabel : offLabel;
  const color = warn ? "#f59e0b" : active ? "#22c55e" : "#94a3b8";
  return (
    <SmartTooltip content={label}>
      <Icon icon="mdi:circle" width={12} height={12} style={{ color }} aria-label={label} />
    </SmartTooltip>
  );
}

function StatusDot({ active, copy }) {
  return (
    <StateDot
      active={Boolean(active)}
      onLabel={copy.statusActive}
      offLabel={copy.statusInactive}
    />
  );
}

function SupervisionDot({ item, copy, columnKey }) {
  if (columnKey === "agentStatus") {
    const status = getPortalEquipmentField(item, "agentStatus");
    if (status === "online" || status === "supervised") {
      return (
        <StateDot
          active
          onLabel={status === "online" ? copy.agentOnline : copy.supervised}
          offLabel={copy.notSupervised}
        />
      );
    }
    if (status === "offline") {
      return (
        <StateDot
          active={false}
          warn
          onLabel={copy.agentOnline}
          offLabel={copy.agentOffline}
          warnLabel={copy.agentOffline}
        />
      );
    }
    return (
      <StateDot
        active={false}
        onLabel={copy.supervised}
        offLabel={copy.notSupervised}
      />
    );
  }
  const monitored = Boolean(getPortalEquipmentField(item, "monitoring"));
  return (
    <StateDot
      active={monitored}
      onLabel={copy.supervised}
      offLabel={copy.notSupervised}
    />
  );
}

function NameCell({ item, familyKey }) {
  const name = getPortalEquipmentField(item, "name");
  return (
    <div className={styles.nameCell}>
      <span className={styles.brandIconWrap} aria-hidden>
        <EquipmentBrandIcon
          equipment={toBrandEquipment(item, familyKey)}
          equipmentType={getPortalExportType(familyKey)}
          className={styles.brandIcon}
        />
      </span>
      <span className={styles.nameText}>{name}</span>
    </div>
  );
}

function OsCell({ item }) {
  const osLabel = repairOsLabel(getPortalEquipmentField(item, "systeme")) || "";
  const display = osLabel || "—";
  const iconName = osLabel ? getOsIconName(osLabel, { withFallback: true }) : null;
  return (
    <div className={styles.osCell}>
      {iconName ? <Icon icon={iconName} className={styles.osIcon} width={18} height={18} aria-hidden /> : null}
      <span>{display}</span>
    </div>
  );
}

function ColumnsModal({
  open,
  familyKey,
  availableColumns,
  visibleColumns,
  defaultColumns,
  onChange,
  onClose,
  copy,
  locale,
  devicesCopy,
  customFields = []
}) {
  const [columnOrder, setColumnOrder] = useState(() => buildColumnEditorOrder(visibleColumns, availableColumns));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!open) return;
    setColumnOrder(buildColumnEditorOrder(visibleColumns, availableColumns));
  }, [open, familyKey]);

  if (!open) return null;

  const visibleSet = new Set(visibleColumns);
  const emitVisible = order => {
    onChange(order.filter(key => visibleSet.has(key)));
  };

  const handleToggle = columnId => {
    const nextVisible = new Set(visibleSet);
    if (nextVisible.has(columnId)) nextVisible.delete(columnId);
    else nextVisible.add(columnId);
    if (!nextVisible.size) return;
    const nextOrder = columnOrder.includes(columnId) ? columnOrder : [...columnOrder, columnId];
    if (nextOrder !== columnOrder) setColumnOrder(nextOrder);
    onChange(nextOrder.filter(key => nextVisible.has(key)));
  };

  const handleDragEnd = event => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columnOrder.indexOf(active.id);
    const newIndex = columnOrder.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(columnOrder, oldIndex, newIndex);
    setColumnOrder(nextOrder);
    emitVisible(nextOrder);
  };

  const handleShowAll = () => {
    setColumnOrder(availableColumns);
    onChange(availableColumns);
  };

  const handleReset = () => {
    setColumnOrder(buildColumnEditorOrder(defaultColumns, availableColumns));
    onChange(defaultColumns);
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-device-columns-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="portal-device-columns-title" className={styles.modalTitle}>
            <FaColumns aria-hidden />
            {copy.columnsTitle}
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label={copy.columnsClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalHint}>{copy.columnsHint}</p>
          <p className={styles.modalReorderHint}>{copy.columnsReorderHint}</p>
          <div className={styles.columnsToolbar}>
            <button type="button" className={styles.columnsToolBtn} onClick={handleShowAll}>
              {copy.columnsShowAll}
            </button>
            <button type="button" className={styles.columnsToolBtn} onClick={handleReset}>
              {copy.columnsReset}
            </button>
          </div>
          <DndContext
            id={`portal-device-columns-${familyKey}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
              <div className={styles.columnsList}>
                {columnOrder.map(colKey => {
                  const label = getPortalColumnLabel(locale, familyKey, colKey, devicesCopy, customFields);
                  const checked = visibleSet.has(colKey);
                  const locked = colKey === "name" && checked && visibleSet.size === 1;
                  return (
                    <SortableColumnRow
                      key={colKey}
                      columnId={colKey}
                      label={label}
                      checked={checked}
                      locked={locked}
                      dragAria={interpolate(copy.columnsDrag || "{name}", { name: label })}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalOk} onClick={onClose}>
            {copy.columnsClose}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EquipmentTable({ familyKey, items, columns, copy, locale, customFields = [] }) {
  if (!items.length) {
    return <p className={styles.emptyCategory}>{copy.noItemsInCategory}</p>;
  }
  return (
    <div className={tableStyles.tablePanel}>
      <div className={tableStyles.tableScroll}>
        <table className={`${tableStyles.table} ${styles.deviceTable}`}>
          <thead>
            <tr>
              {columns.map(colKey => (
                <th key={colKey}>{getPortalColumnLabel(locale, familyKey, colKey, copy, customFields)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                {columns.map(colKey => {
                  if (colKey === "name") {
                    return (
                      <td key={colKey}>
                        <NameCell item={item} familyKey={familyKey} />
                      </td>
                    );
                  }
                  if (colKey === "systeme") {
                    return (
                      <td key={colKey}>
                        <OsCell item={item} />
                      </td>
                    );
                  }
                  if (colKey === "activeStatus") {
                    return (
                      <td key={colKey} className={styles.stateCell}>
                        <StatusDot active={getPortalEquipmentField(item, "activeStatus")} copy={copy} />
                      </td>
                    );
                  }
                  if (colKey === "monitoring" || colKey === "agentStatus") {
                    return (
                      <td key={colKey} className={styles.stateCell}>
                        <SupervisionDot item={item} copy={copy} columnKey={colKey} />
                      </td>
                    );
                  }
                  return (
                    <td key={colKey}>
                      {formatPortalFieldDisplay(
                        item,
                        colKey,
                        copy,
                        customFields.find(field => (field?.fieldKey || field?.key) === colKey)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ClientDevicesListTab({
  categories,
  activeFamilyKey,
  onExport
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.devices;
  const activeCategory = useMemo(
    () => categories.find(cat => cat.key === activeFamilyKey) || categories[0] || null,
    [categories, activeFamilyKey]
  );
  const customFields = Array.isArray(activeCategory?.fields) ? activeCategory.fields : null;
  const defaultColumns = useMemo(
    () => (activeCategory ? getPortalTableColumns(activeCategory.key, customFields || []) : []),
    [activeCategory, customFields]
  );
  const availableColumns = useMemo(
    () => (activeCategory ? getPortalAvailableTableColumns(activeCategory.key, customFields || []) : []),
    [activeCategory, customFields]
  );
  const [visibleColumns, setVisibleColumns] = useState(defaultColumns);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);

  useEffect(() => {
    if (!activeCategory) {
      setVisibleColumns([]);
      return;
    }
    const allowed = getPortalAvailableTableColumns(activeCategory.key, activeCategory.fields || []);
    setVisibleColumns(readStoredColumns(
      activeCategory.key,
      allowed,
      getPortalTableColumns(activeCategory.key, activeCategory.fields || [])
    ));
    setColumnsModalOpen(false);
  }, [activeCategory?.key]);

  const applyColumns = nextKeys => {
    if (!activeCategory) return;
    const allowed = new Set(availableColumns);
    const ordered = [];
    const seen = new Set();
    for (const key of Array.isArray(nextKeys) ? nextKeys : []) {
      if (!allowed.has(key) || seen.has(key)) continue;
      seen.add(key);
      ordered.push(key);
    }
    const safe = ordered.length
      ? ordered
      : allowed.has("name") ? ["name"] : availableColumns.slice(0, 1);
    writeStoredColumns(activeCategory.key, safe);
    setVisibleColumns(safe);
  };

  if (!categories.length) {
    return (
      <div className={portalStyles.emptyState}>
        <Icon icon="mdi:devices" className={portalStyles.emptyStateIcon} aria-hidden />
        <p className={portalStyles.emptyStateTitle}>{t.emptyTitle}</p>
        <p className={portalStyles.empty}>{t.emptyDesc}</p>
      </div>
    );
  }

  if (!activeCategory) return null;

  const displayedColumns = visibleColumns.filter(key => availableColumns.includes(key));

  return (
    <div className={styles.root}>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>
            <Icon icon={activeCategory.icon} aria-hidden />
            {activeCategory.label}
          </span>
          <div className={styles.panelActions}>
            <span className={portalStyles.panelCount}>{activeCategory.count}</span>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => setColumnsModalOpen(true)}
              title={t.columnsBtn}
              aria-label={t.columnsBtn}
            >
              <FaColumns aria-hidden />
              <span className={styles.toolBtnLabel}>{t.columnsBtn}</span>
            </button>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => onExport?.(activeCategory, displayedColumns)}
              disabled={!activeCategory.items?.length}
            >
              <Icon icon="mdi:file-delimited-outline" aria-hidden />
              {t.exportCsv}
            </button>
          </div>
        </div>
        <EquipmentTable
          familyKey={activeCategory.key}
          items={activeCategory.items}
          columns={displayedColumns.length ? displayedColumns : ["name"]}
          copy={t}
          locale={locale}
          customFields={customFields || []}
        />
      </section>

      <ColumnsModal
        open={columnsModalOpen}
        familyKey={activeCategory.key}
        availableColumns={availableColumns}
        visibleColumns={displayedColumns.length ? displayedColumns : ["name"]}
        defaultColumns={defaultColumns}
        onChange={applyColumns}
        onClose={() => setColumnsModalOpen(false)}
        copy={t}
        locale={locale}
        devicesCopy={t}
        customFields={customFields || []}
      />
    </div>
  );
}
