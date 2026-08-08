export function deriveSetupPortFromApiUrl(apiBaseUrl, fallback = 3001) {
  try {
    const url = new URL(String(apiBaseUrl || "").trim());
    if (url.port) return Number(url.port);
    return url.protocol === "https:" ? 443 : 80;
  } catch {
    return fallback;
  }
}
