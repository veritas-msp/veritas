const KEY_PREFIX = "veritas_contact_detail_ui_v1_";
const OVERVIEW_TABS = new Set(["activity", "portal", "share", "logs"]);
const ACTIVITY_SECTIONS = new Set(["support", "prestations"]);
const SCROLL_DEBOUNCE_MS = 250;

const memoryCache = new Map();
const scrollTimers = new Map();
const scrollPending = new Map();

function storageKey(contactId) {
  return `${KEY_PREFIX}${contactId}`;
}

export function normalizeContactOverviewTab(tab) {
  return OVERVIEW_TABS.has(tab) ? tab : "activity";
}

export function normalizeContactActivitySection(section) {
  return ACTIVITY_SECTIONS.has(section) ? section : "support";
}

function readRaw(contactId) {
  if (memoryCache.has(contactId)) return memoryCache.get(contactId);
  try {
    const raw = sessionStorage.getItem(storageKey(contactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const value = parsed && typeof parsed === "object" ? parsed : null;
    if (value) memoryCache.set(contactId, value);
    return value;
  } catch {
    return null;
  }
}

function writeRaw(contactId, next) {
  memoryCache.set(contactId, next);
  try {
    sessionStorage.setItem(storageKey(contactId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function readContactDetailUi(contactId) {
  if (!contactId) return null;
  return readRaw(contactId);
}

export function writeContactDetailUi(contactId, patch = {}) {
  if (!contactId || !patch || typeof patch !== "object") return;
  const previous = readRaw(contactId) || {};
  const next = {
    ...previous,
    ...patch,
    updatedAt: Date.now()
  };
  if (Object.prototype.hasOwnProperty.call(patch, "overviewTab")) {
    next.overviewTab = normalizeContactOverviewTab(patch.overviewTab);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "activitySection")) {
    next.activitySection = normalizeContactActivitySection(patch.activitySection);
  }
  writeRaw(contactId, next);
}

export function writeContactDetailUiScroll(contactId, scrollY) {
  if (!contactId) return;
  scrollPending.set(contactId, scrollY);
  if (scrollTimers.has(contactId)) return;
  const timer = setTimeout(() => {
    scrollTimers.delete(contactId);
    const y = scrollPending.get(contactId);
    scrollPending.delete(contactId);
    if (typeof y === "number") writeContactDetailUi(contactId, { scrollY: y });
  }, SCROLL_DEBOUNCE_MS);
  scrollTimers.set(contactId, timer);
}

export function flushContactDetailUiScroll(contactId) {
  if (!contactId) return;
  const timer = scrollTimers.get(contactId);
  if (timer) {
    clearTimeout(timer);
    scrollTimers.delete(contactId);
  }
  if (!scrollPending.has(contactId)) return;
  const y = scrollPending.get(contactId);
  scrollPending.delete(contactId);
  if (typeof y === "number") writeContactDetailUi(contactId, { scrollY: y });
}
