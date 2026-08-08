import { getDnsProvider, inferProviderIdFromDomain } from "../EnterprisesPage/dnsFormConfig";
export const DOMAIN_STATUS_META = {
  actif: {
    label: "Active",
    tone: "good"
  },
  expire_bientot: {
    label: "Expiring soon",
    tone: "warn"
  },
  expiré: {
    label: "Expired",
    tone: "bad"
  },
  unknown: {
    label: "Not specified",
    tone: "neutral"
  }
};
export function computeDomainExpirationStatus(expiration) {
  if (!expiration) return "actif";
  const expirationDate = new Date(expiration);
  if (Number.isNaN(expirationDate.getTime())) return "unknown";
  const daysUntil = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 0) return "expiré";
  if (daysUntil <= 30) return "expire_bientot";
  return "actif";
}
function normalizeRegistrarId(registrar) {
  const raw = String(registrar || "").trim().toLowerCase();
  if (!raw || raw === "n/a" || raw === "-") return "manual";
  if (raw.includes("ovh")) return "ovh";
  return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "manual";
}
export function buildDomainFleetRow(domain) {
  const providerId = inferProviderIdFromDomain(domain) || normalizeRegistrarId(domain?.registrar);
  const provider = getDnsProvider(providerId);
  const registrarLabel = domain?.registrar && domain.registrar !== "N/A" ? domain.registrar : null;
  return {
    id: domain?.id || `${domain?.client_id}-${domain?.nom}`,
    clientId: domain?.client_id,
    clientName: domain?.client_name || "-",
    domainName: domain?.nom || "-",
    registrar: registrarLabel,
    providerId,
    providerName: provider?.label || registrarLabel || "Autre registrar",
    providerIcon: provider?.icon || "mdi:web",
    providerImage: provider?.image || null,
    status: computeDomainExpirationStatus(domain?.expiration),
    expirationDate: domain?.expiration || null,
    lastSync: domain?.updated_at || null,
    raw: domain
  };
}
export function buildDomainFleetFromList(domains = []) {
  return (Array.isArray(domains) ? domains : []).map(domain => buildDomainFleetRow(domain));
}
export function buildDomainFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const providers = new Set();
  const statusCounts = {
    actif: 0,
    expire_bientot: 0,
    expiré: 0,
    unknown: 0
  };
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    if (row.providerId) providers.add(row.providerId);
    if (statusCounts[row.status] != null) statusCounts[row.status] += 1;
  });
  const issues = statusCounts.expiré + statusCounts.expire_bientot;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    providers: providers.size,
    issues,
    healthScore,
    statusCounts
  };
}
export function groupDomainFleetByRegistrar(rows = []) {
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const key = row.providerId || "manual";
    if (!groups.has(key)) {
      groups.set(key, {
        providerId: key,
        providerName: row.providerName,
        providerIcon: row.providerIcon,
        providerImage: row.providerImage,
        list: []
      });
    }
    groups.get(key).list.push(row);
  });
  return Array.from(groups.values()).sort((a, b) => {
    if (a.providerId === "ovh") return -1;
    if (b.providerId === "ovh") return 1;
    return a.providerName.localeCompare(b.providerName, "fr");
  });
}
const DOMAIN_STATUS_SORT_ORDER = {
  expiré: 0,
  expire_bientot: 1,
  actif: 2,
  unknown: 3
};
export function sortDomainFleetRows(rows, sortBy, sortDirection = "asc") {
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
      case "domainName":
        return compareStrings(a.domainName, b.domainName);
      case "status":
        {
          const leftRank = DOMAIN_STATUS_SORT_ORDER[a.status] ?? 99;
          const rightRank = DOMAIN_STATUS_SORT_ORDER[b.status] ?? 99;
          return mult * (leftRank - rightRank);
        }
      case "registrar":
        return compareStrings(a.registrar || a.providerName, b.registrar || b.providerName);
      case "expirationDate":
        return compareDates(a.expirationDate, b.expirationDate);
      case "lastSync":
        return compareDates(a.lastSync, b.lastSync);
      default:
        return 0;
    }
  });
  return list;
}
export function filterDomainFleetRows(rows, {
  search = "",
  statusFilter = "all",
  providerFilter = "all"
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];
  const query = search.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(row => row.clientName?.toLowerCase().includes(query) || row.domainName?.toLowerCase().includes(query) || row.registrar?.toLowerCase().includes(query) || row.providerName?.toLowerCase().includes(query));
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter(row => row.status === statusFilter);
  }
  if (providerFilter !== "all") {
    filtered = filtered.filter(row => row.providerId === providerFilter);
  }
  return filtered;
}
export function buildOvhDomainUrl(domainName) {
  if (domainName && domainName !== "-") {
    return `https://www.ovh.com/manager/web/#/domain/${encodeURIComponent(domainName)}`;
  }
  return "https://www.ovh.com/manager/web/#/domain";
}
