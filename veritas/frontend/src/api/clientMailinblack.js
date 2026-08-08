import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/client-mailinblack`;
const MAILINBLACK_URL = `${API_BASE_URL}/mailinblack`;
export async function getGlobalMailinblackStatus() {
  const res = await fetch(`${BASE_URL}/global-status`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error verifying configuration");
  }
  return res.json();
}
export async function listClientMailinblackTenants(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error fetching tenants");
  }
  return res.json();
}
export async function createClientMailinblackTenant(clientId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error creating tenant");
  }
  return res.json();
}
export async function updateClientMailinblackTenant(clientId, tenantId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/${tenantId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error updating tenant");
  }
  return res.json();
}
export async function deleteClientMailinblackTenant(clientId, tenantId) {
  const res = await fetch(`${BASE_URL}/${clientId}/${tenantId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error deleting tenant");
  }
  return res.json();
}
export async function testMailinblackCredentials({
  apiUrl,
  apiKey,
  authKey,
  authClientId
}) {
  const res = await fetch(`${BASE_URL}/test-credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      apiUrl,
      authKey: authKey || apiKey,
      authClientId
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Connection test failed");
  }
  return res.json();
}
export async function testClientMailinblackTenant(clientId, tenantId) {
  const res = await fetch(`${BASE_URL}/${clientId}/${tenantId}/test`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Connection test failed");
  }
  return res.json();
}
export function buildMailinblackQueryParams(credentialContext = {}) {
  const params = new URLSearchParams();
  if (credentialContext.clientId) params.set("clientId", credentialContext.clientId);
  if (credentialContext.mailinblackTenantId) {
    params.set("mailinblackTenantId", credentialContext.mailinblackTenantId);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
export async function fetchMailinblackCustomers(credentialContext = {}) {
  const res = await fetch(`${MAILINBLACK_URL}/customers${buildMailinblackQueryParams(credentialContext)}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Unable to load Mailinblack clients");
  }
  return res.json();
}
export async function syncMailinblackCustomer(customerId, credentialContext = {}) {
  const res = await fetch(`${MAILINBLACK_URL}/sync/${encodeURIComponent(customerId)}${buildMailinblackQueryParams(credentialContext)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({})
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Mailinblack sync failed");
  }
  return res.json();
}
export async function fetchMailinblackDashboard(customerId, credentialContext = {}) {
  const res = await fetch(`${MAILINBLACK_URL}/dashboard/${encodeURIComponent(customerId)}${buildMailinblackQueryParams(credentialContext)}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Unable to load Mailinblack dashboard");
  }
  const json = await res.json();
  return json.dashboard;
}
