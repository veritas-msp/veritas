import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { CATEGORY_KEYS } from "./documentsHubI18n";
import styles from "../EnterprisesPage/EnterpriseBulkEditModal.module.css";

function buildInitialForm() {
  return {
    enableCategory: false,
    category: CATEGORY_KEYS[0],
    enableVisibility: false,
    visibleToClient: false
  };
}

export default function DocumentsBulkEditModal({
  open,
  items = [],
  copy,
  onClose,
  onSubmit
}) {
  const commonCopy = useCommonCopy();
  const bulkCopy = copy?.bulk?.modal || {};
  const [form, setForm] = useState(buildInitialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm());
    setError("");
    setSaving(false);
  }, [open, items]);
  const hasField = useMemo(() => form.enableCategory || form.enableVisibility, [form]);
  const buildFields = () => {
    const fields = {};
    if (form.enableCategory) fields.category = form.category;
    if (form.enableVisibility) fields.visibleToClient = Boolean(form.visibleToClient);
    return fields;
  };
  const handleSubmit = async () => {
    if (!hasField) {
      setError(bulkCopy.noField);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit?.(buildFields());
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || bulkCopy.submitError);
    } finally {
      setSaving(false);
    }
  };
  if (!open) return null;
  const categoryLabel = key => copy?.categories?.[key] || key;
  return createPortal(<div className={styles.overlay} onClick={saving ? undefined : onClose}>
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="documents-bulk-edit-title">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="documents-bulk-edit-title">{bulkCopy.title}</h2>
            <p className={styles.subtitle}>{copy?.formatBulkModalSelected?.(items.length)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableCategory} onChange={e => setForm(prev => ({
                ...prev,
                enableCategory: e.target.checked
              }))} />
                {bulkCopy.editCategory}
              </label>
            </div>
            {form.enableCategory ? <div className={styles.sectionBody}>
                <select className={styles.input} value={form.category} onChange={e => setForm(prev => ({
                ...prev,
                category: e.target.value
              }))} aria-label={bulkCopy.editCategory}>
                  {CATEGORY_KEYS.map(key => <option key={key} value={key}>{categoryLabel(key)}</option>)}
                </select>
              </div> : null}
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableVisibility} onChange={e => setForm(prev => ({
                ...prev,
                enableVisibility: e.target.checked
              }))} />
                {bulkCopy.editVisibility}
              </label>
            </div>
            {form.enableVisibility ? <div className={styles.sectionBody}>
                <select className={styles.input} value={form.visibleToClient ? "portal" : "internal"} onChange={e => setForm(prev => ({
                ...prev,
                visibleToClient: e.target.value === "portal"
              }))} aria-label={bulkCopy.editVisibility}>
                  <option value="portal">{bulkCopy.visibilityPortal}</option>
                  <option value="internal">{bulkCopy.visibilityInternal}</option>
                </select>
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
