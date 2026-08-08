import moment from "moment";
import { formatPlanningDateTime } from "../../utils/planningDateTime";
export const PLANNING_EVENT_DRAG_MIME = "application/x-veritas-planning-event-id";
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
export function parseEventDescription(rawDescription) {
  const raw = (rawDescription || "").toString();
  const markerIndex = raw.indexOf(EVENT_META_MARKER);
  let text = raw;
  let meta = null;
  if (markerIndex !== -1) {
    const endIndex = raw.indexOf("-->", markerIndex);
    if (endIndex !== -1) {
      const encoded = raw.slice(markerIndex + EVENT_META_MARKER.length, endIndex).trim();
      meta = safeDecodeMeta(encoded);
      text = raw.slice(0, markerIndex).trimEnd();
      meta = meta && typeof meta === "object" ? meta : null;
    }
  }
  if (/VERITAS_TICKET:/i.test(raw)) {
    const match = raw.match(/VERITAS_TICKET:([0-9a-fA-F-]{36})(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?/);
    if (match) {
      meta = {
        ...(meta || {}),
        salesPmTask: true,
        ticketId: match[1] || meta?.ticketId || null,
        ticketNumber: match[2] || meta?.ticketNumber || null,
        kind: match[3] || meta?.kind || null,
        pmTaskId: match[4] || meta?.pmTaskId || null
      };
    }
  }
  text = text
    .replace(/VERITAS_TICKET:[^\n]*/gi, "")
    .replace(/<!--VERITAS_EVENT_META:[\s\S]*?-->/g, "")
    .trim();
  return {
    text,
    meta
  };
}
function serializeEventDescription(text, meta) {
  const cleanText = (text || "").trim();
  const hasMeta =
    (Array.isArray(meta?.linkedItems) && meta.linkedItems.length > 0) ||
    (Array.isArray(meta?.todos) && meta.todos.length > 0) ||
    meta?.schedule?.allDay === true ||
    meta?.schedule?.businessDaysOnly === false ||
    (Array.isArray(meta?.assignedUserIds) && meta.assignedUserIds.length > 0) ||
    meta?.ticketReminder === true ||
    meta?.salesPmTask === true ||
    Boolean(meta?.ticketId) ||
    Boolean(meta?.pmTaskId);
  if (!hasMeta) return cleanText || null;
  const encoded = safeEncodeMeta(meta);
  if (!encoded) return cleanText || null;
  return `${cleanText}\n\n${EVENT_META_MARKER}${encoded}-->`;
}
export function isPlanningEventDraggable(event) {
  if (!event) return false;
  if (event._isCampaign) return false;
  const id = event.id ?? event._rawData?.id;
  if (!id || String(id).startsWith("campaign-")) return false;
  return true;
}
export function getPlanningEventId(event) {
  return event?.id ?? event?._rawData?.id ?? null;
}
export function buildEventMovePayload(calendarEvent, newStart, newEnd, {
  assignedUserId
} = {}) {
  const raw = calendarEvent._rawData || {};
  const resolvedAssignee = assignedUserId ?? calendarEvent.assignedUserId ?? raw.assigned_user_id ?? null;
  let description = raw.description ?? null;
  if (resolvedAssignee) {
    const parsed = parseEventDescription(description || "");
    const meta = {
      ...(parsed.meta || {}),
      assignedUserIds: [String(resolvedAssignee)]
    };
    description = serializeEventDescription(parsed.text, meta);
  }
  return {
    title: (calendarEvent.title || raw.title || "").trim(),
    type: calendarEvent.resource || raw.type || "other",
    start: formatPlanningDateTime(newStart),
    end: formatPlanningDateTime(newEnd),
    description,
    clientId: calendarEvent.clientId ?? raw.client_id ?? null,
    equipmentId: calendarEvent.equipmentId ?? raw.equipment_id ?? null,
    assignedUserId: resolvedAssignee
  };
}
export function applyLocalEventMove(events, eventId, {
  start,
  end,
  assignedUserId,
  users = []
}) {
  const idStr = String(eventId);
  const assignee = assignedUserId ? users.find(u => String(u.id) === String(assignedUserId)) : null;
  const assigneeName = assignee?.name || assignee?.nom || assignee?.username || null;
  return events.map(ev => {
    if (String(ev.id) !== idStr) return ev;
    const nextAssignedIds = assignedUserId ? [String(assignedUserId)] : ev.assignedUserIds;
    return {
      ...ev,
      start: new Date(start),
      end: new Date(end),
      assignedUserId: assignedUserId ?? ev.assignedUserId,
      assignedUserIds: nextAssignedIds,
      assignedUserName: assigneeName ?? ev.assignedUserName,
      _rawData: ev._rawData ? {
        ...ev._rawData,
        start: formatPlanningDateTime(start),
        end: formatPlanningDateTime(end),
        assigned_user_id: assignedUserId ?? ev._rawData.assigned_user_id,
        description: buildEventMovePayload(ev, start, end, {
          assignedUserId
        }).description
      } : ev._rawData
    };
  });
}
export function computeMovedAllDayRange(event, targetDay) {
  const prevStart = moment(event.start).startOf("day");
  const prevEndDay = moment(event.end).startOf("day");
  const spanDays = Math.max(0, prevEndDay.diff(prevStart, "days"));
  const newStart = targetDay.clone().startOf("day");
  const newEnd = newStart.clone().add(spanDays, "days");
  const endMoment = moment(event.end);
  if (endMoment.format("HH:mm") === "23:59") {
    newEnd.hour(23).minute(59).second(59);
  } else {
    newEnd.hour(endMoment.hour()).minute(endMoment.minute()).second(0);
  }
  return {
    start: newStart.toDate(),
    end: newEnd.toDate()
  };
}
export function computeMovedTimedRange(event, targetStart) {
  const prevStart = new Date(event.start);
  const prevEnd = new Date(event.end);
  const durationMs = Math.max(15 * 60 * 1000, prevEnd.getTime() - prevStart.getTime());
  const nextStart = new Date(targetStart);
  const nextEnd = new Date(nextStart.getTime() + durationMs);
  return {
    start: nextStart,
    end: nextEnd
  };
}
export function computeMonthResizeRange(event, edge, deltaDays) {
  if (!deltaDays) return null;
  const startM = moment(event.start);
  const endM = moment(event.end);
  if (edge === "left") {
    const nextStart = startM.clone().add(deltaDays, "days");
    if (nextStart.isAfter(endM)) return null;
    return {
      start: nextStart.toDate(),
      end: endM.toDate()
    };
  }
  const nextEnd = endM.clone().add(deltaDays, "days");
  if (nextEnd.isBefore(startM)) return null;
  return {
    start: startM.toDate(),
    end: nextEnd.toDate()
  };
}
export function computeMonthDropRange(event, targetDate) {
  const targetDay = moment(targetDate).startOf("day");
  const startM = moment(event.start);
  const endM = moment(event.end);
  const inferredAllDay = startM.format("HH:mm") === "00:00" && endM.format("HH:mm") === "23:59";
  if (inferredAllDay) {
    return computeMovedAllDayRange(event, targetDay);
  }
  const dayOffset = targetDay.diff(startM.clone().startOf("day"), "days");
  return {
    start: startM.clone().add(dayOffset, "days").toDate(),
    end: endM.clone().add(dayOffset, "days").toDate()
  };
}
