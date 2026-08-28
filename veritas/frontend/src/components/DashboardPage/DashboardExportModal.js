import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import modalLayout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import periodStyles from "./DashboardPeriodModal.module.css";
import styles from "./DashboardPage.module.css";

const CATEGORY_KEYS = ["support", "devices", "enterprise", "knowledge"];

export default function DashboardExportModal({
  open,
  mode = "email",
  copy,
  defaultCategories,
  onClose,
  onSubmit
}) {
  const [recipients, setRecipients] = useState("");
  const [categories, setCategories] = useState(defaultCategories || CATEGORY_KEYS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setRecipients("");
    setCategories(defaultCategories?.length ? defaultCategories : CATEGORY_KEYS);
    setSaving(false);
    setError("");
  }, [open, defaultCategories]);
  if (!open || !copy) return null;
  const modal = copy.exportModal;
  const toggleCategory = key => {
    setCategories(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]);
  };
  const handleSubmit = async () => {
    if (mode === "email" && !recipients.trim()) {
      setError(modal.errRecipients);
      return;
    }
    if (!categories.length) {
      setError(modal.errCategories);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit?.({
        recipients: recipients.trim(),
        categories
      });
      onClose?.();
    } catch (err) {
      setError(err.message || modal.submitError);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<div className={modalLayout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={`${modalLayout.shell} ${modalLayout.shellMedium} ${periodStyles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={modalLayout.accentBar} aria-hidden />
        <header className={modalLayout.header}>
          <div className={modalLayout.headerMain}>
            <div className={modalLayout.headerIconWrap} aria-hidden>
              <Icon icon={mode === "pdf" ? "mdi:file-pdf-box" : "mdi:email-fast-outline"} />
            </div>
            <div className={modalLayout.headerText}>
              <p className={modalLayout.eyebrow}>{modal.eyebrow}</p>
              <h2 className={modalLayout.title}>{mode === "pdf" ? modal.titlePdf : modal.titleEmail}</h2>
              <p className={modalLayout.subtitle}>{mode === "pdf" ? modal.subtitlePdf : modal.subtitleEmail}</p>
            </div>
          </div>
          <button type="button" className={modalLayout.closeBtn} onClick={onClose} disabled={saving} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>
        <div className={periodStyles.modalBody}>
          {mode === "email" ? <label className={periodStyles.field}>
              <span className={periodStyles.fieldLabel}>{modal.recipients}</span>
              <input className={periodStyles.fieldInput} value={recipients} onChange={e => setRecipients(e.target.value)} placeholder={modal.recipientsPlaceholder} />
            </label> : null}
          <section className={periodStyles.section}>
            <h3 className={periodStyles.sectionTitle}>{modal.categories}</h3>
            <div className={styles.categoryChecks}>
              {CATEGORY_KEYS.map(key => <label key={key} className={styles.categoryCheck}>
                  <input type="checkbox" checked={categories.includes(key)} onChange={() => toggleCategory(key)} />
                  {copy.tabs[key]}
                </label>)}
            </div>
          </section>
          {error ? <p className={periodStyles.error}>{error}</p> : null}
        </div>
        <footer className={periodStyles.footer}>
          <button type="button" className={periodStyles.cancelBtn} onClick={onClose} disabled={saving}>{modal.cancel}</button>
          <button type="button" className={periodStyles.applyBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? modal.working : mode === "pdf" ? modal.download : modal.send}
          </button>
        </footer>
      </div>
    </div>, document.body);
}
