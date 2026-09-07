import { useCallback, useEffect, useState } from "react";
import { getUserSetting, saveUserSetting } from "../api/userSettings";
import {
  SIDEBAR_LAYOUT_EVENT,
  SIDEBAR_LAYOUT_SETTING_KEY,
  SIDEBAR_LAYOUTS,
  applySidebarLayoutPreference,
  normalizeSidebarLayout,
  readStoredSidebarLayout,
  syncSidebarLayoutDataset
} from "../utils/sidebarLayoutPreferences";

syncSidebarLayoutDataset();

export function useSidebarLayout() {
  const [layout, setLayoutState] = useState(() => readStoredSidebarLayout());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    syncSidebarLayoutDataset(layout);
  }, [layout]);

  useEffect(() => {
    const onChange = event => {
      const next = normalizeSidebarLayout(event?.detail?.layout);
      setLayoutState(next);
    };
    window.addEventListener(SIDEBAR_LAYOUT_EVENT, onChange);
    return () => window.removeEventListener(SIDEBAR_LAYOUT_EVENT, onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getUserSetting(SIDEBAR_LAYOUT_SETTING_KEY).then(payload => {
      if (cancelled) return;
      const remote = payload?.value ?? payload?.setting_value ?? payload;
      if (remote == null || remote === "") return;
      const next = applySidebarLayoutPreference(remote);
      setLayoutState(next);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setLayout = useCallback(async nextLayout => {
    const next = normalizeSidebarLayout(nextLayout);
    setLayoutState(next);
    applySidebarLayoutPreference(next);
    setSaving(true);
    try {
      await saveUserSetting(SIDEBAR_LAYOUT_SETTING_KEY, next);
    } finally {
      setSaving(false);
    }
    return next;
  }, []);

  return {
    layout,
    isHorizontal: layout === SIDEBAR_LAYOUTS.horizontal,
    isVertical: layout === SIDEBAR_LAYOUTS.vertical,
    setLayout,
    saving,
    layouts: SIDEBAR_LAYOUTS
  };
}
