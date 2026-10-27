import { useEffect, useState } from "react";

/**
 * Attend la fin des anim shell/sidebar avant d’autoriser les fetches lourds
 * (Support / Prestations), pour ne pas bloquer le main thread / la sidebar.
 */
export function usePageBootGate({ delayMs = 360 } = {}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let idleId = null;
    const timer = window.setTimeout(() => {
      const finish = () => {
        if (!cancelled) setReady(true);
      };
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(finish, { timeout: 600 });
      } else {
        finish();
      }
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs]);
  return ready;
}
