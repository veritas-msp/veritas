import API_BASE_URL from "../config";
export async function testGlobalBitdefenderIntegration({
  apiUrl,
  apiKey
}) {
  const res = await fetch(`${API_BASE_URL}/bitdefender/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      BITDEFENDER_API_URL: apiUrl,
      BITDEFENDER_API_KEY: apiKey
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
