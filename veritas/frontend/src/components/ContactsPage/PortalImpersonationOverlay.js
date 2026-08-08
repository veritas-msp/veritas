import { createPortal } from "react-dom";
import { useMemo } from "react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy } from "./contactDetailI18n";
import styles from "./PortalImpersonationOverlay.module.css";
export default function PortalImpersonationOverlay({
  open,
  contactLabel,
  onCancel
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getContactDetailCopy(locale).portal.impersonation, [locale]);
  if (!open) return null;
  return createPortal(<div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="portal-impersonation-loading-title" aria-busy="true">
      <div className={styles.panel}>
        <div className={styles.spinnerWrap}>
          <span className={styles.spinner} aria-hidden />
        </div>
        <h2 id="portal-impersonation-loading-title" className={styles.title}>
          {copy.title}
        </h2>
        <p className={styles.subtitle}>
          {copy.signingInAs} <strong>{contactLabel || copy.contactFallback}</strong>…
        </p>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          {copy.cancel}
        </button>
      </div>
    </div>, document.body);
}
