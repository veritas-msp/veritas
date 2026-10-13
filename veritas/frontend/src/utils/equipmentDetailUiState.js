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
const ACTIVITY_PANES = new Set(["metrics", "veritas"]);
const OVERVIEW_PANES = new Set(["fiche", "rmm", "supervision"]);
const SUPERVISION_PANES = new Set(["main", "history"]);

function storageKey(equipmentId) {
  return `${KEY_PREFIX}${equipmentId}`;
}

export function normalizeEquipmentDetailTab(tab) {
  if (tab === "events" || tab === "stats" || tab === "metrics") return "activity";
  if (tab === "notes" || tab === "fiche" || tab === "hardware") return "fiche";
  if (tab === "history" || tab === "maintenance") return "supervision";
  if (tab === "dashboard" || tab === "overview" || tab === "general") return "synthese";
  if (tab === "synthese" || tab === "summary") return "synthese";
  return DETAIL_TABS.has(tab) ? tab : "synthese";
}

export function normalizeEquipmentActivityPane(pane, { allowMetrics = true } = {}) {
  if (pane === "maintenance") return "veritas";
  if (pane === "veritas") return "veritas";
  if (pane === "metrics" && allowMetrics) return "metrics";
  return allowMetrics ? "metrics" : "veritas";
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

export function readEquipmentDetailUi(equipmentId) {
  if (!equipmentId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(equipmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeEquipmentDetailUi(equipmentId, patch = {}) {
  if (!equipmentId || !patch || typeof patch !== "object") return;
  try {
    const previous = readEquipmentDetailUi(equipmentId) || {};
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
    sessionStorage.setItem(storageKey(equipmentId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}
