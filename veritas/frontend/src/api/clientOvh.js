import API_BASE_URL from "../config";
const OVH_URL = `${API_BASE_URL}/ovh`;
export async function getGlobalOvhStatus() {
  const res = await fetch(`${OVH_URL}/config`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Error verifying OVH configuration");
  }
  return res.json();
}
export async function fetchOvhDomains({
  light = true,
  refresh = false
} = {}) {
  const params = new URLSearchParams();
  if (light) params.set("light", "1");
  if (refresh) params.set("refresh", "1");
  const query = params.toString();
  const res = await fetch(`${OVH_URL}/domains${query ? `?${query}` : ""}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || errorData.details || "Unable to fetch OVH domains");
  }
  return res.json();
}
export async function fetchOvhDomainDetails(domainName) {
  const res = await fetch(`${OVH_URL}/domain/${encodeURIComponent(domainName)}`, {
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: "Unknown error"
    }));
    throw new Error(errorData.error || "Unable to fetch OVH domain");
  }
  return res.json();
}
export async function testOvhConnection(credentials = {}) {
  const res = await fetch(`${OVH_URL}/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      OVH_APPLICATION_KEY: credentials.applicationKey,
      OVH_APPLICATION_SECRET: credentials.applicationSecret,
      OVH_CONSUMER_KEY: credentials.consumerKey
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const message = data.error || data.details || "OVH connection test failed";
    const err = new Error(message);
    const details = data.details && data.details !== data.error ? data.details : null;
    err.details = details;
    throw err;
  }
  return data;
}
