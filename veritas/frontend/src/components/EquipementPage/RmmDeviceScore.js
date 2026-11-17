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

function ScoreChecksList({ checks, copy, className = "", itemClassName = "" }) {
  if (!checks.length) {
    return <p className={styles.scoreAsideEmpty}>{copy.breakdownEmpty || "—"}</p>;
  }
  return (
    <ul className={className || styles.scoreAsideChecks}>
      {checks.map(check => {
        const meta = checkStatusMeta(check, copy);
        return (
          <li
            key={check.key}
            className={`${itemClassName || styles.scoreAsideCheck} ${styles[`scoreAsideCheck_${meta.tone}`] || ""}`}
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
  );
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

      <ScoreChecksList checks={checks} copy={copy} />
    </aside>
  );
}

/** Full-width horizontal score banner for the RMM synthesis top stack. */
export function ScoreBanner({
  health,
  copy,
  note = null,
  noteTitle = null
}) {
  if (!health && !note) return null;
  const checks = Array.isArray(health?.checks) ? health.checks : [];
  return (
    <section
      className={`${styles.scoreBanner} ${health ? styles[`scoreBanner_${health.tone}`] || "" : ""}`.trim()}
      aria-label={copy.scoreTitle || noteTitle || "Note du périphérique"}
    >
      {health ? (
        <div className={styles.scoreBannerScore}>
          <div className={styles.scoreBannerGrade} aria-hidden>{health.grade}</div>
          <div className={styles.scoreBannerScoreBody}>
            <p className={styles.scoreBannerTitle}>{copy.scoreTitle}</p>
            <p className={styles.scoreBannerValue}>
              {health.score}<span className={styles.scoreAsideOutOf}>/100</span>
            </p>
            <div className={styles.scoreBannerMeter} aria-hidden>
              <div
                className={`${styles.meterFill} ${styles[`meter_${health.tone}`] || ""}`}
                style={{ width: `${health.score}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {health && checks.length > 0 ? (
        <ScoreChecksList
          checks={checks}
          copy={copy}
          className={styles.scoreBannerChecks}
          itemClassName={styles.scoreBannerCheck}
        />
      ) : null}

      {note ? (
        <article className={styles.scoreBannerNote}>
          <header className={styles.scoreBannerNoteHead}>
            <Icon icon="mdi:note-text-outline" aria-hidden />
            <span>{noteTitle || "Note"}</span>
          </header>
          <p className={styles.scoreBannerNoteBody}>{note}</p>
        </article>
      ) : null}
    </section>
  );
}
