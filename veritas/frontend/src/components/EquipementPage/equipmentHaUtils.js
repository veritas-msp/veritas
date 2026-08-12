const HA_PAIR_PALETTE = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#4f46e5", "#059669"];
function readHaLayer(equipment) {
  const raw = equipment?.rawData?.data && typeof equipment.rawData.data === "object" ? equipment.rawData.data : null;
  const flat = equipment?.rawData && typeof equipment.rawData === "object" ? equipment.rawData : null;
  return {
    modeHA: equipment?.modeHA ?? raw?.modeHA ?? flat?.modeHA,
    roleHA: equipment?.roleHA ?? raw?.roleHA ?? flat?.roleHA ?? "",
    firewallHAName: equipment?.firewallHAName ?? raw?.firewallHAName ?? flat?.firewallHAName ?? "",
    serverHAName: equipment?.serverHAName ?? raw?.serverHAName ?? flat?.serverHAName ?? "",
    storageHAName: equipment?.storageHAName ?? raw?.storageHAName ?? flat?.storageHAName ?? ""
  };
}
function isTruthyHa(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}
function normalizeRole(role) {
  const token = String(role || "").trim().toLowerCase();
  if (token === "primary" || token === "primaire" || token === "principal") return "Primary";
  if (token === "secondary" || token === "secondaire" || token === "backup") return "Secondary";
  return "";
}
export function getEquipmentDisplayName(equipment) {
  return String(equipment?.name || equipment?.nom || equipment?.rawData?.nom || equipment?.rawData?.name || "").trim();
}
export function getEquipmentHaPartnerName(equipment) {
  const layer = readHaLayer(equipment);
  return String(layer.storageHAName || layer.serverHAName || layer.firewallHAName || "").trim();
}
export function getEquipmentHaState(equipment) {
  const layer = readHaLayer(equipment);
  const partnerName = getEquipmentHaPartnerName(equipment);
  const modeOn = isTruthyHa(layer.modeHA);
  const role = normalizeRole(layer.roleHA) || (modeOn || partnerName ? "Primary" : "");
  const active = Boolean(modeOn || partnerName);
  return {
    active,
    role,
    isPrimary: role === "Primary",
    isSecondary: role === "Secondary",
    partnerName
  };
}
/** @deprecated use getEquipmentHaState */
export function getFirewallHaState(equipment) {
  return getEquipmentHaState(equipment);
}
export function getEquipmentHaPairKey(equipment) {
  const state = getEquipmentHaState(equipment);
  if (!state.active) return "";
  const selfName = getEquipmentDisplayName(equipment);
  const names = [selfName, state.partnerName].filter(Boolean).map(n => n.toLowerCase()).sort();
  return names.join("::");
}
export function getFirewallHaPairKey(equipment) {
  return getEquipmentHaPairKey(equipment);
}
export function getEquipmentHaPairColor(equipment) {
  const key = getEquipmentHaPairKey(equipment);
  if (!key) return null;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return HA_PAIR_PALETTE[Math.abs(hash) % HA_PAIR_PALETTE.length];
}
export function getFirewallHaPairColor(equipment) {
  return getEquipmentHaPairColor(equipment);
}
export function getEquipmentHaSortValue(equipment) {
  const state = getEquipmentHaState(equipment);
  if (!state.active) return "zz-none";
  const pair = getEquipmentHaPairKey(equipment) || "zz";
  const rank = state.isSecondary ? "1" : "0";
  return `${pair}|${rank}|${getEquipmentDisplayName(equipment).toLowerCase()}`;
}
export function getFirewallHaSortValue(equipment) {
  return getEquipmentHaSortValue(equipment);
}
export function compareEquipmentHaPairs(a, b) {
  return getEquipmentHaSortValue(a).localeCompare(getEquipmentHaSortValue(b), "fr");
}
export function compareFirewallHaPairs(a, b) {
  return compareEquipmentHaPairs(a, b);
}
