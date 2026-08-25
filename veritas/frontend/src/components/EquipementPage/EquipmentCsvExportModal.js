import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  buildCsvExportFieldOptions,
  getCsvExportGroupOrder,
  getDefaultCsvExportKeys
} from "./equipmentCsvExportFields";
import styles from "./EquipmentCsvExportModal.module.css";

const GROUP_LABELS = {
  fr: {
    identity: "Identité",
    billing: "Facturation & installation",
    technical: "Technique",
    network: "Réseau",
    status: "Statut",
    notes: "Notes",
    title: "Exporter en CSV",
    subtitle: "Choisissez les champs à exporter pour ce type de périphérique.",
    selectAll: "Tout sélectionner",
    selectDefaults: "Colonnes du tableau",
    clear: "Tout désélectionner",
    cancel: "Annuler",
    export: "Exporter",
    selectedCount: "{count} champ(s) sélectionné(s)",
    empty: "Sélectionnez au moins un champ."
  },
  en: {
    identity: "Identity",
    billing: "Billing & installation",
    technical: "Technical",
    network: "Network",
    status: "Status",
    notes: "Notes",
    title: "Export as CSV",
    subtitle: "Choose the fields to export for this device type.",
    selectAll: "Select all",
    selectDefaults: "Table columns",
    clear: "Clear all",
    cancel: "Cancel",
    export: "Export",
    selectedCount: "{count} field(s) selected",
    empty: "Select at least one field."
  }
};

function getCopy(locale) {
  return String(locale || "fr").toLowerCase().startsWith("en") ? GROUP_LABELS.en : GROUP_LABELS.fr;
}

export default function EquipmentCsvExportModal({
  open,
  locale = "fr",
  equipmentType,
  typeLabel,
  defaultKeys = [],
  customFields = [],
  onClose,
  onExport
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const fields = useMemo(
    () => buildCsvExportFieldOptions(locale, equipmentType, customFields),
    [locale, equipmentType, customFields]
  );
  const groups = useMemo(() => {
    const order = getCsvExportGroupOrder();
    return order
      .map(id => ({
        id,
        label: copy[id] || id,
        fields: fields.filter(field => field.group === id)
      }))
      .filter(group => group.fields.length > 0);
  }, [copy, fields]);
  const [selected, setSelected] = useState(() => new Set(defaultKeys));

  useEffect(() => {
    if (!open) return;
    const defaults = defaultKeys?.length
      ? defaultKeys
      : getDefaultCsvExportKeys(equipmentType, [], customFields);
    setSelected(new Set(defaults.filter(key => fields.some(field => field.key === key))));
  }, [open, defaultKeys, equipmentType, customFields, fields]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const toggle = key => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(fields.map(field => field.key)));
  const selectDefaults = () => {
    const defaults = defaultKeys?.length
      ? defaultKeys
      : getDefaultCsvExportKeys(equipmentType, [], customFields);
    setSelected(new Set(defaults.filter(key => fields.some(field => field.key === key))));
  };
  const clearAll = () => setSelected(new Set());

  const handleExport = () => {
    const orderedKeys = fields.map(field => field.key).filter(key => selected.has(key));
    if (orderedKeys.length === 0) return;
    onExport?.(orderedKeys);
  };

  const selectedCount = selected.size;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-csv-export-title"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.headerIcon} aria-hidden>
              <Icon icon="mdi:file-delimited-outline" />
            </span>
            <div>
              <h2 id="equipment-csv-export-title" className={styles.title}>
                {copy.title}
                {typeLabel ? <span className={styles.typeBadge}>{typeLabel}</span> : null}
              </h2>
              <p className={styles.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={copy.cancel}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} onClick={selectDefaults}>
            {copy.selectDefaults}
          </button>
          <button type="button" className={styles.toolBtn} onClick={selectAll}>
            {copy.selectAll}
          </button>
          <button type="button" className={styles.toolBtn} onClick={clearAll}>
            {copy.clear}
          </button>
          <span className={styles.count}>
            {copy.selectedCount.replace("{count}", String(selectedCount))}
          </span>
        </div>

        <div className={styles.body}>
          {groups.map(group => (
            <section key={group.id} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.label}</h3>
              <div className={styles.fieldList}>
                {group.fields.map(field => {
                  const checked = selected.has(field.key);
                  return (
                    <label key={field.key} className={`${styles.fieldRow} ${checked ? styles.fieldRowChecked : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(field.key)}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          {selectedCount === 0 ? <span className={styles.emptyHint}>{copy.empty}</span> : <span />}
          <div className={styles.footerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              {copy.cancel}
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleExport}
              disabled={selectedCount === 0}
            >
              <Icon icon="mdi:download-outline" aria-hidden />
              {copy.export}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
