import { buildAntispamFleetFromClients, computeAntispamExpirationStatus } from "../EnterprisesPage/antispamSolutionUtils";
export { buildAntispamFleetFromClients, computeAntispamExpirationStatus };
export const ANTISPAM_STATUS_META = {
  actif: {
    label: "Active",
    tone: "good"
  },
  expire_bientot: {
    label: "Expiring soon",
    tone: "warn"
  },
  inactif: {
    label: "Inactive",
    tone: "bad"
  },
  unknown: {
    label: "Not specified",
    tone: "neutral"
  }
};
export function buildAntispamFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const providers = new Set();
  let users = 0;
  let domains = 0;
  const statusCounts = {
    actif: 0,
    expire_bientot: 0,
    inactif: 0,
    unknown: 0
  };
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    if (row.providerId) providers.add(row.providerId);
    if (statusCounts[row.status] != null) statusCounts[row.status] += 1;
    if (row.utilisateursProteges != null) users += Number(row.utilisateursProteges) || 0;
    if (row.domainesSurveilles != null) domains += Number(row.domainesSurveilles) || 0;
  });
  const issues = statusCounts.inactif + statusCounts.expire_bientot;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    providers: providers.size,
    users,
    domains,
    issues,
    healthScore,
    statusCounts
  };
}
export function groupAntispamFleetByProvider(rows = []) {
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
    if (a.providerId === "mailinblack") return -1;
    if (b.providerId === "mailinblack") return 1;
    return a.providerName.localeCompare(b.providerName, "fr");
  });
}
export function filterAntispamFleetRows(rows, {
  search = "",
  statusFilter = "all",
  providerFilter = "all",
  clientFilter = null
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];
  const query = search.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(row => row.clientName?.toLowerCase().includes(query) || row.solutionLabel?.toLowerCase().includes(query) || row.solutionSubtitle?.toLowerCase().includes(query) || row.productName?.toLowerCase().includes(query) || row.providerName?.toLowerCase().includes(query));
  }
  if (statusFilter && statusFilter !== "all") {
    filtered = filtered.filter(row => row.status === statusFilter);
  }
  if (providerFilter && providerFilter !== "all") {
    filtered = filtered.filter(row => row.providerId === providerFilter);
  }
  if (clientFilter) {
    filtered = filtered.filter(row => row.clientName === clientFilter);
  }
  return filtered;
}
const ANTISPAM_STATUS_SORT_ORDER = {
  inactif: 0,
  expire_bientot: 1,
  actif: 2,
  unknown: 3
};
export function sortAntispamFleetRows(rows, sortBy, sortDirection = "asc") {
  const list = [...(Array.isArray(rows) ? rows : [])];
  const mult = sortDirection === "asc" ? 1 : -1;
  const compareStrings = (left, right) => mult * String(left || "").localeCompare(String(right || ""), "fr", {
    sensitivity: "base"
  });
  const compareNumbers = (left, right) => {
    const leftValue = left == null || left === "" ? null : Number(left);
    const rightValue = right == null || right === "" ? null : Number(right);
    if (leftValue == null && rightValue == null) return 0;
    if (leftValue == null) return 1;
    if (rightValue == null) return -1;
    return mult * (leftValue - rightValue);
  };
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
      case "solutionLabel":
        return compareStrings(a.solutionLabel || a.providerName, b.solutionLabel || b.providerName);
      case "mappingMode":
        return compareStrings(a.mappingMode, b.mappingMode);
      case "status":
        {
          const leftRank = ANTISPAM_STATUS_SORT_ORDER[a.status] ?? 99;
          const rightRank = ANTISPAM_STATUS_SORT_ORDER[b.status] ?? 99;
          return mult * (leftRank - rightRank);
        }
      case "expirationDate":
        return compareDates(a.expirationDate || a.expiration, b.expirationDate || b.expiration);
      case "coverage":
        {
          const usersCmp = compareNumbers(a.utilisateursProteges, b.utilisateursProteges);
          if (usersCmp !== 0) return usersCmp;
          return compareNumbers(a.domainesSurveilles, b.domainesSurveilles);
        }
      case "lastSync":
        return compareDates(a.lastSync, b.lastSync);
      default:
        return 0;
    }
  });
  return list;
}
