import {
  DEFAULT_WEEKLY_WORKED_HOURS,
  normalizeWeeklyWorkedHours
} from "./slaWorkweekUtils";

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
  weeklyWorkedHours: DEFAULT_WEEKLY_WORKED_HOURS,
  weekSchedule: createDefaultWeekSchedule()
};

function parseHHMM(str) {
  const [h, m] = String(str || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function normalizeTime(value, fallback = "09:00") {
  const raw = String(value || fallback).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeSlaSettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const defaults = createDefaultWeekSchedule();
  const byDay = new Map(defaults.map(row => [row.day, { ...row }]));
  for (const row of Array.isArray(source.weekSchedule) ? source.weekSchedule : []) {
    const day = Number(row?.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const open = normalizeTime(row.open, byDay.get(day)?.open || "09:00");
    const close = normalizeTime(row.close, byDay.get(day)?.close || "18:00");
    byDay.set(day, {
      day,
      enabled: Boolean(row.enabled),
      open,
      close: parseHHMM(close) > parseHHMM(open) ? close : open
    });
  }
  const timeMode = SLA_TIME_MODES.includes(source.timeMode) ? source.timeMode : DEFAULT_SLA_SETTINGS.timeMode;
  const timezone =
    typeof source.timezone === "string" && source.timezone.trim()
      ? source.timezone.trim()
      : DEFAULT_SLA_SETTINGS.timezone;
  return {
    timeMode,
    timezone,
    weeklyWorkedHours: normalizeWeeklyWorkedHours(
      source.weeklyWorkedHours,
      DEFAULT_SLA_SETTINGS.weeklyWorkedHours
    ),
    weekSchedule: WEEKDAY_ORDER.map(day => byDay.get(day) || defaults.find(r => r.day === day))
  };
}

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

export { parseHHMM };
