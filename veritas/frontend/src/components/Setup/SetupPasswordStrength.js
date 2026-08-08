import { useMemo } from "react";
import { ADMIN_PASSWORD_MIN_LENGTH, getPasswordRuleStatuses, getPasswordStrength } from "../../utils/passwordPolicy";
import styles from "./SetupPasswordStrength.module.css";
export default function SetupPasswordStrength({
  password,
  copy
}) {
  const rules = useMemo(() => getPasswordRuleStatuses(password), [password]);
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) {
    return null;
  }
  const strengthLabel = copy.strength[strength] || copy.strength.empty;
  return <div className={styles.wrap} aria-live="polite">
      <div className={styles.strengthRow}>
        <span className={styles.strengthLabel}>{copy.title}</span>
        <span className={`${styles.strengthValue} ${styles[`strength_${strength}`]}`}>
          {strengthLabel}
        </span>
      </div>
      <div className={styles.meter} role="progressbar" aria-valuemin={0} aria-valuemax={rules.length} aria-valuenow={rules.filter(rule => rule.met).length} aria-label={strengthLabel}>
        <div className={`${styles.meterFill} ${styles[`meter_${strength}`]}`} style={{
        width: `${Math.round(rules.filter(rule => rule.met).length / rules.length * 100)}%`
      }} />
      </div>
      <ul className={styles.rules}>
        {rules.map(rule => <li key={rule.code} className={rule.met ? styles.ruleMet : styles.rulePending}>
            <span className={styles.ruleIcon} aria-hidden>
              {rule.met ? "✓" : "○"}
            </span>
            {copy.rules[rule.code]?.replace("{{min}}", String(ADMIN_PASSWORD_MIN_LENGTH))}
          </li>)}
      </ul>
    </div>;
}
