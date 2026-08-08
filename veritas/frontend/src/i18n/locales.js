import { getLegacyTimezoneOptions } from "./timezoneOptions";
export const APP_LOCALES = [{
  code: "en",
  flag: "🇬🇧",
  label: "English"
}, {
  code: "es",
  flag: "🇪🇸",
  label: "Español"
}, {
  code: "fr",
  flag: "🇫🇷",
  label: "Français"
}, {
  code: "de",
  flag: "🇩🇪",
  label: "Deutsch"
}, {
  code: "it",
  flag: "🇮🇹",
  label: "Italiano"
}];
export const DATE_FORMAT_OPTIONS = [{
  value: "dd/mm/yyyy",
  label: "DD/MM/YYYY (31/12/2026)"
}, {
  value: "mm/dd/yyyy",
  label: "MM/DD/YYYY (12/31/2026)"
}, {
  value: "yyyy-mm-dd",
  label: "YYYY-MM-DD (2026-12-31)"
}];
export const THEME_OPTIONS = [{
  value: "light",
  label: "Light"
}, {
  value: "dark",
  label: "Dark"
}, {
  value: "system",
  label: "System (OS preference)"
}];
export const TIMEZONE_OPTIONS = getLegacyTimezoneOptions();
export const PAGE_SIZE_OPTIONS = [{
  value: "25",
  label: "25"
}, {
  value: "50",
  label: "50"
}, {
  value: "100",
  label: "100"
}];
export const LOCALE_STORAGE_KEY = "veritas-app-locale";
export const LOCALE_USER_CHOICE_KEY = "veritas-app-locale-user-choice";
export function hasUserLocaleChoice() {
  try {
    return localStorage.getItem(LOCALE_USER_CHOICE_KEY) === "1";
  } catch {
    return false;
  }
}
export function markUserLocaleChoice() {
  try {
    localStorage.setItem(LOCALE_USER_CHOICE_KEY, "1");
  } catch {}
}
export function resolveServerDefaultLocale(serverDefault = "en") {
  return APP_LOCALES.some(l => l.code === serverDefault) ? serverDefault : "en";
}
export function resolveActiveLocale(serverDefault = "en") {
  const fallback = resolveServerDefaultLocale(serverDefault);
  if (!hasUserLocaleChoice()) {
    return fallback;
  }
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && APP_LOCALES.some(l => l.code === stored)) return stored;
  } catch {}
  return fallback;
}
export function getLocaleTag(locale) {
  const map = {
    fr: "fr-FR",
    en: "en-GB",
    de: "de-DE",
    it: "it-IT",
    es: "es-ES"
  };
  return map[locale] || map.fr;
}
export function syncLocaleToServerDefault(serverDefault = "fr") {
  const locale = resolveServerDefaultLocale(serverDefault);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    localStorage.removeItem(LOCALE_USER_CHOICE_KEY);
  } catch {}
  return locale;
}
export function applyDocumentLocale(locale) {
  document.documentElement.lang = locale;
}
