import { Icon } from "@iconify/react";
import styles from "./SetupWizard.module.css";
export default function SetupNumberInput({
  id,
  value,
  onChange,
  min = 1,
  max = 65535,
  required,
  "aria-describedby": ariaDescribedBy,
  ...handlers
}) {
  const adjust = delta => {
    const current = Number(value);
    const base = Number.isFinite(current) ? current : min;
    const next = Math.min(max, Math.max(min, base + delta));
    onChange({
      target: {
        value: String(next)
      }
    });
  };
  return <div className={styles.numberInputWrap}>
      <input id={id} type="number" className={styles.numberInput} value={value} onChange={onChange} min={min} max={max} required={required} aria-describedby={ariaDescribedBy} {...handlers} />
      <div className={styles.numberSteppers}>
        <button type="button" className={styles.numberStepBtn} tabIndex={-1} aria-hidden onClick={() => adjust(1)}>
          <Icon icon="mdi:chevron-up" aria-hidden />
        </button>
        <button type="button" className={styles.numberStepBtn} tabIndex={-1} aria-hidden onClick={() => adjust(-1)}>
          <Icon icon="mdi:chevron-down" aria-hidden />
        </button>
      </div>
    </div>;
}
