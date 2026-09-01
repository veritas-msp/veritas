import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/client-office365`;
export async function getClientOffice365Credentials(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error fetching credentials");
  }
  return await res.json();
}
export function unwrapOffice365CredentialsList(result) {
  if (Array.isArray(result?.credentialsList)) return result.credentialsList;
  if (Array.isArray(result?.credentials)) return result.credentials;
  if (result?.credentials) return [result.credentials];
  return [];
}
export async function listClientOffice365Credentials(clientId) {
  const result = await getClientOffice365Credentials(clientId);
  return unwrapOffice365CredentialsList(result);
}
export async function saveClientOffice365Credentials(clientId, credentials) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error saving credentials");
  }
  return await res.json();
}
export async function deleteClientOffice365Credentials(clientId, credentialId = null) {
  const url = credentialId ? `${BASE_URL}/${clientId}/${credentialId}` : `${BASE_URL}/${clientId}`;
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error deleting credentials");
  }
  return await res.json();
}
export async function testClientOffice365Connection(clientId, credentialId = null) {
  const params = new URLSearchParams();
  if (credentialId) params.set("credentialId", String(credentialId));
  const query = params.toString();
  const res = await fetch(`${BASE_URL}/${clientId}/test${query ? `?${query}` : ""}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error testing connection");
  }
  return await res.json();
}
export async function testOffice365ConnectionWithCredentials(credentials) {
  const res = await fetch(`${BASE_URL}/test-credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error testing connection");
  }
  return await res.json();
}
export async function getClientSecretExpiration(clientId, credentialId = null) {
  const params = new URLSearchParams();
  if (credentialId) params.set("credentialId", String(credentialId));
  const query = params.toString();
  const res = await fetch(`${BASE_URL}/${clientId}/secret-expiration${query ? `?${query}` : ""}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error fetching expiration date");
  }
  return await res.json();
}
export async function getClientAzureStats(clientId) {
  const res = await fetch(`${API_BASE_URL}/office365/stats/saved/${clientId}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error fetching statistics");
  }
  return await res.json();
}
export async function getClientMfaDetails(clientId, options = {}) {
  const params = new URLSearchParams();
  if (options.refresh) params.set("refresh", "true");
  if (options.azureCredentialId) params.set("azureCredentialId", String(options.azureCredentialId));
  if (options.tenantId) params.set("tenantId", String(options.tenantId));
  const query = params.toString();
  const res = await fetch(`${API_BASE_URL}/office365/mfa-details/${clientId}${query ? `?${query}` : ""}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error fetching MFA details");
  }
  return await res.json();
}
