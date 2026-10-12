import { Icon } from "@iconify/react";
import ReportBrandingChrome from "./ReportBrandingChrome";
import formStyles from "./reportBuilderForm.module.css";
import shellStyles from "./RapportBuilderPlaceholder.module.css";
import styles from "./reportValidation.module.css";

export function ReportPreviewBlock({ title, children }) {
  return (
    <section className={styles.previewSection}>
      {title ? <h3 className={styles.previewSectionTitle}>{title}</h3> : null}
      {children}
    </section>
  );
}

/**
 * Étape finale commune aux builders de rapports (hors supervision) :
 * preview brandée + téléchargement PDF + enregistrement bibliothèque.
 */
export default function ReportValidationLayout({
  previewRef,
  clientName = "",
  periodLabel = "",
  reportType = "intervention",
  reportLabel = "",
  children,
  actionsTitle,
  saveNameLabel,
  saveName,
  onSaveNameChange,
  nameRequired = true,
  nameConflict = false,
  nameConflictMessage = "",
  downloadLabel,
  saveLabel,
  modifyLabel,
  saving = false,
  onDownload,
  onDownloadPdf,
  onSave,
  onModify
}) {
  const handleDownload = onDownload || onDownloadPdf;
  return (
    <div className={styles.validationLayout}>
      <div className={styles.previewPanel}>
        <ReportBrandingChrome
          ref={previewRef}
          className={styles.previewDocBranded}
          clientName={clientName}
          periodLabel={periodLabel}
          reportType={reportType}
          reportLabel={reportLabel}
        >
          {children}
        </ReportBrandingChrome>
      </div>

      <aside className={styles.actionsPanel}>
        <h3 className={styles.actionsTitle}>{actionsTitle}</h3>
        <label className={styles.saveField}>
          <span className={styles.fieldLabel}>
            {saveNameLabel}
            {nameRequired ? <span className={formStyles.requiredMark} aria-hidden>*</span> : null}
          </span>
          <input
            className={`${styles.fieldInput} ${nameConflict ? styles.fieldInputConflict : ""}`.trim()}
            value={saveName}
            onChange={e => onSaveNameChange?.(e.target.value)}
          />
          {nameConflict && nameConflictMessage ? (
            <span className={styles.saveNameWarning} role="alert">
              <Icon icon="mdi:alert-circle-outline" aria-hidden />
              {nameConflictMessage}
            </span>
          ) : null}
        </label>
        <button type="button" className={shellStyles.primaryBtn} onClick={handleDownload} disabled={saving}>
          <Icon icon="mdi:language-html5" aria-hidden />
          {downloadLabel}
        </button>
        <button type="button" className={shellStyles.primaryBtn} disabled={saving} onClick={onSave}>
          <Icon icon="mdi:content-save-outline" aria-hidden />
          {saving ? "…" : saveLabel}
        </button>
        <button type="button" className={shellStyles.secondaryBtn} onClick={onModify} disabled={saving}>
          <Icon icon="mdi:pencil-outline" aria-hidden />
          {modifyLabel}
        </button>
      </aside>
    </div>
  );
}

export { styles as reportValidationStyles };
