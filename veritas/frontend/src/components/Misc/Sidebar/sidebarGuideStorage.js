export const SIDEBAR_GUIDE_VERSION = "v1";
export function getSidebarGuideStorageKey(userId) {
  return `veritas_sidebar_guide_${SIDEBAR_GUIDE_VERSION}_${userId}`;
}
export function readSidebarGuideState(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getSidebarGuideStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function writeSidebarGuideState(userId, patch) {
  if (!userId) return;
  const prev = readSidebarGuideState(userId) || {};
  localStorage.setItem(getSidebarGuideStorageKey(userId), JSON.stringify({
    ...prev,
    ...patch
  }));
}
