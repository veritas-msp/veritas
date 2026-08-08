import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/clients/general`;
export async function fetchClients() {
  const res = await fetch(BASE_URL, {
    credentials: 'include'
  });
  if (!res.ok) throw new Error("Error fetching clients");
  return await res.json();
}
export async function addClient(client) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(client)
  });
  if (!res.ok) throw new Error("Error adding client");
  return await res.json();
}
export async function deleteClient(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: 'include'
  });
  if (!res.ok) throw new Error("Error deleting client");
  return await res.json();
}
export async function updateClient(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error("Error updating client");
  return await res.json();
}
