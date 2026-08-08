import API_BASE_URL from "../config";
async function handleJsonResponse(response, fallbackMessage) {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || payload?.message || fallbackMessage;
    throw new Error(message);
  }
  return payload;
}
export async function fetchNotifications({
  limit = 30,
  offset = 0,
  unreadOnly = false,
  archivedOnly = false,
  ticketId = null
} = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (unreadOnly) params.set("unreadOnly", "true");
  if (archivedOnly) params.set("archivedOnly", "true");
  if (ticketId) params.set("ticketId", ticketId);
  const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error fetching notifications");
}
export async function fetchUnreadNotificationCount() {
  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  const payload = await handleJsonResponse(response, "Error counting notifications");
  return Number(payload?.count) || 0;
}
export async function markNotificationRead(notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error updating notification");
}
export async function archiveNotification(notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/archive`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error archiving notification");
}
export async function markAllNotificationsRead(ticketId = null) {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ticketId ? {
      ticketId
    } : {})
  });
  return handleJsonResponse(response, "Error marking notifications");
}
export async function archiveAllNotifications(ticketId = null) {
  const response = await fetch(`${API_BASE_URL}/notifications/archive-all`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ticketId ? {
      ticketId
    } : {})
  });
  return handleJsonResponse(response, "Error archiving notifications");
}
export async function sendTestNotification(type = "ticket_commented", locale = "fr") {
  const response = await fetch(`${API_BASE_URL}/notifications/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type,
      locale
    })
  });
  return handleJsonResponse(response, "Error sending test notification");
}
export async function fetchNotificationPreferences() {
  const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error fetching preferences");
}
export async function saveNotificationPreferences(userPreferences) {
  const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userPreferences
    })
  });
  return handleJsonResponse(response, "Error saving preferences");
}
