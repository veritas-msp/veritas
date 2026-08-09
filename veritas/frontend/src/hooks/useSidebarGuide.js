import { useCallback, useEffect, useState } from "react";
import { readSidebarGuideState, writeSidebarGuideState } from "../components/Misc/Sidebar/sidebarGuideStorage";

/**
 * @param {string|null|undefined} userId
 * @param {{ autoStartAllowed?: boolean }} [options]
 *   autoStartAllowed — false while "premiers pas" is unfinished; true after it completes
 *   (or when onboarding does not apply). Manual start via ? still works anytime.
 */
export function useSidebarGuide(userId, {
  autoStartAllowed = true
} = {}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!userId) {
      setOpen(false);
      return undefined;
    }
    if (!autoStartAllowed) {
      setOpen(false);
      return undefined;
    }
    const saved = readSidebarGuideState(userId);
    if (!saved?.completed) {
      const timer = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [userId, autoStartAllowed]);
  const close = useCallback(() => {
    if (userId) {
      writeSidebarGuideState(userId, {
        completed: true
      });
    }
    setOpen(false);
  }, [userId]);
  const start = useCallback(() => {
    setOpen(true);
  }, []);
  return {
    open,
    close,
    start
  };
}
