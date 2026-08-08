import { fetchClientModules, saveClientModules } from "../../api/clients";
import { deleteClientMailinblackTenant, syncMailinblackCustomer } from "../../api/clientMailinblack";
import { getAntispamProvider, inferProviderIdFromSolution } from "./antispamFormConfig";
function resolveAntispamProviderId(item) {
  const normalized = normalizeAntispamItem(item) || item;
  if (!normalized) return "manual";
  return normalized.providerId || inferProviderIdFromSolution(normalized) || (normalized.mailinblackTenantId || normalized.customerId ? "mailinblack" : null) || (normalized.mappingMode === "dedicated" || normalized.mappingMode === "reseller" ? "mailinblack" : null) || "manual";
}
function resolveAntispamProductName(providerId, provider) {
  if (providerId === "mailinblack") {
    return provider?.solutionName || provider?.label || "Mailinblack Protect";
  }
  if (providerId === "manual") {
    return provider?.label || "Other solution";
  }
  return provider?.solutionName || provider?.label || providerId || "Antispam";
}
function resolveAntispamTenantLabel(item, productName) {
  const normalized = normalizeAntispamItem(item) || item;
  if (!normalized) return null;
  const productLower = (productName || "").trim().toLowerCase();
  const candidates = [normalized.customerName, normalized.syncData?.customer?.name, normalized.label, normalized.nom, normalized.name, normalized.logiciel, normalized.solution];
  for (const value of candidates) {
    const text = (value || "").trim();
    if (!text) continue;
    const lower = text.toLowerCase();
    if (productLower && lower === productLower) continue;
    if (lower === "mailinblack protect" || lower === "mailinblack") continue;
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
    expiration: item.expiration ?? item.expirityDate ?? "",
    utilisateursProteges: item.utilisateursProteges ?? item.utilisateurs ?? item.nombre_utilisateurs ?? null,
    domainesSurveilles: item.domainesSurveilles ?? item.domaines ?? item.licences ?? item.nombre_licences ?? null
  };
}
export function formatAntispamSolutionLabel(solution) {
  const normalized = normalizeAntispamItem(solution);
  if (!normalized) return "Antispam solution";
  return normalized.customerName || normalized.logiciel || normalized.solution || normalized.nom || normalized.name || "Antispam solution";
}
export function formatAntispamSolutionSummary(solution) {
  const normalized = normalizeAntispamItem(solution);
  const providerId = resolveAntispamProviderId(normalized);
  const provider = getAntispamProvider(providerId);
  const providerName = resolveAntispamProductName(providerId, provider);
  const label = resolveAntispamTenantLabel(normalized, providerName) || formatAntispamSolutionLabel(normalized);
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
  if (normalized.providerId === "mailinblack" && normalized.mappingMode === "dedicated" && normalized.mailinblackTenantId) {
    return true;
  }
  const label = (normalized.logiciel || normalized.solution || normalized.nom || "").trim();
  const hasCoverageMeta = String(normalized.utilisateursProteges ?? "").trim() || String(normalized.domainesSurveilles ?? "").trim() || String(normalized.expiration ?? "").trim();
  if (normalized.mappingMode === "manual" || normalized.isManual || normalized.providerId === "manual") {
    return Boolean(label && label !== "N/A" || hasCoverageMeta);
  }
  return Boolean(label && label !== "N/A" && (normalized.utilisateursProteges != null || normalized.domainesSurveilles != null || Boolean(normalized.expiration)));
}
export function isManualAntispamSolution(item) {
  const normalized = normalizeAntispamItem(item);
  if (!normalized || normalized.customerId || normalized.mailinblackTenantId) return false;
  return isAntispamConfigured(normalized);
}
export function computeAntispamExpirationStatus(expiration) {
  if (!expiration) return "unknown";
  const expirationDate = new Date(expiration);
  if (Number.isNaN(expirationDate.getTime())) return "unknown";
  const daysUntil = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 0) return "inactive";
  if (daysUntil <= 30) return "expire_bientot";
  return "actif";
}
export function buildAntispamFleetRow(client, solution, index = 0) {
  const normalized = normalizeAntispamItem(solution);
  const providerId = resolveAntispamProviderId(normalized);
  const provider = getAntispamProvider(providerId);
  const productName = resolveAntispamProductName(providerId, provider);
  const providerImage = resolveAntispamProviderImage(providerId, provider);
  const tenantLabel = resolveAntispamTenantLabel(normalized, productName);
  return {
    id: normalized.id || `${client?.id}-as-${index}`,
    clientId: client?.id,
    clientName: client?.name || `Client ${client?.id}`,
    productName,
    solutionLabel: productName,
    solutionSubtitle: tenantLabel,
    mappingMode: getAntispamSolutionModeLabel(normalized),
    status: computeAntispamExpirationStatus(normalized.expiration),
    expiration: normalized.expiration || null,
    expirationDate: normalized.expiration || null,
    utilisateursProteges: normalized.utilisateursProteges ?? null,
    domainesSurveilles: normalized.domainesSurveilles ?? null,
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
    const solutions = listConfiguredAntispamSolutions(client);
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
  const list = modulesData?.equipements?.Antispam?.solutions;
  if (!Array.isArray(list)) return [];
  return list.map(solution => normalizeAntispamItem(solution)).filter(Boolean);
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
export async function syncAndPersistAntispamSolution(clientId, solution) {
  const normalized = normalizeAntispamItem(solution);
  if (!clientId || !normalized?.customerId) {
    throw new Error("Client Mailinblack introuvable.");
  }
  const mappingMode = normalized.mappingMode || "reseller";
  const credentialContext = {
    clientId,
    mailinblackTenantId: normalized.mailinblackTenantId,
    mappingMode
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
  const modulesData = await fetchClientModules(clientId);
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
      ...(modulesData?.modules_monitoring || {}),
      Antispam: finalSolutions.length > 0
    },
    equipements: {
      ...existingEquipements,
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
    expiration: customer?.expiration || "",
    syncData: {
      customer,
      status: customer?.status || null,
      lastSync: new Date().toISOString()
    }
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
