export const CHECKMK_DATE_FILTER_OPTIONS = [{
  value: '1m',
  label: '30 jours',
  shortLabel: '1 mois'
}, {
  value: '3m',
  label: '3 mois',
  shortLabel: '3 mois'
}, {
  value: '6m',
  label: '6 mois',
  shortLabel: '6 mois'
}, {
  value: '1y',
  label: '1 an',
  shortLabel: '1 an'
}, {
  value: '10y',
  label: 'Tout',
  shortLabel: 'Tout'
}];
export const CHECKMK_AVAILABILITY_PERIOD_OPTIONS = [{
  value: '1m',
  label: '1 mois'
}, {
  value: '3m',
  label: '3 mois'
}, {
  value: '1y',
  label: '1 an'
}];
export const SERVICE_STATE_META = [{
  state: 0,
  label: 'OK',
  color: '#13BA8E',
  icon: 'mdi:check-circle'
}, {
  state: 1,
  label: 'Warning',
  color: '#f59e0b',
  icon: 'mdi:alert'
}, {
  state: 2,
  label: 'Critical',
  color: '#ef4444',
  icon: 'mdi:alert-circle'
}, {
  state: 3,
  label: 'Unknown',
  color: '#6b7280',
  icon: 'mdi:help-circle'
}];
export const EVENT_STATE_META = [{
  state: 0,
  label: 'OK',
  color: '#13BA8E'
}, {
  state: 1,
  label: 'Warning',
  color: '#f59e0b'
}, {
  state: 2,
  label: 'Critical',
  color: '#ef4444'
}, {
  state: 3,
  label: 'Unknown',
  color: '#6b7280'
}];
export function getCheckMKEventTimeMs(event) {
  const raw = event?.time ?? event?.log_time ?? event?.timestamp ?? event?.event_time ?? event?.created ?? event?.date ?? event?.created_at ?? null;
  if (raw == null) return null;
  const num = Number(raw);
  if (!Number.isNaN(num)) return num < 1e12 ? num * 1000 : num;
  const dateMs = typeof raw === 'string' ? new Date(raw.trim().replace(' ', 'T')).getTime() : NaN;
  return Number.isNaN(dateMs) ? null : dateMs;
}
export function isCalendarMonthFilter(filterKey) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(filterKey || ''));
}
export function getCalendarMonthRange(filterKey) {
  const [year, month] = filterKey.split('-').map(Number);
  const startMs = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
  const endMs = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  return {
    startMs,
    endMs,
    year,
    month
  };
}
export function getPreviousCalendarMonthKey(filterKey) {
  const {
    year,
    month
  } = getCalendarMonthRange(filterKey);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}
export function formatCalendarFilterLabel(filterKey, {
  capitalize = true
} = {}) {
  if (!isCalendarMonthFilter(filterKey)) return null;
  const {
    year,
    month
  } = getCalendarMonthRange(filterKey);
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
  if (!capitalize || !label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
export function getEventsFilterShortLabel(filterKey) {
  if (isCalendarMonthFilter(filterKey)) {
    return formatCalendarFilterLabel(filterKey);
  }
  return CHECKMK_DATE_FILTER_OPTIONS.find(o => o.value === filterKey)?.shortLabel ?? filterKey;
}
export function getEventCalendarMonths(events, limit = 18) {
  const counts = new Map();
  for (const e of filterAlertEventsOnly(events)) {
    const t = getCheckMKEventTimeMs(e);
    if (t == null) continue;
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, limit).map(([key, count]) => ({
    key,
    count,
    label: formatCalendarFilterLabel(key)
  }));
}
export function getPeriodDurationMs(filterKey) {
  if (isCalendarMonthFilter(filterKey)) {
    const {
      startMs,
      endMs
    } = getCalendarMonthRange(filterKey);
    return endMs - startMs + 1;
  }
  const day = 24 * 60 * 60 * 1000;
  if (filterKey === '1m') return 30 * day;
  if (filterKey === '3m') return 90 * day;
  if (filterKey === '6m') return 180 * day;
  if (filterKey === '1y') return 365 * day;
  return 10 * 365 * day;
}
export function getCheckMKEventsInDateRange(events, filterKey, nowMs = Date.now()) {
  if (!events?.length) return [];
  if (isCalendarMonthFilter(filterKey)) {
    const {
      startMs,
      endMs
    } = getCalendarMonthRange(filterKey);
    return events.filter(e => {
      const t = getCheckMKEventTimeMs(e);
      return t != null && t >= startMs && t <= endMs;
    });
  }
  const duration = getPeriodDurationMs(filterKey);
  const startMs = nowMs - duration;
  return events.filter(e => {
    const t = getCheckMKEventTimeMs(e);
    if (t == null) return filterKey === '10y';
    return t >= startMs && t <= nowMs;
  });
}
function parseEventStateRaw(rawState) {
  if (typeof rawState === 'number') return rawState;
  if (typeof rawState === 'string') {
    const match = rawState.match(/\((OK|WARNING|CRITICAL|UNKNOWN)\)/i) || rawState.match(/\b(OK|WARNING|CRITICAL|UNKNOWN)\b/i);
    if (match) {
      const s = match[1].toUpperCase();
      if (s === 'OK') return 0;
      if (s === 'WARNING') return 1;
      if (s === 'CRITICAL') return 2;
      return 3;
    }
    const n = parseInt(rawState, 10);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}
export function getEventStateNum(event) {
  if (typeof event?.state === 'number') return event.state;
  if (event?.state != null && typeof event.state !== 'number') {
    return parseEventStateRaw(event.state);
  }
  if (typeof event?.state_info === 'number') return event.state_info;
  if (event?.state_info != null) return parseEventStateRaw(event.state_info);
  if (Array.isArray(event)) return parseEventStateRaw(event[5]);
  if (event?.raw && Array.isArray(event.raw)) return parseEventStateRaw(event.raw[5]);
  return 0;
}
export function isAlertEvent(event) {
  const state = getEventStateNum(event);
  return state === 1 || state === 2;
}
export function filterAlertEventsOnly(events) {
  return (events || []).filter(isAlertEvent);
}
export function getCheckMKAvailabilityUp(availability) {
  if (!availability) return null;
  if (typeof availability.up === 'number') return availability.up;
  if (availability.availability?.up != null) return parseFloat(availability.availability.up);
  return null;
}
export function formatRelativeFrench(isoOrDate) {
  if (!isoOrDate) return '-';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '-';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} d ago`;
  return d.toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false
  });
}
export function formatEventTimestamp(event) {
  const raw = event?.time ?? event?.log_time ?? event?.timestamp ?? event?.event_time ?? event?.created ?? null;
  if (raw == null) return '-';
  if (typeof raw === 'number') {
    const d = raw < 1e12 ? new Date(raw * 1000) : new Date(raw);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (typeof raw === 'string') {
    const d = new Date(raw.trim().replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return '-';
}
export function formatServiceAge(service, nowSec = Math.floor(Date.now() / 1000)) {
  const ageTs = service?.lastStateChange ?? service?.last_state_change ?? service?.lastCheck ?? service?.last_check;
  if (ageTs == null) return '-';
  const ageSeconds = nowSec - Number(ageTs);
  if (ageSeconds < 0) return '0 s';
  if (ageSeconds < 60) return `${Math.floor(ageSeconds)} s`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)} min`;
  if (ageSeconds < 86400) return `${Math.floor(ageSeconds / 3600)} h`;
  return `${Math.floor(ageSeconds / 86400)} j`;
}
export function getServiceLabel(service) {
  return service?.title || service?.id || service?.name || 'N/A';
}
export function computeCheckMKKpis({
  services = [],
  events = [],
  availabilityByPeriod = {},
  eventsDateFilter = '1m'
}) {
  const alertEvents = filterAlertEventsOnly(events);
  const nowMs = Date.now();
  const periodMs = getPeriodDurationMs(eventsDateFilter);
  const eventsInPeriod = getCheckMKEventsInDateRange(alertEvents, eventsDateFilter, nowMs);
  let eventsPrevPeriod;
  if (isCalendarMonthFilter(eventsDateFilter)) {
    eventsPrevPeriod = getCheckMKEventsInDateRange(alertEvents, getPreviousCalendarMonthKey(eventsDateFilter), nowMs);
  } else {
    const currentStart = nowMs - periodMs;
    const prevStart = nowMs - 2 * periodMs;
    const prevEnd = currentStart;
    eventsPrevPeriod = alertEvents.filter(e => {
      const t = getCheckMKEventTimeMs(e);
      return t != null && t >= prevStart && t < prevEnd;
    });
  }
  const critCount = eventsInPeriod.filter(e => getEventStateNum(e) === 2).length;
  const warnCount = eventsInPeriod.filter(e => getEventStateNum(e) === 1).length;
  const okServices = services.filter(s => (s.state ?? 3) === 0).length;
  const warnServices = services.filter(s => (s.state ?? 3) === 1).length;
  const critServices = services.filter(s => (s.state ?? 3) === 2).length;
  const healthScore = services.length ? Math.round(okServices / services.length * 100) : null;
  const avail1m = getCheckMKAvailabilityUp(availabilityByPeriod['1m']);
  const avail3m = getCheckMKAvailabilityUp(availabilityByPeriod['3m']);
  const availTrend = avail1m != null && avail3m != null ? Math.round((avail1m - avail3m) * 10) / 10 : null;
  const eventTrend = eventsPrevPeriod.length > 0 ? Math.round((eventsInPeriod.length - eventsPrevPeriod.length) / eventsPrevPeriod.length * 100) : eventsInPeriod.length > 0 ? 100 : 0;
  const serviceEventCounts = eventsInPeriod.reduce((acc, e) => {
    const svc = e.service ?? e.log_service_description ?? 'Host';
    if (!svc) return acc;
    acc[svc] = (acc[svc] || 0) + 1;
    return acc;
  }, {});
  const topServiceEntry = Object.entries(serviceEventCounts).sort((a, b) => b[1] - a[1])[0];
  const daysInPeriod = Math.max(1, periodMs / (24 * 60 * 60 * 1000));
  const eventsPerDay = Math.round(eventsInPeriod.length / daysInPeriod * 10) / 10;
  return {
    eventsInPeriod: eventsInPeriod.length,
    eventsPrevPeriod: eventsPrevPeriod.length,
    eventTrend,
    critCount,
    warnCount,
    okServices,
    warnServices,
    critServices,
    totalServices: services.length,
    healthScore,
    avail1m,
    avail3m,
    availTrend,
    topService: topServiceEntry ? {
      name: topServiceEntry[0],
      count: topServiceEntry[1]
    } : null,
    eventsPerDay
  };
}
