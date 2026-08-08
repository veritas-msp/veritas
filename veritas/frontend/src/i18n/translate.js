import { APP_LOCALES } from "./locales";
export function normalizeLocale(locale, fallback = "fr") {
  const code = String(locale || fallback).slice(0, 2).toLowerCase();
  if (APP_LOCALES.some(entry => entry.code === code)) return code;
  const safeFallback = APP_LOCALES.some(entry => entry.code === fallback) ? fallback : "fr";
  return safeFallback;
}
export function pickLocaleMessages(catalog, locale, fallback = "fr") {
  const code = normalizeLocale(locale, fallback);
  return catalog[code] || catalog[fallback] || catalog.fr;
}
export function interpolate(template, params = {}) {
  if (typeof template !== "string") return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value != null ? String(value) : `{${key}}`;
  });
}
export function createLocaleGetter(catalog, fallback = "fr") {
  return locale => pickLocaleMessages(catalog, locale, fallback);
}
