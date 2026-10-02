import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import {
  cancelCheckmkFleetSync,
  fetchActiveCheckmkSyncRun,
  pollCheckmkSyncRun,
  triggerCheckmkFleetSync
} from "../../api/checkmkSyncLogs";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./SupervisionFleetSyncModal.module.css";

function clampPct(done, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function statusTone(status) {
  if (status === "success") return "ok";
  if (status === "partial") return "warn";
  if (status === "error") return "err";
  if (status === "cancelled") return "muted";
  if (status === "skipped") return "muted";
  return "run";
}

export function getFleetSyncProgress(run, starting = false) {
  const doneCount = (run?.synced || 0) + (run?.skipped || 0) + (run?.failed || 0);
  const total = run?.targetsTotal || 0;
  const pct = run?.status === "running"
    ? clampPct(doneCount, total)
    : run && run.status !== "running"
      ? 100
      : starting
        ? 2
        : 0;
  return { doneCount, total, pct, tone: statusTone(run?.status || (starting ? "running" : null)) };
}

export default function SupervisionFleetSyncModal({
  active = false,
  expanded = true,
  startKey = 0,
  startedBy = null,
  onMinimize,
  onExpand,
  onDismiss,
  onRunChange,
  onFinished,
  copy = {}
}) {
  const [run, setRun] = useState(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const pollAbortRef = useRef(0);
  const finishedNotifiedRef = useRef(false);
  const handledStartKeyRef = useRef(0);
  const startedByRef = useRef(startedBy);
  const copyRef = useRef(copy);

  useEffect(() => {
    startedByRef.current = startedBy;
  }, [startedBy]);

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const { doneCount, total, pct, tone } = getFleetSyncProgress(run, starting);
  const currentHost = run?.details?.currentHost || null;
  const startedByLabel = run?.details?.startedBy || startedBy || null;
  const isTerminal = Boolean(run && run.status !== "running");
  const canDismiss = isTerminal || Boolean(error);
  const canCancel = Boolean(run?.id && run.status === "running" && !cancelling);

  const statusLabel = useMemo(() => {
    if (error) return copy.errorTitle || "Erreur";
    if (cancelling) return copy.cancelling || "Arret en cours...";
    if (!run && starting) return copy.starting || "Demarrage...";
    if (!run) return copy.idle || "En attente";
    return copy.status?.[run.status] || run.status;
  }, [copy, error, run, starting, cancelling]);

  useEffect(() => {
    onRunChange?.({
      run,
      starting,
      cancelling,
      error,
      statusLabel,
      ...getFleetSyncProgress(run, starting),
      currentHost,
      startedBy: startedByLabel,
      isTerminal: Boolean(run && run.status !== "running") || Boolean(error)
    });
  }, [run, starting, cancelling, error, statusLabel, currentHost, startedByLabel, onRunChange]);

  useEffect(() => {
    if (!active) {
      finishedNotifiedRef.current = false;
      setRun(null);
      setStarting(false);
      setCancelling(false);
      setError(null);
      pollAbortRef.current += 1;
      return undefined;
    }

    const token = pollAbortRef.current + 1;
    pollAbortRef.current = token;
    let cancelled = false;
    const labels = () => copyRef.current || {};
    const wantsManualStart = startKey > 0 && startKey > handledStartKeyRef.current;

    const trackRun = async runId => {
      if (!runId) return;
      try {
        await pollCheckmkSyncRun(runId, {
          intervalMs: 1000,
          shouldStop: () => cancelled || pollAbortRef.current !== token,
          onUpdate: next => {
            if (cancelled || pollAbortRef.current !== token) return;
            setRun(next);
            if (next?.details?.cancelRequested) setCancelling(true);
          }
        });
      } catch (err) {
        if (!cancelled && pollAbortRef.current === token) {
          setError(err?.message || labels().errorGeneric || "Sync failed");
        }
      }
    };

    (async () => {
      setStarting(true);
      setError(null);
      try {
        const activeRun = await fetchActiveCheckmkSyncRun().catch(() => null);
        if (cancelled || pollAbortRef.current !== token) return;
        if (activeRun?.run?.status === "running" && activeRun.run.id) {
          if (wantsManualStart) handledStartKeyRef.current = startKey;
          setRun(activeRun.run);
          setStarting(false);
          if (activeRun.run.details?.cancelRequested) setCancelling(true);
          await trackRun(activeRun.run.id);
          return;
        }

        // Manual only: start solely when the user clicks Sync (new startKey).
        if (!wantsManualStart) {
          setStarting(false);
          return;
        }

        const started = await triggerCheckmkFleetSync({
          force: true,
          startedBy: startedByRef.current || undefined
        });
        if (cancelled || pollAbortRef.current !== token) return;
        handledStartKeyRef.current = startKey;
        if (started?.skipped && started.reason === "integration_disabled") {
          setError(labels().integrationDisabled || "Integration CheckMK desactivee.");
          setStarting(false);
          return;
        }
        if (started?.skipped && started.reason === "sync_suspended" && !started.runId) {
          setError(labels().syncSuspended || "Synchronisation suspendue dans Administration.");
          setStarting(false);
          return;
        }
        const runId = started?.runId || started?.run?.id || null;
        if (started?.run) setRun(started.run);
        setStarting(false);
        if (!runId) {
          if (started?.skipped) {
            setError(labels().alreadyRunning || started.reason || "Sync ignoree");
          } else {
            setError(labels().errorGeneric || "Unable to start sync");
          }
          return;
        }
        await trackRun(runId);
      } catch (err) {
        if (!cancelled && pollAbortRef.current === token) {
          setError(err?.message || labels().errorGeneric || "Sync failed");
          setStarting(false);
        }
      } finally {
        if (!cancelled && pollAbortRef.current === token) {
          setStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      pollAbortRef.current += 1;
    };
  }, [active, startKey]);
  useEffect(() => {
    if (!active || !(isTerminal || error) || finishedNotifiedRef.current) return;
    finishedNotifiedRef.current = true;
    onFinished?.(run, { error });
  }, [active, isTerminal, error, run, onFinished]);

  const handleCancel = useCallback(async () => {
    if (!run?.id || cancelling) return;
    setCancelling(true);
    try {
      await cancelCheckmkFleetSync(run.id, {
        cancelledBy: startedBy || undefined
      });
    } catch (err) {
      setCancelling(false);
      setError(err?.message || copy.cancelError || "Impossible d'arreter la synchronisation.");
    }
  }, [run?.id, cancelling, startedBy, copy.cancelError]);

  if (!active || !expanded) return null;

  return createPortal(
    <div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={canDismiss ? onDismiss : undefined} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.shell}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervision-fleet-sync-title"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${styles.headerIcon}`} aria-hidden>
              <Icon icon={isTerminal ? (tone === "err" || error ? "mdi:alert-circle-outline" : tone === "muted" ? "mdi:cancel" : "mdi:check-circle-outline") : "mdi:sync"} className={!isTerminal && !error ? styles.spin : ""} />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow || "Surveillance"}</p>
              <h2 className={formStyles.title} id="supervision-fleet-sync-title">
                {copy.title || "Synchronisation globale"}
              </h2>
              <p className={formStyles.subtitle}>{statusLabel}</p>
            </div>
          </div>
          {!canDismiss ? (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onMinimize}
              aria-label={copy.minimizeAria || "Reduire"}
              title={copy.minimize || "Reduire"}
            >
              <Icon icon="mdi:window-minimize" aria-hidden />
            </button>
          ) : null}
        </header>

        <div className={formStyles.bodySingle}>
          <div className={formStyles.content}>
            {error ? (
              <div className={`${styles.notice} ${styles.noticeError}`}>
                <Icon icon="mdi:alert-circle-outline" aria-hidden />
                <p>{error}</p>
              </div>
            ) : (
              <>
                <div className={styles.progressBlock}>
                  <div className={styles.progressMeta}>
                    <span>{copy.progressLabel || "Progression"}</span>
                    <strong>
                      {total > 0 ? `${doneCount}/${total}` : starting ? "..." : "0/0"}
                      {total > 0 ? ` - ${pct}%` : ""}
                    </strong>
                  </div>
                  <div className={`${styles.progressTrack} ${styles[`tone_${tone}`]}`} aria-hidden>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={styles.progressHint}>
                    {currentHost && run?.status === "running"
                      ? (copy.currentHost || "En cours - {host}").replace("{host}", currentHost)
                      : run?.message || copy.hint || "Synchronisation des peripheriques mappes CheckMK..."}
                  </p>
                  {startedByLabel ? (
                    <p className={styles.startedBy}>
                      {(copy.startedBy || "Lancee par {user}").replace("{user}", startedByLabel)}
                    </p>
                  ) : null}
                </div>

                <div className={styles.kpiGrid}>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{run?.synced ?? 0}</span>
                    <span className={styles.kpiLabel}>{copy.synced || "OK"}</span>
                  </div>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{run?.skipped ?? 0}</span>
                    <span className={styles.kpiLabel}>{copy.skipped || "Ignores"}</span>
                  </div>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{run?.failed ?? 0}</span>
                    <span className={styles.kpiLabel}>{copy.failed || "Echecs"}</span>
                  </div>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>
                      {(run?.alertsCreated ?? 0) + (run?.alertsResolved ?? 0) > 0
                        ? `+${run?.alertsCreated ?? 0}/-${run?.alertsResolved ?? 0}`
                        : "-"}
                    </span>
                    <span className={styles.kpiLabel}>{copy.alerts || "Alertes"}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {canDismiss
              ? copy.footerDone || "Vous pouvez fermer cette fenetre."
              : copy.footerRunning || "Vous pouvez reduire la fenetre (en-tete) et suivre la progression."}
          </span>
          <div className={formStyles.footerActions}>
            {canCancel ? (
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleCancel}
                disabled={cancelling}
              >
                <Icon icon="mdi:stop-circle-outline" aria-hidden />
                {cancelling ? (copy.cancelling || "Arret...") : (copy.cancel || "Arreter")}
              </button>
            ) : null}
            {canDismiss ? (
              <button
                type="button"
                className={formStyles.primaryBtn}
                onClick={onDismiss}
              >
                {copy.close || "Fermer"}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
