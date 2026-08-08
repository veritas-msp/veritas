import { formatPlanningDateTime } from "./planningDateTime";
import { parseEventDescriptionMeta } from "./ticketReminderEvent";
import { createEvent, updateEvent, deleteEvent, fetchEvents } from "../api/events";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
const EVENT_META_MARKER = "<!--VERITAS_EVENT_META:";
/** Plain-text sentinel — survives HTML-comment stripping. */
const TICKET_LINK_SENTINEL = "VERITAS_TICKET:";

function encodeMeta(obj) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return null;
  }
}

export function serializeSalesTaskEventDescription(note, { ticketId, ticketNumber, pmTaskId, kind } = {}) {
  const cleanNote = String(note || "").trim();
  const meta = {
    salesPmTask: true,
    pmTaskId: pmTaskId ? String(pmTaskId) : null,
    ticketId: ticketId ? String(ticketId) : null,
    ticketNumber: ticketNumber != null && ticketNumber !== "" ? String(ticketNumber) : null,
    kind: kind ? String(kind) : null
  };
  // Keep human note only in visible text; ticket link lives in HTML meta (and optional hidden sentinel after).
  const encoded = encodeMeta(meta);
  const parts = [];
  if (cleanNote) parts.push(cleanNote);
  if (encoded) parts.push(`${EVENT_META_MARKER}${encoded}-->`);
  // Hidden fallback sentinel after meta — parsers read it from raw description, UI never shows it
  if (ticketId) {
    parts.push(`${TICKET_LINK_SENTINEL}${String(ticketId)}|${meta.ticketNumber || ""}|${meta.kind || ""}|${meta.pmTaskId || ""}`);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/** Strip machine markers from a description before showing it to users. */
export function sanitizePlanningDescriptionForDisplay(value) {
  return String(value || "")
    .replace(/VERITAS_TICKET:[^\n]*/gi, "")
    .replace(/<!--VERITAS_EVENT_META:[\s\S]*?-->/g, "")
    .trim();
}

/** Resolve ticket link from mapped event fields and/or raw description. */
export function resolveSalesTaskTicketLink(event) {
  if (!event) return null;
  const fromFields =
    event.ticketId || event.isSalesPmTask
      ? {
          ticketId: event.ticketId ? String(event.ticketId) : null,
          ticketNumber: event.ticketNumber != null && event.ticketNumber !== "" ? String(event.ticketNumber) : null,
          isSalesPmTask: Boolean(event.isSalesPmTask || event.salesKind),
          kind: event.salesKind || null,
          pmTaskId: event.pmTaskId || null
        }
      : null;
  if (fromFields?.ticketId) return fromFields;

  const raw = String(event._rawData?.description || event.description || "");
  const meta = parseEventDescriptionMeta(raw).meta;
  if (meta?.ticketId || meta?.salesPmTask) {
    return {
      ticketId: meta.ticketId ? String(meta.ticketId) : null,
      ticketNumber: meta.ticketNumber != null && meta.ticketNumber !== "" ? String(meta.ticketNumber) : null,
      isSalesPmTask: Boolean(meta.salesPmTask),
      kind: meta.kind || null,
      pmTaskId: meta.pmTaskId || null
    };
  }

  const match = raw.match(/VERITAS_TICKET:([0-9a-fA-F-]{36})(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?/);
  if (match) {
    return {
      ticketId: match[1],
      ticketNumber: match[2] || null,
      kind: match[3] || null,
      pmTaskId: match[4] || null,
      isSalesPmTask: true
    };
  }
  return fromFields;
}

export function resolveSalesTaskEventWindow(task) {
  if (!task?.startAt) return null;
  const startDate = new Date(task.startAt);
  if (Number.isNaN(startDate.getTime())) return null;
  let endDate = task.endAt ? new Date(task.endAt) : null;
  if (!endDate || Number.isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime()) {
    endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS);
  }
  return { startDate, endDate };
}

/** Build create/update payload for a PM task planning event (no ticket_id — avoids 1-reminder unique index). */
export function buildSalesTaskEventPayload({ task, ticket, kind }) {
  const label = String(task?.label || "").trim();
  const window = resolveSalesTaskEventWindow(task);
  if (!label || !window) return null;
  const ticketId = ticket?.id || ticket?.ticketId || null;
  return {
    title: label,
    type: String(task?.eventType || task?.event_type || task?.type || "intervention").trim() || "intervention",
    start: formatPlanningDateTime(window.startDate),
    end: formatPlanningDateTime(window.endDate),
    description: serializeSalesTaskEventDescription("", {
      ticketId,
      ticketNumber: ticket?.ticket_number ?? ticket?.ticketNumber ?? null,
      pmTaskId: task?.id || null,
      kind: kind || null
    }),
    clientId: ticket?.client_id || ticket?.clientId || null,
    assignedUserId: task?.assigneeId || null
  };
}

function eventMatchesSalesTask(event, { pmTaskId, ticketId, title }) {
  const link = resolveSalesTaskTicketLink({
    description: event?.description,
    _rawData: event
  });
  const meta = parseEventDescriptionMeta(event?.description).meta || {};
  if (!link?.isSalesPmTask && !meta.salesPmTask) return false;
  const resolvedPmTaskId = link?.pmTaskId || meta.pmTaskId || null;
  if (pmTaskId && String(resolvedPmTaskId || "") === String(pmTaskId)) return true;
  const sameTicket = ticketId && String(link?.ticketId || meta.ticketId || "") === String(ticketId);
  const sameTitle = title && String(event.title || "").trim() === String(title).trim();
  if (sameTicket && sameTitle && !resolvedPmTaskId) return true;
  return false;
}

export async function findSalesTaskPlanningEvents({ ticket, pmTaskId, title }) {
  const clientId = ticket?.client_id || ticket?.clientId || null;
  const ticketId = ticket?.id || ticket?.ticketId || null;
  const list = await fetchEvents(clientId ? { clientId } : {}).catch(() => []);
  const rows = Array.isArray(list) ? list : [];
  return rows.filter(event => eventMatchesSalesTask(event, { pmTaskId, ticketId, title }));
}

/**
 * Ensure exactly one planning event for a sales PM task.
 * Updates the kept event, deletes duplicate orphans.
 */
export async function reconcileSalesTaskPlanningEvent({ task, ticket, kind }) {
  const payload = buildSalesTaskEventPayload({ task, ticket, kind });
  if (!payload) return null;

  const matches = await findSalesTaskPlanningEvents({
    ticket,
    pmTaskId: task?.id,
    title: task?.label
  });
  let primary = null;
  if (task?.planningEventId) {
    primary = matches.find(event => String(event.id) === String(task.planningEventId)) || null;
  }
  if (!primary && matches.length > 0) {
    primary = matches[0];
  }

  const orphans = matches.filter(event => !primary || String(event.id) !== String(primary.id));
  await Promise.all(orphans.map(event => deleteEvent(event.id).catch(() => null)));

  if (primary?.id) {
    await updateEvent(primary.id, payload);
    return String(primary.id);
  }

  const created = await createEvent(payload);
  const eventId = created?.id != null ? String(created.id) : null;
  return eventId;
}

/** Delete the linked event and any duplicate orphans for this task. */
export async function deleteSalesTaskPlanningEvents({ task, ticket }) {
  const matches = await findSalesTaskPlanningEvents({
    ticket,
    pmTaskId: task?.id,
    title: task?.label
  }).catch(() => []);
  const ids = new Set(matches.map(event => String(event.id)));
  if (task?.planningEventId) ids.add(String(task.planningEventId));
  await Promise.all([...ids].map(id => deleteEvent(id).catch(() => null)));
}
