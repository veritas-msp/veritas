import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  IGNORE_REASON_IDS,
  extractAlertServiceMeta,
  resolveExclusionUntil,
  toDatetimeLocalValue
} from "./supervisionTriageUtils";
import styles from "./SupervisionTriageModals.module.css";

function defaultCustomUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

export default function SupervisionIgnoreModal({
  open,
  item,
  copy,
  busy = false,
  onConfirm,
  onClose
}) {
  const t = copy?.ignoreModal || {};
  const [reasonId, setReasonId] = useState("false_positive");
  const [comment, setComment] = useState("");
  const [exclusionId, setExclusionId] = useState("none");
  const [scope, setScope] = useState("service");
  const [customUntilLocal, setCustomUntilLocal] = useState(defaultCustomUntil);

  useEffect(() => {
    if (!open) return;
    setReasonId("false_positive");
    setComment("");
    setExclusionId("none");
    setScope("service");
    setCustomUntilLocal(defaultCustomUntil());
  }, [open, item?.id]);

  if (!open || !item) return null;

  const serviceMeta = extractAlertServiceMeta(item);
  const canUseServiceScope = Boolean(serviceMeta.serviceKey);
  const effectiveScope = canUseServiceScope ? scope : "device";
  const reasonLabels = t.reasons || {};
  const exclusionLabels = t.exclusions || {};
  const needsComment = reasonId === "other";
  const untilInfo = resolveExclusionUntil(exclusionId, customUntilLocal);
  const canSubmit =
    Boolean(reasonId) &&
    (!needsComment || String(comment || "").trim()) &&
    !untilInfo.invalid &&
    !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm?.({
      ignoreReason: reasonId,
      closureDetail: String(comment || "").trim() || null,
      skipExclusion: untilInfo.skipExclusion,
      exclusion: untilInfo.skipExclusion
        ? null
        : {
            scope: effectiveScope,
            kind: "ignore",
            excludedUntil: untilInfo.excludedUntil,
            reason: reasonLabels[reasonId] || reasonId,
            ...serviceMeta
          }
    });
  };

  const showScope = !untilInfo.skipExclusion && exclusionId !== "none" && canUseServiceScope;

  return (
    <div className={styles.overlay} onClick={busy ? undefined : onClose} role="presentation">
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <Icon icon="mdi:close-circle-outline" aria-hidden />
              {t.title || "Ignore alert"}
            </h2>
            <p className={styles.subtitle}>{t.subtitle || "Explain why this alert does not need action."}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={busy} aria-label={t.cancel || "Cancel"}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.sectionLabel}>{t.why || "Why?"}</p>
          <div className={styles.radioList}>
            {IGNORE_REASON_IDS.map(id => (
              <label key={id} className={styles.radioRow}>
                <input
                  type="radio"
                  name="ignore-reason"
                  checked={reasonId === id}
                  disabled={busy}
                  onChange={() => setReasonId(id)}
                />
                <span>{reasonLabels[id] || id}</span>
              </label>
            ))}
          </div>

          {needsComment || comment ? (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ignore-comment">
                {t.comment || "Comment"}
              </label>
              <textarea
                id="ignore-comment"
                className={styles.textarea}
                value={comment}
                disabled={busy}
                onChange={e => setComment(e.target.value)}
                placeholder={t.commentPlaceholder || ""}
              />
            </div>
          ) : (
            <button type="button" className={styles.linkBtn} onClick={() => setComment(" ")}>
              {t.addComment || "Add a comment"}
            </button>
          )}

          <p className={styles.sectionLabel}>{t.nextAlerts || "What about identical future alerts?"}</p>
          <div className={styles.radioList}>
            {[
              ["none", exclusionLabels.none || "Ignore this alert only"],
              ["1h", exclusionLabels.h1 || "Ignore this service for 1 hour"],
              ["4h", exclusionLabels.h4 || "4 hours"],
              ["24h", exclusionLabels.h24 || "24 hours"],
              ["custom", exclusionLabels.custom || "Until a specific date"],
              ["forever", exclusionLabels.forever || "Always ignore this service"]
            ].map(([id, label]) => (
              <label key={id} className={styles.radioRow}>
                <input
                  type="radio"
                  name="ignore-exclusion"
                  checked={exclusionId === id}
                  disabled={busy}
                  onChange={() => setExclusionId(id)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {showScope ? (
            <div className={styles.field}>
              <p className={styles.sectionLabel}>{t.scope || "Scope"}</p>
              <div className={styles.radioList}>
                <label className={styles.radioRow}>
                  <input type="radio" name="ignore-scope" checked={scope === "service"} disabled={busy} onChange={() => setScope("service")} />
                  <span>{t.scopeService || "This service only"}</span>
                </label>
                <label className={styles.radioRow}>
                  <input type="radio" name="ignore-scope" checked={scope === "device"} disabled={busy} onChange={() => setScope("device")} />
                  <span>{t.scopeDevice || "Entire device"}</span>
                </label>
              </div>
            </div>
          ) : null}

          {exclusionId === "custom" ? (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ignore-until">
                {t.untilLabel || "Until"}
              </label>
              <input
                id="ignore-until"
                type="datetime-local"
                className={styles.input}
                value={customUntilLocal}
                min={toDatetimeLocalValue(new Date())}
                disabled={busy}
                onChange={e => setCustomUntilLocal(e.target.value)}
              />
              {untilInfo.invalid ? <p className={styles.hint}>{t.untilInvalid || "Pick a future date/time"}</p> : null}
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.btnGhost} disabled={busy} onClick={onClose}>
            {t.cancel || "Cancel"}
          </button>
          <button type="button" className={styles.btnPrimary} disabled={!canSubmit} onClick={handleSubmit}>
            {busy ? t.working || "Working…" : t.confirm || "Ignore"}
          </button>
        </footer>
      </div>
    </div>
  );
}
