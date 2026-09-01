/** Canonical layout breakpoints (CSS px). Keep in sync with theme.css tokens. */
export const BREAKPOINTS = {
  phone: 768,
  tablet: 1024,
  wide: 1440
};

export const MEDIA = {
  phone: `(max-width: ${BREAKPOINTS.phone - 1}px)`,
  compact: `(max-width: ${BREAKPOINTS.tablet - 1}px)`,
  tabletOnly: `(min-width: ${BREAKPOINTS.phone}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.tablet}px)`,
  wide: `(min-width: ${BREAKPOINTS.wide}px)`
};

export function readBreakpointFlags(win = typeof window !== "undefined" ? window : null) {
  if (!win?.matchMedia) {
    return {
      isPhone: false,
      isCompact: false,
      isWide: true
    };
  }
  return {
    isPhone: win.matchMedia(MEDIA.phone).matches,
    isCompact: win.matchMedia(MEDIA.compact).matches,
    isWide: win.matchMedia(MEDIA.wide).matches
  };
}
