import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import styles from "./SupervisionHistorizeSuspendModal.module.css";

function toDatetimeLocalValue(date = new Date()) {
  const d = new Date(date.getTime());
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function defaultUntilLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function minutesUntilTomorrowMorning() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return Math.max(30, Math.round((next.getTime() - now.getTime()) / 60000));
}

export default function SupervisionHistorizeSuspendModal({
  open,
  item,
  action = "dismiss",
  copy,
  busy = false,
  onConfirm,
  onClose
}) {
  const [showCustomUntil, setShowCustomUntil] = useState(false);
  const [customUntilLocal, setCustomUntilLocal] = useState(defaultUntilLocal);
  const customUntilIso = fromDatetimeLocalValue(customUntilLocal);
  const customUntilValid = Boolean(customUntilIso && new Date(customUntilIso).getTime() > Date.now());

  useEffect(() => {
    if (!open) return;
    setShowCustomUntil(false);
    setCustomUntilLocal(defaultUntilLocal());
  }, [open, item?.id, action]);

  const options = useMemo(
    () => [
      { id: "2h", label: copy?.mute?.hours2 || "2h", payload: { mode: "temporary", durationMinutes: 120 } },
      {
        id: "tomorrow",
        label: copy?.mute?.tomorrow || "Tomorrow 8am",
        payload: { mode: "temporary", durationMinutes: minutesUntilTomorrowMorning() }
      },
      { id: "24h", label: copy?.mute?.hours24 || "24h", payload: { mode: "temporary", durationMinutes: 1440 } }
    ],
    [copy?.mute?.hours2, copy?.mute?.hours24, copy?.mute?.tomorrow]
  );

  if (!open || !item) return null;

  const title =
    action === "resolve"
      ? copy?.historizeSuspend?.titleResolve || copy?.historizeSuspend?.title || "Suspend before resolving"
      : copy?.historizeSuspend?.titleDismiss || copy?.historizeSuspend?.title || "Suspend before dismissing";

  const confirmLabel =
    action === "resolve"
      ? copy?.historizeSuspend?.confirmResolve || copy?.historizeSuspend?.confirm || "Suspend and resolve"
      : copy?.historizeSuspend?.confirmDismiss || copy?.historizeSuspend?.confirm || "Suspend and dismiss";

  return (
    <div className={styles.overlay} onClick={busy ? undefined : onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervision-historize-suspend-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="supervision-historize-suspend-title" className={styles.title}>
              <Icon icon="mdi:alarm-light-off" aria-hidden />
              {title}
            </h2>
            <p className={styles.subtitle}>
              {copy?.historizeSuspend?.subtitle ||
                "Without suspension, this alert can reappear on the next sync."}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={busy}
            aria-label={copy?.historizeSuspend?.cancel || "Cancel"}
          >
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.prompt}>{copy?.historizeSuspend?.prompt || "How long should alerts be suspended for this device?"}</p>
          <div className={styles.options}>
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={styles.optionBtn}
                disabled={busy}
                onClick={() => onConfirm?.(opt.payload)}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              className={styles.optionBtn}
              disabled={busy}
              onClick={() => setShowCustomUntil(openCustom => !openCustom)}
            >
              {copy?.mute?.untilExact || "Until a specific date…"}
            </button>
          </div>

          {showCustomUntil ? (
            <div className={styles.customBox}>
              <label className={styles.customLabel} htmlFor={`historize-until-${item.id}`}>
                {copy?.mute?.untilLabel || "Date and time"}
              </label>
              <input
                id={`historize-until-${item.id}`}
                type="datetime-local"
                className={styles.datetime}
                value={customUntilLocal}
                min={toDatetimeLocalValue(new Date())}
                disabled={busy}
                onChange={e => setCustomUntilLocal(e.target.value)}
              />
              {!customUntilValid ? (
                <p className={styles.hint}>{copy?.mute?.untilInvalid || "Pick a future date/time"}</p>
              ) : null}
              <button
                type="button"
                className={styles.confirmBtn}
                disabled={busy || !customUntilValid}
                onClick={() => {
                  if (!customUntilValid) return;
                  onConfirm?.({ mode: "temporary", suspendedUntil: customUntilIso });
                }}
              >
                {busy ? copy?.historizeSuspend?.working || "Working…" : confirmLabel}
              </button>
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} disabled={busy} onClick={onClose}>
            {copy?.historizeSuspend?.cancel || "Cancel"}
          </button>
        </footer>
      </div>
    </div>
  );
}
