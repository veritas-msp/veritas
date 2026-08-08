import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import styles from "./ClientPortalDeleteModal.module.css";
function getContactLabel(user, fallback) {
  if (!user) return fallback;
  const name = [user.contact_prenom, user.contact_nom].filter(Boolean).join(" ").trim();
  return name || user.email || user.username || fallback;
}
export default function ClientPortalDeleteModal({
  open,
  user,
  saving = false,
  onClose,
  onConfirm
}) {
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("portalDelete");
  if (!open || !user) return null;
  const contactLabel = getContactLabel(user, adminCopy.thisAccount);
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="portal-delete-modal-title" aria-describedby="portal-delete-modal-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:account-remove-outline" />
            </div>
            <div>
              <h2 className={styles.title} id="portal-delete-modal-title">
                {modalCopy.title}
              </h2>
              <p className={styles.subtitle} id="portal-delete-modal-desc">
                {modalCopy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.userCard}>
            <div className={styles.userName}>{contactLabel}</div>
            <div className={styles.userMeta}>
              {user.client_name && <div className={styles.userMetaRow}>
                  <Icon icon="mdi:office-building-outline" className={styles.userMetaIcon} aria-hidden />
                  <span>{user.client_name}</span>
                </div>}
              {user.email && <div className={styles.userMetaRow}>
                  <Icon icon="mdi:email-outline" className={styles.userMetaIcon} aria-hidden />
                  <span>{user.email}</span>
                </div>}
              {user.username && user.username !== user.email && <div className={styles.userMetaRow}>
                  <Icon icon="mdi:account-outline" className={styles.userMetaIcon} aria-hidden />
                  <span>{user.username}</span>
                </div>}
            </div>
          </div>

          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{adminCopy.consequences}</p>
            <ul className={styles.warningList}>
              {(modalCopy.bullets || []).map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={saving}>
            {saving ? <>
                <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                {adminCopy.deleting}
              </> : <>
                <Icon icon="mdi:trash-can-outline" aria-hidden />
                {modalCopy.deleteAccess}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
