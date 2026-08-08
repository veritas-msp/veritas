import { buildRemoteAccessUrl, getRemoteAccessUrl, hasRemoteAccessConfigured, openRemoteAccess } from "./equipmentRemoteAccessUtils";
function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
function getManufacturer(equipment) {
  return normalizeText(equipment?.manufacturer || equipment?.fabricant || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.data?.fabricant || equipment?.rawData?.data?.marque);
}
export function isStormshieldBrand(manufacturer) {
  return normalizeText(manufacturer).includes("stormshield");
}
export function isStormshieldFirewall(equipment) {
  if (!equipment || equipment.type !== "Firewalls") return false;
  return isStormshieldBrand(getManufacturer(equipment));
}
export function isFirewallEquipment(equipment) {
  return equipment?.type === "Firewalls";
}
export function getFirewallWanUrl(equipment) {
  return getRemoteAccessUrl(equipment);
}
export function hasFirewallWanConfigured(equipment) {
  return hasRemoteAccessConfigured(equipment);
}
export function getStormshieldWanUrl(equipment) {
  return getFirewallWanUrl(equipment);
}
export function hasStormshieldWanConfigured(equipment) {
  return hasFirewallWanConfigured(equipment);
}
export function normalizeStormshieldWanUrl(value) {
  return String(value || "").trim();
}
export function buildStormshieldWanUrl(rawValue) {
  return buildRemoteAccessUrl(rawValue);
}
export function openStormshieldWanUrl(equipment) {
  openRemoteAccess(equipment);
}
export function openFirewallWanUrl(equipment) {
  openRemoteAccess(equipment);
}
