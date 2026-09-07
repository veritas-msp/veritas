import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  buildDefaultResolveCreditAmounts,
  buildSupportCreditDebitsPayload,
  getTotalResolveCreditDebit,
  getUsableSupportCreditPacks
} from "./ticketClientSummaryUtils";
import { interpolate } from "../../i18n/translate";
import confirmStyles from "./TicketConfirmModal.module.css";
import styles from "./SalesCreditDebitModal.module.css";

function clampAmount(value, max) {
  const n = Math.floor(Number(value) || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Math.max(0, Math.floor(Number(max) || 0)));
}

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
  const usablePacks = useMemo(() => getUsableSupportCreditPacks(supportCredit?.packs), [supportCredit?.packs]);
  const balance = Number(supportCredit?.balance || 0);
  const [enabled, setEnabled] = useState(true);
  const [amounts, setAmounts] = useState({});
  const [perPackAmount, setPerPackAmount] = useState(1);

  useEffect(() => {
    if (!open) return;
    const defaults = buildDefaultResolveCreditAmounts(supportCredit?.packs || [], {
      defaultAmount: 1,
      legacyBalance: supportCredit?.balance ?? 0
    });
    setAmounts(defaults);
    setPerPackAmount(1);
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
    () => (enabled ? getTotalResolveCreditDebit(amounts, supportCredit?.packs) : 0),
    [enabled, amounts, supportCredit?.packs]
  );

  if (!open) return null;

  const applyPerPack = value => {
    const amount = clampAmount(value, 999);
    setPerPackAmount(amount);
    if (usablePacks.length === 0) {
      setAmounts({ __legacy: clampAmount(amount, balance) });
      return;
    }
    const next = {};
    usablePacks.forEach(pack => {
      next[pack.id] = Math.min(amount, Number(pack.remaining_amount) || 0);
    });
    setAmounts(next);
  };

  const handleConfirm = () => {
    const debits = enabled ? buildSupportCreditDebitsPayload(amounts, supportCredit?.packs) : [];
    onConfirm?.(debits);
  };

  return createPortal(
    <div className={confirmStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={confirmStyles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sales-credit-debit-title">
        <div className={confirmStyles.accentBar} aria-hidden />
        <div className={confirmStyles.header}>
          <div className={confirmStyles.headerMain}>
            <div className={confirmStyles.iconWrap} aria-hidden>
              <Icon icon="mdi:ticket-percent-outline" className={confirmStyles.headerIcon} />
            </div>
            <div>
              <h2 id="sales-credit-debit-title" className={confirmStyles.title}>
                {copy.title}
              </h2>
              <p className={confirmStyles.message}>
                {contextLabel ? interpolate(copy.subtitleWithContext, { context: contextLabel }) : copy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={confirmStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.balanceRow}>
            <Icon icon="mdi:wallet-outline" aria-hidden />
            <span>
              {balance > 0
                ? interpolate(balance === 1 ? copy.available : copy.availablePlural, { count: String(balance) })
                : copy.noneAvailable}
            </span>
          </div>

          {balance > 0 ? (
            <>
              <label className={styles.enableRow}>
                <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} disabled={saving} />
                <span>{copy.enable}</span>
              </label>

              {enabled ? (
                <div className={styles.packPanel}>
                  <div className={styles.bulkRow}>
                    <div>
                      <div className={styles.bulkLabel}>{copy.perPackLabel}</div>
                      <div className={styles.bulkHint}>{copy.perPackHint}</div>
                    </div>
                    <input
                      type="number"
                      className={styles.amountInput}
                      min={0}
                      max={999}
                      value={perPackAmount}
                      onChange={e => applyPerPack(e.target.value)}
                      disabled={saving}
                      aria-label={copy.perPackLabel}
                    />
                  </div>

                  {usablePacks.length > 0 ? (
                    <div className={styles.packList}>
                      {usablePacks.map(pack => {
                        const remaining = Number(pack.remaining_amount) || 0;
                        const label = pack.label || `Pack #${String(pack.id).slice(0, 8)}`;
                        return (
                          <div key={pack.id} className={styles.packRow}>
                            <div className={styles.packMeta}>
                              <span className={styles.packLabel}>{label}</span>
                              <span className={styles.packRemaining}>
                                {interpolate(copy.packRemaining, { count: String(remaining) })}
                              </span>
                            </div>
                            <input
                              type="number"
                              className={styles.amountInput}
                              min={0}
                              max={remaining}
                              value={amounts[pack.id] ?? 0}
                              onChange={e =>
                                setAmounts(prev => ({
                                  ...prev,
                                  [pack.id]: clampAmount(e.target.value, remaining)
                                }))
                              }
                              disabled={saving}
                              aria-label={label}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.packRow}>
                      <div className={styles.packMeta}>
                        <span className={styles.packLabel}>{copy.legacyLabel}</span>
                      </div>
                      <input
                        type="number"
                        className={styles.amountInput}
                        min={0}
                        max={balance}
                        value={amounts.__legacy ?? 0}
                        onChange={e =>
                          setAmounts({
                            __legacy: clampAmount(e.target.value, balance)
                          })
                        }
                        disabled={saving}
                        aria-label={copy.legacyLabel}
                      />
                    </div>
                  )}

                  <div className={styles.totalRow}>
                    {interpolate(copy.totalDebit, { count: String(plannedTotal) })}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className={confirmStyles.footer}>
          {allowSkip ? (
            <button type="button" className={confirmStyles.cancelBtn} onClick={() => onSkip?.()} disabled={saving}>
              {copy.skip}
            </button>
          ) : (
            <button type="button" className={confirmStyles.cancelBtn} onClick={onClose} disabled={saving}>
              {copy.cancel}
            </button>
          )}
          <button
            type="button"
            className={confirmStyles.confirmBtn}
            onClick={handleConfirm}
            disabled={saving || (enabled && plannedTotal <= 0 && balance > 0)}
          >
            <Icon icon={saving ? "mdi:loading" : "mdi:check-bold"} className={saving ? confirmStyles.confirmSpinner : undefined} />
            {saving ? copy.saving : enabled && plannedTotal > 0 ? copy.confirm : allowSkip ? copy.confirmWithout : copy.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
