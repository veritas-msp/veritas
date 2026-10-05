import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchSupervisionAlertDiagnostic } from "../../api/supervisionAlerts";
import { formatEquipmentDetailRelative } from "./equipmentDetailPageI18n";
import styles from "./SupervisionAlertDiagnosticModal.module.css";

function Row({ label, children }) {
  if (children == null || children === "") return null;
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}

export default function SupervisionAlertDiagnosticModal({
  open,
  alertId,
  locale,
  copy,
  onClose
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!open || !alertId) {
      setPayload(null);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSupervisionAlertDiagnostic(alertId)
      .then(data => {
        if (!cancelled) setPayload(data);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || copy?.error || "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, alertId, copy?.error]);

  if (!open) return null;
  const d = payload?.diagnostic || {};
  const events = Array.isArray(payload?.events) ? payload.events : [];

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="supervision-diag-title">
        <header className={styles.header}>
          <h2 id="supervision-diag-title" className={styles.title}>
            <Icon icon="mdi:stethoscope" aria-hidden />
            {copy?.title || "Diagnostic"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={copy?.close || "Close"}>
            <FaTimes />
          </button>
        </header>
        <div className={styles.body}>
          {loading ? <p className={styles.muted}>{copy?.loading}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {!loading && !error && payload ? (
            <>
              <Row label={copy?.service}>{d.serviceName || "—"}</Row>
              <Row label={copy?.host}>{[d.hostName, d.checkmkSite].filter(Boolean).join(" · ") || "—"}</Row>
              <Row label={copy?.lastSync}>
                {d.lastSyncedAt
                  ? `${formatEquipmentDetailRelative(d.lastSyncedAt, locale)}${d.stale ? ` · ${copy?.stale || "stale"}` : ""}`
                  : "—"}
              </Row>
              <Row label={copy?.rule}>
                {d.criterionKey
                  ? `${d.criterionKey} (${d.ruleEnabled === false ? copy?.ruleOff : copy?.ruleOn})`
                  : "—"}
              </Row>
              <Row label={copy?.fingerprint}>{d.fingerprint || "—"}</Row>
              <Row label={copy?.mute}>{d.muteStatus || "active"}</Row>
              <Row label={copy?.whyOpen}>{d.whyOpen || "—"}</Row>
              <Row label={copy?.whyClosed}>{d.whyClosed}</Row>
              <Row label={copy?.output}>{d.pluginOutput}</Row>
              <div className={styles.events}>
                <span className={styles.label}>{copy?.events}</span>
                {events.length ? (
                  <ul>
                    {events.slice(0, 8).map(ev => (
                      <li key={ev.id}>
                        <strong>{ev.action}</strong>
                        {ev.createdAt ? ` · ${formatEquipmentDetailRelative(ev.createdAt, locale)}` : ""}
                        {ev.actorName ? ` · ${ev.actorName}` : ""}
                        {ev.note ? ` — ${ev.note}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
