import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import modalStyles from "../EnterprisesPage/ClientNoteModal.module.css";
import styles from "./EquipmentNoteModal.module.css";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "./equipmentDetailPageI18n";

export default function EquipmentNoteModal({
  open,
  mode = "create",
  initialContent = "",
  initialVisibility = "private",
  equipmentName = "",
  copy,
  saving = false,
  onClose,
  onSubmit
}) {
  const common = useCommonCopy();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("private");
  const isEdit = mode === "edit";
  const modalCopy = copy?.noteModal || {};
  useEffect(() => {
    if (open) {
      setContent(initialContent || "");
      setVisibility(initialVisibility === "public" ? "public" : "private");
    }
  }, [open, initialContent, initialVisibility]);
  if (!open) return null;
  const handleSubmit = event => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || saving) return;
    onSubmit({
      content: trimmed,
      visibility
    });
  };
  const subtitle = equipmentName ? interpolate(modalCopy.subtitle, {
    name: equipmentName
  }) : modalCopy.subtitleFallback;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${modalStyles.shellNote}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="equipment-note-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:note-text-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={formStyles.title} id="equipment-note-modal-title">
                {isEdit ? modalCopy.editTitle : modalCopy.createTitle}
              </h2>
              {subtitle ? <p className={formStyles.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={common.close}>
            <FaTimes />
          </button>
        </header>

        <form className={modalStyles.form} onSubmit={handleSubmit}>
          <div className={`${formStyles.content} ${modalStyles.modalContent}`}>
            <fieldset className={styles.visibilityFieldset}>
              <legend className={styles.visibilityLegend}>{modalCopy.visibilityLabel}</legend>
              <div className={styles.visibilityOptions} role="radiogroup" aria-label={modalCopy.visibilityLabel}>
                <label className={`${styles.visibilityOption} ${visibility === "private" ? styles.visibilityOptionActive : ""}`}>
                  <input type="radio" name="equipment-note-visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} disabled={saving} />
                  <span className={styles.visibilityOptionTitle}>{modalCopy.privateTitle}</span>
                  <span className={styles.visibilityOptionHint}>{modalCopy.privateHint}</span>
                </label>
                <label className={`${styles.visibilityOption} ${visibility === "public" ? styles.visibilityOptionActive : ""}`}>
                  <input type="radio" name="equipment-note-visibility" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} disabled={saving} />
                  <span className={styles.visibilityOptionTitle}>{modalCopy.publicTitle}</span>
                  <span className={styles.visibilityOptionHint}>{modalCopy.publicHint}</span>
                </label>
              </div>
            </fieldset>
            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="equipment-note-content">
                {modalCopy.label}
              </label>
              <textarea id="equipment-note-content" className={`${formStyles.input} ${modalStyles.textarea}`} placeholder={modalCopy.placeholder} value={content} onChange={e => setContent(e.target.value)} rows={6} autoFocus disabled={saving} />
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} />
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
                {common.cancel}
              </button>
              <button type="submit" className={formStyles.primaryBtn} disabled={!content.trim() || saving}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={modalStyles.spinning} aria-hidden />
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
