import { toast } from "react-toastify";
import { fetchRandomTicket } from "../../api/tickets";
const PLAY_MODE_STORAGE_KEY = "veritas_ticket_play_mode";
export function isTicketPlayModeEnabled() {
  try {
    return sessionStorage.getItem(PLAY_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
export function setTicketPlayModeEnabled(enabled) {
  try {
    if (enabled) sessionStorage.setItem(PLAY_MODE_STORAGE_KEY, "1");else sessionStorage.removeItem(PLAY_MODE_STORAGE_KEY);
  } catch {}
}
export async function navigateToRandomTicket(onNavigate, {
  excludeTicketId,
  enablePlayMode = false,
  showToast = true
} = {}) {
  if (enablePlayMode) setTicketPlayModeEnabled(true);
  try {
    const filters = excludeTicketId ? {
      excludeId: excludeTicketId
    } : {};
    const ticket = await fetchRandomTicket(filters);
    onNavigate?.("TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title
    });
    if (showToast) {
      toast.success(enablePlayMode ? `Random mode · ticket #${ticket.ticket_number || ticket.id}` : `Ticket #${ticket.ticket_number || ticket.id}`);
    }
    return ticket;
  } catch (error) {
    if (enablePlayMode && !excludeTicketId) setTicketPlayModeEnabled(false);
    if (showToast) {
      toast.error(error.message || "No ticket to do");
    }
    throw error;
  }
}
export async function advanceToNextRandomTicket(onNavigate, excludeTicketId) {
  if (!isTicketPlayModeEnabled()) return null;
  try {
    return await navigateToRandomTicket(onNavigate, {
      excludeTicketId,
      showToast: true
    });
  } catch {
    setTicketPlayModeEnabled(false);
    toast.info("No more tickets to do · random mode finished");
    return null;
  }
}
