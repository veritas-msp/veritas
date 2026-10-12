import API_BASE_URL from "../config";

async function handleJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `Error ${res.status}`);
  }
  return data;
}

export async function fetchReportBranding() {
  const res = await fetch(`${API_BASE_URL}/report-branding`, {
    credentials: "include"
  });
  const data = await handleJson(res);
  return data.branding || null;
}

export async function fetchReportBrandingAdmin() {
  const res = await fetch(`${API_BASE_URL}/report-branding/admin`, {
    credentials: "include"
  });
  return handleJson(res);
}

export async function updateReportBranding(payload) {
  const res = await fetch(`${API_BASE_URL}/report-branding`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return handleJson(res);
}

/** kind: "logo" | "footer-logo" */
export async function uploadReportBrandingAsset(kind, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/report-branding/assets/${kind}`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  return handleJson(res);
}

export async function deleteReportBrandingAsset(kind) {
  const res = await fetch(`${API_BASE_URL}/report-branding/assets/${kind}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleJson(res);
}
