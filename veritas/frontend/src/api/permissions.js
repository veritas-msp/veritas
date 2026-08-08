import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/permissions`;
const jsonHeaders = {
  "Content-Type": "application/json"
};

async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || fallbackMessage);
  }
  return data;
}

export async function fetchPermissionsCatalog() {
  const response = await fetch(`${BASE_URL}/catalog`, {
    method: "GET",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleJsonResponse(response, "Error loading permissions catalog");
}

export async function fetchMyPermissions() {
  const response = await fetch(`${BASE_URL}/me`, {
    method: "GET",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleJsonResponse(response, "Error loading permissions");
}

export async function fetchPermissionsMatrix() {
  const response = await fetch(`${BASE_URL}/matrix`, {
    method: "GET",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleJsonResponse(response, "Error loading permissions matrix");
}

export async function updatePermissionsMatrix(permissionsByProfile) {
  const response = await fetch(`${BASE_URL}/matrix`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      permissionsByProfile
    })
  });
  return handleJsonResponse(response, "Error saving permissions matrix");
}

export async function fetchProfilePermissions(profileName) {
  const name = encodeURIComponent(String(profileName || "").trim());
  const response = await fetch(`${BASE_URL}/profiles/${name}`, {
    method: "GET",
    credentials: "include",
    headers: jsonHeaders
  });
  return handleJsonResponse(response, "Error loading profile permissions");
}

export async function updateProfilePermissions(profileName, permissions) {
  const name = encodeURIComponent(String(profileName || "").trim());
  const response = await fetch(`${BASE_URL}/profiles/${name}`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      permissions
    })
  });
  return handleJsonResponse(response, "Error saving profile permissions");
}
