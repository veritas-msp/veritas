export const RMM_DURATION_UNITS = [{
  key: "min",
  label: "min",
  optionLabel: "Minutes",
  factor: 1
}, {
  key: "hour",
  label: "h",
  optionLabel: "Heures",
  factor: 60
}, {
  key: "day",
  label: "j",
  optionLabel: "Jours",
  factor: 1440
}];
export const RMM_HEARTBEAT_MIN_MINUTES = 1;
export const RMM_HEARTBEAT_MAX_MINUTES = 10080;
export const RMM_OFFLINE_MIN_MINUTES = 1;
export const RMM_OFFLINE_MAX_MINUTES = 43200;
export function getDurationUnitFactor(unit) {
  return RMM_DURATION_UNITS.find(entry => entry.key === unit)?.factor ?? 1;
}
export function pickBestDurationUnit(totalMinutes) {
  const n = Number(totalMinutes);
  if (!Number.isFinite(n) || n <= 0) return "min";
  if (n >= 1440 && n % 1440 === 0) return "day";
  if (n >= 60 && n % 60 === 0) return "hour";
  return "min";
}
export function clampRmmDurationMinutes(value, min, max) {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return min;
  return Math.min(max, Math.max(min, rounded));
}
export function durationPartsToMinutes(value, unit, min, max) {
  const factor = getDurationUnitFactor(unit);
  return clampRmmDurationMinutes(Number(value) * factor, min, max);
}
export function minutesToDisplayValue(totalMinutes, unit) {
  const factor = getDurationUnitFactor(unit);
  return Math.max(1, Math.round(Number(totalMinutes) / factor));
}
export function formatDurationMinutes(totalMinutes, unitsCopy = null) {
  if (totalMinutes == null || totalMinutes === "" || totalMinutes === "-") return "-";
  const unit = pickBestDurationUnit(totalMinutes);
  const value = minutesToDisplayValue(totalMinutes, unit);
  const entry = RMM_DURATION_UNITS.find(item => item.key === unit);
  const label = unitsCopy?.[unit] ?? entry?.label ?? unit;
  return `${value} ${label}`;
}
