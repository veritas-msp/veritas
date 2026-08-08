const DEFAULT_MAX_BAYS = 4;
export const ABSOLUTE_MAX_BAYS = 24;
export const MIN_DISK_BAYS = DEFAULT_MAX_BAYS;
export function parseDiskCount(value) {
  const parsed = parseInt(String(value ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
export function sanitizeDiskCapacity(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}
export function normalizeDiskVolumes(disques, activeCount, maxBays) {
  const safeActive = Math.max(0, Math.min(activeCount, maxBays));
  const source = Array.isArray(disques) ? disques : [];
  return Array.from({
    length: safeActive
  }, (_, index) => ({
    capacite: sanitizeDiskCapacity(source[index]?.capacite)
  }));
}
export function buildDiskBayState({
  nbDisquesActuels,
  nbDisquesMax,
  disques,
  capacite
}) {
  const parsedMax = parseDiskCount(nbDisquesMax);
  const parsedActive = parseDiskCount(nbDisquesActuels);
  const maxBays = Math.min(ABSOLUTE_MAX_BAYS, Math.max(DEFAULT_MAX_BAYS, parsedMax, parsedActive));
  const activeCount = Math.min(parsedActive, maxBays);
  const normalizedDisques = normalizeDiskVolumes(disques, activeCount, maxBays);
  const summedCapacity = normalizedDisques.reduce((total, disk) => total + (parseInt(disk.capacite, 10) || 0), 0);
  return {
    maxBays,
    activeCount,
    disques: normalizedDisques,
    capacite: sanitizeDiskCapacity(capacite) || (summedCapacity > 0 ? String(summedCapacity) : ""),
    autoCapacity: summedCapacity > 0 ? String(summedCapacity) : ""
  };
}
export function formatCapacityHint(goValue) {
  const value = parseInt(String(goValue || "").replace(/[^0-9]/g, ""), 10);
  if (!value) return "";
  if (value >= 1024) {
    const tb = value / 1024;
    return tb % 1 === 0 ? `${tb} To` : `${tb.toFixed(1)} To`;
  }
  return `${value} Go`;
}
export function shouldShowStorageDiskBays(formData, {
  showDisques = false
} = {}) {
  if (!showDisques || !formData) return false;
  const state = buildDiskBayState({
    nbDisquesActuels: formData.nbDisquesActuels,
    nbDisquesMax: formData.nbDisquesMax,
    disques: formData.disques,
    capacite: formData.capacite
  });
  const hasCounts = parseDiskCount(formData.nbDisquesActuels) > 0 || parseDiskCount(formData.nbDisquesMax) > 0;
  const hasDiskVolumes = Array.isArray(formData.disques) && formData.disques.some(disk => sanitizeDiskCapacity(disk?.capacite));
  return state.activeCount > 0 || hasCounts || hasDiskVolumes;
}
