import API_BASE_URL from "../config";
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}
export async function fetchSupervisionAlertRules() {
  const response = await fetch(`${API_BASE_URL}/supervision/alert-rules`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}
export async function updateSupervisionAlertRules(rules) {
  const response = await fetch(`${API_BASE_URL}/supervision/alert-rules`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rules
    })
  });
  return handleResponse(response);
}
