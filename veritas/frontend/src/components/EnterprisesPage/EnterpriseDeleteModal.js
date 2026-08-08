import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import styles from "./EnterpriseDeleteModal.module.css";
export default function EnterpriseDeleteModal({
  open,
  clientName,
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const copy = getEnterpriseConfigModalsCopy(locale).enterpriseDelete;
  const common = useCommonCopy();
  const resolvedClientName = clientName || copy.defaultClientName;
  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="enterprise-delete-modal-title" aria-describedby="enterprise-delete-modal-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:delete-alert-outline" />
            </div>
            <div>
              <h2 className={styles.title} id="enterprise-delete-modal-title">
                {copy.title}
              </h2>
              <p className={styles.subtitle} id="enterprise-delete-modal-desc">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.clientName}>{resolvedClientName}</div>
          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{copy.consequencesTitle}</p>
            <ul className={styles.warningList}>
              <li>{copy.bullet1}</li>
              <li>{copy.bullet2}</li>
              <li>{copy.bullet3}</li>
            </ul>
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {common.cancel}
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={saving}>
            {saving ? <>
                <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                {common.deleting}
              </> : <>
                <Icon icon="mdi:trash-can-outline" aria-hidden />
                {common.deletePermanently}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
