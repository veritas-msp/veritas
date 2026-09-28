import API_BASE_URL from "../config";

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}

export async function fetchCheckmkSyncLogs(limit = 40) {
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-logs?limit=${encodeURIComponent(limit)}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}

export async function triggerCheckmkFleetSync({ force = false } = {}) {
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-logs/run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ force })
  });
  return handleResponse(response);
}
