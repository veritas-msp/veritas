import { normalizeSlaSettings, parseHHMM } from "./slaSettingsUtils";

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export function getZonedDateParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  });
  const parts = {};
  for (const piece of dtf.formatToParts(date)) {
    if (piece.type !== "literal") parts[piece.type] = piece.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dayOfWeek: WEEKDAY_MAP[parts.weekday]
  };
}

function addCalendarDays(year, month, day, delta) {
  const anchor = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: anchor.getUTCFullYear(),
    month: anchor.getUTCMonth() + 1,
    day: anchor.getUTCDate()
  };
}

export function buildDateInTimeZone(year, month, day, hour, minute, timeZone) {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const parts = getZonedDateParts(utc, timeZone);
    const diffMinutes =
      (year - parts.year) * 525600 +
      (month - parts.month) * 43200 +
      (day - parts.day) * 1440 +
      (hour - parts.hour) * 60 +
      (minute - parts.minute);
    if (diffMinutes === 0) break;
    utc = new Date(utc.getTime() + diffMinutes * 60 * 1000);
  }
  return utc;
}

function getScheduleRow(settings, dayOfWeek) {
  return settings.weekSchedule.find(row => row.day === dayOfWeek);
}

function setZonedMinutesFromMidnight(anchorDate, timeZone, minutesFromMidnight) {
  const parts = getZonedDateParts(anchorDate, timeZone);
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  return buildDateInTimeZone(parts.year, parts.month, parts.day, hour, minute, timeZone);
}

function findNextEnabledDayStart(parts, settings) {
  for (let offset = 1; offset <= 14; offset += 1) {
    const next = addCalendarDays(parts.year, parts.month, parts.day, offset);
    const row = getScheduleRow(
      settings,
      getZonedDateParts(
        buildDateInTimeZone(next.year, next.month, next.day, 12, 0, settings.timezone),
        settings.timezone
      ).dayOfWeek
    );
    if (row?.enabled) {
      const open = parseHHMM(row.open);
      return buildDateInTimeZone(
        next.year,
        next.month,
        next.day,
        Math.floor(open / 60),
        open % 60,
        settings.timezone
      );
    }
  }
  return buildDateInTimeZone(parts.year, parts.month, parts.day + 1, 9, 0, settings.timezone);
}

/**
 * Business minutes between two instants (positive if to > from).
 */
export function businessMinutesBetween(fromDate, toDate, settingsInput) {
  const settings = normalizeSlaSettings(settingsInput);
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  if (to.getTime() === from.getTime()) return 0;
  if (to < from) {
    return -businessMinutesBetween(to, from, settings);
  }
  let current = new Date(from);
  let total = 0;
  let guard = 0;
  while (current < to && guard < 200000) {
    guard += 1;
    const parts = getZonedDateParts(current, settings.timezone);
    const row = getScheduleRow(settings, parts.dayOfWeek);
    if (!row?.enabled) {
      current = findNextEnabledDayStart(parts, settings);
      if (current >= to) break;
      continue;
    }
    const open = parseHHMM(row.open);
    const close = parseHHMM(row.close);
    let minutes = parts.hour * 60 + parts.minute;
    if (minutes < open) {
      current = setZonedMinutesFromMidnight(current, settings.timezone, open);
      if (current >= to) break;
      continue;
    }
    if (minutes >= close) {
      current = findNextEnabledDayStart(parts, settings);
      if (current >= to) break;
      continue;
    }
    const endParts = getZonedDateParts(to, settings.timezone);
    const sameDay =
      endParts.year === parts.year &&
      endParts.month === parts.month &&
      endParts.day === parts.day;
    const endMinute = sameDay
      ? Math.min(close, endParts.hour * 60 + endParts.minute)
      : close;
    const available = Math.max(0, endMinute - minutes);
    total += available;
    if (sameDay) break;
    current = findNextEnabledDayStart(parts, settings);
  }
  return total;
}

export function isBusinessSlaTimeMode(timeMode) {
  return timeMode === "business_hours" || timeMode === "business_days";
}

/**
 * Remaining ms until dueAt, using business minutes when timeMode is not calendar.
 */
export function computeSlaRemainingMs(nowMs, dueAtMs, settingsInput) {
  if (dueAtMs == null || Number.isNaN(dueAtMs)) return null;
  const settings = normalizeSlaSettings(settingsInput || {});
  const mode = settings.timeMode || "calendar";
  if (!isBusinessSlaTimeMode(mode)) {
    return dueAtMs - nowMs;
  }
  return businessMinutesBetween(nowMs, dueAtMs, settings) * 60 * 1000;
}
