import API_BASE_URL from "../config";
export async function testGlobalMailinblackIntegration({
  apiUrl,
  apiKey,
  authKey,
  authClientId
}) {
  const res = await fetch(`${API_BASE_URL}/mailinblack/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      MAILINBLACK_API_URL: apiUrl,
      MAILINBLACK_API_KEY: authKey || apiKey,
      MAILINBLACK_CLIENT_ID: authClientId,
      authClientId
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const message = data.error || data.details || "Connection test failed";
    const err = new Error(message);
    err.details = data.details || null;
    throw err;
  }
  return data;
}
