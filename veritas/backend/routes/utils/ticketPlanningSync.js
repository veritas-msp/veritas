import { resolveClientIdForContact } from "../../services/contactClientLinks.js";
import { resolveEventsSchema } from "../../services/ensureEventsSchema.js";
import { pool } from "../../database/db.js";

export async function resolveClientIdFromRequesterContact(contactId, preferredClientId = null) {
  if (!contactId) return null;
  return resolveClientIdForContact(contactId, preferredClientId);
}

export async function syncTicketPlanningEventClient(ticketId, clientId) {
  if (!ticketId) return 0;
  const schema = await resolveEventsSchema();
  if (!schema.hasTicketId) return 0;
  const {
    rowCount
  } = await pool.query(`UPDATE v_b_events
     SET client_id = $1, updated_at = NOW()
     WHERE ticket_id = $2`, [clientId ?? null, ticketId]);
  return rowCount;
}

export function shouldSyncTicketPlanningEvents(body, oldTicket, updatedTicket) {
  if (!updatedTicket?.id) return false;
  if (Object.prototype.hasOwnProperty.call(body, "requesterContactId")) return true;
  if (Object.prototype.hasOwnProperty.call(body, "clientId")) return true;
  if (Object.prototype.hasOwnProperty.call(body, "requesterUserId")) return true;
  return String(oldTicket?.client_id ?? "") !== String(updatedTicket?.client_id ?? "") || String(oldTicket?.requester_contact_id ?? "") !== String(updatedTicket?.requester_contact_id ?? "");
}
