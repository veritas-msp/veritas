import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./ClientNoteModal.module.css";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "./enterpriseDetailI18n";
export default function ClientNoteModal({
  open,
  mode = "create",
  initialContent = "",
  clientName = "",
  copy,
  saving = false,
  onClose,
  onSubmit
}) {
  const common = useCommonCopy();
  const [content, setContent] = useState("");
  const isEdit = mode === "edit";
  const modalCopy = copy?.noteModal || {};
  useEffect(() => {
    if (open) setContent(initialContent || "");
  }, [open, initialContent]);
  if (!open) return null;
  const handleSubmit = event => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || saving) return;
    onSubmit(trimmed);
  };
  const subtitle = clientName ? interpolate(modalCopy.subtitle, {
    name: clientName
  }) : modalCopy.subtitleFallback;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.shellNote}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="client-note-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:note-text-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={formStyles.title} id="client-note-modal-title">
                {isEdit ? modalCopy.editTitle : modalCopy.createTitle}
              </h2>
              {subtitle ? <p className={formStyles.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={common.close}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={`${formStyles.content} ${styles.modalContent}`}>
            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="client-note-content">
                {modalCopy.label}
              </label>
              <textarea id="client-note-content" className={`${formStyles.input} ${styles.textarea}`} placeholder={modalCopy.placeholder} value={content} onChange={e => setContent(e.target.value)} rows={6} autoFocus disabled={saving} />
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} />
            <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {common.cancel}
            </button>
            <button type="button" className={formStyles.primaryBtn} onClick={handleSubmit} disabled={!content.trim() || saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {common.saving}
                </> : <>
                  <Icon icon={isEdit ? "mdi:content-save-outline" : "mdi:note-plus-outline"} aria-hidden />
                  {isEdit ? modalCopy.saveBtn : modalCopy.addBtn}
                </>}
            </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
