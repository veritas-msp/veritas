const KEY_PREFIX = "veritas_enterprise_peripherals_ui_v1_";

function storageKey(clientId) {
  return `${KEY_PREFIX}${clientId}`;
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
    sessionStorage.setItem(
      storageKey(clientId),
      JSON.stringify({
        ...previous,
        ...patch,
        updatedAt: Date.now()
      })
    );
  } catch {
    // ignore quota / private mode
  }
}
