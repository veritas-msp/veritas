import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy, formatEquipmentDetailRelative, interpolate } from "./equipmentDetailPageI18n";
import { agentSupportsImmediateFullSync, formatRmmDateTime, resolveRmmHeartbeatIntervalMinutes } from "./rmmMonitoringUtils";
import styles from "./RmmAgentUpdateStatus.module.css";

function clampPct(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getRmmAgentUpdateProgress({
  requestedAt,
  equipment = null,
  heartbeatIntervalMinutes
} = {}) {
  if (!requestedAt) return null;
  const started = new Date(requestedAt).getTime();
  if (!Number.isFinite(started)) return null;
  const elapsedMs = Math.max(0, Date.now() - started);
  const immediate = agentSupportsImmediateFullSync(equipment);
  const heartbeatMinutes = resolveRmmHeartbeatIntervalMinutes(equipment, heartbeatIntervalMinutes) || 5;
  const pickupMs = immediate ? 30_000 : Math.max(60_000, heartbeatMinutes * 60_000);
  const ratio = elapsedMs / pickupMs;
  if (ratio < 0.2) {
    return {
      pct: clampPct(8 + ratio * 50),
      step: "queued"
    };
  }
  if (ratio < 1) {
    return {
      pct: clampPct(18 + ratio * 40),
      step: "waiting"
    };
  }
  const over = Math.min(1, (elapsedMs - pickupMs) / Math.max(pickupMs, 60_000));
  const pct = clampPct(58 + over * 32);
  return {
    pct,
    step: pct >= 90 ? "confirming" : "installing",
    capped: pct >= 90
  };
}

export default function RmmAgentUpdateStatus({
  equipment = null,
  requestedAt = null,
  currentVersion = null,
  targetVersion = null,
  heartbeatIntervalMinutes,
  onCancel = null,
  cancelling = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const upd = copy.rmm?.agentUpdate || {};
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    if (!requestedAt) return undefined;
    const id = window.setInterval(() => setNowTick(tick => tick + 1), 2000);
    return () => window.clearInterval(id);
  }, [requestedAt]);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const progress = useMemo(() => getRmmAgentUpdateProgress({
    requestedAt,
    equipment,
    heartbeatIntervalMinutes
  }), [requestedAt, equipment, heartbeatIntervalMinutes, nowTick]);
  if (!requestedAt || !progress) return null;
  const stepLabel = progress.step === "queued" ? upd.stepQueued : progress.step === "waiting" ? upd.stepWaiting : progress.step === "confirming" ? upd.stepConfirming || upd.stepInstalling : upd.stepInstalling;
  const whenLabel = formatEquipmentDetailRelative(requestedAt, locale);
  const fromLabel = currentVersion ? `v${currentVersion}` : "—";
  const toLabel = targetVersion ? `v${targetVersion}` : "—";
  const tooltip = [upd.tooltip || upd.title, stepLabel, `${fromLabel} → ${toLabel}`].filter(Boolean).join(" · ");
  const pctLabel = progress.capped ? upd.awaitingConfirmShort || "…" : `${progress.pct}%`;
  const hint = progress.capped ? upd.progressHintConfirm || upd.progressHint : upd.progressHint;
  return <div className={styles.root} ref={rootRef}>
      <button type="button" className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="dialog" aria-label={upd.title || "Agent update"} title={tooltip}>
        <Icon icon="mdi:cloud-download-outline" className={`${styles.triggerIcon} ${styles.pulse}`} aria-hidden />
      </button>
      {open ? <div className={styles.card} role="dialog" aria-label={upd.title || "Agent update"}>
          <header className={styles.cardHeader}>
            <div className={styles.cardTitleRow}>
              <Icon icon="mdi:cloud-download-outline" className={styles.cardIcon} aria-hidden />
              <div>
                <p className={styles.cardEyebrow}>{upd.eyebrow || "RMM"}</p>
                <h3 className={styles.cardTitle}>{upd.title}</h3>
              </div>
            </div>
            <button type="button" className={styles.cardClose} onClick={() => setOpen(false)} aria-label={upd.close || "Close"}>
              <Icon icon="mdi:close" aria-hidden />
            </button>
          </header>

          <p className={styles.versionLine}>
            <span>{fromLabel}</span>
            <Icon icon="mdi:arrow-right" aria-hidden />
            <strong>{toLabel}</strong>
          </p>

          <div className={styles.progressBlock}>
            <div className={styles.progressMeta}>
              <span>{stepLabel}</span>
              <strong className={progress.capped ? styles.pctCapped : undefined}>{pctLabel}</strong>
            </div>
            <div className={`${styles.progressTrack} ${progress.capped ? styles.progressTrackCapped : ""}`} aria-hidden>
              <div className={`${styles.progressFill} ${progress.capped ? styles.progressFillPulse : ""}`} style={{
            width: `${Math.max(progress.pct, progress.capped ? 90 : 0)}%`
          }} />
            </div>
            <p className={styles.progressHint}>{hint}</p>
          </div>

          <ul className={styles.steps}>
            <li className={progress.step === "queued" ? styles.stepActive : styles.stepDone}>
              <Icon icon="mdi:check-circle" aria-hidden />
              <span>{upd.stepQueued}</span>
            </li>
            <li className={progress.step === "waiting" ? styles.stepActive : progress.step === "installing" || progress.step === "confirming" ? styles.stepDone : styles.stepIdle}>
              <Icon icon={progress.step === "queued" ? "mdi:circle-outline" : "mdi:check-circle"} aria-hidden />
              <span>{upd.stepWaiting}</span>
            </li>
            <li className={progress.step === "installing" || progress.step === "confirming" ? styles.stepActive : styles.stepIdle}>
              <Icon icon={progress.step === "installing" || progress.step === "confirming" ? "mdi:progress-download" : "mdi:circle-outline"} aria-hidden />
              <span>{progress.step === "confirming" ? upd.stepConfirming || upd.stepInstalling : upd.stepInstalling}</span>
            </li>
          </ul>

          <p className={styles.requestedAt}>
            {whenLabel ? interpolate(upd.requested || "Requested {when}", {
          when: whenLabel
        }) : null}
            {requestedAt ? ` · ${formatRmmDateTime(requestedAt)}` : null}
          </p>

          {onCancel ? <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={cancelling}>
              <Icon icon="mdi:close-circle-outline" aria-hidden />
              {upd.cancel || copy.hero?.cancelAgentUpdate}
            </button> : null}
        </div> : null}
    </div>;
}
