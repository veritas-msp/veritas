import API_BASE_URL from "../config";

async function handleTestResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const message = data.error || data.message || data.details || `Error ${res.status}`;
    const err = new Error(message);
    err.details = data.details && data.details !== message ? data.details : null;
    throw err;
  }
  return data;
}

export async function testCheckmkConnection() {
  const res = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
    method: "GET",
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || data.message || data.details || `Error ${res.status}`;
    const err = new Error(message);
    err.details = data.details && data.details !== message ? data.details : null;
    throw err;
  }
  const hosts = Array.isArray(data) ? data : data.hosts || data.value || [];
  const count = Array.isArray(hosts) ? hosts.length : Number(data.count) || 0;
  return {
    success: true,
    message: "Checkmk connection OK",
    hostsCount: count,
    hosts: Array.isArray(hosts) ? hosts.slice(0, 20) : []
  };
}

export async function testWhatsappConnection() {
  const res = await fetch(`${API_BASE_URL}/whatsapp/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  return handleTestResponse(res);
}
