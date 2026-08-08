import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/office365`;
export async function fetchOffice365Licences(clientId = null) {
  const url = clientId ? `${BASE_URL}/licences?clientId=${clientId}` : `${BASE_URL}/licences`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching licenses"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Users(clientId = null, options = {}) {
  const {
    page = 1,
    pageSize = 100,
    filter = null
  } = options;
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  if (page) params.append("page", page);
  if (pageSize) params.append("pageSize", pageSize);
  if (filter) params.append("filter", filter);
  const url = `${BASE_URL}/users?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching users"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Data(clientId = null) {
  const url = clientId ? `${BASE_URL}/sync-all?clientId=${clientId}` : `${BASE_URL}/sync-all`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok || !raw.success) {
    const errorMessage = raw.error || raw.message || "Error syncing Office 365";
    throw new Error(errorMessage);
  }
  const snapshot = raw.data || {};
  return {
    success: true,
    licences: snapshot.licences || [],
    users: snapshot.users || [],
    adoptionScore: snapshot.adoptionScore || null,
    lastUpdate: raw.lastUpdate || snapshot.lastUpdate || null
  };
}
export async function testOffice365Connection(clientId = null) {
  const url = clientId ? `${BASE_URL}/test?clientId=${clientId}` : `${BASE_URL}/test`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error testing connection"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Stats(clientId = null) {
  const url = clientId ? `${BASE_URL}/stats?clientId=${clientId}` : `${BASE_URL}/stats`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching statistics"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Exchange(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append('clientId', clientId);
  params.append('period', period);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const url = `${BASE_URL}/exchange?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching Exchange data"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Teams(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const url = `${BASE_URL}/teams?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching Teams data"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365OneDrive(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const url = `${BASE_URL}/onedrive?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching OneDrive data"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365SharePoint(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const url = `${BASE_URL}/sharepoint?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching SharePoint data"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Security(clientId = null) {
  const url = clientId ? `${BASE_URL}/security?clientId=${clientId}` : `${BASE_URL}/security`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching security data"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Applications(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const url = `${BASE_URL}/applications?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching application data"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
export async function fetchOffice365Alerts(clientId = null) {
  const url = clientId ? `${BASE_URL}/alerts?clientId=${clientId}` : `${BASE_URL}/alerts`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: "Error fetching alerts"
    }));
    throw new Error(error.error || `HTTP error: ${res.status}`);
  }
  return await res.json();
}
