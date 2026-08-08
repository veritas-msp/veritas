export function parseCheckMKResponses(servicesResp, eventsResp, availabilityResp) {
  const services = Array.isArray(servicesResp?.services) ? servicesResp.services : [];
  const rawEvents = eventsResp?.events ?? eventsResp?.data?.events;
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const availability = availabilityResp?.availability ?? availabilityResp ?? null;
  const eventsCount = typeof eventsResp?.events_count === "number" ? eventsResp.events_count : events.length;
  return {
    services,
    events,
    availability,
    eventsCount
  };
}
export function buildCheckMKCacheEntry(services, events, availability, period = null) {
  return {
    services,
    events,
    availability,
    syncedAt: new Date().toISOString(),
    period: period ? {
      start: period.start,
      end: period.end
    } : null
  };
}
export function computeCheckMKEquipmentStatus({
  services,
  events,
  availability,
  eventsCount
}) {
  const criticalCount = eventsCount ?? (Array.isArray(events) ? events.length : 0);
  const up = availability != null && typeof availability.up === "number" ? availability.up : null;
  if (up == null && criticalCount === 0 && services.length === 0) return "unsynced";
  if (up != null && up < 95) return "critical";
  if (criticalCount >= 5) return "critical";
  if (up != null && up < 99 || criticalCount > 0) return "warn";
  return "ok";
}
export function resolveCheckMKEquipmentKey(item, equipmentKey) {
  if (item?.id != null) return String(item.id);
  if (equipmentKey != null) return String(equipmentKey);
  return null;
}
export function getCheckMKCachedData(cache, item, equipmentKey) {
  if (!cache || typeof cache !== "object") return null;
  const primaryKey = resolveCheckMKEquipmentKey(item, equipmentKey);
  if (primaryKey && cache[primaryKey]) return cache[primaryKey];
  if (equipmentKey != null && cache[String(equipmentKey)]) return cache[String(equipmentKey)];
  return null;
}
export function isCheckMKCacheValidForPeriod(cachedPeriod, reportStartDate, reportEndDate) {
  if (!cachedPeriod) return false;
  return cachedPeriod.reportStartDate === reportStartDate && cachedPeriod.reportEndDate === reportEndDate;
}
export function buildCheckMKReportSnapshot(equipmentData, equipmentStatus, reportStartDate, reportEndDate) {
  return {
    reportStartDate: reportStartDate || null,
    reportEndDate: reportEndDate || null,
    equipmentData: equipmentData && typeof equipmentData === "object" ? equipmentData : {},
    equipmentStatus: equipmentStatus && typeof equipmentStatus === "object" ? equipmentStatus : {}
  };
}
function parseCheckMKEventDate(event) {
  if (!event || typeof event !== "object") return null;
  const candidates = [event.timestamp, event.time, event.date, event.log_time];
  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    if (typeof raw === "number") {
      const ms = raw < 10000000000 ? raw * 1000 : raw;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) return date;
      continue;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const europeanMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (europeanMatch) {
        const [, day, month, year, hour, minute, second] = europeanMatch;
        const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        if (!Number.isNaN(date.getTime())) return date;
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }
  }
  return null;
}
function getCheckMKEventServiceLabel(event) {
  return String(event?.service || event?.service_description || event?.display_name || event?.description || "").trim();
}
function getCheckMKEventMessage(event) {
  return String(event?.message || event?.plugin_output || event?.text || event?.output || "").trim();
}
export function isCheckMKNoiseEvent(event) {
  const service = getCheckMKEventServiceLabel(event);
  const message = getCheckMKEventMessage(event);
  const normalizedService = service.replace(/^\[+|\]+$/g, "").toLowerCase();
  if (normalizedService === "snmp" || normalizedService === "piggyback") {
    return true;
  }
  if (/^\[snmp\]/i.test(service) || /^\[piggyback\]/i.test(service)) {
    return true;
  }
  if (/^\[snmp\]/i.test(message) || /^\[piggyback\]/i.test(message)) {
    return true;
  }
  if (/^SNMP Error$/i.test(message) && /snmp/i.test(service)) {
    return true;
  }
  return false;
}
export function filterCheckMKNoiseEvents(events = []) {
  if (!Array.isArray(events)) return [];
  return events.filter(event => !isCheckMKNoiseEvent(event));
}
export function parseReportPeriodBounds(reportPeriod = {}) {
  const startRaw = reportPeriod?.start || reportPeriod?.startTime;
  const endRaw = reportPeriod?.end || reportPeriod?.endTime;
  if (!startRaw || !endRaw) return null;
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  end.setHours(23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return {
    start,
    end
  };
}
export function filterCheckMKEventsForReportPeriod(events, reportPeriod, {
  criticalOnly = false
} = {}) {
  const bounds = parseReportPeriodBounds(reportPeriod);
  if (!bounds || !Array.isArray(events)) return Array.isArray(events) ? events : [];
  const filtered = events.filter(event => {
    const eventDate = parseCheckMKEventDate(event);
    if (!eventDate) return false;
    return eventDate >= bounds.start && eventDate <= bounds.end;
  });
  if (criticalOnly) {
    return filterCheckMKNoiseEvents(filtered.filter(event => Number(event?.state) === 2));
  }
  return filterCheckMKNoiseEvents(filtered);
}
export function deriveServicesFromPeriodEvents(events = []) {
  const byService = new Map();
  events.forEach(event => {
    if (isCheckMKNoiseEvent(event)) return;
    const name = event?.service || event?.service_description || event?.display_name || event?.description;
    if (!name) return;
    const state = typeof event.state === "number" ? event.state : Number(event.state) || 2;
    const previous = byService.get(name);
    if (!previous || state > previous.state) {
      byService.set(name, {
        description: name,
        display_name: name,
        state
      });
    }
  });
  return Array.from(byService.values());
}
export function filterCheckMKDisplayData(preLoadedData, reportPeriod) {
  if (!preLoadedData) return null;
  const periodEvents = filterCheckMKEventsForReportPeriod(preLoadedData.events, reportPeriod);
  const events = periodEvents.filter(event => Number(event?.state) === 2);
  const services = deriveServicesFromPeriodEvents(periodEvents);
  return {
    ...preLoadedData,
    events,
    services
  };
}
