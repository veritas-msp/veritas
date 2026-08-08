import { Icon } from "@iconify/react";
import styles from "./RapportInterventionBuilder.module.css";
function parseNumber(value, fallback = 0) {
  const parsed = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  decimals = null,
  compact = false,
  className = "",
  ariaLabel
}) {
  const numeric = parseNumber(value, 0);
  const format = num => {
    if (decimals != null) return num.toFixed(decimals);
    return String(num);
  };
  const apply = next => {
    let clamped = next;
    if (min != null) clamped = Math.max(min, clamped);
    if (max != null) clamped = Math.min(max, clamped);
    onChange(format(clamped));
  };
  return <div className={`${styles.numberStepper} ${compact ? styles.numberStepperCompact : ""} ${className}`}>
      <input type="text" inputMode="decimal" className={styles.numberStepperInput} value={value ?? ""} aria-label={ariaLabel} onChange={event => onChange(event.target.value)} onBlur={() => {
      if (String(value ?? "").trim() === "") return;
      apply(parseNumber(value, min ?? 0));
    }} />
      <div className={styles.numberStepperActions}>
        <button type="button" className={styles.numberStepperBtn} aria-label="Augmenter" onClick={() => apply(numeric + step)}>
          <Icon icon="mdi:chevron-up" aria-hidden />
        </button>
        <button type="button" className={styles.numberStepperBtn} aria-label="Diminuer" onClick={() => apply(Math.max(min ?? 0, numeric - step))}>
          <Icon icon="mdi:chevron-down" aria-hidden />
        </button>
      </div>
    </div>;
}
export function MovementTypePicker({
  value,
  options,
  onChange,
  compact = false
}) {
  return <div className={`${styles.movementPicker} ${compact ? styles.movementPickerCompact : ""}`} role="group">
      {options.map(option => {
      const isActive = value === option.value;
      return <button key={option.value} type="button" title={option.label} className={`${styles.movementPill} ${compact ? styles.movementPillCompact : ""} ${styles[`movementPill_${option.tone}`]} ${isActive ? styles.movementPillActive : ""}`} aria-pressed={isActive} aria-label={option.label} onClick={() => onChange(option.value)}>
            <Icon icon={option.icon} aria-hidden />
            {!compact ? option.label : null}
          </button>;
    })}
    </div>;
}
export function ModernToggle({
  checked,
  onChange,
  labelOn,
  labelOff
}) {
  return <button type="button" role="switch" aria-checked={checked} className={`${styles.modernToggle} ${checked ? styles.modernToggleOn : ""}`} onClick={() => onChange(!checked)}>
      <span className={styles.modernToggleTrack}>
        <span className={styles.modernToggleThumb} />
      </span>
      <span className={styles.modernToggleLabel}>{checked ? labelOn : labelOff}</span>
    </button>;
}
