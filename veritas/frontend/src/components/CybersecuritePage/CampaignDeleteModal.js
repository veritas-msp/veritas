import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy, formatCampaignDetail } from "./campaignDetailI18n";
import shellStyles from "../EnterprisesPage/EnterpriseDeleteModal.module.css";
import styles from "./CampaignDeleteModal.module.css";

export default function CampaignDeleteModal({
  open,
  campaignName,
  saving = false,
  onClose,
  onConfirm
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCampaignDetailCopy(locale).delete, [locale]);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  if (!open) return null;

  const canConfirm = confirmText === copy.confirmWord;
  const displayName = campaignName || copy.title;

  return createPortal(
    <div className={shellStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={shellStyles.shell}
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="campaign-delete-modal-title"
        aria-describedby="campaign-delete-modal-desc"
      >
        <div className={shellStyles.accentBar} aria-hidden />
        <header className={shellStyles.header}>
          <div className={shellStyles.headerMain}>
            <div className={shellStyles.iconWrap} aria-hidden>
              <Icon icon="mdi:delete-alert-outline" />
            </div>
            <div>
              <h2 className={shellStyles.title} id="campaign-delete-modal-title">
                {copy.title}
              </h2>
              <p className={shellStyles.subtitle} id="campaign-delete-modal-desc">
                {copy.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={shellStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={copy.cancel}
          >
            <FaTimes />
          </button>
        </header>

        <div className={shellStyles.body}>
          {campaignName ? <div className={shellStyles.clientName}>{displayName}</div> : null}
          <label className={styles.confirmLabel} htmlFor="campaign-delete-confirm-input">
            {formatCampaignDetail(copy.confirmLabel, { word: copy.confirmWord })}
          </label>
          <input
            id="campaign-delete-confirm-input"
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={copy.confirmPlaceholder}
            className={styles.confirmInput}
            autoFocus
            disabled={saving}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <footer className={shellStyles.footer}>
          <button type="button" className={shellStyles.ghostBtn} onClick={onClose} disabled={saving}>
            {copy.cancel}
          </button>
          <button
            type="button"
            className={shellStyles.dangerBtn}
            onClick={onConfirm}
            disabled={saving || !canConfirm}
          >
            {saving ? (
              <>
                <Icon icon="mdi:loading" className={shellStyles.spinning} aria-hidden />
                {copy.confirm}
              </>
            ) : (
              <>
                <Icon icon="mdi:trash-can-outline" aria-hidden />
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
