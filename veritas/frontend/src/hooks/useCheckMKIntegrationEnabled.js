import { useEffect, useState } from "react";
import { fetchCheckMKIntegrationStatus } from "../api/checkmkIntegrationStatus";
const CACHE_MS = 60 * 1000;
let cachedEnabled = null;
let cacheExpiresAt = 0;
export function invalidateCheckMKIntegrationCache() {
  cachedEnabled = null;
  cacheExpiresAt = 0;
}
export function useCheckMKIntegrationEnabled() {
  const [enabled, setEnabled] = useState(() => cachedEnabled !== null && cacheExpiresAt > Date.now() ? cachedEnabled : false);
  const [loaded, setLoaded] = useState(() => cachedEnabled !== null && cacheExpiresAt > Date.now());
  useEffect(() => {
    let cancelled = false;
    const apply = next => {
      cachedEnabled = next;
      cacheExpiresAt = Date.now() + CACHE_MS;
      if (!cancelled) {
        setEnabled(next);
        setLoaded(true);
      }
    };
    const load = () => fetchCheckMKIntegrationStatus().then(payload => apply(payload?.enabled === true)).catch(() => {
      if (!cancelled) {
        setEnabled(false);
        setLoaded(true);
      }
    });
    if (cachedEnabled !== null && cacheExpiresAt > Date.now()) {
      setEnabled(cachedEnabled);
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
    enabled,
    loaded
  };
}
