import API_BASE_URL from "../config";

export async function fetchGlobalSearch(query, options = {}) {
  const q = String(query || "").trim();
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    signal: options.signal
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Error searching");
  }
  return {
    query: payload?.query || q,
    results: Array.isArray(payload?.results) ? payload.results : []
  };
}
