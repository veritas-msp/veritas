import { Icon } from "@iconify/react";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";

function stepNumberValue(value, delta) {
  const current = Number(String(value ?? "").trim().replace(",", "."));
  const next = Number.isFinite(current) ? current + delta : delta > 0 ? 1 : 0;
  return String(next);
}

export default function FormNumberStepper({
  id,
  value,
  onChange,
  ariaIncrease = "Augmenter",
  ariaDecrease = "Diminuer"
}) {
  return <div className={styles.numberStepper}>
      <input id={id} type="number" className={styles.numberStepperInput} value={value ?? ""} onChange={e => onChange(e.target.value)} />
      <div className={styles.numberStepperActions}>
        <button type="button" className={styles.numberStepperBtn} onClick={() => onChange(stepNumberValue(value, 1))} aria-label={ariaIncrease} tabIndex={-1}>
          <Icon icon="mdi:chevron-up" width={14} height={14} aria-hidden />
        </button>
        <button type="button" className={styles.numberStepperBtn} onClick={() => onChange(stepNumberValue(value, -1))} aria-label={ariaDecrease} tabIndex={-1}>
          <Icon icon="mdi:chevron-down" width={14} height={14} aria-hidden />
        </button>
      </div>
    </div>;
}
