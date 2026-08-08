import React from "react";
import { formatCapacityHint, sanitizeDiskCapacity } from "./storageDiskUtils";
import { interpolate } from "../../i18n/translate";
import styles from "./CapacityInput.module.css";
const PRESETS_GB = [{
  label: "500 GB",
  value: "500"
}, {
  label: "1 TB",
  value: "1024"
}, {
  label: "2 TB",
  value: "2048"
}, {
  label: "4 TB",
  value: "4096"
}, {
  label: "6 TB",
  value: "6144"
}, {
  label: "8 TB",
  value: "8192"
}, {
  label: "10 TB",
  value: "10240"
}, {
  label: "12 TB",
  value: "12288"
}, {
  label: "16 TB",
  value: "16384"
}, {
  label: "20 TB",
  value: "20480"
}, {
  label: "24 TB",
  value: "24576"
}, {
  label: "32 TB",
  value: "32768"
}, {
  label: "48 TB",
  value: "49152"
}, {
  label: "64 TB",
  value: "65536"
}, {
  label: "80 TB",
  value: "81920"
}, {
  label: "100 TB",
  value: "102400"
}];
export default function CapacityInput({
  id,
  label = "Total capacity",
  value,
  onChange,
  placeholder = "16000",
  showPresets = true,
  hint,
  widgetsCopy = {}
}) {
  const sanitized = sanitizeDiskCapacity(value);
  const autoHint = hint ?? formatCapacityHint(sanitized);
  const unitLabel = widgetsCopy.unitGb || "GB";
  return <div className={styles.wrap}>
      {label ? <label className={styles.label} htmlFor={id}>
          {label}
        </label> : null}
      <div className={styles.inputShell}>
        <input id={id} type="text" inputMode="numeric" className={styles.input} value={sanitized} placeholder={placeholder} onChange={event => onChange(sanitizeDiskCapacity(event.target.value))} />
        <span className={styles.suffix} aria-hidden>
          {unitLabel}
        </span>
      </div>
      {autoHint ? <span className={styles.hint}>
          {interpolate(widgetsCopy.totalApprox || "≈ {hint}", {
        hint: autoHint
      })}
        </span> : null}
      {showPresets ? <div className={styles.presets}>
          {PRESETS_GB.map(preset => <button key={preset.value} type="button" className={styles.presetBtn} onClick={() => onChange(preset.value)}>
              {preset.label}
            </button>)}
        </div> : null}
    </div>;
}
