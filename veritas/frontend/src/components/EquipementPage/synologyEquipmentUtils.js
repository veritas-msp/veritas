import { logEquipmentQuickConnectAttempt } from "./equipmentActivityLog";
function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
function getManufacturer(equipment) {
  return normalizeText(equipment?.manufacturer || equipment?.fabricant || equipment?.marque || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.data?.fabricant || equipment?.rawData?.data?.marque);
}
export function isSynologyBrand(manufacturer) {
  return normalizeText(manufacturer).includes("synology");
}
function isStorageType(type) {
  const normalized = normalizeText(type);
  return normalized === "nas" || normalized === "stockage";
}
export function isSynologyStorage(equipment) {
  if (!equipment || !isStorageType(equipment.type)) return false;
  return isSynologyBrand(getManufacturer(equipment));
}
export function getQuickConnectValue(equipment) {
  const data = equipment?.rawData?.data || equipment?.rawData || {};
  return String(equipment?.quickConnect || data.quickConnect || "").trim();
}
export function hasQuickConnectConfigured(equipment) {
  return Boolean(getQuickConnectValue(equipment));
}
export function buildQuickConnectUrl(rawValue) {
  const normalized = String(rawValue || "").trim();
  if (!normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}
export function openQuickConnectUrl(equipment) {
  const url = buildQuickConnectUrl(getQuickConnectValue(equipment));
  if (!url) {
    void logEquipmentQuickConnectAttempt(equipment, {
      url: null,
      ok: false,
      reason: "missing"
    });
    return {
      ok: false,
      reason: "missing"
    };
  }
  try {
    window.open(url, "_blank", "noopener,noreferrer");
    void logEquipmentQuickConnectAttempt(equipment, {
      url,
      ok: true,
      reason: "opened"
    });
    return {
      ok: true,
      reason: "opened"
    };
  } catch {
    void logEquipmentQuickConnectAttempt(equipment, {
      url,
      ok: false,
      reason: "failed"
    });
    return {
      ok: false,
      reason: "failed"
    };
  }
}
