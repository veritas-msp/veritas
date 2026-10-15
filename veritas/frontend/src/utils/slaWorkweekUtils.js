/**
 * Weekly worked hours → per-day distribution and standard day length.
 * Example: 39h / 5 open days → [8, 8, 8, 8, 7] (full day = 8h).
 */

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

/**
 * @returns {{ hoursPerFullDay: number, dayHours: number[] }}
 */
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
  const weekly = normalizeWeeklyWorkedHours(
    settings?.weeklyWorkedHours,
    DEFAULT_WEEKLY_WORKED_HOURS
  );
  if (openDays <= 0) return 8;
  return distributeWeeklyHours(weekly, openDays).hoursPerFullDay;
}

/**
 * Build a short FR-friendly summary of the distribution aligned to open days order.
 * @param {Array<{ day: number, enabled?: boolean }>} weekSchedule
 * @param {number} weeklyWorkedHours
 * @param {(day: number) => string} weekdayLabelFn
 */
export function formatWeeklyHoursDistribution(weekSchedule, weeklyWorkedHours, weekdayLabelFn) {
  const openRows = (Array.isArray(weekSchedule) ? weekSchedule : []).filter(row => row?.enabled);
  const { dayHours } = distributeWeeklyHours(weeklyWorkedHours, openRows.length);
  if (!dayHours.length) return "";

  const groups = [];
  let i = 0;
  while (i < dayHours.length) {
    const hours = dayHours[i];
    let j = i + 1;
    while (j < dayHours.length && dayHours[j] === hours) j += 1;
    const labels = openRows.slice(i, j).map(row => weekdayLabelFn?.(row.day) || String(row.day));
    const dayPart =
      labels.length === 1
        ? labels[0]
        : labels.length === 2
          ? `${labels[0]}–${labels[1]}`
          : `${labels[0]}–${labels[labels.length - 1]}`;
    groups.push({ dayPart, hours });
    i = j;
  }
  return groups.map(g => `${g.dayPart} ${g.hours} h`).join(" · ");
}
