const HA_PAIR_PALETTE = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#4f46e5", "#059669", "#be123c", "#0f766e", "#9333ea", "#c2410c"];
function haPairColorAt(index) {
  if (index < HA_PAIR_PALETTE.length) return HA_PAIR_PALETTE[index];
  const hue = Math.round(index * 137.508) % 360;
  return `hsl(${hue} 62% 40%)`;
}
function readNestedLayer(equipment) {
  const raw = equipment?.rawData?.data && typeof equipment.rawData.data === "object" ? equipment.rawData.data : null;
  const flat = equipment?.rawData && typeof equipment.rawData === "object" ? equipment.rawData : null;
  return {
    raw,
    flat
  };
}
function readHaLayer(equipment) {
  const {
    raw,
    flat
  } = readNestedLayer(equipment);
  return {
    modeHA: equipment?.modeHA ?? raw?.modeHA ?? flat?.modeHA,
    roleHA: equipment?.roleHA ?? raw?.roleHA ?? flat?.roleHA ?? "",
    firewallHAName: equipment?.firewallHAName ?? raw?.firewallHAName ?? flat?.firewallHAName ?? "",
    serverHAName: equipment?.serverHAName ?? raw?.serverHAName ?? flat?.serverHAName ?? "",
    storageHAName: equipment?.storageHAName ?? raw?.storageHAName ?? flat?.storageHAName ?? ""
  };
}
function getEquipmentType(equipment) {
  return String(equipment?.type || equipment?.rawData?.type || "").trim();
}
function readInternetCategory(equipment) {
  const {
    raw,
    flat
  } = readNestedLayer(equipment);
  return equipment?.categorie ?? raw?.categorie ?? flat?.categorie ?? "";
}
function getInternetSiteKey(equipment) {
  return String(equipment?.location || equipment?.site || equipment?.rawData?.location || equipment?.rawData?.site || equipment?.rawData?.data?.location || equipment?.rawData?.data?.site || "").trim().toLowerCase();
}
function isInternetEquipment(equipment) {
  return getEquipmentType(equipment) === "Internet";
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
  if (isInternetEquipment(equipment)) {
    const role = normalizeRole(readInternetCategory(equipment)) || "Primary";
    return {
      active: true,
      role,
      isPrimary: role !== "Secondary",
      isSecondary: role === "Secondary",
      partnerName: ""
    };
  }
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
  if (isInternetEquipment(equipment)) {
    const clientId = equipment?.clientId ?? equipment?.client_id ?? equipment?.rawData?.client_id ?? "";
    const site = getInternetSiteKey(equipment);
    return `internet::${clientId}::${site || "default"}`;
  }
  const state = getEquipmentHaState(equipment);
  if (!state.active) return "";
  const selfName = getEquipmentDisplayName(equipment);
  const names = [selfName, state.partnerName].filter(Boolean).map(n => n.toLowerCase()).sort();
  const type = getEquipmentType(equipment).toLowerCase() || "ha";
  return `${type}::${names.join("::")}`;
}
export function getFirewallHaPairKey(equipment) {
  return getEquipmentHaPairKey(equipment);
}
export function buildHaPairColorMap(equipments) {
  const keys = [];
  const seen = new Set();
  (Array.isArray(equipments) ? equipments : []).forEach(equipment => {
    const key = getEquipmentHaPairKey(equipment);
    if (!key || seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  });
  keys.sort((a, b) => a.localeCompare(b, "fr"));
  const map = {};
  keys.forEach((key, index) => {
    map[key] = haPairColorAt(index);
  });
  return map;
}
export function getEquipmentHaPairColor(equipment, colorMap) {
  const key = getEquipmentHaPairKey(equipment);
  if (!key) return null;
  if (colorMap && colorMap[key]) return colorMap[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return haPairColorAt(Math.abs(hash) % HA_PAIR_PALETTE.length);
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
