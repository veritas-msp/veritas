const FALLBACK_TIMEZONES = ["UTC", "Africa/Abidjan", "Africa/Cairo", "Africa/Casablanca", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi", "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota", "America/Caracas", "America/Chicago", "America/Denver", "America/Halifax", "America/Lima", "America/Los_Angeles", "America/Mexico_City", "America/Montreal", "America/New_York", "America/Phoenix", "America/Sao_Paulo", "America/Toronto", "America/Vancouver", "Asia/Bangkok", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Kolkata", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Asia/Tokyo", "Australia/Melbourne", "Australia/Perth", "Australia/Sydney", "Europe/Amsterdam", "Europe/Athens", "Europe/Berlin", "Europe/Brussels", "Europe/Bucharest", "Europe/Budapest", "Europe/Copenhagen", "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/Lisbon", "Europe/London", "Europe/Madrid", "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague", "Europe/Rome", "Europe/Stockholm", "Europe/Vienna", "Europe/Warsaw", "Europe/Zurich", "Pacific/Auckland", "Pacific/Fiji", "Pacific/Honolulu"];
let cachedOptions = null;
let cachedGroups = null;
function getSupportedTimezones() {
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {}
  }
  return FALLBACK_TIMEZONES;
}
function getTimezoneOffsetMinutes(timeZone, date = new Date()) {
  if (timeZone === "UTC") return 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const values = {};
    for (const {
      type,
      value
    } of parts) {
      if (type !== "literal") values[type] = value;
    }
    const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}
export function formatUtcOffset(minutes) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
function formatTimezonePath(timeZone) {
  if (timeZone === "UTC") return "UTC";
  return timeZone.replace(/_/g, " ");
}
export function formatTimezoneOptionLabel(timeZone, date = new Date()) {
  const offset = formatUtcOffset(getTimezoneOffsetMinutes(timeZone, date));
  const name = formatTimezonePath(timeZone);
  return `(${offset}) ${name}`;
}
function buildTimezoneOptions(date = new Date()) {
  const zones = getSupportedTimezones();
  const options = zones.map(value => {
    const offsetMinutes = getTimezoneOffsetMinutes(value, date);
    const offsetLabel = formatUtcOffset(offsetMinutes);
    return {
      value,
      offsetMinutes,
      offsetLabel,
      label: formatTimezonePath(value),
      fullLabel: formatTimezoneOptionLabel(value, date)
    };
  });
  options.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) return a.offsetMinutes - b.offsetMinutes;
    return a.value.localeCompare(b.value);
  });
  return options;
}
function buildTimezoneGroups(options) {
  const groups = [];
  let current = null;
  for (const option of options) {
    if (!current || current.offsetLabel !== option.offsetLabel) {
      current = {
        offsetLabel: option.offsetLabel,
        options: []
      };
      groups.push(current);
    }
    current.options.push(option);
  }
  return groups;
}
function ensureTimezoneIncluded(options, value) {
  if (!value || options.some(entry => entry.value === value)) return options;
  const custom = {
    value,
    offsetMinutes: getTimezoneOffsetMinutes(value),
    offsetLabel: formatUtcOffset(getTimezoneOffsetMinutes(value)),
    label: formatTimezonePath(value),
    fullLabel: formatTimezoneOptionLabel(value)
  };
  return [custom, ...options];
}
export function getTimezoneOptions(selectedValue) {
  if (!cachedOptions) {
    cachedOptions = buildTimezoneOptions();
    cachedGroups = buildTimezoneGroups(cachedOptions);
  }
  if (!selectedValue) {
    return {
      options: cachedOptions,
      groups: cachedGroups
    };
  }
  const options = ensureTimezoneIncluded(cachedOptions, selectedValue);
  if (options === cachedOptions) {
    return {
      options,
      groups: cachedGroups
    };
  }
  return {
    options,
    groups: buildTimezoneGroups(options)
  };
}
export function getLegacyTimezoneOptions() {
  return getTimezoneOptions().options.map(({
    value,
    fullLabel
  }) => ({
    value,
    label: fullLabel
  }));
}
