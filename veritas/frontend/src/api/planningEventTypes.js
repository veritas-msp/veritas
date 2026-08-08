import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/planning-event-types`;

export async function fetchPlanningEventTypes(options = {}) {
  const includeDisabled = options.includeDisabled ? "?includeDisabled=1" : "";
  const path = options.admin ? `${BASE_URL}/admin` : `${BASE_URL}${includeDisabled}`;
  const res = await fetch(path, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Error ${res.status} planning-event-types`);
  }
  const data = await res.json();
  return data.types || [];
}

export async function createPlanningEventType(payload) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error creating event type");
  }
  return res.json();
}

export async function updatePlanningEventType(id, payload) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error updating event type");
  }
  return res.json();
}

export async function deletePlanningEventType(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error deleting event type");
  }
  return res.json();
}

export async function resetPlanningEventTypes() {
  const res = await fetch(`${BASE_URL}/reset`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error resetting event types");
  }
  return res.json();
}
