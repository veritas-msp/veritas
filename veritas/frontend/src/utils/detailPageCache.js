/**
 * In-memory stale-while-revalidate cache for CRM detail pages
 * (entreprise / contact / prestataire). Survives unmount when
 * MainApp swaps the active page.
 */

const MAX_ENTRIES_PER_NAMESPACE = 40;
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, Map<string, { data: unknown, updatedAt: number }>>} */
const namespaces = new Map();

function normalizeId(id) {
  if (id == null || id === "") return null;
  return String(id);
}

function getBucket(namespace) {
  const key = String(namespace || "").trim();
  if (!key) return null;
  let bucket = namespaces.get(key);
  if (!bucket) {
    bucket = new Map();
    namespaces.set(key, bucket);
  }
  return bucket;
}

function touchEntry(bucket, id, entry) {
  // Refresh LRU order: delete + set moves to the end in Map iteration order.
  bucket.delete(id);
  bucket.set(id, entry);
  while (bucket.size > MAX_ENTRIES_PER_NAMESPACE) {
    const oldest = bucket.keys().next().value;
    if (oldest == null) break;
    bucket.delete(oldest);
  }
}

export function getDetailCache(namespace, id, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const bucket = getBucket(namespace);
  const key = normalizeId(id);
  if (!bucket || !key) return null;
  const entry = bucket.get(key);
  if (!entry) return null;
  if (ttlMs > 0 && Date.now() - entry.updatedAt > ttlMs) {
    bucket.delete(key);
    return null;
  }
  touchEntry(bucket, key, entry);
  return entry.data;
}

export function setDetailCache(namespace, id, data) {
  const bucket = getBucket(namespace);
  const key = normalizeId(id);
  if (!bucket || !key || data == null) return;
  touchEntry(bucket, key, {
    data,
    updatedAt: Date.now()
  });
}

export function invalidateDetailCache(namespace, id) {
  const bucket = getBucket(namespace);
  const key = normalizeId(id);
  if (!bucket || !key) return;
  bucket.delete(key);
}

export function patchDetailCache(namespace, id, patcher) {
  const current = getDetailCache(namespace, id, { ttlMs: 0 });
  if (current == null || typeof patcher !== "function") return;
  const next = patcher(current);
  if (next != null) setDetailCache(namespace, id, next);
}

export const DETAIL_CACHE_NS = {
  enterprise: "enterprise",
  contact: "contact",
  prestataire: "prestataire"
};
