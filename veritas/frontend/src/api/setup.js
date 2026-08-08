import API_BASE_URL from "../config";
function createSetupApiError(data, res) {
  const err = new Error(data.error || data.details || "Network error");
  err.code = data.code || (Array.isArray(data.errors) && data.errors.length > 0 ? "SETUP_VALIDATION_FAILED" : null) || (res.status >= 500 ? "NETWORK_ERROR" : null);
  err.status = res.status;
  return err;
}
async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw createSetupApiError(data, res);
  }
  return data;
}
export async function getSetupStatus() {
  const res = await fetch(`${API_BASE_URL}/setup/status`);
  return parseJson(res);
}
export async function generateSetupSecrets() {
  const res = await fetch(`${API_BASE_URL}/setup/generate-secrets`);
  return parseJson(res);
}
export async function saveSetupEnv(payload) {
  const res = await fetch(`${API_BASE_URL}/setup/env`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}
export async function saveSetupDatabase(payload) {
  const res = await fetch(`${API_BASE_URL}/setup/database`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}
export async function getSetupMigrationProgress() {
  const res = await fetch(`${API_BASE_URL}/setup/migrations/pending`);
  return parseJson(res);
}
export async function runSetupMigrations() {
  const res = await fetch(`${API_BASE_URL}/setup/migrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return parseJson(res);
}
export async function runSetupMigrationStep() {
  const res = await fetch(`${API_BASE_URL}/setup/migrate?stepByStep=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stepByStep: true
    })
  });
  return parseJson(res);
}
export async function createSetupAdmin(payload) {
  const res = await fetch(`${API_BASE_URL}/setup/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}
export async function setupSetupAdminMfa() {
  const res = await fetch(`${API_BASE_URL}/setup/admin/mfa/setup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return parseJson(res);
}
export async function verifySetupAdminMfa(code) {
  const res = await fetch(`${API_BASE_URL}/setup/admin/mfa/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code
    })
  });
  return parseJson(res);
}
