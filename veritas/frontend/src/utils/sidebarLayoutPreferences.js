export const SIDEBAR_LAYOUT_STORAGE_KEY = "veritas_sidebar_layout";
export const SIDEBAR_LAYOUT_SETTING_KEY = "sidebar_layout";
export const SIDEBAR_LAYOUT_EVENT = "veritas-sidebar-layout-change";
/** Prefer preference : rail icônes (true) vs sidebar avec libellés (false). */
export const SIDEBAR_RAIL_COLLAPSED_STORAGE_KEY = "veritas_sidebar_rail_collapsed";
export const SIDEBAR_RAIL_COLLAPSED_EVENT = "veritas-sidebar-rail-collapsed-change";

export const SIDEBAR_LAYOUTS = Object.freeze({
  vertical: "vertical",
  horizontal: "horizontal"
});

export function normalizeSidebarLayout(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "horizontal" || raw === "top" || raw === "bar") return SIDEBAR_LAYOUTS.horizontal;
  return SIDEBAR_LAYOUTS.vertical;
}

export function readStoredSidebarLayout() {
  try {
    return normalizeSidebarLayout(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY));
  } catch {
    return SIDEBAR_LAYOUTS.vertical;
  }
}

export function applySidebarLayoutPreference(layout) {
  const next = normalizeSidebarLayout(layout);
  try {
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, next);
  } catch {}
  try {
    document.documentElement.dataset.sidebarLayout = next;
  } catch {}
  window.dispatchEvent(new CustomEvent(SIDEBAR_LAYOUT_EVENT, {
    detail: {
      layout: next
    }
  }));
  return next;
}

export function syncSidebarLayoutDataset(layout = readStoredSidebarLayout()) {
  try {
    document.documentElement.dataset.sidebarLayout = normalizeSidebarLayout(layout);
  } catch {}
}

/** false = sidebar étendue avec noms (défaut) ; true = rail icônes 64px. */
export function readStoredSidebarRailCollapsed() {
  try {
    const raw = localStorage.getItem(SIDEBAR_RAIL_COLLAPSED_STORAGE_KEY);
    if (raw == null) return false;
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function applySidebarRailCollapsedPreference(collapsed) {
  const next = Boolean(collapsed);
  try {
    localStorage.setItem(SIDEBAR_RAIL_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent(SIDEBAR_RAIL_COLLAPSED_EVENT, {
    detail: {
      collapsed: next
    }
  }));
  return next;
}
