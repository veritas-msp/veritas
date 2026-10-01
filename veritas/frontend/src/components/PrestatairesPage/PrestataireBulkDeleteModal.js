import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { bulkUpdatePrestataires } from "../../api/prestataires";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getPrestatairePageCopy } from "./prestatairePageI18n";
import styles from "../EnterprisesPage/EnterpriseDeleteModal.module.css";

export default function PrestataireBulkDeleteModal({
  open,
  prestataireIds = [],
  onClose,
  onSuccess
}) {
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getPrestatairePageCopy(locale), [locale]);
  const copy = pageCopy.bulkDeleteModal;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await bulkUpdatePrestataires({
        prestataireIds,
        action: "delete"
      });
      onSuccess?.(result);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || copy.submitError);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="prestataire-bulk-delete-title"
        aria-describedby="prestataire-bulk-delete-desc"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:delete-alert-outline" />
            </div>
            <div>
              <h2 className={styles.title} id="prestataire-bulk-delete-title">
                {copy.title}
              </h2>
              <p className={styles.subtitle} id="prestataire-bulk-delete-desc">
                {pageCopy.formatBulkDeleteSubtitle(prestataireIds.length)}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.clientName}>{pageCopy.formatBulkDeleteCount(prestataireIds.length)}</div>
          <div className={styles.warningBox}>
            <p className={styles.warningTitle}>{copy.consequences}</p>
            <ul className={styles.warningList}>
              {copy.bullets.map(bullet => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          {error ? (
            <p style={{ margin: "0.75rem 0 0", color: "#b42318", fontSize: "0.84rem" }}>{error}</p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {copy.cancel}
          </button>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={handleConfirm}
            disabled={saving || prestataireIds.length === 0}
          >
            {saving ? (
              <>
                <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                {copy.deleting}
              </>
            ) : (
              <>
                <Icon icon="mdi:delete-alert-outline" aria-hidden />
                {copy.confirm}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
