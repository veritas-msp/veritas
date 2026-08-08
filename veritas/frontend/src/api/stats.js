import API_BASE_URL from "../config";
const STATS_URL = `${API_BASE_URL}/stats`;
export const fetchUserStats = async () => {
  const res = await fetch(`${API_BASE_URL}/stats/users`);
  if (!res.ok) throw new Error("Error loading stats");
  const json = await res.json();
  return {
    total: json.total_users,
    actifs: json.active_users,
    admins: json.admin_users,
    superviseur: json.superviseur_users,
    users: json.user_users,
    first: json.first_user_date,
    last: json.last_user_date
  };
};
export const fetchClientStats = async () => {
  const res = await fetch(`${API_BASE_URL}/stats/clients`);
  if (!res.ok) throw new Error("Error loading client stats");
  const json = await res.json();
  const reportFrequency = Object.entries(json.reportFreqCount || {}).map(([label, value]) => `${label} (${value})`).join(" / ");
  return {
    totalClients: json.totalClients,
    reportFrequency,
    totalServers: json.totalServers,
    percentPhysiques: json.percentPhysical,
    percentVirtuels: json.percentVirtual,
    avgServersPerClient: json.averageServersPerClient,
    mostUsedWindowsVersion: json.mostUsedWindowsVersion,
    avgNASFillRate: json.averageNASUsage,
    totalDomains: json.totalDomains,
    protectedUsersAntispam: json.totalAntispamUsers,
    protectedEndpointsAntivirus: json.totalAntivirusDevices,
    totalBackupJobs: json.totalBackupJobs,
    totalO365Licenses: json.totalLicencesO365
  };
};
export const fetchHomeKpis = async (options = {}) => {
  const res = await fetch(`${API_BASE_URL}/stats/home-kpis`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error loading home KPIs");
  return res.json();
};
export const fetchHomeDashboard = async (options = {}) => {
  const res = await fetch(`${API_BASE_URL}/stats/home-dashboard`, {
    credentials: "include",
    signal: options.signal
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.details || body.error || "Error loading dashboard");
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  return body;
};
export const fetchReportsStats = async () => {
  const res = await fetch(`${API_BASE_URL}/stats/reports`);
  if (!res.ok) throw new Error("Error loading report stats");
  const json = await res.json();
  return {
    totalReports: json.total_reports,
    monitoringReports: json.monitoring_reports,
    syntheseReports: json.synthese_reports,
    firstReportDate: json.first_report_date,
    lastReportDate: json.last_report_date,
    timeSavedPerReportMinutes: json.time_saved_per_report_minutes,
    totalTimeSavedMinutes: json.total_time_saved_minutes,
    totalTimeSavedHours: json.total_time_saved_hours,
    monetaryValueEuros: json.monetary_value_euros
  };
};
