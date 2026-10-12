const KEY_PREFIX = "veritas_contact_detail_ui_v1_";
const OVERVIEW_TABS = new Set(["activity", "portal", "share"]);

function storageKey(contactId) {
  return `${KEY_PREFIX}${contactId}`;
}

export function normalizeContactOverviewTab(tab) {
  return OVERVIEW_TABS.has(tab) ? tab : "activity";
}

export function readContactDetailUi(contactId) {
  if (!contactId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(contactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeContactDetailUi(contactId, patch = {}) {
  if (!contactId || !patch || typeof patch !== "object") return;
  try {
    const previous = readContactDetailUi(contactId) || {};
    const next = {
      ...previous,
      ...patch,
      updatedAt: Date.now()
    };
    if (Object.prototype.hasOwnProperty.call(patch, "overviewTab")) {
      next.overviewTab = normalizeContactOverviewTab(patch.overviewTab);
    }
    sessionStorage.setItem(storageKey(contactId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}
