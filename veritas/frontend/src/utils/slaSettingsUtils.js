export const SLA_TIME_MODES = ["calendar", "business_hours", "business_days"];
export const SLA_TIME_MODE_LABELS = {
  calendar: "Calendar hours (24/7)",
  business_hours: "Business hours",
  business_days: "Business days"
};
export const SLA_TIME_MODE_HINTS = {
  calendar: "Enterprise deadlines (in hours) accumulate continuously, including nights and weekends.",
  business_hours: "Deadlines only count during the business hours below. Outside those hours, the timer is paused.",
  business_days: "Each deadline unit corresponds to a full business day (until that day's closing time)."
};
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_LABELS = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday"
};
export function createDefaultWeekSchedule() {
  return WEEKDAY_ORDER.map(day => ({
    day,
    enabled: day >= 1 && day <= 5,
    open: "09:00",
    close: "18:00"
  }));
}
export const DEFAULT_SLA_SETTINGS = {
  timeMode: "calendar",
  timezone: "Europe/Paris",
  weekSchedule: createDefaultWeekSchedule()
};
export function formatWeekScheduleSummary(settings) {
  const openDays = (settings?.weekSchedule || []).filter(row => row.enabled);
  if (!openDays.length) return "No business day configured";
  const first = openDays[0];
  const sameHours = openDays.every(row => row.open === first.open && row.close === first.close);
  const days = openDays.map(row => WEEKDAY_LABELS[row.day]).join(", ");
  if (sameHours) return `${days} · ${first.open}–${first.close}`;
  return days;
}
export function getSlaUnitLabel(timeMode) {
  if (timeMode === "business_days") return "business days";
  if (timeMode === "business_hours") return "business hours";
  return "hours";
}
