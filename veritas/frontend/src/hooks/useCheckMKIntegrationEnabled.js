import { useEffect, useState } from "react";
import { fetchCheckMKIntegrationStatus } from "../api/checkmkIntegrationStatus";

const CACHE_MS = 60 * 1000;
const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000;

const DEFAULT_STATUS = {
  enabled: false,
  syncIntervalMs: DEFAULT_SYNC_INTERVAL_MS,
  syncIntervalMinutes: 30,
  syncSuspended: false,
  surveillanceSuspended: false
};

let cachedStatus = null;
let cacheExpiresAt = 0;

function normalizeStatus(payload) {
  const syncIntervalMs = Number(payload?.syncIntervalMs);
  const syncIntervalMinutes = Number(payload?.syncIntervalMinutes);
  return {
    enabled: payload?.enabled === true,
    syncIntervalMs: Number.isFinite(syncIntervalMs) && syncIntervalMs > 0
      ? syncIntervalMs
      : DEFAULT_SYNC_INTERVAL_MS,
    syncIntervalMinutes: Number.isFinite(syncIntervalMinutes) && syncIntervalMinutes > 0
      ? syncIntervalMinutes
      : 30,
    syncSuspended: payload?.syncSuspended === true,
    surveillanceSuspended: payload?.surveillanceSuspended === true
  };
}

export function invalidateCheckMKIntegrationCache() {
  cachedStatus = null;
  cacheExpiresAt = 0;
}

export function useCheckMKIntegrationEnabled() {
  const hasFreshCache = cachedStatus !== null && cacheExpiresAt > Date.now();
  const [status, setStatus] = useState(() => hasFreshCache ? cachedStatus : DEFAULT_STATUS);
  const [loaded, setLoaded] = useState(() => hasFreshCache);

  useEffect(() => {
    let cancelled = false;
    const apply = next => {
      const normalized = normalizeStatus(next);
      cachedStatus = normalized;
      cacheExpiresAt = Date.now() + CACHE_MS;
      if (!cancelled) {
        setStatus(normalized);
        setLoaded(true);
      }
    };
    const load = () => fetchCheckMKIntegrationStatus().then(payload => apply(payload)).catch(() => {
      if (!cancelled) {
        setStatus(DEFAULT_STATUS);
        setLoaded(true);
      }
    });
    if (cachedStatus !== null && cacheExpiresAt > Date.now()) {
      setStatus(cachedStatus);
      setLoaded(true);
    } else {
      load();
    }
    const onUpdated = () => {
      invalidateCheckMKIntegrationCache();
      load();
    };
    window.addEventListener("integrationsSettingsUpdated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("integrationsSettingsUpdated", onUpdated);
    };
  }, []);

  return {
    enabled: status.enabled,
    loaded,
    syncIntervalMs: status.syncIntervalMs,
    syncIntervalMinutes: status.syncIntervalMinutes,
    syncSuspended: status.syncSuspended,
    surveillanceSuspended: status.surveillanceSuspended
  };
}
