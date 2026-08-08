export const REMOTE_ACCESS_LABEL = "Remote connection";
export const REMOTE_ACCESS_NOT_CONFIGURED = "Connection remote non configurede";
export const EQUIPMENT_REMOTE_ACTION_ICON = "mdi:remote-desktop";
const REMOTE_ACCESS_TYPES = new Set(["Firewalls", "Routeur"]);
function getRawLayer(equipment) {
  return equipment?.rawData?.data || equipment?.rawData || {};
}
export function isSwitchManageable(equipment) {
  if (equipment?.type !== "Switch") return false;
  const data = getRawLayer(equipment);
  return Boolean(equipment.manageable ?? data.manageable);
}
export function isAlimentationManageable(equipment) {
  if (equipment?.type !== "Alimentation") return false;
  const data = getRawLayer(equipment);
  return Boolean(equipment.manageable ?? data.manageable);
}
export function isToipManageable(equipment) {
  if (equipment?.type !== "TOIP") return false;
  const data = getRawLayer(equipment);
  return Boolean(equipment.manageable ?? data.manageable);
}
export function supportsRemoteAccess(equipment) {
  if (REMOTE_ACCESS_TYPES.has(equipment?.type)) return true;
  if (isSwitchManageable(equipment)) return true;
  if (isAlimentationManageable(equipment)) return true;
  return isToipManageable(equipment);
}
export function getRemoteAccessUrl(equipment) {
  if (!equipment) return "";
  const data = getRawLayer(equipment);
  if (equipment.type === "Firewalls") {
    return String(equipment.stormshieldWanUrl || data.stormshieldWanUrl || data.adminUrl || data.urlAdministration || "").trim();
  }
  if (equipment.type === "Routeur") {
    return String(equipment.adminUrl || data.adminUrl || data.urlAdministration || data.stormshieldWanUrl || "").trim();
  }
  if (equipment.type === "Switch") {
    return String(equipment.adminUrl || data.adminUrl || data.urlAdministration || "").trim();
  }
  if (equipment.type === "Alimentation") {
    return String(equipment.adminUrl || data.adminUrl || data.urlAdministration || "").trim();
  }
  if (equipment.type === "TOIP") {
    return String(equipment.adminUrl || data.adminUrl || data.urlAdministration || "").trim();
  }
  return "";
}
export function getRemoteAccessMenuLabel(equipment, configured) {
  return configured ? REMOTE_ACCESS_LABEL : REMOTE_ACCESS_NOT_CONFIGURED;
}
export function getRemoteAccessMenuIcon(equipment) {
  if (equipment?.type === "Switch" || equipment?.type === "Alimentation" || equipment?.type === "TOIP") {
    return "mdi:lan-connect";
  }
  return "mdi:remote-desktop";
}
export function hasRemoteAccessConfigured(equipment) {
  return Boolean(getRemoteAccessUrl(equipment));
}
export function buildRemoteAccessUrl(rawValue) {
  const normalized = String(rawValue || "").trim();
  if (!normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}
export function openRemoteAccess(equipment) {
  const url = buildRemoteAccessUrl(getRemoteAccessUrl(equipment));
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
