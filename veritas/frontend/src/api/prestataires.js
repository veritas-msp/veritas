import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/prestataires`;

export async function fetchPrestataires(clientId = null, options = {}) {
  const url = clientId ? `${BASE_URL}?client_id=${clientId}` : BASE_URL;
  const res = await fetch(url, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error fetching providers");
  return await res.json();
}

export async function fetchPrestatairesList(clientId = null, options = {}) {
  const params = new URLSearchParams();
  if (clientId != null && clientId !== "") {
    params.set("client_id", String(clientId));
  }
  params.set("_", String(Date.now()));
  const query = params.toString();
  const url = `${BASE_URL}/list${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    credentials: "include",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.details || errorData.error || "Error fetching provider list";
    throw new Error(message);
  }
  return await res.json();
}

export async function fetchPrestataire(prestataireId, options = {}) {
  const res = await fetch(`${BASE_URL}/${prestataireId}`, {
    credentials: "include",
    signal: options.signal,
    cache: "no-store"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error fetching provider");
  }
  return await res.json();
}

export async function addPrestataire(prestataire) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(prestataire)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error adding provider");
  }
  return await res.json();
}

export async function updatePrestataire(prestataireId, prestataire) {
  const res = await fetch(`${BASE_URL}/${prestataireId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(prestataire)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error updating provider");
  }
  return await res.json();
}

export async function deletePrestataire(prestataireId) {
  const res = await fetch(`${BASE_URL}/${prestataireId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error deleting provider");
  }
  return await res.json();
}

export async function addPrestataireMembership(prestataireId, { client_id } = {}) {
  const res = await fetch(`${BASE_URL}/${prestataireId}/memberships`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error adding company membership");
  }
  return await res.json();
}

export async function removePrestataireMembership(prestataireId, clientId) {
  const res = await fetch(`${BASE_URL}/${prestataireId}/memberships/${clientId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error removing company membership");
  }
  return await res.json();
}
