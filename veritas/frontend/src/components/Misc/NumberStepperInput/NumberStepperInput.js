import { Icon } from "@iconify/react";
import styles from "./NumberStepperInput.module.css";
function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
export default function NumberStepperInput({
  id,
  value,
  onChange,
  inputClassName = "",
  min = 1,
  step = 1,
  max = null,
  placeholder,
  increaseAriaLabel = "Increase value",
  decreaseAriaLabel = "Decrease value",
  required = false,
  allowEmpty = false
}) {
  const parsed = parseNumber(value);
  const isEmpty = value === "" || value == null;
  const current = parsed == null ? min : parsed;
  const clampValue = num => {
    let result = Math.max(min, Number(num) || min);
    if (max != null) result = Math.min(max, result);
    return result;
  };
  const emit = next => {
    if (allowEmpty && next === "") {
      onChange("");
      return;
    }
    const clamped = clampValue(next);
    if (typeof value === "number" && !allowEmpty) {
      onChange(clamped);
      return;
    }
    onChange(String(clamped));
  };
  const handleInputChange = event => {
    const raw = event.target.value;
    if (allowEmpty && raw === "") {
      onChange("");
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) return;
    emit(clampValue(num));
  };
  const increment = () => {
    if (max != null && !isEmpty && parsed != null && current >= max) return;
    const base = isEmpty || parsed == null ? min - step : current;
    emit(base + step);
  };
  const decrement = () => {
    if (isEmpty || parsed == null || current <= min) return;
    emit(current - step);
  };
  const displayValue = allowEmpty && isEmpty ? "" : current;
  return <div className={styles.numberStepper}>
      <input id={id} type="number" min={min} max={max ?? undefined} step={step} className={`${inputClassName} ${styles.numberStepperInput}`} value={displayValue} onChange={handleInputChange} placeholder={placeholder} required={required} />
      <div className={styles.numberStepperActions}>
        <button type="button" className={styles.numberStepperBtn} onClick={increment} disabled={max != null && !isEmpty && parsed != null && current >= max} aria-label={increaseAriaLabel}>
          <Icon icon="mdi:chevron-up" aria-hidden />
        </button>
        <button type="button" className={styles.numberStepperBtn} onClick={decrement} disabled={isEmpty || parsed == null || current <= min} aria-label={decreaseAriaLabel}>
          <Icon icon="mdi:chevron-down" aria-hidden />
        </button>
      </div>
    </div>;
}
