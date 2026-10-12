import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
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

export default function SupervisionMaintenanceModal({
  open,
  item,
  copy,
  busy = false,
  deviceOnly = false,
  onConfirm,
  onClose
}) {
  const t = copy?.maintenanceModal || {};
  const [scope, setScope] = useState(deviceOnly ? "device" : "service");
  const [durationId, setDurationId] = useState("1h");
  const [customUntilLocal, setCustomUntilLocal] = useState(defaultCustomUntil);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setScope(deviceOnly ? "device" : "service");
    setDurationId("1h");
    setCustomUntilLocal(defaultCustomUntil());
    setReason("");
  }, [open, item?.id, deviceOnly]);

  if (!open || !item) return null;

  const serviceMeta = extractAlertServiceMeta(item);
  const canUseServiceScope = !deviceOnly && Boolean(serviceMeta.serviceKey);
  const effectiveScope = canUseServiceScope ? scope : "device";
  const untilInfo = resolveExclusionUntil(durationId, customUntilLocal);
  const canSubmit = Boolean(String(reason || "").trim()) && !untilInfo.invalid && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm?.({
      exclusion: {
        scope: effectiveScope,
        kind: "maintenance",
        excludedUntil: untilInfo.excludedUntil,
        reason: String(reason).trim(),
        ...serviceMeta,
        family: serviceMeta.family || item.family || null,
        equipmentId: serviceMeta.equipmentId || item.equipmentId || null,
        clientId: serviceMeta.clientId || item.clientId || null,
        equipmentName: serviceMeta.equipmentName || item.equipmentName || item.subtitle || null
      },
      dismissAlert: !deviceOnly
    });
  };

  return (
    <div className={styles.overlay} onClick={busy ? undefined : onClose} role="presentation">
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <Icon icon="mdi:wrench-clock" aria-hidden />
              {t.title || "Put in maintenance"}
            </h2>
            <p className={styles.subtitle}>{t.subtitle || "Mark a voluntary / temporary anomaly."}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={busy} aria-label={t.cancel || "Cancel"}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          {!deviceOnly ? (
            <>
              <p className={styles.sectionLabel}>{t.scope || "Scope"}</p>
              <div className={styles.radioList}>
                {canUseServiceScope ? (
                  <label className={styles.radioRow}>
                    <input type="radio" name="maint-scope" checked={scope === "service"} disabled={busy} onChange={() => setScope("service")} />
                    <span>{t.scopeService || "This service only"}</span>
                  </label>
                ) : null}
                <label className={styles.radioRow}>
                  <input type="radio" name="maint-scope" checked={effectiveScope === "device"} disabled={busy || !canUseServiceScope} onChange={() => setScope("device")} />
                  <span>{t.scopeDevice || "All services on this device"}</span>
                </label>
              </div>
            </>
          ) : null}

          <p className={styles.sectionLabel}>{t.duration || "Duration"}</p>
          <div className={styles.radioList}>
            {[
              ["1h", t.h1 || "1 hour"],
              ["4h", t.h4 || "4 hours"],
              ["8h", t.h8 || "8 hours"],
              ["1d", t.d1 || "1 day"],
              ["3d", t.d3 || "3 days"],
              ["7d", t.d7 || "7 days"],
              ["1m", t.m1 || "1 month"],
              ["3m", t.m3 || "3 months"],
              ["custom", t.custom || "Until date/time"],
              ["forever", t.forever || "Indefinite"]
            ].map(([id, label]) => (
              <label key={id} className={styles.radioRow}>
                <input
                  type="radio"
                  name="maint-duration"
                  checked={durationId === id}
                  disabled={busy}
                  onChange={() => setDurationId(id)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {durationId === "custom" ? (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="maint-until">
                {t.untilLabel || "Until"}
              </label>
              <input
                id="maint-until"
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

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="maint-reason">
              {t.reason || "Reason (required)"}
            </label>
            <textarea
              id="maint-reason"
              className={styles.textarea}
              value={reason}
              disabled={busy}
              onChange={e => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder || "Planned client maintenance…"}
            />
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.btnGhost} disabled={busy} onClick={onClose}>
            {t.cancel || "Cancel"}
          </button>
          <button type="button" className={styles.btnPrimary} disabled={!canSubmit} onClick={handleSubmit}>
            {busy ? t.working || "Working…" : t.confirm || "Put in maintenance"}
          </button>
        </footer>
      </div>
    </div>
  );
}
