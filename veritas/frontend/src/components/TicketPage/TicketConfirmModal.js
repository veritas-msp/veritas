import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import styles from "./TicketConfirmModal.module.css";
export default function TicketConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "default",
  icon = "mdi:alert-circle-outline",
  loading = false,
  onClose,
  onConfirm
}) {
  const copy = useCommonCopy();
  const isDanger = variant === "danger";
  const titleId = "ticket-confirm-modal-title";
  const resolvedConfirmLabel = confirmLabel || copy.confirm;
  const resolvedCancelLabel = cancelLabel || copy.cancel;
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);
  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={loading ? undefined : onClose} role="presentation">
      <div className={styles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={`${styles.accentBar} ${isDanger ? styles.accentBarDanger : ""}`.trim()} aria-hidden />
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={`${styles.iconWrap} ${isDanger ? styles.iconWrapDanger : ""}`.trim()} aria-hidden>
              <Icon icon={icon} className={styles.headerIcon} />
            </div>
            <div>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {message ? <p className={styles.message}>{message}</p> : null}
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={loading} aria-label={copy.close}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            {resolvedCancelLabel}
          </button>
          <button type="button" className={`${styles.confirmBtn} ${isDanger ? styles.confirmBtnDanger : ""}`.trim()} onClick={onConfirm} disabled={loading}>
            <Icon icon={loading ? "mdi:loading" : isDanger ? "mdi:delete-outline" : "mdi:check-bold"} className={loading ? styles.confirmSpinner : undefined} />
            {loading ? copy.processing : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>, document.body);
}
