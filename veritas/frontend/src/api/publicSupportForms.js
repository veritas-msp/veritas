import API_BASE_URL from "../config";

async function handleJsonResponse(response, fallbackMessage) {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const validationDetails = Array.isArray(payload?.errors)
      ? payload.errors.map(e => e.msg || e.message).filter(Boolean).join(", ")
      : null;
    const message = payload?.error || payload?.message || validationDetails || fallbackMessage;
    throw new Error(message);
  }
  return payload;
}

function publicFormUrl(slug, suffix = "") {
  const safeSlug = encodeURIComponent(String(slug || "").trim());
  return `${API_BASE_URL}/public/support-forms/${safeSlug}${suffix}`;
}

export async function fetchPublicSupportForm(slug, options = {}) {
  const response = await fetch(publicFormUrl(slug), {
    method: "GET",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  const data = await handleJsonResponse(response, "Form not found");
  return data?.form || data;
}

export async function fetchPublicSupportFormCaptcha(slug, options = {}) {
  const response = await fetch(publicFormUrl(slug, "/captcha"), {
    method: "GET",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error loading captcha");
}

export async function submitPublicSupportForm(slug, payload) {
  const response = await fetch(publicFormUrl(slug, "/submit"), {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error submitting form");
}
