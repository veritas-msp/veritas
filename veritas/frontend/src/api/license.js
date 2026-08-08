import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/license`;
async function parseError(res, fallbackCode) {
  const data = await res.json().catch(() => ({}));
  const error = new Error(fallbackCode);
  error.code = data.error || data.code || fallbackCode;
  error.payload = data;
  throw error;
}
export async function getLicenseStatus() {
  const res = await fetch(BASE_URL, {
    credentials: "include"
  });
  if (!res.ok) {
    if (res.status === 401) {
      const error = new Error("SESSION_EXPIRED");
      error.code = "SESSION_EXPIRED";
      throw error;
    }
    await parseError(res, "LOAD_FAILED");
  }
  return res.json();
}
export async function activateLicense(licenseKey) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      licenseKey
    })
  });
  if (!res.ok) {
    if (res.status === 401) {
      const error = new Error("SESSION_EXPIRED");
      error.code = "SESSION_EXPIRED";
      throw error;
    }
    await parseError(res, "ACTIVATE_FAILED");
  }
  return res.json();
}
export async function refreshLicenseStatus() {
  const res = await fetch(`${BASE_URL}/refresh`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) {
    if (res.status === 401) {
      const error = new Error("SESSION_EXPIRED");
      error.code = "SESSION_EXPIRED";
      throw error;
    }
    await parseError(res, "REFRESH_FAILED");
  }
  return res.json();
}
