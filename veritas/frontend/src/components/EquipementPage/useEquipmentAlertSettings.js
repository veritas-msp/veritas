import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchEquipmentAlertSettings, resolveEquipmentFamilyForAlerts, updateEquipmentAlertSuspension } from "../../api/equipmentMonitoringAlerts";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAlertDurationOptions, getAlertStatusLabel, getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
function resolveModeFromSettings(settings, suspended, alertsEnabled) {
  if (suspended) {
    return settings?.suspensionType === "permanent" ? "permanent" : "temporary";
  }
  return alertsEnabled ? "active" : "disabled";
}
export function formatAlertStatusLabel(suspended, alertsEnabled, locale) {
  return getAlertStatusLabel(locale, suspended, alertsEnabled);
}
export function useEquipmentAlertSettings(equipment) {
  const locale = useAppLocale();
  const alertCopy = useMemo(() => getEquipmentDetailCopy(locale).alertSettings, [locale]);
  const equipmentId = getEquipmentDbId(equipment);
  const clientId = equipment?.clientId;
  const family = useMemo(() => resolveEquipmentFamilyForAlerts(equipment?.type), [equipment?.type]);
  const equipmentName = equipment?.name || equipment?.rawData?.nom || "";
  const available = Boolean(equipmentId && clientId && family);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [suspended, setSuspended] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [mode, setMode] = useState("disabled");
  const [durationMinutes, setDurationMinutes] = useState(1440);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!available) {
      setLoading(false);
      return undefined;
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
      setReason(isSuspended ? data.settings?.suspensionReason || "" : "");
    }).catch(err => {
      if (!mounted) return;
      toast.error(err.message || alertCopy.toasts.loadError);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [available, clientId, equipmentId, family, alertCopy.toasts.loadError]);
  const statusLabel = useMemo(() => getAlertStatusLabel(locale, suspended, alertsEnabled), [locale, suspended, alertsEnabled]);
  const handleSave = async () => {
    if (!available) return false;
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
        toast.success(alertCopy.toasts.enabled);
      } else if (mode === "disabled") {
        toast.success(alertCopy.toasts.disabled);
      } else if (data.suspended) {
        toast.success(alertCopy.toasts.suspended);
      } else {
        toast.success(alertCopy.toasts.reactivated);
      }
      return true;
    } catch (err) {
      toast.error(err.message || alertCopy.toasts.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  };
  return {
    available,
    loading,
    saving,
    settings,
    suspended,
    alertsEnabled,
    statusLabel,
    mode,
    setMode,
    durationMinutes,
    setDurationMinutes,
    reason,
    setReason,
    handleSave,
    durationOptions: getAlertDurationOptions(locale),
    clientId
  };
}
