import React from "react";
import { Icon } from "@iconify/react";
import styles from "./EquipmentDetailPage.module.css";
import { EQUIPMENT_ACTIVITY_PRESETS, toDateInputValue } from "./equipmentActivityUtils";
export default function EquipmentDateRangeFilter({
  copy,
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange
}) {
  const presets = EQUIPMENT_ACTIVITY_PRESETS.map(row => ({
    ...row,
    label: copy?.dateRange?.presets?.[row.value] || row.value
  }));
  return <div className={styles.activityFilterBar}>
      <div className={styles.activityPresetGroup} role="group" aria-label={copy?.dateRange?.aria}>
        {presets.map(row => <button key={row.value} type="button" className={`${styles.activityPresetBtn} ${preset === row.value ? styles.activityPresetBtnActive : ""}`} onClick={() => onPresetChange(row.value)}>
            {row.label}
          </button>)}
        <button type="button" className={`${styles.activityPresetBtn} ${preset === "custom" ? styles.activityPresetBtnActive : ""}`} onClick={() => onPresetChange("custom")}>
          {copy?.dateRange?.custom || "Custom"}
        </button>
      </div>

      {preset === "custom" ? <div className={styles.activityCustomRange}>
          <label className={styles.activityDateField}>
            <span>{copy?.dateRange?.from || "From"}</span>
            <input type="date" value={customStart || ""} max={customEnd || toDateInputValue(new Date())} onChange={e => onCustomStartChange(e.target.value)} />
          </label>
          <Icon icon="mdi:arrow-right" className={styles.activityRangeArrow} aria-hidden />
          <label className={styles.activityDateField}>
            <span>{copy?.dateRange?.to || "To"}</span>
            <input type="date" value={customEnd || ""} min={customStart || undefined} max={toDateInputValue(new Date())} onChange={e => onCustomEndChange(e.target.value)} />
          </label>
        </div> : null}
    </div>;
}
