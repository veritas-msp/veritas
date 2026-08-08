export const EQUIPMENT_ACTIVITY_PRESETS = [{
  value: "7d",
  days: 7
}, {
  value: "30d",
  days: 30
}, {
  value: "90d",
  days: 90
}, {
  value: "1y",
  days: 365
}];
export function toDateInputValue(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function resolveEquipmentActivityRange({
  preset = "30d",
  customStart = "",
  customEnd = ""
} = {}) {
  if (preset === "custom") {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      if (start > end) return {
        start: end,
        end: start
      };
      return {
        start,
        end
      };
    }
    if (end && !Number.isNaN(end.getTime())) {
      const fallbackStart = new Date(end);
      fallbackStart.setDate(fallbackStart.getDate() - 30);
      return {
        start: fallbackStart,
        end
      };
    }
    if (start && !Number.isNaN(start.getTime())) {
      const fallbackEnd = new Date();
      return {
        start,
        end: fallbackEnd
      };
    }
  }
  const presetDef = EQUIPMENT_ACTIVITY_PRESETS.find(row => row.value === preset) || EQUIPMENT_ACTIVITY_PRESETS[1];
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - presetDef.days);
  start.setHours(0, 0, 0, 0);
  return {
    start,
    end
  };
}
export function buildActivityFeedItems({
  events = [],
  tickets = [],
  copy
}) {
  const planningRows = (Array.isArray(events) ? events : []).map(event => ({
    kind: "planning",
    id: `planning-${event.id}`,
    title: event.title || copy?.events?.fallbackTitle || "Event",
    subtitle: event.type || "",
    date: event.start,
    endDate: event.end,
    raw: event
  }));
  const ticketRows = (Array.isArray(tickets) ? tickets : []).map(ticket => ({
    kind: "ticket",
    id: `ticket-${ticket.id}`,
    title: ticket.title || copy?.activity?.ticketFallback || "Ticket",
    subtitle: ticket.ticket_number ? `#${ticket.ticket_number}` : "",
    status: ticket.status,
    priority: ticket.priority,
    date: ticket.updated_at || ticket.created_at,
    raw: ticket
  }));
  return [...planningRows, ...ticketRows].sort((a, b) => {
    const aMs = new Date(a.date || 0).getTime();
    const bMs = new Date(b.date || 0).getTime();
    return bMs - aMs;
  });
}
export function getLocaleDateTimeFormat(locale) {
  return {
    fr: "en-US",
    en: "en-GB",
    de: "de-DE",
    it: "it-IT",
    es: "es-ES"
  }[locale] || "en-US";
}
