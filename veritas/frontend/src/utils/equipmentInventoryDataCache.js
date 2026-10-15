/** Cache sessionStorage pour la liste inventaire matériel (TTL + invalidation). */

export const EQUIPMENT_INVENTORY_CACHE_KEY = "equipment_inventory_data_cache_v2";
export const EQUIPMENT_INVENTORY_CACHE_TTL_MS = 5 * 60 * 1000;

export function readEquipmentInventoryCache() {
  try {
    const raw = sessionStorage.getItem(EQUIPMENT_INVENTORY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const isFresh =
      parsed?.savedAt &&
      Array.isArray(parsed?.data) &&
      Date.now() - parsed.savedAt < EQUIPMENT_INVENTORY_CACHE_TTL_MS;
    return isFresh ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeEquipmentInventoryCache(data) {
  if (!Array.isArray(data)) return;
  try {
    sessionStorage.setItem(
      EQUIPMENT_INVENTORY_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        data
      })
    );
  } catch {
    // quota / private mode
  }
}

export function invalidateEquipmentInventoryCache() {
  try {
    sessionStorage.removeItem(EQUIPMENT_INVENTORY_CACHE_KEY);
  } catch {
    // ignore
  }
}
