import API_BASE_URL from "../config";
async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}
export async function fetchPortalTickets(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit) params.set("limit", String(Math.min(Math.max(Number(filters.limit) || 1, 1), 200)));
  if (filters.offset) params.set("offset", String(filters.offset));
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets${query ? `?${query}` : ""}`, {
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error fetching tickets.");
  return Array.isArray(data?.tickets) ? data.tickets : [];
}
export async function fetchPortalTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets/${ticketId}`, {
    credentials: "include"
  });
  return handleJsonResponse(response, "Error fetching ticket.");
}
export async function createPortalTicket(payload) {
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleJsonResponse(response, "Error creating ticket.");
}
export async function addPortalTicketComment(ticketId, {
  content,
  files = []
}) {
  const formData = new FormData();
  if (content) formData.append("content", content);
  files.forEach(file => formData.append("attachments", file));
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  return handleJsonResponse(response, "Error sending message.");
}
export async function updatePortalTicketComment(ticketId, commentId, content) {
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets/${ticketId}/comments/${commentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content
    })
  });
  return handleJsonResponse(response, "Error updating message.");
}
export async function submitPortalTicketSatisfaction(ticketId, {
  ratings,
  rating,
  message = ""
}) {
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets/${ticketId}/satisfaction`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ratings,
      rating,
      message
    })
  });
  return handleJsonResponse(response, "Error sending feedback.");
}
export async function updatePortalTicketSatisfaction(ticketId, {
  ratings,
  rating,
  message = ""
}) {
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets/${ticketId}/satisfaction`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ratings,
      rating,
      message
    })
  });
  return handleJsonResponse(response, "Error updating feedback.");
}
export async function validatePortalTicketResolution(ticketId, {
  accepted,
  message = ""
}) {
  const response = await fetch(`${API_BASE_URL}/client-portal/tickets/${ticketId}/validate-resolution`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accepted,
      message
    })
  });
  return handleJsonResponse(response, "Error saving your reply.");
}
export async function fetchPortalDashboard() {
  const response = await fetch(`${API_BASE_URL}/client-portal/dashboard`, {
    credentials: "include"
  });
  return handleJsonResponse(response, "Error loading dashboard.");
}
