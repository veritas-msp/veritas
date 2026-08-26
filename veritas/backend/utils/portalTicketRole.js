export const PORTAL_TICKET_ROLES = ["user", "supervisor"];

export function normalizePortalTicketRole(value) {
  return String(value || "").trim().toLowerCase() === "supervisor" ? "supervisor" : "user";
}

export function isPortalSupervisor(value) {
  return normalizePortalTicketRole(value) === "supervisor";
}
