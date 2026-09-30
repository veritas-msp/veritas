import React from "react";
import { Icon } from "@iconify/react";
import styles from "./RmmHardwareOverview.module.css";

const CHECK_ICONS = {
  defender: "mdi:shield-check-outline",
  firewall: "mdi:wall-fire",
  bitlocker: "mdi:lock-outline",
  updates: "mdi:update",
  services: "mdi:cog-outline",
  online: "mdi:lan-connect",
  disk: "mdi:harddisk"
};

function checkLabel(key, copy) {
  const labels = copy?.checks || {};
  return labels[key] || key;
}

function checkStatusMeta(check, copy) {
  if (check?.ok === true) {
    return {
      tone: "good",
      label: copy?.statusOk || "OK",
      detail: copy?.statusOkHint || ""
    };
  }
  if (check?.ok === false) {
    return {
      tone: "bad",
      label: copy?.statusBad || "À traiter",
      detail: check.weight
        ? (copy?.formatPenalty?.(check.weight) || `−${check.weight}`)
        : ""
    };
  }
  return {
    tone: "unknown",
    label: copy?.statusUnknown || "—",
    detail: copy?.statusUnknownHint || ""
  };
}

/** Score card + criteria breakdown for the equipment dashboard right rail. */
export function ScoreAside({
  health,
  copy
}) {
  if (!health) return null;
  const checks = Array.isArray(health.checks) ? health.checks : [];
  return (
    <aside className={`${styles.scoreAside} ${styles[`scoreAside_${health.tone}`] || ""}`} aria-label={copy.scoreTitle}>
      <div className={styles.scoreAsideHero}>
        <div className={styles.scoreAsideGrade} aria-hidden>{health.grade}</div>
        <div className={styles.scoreAsideBody}>
          <p className={styles.scoreAsideTitle}>{copy.scoreTitle}</p>
          <p className={styles.scoreAsideScore}>
            {health.score}<span className={styles.scoreAsideOutOf}>/100</span>
          </p>
          <div className={styles.scoreAsideMeter} aria-hidden>
            <div
              className={`${styles.meterFill} ${styles[`meter_${health.tone}`] || ""}`}
              style={{ width: `${health.score}%` }}
            />
          </div>
        </div>
      </div>

      {copy.breakdownTitle ? (
        <p className={styles.scoreAsideBreakdownTitle}>{copy.breakdownTitle}</p>
      ) : null}

      {copy.breakdownHint ? (
        <p className={styles.scoreAsideBreakdownHint}>{copy.breakdownHint}</p>
      ) : null}

      {checks.length > 0 ? (
        <ul className={styles.scoreAsideChecks}>
          {checks.map(check => {
            const meta = checkStatusMeta(check, copy);
            return (
              <li
                key={check.key}
                className={`${styles.scoreAsideCheck} ${styles[`scoreAsideCheck_${meta.tone}`] || ""}`}
              >
                <span className={styles.scoreAsideCheckIcon} aria-hidden>
                  <Icon icon={CHECK_ICONS[check.key] || "mdi:checkbox-marked-circle-outline"} />
                </span>
                <span className={styles.scoreAsideCheckBody}>
                  <span className={styles.scoreAsideCheckLabel}>{checkLabel(check.key, copy)}</span>
                  {meta.detail ? <span className={styles.scoreAsideCheckDetail}>{meta.detail}</span> : null}
                </span>
                <span className={styles.scoreAsideCheckStatus}>{meta.label}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.scoreAsideEmpty}>{copy.breakdownEmpty || "—"}</p>
      )}
    </aside>
  );
}
