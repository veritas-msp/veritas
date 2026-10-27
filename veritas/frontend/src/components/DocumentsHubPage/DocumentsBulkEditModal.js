import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { Switch } from "../AdminPage/AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { CATEGORY_KEYS } from "./documentsHubI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import bulkStyles from "../EnterprisesPage/EnterpriseBulkEditModal.module.css";
import styles from "./DocumentsBulkEditModal.module.css";

function resolveCategory(file) {
  const value = file?.category;
  if (value && CATEGORY_KEYS.includes(value)) return value;
  return CATEGORY_KEYS[0];
}

function buildInitialForm(items = []) {
  const single = items.length === 1 ? items[0] : null;
  return {
    enableCategory: Boolean(single),
    category: resolveCategory(single),
    enableVisibility: Boolean(single),
    visibleToClient: Boolean(single?.visible_to_client)
  };
}

function FieldToggle({ enabled, onToggle, label, hint, children }) {
  return (
    <section className={bulkStyles.fieldCard}>
      <div className={bulkStyles.fieldCardHead}>
        <div className={bulkStyles.fieldCardText}>
          <div className={bulkStyles.fieldCardLabel}>{label}</div>
          {hint ? <p className={bulkStyles.fieldCardHint}>{hint}</p> : null}
        </div>
        <Switch checked={enabled} onChange={onToggle} label="" />
      </div>
      {enabled ? <div className={bulkStyles.fieldCardBody}>{children}</div> : null}
    </section>
  );
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
  const [form, setForm] = useState(() => buildInitialForm(items));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(items));
    setError("");
    setSaving(false);
  }, [open, items]);

  const hasField = useMemo(() => form.enableCategory || form.enableVisibility, [form]);
  const categoryLabel = key => copy?.categories?.[key] || key;
  const patchForm = patch => setForm(prev => ({ ...prev, ...patch }));

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

  return createPortal(
    <div className={formStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${formStyles.shellMedium}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="documents-bulk-edit-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:file-document-edit-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{bulkCopy.eyebrow}</p>
              <h2 className={formStyles.title} id="documents-bulk-edit-title">
                {bulkCopy.title}
              </h2>
              <p className={formStyles.subtitle}>{copy?.formatBulkModalSelected?.(items.length)}</p>
            </div>
          </div>
          <button
            type="button"
            className={formStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={commonCopy.close}
          >
            <FaTimes />
          </button>
        </header>

        <div className={`${formStyles.body} ${formStyles.bodySingle}`}>
          <div className={`${formStyles.content} ${bulkStyles.bulkContent}`}>
            {bulkCopy.intro ? <p className={bulkStyles.intro}>{bulkCopy.intro}</p> : null}

            <FieldToggle
              enabled={form.enableCategory}
              onToggle={on => patchForm({ enableCategory: on })}
              label={bulkCopy.editCategory}
              hint={bulkCopy.editCategoryHint}
            >
              <label className={formStyles.label} htmlFor="documents-bulk-category">
                {bulkCopy.editCategory}
              </label>
              <select
                id="documents-bulk-category"
                className={formStyles.input}
                value={form.category}
                onChange={e => patchForm({ category: e.target.value })}
                disabled={saving}
              >
                {CATEGORY_KEYS.map(key => (
                  <option key={key} value={key}>
                    {categoryLabel(key)}
                  </option>
                ))}
              </select>
            </FieldToggle>

            <FieldToggle
              enabled={form.enableVisibility}
              onToggle={on => patchForm({ enableVisibility: on })}
              label={bulkCopy.editVisibility}
              hint={bulkCopy.editVisibilityHint}
            >
              <div className={styles.visibilityRow}>
                <div className={styles.visibilityCopy}>
                  <span className={formStyles.label}>{bulkCopy.editVisibility}</span>
                  <p className={styles.visibilityHint}>
                    {form.visibleToClient ? bulkCopy.visibilityPortal : bulkCopy.visibilityInternal}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.visibleToClient}
                  className={`${styles.visibilityToggle} ${form.visibleToClient ? styles.visibilityToggleOn : ""}`}
                  onClick={() => patchForm({ visibleToClient: !form.visibleToClient })}
                  disabled={saving}
                  title={form.visibleToClient ? bulkCopy.visibilityPortal : bulkCopy.visibilityInternal}
                >
                  <Icon
                    icon={form.visibleToClient ? "mdi:eye-outline" : "mdi:eye-off-outline"}
                    aria-hidden
                  />
                  <span className={styles.visibilityToggleLabel}>
                    {form.visibleToClient ? bulkCopy.visibilityOn : bulkCopy.visibilityOff}
                  </span>
                </button>
              </div>
            </FieldToggle>

            {error ? <p className={bulkStyles.error}>{error}</p> : null}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{bulkCopy.footerHint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                  {bulkCopy.saving}
                </>
              ) : (
                <>
                  <Icon icon="mdi:check" aria-hidden />
                  {bulkCopy.apply}
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
