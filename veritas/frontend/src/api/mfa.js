import API_BASE_URL from "../config";
export async function setupMfa() {
  const res = await fetch(`${API_BASE_URL}/auth/mfa/setup`, {
    method: "POST",
    credentials: "include"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "MFA configuration error");
  return data;
}
export async function verifyMfa(code) {
  const res = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      code
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid code");
  return data;
}
export async function validateMfaLogin(mfaToken, code) {
  const res = await fetch(`${API_BASE_URL}/auth/mfa/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      mfaToken,
      code
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid code");
  return data;
}
