import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  SalesCreditDebitFields,
  buildSalesCreditDefaultAmounts,
  getSalesCreditDebitsFromState,
  getSalesCreditPlannedTotal
} from "./SalesCreditDebitFields";
import { interpolate } from "../../i18n/translate";
import styles from "./SalesCreditDebitModal.module.css";

export default function SalesCreditDebitModal({
  open,
  copy,
  supportCredit = null,
  contextLabel = "",
  allowSkip = false,
  saving = false,
  onClose,
  onConfirm,
  onSkip
}) {
  const balance = Number(supportCredit?.balance || 0);
  const [enabled, setEnabled] = useState(true);
  const [amounts, setAmounts] = useState({});

  useEffect(() => {
    if (!open) return;
    setAmounts(buildSalesCreditDefaultAmounts(supportCredit?.packs || [], supportCredit?.balance ?? 0));
    setEnabled(balance > 0);
  }, [open, supportCredit?.packs, supportCredit?.balance, balance]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);

  const plannedTotal = useMemo(
    () => getSalesCreditPlannedTotal(enabled, amounts, supportCredit?.packs),
    [enabled, amounts, supportCredit?.packs]
  );

  if (!open) return null;

  const handleConfirm = () => {
    const debits = getSalesCreditDebitsFromState(enabled, amounts, supportCredit?.packs);
    onConfirm?.(debits);
  };

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-credit-debit-title"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:ticket-percent-outline" />
            </div>
            <div className={styles.headerText}>
              <h2 id="sales-credit-debit-title" className={styles.title}>
                {copy.title}
              </h2>
              <p className={styles.subtitle}>
                {contextLabel ? interpolate(copy.subtitleWithContext, { context: contextLabel }) : copy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <SalesCreditDebitFields
            copy={copy}
            supportCredit={supportCredit}
            enabled={enabled}
            onEnabledChange={setEnabled}
            amounts={amounts}
            onAmountsChange={setAmounts}
            disabled={saving}
          />
        </div>

        <footer className={styles.footer}>
          {allowSkip ? (
            <button type="button" className={styles.secondaryBtn} onClick={() => onSkip?.()} disabled={saving}>
              {copy.skip}
            </button>
          ) : (
            <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
              {copy.cancel}
            </button>
          )}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleConfirm}
            disabled={saving || (enabled && plannedTotal <= 0 && balance > 0)}
          >
            <Icon icon={saving ? "mdi:loading" : "mdi:check-bold"} className={saving ? styles.spinning : undefined} />
            {saving ? copy.saving : enabled && plannedTotal > 0 ? copy.confirm : allowSkip ? copy.confirmWithout : copy.confirm}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
