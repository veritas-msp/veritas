export const CAMPAIGNS_PAGE_CACHE_KEY = "campaigns_page_cache_v2";
export const CAMPAIGNS_PAGE_CACHE_TTL_MS = 3 * 60 * 1000;

export function readCampaignsPageCache(ttlMs = CAMPAIGNS_PAGE_CACHE_TTL_MS) {
  try {
    const raw = sessionStorage.getItem(CAMPAIGNS_PAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const isFresh = parsed?.savedAt && Date.now() - parsed.savedAt < ttlMs;
    return isFresh ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeCampaignsPageCache(data) {
  try {
    sessionStorage.setItem(
      CAMPAIGNS_PAGE_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {}
}

export function invalidateCampaignsPageCache() {
  try {
    sessionStorage.removeItem(CAMPAIGNS_PAGE_CACHE_KEY);
  } catch {}
}
