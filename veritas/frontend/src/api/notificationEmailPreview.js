import API_BASE_URL from "../config";

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.details || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

/** Send a rendered notification email preview to an address (defaults to current user on server). */
export async function sendNotificationEmailPreview({
  to,
  subject,
  title,
  htmlContent,
  sampleContext = true
} = {}) {
  const response = await fetch(`${API_BASE_URL}/notifications/email-preview-test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: to || undefined,
      subject: subject || "",
      title: title || subject || "Aperçu Veritas",
      htmlContent: htmlContent || "",
      sampleContext: sampleContext !== false
    })
  });
  return parseJson(response);
}

/** Upload an image for use in notification emails (public URL). */
export async function uploadNotificationEmailAsset(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/notifications/email-assets`, {
    method: "POST",
    credentials: "include",
    body: form
  });
  return parseJson(response);
}
