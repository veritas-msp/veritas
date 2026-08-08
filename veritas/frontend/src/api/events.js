import API_BASE_URL from "../config";
export async function fetchEvents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.clientId != null && filters.clientId !== "") {
    params.set("clientId", String(filters.clientId));
  }
  if (filters.ticketId != null && filters.ticketId !== "") {
    params.set("ticketId", String(filters.ticketId));
  }
  if (filters.upcoming) {
    params.set("upcoming", "true");
  }
  if (filters.recent) {
    params.set("recent", "true");
  }
  if (filters.limit != null) {
    params.set("limit", String(filters.limit));
  }
  if (filters.equipmentId != null && filters.equipmentId !== "") {
    params.set("equipmentId", String(filters.equipmentId));
  }
  if (filters.startDate) {
    params.set("startDate", String(filters.startDate));
  }
  if (filters.endDate) {
    params.set("endDate", String(filters.endDate));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/events${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: filters.signal
  });
  if (!response.ok) {
    throw new Error("Error fetching events");
  }
  return await response.json();
}
export async function createEvent(eventData) {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventData)
  });
  if (!response.ok) {
    const error = await response.json();
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map(e => e.msg || e.message).join(', ');
      throw new Error(errorMessages || "Validation error");
    }
    throw new Error(error.error || "Error creating event");
  }
  return await response.json();
}
export async function updateEvent(eventId, eventData) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error updating event");
  }
  return await response.json();
}
export async function deleteEvent(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error deleting event");
  }
  return await response.json();
}
