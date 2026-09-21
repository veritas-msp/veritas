import { getSettingsMap } from "./settingsHelper.js";

export const CHECKMK_MONITORING_SETTING_KEYS = {
  syncIntervalMinutes: "CHECKMK_SYNC_INTERVAL_MINUTES",
  syncSuspended: "CHECKMK_SYNC_SUSPENDED",
  surveillanceSuspended: "CHECKMK_SURVEILLANCE_SUSPENDED"
};

const DEFAULT_SYNC_INTERVAL_MINUTES = 30;
const MIN_SYNC_INTERVAL_MINUTES = 5;
const MAX_SYNC_INTERVAL_MINUTES = 7 * 24 * 60; // 7 jours

function parseBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

export function clampCheckmkSyncIntervalMinutes(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_SYNC_INTERVAL_MINUTES;
  return Math.min(MAX_SYNC_INTERVAL_MINUTES, Math.max(MIN_SYNC_INTERVAL_MINUTES, n));
}

/**
 * Paramètres de synchro / surveillance CheckMK (Admin → Intégrations).
 * - syncIntervalMinutes : intervalle mini entre syncs + cadence poller + base « stale »
 * - syncSuspended : pause le refresh automatique
 * - surveillanceSuspended : masque les alertes supervision CheckMK (centre + tickets auto)
 */
export async function getCheckmkMonitoringSettings() {
  const map = await getSettingsMap(Object.values(CHECKMK_MONITORING_SETTING_KEYS));
  const syncIntervalMinutes = clampCheckmkSyncIntervalMinutes(
    map[CHECKMK_MONITORING_SETTING_KEYS.syncIntervalMinutes]
  );
  const syncSuspended = parseBool(map[CHECKMK_MONITORING_SETTING_KEYS.syncSuspended], false);
  const surveillanceSuspended = parseBool(
    map[CHECKMK_MONITORING_SETTING_KEYS.surveillanceSuspended],
    false
  );
  // Tolère un cycle manqué avant de remonter « no_data ».
  const staleAfterMinutes = Math.max(syncIntervalMinutes, syncIntervalMinutes * 2);
  return {
    syncIntervalMinutes,
    syncIntervalMs: syncIntervalMinutes * 60 * 1000,
    staleAfterMinutes,
    staleAfterMs: staleAfterMinutes * 60 * 1000,
    syncSuspended,
    surveillanceSuspended,
    minIntervalMinutes: MIN_SYNC_INTERVAL_MINUTES,
    maxIntervalMinutes: MAX_SYNC_INTERVAL_MINUTES,
    defaultIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES
  };
}

export function isCheckmkSyncStale(lastSyncedAt, staleAfterMs) {
  if (!lastSyncedAt) return true;
  const ms = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(ms)) return true;
  const threshold = Number(staleAfterMs);
  if (!Number.isFinite(threshold) || threshold <= 0) return false;
  return Date.now() - ms > threshold;
}
