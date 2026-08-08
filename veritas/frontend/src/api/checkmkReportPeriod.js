import API_BASE_URL from "../config";
export async function getCheckMKReportPeriodData(hostName, startTime, endTime, site = null) {
  const url = new URL(`${API_BASE_URL}/checkmk/report-period/${encodeURIComponent(hostName)}`);
  url.searchParams.append("start_time", startTime);
  url.searchParams.append("end_time", endTime);
  if (site) url.searchParams.append("site", site);
  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
