/** Positionnement des flyouts (notifications, compte) près de leur déclencheur. */

export const SIDEBAR_FLYOUT_GAP_PX = 8;

export function getSidebarRailElement() {
  if (typeof document === "undefined") return null;
  return document.querySelector("[data-sidebar-rail]");
}

/**
 * Left (px) pour ancrer un panneau juste à droite du bouton déclencheur.
 * Fallback : bord droit de la sidebar, puis largeur de rail CSS.
 */
export function getSidebarFlyoutLeft({
  fallbackTrigger = null,
  gap = SIDEBAR_FLYOUT_GAP_PX
} = {}) {
  if (fallbackTrigger) {
    return Math.round(fallbackTrigger.getBoundingClientRect().right + gap);
  }
  const rail = getSidebarRailElement();
  if (rail) {
    return Math.round(rail.getBoundingClientRect().right + gap);
  }
  let railWidth = 64;
  if (typeof document !== "undefined") {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--sidebar-rail-width")
      .trim();
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) railWidth = parsed;
  }
  return Math.round(railWidth + gap);
}
