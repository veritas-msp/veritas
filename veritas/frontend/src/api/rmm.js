import API_BASE_URL from "../config";
import { readApiErrorPayload, createApiError } from "../utils/apiErrors";
const jsonHeaders = {
  "Content-Type": "application/json"
};
function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
async function handleResponse(response) {
  const data = await readApiErrorPayload(response);
  if (!response.ok) {
    throw createApiError(data.error || `Error ${response.status}`, {
      code: data.code,
      status: response.status,
      agent_version: data.agent_version,
      latest_agent_version: data.latest_agent_version
    });
  }
  return data;
}
export async function fetchRmmSettings() {
  const response = await fetch(`${API_BASE_URL}/rmm/settings`, {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function fetchRmmMetricsStorage() {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/metrics-storage`, {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function updateRmmSettings(payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}
export async function fetchRmmTokenSettingsList() {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/tokens`, {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function fetchRmmTokenSettings(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/tokens/${tokenId}`, {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function updateRmmTokenSettings(tokenId, payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/tokens/${tokenId}`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}
export async function deleteRmmTokenSettings(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/tokens/${tokenId}`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function fetchRmmEnrollmentTokens(clientId, {
  status = "active"
} = {}) {
  const response = await fetch(withQuery(`${API_BASE_URL}/rmm/enrollment-tokens`, {
    clientId,
    status
  }), {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function createRmmEnrollmentToken(payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}
export async function updateRmmEnrollmentToken(tokenId, payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}
export async function revokeRmmEnrollmentToken(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function restoreRmmEnrollmentToken(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}/restore`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function deleteRmmEnrollmentTokenPermanently(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}/permanent`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function fetchRmmAgents(clientId, {
  signal
} = {}) {
  const response = await fetch(withQuery(`${API_BASE_URL}/rmm/agents`, {
    clientId
  }), {
    credentials: "include",
    headers: jsonHeaders,
    signal
  });
  return handleResponse(response);
}
export async function updateRmmAgentStatus(agentId, status) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      status
    })
  });
  return handleResponse(response);
}
export async function requestRmmAgentSync(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/request-sync`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function requestRmmAgentUpdate(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/request-update`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function requestRmmAgentHeartbeat(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/request-heartbeat`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function cancelRmmAgentUpdate(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/cancel-update`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function cancelRmmAgentSync(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/cancel-sync`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function fetchRmmMetricHistory(agentId, {
  metric = "disk_used_pct",
  dim,
  days = 90
} = {}) {
  const response = await fetch(withQuery(`${API_BASE_URL}/rmm/agents/${agentId}/metrics/history`, {
    metric,
    dim: dim == null || dim === "" ? undefined : dim,
    days
  }), {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
async function downloadRmmFile(path, fallbackFilename) {
  const url = `${API_BASE_URL}${path}`;
  const popup = window.open(url, "_blank");
  if (!popup) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fallbackFilename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  return {
    filename: fallbackFilename,
    version: null
  };
}
export async function fetchRmmInstallerInfo() {
  const response = await fetch(`${API_BASE_URL}/rmm/agent/installer-info`, {
    credentials: "include",
    headers: jsonHeaders
  });
  return handleResponse(response);
}
export async function downloadRmmWindowsAgentSetupMsi() {
  const cacheBust = Date.now();
  return downloadRmmFile(`/rmm/agent/download/windows/msi?v=${cacheBust}`, "VeritasAgent-Windows-Setup.msi");
}
