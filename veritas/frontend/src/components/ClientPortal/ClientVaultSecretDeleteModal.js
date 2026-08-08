import { createPortal } from "react-dom";
import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import styles from "../EnterprisesPage/EnterpriseDeleteModal.module.css";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
export default function ClientVaultSecretDeleteModal({
  open,
  secret,
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.vault;
  if (!open || !secret) return null;
  const viewsText = secret.views_remaining != null ? ` · ${copy.formatViewRemaining(secret.views_remaining, secret.max_views)}` : "";
  return createPortal(<div className={`${styles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="client-vault-secret-delete-title" aria-describedby="client-vault-secret-delete-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:key-remove" />
            </div>
            <div>
              <h2 className={styles.title} id="client-vault-secret-delete-title">
                {t.deleteModalTitle}
              </h2>
              <p className={styles.subtitle} id="client-vault-secret-delete-desc">
                {t.deleteModalSubtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.clientName}>{secret.title || t.deleteModalFallback}</div>
          {secret.description ? <p style={{
          margin: "0 0 0.85rem",
          fontSize: "0.8125rem",
          color: "var(--msp-muted, #5c6b82)"
        }}>
              {secret.description}
            </p> : null}
          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{t.deleteModalWarningTitle}</p>
            <ul className={styles.warningList}>
              <li>{t.deleteModalWarning1}</li>
              <li>
                {interpolate(t.deleteModalWarning2, {
                date: copy.formatPortalDateTime(secret.expires_at),
                views: viewsText
              })}
              </li>
              <li>{t.deleteModalWarning3}</li>
            </ul>
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {copy.common.cancel}
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={saving}>
            {saving ? <>
                <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                {t.deleting}
              </> : <>
                <Icon icon="mdi:delete-outline" aria-hidden />
                {t.deleteModalConfirm}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
