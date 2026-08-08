import API_BASE_URL from "../config";
const jsonHeaders = {
  "Content-Type": "application/json"
};
async function parseError(res) {
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || data.message || `Error ${res.status}`);
}
export async function fetchContactPortal(contactId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/portal`, {
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function createContactPortal(contactId, password) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/portal`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      password
    })
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function setContactPortalActive(contactId, isActive) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/portal`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      is_active: isActive
    })
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function resetContactPortalPassword(contactId, newPassword) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/portal/password`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      newPassword
    })
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function deleteContactPortal(contactId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/portal`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function impersonateContactPortal(contactId, {
  signal
} = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/portal/impersonate`, {
    method: "POST",
    credentials: "include",
    signal
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function stopPortalImpersonation() {
  const res = await fetch(`${API_BASE_URL}/auth/impersonate/stop`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function fetchClientPortalUsers() {
  const res = await fetch(`${API_BASE_URL}/client-portal-users`, {
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function fetchClientPortalUsage() {
  const res = await fetch(`${API_BASE_URL}/contacts/portal/usage`, {
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function setClientPortalUserActive(userId, isActive) {
  const res = await fetch(`${API_BASE_URL}/client-portal-users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      is_active: isActive
    })
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function resetClientPortalUserPassword(userId, newPassword) {
  const res = await fetch(`${API_BASE_URL}/client-portal-users/${userId}/password`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      newPassword
    })
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function deleteClientPortalUser(userId) {
  const res = await fetch(`${API_BASE_URL}/client-portal-users/${userId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export function getPortalStatusFromContact(contact) {
  if (!contact?.portal_user_id) return "none";
  return contact.portal_active ? "active" : "inactive";
}
