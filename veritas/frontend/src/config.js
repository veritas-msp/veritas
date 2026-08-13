const getApiBaseUrl = () => {
  // Explicit env wins. Empty string = same-origin (/api) for monorepo/prod.
  // Unset in development → localhost:3001; unset in production build → relative /api.
  const fromEnv = process.env.REACT_APP_API_BASE_URL;
  const baseUrl =
    fromEnv !== undefined
      ? fromEnv
      : process.env.NODE_ENV === "production"
        ? ""
        : "http://localhost:3001";
  const cleanedUrl = String(baseUrl).replace(/\/+$/, "");
  if (cleanedUrl.endsWith("/api")) {
    return cleanedUrl;
  }
  return cleanedUrl + "/api";
};
const API_BASE_URL = getApiBaseUrl();
export function withApiQuery(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
export default API_BASE_URL;
