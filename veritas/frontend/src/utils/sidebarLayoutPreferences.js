export const SIDEBAR_LAYOUT_STORAGE_KEY = "veritas_sidebar_layout";
export const SIDEBAR_LAYOUT_SETTING_KEY = "sidebar_layout";
export const SIDEBAR_LAYOUT_EVENT = "veritas-sidebar-layout-change";

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
