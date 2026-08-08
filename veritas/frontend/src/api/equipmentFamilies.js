import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/equipment-families`;
export async function fetchEquipmentFamilies(options = {}) {
  const includeDisabled = options.includeDisabled ? "?includeDisabled=1" : "";
  const path = options.admin ? `${BASE_URL}/admin` : `${BASE_URL}${includeDisabled}`;
  const res = await fetch(path, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Error ${res.status} equipment-families`);
  }
  const data = await res.json();
  return data.families || [];
}
export async function createEquipmentFamily(payload) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error creating family");
  }
  return res.json();
}
export async function updateEquipmentFamily(id, payload) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error updating family");
  }
  return res.json();
}
export async function deleteEquipmentFamily(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error deleting family");
  }
  return res.json();
}
export function buildCustomFamilyType(familyKey) {
  return `Custom:${familyKey}`;
}
export function parseCustomFamilyType(type) {
  if (!type || !String(type).startsWith("Custom:")) return null;
  return String(type).slice("Custom:".length);
}
