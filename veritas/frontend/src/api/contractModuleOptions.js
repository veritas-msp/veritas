import API_BASE_URL from "../config";
const BASE = `${API_BASE_URL}/contract-module-options`;
async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Server error");
  return data;
}
export async function fetchContractModuleOptions({
  includeDisabled = false
} = {}) {
  const params = includeDisabled ? "?includeDisabled=1" : "";
  const res = await fetch(`${BASE}${params}`, {
    credentials: "include"
  });
  return parseJson(res);
}
export async function fetchContractModuleOptionsAdmin() {
  const res = await fetch(`${BASE}/admin`, {
    credentials: "include"
  });
  return parseJson(res);
}
export async function createContractModuleOption(payload) {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}
export async function updateContractModuleOption(id, payload) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}
export async function deleteContractModuleOption(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  return parseJson(res);
}
export async function resetContractModuleOptions() {
  const res = await fetch(`${BASE}/reset`, {
    method: "POST",
    credentials: "include"
  });
  return parseJson(res);
}
