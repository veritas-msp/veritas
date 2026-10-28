import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import ReportSaveVisibilitySwitch from "../shared/ReportSaveVisibilitySwitch";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./SaveSupervisionReportModal.module.css";

export default function SaveSupervisionReportModal({
  open,
  saving = false,
  saveName,
  onSaveNameChange,
  visibleToClient,
  onVisibleToClientChange,
  onClose,
  onSubmit,
  clientName = "",
  nameError = ""
}) {
  if (!open) return null;

  const trimmed = String(saveName || "").trim();
  const canSubmit = Boolean(trimmed) && !saving && !nameError;

  return createPortal(
    <div className={formStyles.overlay} onClick={() => { if (!saving) onClose?.(); }} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.saveShell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-supervision-report-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-file-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>Rapports de supervision</p>
              <h2 className={formStyles.title} id="save-supervision-report-title">
                Enregistrer le rapport
              </h2>
              <p className={formStyles.subtitle}>
                {clientName
                  ? `Dossier HTML dans le coffre de ${clientName}.`
                  : "Dossier HTML dans le coffre documentaire."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`${formStyles.closeBtn} ${styles.closeBtn}`}
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
            title="Fermer"
          >
            <FaTimes />
          </button>
        </header>

        <div className={`${formStyles.bodySingle} ${styles.saveBody}`}>
          <div className={`${formStyles.content} ${styles.saveContent}`}>
            <div className={styles.sectionStack}>
              <label className={styles.fieldLabel} htmlFor="save-report-name">
                Nom du dossier / document
              </label>
              <input
                id="save-report-name"
                className={`${styles.nameInput}${nameError ? ` ${styles.nameInputError}` : ""}`.trim()}
                value={saveName}
                onChange={event => onSaveNameChange?.(event.target.value)}
                placeholder="Ex. Rapport supervision — août 2026"
                autoFocus
                disabled={saving}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "save-report-name-error" : undefined}
              />
              {nameError ? (
                <p id="save-report-name-error" className={styles.nameError} role="alert">
                  <Icon icon="mdi:alert-circle-outline" width={16} height={16} aria-hidden />
                  {nameError}
                </p>
              ) : null}

              <div className={styles.visibilityBlock}>
                <ReportSaveVisibilitySwitch
                  visibleToClient={visibleToClient}
                  onChange={onVisibleToClientChange}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>Dossier + 3 HTML dans le coffre</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={() => onSubmit?.()}
              disabled={!canSubmit}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
