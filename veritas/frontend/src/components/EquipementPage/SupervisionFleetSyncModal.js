import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
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
  if (status === "skipped") return "muted";
  return "run";
}

export default function SupervisionFleetSyncModal({
  open,
  onClose,
  onFinished,
  copy = {}
}) {
  const [run, setRun] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const pollAbortRef = useRef(0);
  const startedRef = useRef(false);
  const finishedNotifiedRef = useRef(false);

  const doneCount = (run?.synced || 0) + (run?.skipped || 0) + (run?.failed || 0);
  const total = run?.targetsTotal || 0;
  const pct = run?.status === "running"
    ? clampPct(doneCount, total)
    : run && run.status !== "running"
      ? 100
      : starting
        ? 2
        : 0;
  const tone = statusTone(run?.status || (starting ? "running" : null));
  const currentHost = run?.details?.currentHost || null;
  const isTerminal = run && run.status !== "running";

  const statusLabel = useMemo(() => {
    if (error) return copy.errorTitle || "Erreur";
    if (!run && starting) return copy.starting || "Démarrage…";
    if (!run) return copy.idle || "En attente";
    return copy.status?.[run.status] || run.status;
  }, [copy, error, run, starting]);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      finishedNotifiedRef.current = false;
      setRun(null);
      setStarting(false);
      setError(null);
      pollAbortRef.current += 1;
      return undefined;
    }

    const token = pollAbortRef.current + 1;
    pollAbortRef.current = token;
    let cancelled = false;

    const trackRun = async runId => {
      if (!runId) return;
      try {
        await pollCheckmkSyncRun(runId, {
          intervalMs: 1000,
          onUpdate: next => {
            if (cancelled || pollAbortRef.current !== token) return;
            setRun(next);
          }
        });
      } catch (err) {
        if (!cancelled && pollAbortRef.current === token) {
          setError(err?.message || copy.errorGeneric || "Sync failed");
        }
      }
    };

    (async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setStarting(true);
      setError(null);
      try {
        const active = await fetchActiveCheckmkSyncRun().catch(() => null);
        if (cancelled || pollAbortRef.current !== token) return;
        if (active?.run?.status === "running" && active.run.id) {
          setRun(active.run);
          setStarting(false);
          await trackRun(active.run.id);
          return;
        }

        const started = await triggerCheckmkFleetSync({ force: true });
        if (cancelled || pollAbortRef.current !== token) return;
        if (started?.skipped && started.reason === "integration_disabled") {
          setError(copy.integrationDisabled || "Intégration CheckMK désactivée.");
          setStarting(false);
          return;
        }
        if (started?.skipped && started.reason === "sync_suspended" && !started.runId) {
          setError(copy.syncSuspended || "Synchronisation suspendue dans Administration.");
          setStarting(false);
          return;
        }
        const runId = started?.runId || started?.run?.id || null;
        if (started?.run) setRun(started.run);
        setStarting(false);
        if (!runId) {
          if (started?.skipped) {
            setError(copy.alreadyRunning || started.reason || "Sync ignorée");
          } else {
            setError(copy.errorGeneric || "Unable to start sync");
          }
          return;
        }
        await trackRun(runId);
      } catch (err) {
        if (!cancelled && pollAbortRef.current !== token) {
          setError(err?.message || copy.errorGeneric || "Sync failed");
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
  }, [open, copy]);

  useEffect(() => {
    if (!open || !isTerminal || finishedNotifiedRef.current) return;
    finishedNotifiedRef.current = true;
    onFinished?.(run);
  }, [open, isTerminal, run, onFinished]);

  if (!open) return null;

  return createPortal(
    <div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={isTerminal || error ? onClose : undefined} role="presentation">
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
              <Icon icon={isTerminal ? (tone === "err" ? "mdi:alert-circle-outline" : "mdi:check-circle-outline") : "mdi:sync"} className={!isTerminal && !error ? styles.spin : ""} />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow || "Surveillance"}</p>
              <h2 className={formStyles.title} id="supervision-fleet-sync-title">
                {copy.title || "Synchronisation globale"}
              </h2>
              <p className={formStyles.subtitle}>{statusLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className={formStyles.closeBtn}
            onClick={onClose}
            aria-label={copy.closeAria || "Fermer"}
            disabled={!isTerminal && !error}
          >
            <FaTimes />
          </button>
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
                      {total > 0 ? `${doneCount}/${total}` : starting ? "…" : "0/0"}
                      {total > 0 ? ` · ${pct}%` : ""}
                    </strong>
                  </div>
                  <div className={`${styles.progressTrack} ${styles[`tone_${tone}`]}`} aria-hidden>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={styles.progressHint}>
                    {currentHost && run?.status === "running"
                      ? (copy.currentHost || "En cours · {host}").replace("{host}", currentHost)
                      : run?.message || copy.hint || "Synchronisation des périphériques mappés CheckMK…"}
                  </p>
                </div>

                <div className={styles.kpiGrid}>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{run?.synced ?? 0}</span>
                    <span className={styles.kpiLabel}>{copy.synced || "OK"}</span>
                  </div>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{run?.skipped ?? 0}</span>
                    <span className={styles.kpiLabel}>{copy.skipped || "Ignorés"}</span>
                  </div>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{run?.failed ?? 0}</span>
                    <span className={styles.kpiLabel}>{copy.failed || "Échecs"}</span>
                  </div>
                  <div className={styles.kpi}>
                    <span className={styles.kpiValue}>
                      {(run?.alertsCreated ?? 0) + (run?.alertsResolved ?? 0) > 0
                        ? `+${run?.alertsCreated ?? 0}/-${run?.alertsResolved ?? 0}`
                        : "—"}
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
            {isTerminal || error
              ? copy.footerDone || "Vous pouvez fermer cette fenêtre."
              : copy.footerRunning || "Ne fermez pas la page pendant la synchronisation."}
          </span>
          <div className={formStyles.footerActions}>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={onClose}
              disabled={!isTerminal && !error}
            >
              {copy.close || "Fermer"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
