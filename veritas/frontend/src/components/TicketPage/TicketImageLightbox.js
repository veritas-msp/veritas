import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import styles from "./TicketDetailPage.module.css";

/**
 * Full-size image preview overlay for ticket reply attachments / inline images.
 */
export default function TicketImageLightbox({ open, src, alt = "", onClose, closeAria = "Fermer" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !src) return null;

  return createPortal(
    <div className={styles.imageLightboxOverlay} role="presentation" onClick={() => onClose?.()}>
      <div
        className={styles.imageLightbox}
        role="dialog"
        aria-modal="true"
        aria-label={alt || "Image"}
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className={styles.imageLightboxClose} onClick={() => onClose?.()} aria-label={closeAria}>
          <FaTimes aria-hidden />
        </button>
        <img src={src} alt={alt || ""} className={styles.imageLightboxImg} />
      </div>
    </div>,
    document.body
  );
}
