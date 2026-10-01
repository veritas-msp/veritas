const KEY_PREFIX = "veritas_enterprise_peripherals_ui_v1_";
const OVERVIEW_TABS = new Set(["map", "activity", "vault"]);

function storageKey(clientId) {
  return `${KEY_PREFIX}${clientId}`;
}

export function normalizeEnterpriseOverviewTab(tab) {
  return OVERVIEW_TABS.has(tab) ? tab : "map";
}

export function readEnterprisePeripheralsUi(clientId) {
  if (!clientId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeEnterprisePeripheralsUi(clientId, patch = {}) {
  if (!clientId || !patch || typeof patch !== "object") return;
  try {
    const previous = readEnterprisePeripheralsUi(clientId) || {};
    const next = {
      ...previous,
      ...patch,
      updatedAt: Date.now()
    };
    if (Object.prototype.hasOwnProperty.call(patch, "overviewTab")) {
      next.overviewTab = normalizeEnterpriseOverviewTab(patch.overviewTab);
    }
    sessionStorage.setItem(storageKey(clientId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}
