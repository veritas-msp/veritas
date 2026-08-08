import { getSslCertStatus, getSslHostLabel, SSL_STATUS_ORDER } from "../EnterprisesPage/sslCertificateUtils";
export function buildSslStatusLabels(statusMeta = {}) {
  return {
    error: statusMeta.error || "Error",
    unknown: statusMeta.unknown || "Not checked",
    unknownInvalid: statusMeta.unknownInvalid || "Unknown",
    expired: statusMeta.expired || "Expired",
    warning: statusMeta.warning || "Expiring soon",
    active: statusMeta.active || "Valid"
  };
}
export function buildSslFleetRow(cert, statusLabels) {
  const labels = statusLabels || buildSslStatusLabels();
  const status = getSslCertStatus(cert, labels);
  return {
    id: cert.id,
    clientId: cert.client_id,
    clientName: cert.client_name || "-",
    hostname: cert.hostname || "-",
    hostLabel: getSslHostLabel(cert),
    port: cert.port || 443,
    issuer: cert.issuerCN || cert.issuer || "-",
    expiration: cert.expiration || null,
    daysRemaining: cert.daysRemaining ?? null,
    lastChecked: cert.lastChecked || cert.updated_at || null,
    statusKey: status.key,
    statusLabel: status.text,
    statusIcon: status.icon,
    error: cert.error || null,
    raw: cert
  };
}
export function buildSslFleetFromList(certs = [], statusLabels) {
  return (Array.isArray(certs) ? certs : []).map(cert => buildSslFleetRow(cert, statusLabels));
}
export function isSslFleetIssue(statusKey) {
  return statusKey === "error" || statusKey === "expired" || statusKey === "warning";
}
export function buildSslFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const statusCounts = {
    active: 0,
    warning: 0,
    expired: 0,
    error: 0,
    unknown: 0
  };
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    if (statusCounts[row.statusKey] != null) statusCounts[row.statusKey] += 1;else statusCounts.unknown += 1;
  });
  const issues = list.filter(row => isSslFleetIssue(row.statusKey)).length;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    issues,
    healthScore,
    statusCounts
  };
}
export function filterSslFleetRows(rows, {
  search = "",
  statusFilter = "all"
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];
  const query = search.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(row => row.clientName?.toLowerCase().includes(query) || row.hostname?.toLowerCase().includes(query) || row.hostLabel?.toLowerCase().includes(query) || row.issuer?.toLowerCase().includes(query));
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter(row => row.statusKey === statusFilter);
  }
  return filtered;
}
export function sortSslFleetRows(rows, sortBy, sortDirection = "asc") {
  const list = [...(Array.isArray(rows) ? rows : [])];
  const mult = sortDirection === "asc" ? 1 : -1;
  const compareStrings = (left, right) => mult * String(left || "").localeCompare(String(right || ""), "fr", {
    sensitivity: "base"
  });
  const compareDates = (left, right) => {
    const leftTime = left ? new Date(left).getTime() : null;
    const rightTime = right ? new Date(right).getTime() : null;
    if (leftTime == null && rightTime == null) return 0;
    if (leftTime == null) return 1;
    if (rightTime == null) return -1;
    return mult * (leftTime - rightTime);
  };
  list.sort((a, b) => {
    switch (sortBy) {
      case "clientName":
        return compareStrings(a.clientName, b.clientName);
      case "hostname":
        return compareStrings(a.hostname, b.hostname);
      case "status":
        {
          const leftRank = SSL_STATUS_ORDER[a.statusKey] ?? 99;
          const rightRank = SSL_STATUS_ORDER[b.statusKey] ?? 99;
          return mult * (leftRank - rightRank);
        }
      case "issuer":
        return compareStrings(a.issuer, b.issuer);
      case "expiration":
        return compareDates(a.expiration, b.expiration);
      case "lastChecked":
        return compareDates(a.lastChecked, b.lastChecked);
      default:
        return 0;
    }
  });
  return list;
}
