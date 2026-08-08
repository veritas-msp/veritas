import { useCallback, useEffect, useState } from "react";
import { fetchGeneralSettings, updateGeneralSettings } from "../../api/generalSettings";
import { fetchSlaSettings, updateSlaSettings } from "../../api/slaSettings";
import { showError } from "../../utils/toast";
import { ONBOARDING_SETUP_EMPTY, buildOnboardingSetupDraft, cloneWeekSchedule } from "./onboardingSetupShared";
import { DEFAULT_SLA_SETTINGS } from "../../utils/slaSettingsUtils";
async function loadOnboardingSetupData() {
  const [generalResult, slaResult] = await Promise.allSettled([fetchGeneralSettings(), fetchSlaSettings()]);
  const general = generalResult.status === "fulfilled" ? generalResult.value : {
    ...ONBOARDING_SETUP_EMPTY
  };
  const sla = slaResult.status === "fulfilled" ? slaResult.value : {
    ...DEFAULT_SLA_SETTINGS
  };
  return {
    draft: buildOnboardingSetupDraft(general, sla),
    hadErrors: generalResult.status === "rejected" || slaResult.status === "rejected",
    generalFailed: generalResult.status === "rejected"
  };
}
export function useOnboardingSetup(labels, locale = "fr") {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadOnboardingSetupData().then(({
      draft: nextDraft,
      hadErrors,
      generalFailed
    }) => {
      if (cancelled) return;
      setDraft(nextDraft);
      if (hadErrors) {
        if (generalFailed) {
          showError(labels.shared.loadError);
        } else {
          showError(labels.shared.loadPartialError);
        }
      }
    }).catch(() => {
      if (!cancelled) {
        setDraft(buildOnboardingSetupDraft());
        showError(labels.shared.loadError);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [labels.shared.loadError, labels.shared.loadPartialError]);
  const patchGeneral = useCallback(patch => {
    setDraft(prev => prev ? {
      ...prev,
      general: {
        ...prev.general,
        ...patch
      }
    } : prev);
  }, []);
  const setWeekSchedule = useCallback(updater => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = typeof updater === "function" ? updater(prev.weekSchedule) : updater;
      return {
        ...prev,
        weekSchedule: next
      };
    });
  }, []);
  const saveIdentity = useCallback(async () => {
    if (!draft) return false;
    const name = String(draft.general.app_organization_name || "").trim();
    if (!name) {
      showError(labels.identity.nameRequired);
      return false;
    }
    if (!draft.general.app_organization_employee_range) {
      showError(labels.identity.employeeRangeRequired);
      return false;
    }
    setSaving(true);
    try {
      const {
        settings
      } = await updateGeneralSettings({
        ...draft.general,
        app_default_locale: locale,
        app_organization_name: name,
        app_organization_employee_range: draft.general.app_organization_employee_range,
        app_organization_address: String(draft.general.app_organization_address || "").trim(),
        app_organization_website: String(draft.general.app_organization_website || "").trim()
      });
      const next = {
        ...ONBOARDING_SETUP_EMPTY,
        ...(settings || {})
      };
      patchGeneral({
        app_organization_name: next.app_organization_name || name,
        app_organization_address: next.app_organization_address || "",
        app_organization_website: next.app_organization_website || "",
        app_organization_employee_range: next.app_organization_employee_range || draft.general.app_organization_employee_range || "",
        app_support_email: next.app_support_email || draft.general.app_support_email || "",
        app_support_phone: next.app_support_phone || draft.general.app_support_phone || "",
        app_timezone: next.app_timezone || draft.general.app_timezone || "Europe/Paris"
      });
      window.dispatchEvent(new CustomEvent("appGeneralSettingsUpdated", {
        detail: next
      }));
      return true;
    } catch (err) {
      showError(err.message || labels.shared.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, labels.identity.nameRequired, labels.identity.employeeRangeRequired, labels.shared.saveError, locale, patchGeneral]);
  const saveSupport = useCallback(async () => {
    if (!draft) return false;
    const timezone = draft.general.app_timezone || "Europe/Paris";
    const nextGeneral = {
      ...draft.general,
      app_default_locale: locale,
      app_support_email: String(draft.general.app_support_email || "").trim(),
      app_support_phone: String(draft.general.app_support_phone || "").trim(),
      app_timezone: timezone
    };
    setSaving(true);
    try {
      const {
        settings: generalSettings
      } = await updateGeneralSettings(nextGeneral);
      const saved = {
        ...ONBOARDING_SETUP_EMPTY,
        ...(generalSettings || nextGeneral)
      };
      patchGeneral({
        app_organization_name: saved.app_organization_name || draft.general.app_organization_name || "",
        app_organization_address: saved.app_organization_address || "",
        app_organization_website: saved.app_organization_website || "",
        app_support_email: saved.app_support_email || "",
        app_support_phone: saved.app_support_phone || "",
        app_timezone: saved.app_timezone || timezone
      });
      window.dispatchEvent(new CustomEvent("appGeneralSettingsUpdated", {
        detail: saved
      }));
      return true;
    } catch (err) {
      showError(err.message || labels.shared.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, labels.shared.saveError, locale, patchGeneral]);
  const saveHours = useCallback(async () => {
    if (!draft) return false;
    const timezone = draft.general.app_timezone || "Europe/Paris";
    const hasOpenDays = draft.weekSchedule.some(row => row.enabled);
    setSaving(true);
    try {
      const {
        settings
      } = await updateSlaSettings({
        timeMode: hasOpenDays ? "business_hours" : "calendar",
        timezone,
        weekSchedule: draft.weekSchedule
      });
      if (settings?.weekSchedule) {
        setWeekSchedule(cloneWeekSchedule(settings.weekSchedule));
      }
      return true;
    } catch (err) {
      showError(err.message || labels.shared.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, labels.shared.saveError, setWeekSchedule]);
  return {
    draft,
    loading,
    saving,
    patchGeneral,
    setWeekSchedule,
    saveIdentity,
    saveSupport,
    saveHours
  };
}
