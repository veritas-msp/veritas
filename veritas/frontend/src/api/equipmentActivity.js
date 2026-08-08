import API_BASE_URL from "../config";
export async function fetchEquipmentActivity({
  equipmentId,
  clientId,
  startDate,
  endDate,
  signal
} = {}) {
  const params = new URLSearchParams();
  if (clientId != null && clientId !== "") params.set("clientId", String(clientId));
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/equipment/${encodeURIComponent(equipmentId)}/activity${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Error loading device activity");
  }
  return response.json();
}
