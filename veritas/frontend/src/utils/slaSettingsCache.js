import { fetchSlaSettings } from "../api/slaSettings";
import { DEFAULT_SLA_SETTINGS, normalizeSlaSettings } from "./slaSettingsUtils";

let cached = null;
let pending = null;
let listeners = new Set();

export function getCachedSlaSettings() {
  return cached;
}

export function getSlaSettingsForDisplay(override) {
  if (override) return normalizeSlaSettings(override);
  if (cached) return cached;
  return DEFAULT_SLA_SETTINGS;
}

export function setCachedSlaSettings(settings) {
  cached = normalizeSlaSettings(settings || DEFAULT_SLA_SETTINGS);
  listeners.forEach(fn => {
    try {
      fn(cached);
    } catch {
      /* ignore */
    }
  });
  return cached;
}

export function subscribeSlaSettingsCache(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function ensureSlaSettingsLoaded() {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetchSlaSettings()
    .then(data => {
      setCachedSlaSettings(data);
      pending = null;
      return cached;
    })
    .catch(err => {
      pending = null;
      if (!cached) setCachedSlaSettings(DEFAULT_SLA_SETTINGS);
      throw err;
    });
  return pending;
}
