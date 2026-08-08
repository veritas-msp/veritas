export function getTicketLinkLabel(ticket) {
  if (!ticket) return "";
  return `#${ticket.ticket_number || ticket.id} · ${ticket.title || "Untitled"}`;
}
export function getTicketLinkSearchText(ticket) {
  return [ticket?.ticket_number, ticket?.id, ticket?.title, ticket?.status, ticket?.type, ticket?.category].filter(Boolean).join(" ").toLowerCase();
}
export function buildLinkedTicketComment(ticket) {
  const safeTitle = String(ticket?.title || "Linked ticket").replace(/[\\\]]/g, "");
  const safeNumber = String(ticket?.ticket_number || ticket?.id || "").replace(/[\\\]]/g, "");
  return `[Linked ticket] [event:added] [linked_ticket_id:${ticket.id}] ` + `[ticket_number:${safeNumber}] [title:${safeTitle}]`;
}
