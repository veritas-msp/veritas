import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  buildSupportCreditDebitsPayload,
  getTotalResolveCreditDebit,
  getUsableSupportCreditPacks
} from "./ticketClientSummaryUtils";
import { interpolate } from "../../i18n/translate";
import styles from "./SalesCreditDebitFields.module.css";

export function clampCreditAmount(value, max) {
  const n = Math.floor(Number(value) || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Math.max(0, Math.floor(Number(max) || 0)));
}

/** Default: 1 credit on the first usable pack only (not 1 per pack). */
export function buildSalesCreditDefaultAmounts(packs = [], legacyBalance = 0) {
  const usable = getUsableSupportCreditPacks(packs);
  if (usable.length > 0) {
    return { [usable[0].id]: Math.min(1, Number(usable[0].remaining_amount) || 0) };
  }
  if (Number(legacyBalance) > 0) return { __legacy: 1 };
  return {};
}

export function SalesCreditDebitFields({
  copy,
  supportCredit = null,
  enabled,
  onEnabledChange,
  amounts,
  onAmountsChange,
  disabled = false,
  alreadyDebited = false,
  compact = false
}) {
  const usablePacks = useMemo(() => getUsableSupportCreditPacks(supportCredit?.packs), [supportCredit?.packs]);
  const balance = Number(supportCredit?.balance || 0);
  const [perPackAmount, setPerPackAmount] = useState(1);
  const plannedTotal = useMemo(
    () => (enabled ? getTotalResolveCreditDebit(amounts, supportCredit?.packs) : 0),
    [enabled, amounts, supportCredit?.packs]
  );

  const applyPerPack = value => {
    const amount = clampCreditAmount(value, 999);
    setPerPackAmount(amount);
    if (usablePacks.length === 0) {
      onAmountsChange?.({ __legacy: clampCreditAmount(amount, balance) });
      return;
    }
    const next = {};
    usablePacks.forEach(pack => {
      next[pack.id] = Math.min(amount, Number(pack.remaining_amount) || 0);
    });
    onAmountsChange?.(next);
  };

  if (alreadyDebited) {
    return (
      <div className={`${styles.panel} ${compact ? styles.panelCompact : ""}`.trim()}>
        <div className={styles.alreadyRow}>
          <Icon icon="mdi:check-circle-outline" aria-hidden />
          <span>{copy.alreadyDebited || copy.alreadyTask}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${compact ? styles.panelCompact : ""}`.trim()}>
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
            <input
              type="checkbox"
              checked={Boolean(enabled)}
              onChange={e => onEnabledChange?.(e.target.checked)}
              disabled={disabled}
            />
            <span>{copy.enable}</span>
          </label>

          {enabled ? (
            <div className={styles.packPanel}>
              <div className={styles.bulkRow}>
                <div className={styles.bulkText}>
                  <span className={styles.bulkLabel}>{copy.perPackLabel}</span>
                  <span className={styles.bulkHint}>{copy.perPackHint}</span>
                </div>
                <input
                  type="number"
                  className={styles.amountInput}
                  min={0}
                  max={999}
                  value={perPackAmount}
                  onChange={e => applyPerPack(e.target.value)}
                  disabled={disabled}
                  aria-label={copy.perPackLabel}
                />
              </div>

              {usablePacks.length > 0 ? (
                <ul className={styles.packList}>
                  {usablePacks.map(pack => {
                    const remaining = Number(pack.remaining_amount) || 0;
                    const label = pack.label || `Pack #${String(pack.id).slice(0, 8)}`;
                    return (
                      <li key={pack.id} className={styles.packRow}>
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
                          value={amounts?.[pack.id] ?? 0}
                          onChange={e =>
                            onAmountsChange?.({
                              ...amounts,
                              [pack.id]: clampCreditAmount(e.target.value, remaining)
                            })
                          }
                          disabled={disabled}
                          aria-label={label}
                        />
                      </li>
                    );
                  })}
                </ul>
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
                    value={amounts?.__legacy ?? 0}
                    onChange={e =>
                      onAmountsChange?.({
                        __legacy: clampCreditAmount(e.target.value, balance)
                      })
                    }
                    disabled={disabled}
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
  );
}

export function getSalesCreditDebitsFromState(enabled, amounts, packs) {
  if (!enabled) return [];
  return buildSupportCreditDebitsPayload(amounts, packs);
}

export function getSalesCreditPlannedTotal(enabled, amounts, packs) {
  return enabled ? getTotalResolveCreditDebit(amounts, packs) : 0;
}
