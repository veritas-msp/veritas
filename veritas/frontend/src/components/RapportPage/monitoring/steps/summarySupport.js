import { fetchTickets } from "../../../../api/tickets";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { isSalesTicket } from "../../../../utils/salesTicketUtils";

function ticketCreatedAt(ticket) {
  return ticket?.created_at || ticket?.createdAt || ticket?.date_creation || null;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "open") return "new";
  return value;
}

function isClosedStatus(status) {
  const key = normalizeStatus(status);
  return key === "resolved" || key === "closed";
}

function parseTicketList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  return [];
}

async function fetchClientTickets(clientId, signal) {
  const all = [];
  const pageSize = 200;
  for (let offset = 0; offset < 800; offset += pageSize) {
    const payload = await fetchTickets(
      { clientId, includeClosed: true, limit: pageSize, offset },
      { signal }
    );
    const rows = parseTicketList(payload);
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function fetchSupportSummary(client, signal) {
  const clientId = client?.id ?? client?.uuid;
  const start = client?.reportStartDate;
  const end = client?.reportEndDate;
  if (!clientId) {
    return { total: 0, open: 0, closed: 0, highPriority: 0 };
  }
  try {
    const tickets = await fetchClientTickets(clientId, signal);
    const periodTickets = tickets
      .filter(t => !isSalesTicket(t))
      .filter(t => isDateWithinPeriod(ticketCreatedAt(t), start, end));
    const open = periodTickets.filter(t => !isClosedStatus(t.status || t.etat));
    const highPriority = periodTickets.filter(t => {
      const p = String(t.priority || t.priorite || "").toLowerCase();
      return p === "high" || p === "urgent";
    });
    return {
      total: periodTickets.length,
      open: open.length,
      closed: periodTickets.length - open.length,
      highPriority: highPriority.length
    };
  } catch {
    return { total: 0, open: 0, closed: 0, highPriority: 0 };
  }
}
