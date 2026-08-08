const SITE_VALUE_KEYS = ["location", "site", "lieu", "emplacement"];
function readSiteFromLayer(layer) {
  if (!layer || typeof layer !== "object") return "";
  for (const key of SITE_VALUE_KEYS) {
    const value = layer[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}
export function normalizeSiteFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}
export function getItemSiteValue(item) {
  if (item == null) return "";
  if (typeof item === "string") {
    return item.trim();
  }
  const layers = [item, item.equipment, item.data, item.fields, item.rawData, item.rawData?.data];
  for (const layer of layers) {
    const value = readSiteFromLayer(layer);
    if (value) return value;
  }
  return "";
}
export function matchesSiteFilter(item, siteFilter) {
  if (!siteFilter) return true;
  const filterValue = normalizeSiteFilterValue(siteFilter);
  if (!filterValue) return true;
  return normalizeSiteFilterValue(getItemSiteValue(item)) === filterValue;
}
export function filterBySite(items, siteFilter) {
  if (!siteFilter) return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : []).filter(item => matchesSiteFilter(item, siteFilter));
}
export function filterCustomFamilyMap(families, siteFilter) {
  if (!siteFilter) return Array.isArray(families) ? families : [];
  return (Array.isArray(families) ? families : []).map(family => {
    const items = filterBySite(family.items || [], siteFilter);
    return {
      ...family,
      items,
      count: items.length
    };
  });
}
function normalizeEquipmentFamilyKey(type) {
  if (type === "NAS") return "Stockage";
  return type;
}
export function countHardwareByFamilyForSite({
  siteFilter,
  equipment = [],
  backupInstances = [],
  customFamilyMap = []
} = {}) {
  const counts = {};
  filterBySite(equipment, siteFilter).forEach(item => {
    const familyKey = normalizeEquipmentFamilyKey(item?.type);
    if (!familyKey) return;
    counts[familyKey] = (counts[familyKey] || 0) + 1;
  });
  const backupCount = filterBySite(backupInstances, siteFilter).length;
  if (backupCount > 0) {
    counts.Sauvegarde = backupCount;
  }
  (Array.isArray(customFamilyMap) ? customFamilyMap : []).forEach(family => {
    const familyKey = family?.familyKey;
    if (!familyKey) return;
    const itemCount = filterBySite(family.items || [], siteFilter).length;
    if (itemCount > 0) {
      counts[familyKey] = itemCount;
    }
  });
  return counts;
}
