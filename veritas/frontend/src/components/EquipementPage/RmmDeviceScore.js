import React from "react";
import styles from "./RmmHardwareOverview.module.css";

/** Compact score card for the equipment dashboard right rail. */
export function ScoreAside({
  health,
  copy
}) {
  if (!health) return null;
  return <aside className={`${styles.scoreAside} ${styles[`scoreAside_${health.tone}`] || ""}`} aria-label={copy.scoreTitle}>
      <div className={styles.scoreAsideGrade} aria-hidden>{health.grade}</div>
      <div className={styles.scoreAsideBody}>
        <p className={styles.scoreAsideTitle}>{copy.scoreTitle}</p>
        <p className={styles.scoreAsideScore}>
          {health.score}<span className={styles.scoreAsideOutOf}>/100</span>
        </p>
        <div className={styles.scoreAsideMeter} aria-hidden>
          <div className={`${styles.meterFill} ${styles[`meter_${health.tone}`] || ""}`} style={{
          width: `${health.score}%`
        }} />
        </div>
      </div>
    </aside>;
}
