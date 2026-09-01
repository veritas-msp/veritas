import API_BASE_URL, { withApiQuery } from "../config";
export async function getCheckMKReportPeriodData(hostName, startTime, endTime, site = null, options = {}) {
  const url = withApiQuery(`${API_BASE_URL}/checkmk/report-period/${encodeURIComponent(hostName)}`, {
    start_time: startTime,
    end_time: endTime,
    site: site || undefined
  });
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
