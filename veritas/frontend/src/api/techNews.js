import API_BASE_URL from "../config";

export async function fetchTechNews(options = {}) {
  const res = await fetch(`${API_BASE_URL}/tech-news`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error loading news");
  return res.json();
}
