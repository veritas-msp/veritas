import { isCommunity } from "./edition.js";
import { isSalesTicket } from "../services/supportCredits.js";
/** Tickets that belong to Services & installations (new types + legacy demande+prefix). */
export const SALES_TICKET_MATCH_SQL = `(
  LOWER(COALESCE(t.type, '')) IN ('prestation', 'installation')
  OR (
    LOWER(COALESCE(t.type, '')) IN ('demande', 'request')
    AND (t.category LIKE 'prestation-%' OR t.category LIKE 'installation-%')
  )
)`;
export const SALES_TICKET_MATCH_SQL_PLAIN = `(
  LOWER(COALESCE(type, '')) IN ('prestation', 'installation')
  OR (
    LOWER(COALESCE(type, '')) IN ('demande', 'request')
    AND (category LIKE 'prestation-%' OR category LIKE 'installation-%')
  )
)`;
export const SUPPORT_TICKET_SQL = `NOT ${SALES_TICKET_MATCH_SQL}`;
export const SUPPORT_TICKET_SQL_PLAIN = `NOT ${SALES_TICKET_MATCH_SQL_PLAIN}`;
/** @deprecated Use SUPPORT_TICKET_SQL — kept for Community import sites. */
export const COMMUNITY_SALES_TICKET_SQL = SUPPORT_TICKET_SQL;
export const COMMUNITY_SALES_TICKET_SQL_PLAIN = SUPPORT_TICKET_SQL_PLAIN;
export function appendSupportTicketFilters(where) {
  where.push(SUPPORT_TICKET_SQL);
}
export function appendSalesTicketFilters(where) {
  where.push(SALES_TICKET_MATCH_SQL);
}
export function appendCommunityTicketFilters(where) {
  if (!isCommunity()) return;
  appendSupportTicketFilters(where);
}
export function sendProSalesTicketError(res) {
  return res.status(403).json({
    error: "Service and installation ticketing is reserved for Veritas Pro",
    code: "PRO_FEATURE_REQUIRED"
  });
}
export function rejectCommunitySalesTicketCreate(req, res) {
  if (!isCommunity()) return false;
  if (req.body?.salesFormData) {
    sendProSalesTicketError(res);
    return true;
  }
  const type = req.body?.type ?? "incident";
  const category = req.body?.category ?? "";
  if (isSalesTicket(type, category)) {
    sendProSalesTicketError(res);
    return true;
  }
  return false;
}
export function rejectCommunitySalesTicketUpdate(req, res, existingTicket) {
  if (!isCommunity()) return false;
  const nextType = Object.prototype.hasOwnProperty.call(req.body, "type") ? req.body.type : existingTicket?.type;
  const nextCategory = Object.prototype.hasOwnProperty.call(req.body, "category") ? req.body.category : existingTicket?.category;
  if (isSalesTicket(existingTicket?.type, existingTicket?.category) || isSalesTicket(nextType, nextCategory)) {
    sendProSalesTicketError(res);
    return true;
  }
  return false;
}
export function isSalesTicketRow(ticket) {
  return isSalesTicket(ticket?.type, ticket?.category);
}
