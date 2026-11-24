import API_BASE_URL from "../config";

async function readError(response, fallback) {
  const data = await response.json().catch(() => ({}));
  const error = new Error(data.error || fallback);
  error.status = response.status;
  return error;
}

export async function getClientImpactMap(clientId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/clients/${encodeURIComponent(clientId)}/impact-map`, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) throw await readError(response, "Error retrieving impact map");
  const data = await response.json();
  return {
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    edges: Array.isArray(data?.edges) ? data.edges : []
  };
}

export async function saveClientImpactMap(clientId, graph, options = {}) {
  const response = await fetch(`${API_BASE_URL}/clients/${encodeURIComponent(clientId)}/impact-map`, {
    method: "PUT",
    credentials: "include",
    signal: options.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph)
  });
  if (!response.ok) throw await readError(response, "Error saving impact map");
  return response.json();
}
