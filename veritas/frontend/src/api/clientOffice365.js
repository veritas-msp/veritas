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
export async function deleteClientOffice365Credentials(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
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
export async function testClientOffice365Connection(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/test`, {
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
export async function getClientSecretExpiration(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/secret-expiration`, {
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
export async function getClientMfaDetails(clientId) {
  const res = await fetch(`${API_BASE_URL}/office365/mfa-details/${clientId}`, {
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
