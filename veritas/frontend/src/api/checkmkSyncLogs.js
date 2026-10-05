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

export async function fetchCheckmkSyncRun(runId) {
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-logs/${encodeURIComponent(runId)}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}

export async function fetchActiveCheckmkSyncRun() {
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-logs/active`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}

export async function fetchCheckmkSyncStatus() {
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-status`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}

export async function triggerCheckmkFleetSync({
  force = false,
  wait = false,
  startedBy = null
} = {}) {
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-logs/run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      force,
      wait,
      ...(startedBy ? { startedBy } : {})
    })
  });
  return handleResponse(response);
}

export async function cancelCheckmkFleetSync(runId, { cancelledBy = null } = {}) {
  if (!runId) throw new Error("Missing sync run id");
  const response = await fetch(`${API_BASE_URL}/checkmk/sync-logs/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...(cancelledBy ? { cancelledBy } : {})
    })
  });
  return handleResponse(response);
}

export async function pollCheckmkSyncRun(runId, {
  intervalMs = 1200,
  timeoutMs = 15 * 60 * 1000,
  onUpdate,
  shouldStop
} = {}) {
  if (!runId) throw new Error("Missing sync run id");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (shouldStop?.()) return null;
    const data = await fetchCheckmkSyncRun(runId);
    const run = data?.run || null;
    onUpdate?.(run);
    if (!run || run.status !== "running") {
      return run;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error("Sync timed out");
}
