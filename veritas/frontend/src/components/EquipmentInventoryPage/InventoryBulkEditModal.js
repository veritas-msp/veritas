import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { bulkUpdateEquipmentInventory } from "../../api/equipment";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getAlertDurationOptions, getEquipmentDetailCopy } from "../EquipementPage/equipmentDetailPageI18n";
import { getEquipmentInventoryPageCopy } from "./equipmentInventoryPageI18n";
import styles from "../EnterprisesPage/EnterpriseBulkEditModal.module.css";

function buildInitialForm() {
  return {
    enableStatus: false,
    isActive: true,
    enableLocation: false,
    location: "",
    enableAlerts: false,
    alertMode: "active",
    durationMinutes: 1440,
    reason: ""
  };
}

function toBulkItem(item) {
  return {
    id: item.id,
    dbId: item.dbId,
    clientId: item.clientId,
    type: item.type,
    family: item.family,
    familyKey: item.familyKey,
    isCustom: item.isCustom,
    name: item.name
  };
}

export default function InventoryBulkEditModal({
  open,
  onClose,
  items = [],
  onSuccess
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const copy = useMemo(() => getEquipmentInventoryPageCopy(locale), [locale]);
  const bulkCopy = copy.bulkModal;
  const alertModal = useMemo(() => getEquipmentDetailCopy(locale).alertSettings.modal, [locale]);
  const durationOptions = useMemo(() => getAlertDurationOptions(locale), [locale]);
  const [form, setForm] = useState(buildInitialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm());
    setError("");
    setSaving(false);
  }, [open, items]);

  const validateForm = () => {
    if (!form.enableStatus && !form.enableLocation && !form.enableAlerts) return bulkCopy.validation.noField;
    return "";
  };

  const buildUpdates = () => {
    const updates = {};
    if (form.enableStatus) updates.isActive = Boolean(form.isActive);
    if (form.enableLocation) updates.location = String(form.location || "").trim();
    if (form.enableAlerts) {
      updates.alerts = {
        mode: form.alertMode,
        durationMinutes: form.alertMode === "temporary" ? Number(form.durationMinutes) || 1440 : undefined,
        reason: form.alertMode === "temporary" || form.alertMode === "permanent" ? String(form.reason || "").trim() || null : undefined
      };
    }
    return updates;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await bulkUpdateEquipmentInventory({
        items: items.map(toBulkItem),
        updates: buildUpdates()
      });
      onSuccess?.(result);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || bulkCopy.submitError);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={onClose}>
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="inventory-bulk-edit-title">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="inventory-bulk-edit-title">{bulkCopy.title}</h2>
            <p className={styles.subtitle}>{copy.formatBulkModalSelected(items.length)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableStatus} onChange={e => setForm(prev => ({
                ...prev,
                enableStatus: e.target.checked
              }))} />
                {bulkCopy.editStatus}
              </label>
            </div>
            {form.enableStatus ? <div className={styles.sectionBody}>
                <select className={styles.input} value={form.isActive ? "active" : "inactive"} onChange={e => setForm(prev => ({
                ...prev,
                isActive: e.target.value === "active"
              }))} aria-label={bulkCopy.editStatus}>
                  <option value="active">{copy.status.active}</option>
                  <option value="inactive">{copy.status.inactive}</option>
                </select>
              </div> : null}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableLocation} onChange={e => setForm(prev => ({
                ...prev,
                enableLocation: e.target.checked
              }))} />
                {bulkCopy.editLocation}
              </label>
            </div>
            {form.enableLocation ? <div className={styles.sectionBody}>
                <input type="text" className={styles.input} value={form.location} onChange={e => setForm(prev => ({
                ...prev,
                location: e.target.value
              }))} placeholder={bulkCopy.locationPlaceholder} />
              </div> : null}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableAlerts} onChange={e => setForm(prev => ({
                ...prev,
                enableAlerts: e.target.checked
              }))} />
                {bulkCopy.editAlerts}
              </label>
            </div>
            {form.enableAlerts ? <div className={styles.sectionBody}>
                <p className={styles.subtitle} style={{ margin: 0 }}>{bulkCopy.alertsHint}</p>
                <select className={styles.input} value={form.alertMode} onChange={e => setForm(prev => ({
                ...prev,
                alertMode: e.target.value
              }))} aria-label={alertModal.mode}>
                  <option value="disabled">{alertModal.modeDisabled}</option>
                  <option value="active">{alertModal.modeActive}</option>
                  <option value="temporary">{alertModal.modeTemporary}</option>
                  <option value="permanent">{alertModal.modePermanent}</option>
                </select>
                {form.alertMode === "temporary" ? <select className={styles.input} value={form.durationMinutes} onChange={e => setForm(prev => ({
                ...prev,
                durationMinutes: Number(e.target.value)
              }))} aria-label={alertModal.duration}>
                    {durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select> : null}
                {form.alertMode === "temporary" || form.alertMode === "permanent" ? <textarea className={styles.input} value={form.reason} onChange={e => setForm(prev => ({
                ...prev,
                reason: e.target.value
              }))} placeholder={alertModal.reasonPlaceholder} rows={3} /> : null}
              </div> : null}
          </section>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || items.length === 0}>
            {saving ? bulkCopy.saving : bulkCopy.apply}
          </button>
        </div>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
