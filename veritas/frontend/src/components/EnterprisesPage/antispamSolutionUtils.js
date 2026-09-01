import { fetchClientModules, saveClientModules } from "../../api/clients";
import { deleteClientMailinblackTenant, syncMailinblackCustomer } from "../../api/clientMailinblack";
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
  return GENERIC_MAILINBLACK_LABELS.has(normalizeLabelKey(value));
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
export function getAntispamSolutionModeLabel(solution) {
  const normalized = normalizeAntispamItem(solution);
  const mode = normalized?.mappingMode || (normalized?.mailinblackTenantId ? "dedicated" : normalized?.customerId ? "reseller" : "manual");
  if (mode === "dedicated") return "Dedicated tenant";
  if (mode === "manual" || normalized?.isManual || normalized?.providerId === "manual") {
    return "Saisie manuelle";
  }
  if (normalized?.customerId) return "Tenant global";
  return "-";
}
function toLicenseNumber(value) {
  if (value == null || value === "") return null;
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
  const domainExpirations = Array.isArray(domains) ? domains.flatMap(domain => [domain?.expiration, domain?.expirationDate, domain?.license?.expirationDate, domain?.license?.expiration, domain?.licence?.expirationDate, domain?.subscription?.expirationDate]) : [];
  const licenseExpirations = collectAntispamLicenseItems(item).flatMap(license => [license?.expirationDate, license?.expiration, license?.expiryDate, license?.renewalDate, license?.endDate, license?.validUntil]);
  return [item?.expiration, item?.expirationDate, item?.expirityDate, customer.expiration, customer.expirationDate, raw.expirationDate, raw.expiration, raw.expiryDate, raw.renewalDate, raw.licenseExpiration, raw.licenceExpiration, raw.endDate, raw.validUntil, ...licenseExpirations, ...domainExpirations];
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
function resolveAntispamLicenseTotal(item) {
  const customer = item?.syncData?.customer || {};
  const raw = customer.raw && typeof customer.raw === "object" ? customer.raw : {};
  const licenseSummary = item?.syncData?.dashboard?.sections?.licenses?.summary;
  const fromApi = toLicenseNumber(licenseSummary?.total ?? customer.licenseCount ?? (Array.isArray(raw.licenses) ? raw.licenses.length : raw.licenses) ?? raw.licenseCount ?? raw.nbLicences ?? raw.nbLicense ?? raw.totalLicenses ?? raw.licenceCount ?? raw.numberOfLicenses ?? raw.maxUsers ?? raw.maxMailboxes);
  const persisted = toLicenseNumber(item?.licencesTotales ?? item?.totalLicenses ?? item?.nombre_licences);
  if (fromApi != null && fromApi > 0) return fromApi;
  if (persisted != null && persisted > 0) return persisted;
  const licenseItems = collectAntispamLicenseItems(item);
  if (licenseItems.length) {
    const summed = licenseItems.reduce((acc, license) => acc + (toLicenseNumber(license?.total ?? license?.quantity ?? license?.count) || 0), 0);
    return summed > 0 ? summed : licenseItems.length;
  }
  const mappedUsersCount = toLicenseNumber(customer.usersCount);
  const usersListCount = toLicenseNumber(item?.utilisateursProteges ?? item?.syncData?.dashboard?.sections?.users?.total);
  if (mappedUsersCount != null && mappedUsersCount > 0 && mappedUsersCount !== usersListCount) return mappedUsersCount;
  return fromApi ?? persisted;
}
function resolveAntispamLicenseUsed(item) {
  const licenseSummary = item?.syncData?.dashboard?.sections?.licenses?.summary;
  const fromSummary = toLicenseNumber(licenseSummary?.used ?? item?.licencesUtilisees ?? item?.usedLicenses);
  if (fromSummary != null) return fromSummary;
  const users = item?.syncData?.dashboard?.sections?.users?.items;
  if (Array.isArray(users) && users.length) {
    const protectedCount = users.filter(user => user?.status === "Protected" || user?.protected === true).length;
    if (protectedCount > 0) return protectedCount;
  }
  return null;
}
export function normalizeAntispamItem(item) {
  if (!item) return null;
  const name = item.logiciel || item.solution || item.nom || item.name || item.customerName || "";
  const customerId = item.customerId || item.customer_id || item.authClientId || item.syncData?.customer?.id || null;
  const hasManualHints = item.mappingMode === "manual" || item.isManual === true || item.providerId === "manual";
  const providerId = item.providerId || (item.mailinblackTenantId || customerId ? "mailinblack" : hasManualHints ? "manual" : inferProviderIdFromSolution(item));
  const mappingMode = item.mappingMode || (item.mailinblackTenantId ? "dedicated" : customerId ? "reseller" : providerId === "manual" || hasManualHints ? "manual" : "manual");
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
    utilisateursProteges: item.utilisateursProteges ?? item.utilisateurs ?? item.nombre_utilisateurs ?? null,
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
    mappingMode: getAntispamSolutionModeLabel(normalized),
    status: computeAntispamExpirationStatus(normalized.expiration),
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
  if (item.customerId) {
    return `api:${item.customerId}|${item.mappingMode || "reseller"}|${item.mailinblackTenantId || ""}`;
  }
  if (item.mailinblackTenantId != null) {
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
  const sources = [...moduleSolutions, ...tenantSolutions, ...(antispamItems || []).map(item => normalizeAntispamItem(item)).filter(Boolean)];
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
  const credentialContext = {
    clientId,
    mailinblackTenantId: normalized.mailinblackTenantId,
    mappingMode,
    signal
  };
  const syncResult = await syncMailinblackCustomer(normalized.customerId, credentialContext);
  if (!syncResult.success) {
    throw new Error(syncResult.error || "Sync failed");
  }
  const updatedPayload = {
    ...syncResult.data,
    providerId: normalized.providerId || "mailinblack",
    mappingMode,
    mailinblackTenantId: mappingMode === "dedicated" ? normalized.mailinblackTenantId : null,
    customerId: normalized.customerId,
    customerName: syncResult.data?.customerName || syncResult.customer?.name || normalized.customerName || ""
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
    dashboard: syncResult.dashboard,
    updatedPayload
  };
}
export function formatAntispamSyncPayload(customer, mappingMode, mailinblackTenantId, providerId = "mailinblack") {
  const provider = getAntispamProvider(providerId);
  const solutionLabel = provider?.solutionName || "Mailinblack Protect";
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
    utilisateursProteges: customer?.usersCount != null ? Number(customer.usersCount) : 0,
    domainesSurveilles: customer?.domainsCount != null ? Number(customer.domainsCount) : 0,
    licencesTotales: customer?.licenseCount ?? customer?.raw?.licenseCount ?? null,
    licencesUtilisees: null,
    expiration: toValidExpirationDate(customer?.expiration)?.toISOString() || "",
    syncData: {
      customer,
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
