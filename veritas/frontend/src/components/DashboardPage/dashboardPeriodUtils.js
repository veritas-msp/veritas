export const DASHBOARD_PERIOD_PRESETS = ["30d", "90d", "365d", "ytd", "all"];
export const DEFAULT_PERIOD_FILTER = {
  mode: "preset",
  preset: "365d",
  startAt: null,
  endAt: null
};
export function toDatetimeLocalInput(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function fromDatetimeLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
export function buildDefaultCustomRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 365 * 86400000);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString()
  };
}
export function getPeriodFilterLabel(filter, copy, formatters) {
  if (filter?.mode === "custom" && filter.startAt && filter.endAt) {
    return copy.periodCustomRange.replace("{start}", formatters.formatDateTime(filter.startAt)).replace("{end}", formatters.formatDateTime(filter.endAt));
  }
  return copy.periods[filter?.preset] || copy.periods["365d"];
}
export function normalizeAppliedFilter({
  preset,
  draftStart,
  draftEnd,
  lastSelection
}) {
  if (lastSelection === "custom") {
    const start = fromDatetimeLocalInput(draftStart);
    const end = fromDatetimeLocalInput(draftEnd);
    if (!start || !end) {
      return {
        error: "missingCustomDates"
      };
    }
    if (new Date(start) > new Date(end)) {
      return {
        error: "invalidRange"
      };
    }
    return {
      filter: {
        mode: "custom",
        preset: null,
        startAt: start,
        endAt: end
      }
    };
  }
  return {
    filter: {
      mode: "preset",
      preset: preset || "365d",
      startAt: null,
      endAt: null
    }
  };
}
