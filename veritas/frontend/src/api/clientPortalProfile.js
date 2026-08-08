import API_BASE_URL from "../config";
async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}
export async function fetchPortalContact() {
  const response = await fetch(`${API_BASE_URL}/client-portal/contact`, {
    credentials: "include"
  });
  return handleJsonResponse(response, "Error fetching contact.");
}
export async function updatePortalContact(communications) {
  const response = await fetch(`${API_BASE_URL}/client-portal/contact`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      communications
    })
  });
  return handleJsonResponse(response, "Error updating contact.");
}
