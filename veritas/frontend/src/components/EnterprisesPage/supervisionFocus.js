const FOCUS_KEY = "veritas_supervision_focus";

export function rememberSupervisionFocus(focus) {
  try {
    sessionStorage.setItem(FOCUS_KEY, JSON.stringify({
      query: String(focus?.query || "").trim(),
      alertId: String(focus?.alertId || "").trim()
    }));
  } catch {
    /* session storage unavailable */
  }
}

export function consumeSupervisionFocus() {
  try {
    const raw = sessionStorage.getItem(FOCUS_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FOCUS_KEY);
    const parsed = JSON.parse(raw);
    const query = String(parsed?.query || "").trim();
    if (!query) return null;
    return { query, alertId: String(parsed?.alertId || "").trim() };
  } catch {
    return null;
  }
}
