import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import styles from "./BackupAddChoiceModal.module.css";

export default function BackupAddChoiceModal({
  open,
  onClose,
  onChooseInstance,
  onChooseJob,
  canAddJob = true,
  addInstanceLabel = "Instance",
  addJobLabel = "Job",
  addJobDisabledHint = "Ajoutez d’abord une instance",
  title = "Que souhaitez-vous ajouter ?",
  subtitle = "Choisissez le type d’élément à créer."
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-add-choice-title"
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIcon} aria-hidden>
              <Icon icon="mdi:plus-circle-outline" />
            </div>
            <div>
              <h2 id="backup-add-choice-title" className={styles.title}>
                {title}
              </h2>
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.choiceGrid}>
            <button
              type="button"
              className={styles.choiceTile}
              onClick={() => {
                onClose?.();
                onChooseInstance?.();
              }}
            >
              <span className={styles.choiceIconWrap} aria-hidden>
                <Icon icon="mdi:server" />
              </span>
              <span className={styles.choiceLabel}>{addInstanceLabel}</span>
            </button>

            <button
              type="button"
              className={styles.choiceTile}
              disabled={!canAddJob}
              title={!canAddJob ? addJobDisabledHint : addJobLabel}
              onClick={() => {
                if (!canAddJob) return;
                onClose?.();
                onChooseJob?.();
              }}
            >
              <span className={styles.choiceIconWrap} aria-hidden>
                <Icon icon="mdi:clipboard-list-outline" />
              </span>
              <span className={styles.choiceLabel}>{addJobLabel}</span>
              {!canAddJob ? <p className={styles.choiceHint}>{addJobDisabledHint}</p> : null}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
