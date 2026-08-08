import { UNIFI_UDM_API_MODELS } from "./constants/equipmentCatalog";
function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
function getManufacturer(equipment) {
  return normalizeText(equipment?.manufacturer || equipment?.fabricant || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.data?.fabricant || equipment?.rawData?.data?.marque);
}
function getModel(equipment) {
  return normalizeText(equipment?.model || equipment?.modele || equipment?.rawData?.modele || equipment?.rawData?.data?.modele);
}
function getEquipmentType(equipment) {
  return normalizeText(equipment?.type);
}
export function isUnifiBrand(manufacturer) {
  const m = normalizeText(manufacturer);
  return m.includes("unifi") || m.includes("ubiquiti") || m === "ubnt";
}
export function isUdmProModel(model) {
  const normalized = normalizeText(model);
  if (!normalized) return false;
  return UNIFI_UDM_API_MODELS.some(allowed => normalizeText(allowed) === normalized);
}
export function isUnifiUdmGateway(equipment) {
  if (!equipment) return false;
  if (getEquipmentType(equipment) !== "switch") return false;
  return isUnifiBrand(getManufacturer(equipment)) && isUdmProModel(getModel(equipment));
}
export function getUnifiApiConfig(equipment) {
  const data = equipment?.rawData?.data || equipment?.rawData || {};
  return {
    host: equipment?.unifiApiHost || data.unifiApiHost || "",
    apiKey: equipment?.unifiApiKey || data.unifiApiKey || "",
    rejectUnauthorized: equipment?.unifiApiRejectUnauthorized ?? data.unifiApiRejectUnauthorized ?? false,
    configuredAt: equipment?.unifiApiConfiguredAt || data.unifiApiConfiguredAt || null
  };
}
export function hasUnifiApiConfigured(equipment) {
  const {
    host,
    apiKey
  } = getUnifiApiConfig(equipment);
  return Boolean(String(host).trim() && String(apiKey).trim());
}
