const KEY_PREFIX = "veritas_equipment_detail_ui_v1_";
const DETAIL_TABS = new Set([
  "synthese",
  "fiche",
  "operations",
  "peripherals",
  "supervision",
  "activity",
  "history",
  "documents",
  "logs",
  "events",
  "stats",
  "metrics"
]);
const SUPERVISION_PANES = new Set(["main", "history"]);
const SCROLL_DEBOUNCE_MS = 250;

const memoryCache = new Map();
const scrollTimers = new Map();
const scrollPending = new Map();

function storageKey(equipmentId) {
  return `${KEY_PREFIX}${equipmentId}`;
}

export function normalizeEquipmentDetailTab(tab) {
  if (tab === "events" || tab === "stats") return "activity";
  if (tab === "metrics") return "metrics";
  if (tab === "notes" || tab === "fiche" || tab === "hardware") return "fiche";
  if (tab === "history" || tab === "maintenance") return "supervision";
  if (tab === "dashboard" || tab === "overview" || tab === "general") return "synthese";
  if (tab === "synthese" || tab === "summary") return "synthese";
  return DETAIL_TABS.has(tab) ? tab : "synthese";
}

export function normalizeEquipmentActivityPane(pane) {
  if (pane === "maintenance" || pane === "veritas" || pane === "metrics") return "veritas";
  return "veritas";
}

export function normalizeEquipmentRmmPane(pane) {
  if (pane === "operations" || pane === "peripherals" || pane === "metrics" || pane === "synthese") {
    return pane;
  }
  return "synthese";
}

export function normalizeEquipmentSupervisionPane(pane) {
  if (pane === "history") return "history";
  if (pane === "main") return "main";
  return SUPERVISION_PANES.has(pane) ? pane : "main";
}

export function normalizeEquipmentOverviewPane(pane, { allowRmm = true, allowSupervision = true } = {}) {
  if (pane === "supervision" && allowSupervision) return "supervision";
  if (pane === "fiche") return "fiche";
  if (pane === "rmm" && allowRmm) return "rmm";
  if (allowSupervision) return "supervision";
  if (allowRmm) return "rmm";
  return "fiche";
}

function readRaw(equipmentId) {
  if (memoryCache.has(equipmentId)) return memoryCache.get(equipmentId);
  try {
    const raw = sessionStorage.getItem(storageKey(equipmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const value = parsed && typeof parsed === "object" ? parsed : null;
    if (value) memoryCache.set(equipmentId, value);
    return value;
  } catch {
    return null;
  }
}

function writeRaw(equipmentId, next) {
  memoryCache.set(equipmentId, next);
  try {
    sessionStorage.setItem(storageKey(equipmentId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function readEquipmentDetailUi(equipmentId) {
  if (!equipmentId) return null;
  return readRaw(equipmentId);
}

export function writeEquipmentDetailUi(equipmentId, patch = {}) {
  if (!equipmentId || !patch || typeof patch !== "object") return;
  const previous = readRaw(equipmentId) || {};
  const next = {
    ...previous,
    ...patch,
    updatedAt: Date.now()
  };
  if (Object.prototype.hasOwnProperty.call(patch, "rightPanelTab")) {
    next.rightPanelTab = normalizeEquipmentDetailTab(patch.rightPanelTab);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "activityPane")) {
    next.activityPane = normalizeEquipmentActivityPane(patch.activityPane);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "overviewPane")) {
    next.overviewPane = normalizeEquipmentOverviewPane(patch.overviewPane);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "supervisionPane")) {
    next.supervisionPane = normalizeEquipmentSupervisionPane(patch.supervisionPane);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "rmmPane")) {
    next.rmmPane = normalizeEquipmentRmmPane(patch.rmmPane);
  }
  writeRaw(equipmentId, next);
}

export function writeEquipmentDetailUiScroll(equipmentId, scrollY) {
  if (!equipmentId) return;
  scrollPending.set(equipmentId, scrollY);
  if (scrollTimers.has(equipmentId)) return;
  const timer = setTimeout(() => {
    scrollTimers.delete(equipmentId);
    const y = scrollPending.get(equipmentId);
    scrollPending.delete(equipmentId);
    if (typeof y === "number") writeEquipmentDetailUi(equipmentId, { scrollY: y });
  }, SCROLL_DEBOUNCE_MS);
  scrollTimers.set(equipmentId, timer);
}

export function flushEquipmentDetailUiScroll(equipmentId) {
  if (!equipmentId) return;
  const timer = scrollTimers.get(equipmentId);
  if (timer) {
    clearTimeout(timer);
    scrollTimers.delete(equipmentId);
  }
  if (!scrollPending.has(equipmentId)) return;
  const y = scrollPending.get(equipmentId);
  scrollPending.delete(equipmentId);
  if (typeof y === "number") writeEquipmentDetailUi(equipmentId, { scrollY: y });
}
