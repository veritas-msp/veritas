/**
 * In-memory stale-while-revalidate cache for CRM list pages
 * (entreprises / contacts / prestataires). Survives unmount when
 * MainApp swaps the active page — avoids skeleton flash on revisit.
 */

const DEFAULT_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, { data: unknown, updatedAt: number }>} */
const entries = new Map();

function normalizeKey(key) {
  const k = String(key || "").trim();
  return k || null;
}

export function getListCache(key, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const ns = normalizeKey(key);
  if (!ns) return null;
  const entry = entries.get(ns);
  if (!entry) return null;
  if (ttlMs > 0 && Date.now() - entry.updatedAt > ttlMs) {
    entries.delete(ns);
    return null;
  }
  return entry.data;
}

export function setListCache(key, data) {
  const ns = normalizeKey(key);
  if (!ns || data == null) return;
  entries.set(ns, {
    data,
    updatedAt: Date.now()
  });
}

export function invalidateListCache(key) {
  const ns = normalizeKey(key);
  if (!ns) return;
  entries.delete(ns);
}

export function patchListCache(key, patcher) {
  const current = getListCache(key, { ttlMs: 0 });
  if (current == null || typeof patcher !== "function") return;
  const next = patcher(current);
  if (next != null) setListCache(key, next);
}

export const LIST_CACHE_NS = {
  enterprises: "enterprises",
  contacts: "contacts",
  prestataires: "prestataires"
};
