import API_BASE_URL from "../config";

/** Readable by any authenticated user, unlike the admin-only settings endpoint. */
export async function fetchCheckMKIntegrationStatus() {
  const response = await fetch(`${API_BASE_URL}/checkmk/integration-status`, {
    method: "GET",
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
