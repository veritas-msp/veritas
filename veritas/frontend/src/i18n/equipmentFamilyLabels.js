import { pickLocaleMessages } from "./translate";
export const SYSTEM_EQUIPMENT_FAMILY_KEYS = new Set(["Ordinateurs", "Internet", "Switch", "Firewalls", "Routeur", "Serveurs", "BorneWifi", "Stockage", "Sauvegarde", "Alimentation", "TOIP", "Videosurveillance"]);
const EQUIPMENT_TYPE_ALIASES = {
  Servers: "Serveurs",
  Server: "Serveurs",
  Serveur: "Serveurs",
  Storage: "Stockage",
  NAS: "Stockage",
  Stockage: "Stockage",
  Backup: "Sauvegarde",
  Sauvegarde: "Sauvegarde",
  Firewall: "Firewalls",
  Wifi: "BorneWifi",
  WiFi: "BorneWifi",
  "Security camera": "Videosurveillance",
  Videosurveillance: "Videosurveillance"
};
const FAMILY_LABELS = {
  fr: {
    Ordinateurs: "Ordinateurs",
    Internet: "Internet",
    Switch: "Switch",
    Firewalls: "Firewall",
    Routeur: "Routeur / SD-WAN",
    Serveurs: "Serveurs",
    BorneWifi: "Borne Wi‑Fi",
    Stockage: "Stockage",
    Sauvegarde: "Sauvegarde",
    Alimentation: "Alimentation",
    TOIP: "TOIP / VoIP",
    Videosurveillance: "Vidéosurveillance"
  },
  en: {
    Ordinateurs: "Workstations",
    Internet: "Internet",
    Switch: "Switches",
    Firewalls: "Firewall",
    Routeur: "Router / SD-WAN",
    Serveurs: "Servers",
    BorneWifi: "Wi‑Fi access points",
    Stockage: "Storage",
    Sauvegarde: "Backup",
    Alimentation: "Power",
    TOIP: "VoIP / TOIP",
    Videosurveillance: "Video surveillance"
  },
  de: {
    Ordinateurs: "Arbeitsplätze",
    Internet: "Internet",
    Switch: "Switches",
    Firewalls: "Firewall",
    Routeur: "Router / SD-WAN",
    Serveurs: "Server",
    BorneWifi: "WLAN‑Access‑Points",
    Stockage: "Speicher",
    Sauvegarde: "Backup",
    Alimentation: "Stromversorgung",
    TOIP: "VoIP / TOIP",
    Videosurveillance: "Videoüberwachung"
  },
  it: {
    Ordinateurs: "Postazioni",
    Internet: "Internet",
    Switch: "Switch",
    Firewalls: "Firewall",
    Routeur: "Router / SD-WAN",
    Serveurs: "Server",
    BorneWifi: "Access point Wi‑Fi",
    Stockage: "Storage",
    Sauvegarde: "Backup",
    Alimentation: "Alimentazione",
    TOIP: "VoIP / TOIP",
    Videosurveillance: "Videosorveglianza"
  },
  es: {
    Ordinateurs: "Equipos",
    Internet: "Internet",
    Switch: "Switches",
    Firewalls: "Firewall",
    Routeur: "Router / SD-WAN",
    Serveurs: "Servidores",
    BorneWifi: "Puntos de acceso Wi‑Fi",
    Stockage: "Almacenamiento",
    Sauvegarde: "Copias de seguridad",
    Alimentation: "Alimentación",
    TOIP: "VoIP / TOIP",
    Videosurveillance: "Videovigilancia"
  }
};
function resolveFamilyKey(familyOrKey) {
  if (typeof familyOrKey === "string") return familyOrKey.trim();
  return familyOrKey?.key || familyOrKey?.familyKey || "";
}
export function canonicalEquipmentTypeKey(type) {
  const raw = resolveFamilyKey(type);
  if (!raw) return raw;
  if (EQUIPMENT_TYPE_ALIASES[raw]) return EQUIPMENT_TYPE_ALIASES[raw];
  if (SYSTEM_EQUIPMENT_FAMILY_KEYS.has(raw)) return raw;
  for (const key of SYSTEM_EQUIPMENT_FAMILY_KEYS) {
    if (key.toLowerCase() === raw.toLowerCase()) return key;
  }
  const aliasHit = Object.entries(EQUIPMENT_TYPE_ALIASES).find(([alias]) => alias.toLowerCase() === raw.toLowerCase());
  if (aliasHit) return aliasHit[1];
  return raw;
}
/** Resolve a UI family key (EN or FR) against backend `equipmentCounts` keys. */
export function getEquipmentCountValue(equipmentCounts, typeKey) {
  const counts = equipmentCounts && typeof equipmentCounts === "object" ? equipmentCounts : {};
  const canonical = canonicalEquipmentTypeKey(typeKey);
  const candidates = [canonical, typeKey];
  if (canonical === "Serveurs") candidates.push("Servers", "Server");
  if (canonical === "Stockage") candidates.push("Storage", "NAS");
  if (canonical === "Sauvegarde") candidates.push("Backup");
  for (const key of candidates) {
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) {
      return Number(counts[key]) || 0;
    }
  }
  return 0;
}
export function getEquipmentFamilyLabel(familyKey, locale, fallback) {
  const key = canonicalEquipmentTypeKey(resolveFamilyKey(familyKey));
  if (!key || !SYSTEM_EQUIPMENT_FAMILY_KEYS.has(key)) {
    return fallback ?? (resolveFamilyKey(familyKey) || key);
  }
  const labels = pickLocaleMessages(FAMILY_LABELS, locale);
  return labels[key] || FAMILY_LABELS.fr[key] || fallback || key;
}
export function getLocalizedEquipmentTypeLabel(type, locale, fallback) {
  const key = canonicalEquipmentTypeKey(type);
  if (key === "NAS") {
    return getEquipmentFamilyLabel("Stockage", locale, fallback);
  }
  return getEquipmentFamilyLabel(key, locale, fallback ?? type);
}
export function localizeEquipmentFamily(family, locale) {
  if (!family) return family;
  const key = resolveFamilyKey(family);
  return {
    ...family,
    label: getEquipmentFamilyLabel(key, locale, family.label)
  };
}
export function localizeEquipmentFamilies(families, locale) {
  return (Array.isArray(families) ? families : []).map(family => localizeEquipmentFamily(family, locale));
}
export function splitFamilyLabelLines(label) {
  const text = String(label || "").trim();
  if (!text) return ["", ""];
  if (text.includes(" / ")) {
    const slashIndex = text.indexOf(" / ");
    return [text.slice(0, slashIndex), text.slice(slashIndex + 3)];
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }
  return [text, ""];
}
export function localizeEquipmentCountColumns(columns, locale) {
  return (Array.isArray(columns) ? columns : []).map(column => ({
    ...column,
    label: getEquipmentFamilyLabel(column.key, locale, column.label)
  }));
}
