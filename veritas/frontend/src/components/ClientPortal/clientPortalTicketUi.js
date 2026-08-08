export function isPortalTicketPendingValidation(ticket) {
  return Boolean(ticket?.resolutionValidation?.isPending);
}
export function isPortalTicketPendingClientResponse(ticket) {
  return normalizePortalStatusKey(ticket?.status) === "pending";
}
export function isPortalTicketActionRequired(ticket) {
  return isPortalTicketPendingValidation(ticket) || isPortalTicketPendingClientResponse(ticket);
}
export function getPortalTicketActionRequiredBadge(ticket, copy) {
  if (copy?.getActionRequiredBadge) {
    return copy.getActionRequiredBadge(ticket);
  }
  if (isPortalTicketPendingValidation(ticket)) {
    return {
      label: "Validation required"
    };
  }
  if (isPortalTicketPendingClientResponse(ticket)) {
    return {
      label: "Action required"
    };
  }
  return null;
}
export function normalizePortalStatusKey(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "open") return "new";
  return value;
}
export function getPortalPriorityVisual(priority, copy) {
  if (copy?.getPriorityVisual) return copy.getPriorityVisual(priority);
  return {
    icon: "mdi:minus",
    label: priority || "-"
  };
}
export function resolvePortalChannelMeta(channel, copy) {
  if (copy?.getChannelMeta) return copy.getChannelMeta(channel);
  return {
    label: channel || "-",
    icon: "mdi:help-circle-outline"
  };
}
export function getPortalTypeLabel(type, copy) {
  if (copy?.getTicketTypeLabel) return copy.getTicketTypeLabel(type);
  return type || "-";
}
export function getPortalStatusFilters(copy) {
  if (copy?.getStatusFilters) return copy.getStatusFilters();
  return [];
}
const PORTAL_PRIORITY_ORDER = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4
};
function resolvePortalStatusSortValue(ticket, copy) {
  const badge = getPortalTicketActionRequiredBadge(ticket, copy);
  if (badge?.label) return badge.label.toLowerCase();
  if (copy?.getTicketStatus) return String(copy.getTicketStatus(ticket.status) || "").toLowerCase();
  return normalizePortalStatusKey(ticket?.status);
}
export function sortPortalTickets(tickets, sortBy, sortDirection, copy) {
  const rows = [...(tickets || [])];
  const factor = sortDirection === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    let aValue;
    let bValue;
    switch (sortBy) {
      case "ticket_number":
        aValue = Number(a.ticket_number || a.id || 0);
        bValue = Number(b.ticket_number || b.id || 0);
        break;
      case "title":
        aValue = String(a.title || "").toLowerCase();
        bValue = String(b.title || "").toLowerCase();
        break;
      case "channel":
        aValue = String(a.channel || "").toLowerCase();
        bValue = String(b.channel || "").toLowerCase();
        break;
      case "type":
        aValue = getPortalTypeLabel(a.type, copy).toLowerCase();
        bValue = getPortalTypeLabel(b.type, copy).toLowerCase();
        break;
      case "status":
        aValue = resolvePortalStatusSortValue(a, copy);
        bValue = resolvePortalStatusSortValue(b, copy);
        break;
      case "priority":
        aValue = PORTAL_PRIORITY_ORDER[a.priority] ?? 99;
        bValue = PORTAL_PRIORITY_ORDER[b.priority] ?? 99;
        break;
      case "created_at":
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
        break;
      case "updated_at":
        aValue = new Date(a.updated_at || 0).getTime();
        bValue = new Date(b.updated_at || 0).getTime();
        break;
      case "rating":
        aValue = a.hasSatisfaction ? 1 : 0;
        bValue = b.hasSatisfaction ? 1 : 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }
    if (typeof aValue === "string" && typeof bValue === "string") {
      const cmp = aValue.localeCompare(bValue, undefined, {
        sensitivity: "base"
      });
      return cmp * factor;
    }
    if (aValue < bValue) return -1 * factor;
    if (aValue > bValue) return 1 * factor;
    return 0;
  });
  return rows;
}
