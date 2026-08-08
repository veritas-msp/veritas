import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/maintenance`;
export async function getMaintenanceStatus() {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error("Error fetching maintenance status");
  return await res.json();
}
export async function toggleMaintenance(enabled, message, options = {}) {
  const {
    tickerSpeed,
    tickerDirection,
    tickerColor
  } = options;
  const res = await fetch(`${BASE_URL}/toggle`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enabled,
      message,
      tickerSpeed,
      tickerDirection,
      tickerColor
    })
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || errorData.hint || "Error updating maintenance status");
  }
  return await res.json();
}
export async function getBackups() {
  const res = await fetch(`${BASE_URL}/backups`, {
    credentials: 'include'
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error("Error fetching backups");
  }
  return await res.json();
}
export async function createBackup() {
  const res = await fetch(`${BASE_URL}/backup`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error("Error creating backup");
  }
  return await res.json();
}
export async function restoreBackup(filename) {
  const res = await fetch(`${BASE_URL}/restore`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename
    })
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error("Error during restore");
  }
  return await res.json();
}
export async function deleteBackup(filename) {
  const res = await fetch(`${BASE_URL}/backup/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Error deleting backup");
  }
  return await res.json();
}
export async function uploadBackup(file) {
  const formData = new FormData();
  formData.append('backup', file);
  const res = await fetch(`${BASE_URL}/backup/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Error uploading backup");
  }
  return await res.json();
}
export async function getBackupPlan() {
  const res = await fetch(`${BASE_URL}/backup/plan`, {
    credentials: 'include'
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error("Error fetching backup plan");
  }
  return await res.json();
}
export async function saveBackupPlan(schedule, retentionDays) {
  const res = await fetch(`${BASE_URL}/backup/plan`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schedule,
      retention_days: retentionDays
    })
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error("Error saving plan");
  }
  return await res.json();
}
export async function deployApplication() {
  const res = await fetch(`${BASE_URL}/deploy`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error during deployment");
  }
  return await res.json();
}
