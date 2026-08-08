import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import ReportSaveVisibilitySwitch from "../shared/ReportSaveVisibilitySwitch";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./CampaignReportPublishModal.module.css";
export default function CampaignReportPublishModal({
  open,
  copy,
  clientLabel,
  documentName,
  visibleToClient,
  onVisibleToClientChange,
  publishing = false,
  onClose,
  onConfirm
}) {
  if (!open) return null;
  return createPortal(<div className={formStyles.overlay} onClick={e => {
    if (e.target === e.currentTarget && !publishing) onClose?.();
  }} role="presentation">
      <div className={`${formStyles.shell} ${styles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="campaign-report-publish-title">
        <div className={formStyles.accentBar} aria-hidden />

        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:file-document-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="campaign-report-publish-title">
                {copy.title}
              </h2>
              <p className={formStyles.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={publishing} aria-label={copy.cancel}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon} aria-hidden>
              <Icon icon="mdi:file-pdf-box" />
            </div>
            <div className={styles.summaryCopy}>
              <p className={styles.summaryEyebrow}>{copy.documentLabel}</p>
              <p className={styles.summaryClient}>{clientLabel}</p>
              <p className={styles.summaryName}>{documentName}</p>
            </div>
          </div>

          <p className={styles.note}>
            <Icon icon="mdi:safe-square-outline" className={styles.noteIcon} aria-hidden />
            <span>{copy.vaultNote}</span>
          </p>

          <ReportSaveVisibilitySwitch visibleToClient={visibleToClient} onChange={onVisibleToClientChange} disabled={publishing} />
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{copy.footerHint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={publishing}>
              {copy.cancel}
            </button>
            <button type="button" className={formStyles.primaryBtn} onClick={onConfirm} disabled={publishing}>
              {publishing ? copy.publishing : copy.confirm}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
