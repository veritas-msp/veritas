import API_BASE_URL from "../config";
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}
export function resolveEquipmentFamilyForAlerts(type) {
  if (!type) return null;
  const raw = String(type).trim();
  if (raw.startsWith("Custom:")) {
    return `custom:${raw.slice("Custom:".length)}`;
  }
  const map = {
    Ordinateurs: "ordinateurs",
    Serveurs: "servers",
    NAS: "stockage",
    Stockage: "stockage",
    Firewalls: "firewall",
    Switch: "switch",
    BorneWifi: "wifi",
    Alimentation: "alimentation",
    Routeur: "routeur",
    TOIP: "toip",
    Internet: "internet"
  };
  return map[raw] || raw.toLowerCase();
}
export async function fetchEquipmentAlertSettings(clientId, equipmentId, family) {
  const url = new URL(`${API_BASE_URL}/equipment-monitoring-alerts/${clientId}/${encodeURIComponent(equipmentId)}`);
  url.searchParams.set("family", family);
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}
export async function fetchClientEquipmentAlerts(clientId) {
  const response = await fetch(`${API_BASE_URL}/equipment-monitoring-alerts/by-client/${clientId}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}
export async function updateEquipmentAlertSuspension(clientId, equipmentId, payload) {
  const response = await fetch(`${API_BASE_URL}/equipment-monitoring-alerts/${clientId}/${encodeURIComponent(equipmentId)}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}
