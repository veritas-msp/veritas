import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchUpdateStatus } from "../api/platformUpdates";
import { useAppLocale } from "./useAppGeneralSettings";
import { getUpdatesPageCopy } from "../components/UpdatesPage/updatesPageI18n";
import { interpolate } from "../i18n/translate";
import { isSuperAdminProtectedProfile } from "../utils/profileProtection";

const TOAST_STORAGE_KEY = "veritas.updateToast.version";
const POLL_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * Polls platform update status for Super Admins.
 * Shows a one-time toast per available version and exposes badge state.
 */
export function usePlatformUpdateAlert(profile) {
  const locale = useAppLocale();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const isSuperAdmin = isSuperAdminProtectedProfile(profile);

  useEffect(() => {
    if (!isSuperAdmin) {
      setUpdateAvailable(false);
      setLatestVersion(null);
      return undefined;
    }

    let cancelled = false;
    const t = getUpdatesPageCopy(locale);

    const run = async ({ force = false } = {}) => {
      try {
        const status = await fetchUpdateStatus({ force });
        if (cancelled) return;
        const available = Boolean(status.updateAvailable);
        const version = status.latest?.version || null;
        setUpdateAvailable(available);
        setLatestVersion(version);
        if (available && version) {
          const seen = sessionStorage.getItem(TOAST_STORAGE_KEY);
          if (seen !== version) {
            sessionStorage.setItem(TOAST_STORAGE_KEY, version);
            toast.info(interpolate(t.toastUpdateFound, { version }), {
              toastId: `platform-update-${version}`
            });
          }
        }
      } catch {
        /* silent — Super Admin can open /updates manually */
      }
    };

    run();
    const timer = setInterval(() => run({ force: true }), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isSuperAdmin, locale]);

  return { updateAvailable, latestVersion };
}
