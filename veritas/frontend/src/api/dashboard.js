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
function buildDashboardParams(periodFilter, scopeFilter, extra = {}) {
  const params = buildPeriodQueryParams(periodFilter);
  buildScopeQueryParams(scopeFilter).forEach((value, key) => {
    params.set(key, value);
  });
  Object.entries(extra).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (Array.isArray(value)) params.set(key, value.join(","));
    else params.set(key, String(value));
  });
  return params;
}
export async function fetchAnalyticsDashboard(periodFilter, scopeFilter, options = {}) {
  const params = buildDashboardParams(periodFilter, scopeFilter);
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
export async function downloadKpiReportPdf(periodFilter, scopeFilter, {
  categories,
  locale
} = {}) {
  const params = buildDashboardParams(periodFilter, scopeFilter, {
    categories,
    locale
  });
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard/pdf?${params}`, {
    credentials: "include",
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error generating PDF");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    filename: match?.[1] || "veritas-kpi.pdf"
  };
}
export async function emailKpiReport(periodFilter, scopeFilter, payload = {}) {
  const params = buildDashboardParams(periodFilter, scopeFilter);
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard/email?${params}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error sending report");
  }
  return res.json();
}
export async function fetchKpiReportSchedules() {
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard/schedules`, {
    credentials: "include",
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error loading schedules");
  }
  return res.json();
}
export async function createKpiReportSchedule(payload) {
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard/schedules`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error creating schedule");
  }
  return res.json();
}
export async function updateKpiReportSchedule(id, payload) {
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard/schedules/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error updating schedule");
  }
  return res.json();
}
export async function deleteKpiReportSchedule(id) {
  const res = await fetch(`${API_BASE_URL}/stats/analytics-dashboard/schedules/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error deleting schedule");
  }
  return res.json();
}
