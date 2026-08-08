import API_BASE_URL from "../config";
const BASE = `${API_BASE_URL}/equipment-files`;
export async function fetchEquipmentDocuments({
  equipmentId,
  clientId
} = {}) {
  const params = new URLSearchParams();
  if (equipmentId) params.set("equipmentId", equipmentId);
  if (clientId) params.set("clientId", clientId);
  const res = await fetch(`${BASE}?${params}`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
export async function uploadEquipmentDocument({
  clientId,
  equipmentId,
  equipmentType,
  equipmentName,
  category,
  description,
  file
}) {
  const form = new FormData();
  form.append("file", file);
  form.append("clientId", String(clientId));
  form.append("equipmentId", String(equipmentId));
  if (equipmentType) form.append("equipmentType", equipmentType);
  if (equipmentName) form.append("equipmentName", equipmentName);
  if (category) form.append("category", category);
  if (description) form.append("description", description);
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}
export async function deleteEquipmentDocument(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
export function getEquipmentDocumentPreviewUrl(id) {
  return `${BASE}/${id}/preview`;
}
export function getEquipmentDocumentDownloadUrl(id) {
  return `${BASE}/${id}/download`;
}
