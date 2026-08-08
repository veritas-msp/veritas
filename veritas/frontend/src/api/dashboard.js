import API_BASE_URL from "../config";
import { buildScopeQueryParams } from "../components/DashboardPage/dashboardScopeUtils";
export function buildPeriodQueryParams(filter) {
  const f = filter || {
    mode: "preset",
    preset: "365d"
  };
  if (f.mode === "custom") {
    const params = new URLSearchParams();
    if (f.startAt) params.set("startAt", f.startAt);
    if (f.endAt) params.set("endAt", f.endAt);
    return params;
  }
  return new URLSearchParams({
    period: String(f.preset || "365d")
  });
}
export async function fetchAnalyticsDashboard(periodFilter, scopeFilter, options = {}) {
  const params = buildPeriodQueryParams(periodFilter);
  buildScopeQueryParams(scopeFilter).forEach((value, key) => {
    params.set(key, value);
  });
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard?${params}`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "Error loading KPIs");
    err.code = body.code;
    throw err;
  }
  return res.json();
}
