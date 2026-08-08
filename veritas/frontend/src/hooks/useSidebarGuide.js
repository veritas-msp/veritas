import { useCallback, useEffect, useState } from "react";
import { readSidebarGuideState, writeSidebarGuideState } from "../components/Misc/Sidebar/sidebarGuideStorage";
export function useSidebarGuide(userId) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!userId) {
      setOpen(false);
      return undefined;
    }
    const saved = readSidebarGuideState(userId);
    if (!saved?.completed) {
      const timer = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [userId]);
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
