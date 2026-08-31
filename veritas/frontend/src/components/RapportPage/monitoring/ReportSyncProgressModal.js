import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./ReportSyncProgressModal.module.css";
import { fillSyncCopy } from "./supervisionReportSync";

function formatEta(etaMs, copy) {
  if (etaMs == null || !Number.isFinite(etaMs)) return copy.etaCalculating || "";
  if (etaMs <= 2500) return copy.etaSoon || "";
  const totalSeconds = Math.max(1, Math.round(etaMs / 1000));
  if (totalSeconds < 60) {
    return fillSyncCopy(copy.etaSeconds, { n: totalSeconds });
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return fillSyncCopy(copy.etaMinutes, { m: minutes, s: seconds });
}

function itemIcon(state) {
  if (state === "running") return "mdi:loading";
  if (state === "ok") return "mdi:check";
  if (state === "error") return "mdi:alert-circle-outline";
  return "mdi:circle-outline";
}

export default function ReportSyncProgressModal({
  open,
  copy = {},
  items = [],
  currentIndex = 0,
  etaMs = null,
  phase = "running",
  onCancel,
  onClose
}) {
  const logRef = useRef(null);
  const running = phase === "running";
  const total = items.length;
  const completed = items.filter(item => item.state === "ok" || item.state === "error").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const current = items[currentIndex] || items.find(item => item.state === "running") || null;
  const titleId = "report-sync-progress-title";

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const node = logRef.current;
    if (!node) return;
    const active = node.querySelector("[data-sync-active='true']");
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [items, currentIndex, open]);

  if (!open) return null;

  const subtitle = running
    ? copy.running
    : phase === "cancelled"
      ? copy.cancelled
      : copy.done;
  const statusLabel = running
    ? (current?.label || copy.preparing)
    : phase === "cancelled"
      ? copy.cancelled
      : copy.done;

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div className={styles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.hero}>
          <div className={`${styles.loader} ${running ? styles.loaderLive : styles.loaderDone}`} aria-hidden>
            <span className={styles.loaderRing} />
            <span className={styles.loaderRing} />
            <span className={styles.loaderRing} />
            <span className={styles.loaderCore}>
              <Icon
                icon={running ? "mdi:cloud-sync-outline" : phase === "cancelled" ? "mdi:pause-circle-outline" : "mdi:check"}
                className={running ? styles.loaderIconSpin : undefined}
              />
            </span>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{copy.kicker || copy.preparing}</p>
            <h2 id={titleId} className={styles.title}>{copy.title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.progressBlock}>
            <div className={styles.metaRow}>
              <span className={styles.stepCount}>
                {fillSyncCopy(copy.stepOf, { current: Math.min(completed + (running ? 1 : 0), total), total })}
              </span>
              <span className={styles.eta}>
                {running ? formatEta(etaMs, copy) : fillSyncCopy(copy.stepOf, { current: completed, total })}
              </span>
            </div>
            <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
            <p className={styles.currentStatus}>
              {running ? (copy.nowWorking || "En cours") : null}
              {running ? " · " : null}
              {statusLabel}
            </p>
          </div>

          <div className={styles.log} ref={logRef}>
            {items.map(item => (
              <div
                key={item.id}
                data-sync-active={item.state === "running" ? "true" : undefined}
                className={[
                  styles.logItem,
                  item.state === "running" ? styles.logItemRunning : "",
                  item.state === "ok" ? styles.logItemOk : "",
                  item.state === "error" ? styles.logItemError : ""
                ].filter(Boolean).join(" ")}
              >
                <span className={styles.logIconWrap}>
                  <Icon icon={itemIcon(item.state)} className={item.state === "running" ? styles.logIconSpin : undefined} aria-hidden />
                </span>
                <div className={styles.logLabel}>
                  {item.label}
                  {item.state === "error" && item.error ? <span className={styles.logError}>{item.error}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerHint}>{running ? copy.footerHint : copy.footerDone}</p>
          {running ? (
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              {copy.cancel}
            </button>
          ) : (
            <button type="button" className={styles.closeBtn} onClick={onClose}>
              {copy.close}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
