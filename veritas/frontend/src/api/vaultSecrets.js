import API_BASE_URL from "../config";
const BASE = `${API_BASE_URL}/vault-secrets`;
async function parseError(res) {
  const data = await res.json().catch(() => ({}));
  const error = new Error(data.error || `Error ${res.status}`);
  if (data.code) error.code = data.code;
  throw error;
}
export async function fetchVaultSecrets(contactId) {
  const params = new URLSearchParams({
    contactId: String(contactId)
  });
  const res = await fetch(`${BASE}?${params}`, {
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
export async function createVaultSecret(payload) {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export async function revokeVaultSecret(secretId) {
  const res = await fetch(`${BASE}/${secretId}/revoke`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
export const VAULT_SECRET_AVAILABILITY_LABELS = {
  active: "Actif",
  expired: "Expired",
  exhausted: "Views exhausted",
  revoked: "Revoked",
  deletion_requested: "Deletion requested"
};
