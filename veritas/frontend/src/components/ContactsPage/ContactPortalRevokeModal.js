import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy, interpolate } from "./contactDetailI18n";
import styles from "../EnterprisesPage/EnterpriseDeleteModal.module.css";
function formatContactName(contact, fallback) {
  const parts = [contact?.prenom, contact?.nom].filter(Boolean);
  return parts.join(" ").trim() || fallback;
}
export default function ContactPortalRevokeModal({
  open,
  contact,
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const modalCopy = useMemo(() => getContactDetailCopy(locale).portal.revokeModal, [locale]);
  if (!open || !contact) return null;
  const displayName = formatContactName(contact, modalCopy.defaultName);
  const loginEmail = (contact.portal_email || contact.email || "").trim();
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="contact-portal-revoke-title" aria-describedby="contact-portal-revoke-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:link-off" />
            </div>
            <div>
              <h2 className={styles.title} id="contact-portal-revoke-title">
                {modalCopy.title}
              </h2>
              <p className={styles.subtitle} id="contact-portal-revoke-desc">
                {modalCopy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.clientName}>{displayName}</div>
          {loginEmail && <p style={{
          margin: "0 0 0.85rem",
          fontSize: "0.8125rem",
          color: "var(--msp-muted, #5c6b82)"
        }}>
              {interpolate(modalCopy.accountLine, {
            email: loginEmail
          })}
            </p>}
          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{modalCopy.consequences}</p>
            <ul className={styles.warningList}>
              {modalCopy.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
            </ul>
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {modalCopy.cancel}
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={saving}>
            {saving ? <>
                <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                {modalCopy.revoking}
              </> : <>
                <Icon icon="mdi:link-off" aria-hidden />
                {modalCopy.revoke}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
