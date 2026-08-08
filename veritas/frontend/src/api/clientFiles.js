import API_BASE_URL from "../config";
const BASE = `${API_BASE_URL}/client-files`;
export async function fetchClientFiles({
  clientId,
  category
} = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (category && category !== "all") params.set("category", category);
  const res = await fetch(`${BASE}?${params}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Error ${res.status}`);
    if (err.code) error.code = err.code;
    throw error;
  }
  return res.json();
}
export async function uploadClientFile({
  clientId,
  clientName,
  category,
  description,
  file,
  visibleToClient = false
}) {
  const form = new FormData();
  form.append("file", file);
  form.append("clientId", String(clientId));
  if (clientName) form.append("clientName", clientName);
  if (category) form.append("category", category);
  if (description) form.append("description", description);
  if (visibleToClient) form.append("visibleToClient", "true");
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}
export async function deleteClientFile(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
export async function updateClientFile(id, {
  description,
  visibleToClient
} = {}) {
  const body = {};
  if (description !== undefined) body.description = description;
  if (visibleToClient !== undefined) body.visibleToClient = visibleToClient;
  if (!Object.keys(body).length) {
    throw new Error("No data to update.");
  }
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}
export async function updateClientFileDescription(id, description) {
  return updateClientFile(id, {
    description
  });
}
export function getPreviewUrl(id) {
  return `${BASE}/${id}/preview`;
}
export function getDownloadUrl(id) {
  return `${BASE}/${id}/download`;
}
