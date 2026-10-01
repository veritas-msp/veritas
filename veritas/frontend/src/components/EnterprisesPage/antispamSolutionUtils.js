import { fetchClientModules, saveClientModules } from "../../api/clients";
import { deleteClientMailinblackTenant, fetchMailinblackDashboard, syncMailinblackCustomer } from "../../api/clientMailinblack";
import { getAntispamProvider, inferProviderIdFromSolution } from "./antispamFormConfig";
function resolveAntispamProviderId(item) {
  const normalized = normalizeAntispamItem(item) || item;
  if (!normalized) return "manual";
  return normalized.providerId || inferProviderIdFromSolution(normalized) || (normalized.mailinblackTenantId || normalized.customerId ? "mailinblack" : null) || (normalized.mappingMode === "dedicated" || normalized.mappingMode === "reseller" ? "mailinblack" : null) || "manual";
}
const MAILINBLACK_BRAND_NAME = "MAIL IN BLACK";
const GENERIC_MAILINBLACK_LABELS = new Set(["mailinblack", "mail in black", "mailinblack protect", "mail in black protect", "mailinblack customer", "client mailinblack", "mailinblack kunde", "cliente mailinblack"]);
function normalizeLabelKey(value) {
  return String(value || "").toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}
function isGenericMailinblackLabel(value) {
  const key = normalizeLabelKey(value);
  if (!key) return true;
  if (GENERIC_MAILINBLACK_LABELS.has(key)) return true;
  if (/^tenant mailinblack(?:\s+\d+)?$/.test(key)) return true;
  if (/^mailinblack tenant(?:\s+\d+)?$/.test(key)) return true;
  return false;
}
function resolveAntispamProductName(providerId, provider) {
  if (providerId === "mailinblack") {
    return MAILINBLACK_BRAND_NAME;
  }
  if (providerId === "manual") {
    return provider?.label || "Other solution";
  }
  return provider?.solutionName || provider?.label || providerId || "Antispam";
}
function resolveAntispamTenantLabel(item, productName) {
  const normalized = normalizeAntispamItem(item) || item;
  if (!normalized) return null;
  const productKey = normalizeLabelKey(productName);
  const candidates = [normalized.customerName, normalized.syncData?.customer?.name, normalized.label, normalized.nom, normalized.name, normalized.logiciel, normalized.solution];
  for (const value of candidates) {
    const text = (value || "").trim();
    if (!text) continue;
    const key = normalizeLabelKey(text);
    if (productKey && key === productKey) continue;
    if (isGenericMailinblackLabel(text)) continue;
    return text;
  }
  return null;
}
function resolveAntispamProviderImage(providerId, provider) {
  if (providerId === "mailinblack") return "/assets/icons/mailinblack.png";
  if (provider?.image) {
    return provider.image.startsWith("/") ? provider.image : `/assets/icons/${provider.image}`;
  }
  return null;
}
export function canonicalizeAntispamMappingMode(solution) {
  const raw = String(solution?.mappingMode || "").trim().toLowerCase();
  if (raw === "dedicated" || raw.includes("dedicated") || raw.includes("dédié") || raw.includes("dedie")) {
    return "dedicated";
  }
  if (
    raw === "manual" ||
    raw.includes("manual") ||
    raw.includes("manuelle") ||
    solution?.isManual === true ||
    solution?.providerId === "manual"
  ) {
    return "manual";
  }
  if (solution?.mailinblackTenantId) return "dedicated";
  if (raw === "reseller" || raw.includes("global") || raw.includes("reseller")) return "reseller";
  if (solution?.customerId || solution?.customer_id || solution?.authClientId) return "reseller";
  return "manual";
}
export function getAntispamSolutionModeLabel(solution) {
  const mode = canonicalizeAntispamMappingMode(solution);
  if (mode === "dedicated") return "Dedicated tenant";
  if (mode === "manual") return "Saisie manuelle";
  if (mode === "reseller") return "Tenant global";
  return "-";
}
function toLicenseNumber(value) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.length > 0 ? value.length : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function toValidExpirationDate(value) {
  if (value == null || value === "" || value === 0 || value === "0" || typeof value === "boolean") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()) || value.getUTCFullYear() < 1990) return null;
    return value;
  }
  if (typeof value === "number" || typeof value === "string" && /^-?\d+(\.\d+)?$/.test(String(value).trim())) {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return null;
    const date = new Date(num < 1e12 ? num * 1000 : num);
    if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990) return null;
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990) return null;
  return date;
}
function pickSoonestExpirationValue(values) {
  const dates = [];
  for (const value of values) {
    const date = toValidExpirationDate(value);
    if (date) dates.push(date);
  }
  if (!dates.length) return null;
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates[0].toISOString();
}
function collectAntispamLicenseItems(item) {
  const customer = item?.syncData?.customer || {};
  const raw = customer.raw && typeof customer.raw === "object" ? customer.raw : {};
  const dashboardItems = item?.syncData?.dashboard?.sections?.licenses?.items;
  const lists = [dashboardItems, raw.licenses, raw.licences, raw.licenseList, raw.licenceList, customer.licenses];
  const items = [];
  for (const list of lists) {
    if (Array.isArray(list)) items.push(...list);
  }
  return items;
}
function collectAntispamExpirationCandidates(item) {
  const customer = item?.syncData?.customer || {};
  const raw = customer.raw && typeof customer.raw === "object" ? customer.raw : {};
  const domains = item?.syncData?.dashboard?.sections?.domains?.items;
  const domainExpirations = Array.isArray(domains) ? domains.flatMap(domain => [domain?.expiration, domain?.expirationDate, domain?.license?.expirationDate, domain?.license?.expiration, domain?.license?.endDate, domain?.licence?.expirationDate, domain?.subscription?.expirationDate, domain?.contract?.endDate, domain?.contractEndDate, domain?.dateFin, domain?.validUntil]) : [];
  const licenseExpirations = collectAntispamLicenseItems(item).flatMap(license => [license?.expirationDate, license?.expiration, license?.expiryDate, license?.renewalDate, license?.endDate, license?.validUntil, license?.contractEndDate, license?.dateFin]);
  const contract = item?.syncData?.dashboard?.sections?.licenses?.contract || {};
  return [item?.expiration, item?.expirationDate, item?.expirityDate, customer.expiration, customer.expirationDate, contract.expiration, raw.expirationDate, raw.expiration, raw.expiryDate, raw.renewalDate, raw.licenseExpiration, raw.licenceExpiration, raw.endDate, raw.validUntil, raw.contractEndDate, raw.dateFin, raw.endOfCommitment, ...licenseExpirations, ...domainExpirations];
}
function resolveAntispamExpirationValue(item) {
  return pickSoonestExpirationValue(collectAntispamExpirationCandidates(item));
}
function resolveAntispamDomainCount(item) {
  const dashboard = item?.syncData?.dashboard;
  const customer = item?.syncData?.customer;
  const domainItems = dashboard?.sections?.domains?.items;
  return toLicenseNumber(item?.domainesSurveilles ?? item?.domaines ?? item?.domainsCount ?? dashboard?.sections?.domains?.total ?? (Array.isArray(domainItems) ? domainItems.length : null) ?? customer?.domainsCount);
}
const COMMON_LICENSE_PAGE_SIZES = new Set([10, 15, 20, 25, 50]);
function isLikelyPageCappedLicenseTotal(total, licenseItems = [], usersTotal = null) {
  if (total == null || !COMMON_LICENSE_PAGE_SIZES.has(Number(total))) return false;
  const n = Number(total);
  if (usersTotal != null && Number(usersTotal) > n) return true;
  if (!Array.isArray(licenseItems) || !licenseItems.length) return false;
  if (licenseItems.length !== n) return false;
  return licenseItems.every(license => toLicenseNumber(license?.total ?? license?.quantity ?? license?.count ?? license?.seats) == null);
}
function resolveAntispamLicenseTotal(item) {
  const customer = item?.syncData?.customer || {};
  const raw = customer.raw && typeof customer.raw === "object" ? customer.raw : {};
  const licenseSummary = item?.syncData?.dashboard?.sections?.licenses?.summary;
  const contract = item?.syncData?.dashboard?.sections?.licenses?.contract || {};
  const licenseItems = collectAntispamLicenseItems(item);
  const usersTotal = toLicenseNumber(item?.utilisateursProteges ?? item?.syncData?.dashboard?.sections?.users?.total ?? customer.usersCount);
  const fromApi = toLicenseNumber(licenseSummary?.total ?? contract.total ?? customer.licenseCount ?? (typeof raw.licenses === "number" || typeof raw.licenses === "string" ? raw.licenses : null) ?? raw.licenseCount ?? raw.nbLicences ?? raw.nbLicense ?? raw.totalLicenses ?? raw.licenceCount ?? raw.numberOfLicenses ?? raw.maxUsers ?? raw.maxMailboxes ?? raw.nbLicenceProtect ?? raw.protectLicenses);
  const persisted = toLicenseNumber(item?.licencesTotales ?? item?.totalLicenses ?? item?.nombre_licences);
  if (fromApi != null && fromApi > 0 && !isLikelyPageCappedLicenseTotal(fromApi, licenseItems, usersTotal)) return fromApi;
  if (persisted != null && persisted > 0 && !isLikelyPageCappedLicenseTotal(persisted, licenseItems, usersTotal)) return persisted;
  if (licenseItems.length) {
    const summed = licenseItems.reduce((acc, license) => acc + (toLicenseNumber(license?.total ?? license?.quantity ?? license?.seats ?? license?.nbLicences) || 0), 0);
    if (summed > 0) return summed;
  }
  const mappedUsersCount = toLicenseNumber(customer.usersCount);
  if (mappedUsersCount != null && mappedUsersCount > 0 && mappedUsersCount !== usersTotal) return mappedUsersCount;
  return null;
}
function resolveAntispamLicenseUsed(item) {
  const licenseSummary = item?.syncData?.dashboard?.sections?.licenses?.summary;
  const contract = item?.syncData?.dashboard?.sections?.licenses?.contract || {};
  const fromSummary = toLicenseNumber(licenseSummary?.used ?? contract.used ?? item?.licencesUtilisees ?? item?.usedLicenses);
  if (fromSummary != null) return fromSummary;
  const users = item?.syncData?.dashboard?.sections?.users?.items;
  if (Array.isArray(users) && users.length) {
    const protectedCount = users.filter(user => user?.status === "Protected" || user?.protected === true).length;
    if (protectedCount > 0) return protectedCount;
    const usersTotal = toLicenseNumber(item?.syncData?.dashboard?.sections?.users?.total);
    if (usersTotal != null && usersTotal > users.length) return usersTotal;
    return users.length;
  }
  return toLicenseNumber(item?.syncData?.dashboard?.sections?.users?.total ?? item?.utilisateursProteges);
}
export function normalizeAntispamItem(item) {
  if (!item) return null;
  const name = item.logiciel || item.solution || item.nom || item.name || item.customerName || "";
  const customerId = item.customerId || item.customer_id || item.authClientId || item.syncData?.customer?.id || null;
  const hasManualHints = item.mappingMode === "manual" || item.isManual === true || item.providerId === "manual";
  const providerId = item.providerId || (item.mailinblackTenantId || customerId ? "mailinblack" : hasManualHints ? "manual" : inferProviderIdFromSolution(item));
  const mappingMode = canonicalizeAntispamMappingMode({
    ...item,
    customerId,
    providerId
  });
  const isManualEntry = hasManualHints || mappingMode === "manual" || providerId === "manual";
  return {
    ...item,
    logiciel: item.logiciel || name || null,
    nom: item.nom || name || null,
    name: item.name || name || null,
    solution: item.solution || name || null,
    customerId: customerId != null ? String(customerId) : null,
    customerName: item.customerName || item.syncData?.customer?.name || item.solution || item.nom || item.name || null,
    providerId: providerId || null,
    mappingMode,
    isManual: item.isManual ?? isManualEntry,
    mailinblackTenantId: item.mailinblackTenantId || null,
    expiration: resolveAntispamExpirationValue(item) || "",
    utilisateursProteges: toLicenseNumber(item.utilisateursProteges ?? item.utilisateurs ?? item.nombre_utilisateurs ?? item?.syncData?.dashboard?.sections?.users?.total ?? (Array.isArray(item?.syncData?.dashboard?.sections?.users?.items) ? item.syncData.dashboard.sections.users.items.length : null)),
    domainesSurveilles: resolveAntispamDomainCount(item),
    licencesTotales: resolveAntispamLicenseTotal(item),
    licencesUtilisees: resolveAntispamLicenseUsed(item)
  };
}
export function formatAntispamSolutionLabel(solution) {
  const normalized = normalizeAntispamItem(solution);
  if (!normalized) return "Antispam solution";
  const providerId = resolveAntispamProviderId(normalized);
  if (providerId === "mailinblack") {
    return resolveAntispamProductName(providerId, getAntispamProvider(providerId));
  }
  return resolveAntispamTenantLabel(normalized) || normalized.logiciel || normalized.solution || normalized.nom || normalized.name || "Antispam solution";
}
export function formatAntispamSolutionSummary(solution) {
  const normalized = normalizeAntispamItem(solution);
  const providerId = resolveAntispamProviderId(normalized);
  const provider = getAntispamProvider(providerId);
  const providerName = resolveAntispamProductName(providerId, provider);
  const tenantLabel = resolveAntispamTenantLabel(normalized, providerName);
  const label = providerId === "mailinblack" ? providerName : tenantLabel || formatAntispamSolutionLabel(normalized);
  const mode = getAntispamSolutionModeLabel(normalized);
  const users = normalized?.utilisateursProteges ?? normalized?.utilisateurs;
  const domains = normalized?.domainesSurveilles ?? normalized?.domaines;
  const metaParts = [providerName, mode];
  if (users != null && users !== "") {
    metaParts.push(`${users} utilisateur${Number(users) > 1 ? "s" : ""}`);
  }
  if (domains != null && domains !== "") {
    metaParts.push(`${domains} domain${Number(domains) > 1 ? "s" : ""}`);
  }
  return {
    label,
    mode,
    providerName,
    providerId,
    meta: metaParts.join(" · ")
  };
}
export function isAntispamConfigured(item) {
  const normalized = normalizeAntispamItem(item);
  if (!normalized) return false;
  if (normalized.customerId) return true;
  if (normalized.mailinblackTenantId) return true;
  const label = (normalized.logiciel || normalized.solution || normalized.nom || normalized.name || "").trim();
  const users = String(normalized.utilisateursProteges ?? "").trim();
  const hasCoverageMeta = users && users.toLowerCase() !== "n/a" || String(normalized.domainesSurveilles ?? "").trim() || String(normalized.expiration ?? "").trim();
  if (label && label !== "N/A") return true;
  return Boolean(hasCoverageMeta);
}
export function isManualAntispamSolution(item) {
  const normalized = normalizeAntispamItem(item);
  if (!normalized || normalized.customerId || normalized.mailinblackTenantId) return false;
  return isAntispamConfigured(normalized);
}
export function computeAntispamExpirationStatus(expiration) {
  const expirationDate = toValidExpirationDate(expiration);
  if (!expirationDate) return "unknown";
  const daysUntil = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 0) return "inactif";
  if (daysUntil <= 30) return "expire_bientot";
  return "actif";
}
function mapMailinblackRawStatus(value) {
  if (value == null || value === "") return null;
  const key = String(value).trim().toLowerCase();
  if (!key) return null;
  if (["active", "actif", "ok", "enabled", "valid", "validated", "running", "protected"].includes(key)) return "actif";
  if (["inactive", "inactif", "disabled", "expired", "expiré", "expire", "cancelled", "canceled", "suspended"].includes(key)) return "inactif";
  if (key.includes("expir") || key.includes("soon") || key.includes("bientot") || key.includes("bientôt")) return "expire_bientot";
  return null;
}
export function resolveAntispamFleetStatus(solution) {
  const normalized = normalizeAntispamItem(solution);
  const fromExpiration = computeAntispamExpirationStatus(normalized?.expiration);
  if (fromExpiration !== "unknown") return fromExpiration;
  const rawStatus = normalized?.syncData?.status || normalized?.syncData?.customer?.status || normalized?.status || normalized?.syncData?.dashboard?.sections?.licenses?.contract?.status;
  const mapped = mapMailinblackRawStatus(rawStatus);
  if (mapped) return mapped;
  if ((normalized?.domainesSurveilles != null && Number(normalized.domainesSurveilles) > 0) || (normalized?.utilisateursProteges != null && Number(normalized.utilisateursProteges) > 0) || (normalized?.licencesUtilisees != null && Number(normalized.licencesUtilisees) > 0)) {
    return "actif";
  }
  return "unknown";
}
const SUBSCRIPTION_TYPE_LABELS = {
  1: "Essai",
  2: "Annuel",
  3: "Mensuel",
  4: "Perpetual"
};
function normalizePaymentLabel(value) {
  if (value == null || value === "" || typeof value === "object") return null;
  const str = String(value).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (["reseller", "dedicated", "manual", "not defined", "undefined", "-"].includes(lower)) return null;
  if (lower.includes("essai") || lower.includes("trial") || lower.includes("demo")) return "Essai";
  if (lower.includes("annuel") || lower.includes("annual") || lower.includes("yearly") || lower.includes("year")) return "Annuel";
  if (lower.includes("mensuel") || lower.includes("monthly") || lower.includes("month")) return "Mensuel";
  if (lower.includes("perpetual") || lower.includes("perpetuel") || lower.includes("lifetime")) return "Perpetual";
  return str;
}
export function resolveAntispamPaymentPlan(solution) {
  const customer = solution?.syncData?.customer;
  const raw = customer?.raw && typeof customer.raw === "object" ? customer.raw : {};
  const subscriptionType = solution?.subscriptionType ?? customer?.subscriptionType ?? raw.subscriptionType ?? raw.offerType;
  if (SUBSCRIPTION_TYPE_LABELS[subscriptionType]) return SUBSCRIPTION_TYPE_LABELS[subscriptionType];
  const candidates = [solution?.paymentPlan, solution?.plan, customer?.paymentPlan, customer?.plan, raw.paymentPlan, raw.plan, raw.offer, raw.offerName, raw.subscription, raw.periodicity, raw.billingPeriod, raw.billingFrequency, raw.recurrence];
  for (const candidate of candidates) {
    const label = normalizePaymentLabel(candidate);
    if (label) return label;
  }
  return "-";
}
function resolveAntispamLicenses(normalized) {
  const usedLicenses = toLicenseNumber(normalized?.licencesUtilisees ?? normalized?.usedLicenses ?? resolveAntispamLicenseUsed(normalized));
  const totalLicenses = toLicenseNumber(normalized?.licencesTotales ?? resolveAntispamLicenseTotal(normalized));
  const usagePercent = totalLicenses > 0 && usedLicenses != null ? Math.round(usedLicenses / totalLicenses * 100) : null;
  return {
    usedLicenses,
    totalLicenses,
    usagePercent
  };
}
export function buildAntispamFleetRow(client, solution, index = 0) {
  const normalized = normalizeAntispamItem(solution);
  const providerId = resolveAntispamProviderId(normalized);
  const provider = getAntispamProvider(providerId);
  const productName = resolveAntispamProductName(providerId, provider);
  const providerImage = resolveAntispamProviderImage(providerId, provider);
  const tenantLabel = resolveAntispamTenantLabel(normalized, productName);
  const licenses = resolveAntispamLicenses(normalized);
  return {
    id: normalized.id || `${client?.id}-as-${index}`,
    clientId: client?.id,
    clientName: client?.name || `Client ${client?.id}`,
    productName,
    solutionLabel: productName,
    solutionSubtitle: tenantLabel,
    mappingMode: canonicalizeAntispamMappingMode(normalized),
    mappingModeLabel: getAntispamSolutionModeLabel(normalized),
    status: resolveAntispamFleetStatus(normalized),
    paymentPlan: resolveAntispamPaymentPlan(normalized),
    expiration: normalized.expiration || null,
    expirationDate: normalized.expiration || null,
    utilisateursProteges: normalized.utilisateursProteges ?? null,
    domainesSurveilles: normalized.domainesSurveilles ?? null,
    usedLicenses: licenses.usedLicenses,
    totalLicenses: licenses.totalLicenses,
    usagePercent: licenses.usagePercent,
    providerId,
    providerName: productName,
    providerIcon: provider?.icon || "mdi:email-secure-outline",
    providerImage,
    logiciel: productName,
    solution: productName,
    lastSync: normalized?.syncData?.lastSync || normalized?.lastSync || null,
    customerId: normalized.customerId || null,
    customerName: tenantLabel,
    raw: normalized
  };
}
export function buildAntispamFleetFromClients(clients = []) {
  const rows = [];
  (Array.isArray(clients) ? clients : []).forEach(client => {
    const solutions = listConfiguredAntispamSolutions(client, [], null, client.mailinblackTenants || []);
    solutions.forEach((solution, index) => {
      rows.push(buildAntispamFleetRow(client, solution, index));
    });
  });
  return rows;
}
export function buildSolutionsFromMailinblackTenants(tenants = []) {
  return (tenants || []).map(tenant => ({
    id: tenant.solutionId || `tenant-${tenant.id}`,
    providerId: "mailinblack",
    mappingMode: "dedicated",
    mailinblackTenantId: tenant.id,
    customerId: tenant.authClientId ? String(tenant.authClientId) : null,
    solution: tenant.solution || "Mailinblack Protect",
    logiciel: tenant.solution || "Mailinblack Protect",
    nom: tenant.label || tenant.solution || "Mailinblack Protect",
    name: tenant.label || tenant.solution || "Mailinblack Protect",
    apiUrl: tenant.apiUrl
  }));
}
export function listOverviewAntispamSolutions(solutions = []) {
  return (solutions || []).map(solution => normalizeAntispamItem(solution)).filter(solution => isAntispamConfigured(solution));
}
export function extractAntispamSolutionsFromModules(modulesData) {
  const antispam = modulesData?.equipements?.Antispam;
  if (!antispam) return [];
  if (Array.isArray(antispam)) {
    return antispam.map(solution => normalizeAntispamItem(solution)).filter(Boolean);
  }
  const list = Array.isArray(antispam.solutions) ? antispam.solutions : [];
  if (list.length) {
    return list.map(solution => normalizeAntispamItem(solution)).filter(Boolean);
  }
  if (antispam.logiciel || antispam.solution || antispam.nom || antispam.name || antispam.customerId || antispam.mailinblackTenantId) {
    const normalized = normalizeAntispamItem(antispam);
    return normalized ? [normalized] : [];
  }
  return [];
}
function buildConfiguredDedupeKey(item) {
  // Prefer customerId so module rows and Mailinblack tenants of the same link collapse to one.
  if (item.customerId) {
    return `api:${item.customerId}|${item.mappingMode || "reseller"}`;
  }
  if (item.mailinblackTenantId != null && item.mailinblackTenantId !== "") {
    return `tenant:${item.mailinblackTenantId}`;
  }
  if (item.id != null) return `id:${item.id}`;
  if (item.item_key) return `key:${item.item_key}`;
  const label = (item.logiciel || item.solution || item.nom || item.name || "").trim().toLowerCase();
  return `manual:${item.id ?? label}|${item.mappingMode || "manual"}`;
}
export function listConfiguredAntispamSolutions(client, antispamItems = [], modulesData = null, mailinblackTenants = []) {
  const moduleSolutions = extractAntispamSolutionsFromModules(modulesData || {
    equipements: client?.equipements
  });
  const tenantSolutions = buildSolutionsFromMailinblackTenants(mailinblackTenants);
  // Prefer tenants (richest link metadata), then modules, then extra API items.
  const sources = [...tenantSolutions, ...moduleSolutions, ...(antispamItems || []).map(item => normalizeAntispamItem(item)).filter(Boolean)];
  const seen = new Set();
  const configured = [];
  for (const item of sources) {
    if (!isAntispamConfigured(item)) continue;
    const dedupeKey = buildConfiguredDedupeKey(item);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    configured.push(item);
  }
  return configured;
}
export function isClientAntispamConfigured(client, antispamItems = [], modulesData = null) {
  return listConfiguredAntispamSolutions(client, antispamItems, modulesData).length > 0;
}
export function mergeAntispamSources(apiItems = [], modulesData) {
  const moduleItems = extractAntispamSolutionsFromModules(modulesData);
  const merged = new Map();
  for (const raw of apiItems || []) {
    const item = normalizeAntispamItem(raw);
    if (!item) continue;
    const key = item.customerId ?? item.id ?? item.item_key ?? item.logiciel ?? item.nom ?? item.name;
    if (!key) continue;
    merged.set(String(key), item);
  }
  for (const item of moduleItems) {
    const key = item.customerId ?? item.id ?? item.item_key ?? item.logiciel ?? item.nom ?? item.name;
    if (!key) continue;
    merged.set(String(key), {
      ...merged.get(String(key)),
      ...item
    });
  }
  return [...merged.values()];
}
function solutionMatches(a, b) {
  const tenantA = a.mailinblackTenantId ?? null;
  const tenantB = b.mailinblackTenantId ?? null;
  if (tenantA != null && tenantB != null && String(tenantA) === String(tenantB)) {
    return true;
  }
  if (a.customerId && b.customerId) {
    return String(a.customerId) === String(b.customerId) && (a.mappingMode || "reseller") === (b.mappingMode || "reseller") && String(tenantA ?? "") === String(tenantB ?? "");
  }
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
  if (a.item_key && b.item_key && String(a.item_key) === String(b.item_key)) return true;
  const nameA = (a.logiciel || a.solution || a.nom || a.name || "").trim().toLowerCase();
  const nameB = (b.logiciel || b.solution || b.nom || b.name || "").trim().toLowerCase();
  return Boolean(nameA) && nameA === nameB && !a.customerId && !b.customerId;
}
export async function removeAntispamSolution(clientId, solution) {
  const normalized = normalizeAntispamItem(solution);
  if (!clientId || !normalized?.customerId && !normalized?.mailinblackTenantId && !solution?.item_key && !normalized?.logiciel && !normalized?.solution && !normalized?.id) {
    throw new Error("Antispam association not found.");
  }
  if (normalized.mailinblackTenantId) {
    try {
      await deleteClientMailinblackTenant(clientId, normalized.mailinblackTenantId);
    } catch (error) {
      const message = error?.message || "";
      if (!message.toLowerCase().includes("introuvable")) {
        throw error;
      }
    }
  }
  const modulesData = await fetchClientModules(clientId);
  const existingEquipements = modulesData?.equipements || {};
  const antispamEquipement = existingEquipements.Antispam || {};
  const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
  const remaining = existingSolutions.filter(entry => !solutionMatches(normalizeAntispamItem(entry) || entry, normalized));
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      ...(modulesData?.modules_monitoring || {}),
      Antispam: remaining.length > 0
    },
    equipements: {
      ...existingEquipements,
      Antispam: {
        ...antispamEquipement,
        solutions: remaining
      }
    }
  });
  return remaining;
}
export async function reorderAntispamSolutions(clientId, orderedItems = []) {
  if (!clientId) throw new Error("Client not found.");
  const modulesData = await fetchClientModules(clientId);
  const existingEquipements = modulesData?.equipements || {};
  const antispamEquipement = existingEquipements.Antispam || {};
  const raw = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
  const used = new Set();
  const reordered = [];
  for (const item of orderedItems) {
    const normalized = normalizeAntispamItem(item);
    const matchIndex = raw.findIndex((entry, index) => !used.has(index) && solutionMatches(entry, normalized));
    if (matchIndex >= 0) {
      used.add(matchIndex);
      reordered.push(raw[matchIndex]);
    }
  }
  raw.forEach((entry, index) => {
    if (!used.has(index)) reordered.push(entry);
  });
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      ...(modulesData?.modules_monitoring || {}),
      Antispam: reordered.length > 0
    },
    equipements: {
      ...existingEquipements,
      Antispam: {
        ...antispamEquipement,
        solutions: reordered
      }
    }
  });
  return reordered.map(entry => normalizeAntispamItem(entry)).filter(Boolean);
}
export async function syncAndPersistAntispamSolution(clientId, solution, {
  signal
} = {}) {
  const normalized = normalizeAntispamItem(solution);
  if (!clientId || !normalized?.customerId) {
    throw new Error("Client Mailinblack introuvable.");
  }
  const mappingMode = normalized.mappingMode || "reseller";
  const mailinblackTenantId = mappingMode === "dedicated" ? normalized.mailinblackTenantId : null;
  const providerId = normalized.providerId || "mailinblack";
  const credentialContext = {
    clientId,
    mailinblackTenantId,
    mappingMode,
    signal
  };
  // Same path as detail page / config modal: sync customer + explicit dashboard fetch.
  // POST /sync alone can swallow dashboard failures (.catch → null) and persist empty sections.
  const [syncResult, dashboardFromPage] = await Promise.all([
    syncMailinblackCustomer(normalized.customerId, credentialContext),
    fetchMailinblackDashboard(normalized.customerId, credentialContext).catch(error => {
      if (error?.name === "AbortError") throw error;
      return null;
    })
  ]);
  if (!syncResult.success) {
    throw new Error(syncResult.error || "Sync failed");
  }
  const customer = syncResult.customer || syncResult.data?.syncData?.customer || {
    id: normalized.customerId,
    name: syncResult.data?.customerName || normalized.customerName || ""
  };
  const normalizedCustomer = {
    ...customer,
    id: customer?.id != null ? String(customer.id) : String(normalized.customerId)
  };
  const resolvedDashboard =
    dashboardFromPage || syncResult.dashboard || syncResult.data?.syncData?.dashboard || null;
  if (!resolvedDashboard) {
    throw new Error("Dashboard Mailinblack inaccessible — mêmes données que la page détail indisponibles.");
  }
  const formattedPayload = formatAntispamSyncPayload(
    normalizedCustomer,
    mappingMode,
    mailinblackTenantId,
    providerId,
    { dashboard: resolvedDashboard }
  );
  const backendPayload = syncResult.data && typeof syncResult.data === "object" ? syncResult.data : null;
  const updatedPayload = backendPayload
    ? {
        ...formattedPayload,
        ...backendPayload,
        providerId,
        mappingMode,
        mailinblackTenantId,
        customerId: String(backendPayload.customerId || normalizedCustomer.id),
        customerName:
          backendPayload.customerName ||
          formattedPayload.customerName ||
          normalizedCustomer.name ||
          "",
        utilisateursProteges:
          formattedPayload.utilisateursProteges ?? backendPayload.utilisateursProteges,
        domainesSurveilles:
          formattedPayload.domainesSurveilles ?? backendPayload.domainesSurveilles,
        licencesTotales: formattedPayload.licencesTotales ?? backendPayload.licencesTotales,
        licencesUtilisees: formattedPayload.licencesUtilisees ?? backendPayload.licencesUtilisees,
        expiration: formattedPayload.expiration || backendPayload.expiration || "",
        syncData: {
          ...(backendPayload.syncData || {}),
          ...(formattedPayload.syncData || {}),
          customer: backendPayload.syncData?.customer || normalizedCustomer,
          dashboard: resolvedDashboard,
          lastSync: new Date().toISOString()
        }
      }
    : {
        ...formattedPayload,
        syncData: {
          ...formattedPayload.syncData,
          dashboard: resolvedDashboard,
          lastSync: new Date().toISOString()
        }
      };
  const modulesData = await fetchClientModules(clientId, {
    signal
  });
  const existingEquipements = modulesData?.equipements || {};
  const antispamEquipement = existingEquipements.Antispam || {};
  const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
  const hasMatch = existingSolutions.some(entry => solutionMatches(entry, normalized));
  const finalSolutions = hasMatch ? existingSolutions.map(entry => solutionMatches(entry, normalized) ? {
    ...entry,
    ...updatedPayload,
    id: entry.id ?? normalized.id
  } : entry) : [...existingSolutions, {
    id: normalized.id ?? Date.now(),
    ...updatedPayload
  }];
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      Antispam: finalSolutions.length > 0
    },
    equipements: {
      Antispam: {
        ...antispamEquipement,
        solutions: finalSolutions
      }
    }
  });
  return {
    syncResult,
    dashboard: resolvedDashboard,
    updatedPayload
  };
}
export function formatAntispamSyncPayload(customer, mappingMode, mailinblackTenantId, providerId = "mailinblack", extra = {}) {
  const provider = getAntispamProvider(providerId);
  const solutionLabel = provider?.solutionName || "Mailinblack Protect";
  const dashboard = extra?.dashboard || null;
  const usersSection = dashboard?.sections?.users;
  const domainsSection = dashboard?.sections?.domains;
  const licensesSection = dashboard?.sections?.licenses;
  const usersCount = Number.isFinite(Number(usersSection?.total)) && Number(usersSection.total) > 0
    ? Number(usersSection.total)
    : Array.isArray(usersSection?.items) && usersSection.items.length
      ? usersSection.items.length
      : customer?.usersCount != null && Number.isFinite(Number(customer.usersCount))
        ? Number(customer.usersCount)
        : 0;
  const domainsCount = Number.isFinite(Number(domainsSection?.total)) && Number(domainsSection.total) > 0
    ? Number(domainsSection.total)
    : Array.isArray(domainsSection?.items) && domainsSection.items.length
      ? domainsSection.items.length
      : customer?.domainsCount != null && Number.isFinite(Number(customer.domainsCount))
        ? Number(customer.domainsCount)
        : customer?.domain ? 1 : 0;
  const licencesTotales = licensesSection?.summary?.total ?? customer?.licenseCount ?? customer?.raw?.licenseCount ?? null;
  const licencesUtilisees = licensesSection?.summary?.used ?? (usersCount > 0 ? usersCount : null);
  return {
    solution: solutionLabel,
    providerId,
    logiciel: solutionLabel,
    nom: customer?.name || solutionLabel,
    name: customer?.name || solutionLabel,
    mappingMode,
    mailinblackTenantId: mappingMode === "dedicated" ? mailinblackTenantId : null,
    customerId: customer?.id != null ? String(customer.id) : null,
    customerName: customer?.name || "",
    domain: customer?.domain || "",
    utilisateursProteges: usersCount,
    domainesSurveilles: domainsCount,
    licencesTotales,
    licencesUtilisees,
    expiration: toValidExpirationDate(customer?.expiration)?.toISOString() || "",
    syncData: {
      customer,
      dashboard,
      status: customer?.status || null,
      lastSync: new Date().toISOString()
    }
  };
}
function groupFleetItemsByClient(items = []) {
  const groups = new Map();
  items.forEach(item => {
    if (item?.clientId == null) return;
    if (!groups.has(item.clientId)) groups.set(item.clientId, []);
    groups.get(item.clientId).push(item);
  });
  return groups;
}
function antispamItemMatches(entry, item) {
  const left = normalizeAntispamItem(entry) || entry;
  const right = normalizeAntispamItem(item?.raw || item) || item?.raw || item;
  if (!left || !right) return false;
  return solutionMatches(left, right);
}
function applyAntispamBulkFields(entry, fields = {}) {
  const next = {
    ...entry
  };
  if (Object.prototype.hasOwnProperty.call(fields, "expiration")) {
    next.expiration = fields.expiration || "";
  }
  if (Object.prototype.hasOwnProperty.call(fields, "licencesTotales")) {
    next.licencesTotales = fields.licencesTotales;
    next.totalLicenses = fields.licencesTotales;
  }
  if (Object.prototype.hasOwnProperty.call(fields, "utilisateursProteges")) {
    next.utilisateursProteges = fields.utilisateursProteges;
  }
  if (Object.prototype.hasOwnProperty.call(fields, "domainesSurveilles")) {
    next.domainesSurveilles = fields.domainesSurveilles;
  }
  return next;
}
export async function bulkPatchAntispamSolutions(items = [], fields = {}) {
  const groups = groupFleetItemsByClient(items);
  let updated = 0;
  const failed = [];
  for (const [clientId, group] of groups) {
    try {
      const modulesData = await fetchClientModules(clientId);
      const existingEquipements = modulesData?.equipements || {};
      const antispamEquipement = existingEquipements.Antispam || {};
      const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
      let matched = 0;
      const nextSolutions = existingSolutions.map(entry => {
        if (!group.some(item => antispamItemMatches(entry, item))) return entry;
        matched += 1;
        return applyAntispamBulkFields(entry, fields);
      });
      const unmatched = group.filter(item => !existingSolutions.some(entry => antispamItemMatches(entry, item)));
      failed.push(...unmatched);
      if (matched === 0) continue;
      await saveClientModules(clientId, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antispam: nextSolutions.length > 0
        },
        equipements: {
          ...existingEquipements,
          Antispam: {
            ...antispamEquipement,
            solutions: nextSolutions
          }
        }
      });
      updated += matched;
    } catch {
      failed.push(...group);
    }
  }
  return {
    updated,
    failed
  };
}
export async function bulkRemoveAntispamSolutions(items = []) {
  const groups = groupFleetItemsByClient(items);
  let deleted = 0;
  const failed = [];
  for (const [clientId, group] of groups) {
    try {
      const tenantIds = [...new Set(group.map(item => (item.raw || item)?.mailinblackTenantId).filter(Boolean))];
      for (const tenantId of tenantIds) {
        try {
          await deleteClientMailinblackTenant(clientId, tenantId);
        } catch (error) {
          const message = error?.message || "";
          if (!message.toLowerCase().includes("introuvable")) throw error;
        }
      }
      const modulesData = await fetchClientModules(clientId);
      const existingEquipements = modulesData?.equipements || {};
      const antispamEquipement = existingEquipements.Antispam || {};
      const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
      const remaining = existingSolutions.filter(entry => !group.some(item => antispamItemMatches(entry, item)));
      const removed = existingSolutions.length - remaining.length;
      const unmatched = group.filter(item => !existingSolutions.some(entry => antispamItemMatches(entry, item)));
      failed.push(...unmatched);
      if (removed === 0 && tenantIds.length === 0) continue;
      await saveClientModules(clientId, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antispam: remaining.length > 0
        },
        equipements: {
          ...existingEquipements,
          Antispam: {
            ...antispamEquipement,
            solutions: remaining
          }
        }
      });
      deleted += Math.max(removed, group.length - unmatched.length);
    } catch {
      failed.push(...group);
    }
  }
  return {
    deleted,
    failed
  };
}
export function buildAntispamDetailNavigationPayload(client, solution) {
  const normalized = normalizeAntispamItem(solution);
  if (!normalized) return null;
  const providerId = resolveAntispamProviderId(normalized);
  const provider = getAntispamProvider(providerId);
  const productName = resolveAntispamProductName(providerId, provider);
  return {
    ...normalized,
    clientId: client?.id ?? solution?.clientId ?? null,
    clientName: client?.name ?? solution?.clientName ?? null,
    productName,
    logiciel: productName,
    solution: productName
  };
}
