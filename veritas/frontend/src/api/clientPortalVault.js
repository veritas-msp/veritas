import API_BASE_URL from "../config";
const BASE = `${API_BASE_URL}/client-portal/vault-files`;
async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}
export async function fetchPortalVaultFiles({
  category,
  search,
  limit,
  offset
} = {}) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (search) params.set("search", search);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const query = params.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ""}`, {
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error fetching documents.");
  return {
    files: Array.isArray(data?.files) ? data.files : [],
    total: Number(data?.total) || 0
  };
}
export function getPortalVaultPreviewUrl(fileId) {
  return `${BASE}/${fileId}/preview`;
}
export function getPortalVaultDownloadUrl(fileId) {
  return `${BASE}/${fileId}/download`;
}
const SECRETS_BASE = `${API_BASE_URL}/client-portal/vault-secrets`;
export async function fetchPortalVaultSecrets() {
  const response = await fetch(SECRETS_BASE, {
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error fetching access entries.");
  return {
    secrets: Array.isArray(data?.secrets) ? data.secrets : [],
    total: Number(data?.total) || 0
  };
}
export async function revealPortalVaultSecret(secretId) {
  const response = await fetch(`${SECRETS_BASE}/${secretId}/reveal`, {
    method: "POST",
    credentials: "include"
  });
  return handleJsonResponse(response, "Unable to display this access.");
}
export async function requestPortalVaultSecretRevocation(secretId) {
  const response = await fetch(`${SECRETS_BASE}/${secretId}/request-revocation`, {
    method: "POST",
    credentials: "include"
  });
  return handleJsonResponse(response, "Unable to delete this access.");
}
export const VAULT_CATEGORIES = ["Facture", "Notice / Guide", "Rapport", "Contrat", "Procédure", "Autre"];
