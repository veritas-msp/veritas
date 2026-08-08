import { fetchClientModules } from "../../api/clients";
import { mapClientHardwareEquipment } from "../../api/equipment";
import { getEquipmentModuleLabel } from "../EquipementPage/equipmentModalsI18n";
const STORAGE_TYPE_KEYS = new Set(["NAS", "SAN", "Storage"]);
const EQUIPMENT_TYPE_ALIASES = {
  "borne wifi": "BorneWifi",
  "borne wi-fi": "BorneWifi",
  bornewifi: "BorneWifi",
  wifi: "BorneWifi",
  serveur: "Servers",
  serveurs: "Servers",
  server: "Servers",
  servers: "Servers",
  firewall: "Firewalls",
  firewalls: "Firewalls",
  stockage: "Storage",
  storage: "Storage",
  nas: "Storage",
  san: "Storage",
  switch: "Switch",
  switches: "Switch",
  internet: "Internet",
  routeur: "Routeur",
  router: "Routeur",
  "sd-wan": "Routeur",
  alimentation: "Alimentation",
  power: "Alimentation",
  pdu: "Alimentation",
  toip: "TOIP",
  voip: "TOIP",
  ordinateur: "Ordinateurs",
  ordinateurs: "Ordinateurs",
  computer: "Ordinateurs",
  computers: "Ordinateurs",
  sauvegarde: "Backup",
  backup: "Backup"
};
const HARDWARE_FALLBACK_LABELS = {
  fr: "Hardware",
  en: "Hardware",
  de: "Hardware",
  it: "Hardware",
  es: "Hardware"
};
export function resolveEquipmentModuleKey(type) {
  const key = String(type || "").trim();
  if (!key) return "";
  if (STORAGE_TYPE_KEYS.has(key)) return "Storage";
  const alias = EQUIPMENT_TYPE_ALIASES[key.toLowerCase()];
  if (alias) return alias;
  return key;
}
export function getLocalizedEquipmentTypeLabel(type, locale) {
  const moduleKey = resolveEquipmentModuleKey(type);
  if (!moduleKey) return "";
  return getEquipmentModuleLabel(moduleKey, locale) || moduleKey;
}
function getHardwareFallbackLabel(locale) {
  return HARDWARE_FALLBACK_LABELS[locale] || HARDWARE_FALLBACK_LABELS.en;
}
export function getEquipmentPickerLabel(equipment, {
  serialPrefix = "SN: ",
  locale,
  separator = " · "
} = {}) {
  if (!equipment) return "";
  const typeLabel = getLocalizedEquipmentTypeLabel(equipment.type, locale) || String(equipment.type || "").trim();
  const name = String(equipment.name || equipment.model || "").trim();
  const serial = String(equipment.serial || "").trim();
  const base = [typeLabel, name].filter(Boolean).join(separator) || `${getHardwareFallbackLabel(locale)} #${equipment.id || equipment.equipment_id}`;
  return serial ? `${base} (${serialPrefix}${serial})` : base;
}
export function getEquipmentSearchText(equipment, locale) {
  if (!equipment) return "";
  const typeLabel = getLocalizedEquipmentTypeLabel(equipment.type, locale);
  return [equipment.type, typeLabel, equipment.name, equipment.model, equipment.manufacturer, equipment.serial, equipment.id].map(part => String(part || "").trim().toLowerCase()).filter(Boolean).join(" ");
}
export function formatLinkedEquipmentEventLabel(event, {
  locale,
  separator = " · "
} = {}) {
  if (!event) return "";
  const typeLabel = getLocalizedEquipmentTypeLabel(event.type, locale);
  const name = String(event.name || "").trim();
  if (typeLabel && name) return `${typeLabel}${separator}${name}`;
  return name || typeLabel;
}
export async function loadClientEquipments(clientId) {
  if (!clientId) return [];
  const modulesData = await fetchClientModules(clientId);
  return mapClientEquipmentsForTicketLink(clientId, modulesData?.equipements || {});
}
export function mapClientEquipmentsForTicketLink(clientId, equipements = {}) {
  return mapClientHardwareEquipment({
    id: clientId,
    equipements
  }).map(eq => ({
    id: String(eq.id),
    clientId: String(clientId || ""),
    type: eq.type || "",
    name: eq.name || "",
    manufacturer: eq.manufacturer || "",
    model: eq.model || "",
    serial: eq.serial || "",
    warranty: eq.expirationGarantie || "",
    licenses: Array.isArray(eq.licences) ? eq.licences : []
  }));
}
export function serializeEquipmentInfo({
  concerned,
  source,
  equipmentId,
  name,
  type,
  clientId,
  brand,
  model,
  serial
}) {
  if (!concerned) return {
    concerned: false
  };
  if (source === "veritas") {
    return {
      concerned: true,
      source: "veritas",
      equipmentId: String(equipmentId || "").trim(),
      name: String(name || "").trim(),
      type: String(type || "").trim(),
      clientId: clientId ? String(clientId) : ""
    };
  }
  return {
    concerned: true,
    source: "external",
    brand: String(brand || "").trim(),
    model: String(model || "").trim(),
    serial: String(serial || "").trim()
  };
}
export function buildLinkedEquipmentComment(equipment, clientId) {
  const safeName = String(equipment?.name || equipment?.model || "Hardware").replace(/[\\\]]/g, "");
  const safeType = String(equipment?.type || "").replace(/[\\\]]/g, "");
  const safeClientId = String(clientId || "").replace(/[\\\]]/g, "");
  const safeWarranty = String(equipment?.warranty || "").replace(/[\\\]]/g, "");
  const licensesText = Array.isArray(equipment?.licenses) ? equipment.licenses.join(", ") : String(equipment?.licenses || "");
  const safeLicenses = encodeURIComponent(String(licensesText || "").replace(/[\\\]]/g, ""));
  return `[Linked equipment] [event:added] [equipment_id:${equipment.id}] [name:${safeName}] [type:${safeType}] ` + `[client_id:${safeClientId}] [warranty:${safeWarranty}] [licenses:${safeLicenses}]`;
}
