const KEY_PREFIX = "veritas_enterprise_peripherals_ui_v1_";
const OVERVIEW_TABS = new Set(["map", "cyber", "backup", "activity", "events", "vault", "logs"]);
const SCROLL_DEBOUNCE_MS = 250;

const memoryCache = new Map();
const scrollTimers = new Map();
const scrollPending = new Map();

function storageKey(clientId) {
  return `${KEY_PREFIX}${clientId}`;
}

export function normalizeEnterpriseOverviewTab(tab) {
  // Première visite / ancien onglet Dashboard : cartographie. Sinon le dernier onglet persisté prime.
  if (tab === "overview") return "map";
  return OVERVIEW_TABS.has(tab) ? tab : "map";
}

function readRaw(clientId) {
  if (memoryCache.has(clientId)) return memoryCache.get(clientId);
  try {
    const raw = sessionStorage.getItem(storageKey(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const value = parsed && typeof parsed === "object" ? parsed : null;
    if (value) memoryCache.set(clientId, value);
    return value;
  } catch {
    return null;
  }
}

function writeRaw(clientId, next) {
  memoryCache.set(clientId, next);
  try {
    sessionStorage.setItem(storageKey(clientId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function readEnterprisePeripheralsUi(clientId) {
  if (!clientId) return null;
  return readRaw(clientId);
}

export function writeEnterprisePeripheralsUi(clientId, patch = {}) {
  if (!clientId || !patch || typeof patch !== "object") return;
  const previous = readRaw(clientId) || {};
  const next = {
    ...previous,
    ...patch,
    updatedAt: Date.now()
  };
  if (Object.prototype.hasOwnProperty.call(patch, "overviewTab")) {
    next.overviewTab = normalizeEnterpriseOverviewTab(patch.overviewTab);
  }
  writeRaw(clientId, next);
}

/** Debounced scroll persistence — avoids parse/stringify on every scroll frame. */
export function writeEnterprisePeripheralsUiScroll(clientId, scrollY) {
  if (!clientId) return;
  scrollPending.set(clientId, scrollY);
  if (scrollTimers.has(clientId)) return;
  const timer = setTimeout(() => {
    scrollTimers.delete(clientId);
    const y = scrollPending.get(clientId);
    scrollPending.delete(clientId);
    if (typeof y === "number") writeEnterprisePeripheralsUi(clientId, { scrollY: y });
  }, SCROLL_DEBOUNCE_MS);
  scrollTimers.set(clientId, timer);
}

export function flushEnterprisePeripheralsUiScroll(clientId) {
  if (!clientId) return;
  const timer = scrollTimers.get(clientId);
  if (timer) {
    clearTimeout(timer);
    scrollTimers.delete(clientId);
  }
  if (!scrollPending.has(clientId)) return;
  const y = scrollPending.get(clientId);
  scrollPending.delete(clientId);
  if (typeof y === "number") writeEnterprisePeripheralsUi(clientId, { scrollY: y });
}
