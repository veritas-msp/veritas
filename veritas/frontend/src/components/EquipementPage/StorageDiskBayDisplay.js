import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { buildDiskBayState, formatCapacityHint } from "./storageDiskUtils";
import styles from "./StorageDiskBayPicker.module.css";
export default function StorageDiskBayDisplay({
  formData,
  widgetsCopy = {}
}) {
  const state = useMemo(() => buildDiskBayState({
    nbDisquesActuels: formData?.nbDisquesActuels,
    nbDisquesMax: formData?.nbDisquesMax,
    disques: formData?.disques,
    capacite: formData?.capacite
  }), [formData?.nbDisquesActuels, formData?.nbDisquesMax, formData?.disques, formData?.capacite]);
  const unitGb = widgetsCopy.unitGb || "Go";
  if (state.activeCount === 0 && state.maxBays <= 0) return null;
  return <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>{widgetsCopy.title || "Baies de disques"}</span>
        <span className={styles.summary}>
          {interpolate(widgetsCopy.installedSummary || "{active} / {max} installed", {
          active: state.activeCount,
          max: state.maxBays
        })}
        </span>
      </div>

      <div className={styles.bayPanel}>
        <div className={styles.bayGrid} role="list" aria-label={widgetsCopy.title || "Baies de disques"}>
          {Array.from({
          length: state.maxBays
        }, (_, index) => {
          const filled = index < state.activeCount;
          const capacity = state.disques[index]?.capacite || "";
          const capacityHint = capacity ? formatCapacityHint(capacity) : "";
          return <div key={`disk-bay-${index}`} className={styles.bayItem} role="listitem">
                <div className={[styles.bayButton, styles.bayReadonly, filled ? styles.bayButtonFilled : ""].filter(Boolean).join(" ")} aria-hidden>
                  <span className={styles.bayIndex}>{index + 1}</span>
                  <Icon icon={filled ? "mdi:harddisk" : "mdi:circle-outline"} width={20} height={20} />
                </div>
                {filled ? <span className={styles.bayCapacityReadonly} title={capacityHint || undefined}>
                    {capacity ? `${capacity} ${unitGb}` : "—"}
                  </span> : <span className={styles.bayCapacityLabel}>
                    {widgetsCopy.legendEmpty || "Baie libre"}
                  </span>}
              </div>;
        })}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotFilled}`} />
            {widgetsCopy.legendInstalled || "Installed disk"}
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotEmpty}`} />
            {widgetsCopy.legendEmpty || "Baie libre"}
          </span>
        </div>
      </div>
    </div>;
}
