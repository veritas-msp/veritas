import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy } from "./contactDetailI18n";
import styles from "./ContactPortalPasswordModal.module.css";
function formatContactName(contact, fallback) {
  const parts = [contact?.prenom, contact?.nom].filter(Boolean);
  return parts.join(" ").trim() || fallback;
}
export default function ContactPortalPasswordModal({
  open,
  mode = "create",
  contact,
  saving = false,
  onClose,
  onSubmit
}) {
  const locale = useAppLocale();
  const portalCopy = useMemo(() => getContactDetailCopy(locale).portal, [locale]);
  const modalCopy = portalCopy.passwordModal;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isCreate = mode === "create";
  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, [open, mode]);
  if (!open || !contact) return null;
  const loginEmail = (contact.portal_email || contact.email || "").trim();
  const displayName = formatContactName(contact, modalCopy.defaultName);
  const handleSubmit = async event => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error(modalCopy.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(modalCopy.passwordMismatch);
      return;
    }
    await onSubmit(password);
  };
  const title = isCreate ? modalCopy.createTitle : modalCopy.resetTitle;
  const subtitle = isCreate ? modalCopy.createSubtitle : modalCopy.resetSubtitle;
  const submitLabel = isCreate ? modalCopy.createSubmit : modalCopy.resetSubmit;
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="contact-portal-password-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:account-key-outline" : "mdi:key-outline"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={styles.title} id="contact-portal-password-modal-title">
                {title}
              </h2>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <p className={styles.contactSummary}>
            <strong>{displayName}</strong>
            {loginEmail ? <>
                {" "}
                {portalCopy.loginVia} <strong>{loginEmail}</strong>
              </> : null}
          </p>

          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="portal-password">
                {modalCopy.passwordLabel}
              </label>
              <input id="portal-password" type={showPassword ? "text" : "password"} className={styles.input} value={password} onChange={e => setPassword(e.target.value)} placeholder={modalCopy.passwordPlaceholder} autoComplete="new-password" autoFocus />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="portal-password-confirm">
                {modalCopy.confirmLabel}
              </label>
              <input id="portal-password-confirm" type={showPassword ? "text" : "password"} className={styles.input} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={modalCopy.confirmPlaceholder} autoComplete="new-password" />
            </div>
          </div>

          <label className={styles.visibilityToggle}>
            <span className={styles.visibilityLabel}>{modalCopy.showPasswords}</span>
            <span className={styles.switchWrap}>
              <input type="checkbox" className={styles.switchInput} checked={showPassword} onChange={e => setShowPassword(e.target.checked)} role="switch" aria-checked={showPassword} />
              <span className={styles.switchTrack} aria-hidden="true">
                <span className={styles.switchThumb} />
              </span>
            </span>
          </label>
        </form>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>{modalCopy.footerHint}</span>
          <div className={styles.footerActions}>
            <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
              {modalCopy.cancel}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleSubmit} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {modalCopy.saving}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {submitLabel}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
