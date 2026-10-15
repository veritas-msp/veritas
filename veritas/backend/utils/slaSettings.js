export const SLA_SETTINGS_SECTION = "sla";
export const SLA_SETTINGS_KEY = "sla_settings_json";
export const SLA_TIME_MODES = ["calendar", "business_hours", "business_days"];
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
export const DEFAULT_WEEKLY_WORKED_HOURS = 39;
export const MIN_WEEKLY_WORKED_HOURS = 1;
export const MAX_WEEKLY_WORKED_HOURS = 80;

export function normalizeWeeklyWorkedHours(value, fallback = DEFAULT_WEEKLY_WORKED_HOURS) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_WEEKLY_WORKED_HOURS, Math.max(MIN_WEEKLY_WORKED_HOURS, Math.round(n * 100) / 100));
}

export function countOpenScheduleDays(weekSchedule = []) {
  return (Array.isArray(weekSchedule) ? weekSchedule : []).filter(row => row?.enabled).length;
}

export function distributeWeeklyHours(weeklyWorkedHours, openDayCount) {
  const days = Math.max(0, Math.floor(Number(openDayCount) || 0));
  const weekly = normalizeWeeklyWorkedHours(weeklyWorkedHours);
  if (days <= 0) {
    return { hoursPerFullDay: 8, dayHours: [] };
  }
  const fullDay = Math.max(1, Math.ceil(weekly / days));
  const dayHours = Array.from({ length: days }, () => fullDay);
  let total = fullDay * days;
  let i = days - 1;
  while (total > weekly && i >= 0) {
    const step = Math.min(1, total - weekly);
    dayHours[i] = Math.max(0, Math.round((dayHours[i] - step) * 100) / 100);
    total = Math.round((total - step) * 100) / 100;
    i -= 1;
  }
  return { hoursPerFullDay: fullDay, dayHours };
}

export function getStandardWorkdayHours(settings) {
  const openDays = countOpenScheduleDays(settings?.weekSchedule);
  const weekly = normalizeWeeklyWorkedHours(settings?.weeklyWorkedHours, DEFAULT_WEEKLY_WORKED_HOURS);
  if (openDays <= 0) return 8;
  return distributeWeeklyHours(weekly, openDays).hoursPerFullDay;
}

export const DEFAULT_SLA_SETTINGS = {
  timeMode: "calendar",
  timezone: "Europe/Paris",
  weeklyWorkedHours: DEFAULT_WEEKLY_WORKED_HOURS,
  weekSchedule: createDefaultWeekSchedule()
};
function parseJsonObject(value, fallback = {}) {
  if (!value) return {
    ...fallback
  };
  if (typeof value === "object") return {
    ...fallback,
    ...value
  };
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? {
      ...fallback,
      ...parsed
    } : {
      ...fallback
    };
  } catch {
    return {
      ...fallback
    };
  }
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
  const source = parseJsonObject(input, {});
  const defaults = createDefaultWeekSchedule();
  const byDay = new Map(defaults.map(row => [row.day, {
    ...row
  }]));
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
  const timezone = typeof source.timezone === "string" && source.timezone.trim() ? source.timezone.trim() : DEFAULT_SLA_SETTINGS.timezone;
  return {
    timeMode,
    timezone,
    weeklyWorkedHours: normalizeWeeklyWorkedHours(source.weeklyWorkedHours, DEFAULT_SLA_SETTINGS.weeklyWorkedHours),
    weekSchedule: WEEKDAY_ORDER.map(day => byDay.get(day) || defaults.find(r => r.day === day))
  };
}
export function parseHHMM(str) {
  const [h, m] = String(str || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
export function formatWeekScheduleSummary(settings) {
  const normalized = normalizeSlaSettings(settings);
  const openDays = normalized.weekSchedule.filter(row => row.enabled);
  if (!openDays.length) return "No business days";
  const first = openDays[0];
  const sameHours = openDays.every(row => row.open === first.open && row.close === first.close);
  const days = openDays.map(row => WEEKDAY_LABELS[row.day]).join(", ");
  if (sameHours) return `${days} · ${first.open}–${first.close}`;
  return days;
}
