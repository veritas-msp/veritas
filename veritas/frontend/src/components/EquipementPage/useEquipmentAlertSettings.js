import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchEquipmentAlertSettings, resolveEquipmentFamilyForAlerts, updateEquipmentAlertSuspension } from "../../api/equipmentMonitoringAlerts";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAlertDurationOptions, getAlertStatusLabel, getEquipmentDetailCopy } from "./equipmentDetailPageI18n";

function toDatetimeLocalValue(date = new Date()) {
  const d = new Date(date.getTime());
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function defaultCustomUntilLocal() {
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
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [mode, setMode] = useState("active");
  const [durationMinutes, setDurationMinutes] = useState(1440);
  const [useCustomUntil, setUseCustomUntil] = useState(false);
  const [customUntilLocal, setCustomUntilLocal] = useState(defaultCustomUntilLocal);
  const [reason, setReason] = useState("");
  const reload = async () => {
    if (!available) return null;
    try {
      const data = await fetchEquipmentAlertSettings(clientId, equipmentId, family);
      const enabled = data.settings == null ? true : Boolean(data.alertsEnabled);
      const isSuspended = Boolean(data.suspended);
      setSettings(data.settings);
      setSuspended(isSuspended);
      setAlertsEnabled(enabled);
      setMode(resolveModeFromSettings(data.settings, isSuspended, enabled));
      setReason(isSuspended ? data.settings?.suspensionReason || "" : "");
      if (isSuspended && data.settings?.suspensionType === "temporary" && data.settings?.suspendedUntil) {
        setUseCustomUntil(true);
        setCustomUntilLocal(toDatetimeLocalValue(new Date(data.settings.suspendedUntil)));
      } else {
        setUseCustomUntil(false);
      }
      return data;
    } catch (err) {
      toast.error(err.message || alertCopy.toasts.loadError);
      return null;
    }
  };

  useEffect(() => {
    if (!available) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;
    setLoading(true);
    reload().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when equipment identity changes
  }, [available, clientId, equipmentId, family, alertCopy.toasts.loadError]);
  const statusLabel = useMemo(() => getAlertStatusLabel(locale, suspended, alertsEnabled), [locale, suspended, alertsEnabled]);
  const durationOptions = useMemo(() => [
    ...getAlertDurationOptions(locale),
    { value: "custom", label: alertCopy.modal.durationCustom }
  ], [locale, alertCopy.modal.durationCustom]);
  const handleDurationChange = value => {
    if (value === "custom") {
      setUseCustomUntil(true);
      if (!customUntilLocal) setCustomUntilLocal(defaultCustomUntilLocal());
      return;
    }
    setUseCustomUntil(false);
    setDurationMinutes(Number(value));
  };
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
      } else if (mode === "temporary" && useCustomUntil) {
        const suspendedUntil = fromDatetimeLocalValue(customUntilLocal);
        if (!suspendedUntil || new Date(suspendedUntil).getTime() <= Date.now()) {
          toast.error(alertCopy.toasts.untilInvalid || alertCopy.modal.untilInvalid);
          return false;
        }
        payload = {
          family,
          type: equipment?.type,
          equipmentName,
          suspensionType: "temporary",
          alertsEnabled: true,
          suspendedUntil,
          reason: reason.trim() || null
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
    useCustomUntil,
    customUntilLocal,
    setCustomUntilLocal,
    handleDurationChange,
    reason,
    setReason,
    handleSave,
    reload,
    durationOptions,
    datetimeLocalMin: toDatetimeLocalValue(new Date()),
    clientId
  };
}
