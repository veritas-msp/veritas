import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useMemo } from "react";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getReportSaveVisibilityCopy } from "../../shared/reportSaveVisibilityI18n";
import formStyles from "../../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./InterventionSaveModal.module.css";
export default function InterventionSaveModal({
  open,
  copy,
  clientLabel,
  documentName,
  visibleToClient,
  onVisibleToClientChange,
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const visibilityCopy = useMemo(() => getReportSaveVisibilityCopy(locale), [locale]);
  if (!open) return null;
  const canSave = Boolean(String(documentName || "").trim()) && !saving;
  return createPortal(<div className={formStyles.overlay} onClick={e => {
    if (e.target === e.currentTarget && !saving) onClose?.();
  }} role="presentation">
      <div className={`${formStyles.shell} ${styles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="intervention-save-modal-title">
        <div className={formStyles.accentBar} aria-hidden />

        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:content-save-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="intervention-save-modal-title">
                {copy.title}
              </h2>
              <p className={formStyles.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.cancel}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon} aria-hidden>
              <Icon icon="mdi:file-document-outline" />
            </div>
            <div className={styles.summaryCopy}>
              <p className={styles.summaryEyebrow}>{copy.documentLabel}</p>
              <p className={styles.summaryClient}>{clientLabel}</p>
              <p className={styles.summaryName}>{documentName.trim()}</p>
            </div>
          </div>

          <p className={styles.note}>
            <Icon icon="mdi:safe-square-outline" className={styles.noteIcon} aria-hidden />
            <span>{copy.vaultNote}</span>
          </p>

          <div className={styles.visibilityRow}>
            <div className={styles.visibilityCopy}>
              <span className={styles.visibilityLabel}>{visibilityCopy.label}</span>
              <p className={styles.visibilityHint}>{visibilityCopy.hint}</p>
            </div>
            <button type="button" role="switch" aria-checked={visibleToClient} aria-label={visibilityCopy.label} className={`${styles.switch} ${visibleToClient ? styles.switchOn : ""}`.trim()} onClick={() => onVisibleToClientChange?.(!visibleToClient)} disabled={saving}>
              <span className={styles.switchTrack}>
                <span className={styles.switchThumb} />
              </span>
              <span className={styles.switchState}>
                {visibleToClient ? visibilityCopy.on : visibilityCopy.off}
              </span>
            </button>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{copy.footerHint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {copy.cancel}
            </button>
            <button type="button" className={formStyles.primaryBtn} onClick={onConfirm} disabled={!canSave}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {copy.saving}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {copy.confirm}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
