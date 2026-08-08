import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchGeneralSettings } from "../api/generalSettings";
import { applyDocumentLocale, LOCALE_STORAGE_KEY, LOCALE_USER_CHOICE_KEY, markUserLocaleChoice, resolveActiveLocale, resolveServerDefaultLocale, syncLocaleToServerDefault } from "../i18n/locales";
import { formatAppDate, formatAppDateTime, formatAppDateRange, formatAppEventRange, formatAppLongDate, formatAppTime, parseDefaultPageSize, resolveEffectiveDateFormat, setAppRegionalSettings } from "../utils/appRegionalSettings";
import { applyAdminDefaultThemeIfAllowed } from "../utils/themePreferences";
const DEFAULTS = {
  app_default_locale: "fr",
  app_timezone: "Europe/Paris",
  app_date_format: "dd/mm/yyyy",
  app_organization_name: "Veritas",
  app_organization_address: "",
  app_default_theme: "light",
  app_default_page_size: "50",
  app_support_email: ""
};
const AppGeneralSettingsContext = createContext(null);
function mergeSettings(data) {
  return {
    ...DEFAULTS,
    ...(data || {})
  };
}
function applySettingsSideEffects(settings, {
  preferServerDefault = false
} = {}) {
  setAppRegionalSettings(settings);
  const locale = preferServerDefault ? syncLocaleToServerDefault(settings.app_default_locale) : resolveActiveLocale(settings.app_default_locale);
  applyDocumentLocale(locale);
  applyAdminDefaultThemeIfAllowed(settings.app_default_theme);
  window.dispatchEvent(new CustomEvent("appAdminThemeSetting", {
    detail: settings.app_default_theme || "light"
  }));
  window.dispatchEvent(new CustomEvent("appLocaleChanged", {
    detail: {
      locale
    }
  }));
  return locale;
}
export function AppGeneralSettingsProvider({
  children
}) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [locale, setLocale] = useState(() => resolveActiveLocale(DEFAULTS.app_default_locale));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchGeneralSettings().then(data => {
      if (cancelled) return;
      const merged = mergeSettings(data);
      setSettings(merged);
      setLocale(applySettingsSideEffects(merged));
    }).catch(() => {
      if (!cancelled) {
        const fallback = resolveActiveLocale("fr");
        applyDocumentLocale(fallback);
        setLocale(fallback);
      }
    }).finally(() => {
      if (!cancelled) setLoaded(true);
    });
    const onUpdated = event => {
      const next = mergeSettings(event.detail);
      setSettings(next);
      setLocale(applySettingsSideEffects(next, {
        preferServerDefault: true
      }));
    };
    const onLocaleChanged = event => {
      const nextLocale = event.detail?.locale;
      if (nextLocale) {
        setLocale(nextLocale);
      }
    };
    window.addEventListener("appGeneralSettingsUpdated", onUpdated);
    window.addEventListener("appLocaleChanged", onLocaleChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("appGeneralSettingsUpdated", onUpdated);
      window.removeEventListener("appLocaleChanged", onLocaleChanged);
    };
  }, []);
  const defaultPageSize = useMemo(() => parseDefaultPageSize(settings), [settings.app_default_page_size]);
  const value = useMemo(() => ({
    settings,
    loaded,
    defaultPageSize,
    locale
  }), [settings, loaded, defaultPageSize, locale]);
  return <AppGeneralSettingsContext.Provider value={value}>
      {children}
    </AppGeneralSettingsContext.Provider>;
}
function useAppGeneralSettingsContext() {
  const context = useContext(AppGeneralSettingsContext);
  if (!context) {
    throw new Error("useAppGeneralSettings must be used within AppGeneralSettingsProvider");
  }
  return context;
}
export function useAppGeneralSettings() {
  const {
    settings,
    loaded,
    defaultPageSize
  } = useAppGeneralSettingsContext();
  return {
    settings,
    loaded,
    defaultPageSize
  };
}
export function useAppFormatters() {
  const {
    settings,
    locale
  } = useAppGeneralSettingsContext();
  return useMemo(() => {
    const regional = {
      dateFormat: resolveEffectiveDateFormat(settings.app_date_format, locale),
      timezone: settings.app_timezone,
      locale
    };
    return {
      formatDate: value => formatAppDate(value, regional),
      formatTime: value => formatAppTime(value, regional),
      formatDateTime: value => formatAppDateTime(value, regional),
      formatDateRange: (start, end) => formatAppDateRange(start, end, regional),
      formatLongDate: value => formatAppLongDate(value, regional),
      formatEventRange: (start, end, options) => formatAppEventRange(start, end, regional, options),
      timezone: regional.timezone,
      dateFormat: regional.dateFormat,
      locale
    };
  }, [settings.app_date_format, settings.app_timezone, locale]);
}
export function useAppLocale() {
  return useAppGeneralSettingsContext().locale;
}
export function setUserLocaleOverride(locale) {
  const nextLocale = resolveServerDefaultLocale(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    markUserLocaleChoice();
  } catch {}
  applyDocumentLocale(nextLocale);
  setAppRegionalSettings({
    app_default_locale: nextLocale
  });
  window.dispatchEvent(new CustomEvent("appLocaleChanged", {
    detail: {
      locale: nextLocale
    }
  }));
}
export function clearUserLocaleOverride() {
  try {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    localStorage.removeItem(LOCALE_USER_CHOICE_KEY);
  } catch {}
}
