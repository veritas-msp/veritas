const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
function getEventStartMs(event) {
  if (!event || typeof event !== "object") return null;
  const raw = event.event_start ?? event["start"] ?? event.start;
  if (raw == null || raw === "") return null;
  const start = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(start.getTime()) ? null : start.getTime();
}
function getEventEndMs(event) {
  if (!event || typeof event !== "object") return null;
  const raw = event.event_end ?? event["end"] ?? event.end ?? event.end_at;
  if (raw == null || raw === "") return null;
  const end = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(end.getTime()) ? null : end.getTime();
}
export function isUpcomingEvent(event, now = Date.now()) {
  const endMs = getEventEndMs(event);
  if (endMs != null) return endMs >= now;
  const startMs = getEventStartMs(event);
  return startMs != null && startMs >= now;
}
export function isRecentEvent(event, now = Date.now()) {
  const endMs = getEventEndMs(event);
  if (endMs == null) return false;
  return endMs < now && endMs >= now - RECENT_WINDOW_MS;
}
export function filterUpcomingEvents(events) {
  return (Array.isArray(events) ? events : []).filter(event => isUpcomingEvent(event)).sort((a, b) => getEventStartMs(a) - getEventStartMs(b));
}
export function filterRecentEvents(events) {
  return (Array.isArray(events) ? events : []).filter(event => isRecentEvent(event)).sort((a, b) => getEventEndMs(b) - getEventEndMs(a));
}
export function partitionClientEvents(events, now = Date.now()) {
  const upcoming = [];
  const recent = [];
  for (const event of Array.isArray(events) ? events : []) {
    if (isUpcomingEvent(event, now)) {
      upcoming.push(event);
    } else if (isRecentEvent(event, now)) {
      recent.push(event);
    }
  }
  upcoming.sort((a, b) => getEventStartMs(a) - getEventStartMs(b));
  recent.sort((a, b) => getEventEndMs(b) - getEventEndMs(a));
  return {
    upcoming,
    recent
  };
}

/** Map cybersecurity campaigns to planning-like events for client header bookmarks. */
export function mapCampaignsToBookmarkEvents(campaigns = [], clientId = null) {
  const pad = n => String(n).padStart(2, "0");
  const toLocalIso = date =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return (Array.isArray(campaigns) ? campaigns : [])
    .filter(campaign => campaign?.start_date || campaign?.end_date)
    .map(campaign => {
      const startSource = campaign.start_date || campaign.end_date;
      const endSource = campaign.end_date || campaign.start_date;
      const start = new Date(startSource);
      const end = new Date(endSource);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      start.setHours(9, 0, 0, 0);
      end.setHours(23, 59, 59, 0);
      const startIso = toLocalIso(start);
      const endIso = toLocalIso(end);
      return {
        id: `campaign-${campaign.id}`,
        title: campaign.name || "Campagne",
        type: "campagne",
        start: startIso,
        end: endIso,
        event_end: endIso,
        description: campaign.description || null,
        client_id: campaign.client_id || clientId || null,
        _isCampaign: true,
        _campaignData: campaign
      };
    })
    .filter(Boolean);
}
