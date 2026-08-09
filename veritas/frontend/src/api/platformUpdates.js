import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/system/updates`;

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function fetchUpdateStatus({ force = false } = {}) {
  const qs = force ? "?force=1" : "";
  const res = await fetch(`${BASE}/status${qs}`, { credentials: "include" });
  return parseJson(res);
}

export async function checkForUpdates() {
  const res = await fetch(`${BASE}/check`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  return parseJson(res);
}

export async function runUpdatePrecheck() {
  const res = await fetch(`${BASE}/precheck`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  return parseJson(res);
}

export async function createUpdateBackup() {
  const res = await fetch(`${BASE}/backup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  return parseJson(res);
}

export async function applyPlatformUpdate({
  targetTag = null,
  skipBackup = false,
  acknowledgeManualBackup = false
} = {}) {
  const res = await fetch(`${BASE}/apply`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetTag, skipBackup, acknowledgeManualBackup })
  });
  return parseJson(res);
}

export async function fetchUpdateJob(jobId) {
  const res = await fetch(`${BASE}/job/${encodeURIComponent(jobId)}`, {
    credentials: "include"
  });
  return parseJson(res);
}
