import { inferProviderIdFromSolution, getAntivirusProvider } from "../EnterprisesPage/antivirusFormConfig";
import { formatAntivirusSolutionSummary, getAntivirusSolutionModeLabel, listConfiguredAntivirusSolutions } from "../EnterprisesPage/antivirusSolutionUtils";
export const ANTIVIRUS_STATUS_META = {
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
export function computeAntivirusExpirationStatus(expiration) {
  if (!expiration) return "unknown";
  const expirationDate = new Date(expiration);
  if (Number.isNaN(expirationDate.getTime())) return "unknown";
  const daysUntil = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 0) return "inactif";
  if (daysUntil <= 30) return "expire_bientot";
  return "actif";
}
function resolvePaymentPlan(solution) {
  const subscriptionType = solution?.syncData?.license?.raw?.subscriptionType ?? solution?.subscriptionType;
  if (subscriptionType === 1) return "Essai";
  if (subscriptionType === 2) return "Annuel";
  if (subscriptionType === 3) return "Mensuel";
  if (subscriptionType === 4) return "Perpetual";
  return solution?.paymentPlan || "Not defined";
}
function resolveEndpointsCount(solution) {
  if (Array.isArray(solution?.endpoints) && solution.endpoints.length > 0) {
    return solution.endpoints.length;
  }
  const used = solution?.licencesUtilisees ?? solution?.usedLicenses;
  if (used != null && used !== "") return Number(used) || 0;
  return null;
}
function resolveTotalLicenses(solution) {
  const total = solution?.licencesTotales ?? solution?.totalLicenses ?? solution?.licences;
  if (total == null || total === "") return null;
  return Number(total) || 0;
}
export function buildAntivirusFleetRow(client, solution, index = 0) {
  const summary = formatAntivirusSolutionSummary(solution);
  const providerId = summary.providerId || inferProviderIdFromSolution(solution) || "manual";
  const provider = getAntivirusProvider(providerId);
  const providerImage = providerId === "bitdefender" ? "/assets/icons/bitdefender.png" : provider?.image || null;
  const status = computeAntivirusExpirationStatus(solution?.expiration);
  const totalLicenses = resolveTotalLicenses(solution);
  const usedLicenses = resolveEndpointsCount(solution);
  const usagePercent = totalLicenses > 0 && usedLicenses != null ? Math.round(usedLicenses / totalLicenses * 100) : null;
  const productName = solution?.solution || solution?.nom || solution?.name || summary.label;
  return {
    id: solution?.id || `${client?.id}-${providerId}-${index}`,
    clientId: client?.id,
    clientName: client?.name || `Client ${client?.id}`,
    providerId,
    providerName: summary.providerName || provider?.label || "Autre solution",
    providerIcon: provider?.icon || "mdi:shield-bug-outline",
    providerImage,
    solutionLabel: summary.providerName || provider?.label || productName,
    solutionSubtitle: solution?.companyName || summary.label || null,
    productName,
    mappingMode: getAntivirusSolutionModeLabel(solution),
    status,
    paymentPlan: resolvePaymentPlan(solution),
    expirationDate: solution?.expiration || null,
    totalLicenses,
    usedLicenses,
    usagePercent,
    companyId: solution?.companyId || solution?.company_id || null,
    companyName: solution?.companyName || null,
    licenseKey: solution?.companyId || solution?.company_id || null,
    endpoints: Array.isArray(solution?.endpoints) ? solution.endpoints : [],
    lastSync: solution?.syncData?.lastSync || solution?.lastSync || null,
    isBitdefender: providerId === "bitdefender",
    raw: solution
  };
}
export function buildAntivirusFleetFromClients(clients = []) {
  const rows = [];
  (Array.isArray(clients) ? clients : []).forEach(client => {
    const solutions = listConfiguredAntivirusSolutions(client);
    solutions.forEach((solution, index) => {
      rows.push(buildAntivirusFleetRow(client, solution, index));
    });
  });
  return rows;
}
export function buildAntivirusFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const providers = new Set();
  let endpoints = 0;
  let licenses = 0;
  let usageSamples = 0;
  let usageSum = 0;
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
    if (row.usedLicenses != null) endpoints += row.usedLicenses;
    if (row.totalLicenses != null) licenses += row.totalLicenses;
    if (row.usagePercent != null) {
      usageSamples += 1;
      usageSum += row.usagePercent;
    }
  });
  const issues = statusCounts.inactif + statusCounts.expire_bientot;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    providers: providers.size,
    endpoints,
    licenses,
    issues,
    healthScore,
    avgUsagePercent: usageSamples > 0 ? Math.round(usageSum / usageSamples) : null,
    statusCounts
  };
}
export function groupAntivirusFleetByProvider(rows = []) {
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
    if (a.providerId === "bitdefender") return -1;
    if (b.providerId === "bitdefender") return 1;
    return a.providerName.localeCompare(b.providerName, "fr");
  });
}
export function filterAntivirusFleetRows(rows, {
  search = "",
  statusFilter = "all",
  providerFilter = "all",
  clientFilter = null
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];
  const query = search.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(row => row.clientName?.toLowerCase().includes(query) || row.solutionLabel?.toLowerCase().includes(query) || row.productName?.toLowerCase().includes(query) || row.providerName?.toLowerCase().includes(query) || row.companyName?.toLowerCase().includes(query));
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
const ANTIVIRUS_STATUS_SORT_ORDER = {
  inactif: 0,
  expire_bientot: 1,
  actif: 2,
  unknown: 3
};
export function sortAntivirusFleetRows(rows, sortBy, sortDirection = "asc") {
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
      case "paymentPlan":
        return compareStrings(a.paymentPlan, b.paymentPlan);
      case "status":
        {
          const leftRank = ANTIVIRUS_STATUS_SORT_ORDER[a.status] ?? 99;
          const rightRank = ANTIVIRUS_STATUS_SORT_ORDER[b.status] ?? 99;
          return mult * (leftRank - rightRank);
        }
      case "expirationDate":
        return compareDates(a.expirationDate, b.expirationDate);
      case "usagePercent":
        return compareNumbers(a.usagePercent ?? a.usedLicenses, b.usagePercent ?? b.usedLicenses);
      case "lastSync":
        return compareDates(a.lastSync, b.lastSync);
      default:
        return 0;
    }
  });
  return list;
}
