import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy } from "./contactDetailI18n";
import styles from "../EnterprisesPage/EnterpriseDeleteModal.module.css";
export default function ContactDeleteModal({
  open,
  contactName,
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getContactDetailCopy(locale).deleteModal, [locale]);
  const displayName = contactName || copy.defaultName;
  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="contact-delete-modal-title" aria-describedby="contact-delete-modal-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:delete-alert-outline" />
            </div>
            <div>
              <h2 className={styles.title} id="contact-delete-modal-title">
                {copy.title}
              </h2>
              <p className={styles.subtitle} id="contact-delete-modal-desc">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.clientName}>{displayName}</div>
          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{copy.consequences}</p>
            <ul className={styles.warningList}>
              {copy.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
            </ul>
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {copy.cancel}
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={saving}>
            {saving ? <>
                <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                {copy.deleting}
              </> : <>
                <Icon icon="mdi:delete-alert-outline" aria-hidden />
                {copy.confirm}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
