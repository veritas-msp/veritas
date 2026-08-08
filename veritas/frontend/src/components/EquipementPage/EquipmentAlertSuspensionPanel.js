import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchEquipmentAlertSettings, resolveEquipmentFamilyForAlerts, updateEquipmentAlertSuspension } from "../../api/equipmentMonitoringAlerts";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import styles from "./EquipmentAlertSuspensionPanel.module.css";
const DURATION_OPTIONS = [{
  value: 60,
  label: "1 hour"
}, {
  value: 240,
  label: "4 hours"
}, {
  value: 1440,
  label: "24 hours"
}, {
  value: 10080,
  label: "7 days"
}, {
  value: 43200,
  label: "30 days"
}];
function formatDateTimeFr(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function resolveModeFromSettings(settings, suspended, alertsEnabled) {
  if (suspended) {
    return settings?.suspensionType === "permanent" ? "permanent" : "temporary";
  }
  return alertsEnabled ? "active" : "disabled";
}
export default function EquipmentAlertSuspensionPanel({
  equipment,
  onNavigate
}) {
  const equipmentId = getEquipmentDbId(equipment);
  const clientId = equipment?.clientId;
  const family = useMemo(() => resolveEquipmentFamilyForAlerts(equipment?.type), [equipment?.type]);
  const equipmentName = equipment?.name || equipment?.rawData?.nom || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [suspended, setSuspended] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [mode, setMode] = useState("disabled");
  const [durationMinutes, setDurationMinutes] = useState(1440);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!clientId || !equipmentId || !family) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchEquipmentAlertSettings(clientId, equipmentId, family).then(data => {
      if (!mounted) return;
      const enabled = Boolean(data.alertsEnabled);
      const isSuspended = Boolean(data.suspended);
      setSettings(data.settings);
      setSuspended(isSuspended);
      setAlertsEnabled(enabled);
      setMode(resolveModeFromSettings(data.settings, isSuspended, enabled));
      if (isSuspended) {
        setReason(data.settings?.suspensionReason || "");
      } else {
        setReason("");
      }
    }).catch(err => {
      if (!mounted) return;
      toast.error(err.message || "Unable to load alerts");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [clientId, equipmentId, family]);
  const statusLabel = suspended ? "Suspended" : alertsEnabled ? "Active" : "Disabled";
  const handleSave = async () => {
    if (!clientId || !equipmentId || !family) return;
    setSaving(true);
    try {
      let payload;
      if (mode === "disabled" || mode === "active") {
        payload = {
          family,
          type: equipment?.type,
          equipmentName,
          suspensionType: "none",
          alertsEnabled: mode === "active"
        };
      } else {
        payload = {
          family,
          type: equipment?.type,
          equipmentName,
          suspensionType: mode,
          alertsEnabled: true,
          durationMinutes: mode === "temporary" ? durationMinutes : undefined,
          reason: reason.trim() || null
        };
      }
      const data = await updateEquipmentAlertSuspension(clientId, equipmentId, payload);
      setSettings(data.settings);
      setSuspended(Boolean(data.suspended));
      setAlertsEnabled(Boolean(data.alertsEnabled));
      setMode(resolveModeFromSettings(data.settings, data.suspended, data.alertsEnabled));
      if (mode === "active") {
        toast.success("Monitoring alerts enabled");
      } else if (mode === "disabled") {
        toast.success("Monitoring alerts disabled");
      } else if (data.suspended) {
        toast.success("Alerts suspended for this device");
      } else {
        toast.success("Alerts re-enabled");
      }
    } catch (err) {
      toast.error(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };
  if (!equipmentId || !clientId || !family) {
    return <div className={styles.panel}>
        <p className={styles.subtitle}>
          Device identifier unavailable · alerts cannot be managed for this item.
        </p>
      </div>;
  }
  return <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <Icon icon="mdi:bell-alert-outline" className={styles.titleIcon} aria-hidden />
            Monitoring alerts
          </h2>
          <p className={styles.subtitle}>
            By default, no automatic ticket is created. Enable alerts for this
            device, or suspend them temporarily during maintenance (CheckMK or
            agent RMM).
          </p>
        </div>
        <span className={`${styles.statusBadge} ${suspended ? styles.statusSuspended : alertsEnabled ? styles.statusActive : styles.statusSuspended}`}>
          <Icon icon={suspended || !alertsEnabled ? "mdi:bell-off-outline" : "mdi:bell-ring-outline"} width={14} />
          {statusLabel}
        </span>
      </div>

      {loading ? <p className={styles.subtitle}>Loading…</p> : <>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.fieldLabel} htmlFor="alert-mode">
                Mode
              </label>
              <select id="alert-mode" className={styles.select} value={mode} onChange={e => setMode(e.target.value)}>
                <option value="disabled">Disabled (default)</option>
                <option value="active">Alerts enabled</option>
                <option value="temporary">Suspend temporarily</option>
                <option value="permanent">Suspend permanently</option>
              </select>
            </div>

            {mode === "temporary" ? <div>
                <label className={styles.fieldLabel} htmlFor="alert-duration">
                  Duration
                </label>
                <select id="alert-duration" className={styles.select} value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}>
                  {DURATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>)}
                </select>
              </div> : null}
          </div>

          {mode === "temporary" || mode === "permanent" ? <div style={{
        marginBottom: "0.75rem"
      }}>
              <label className={styles.fieldLabel} htmlFor="alert-reason">
                Reason (optional)
              </label>
              <textarea id="alert-reason" className={styles.textarea} value={reason} onChange={e => setReason(e.target.value)} placeholder="Scheduled maintenance, intervention in progress…" />
            </div> : null}

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {suspended && settings?.suspendedUntil ? <p className={styles.meta}>
              Automatically resumes on{" "}
              <span className={styles.suspendedUntil}>
                {formatDateTimeFr(settings.suspendedUntil)}
              </span>
            </p> : null}

          {settings?.lastTicketId ? <p className={styles.meta}>
              Last automatic ticket:{" "}
              {onNavigate ? <button type="button" className={styles.metaLink} onClick={() => onNavigate("TicketDetail", {
          ticketId: settings.lastTicketId,
          clientId
        })}>
                  Open ticket
                </button> : <span>#{String(settings.lastTicketId).slice(0, 8)}</span>}
              {settings.lastAlertAt ? ` · ${formatDateTimeFr(settings.lastAlertAt)}` : null}
            </p> : null}
        </>}
    </div>;
}
