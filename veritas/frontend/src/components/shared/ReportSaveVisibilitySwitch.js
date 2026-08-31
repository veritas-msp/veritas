import { useMemo } from "react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getReportSaveVisibilityCopy } from "./reportSaveVisibilityI18n";
import styles from "./ReportSaveVisibilitySwitch.module.css";
export default function ReportSaveVisibilitySwitch({
  visibleToClient,
  onChange,
  copy: copyProp,
  disabled = false,
  compact = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => copyProp || getReportSaveVisibilityCopy(locale), [copyProp, locale]);
  const switchBtn = <button type="button" role="switch" aria-checked={visibleToClient} aria-label={copy.label} className={`${styles.switch} ${compact ? styles.switchCompact : ""} ${visibleToClient ? styles.switchOn : ""}`.trim()} onClick={() => onChange(!visibleToClient)} disabled={disabled}>
        <span className={styles.track}>
          <span className={styles.thumb} />
        </span>
        <span className={styles.state}>{visibleToClient ? copy.on : copy.off}</span>
      </button>;
  if (compact) return switchBtn;
  return <div className={styles.row}>
      <div className={styles.copy}>
        <span className={styles.label}>{copy.label}</span>
        <p className={styles.hint}>{copy.hint}</p>
      </div>
      {switchBtn}
    </div>;
}
