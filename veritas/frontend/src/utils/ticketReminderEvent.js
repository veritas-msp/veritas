import { formatPlanningDateTime } from "./planningDateTime";
const EVENT_META_MARKER = "<!--VERITAS_EVENT_META:";
function safeEncodeMeta(obj) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return null;
  }
}
function safeDecodeMeta(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}
export function parseEventDescriptionMeta(rawDescription) {
  const raw = (rawDescription || "").toString();
  const markerIndex = raw.indexOf(EVENT_META_MARKER);
  if (markerIndex === -1) {
    return {
      text: raw.trim(),
      meta: null
    };
  }
  const endIndex = raw.indexOf("-->", markerIndex);
  if (endIndex === -1) {
    return {
      text: raw.trim(),
      meta: null
    };
  }
  const encoded = raw.slice(markerIndex + EVENT_META_MARKER.length, endIndex).trim();
  const meta = safeDecodeMeta(encoded);
  const text = raw.slice(0, markerIndex).trim();
  return {
    text,
    meta: meta && typeof meta === "object" ? meta : null
  };
}
export function getTicketTypeSupportLabel(type) {
  const key = String(type || "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const labels = {
    incident: "INCIDENT SUPPORT",
    demande: "DEMANDE SUPPORT",
    request: "DEMANDE SUPPORT",
    probleme: "PROBLEME SUPPORT",
    changement: "CHANGEMENT SUPPORT"
  };
  return labels[key] || "SUPPORT";
}
export function getTicketTypeIcon(type) {
  const key = String(type || "").trim().toLowerCase();
  const icons = {
    incident: "mdi:alert-circle-outline",
    demande: "mdi:hand-extended-outline",
    request: "mdi:hand-extended-outline",
    probleme: "mdi:bug-outline",
    changement: "mdi:swap-horizontal"
  };
  return icons[key] || "mdi:headset";
}
export function serializeTicketReminderDescription(note, {
  ticketId,
  ticketNumber,
  ticketType,
  requesterName,
  requesterContactId
} = {}) {
  const cleanNote = String(note || "").trim();
  const meta = {
    ticketReminder: true,
    ticketId: ticketId ? String(ticketId) : null,
    ticketNumber: ticketNumber ? String(ticketNumber) : null,
    ticketType: ticketType ? String(ticketType).trim() : null,
    requesterName: requesterName ? String(requesterName).trim() : null,
    requesterContactId: requesterContactId ? String(requesterContactId) : null
  };
  const encoded = safeEncodeMeta(meta);
  if (!encoded) return cleanNote || null;
  if (!cleanNote) return `${EVENT_META_MARKER}${encoded}-->`;
  return `${cleanNote}\n\n${EVENT_META_MARKER}${encoded}-->`;
}
export function getTicketReminderNote(description) {
  return parseEventDescriptionMeta(description).text || "";
}
export function buildReminderFormDefaults(reminderEvent = null) {
  if (reminderEvent?.start) {
    const start = new Date(reminderEvent.start);
    if (!Number.isNaN(start.getTime())) {
      const pad = n => String(n).padStart(2, "0");
      return {
        title: String(reminderEvent.title || "").trim(),
        date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        note: getTicketReminderNote(reminderEvent.description)
      };
    }
  }
  const now = new Date();
  now.setMinutes(now.getMinutes() + 60);
  const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(roundedMinutes, 0, 0);
  const pad = n => String(n).padStart(2, "0");
  return {
    title: "",
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    note: ""
  };
}
export function buildReminderDateTime(dateStr, timeStr) {
  const [year, month, day] = String(dateStr || "").split("-").map(Number);
  const [hours, minutes] = String(timeStr || "").split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
export function buildReminderEventPayload({
  ticket,
  title,
  date,
  time,
  note,
  assignedUserId,
  requesterName
}) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return null;
  const startDate = buildReminderDateTime(date, time);
  if (!startDate) return null;
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  const ticketId = ticket?.id || ticket?.ticketId;
  return {
    title: cleanTitle,
    type: "other",
    start: formatPlanningDateTime(startDate),
    end: formatPlanningDateTime(endDate),
    description: serializeTicketReminderDescription(note, {
      ticketId,
      ticketNumber: ticket?.ticket_number,
      ticketType: ticket?.type,
      requesterName,
      requesterContactId: ticket?.requester_contact_id
    }),
    clientId: ticket?.client_id || null,
    assignedUserId: assignedUserId || null,
    ticketId
  };
}
export function resolvePlanningEventClientId(event) {
  if (!event) return null;
  if (event.ticket_id != null && event.ticket_id !== "") {
    const ticketClientId = event.ticket_client_id;
    if (ticketClientId != null && ticketClientId !== "") {
      return ticketClientId;
    }
  }
  return event.client_id ?? null;
}
