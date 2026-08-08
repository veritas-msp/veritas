import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getVaultSecretsCopy, interpolate } from "./vaultSecretsI18n";
import styles from "./EnterpriseDeleteModal.module.css";
export default function VaultSecretRevokeModal({
  open,
  secret,
  contactName = "",
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const {
    formatDateTime
  } = useAppFormatters();
  const copy = useMemo(() => getVaultSecretsCopy(locale), [locale]);
  const modalCopy = copy.revokeModal;
  if (!open || !secret) return null;
  const viewsRemainingText = secret.views_remaining != null ? interpolate(secret.views_remaining > 1 ? modalCopy.viewsRemainingPlural : modalCopy.viewsRemaining, {
    count: String(secret.views_remaining)
  }) : "";
  const expiryBullet = interpolate(modalCopy.bulletExpiry, {
    date: formatDateTime(secret.expires_at),
    views: viewsRemainingText
  });
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="vault-secret-revoke-title" aria-describedby="vault-secret-revoke-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:key-remove" />
            </div>
            <div>
              <h2 className={styles.title} id="vault-secret-revoke-title">
                {modalCopy.title}
              </h2>
              <p className={styles.subtitle} id="vault-secret-revoke-desc">
                {modalCopy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.clientName}>{secret.title || modalCopy.defaultSecretTitle}</div>
          {secret.description ? <p style={{
          margin: "0 0 0.85rem",
          fontSize: "0.8125rem",
          color: "var(--msp-muted, #5c6b82)"
        }}>
              {secret.description}
            </p> : null}
          {contactName ? <p style={{
          margin: "0 0 0.85rem",
          fontSize: "0.8125rem",
          color: "var(--msp-muted, #5c6b82)"
        }}>
              {interpolate(modalCopy.contactLine, {
            name: contactName
          })}
            </p> : null}
          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{modalCopy.consequences}</p>
            <ul className={styles.warningList}>
              <li>{modalCopy.bulletNoAccess}</li>
              <li>{expiryBullet}</li>
              <li>{modalCopy.bulletImmediate}</li>
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
                <Icon icon="mdi:key-remove" aria-hidden />
                {modalCopy.revoke}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
