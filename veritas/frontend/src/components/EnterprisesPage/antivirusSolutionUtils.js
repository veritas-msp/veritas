import { fetchClientModules, saveClientModules } from "../../api/clients";
import { syncBitdefenderCompany, fetchGravityZoneDashboard, fetchBitdefenderStatistics, fetchBitdefenderEnrichedEndpoints } from "../../api/clientBitdefender";
import { getAntivirusProvider, inferProviderIdFromSolution } from "./antivirusFormConfig";
const DEFAULT_SOLUTION_NAME = "GravityZone BitDefender";
const BITDEFENDER_BRAND_NAME = "BITDEFENDER";
const GENERIC_BITDEFENDER_LABELS = new Set(["bitdefender", "bitdefender gravityzone", "gravityzone bitdefender", "gravityzone"]);
function normalizeLabelKey(value) {
  return String(value || "").toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}
function isGenericBitdefenderLabel(value) {
  return GENERIC_BITDEFENDER_LABELS.has(normalizeLabelKey(value));
}
function resolveAntivirusTenantLabel(item) {
  const normalized = normalizeAntivirusItem(item) || item;
  if (!normalized) return null;
  const candidates = [normalized.companyName, normalized.syncData?.company?.name, normalized.nom, normalized.name, normalized.solution];
  for (const value of candidates) {
    const text = (value || "").trim();
    if (!text || isGenericBitdefenderLabel(text)) continue;
    return text;
  }
  return null;
}
export function formatAntivirusEndpointType(type) {
  if (type == null || type === "") return "-";
  if (type === 1 || type === "1") return "Physique";
  if (type === 2 || type === 3 || type === "2" || type === "3") return "Virtuel";
  const raw = String(type).trim();
  const t = raw.toLowerCase();
  if (t === "virtuel" || t === "virtual") return "Virtuel";
  if (t === "physique" || t === "physical") return "Physique";
  if (t === "autre" || t === "other") return "Autre";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
export function getAntivirusSolutionModeLabel(solution) {
  const mode = solution?.mappingMode || "reseller";
  if (mode === "dedicated") return "Dedicated tenant";
  if (mode === "manual" || solution?.isManual || solution?.providerId === "manual") {
    return "Saisie manuelle";
  }
  return "Tenant global";
}
export function formatAntivirusSolutionLabel(solution) {
  const normalized = normalizeAntivirusItem(solution);
  if (!normalized) return "Antivirus solution";
  const providerId = normalized.providerId || (normalized.companyId ? "bitdefender" : "manual");
  if (providerId === "bitdefender") return BITDEFENDER_BRAND_NAME;
  return resolveAntivirusTenantLabel(normalized) || normalized.solution || normalized.nom || normalized.name || "Antivirus solution";
}
export function formatAntivirusSolutionSummary(solution) {
  const normalized = normalizeAntivirusItem(solution);
  const providerId = normalized?.providerId || (normalized?.companyId ? "bitdefender" : "manual");
  const providerName = providerId === "bitdefender" ? BITDEFENDER_BRAND_NAME : providerId === "manual" ? "Other solution" : providerId;
  const tenantLabel = resolveAntivirusTenantLabel(normalized || solution);
  const label = providerId === "bitdefender" ? providerName : tenantLabel || formatAntivirusSolutionLabel(normalized || solution);
  const mode = getAntivirusSolutionModeLabel(normalized || solution);
  return {
    label,
    mode,
    providerName,
    providerId,
    tenantLabel
  };
}
export function resolveAntivirusProductName(solution) {
  const normalized = normalizeAntivirusItem(solution);
  if (!normalized) return DEFAULT_SOLUTION_NAME;
  const summary = formatAntivirusSolutionSummary(normalized);
  if (summary.providerName && summary.providerId !== "manual") {
    return summary.providerName;
  }
  const provider = getAntivirusProvider(summary.providerId);
  if (provider?.label) return provider.label;
  const manualLabel = (normalized.solution || normalized.nom || normalized.name || "").trim();
  if (manualLabel && manualLabel !== normalized.companyName) return manualLabel;
  return DEFAULT_SOLUTION_NAME;
}
export function listOverviewAntivirusSolutions(solutions = []) {
  return (solutions || []).filter(item => Boolean(normalizeAntivirusItem(item)?.companyId));
}
export function normalizeAntivirusItem(item) {
  if (!item) return null;
  const companyId = item.companyId || item.company_id || item.syncData?.company?.id || null;
  const hasManualHints = item.mappingMode === "manual" || item.isManual === true || item.providerId === "manual";
  const providerId = item.providerId || (companyId ? "bitdefender" : hasManualHints ? "manual" : inferProviderIdFromSolution(item));
  const isManualEntry = hasManualHints || !companyId && providerId === "manual";
  return {
    ...item,
    companyId,
    companyName: item.companyName || item.syncData?.company?.name || item.solution || item.nom || item.name || null,
    providerId: providerId || null,
    mappingMode: item.mappingMode || (isManualEntry ? "manual" : "reseller"),
    isManual: item.isManual ?? isManualEntry,
    bitdefenderTenantId: item.bitdefenderTenantId || null
  };
}
export function isAntivirusConfigured(item) {
  const normalized = normalizeAntivirusItem(item);
  if (!normalized) return false;
  if (normalized.companyId) return true;
  const label = (normalized.solution || normalized.nom || normalized.name || "").trim();
  const hasLicenseMeta = String(normalized.licencesTotales ?? "").trim() || String(normalized.licencesUtilisees ?? "").trim() || String(normalized.expiration ?? "").trim();
  if (normalized.mappingMode === "manual" || normalized.isManual || normalized.providerId === "manual") {
    return Boolean(label || hasLicenseMeta);
  }
  if (label || hasLicenseMeta) return true;
  return false;
}
export function isManualAntivirusSolution(item) {
  const normalized = normalizeAntivirusItem(item);
  if (!normalized || normalized.companyId) return false;
  return isAntivirusConfigured(normalized);
}
export function listConfiguredAntivirusSolutions(client, antivirusItems = [], modulesData = null) {
  const sources = [...extractAntivirusSolutionsFromModules(modulesData || {
    equipements: client?.equipements
  }), ...(antivirusItems || []).map(item => normalizeAntivirusItem(item)).filter(Boolean)];
  const seen = new Set();
  const configured = [];
  for (const item of sources) {
    if (!isAntivirusConfigured(item)) continue;
    const dedupeKey = buildConfiguredDedupeKey(item);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    configured.push(item);
  }
  return configured;
}
export function isClientAntivirusConfigured(client, antivirusItems = [], modulesData = null) {
  return listConfiguredAntivirusSolutions(client, antivirusItems, modulesData).length > 0;
}
export function extractAntivirusSolutionsFromModules(modulesData) {
  const list = modulesData?.equipements?.Antivirus?.solutions;
  if (!Array.isArray(list)) return [];
  return list.map(solution => normalizeAntivirusItem(solution)).filter(Boolean);
}
function buildConfiguredDedupeKey(item) {
  if (item.companyId) {
    return `api:${item.companyId}|${item.mappingMode || "reseller"}|${item.bitdefenderTenantId || ""}`;
  }
  const label = (item.solution || item.nom || item.name || "").trim().toLowerCase();
  return `manual:${item.id ?? label}|${item.mappingMode || "manual"}`;
}
export function mergeAntivirusSources(apiItems = [], modulesData) {
  const moduleItems = extractAntivirusSolutionsFromModules(modulesData);
  const merged = new Map();
  for (const raw of apiItems || []) {
    const item = normalizeAntivirusItem(raw);
    if (!item) continue;
    const key = item.companyId || item.item_key || item.nom || item.name;
    if (!key) continue;
    merged.set(String(key), item);
  }
  for (const item of moduleItems) {
    const key = item.companyId || item.solution || item.nom || item.name;
    if (!key) continue;
    merged.set(String(key), {
      ...merged.get(String(key)),
      ...item
    });
  }
  return [...merged.values()];
}
export function resolveAntivirusItemForBrick(brick, antivirusItems = [], client, modulesData = null) {
  const configured = listConfiguredAntivirusSolutions(client, [...(brick?.items || []), ...(antivirusItems || [])], modulesData);
  return configured[0] || null;
}
function solutionMatches(a, b) {
  if (a.companyId && b.companyId) {
    return String(a.companyId) === String(b.companyId) && (a.mappingMode || "reseller") === (b.mappingMode || "reseller") && (a.bitdefenderTenantId || null) === (b.bitdefenderTenantId || null);
  }
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
  const nameA = (a.solution || a.nom || a.name || "").trim().toLowerCase();
  const nameB = (b.solution || b.nom || b.name || "").trim().toLowerCase();
  return Boolean(nameA) && nameA === nameB && !a.companyId && !b.companyId;
}
export async function removeAntivirusSolution(clientId, solution) {
  const normalized = normalizeAntivirusItem(solution);
  if (!clientId || !normalized?.companyId && !solution?.id && !solution?.solution) {
    throw new Error("Antivirus association not found.");
  }
  const modulesData = await fetchClientModules(clientId);
  const existingEquipements = modulesData?.equipements || {};
  const antivirusEquipement = existingEquipements.Antivirus || {};
  const existingSolutions = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
  const remaining = existingSolutions.filter(entry => !solutionMatches(entry, normalized));
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      ...(modulesData?.modules_monitoring || {}),
      Antivirus: remaining.length > 0
    },
    equipements: {
      ...existingEquipements,
      Antivirus: {
        ...antivirusEquipement,
        solutions: remaining
      }
    }
  });
  return remaining;
}
export async function reorderAntivirusSolutions(clientId, orderedItems = []) {
  if (!clientId) throw new Error("Client not found.");
  const modulesData = await fetchClientModules(clientId);
  const existingEquipements = modulesData?.equipements || {};
  const antivirusEquipement = existingEquipements.Antivirus || {};
  const raw = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
  const used = new Set();
  const reordered = [];
  for (const item of orderedItems) {
    const normalized = normalizeAntivirusItem(item);
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
      Antivirus: reordered.length > 0
    },
    equipements: {
      ...existingEquipements,
      Antivirus: {
        ...antivirusEquipement,
        solutions: reordered
      }
    }
  });
  return reordered.map(entry => normalizeAntivirusItem(entry)).filter(Boolean);
}
function normalizeExpirationDate(rawDate) {
  if (!rawDate) return "";
  const expDate = new Date(rawDate);
  if (Number.isNaN(expDate.getTime())) return "";
  return expDate.toISOString().split("T")[0];
}
function ignoreUnlessAbort(error) {
  if (error?.name === "AbortError") throw error;
  return null;
}
export async function fetchFullAntivirusSyncExtra(companyId, credentialContext) {
  const [dashboard, statisticsRes, enrichedRes] = await Promise.all([fetchGravityZoneDashboard(companyId, credentialContext).catch(ignoreUnlessAbort), fetchBitdefenderStatistics(companyId, credentialContext).catch(ignoreUnlessAbort), fetchBitdefenderEnrichedEndpoints(companyId, credentialContext).catch(ignoreUnlessAbort)]);
  return {
    dashboard,
    statistics: statisticsRes?.statistics || null,
    enrichedEndpoints: enrichedRes?.endpoints || null,
    enrichedSummary: enrichedRes?.summary || null
  };
}
export function formatAntivirusSyncPayload(syncData, companyId, companyName, mappingMode, bitdefenderTenantId, providerId = "bitdefender", extra = {}) {
  const provider = getAntivirusProvider(providerId);
  const solutionLabel = provider?.solutionName || DEFAULT_SOLUTION_NAME;
  const dashLicense = extra?.dashboard?.sections?.license?.data;
  const license = syncData?.license;
  let licencesTotales = "";
  let licencesUtilisees = "";
  let expiration = "";
  const licenseSources = [license, dashLicense].filter(Boolean);
  for (const source of licenseSources) {
    const total = source.totalLicenses ?? source.total;
    const used = source.usedLicenses ?? source.used;
    const rawDate = source.expirationDate ?? source.expiration;
    if (total != null && !licencesTotales) licencesTotales = String(total);
    if (used != null && !licencesUtilisees) licencesUtilisees = String(used);
    if (rawDate && !expiration) expiration = normalizeExpirationDate(rawDate);
  }
  const endpointsList = syncData?.endpoints?.list || [];
  const mergedLicense = {
    ...(license || {}),
    ...(dashLicense ? {
      totalLicenses: dashLicense.total ?? license?.totalLicenses,
      usedLicenses: dashLicense.used ?? license?.usedLicenses,
      expirationDate: dashLicense.expirationDate ?? license?.expirationDate
    } : {})
  };
  return {
    solution: solutionLabel,
    providerId,
    mappingMode,
    bitdefenderTenantId: mappingMode === "dedicated" ? bitdefenderTenantId : null,
    companyId,
    companyName,
    licencesTotales,
    licencesUtilisees,
    expiration,
    endpoints: endpointsList.map(ep => ({
      id: ep.id,
      name: ep.name || "Sans nom",
      ip: ep.ip || "",
      type: ep.type || "autre",
      machineType: ep.machineType,
      operatingSystem: ep.operatingSystem || "",
      fqdn: ep.fqdn || "",
      isManaged: ep.isManaged || false
    })),
    syncData: {
      license: Object.keys(mergedLicense).length ? mergedLicense : null,
      endpoints: syncData?.endpoints || null,
      company: syncData?.company || null,
      dashboard: extra.dashboard || null,
      statistics: extra.statistics || null,
      enrichedEndpoints: extra.enrichedEndpoints || null,
      enrichedSummary: extra.enrichedSummary || null,
      lastSync: new Date().toISOString()
    }
  };
}
export async function syncAndPersistAntivirusSolution(clientId, solution, {
  signal
} = {}) {
  const normalized = normalizeAntivirusItem(solution);
  if (!clientId || !normalized?.companyId) {
    throw new Error("Solution GravityZone introuvable.");
  }
  const mappingMode = normalized.mappingMode || "reseller";
  const credentialContext = {
    clientId,
    bitdefenderTenantId: normalized.bitdefenderTenantId,
    mappingMode,
    signal
  };
  const companyId = normalized.companyId;
  const [syncResult, syncExtra] = await Promise.all([syncBitdefenderCompany(companyId, credentialContext), fetchFullAntivirusSyncExtra(companyId, credentialContext)]);
  if (!syncResult.success) {
    throw new Error(syncResult.error || "Sync failed");
  }
  const providerId = normalized.providerId || "bitdefender";
  const companyName = syncResult.data?.company?.name || syncExtra.dashboard?.sections?.company?.data?.name || normalized.companyName || normalized.solution || "";
  const updatedPayload = formatAntivirusSyncPayload(syncResult.data, companyId, companyName, mappingMode, normalized.bitdefenderTenantId, providerId, syncExtra);
  const modulesData = await fetchClientModules(clientId, {
    signal
  });
  const existingEquipements = modulesData?.equipements || {};
  const antivirusEquipement = existingEquipements.Antivirus || {};
  const existingSolutions = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
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
      Antivirus: finalSolutions.length > 0
    },
    equipements: {
      Antivirus: {
        ...antivirusEquipement,
        solutions: finalSolutions
      }
    }
  });
  return {
    syncResult,
    dashboard: syncExtra.dashboard,
    statistics: syncExtra.statistics,
    enrichedSummary: syncExtra.enrichedSummary,
    enrichedEndpoints: syncExtra.enrichedEndpoints,
    updatedPayload
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
function antivirusItemMatches(entry, item) {
  const left = normalizeAntivirusItem(entry) || entry;
  const right = normalizeAntivirusItem(item?.raw || item) || item?.raw || item;
  if (!left || !right) return false;
  return solutionMatches(left, right);
}
function applyAntivirusBulkFields(entry, fields = {}) {
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
  return next;
}
export async function bulkPatchAntivirusSolutions(items = [], fields = {}) {
  const groups = groupFleetItemsByClient(items);
  let updated = 0;
  const failed = [];
  for (const [clientId, group] of groups) {
    try {
      const modulesData = await fetchClientModules(clientId);
      const existingEquipements = modulesData?.equipements || {};
      const antivirusEquipement = existingEquipements.Antivirus || {};
      const existingSolutions = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
      let matched = 0;
      const nextSolutions = existingSolutions.map(entry => {
        if (!group.some(item => antivirusItemMatches(entry, item))) return entry;
        matched += 1;
        return applyAntivirusBulkFields(entry, fields);
      });
      const unmatched = group.filter(item => !existingSolutions.some(entry => antivirusItemMatches(entry, item)));
      failed.push(...unmatched);
      if (matched === 0) continue;
      await saveClientModules(clientId, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antivirus: nextSolutions.length > 0
        },
        equipements: {
          ...existingEquipements,
          Antivirus: {
            ...antivirusEquipement,
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
export async function bulkRemoveAntivirusSolutions(items = []) {
  const groups = groupFleetItemsByClient(items);
  let deleted = 0;
  const failed = [];
  for (const [clientId, group] of groups) {
    try {
      const modulesData = await fetchClientModules(clientId);
      const existingEquipements = modulesData?.equipements || {};
      const antivirusEquipement = existingEquipements.Antivirus || {};
      const existingSolutions = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
      const remaining = existingSolutions.filter(entry => !group.some(item => antivirusItemMatches(entry, item)));
      const removed = existingSolutions.length - remaining.length;
      const unmatched = group.filter(item => !existingSolutions.some(entry => antivirusItemMatches(entry, item)));
      failed.push(...unmatched);
      if (removed === 0) continue;
      await saveClientModules(clientId, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antivirus: remaining.length > 0
        },
        equipements: {
          ...existingEquipements,
          Antivirus: {
            ...antivirusEquipement,
            solutions: remaining
          }
        }
      });
      deleted += removed;
    } catch {
      failed.push(...group);
    }
  }
  return {
    deleted,
    failed
  };
}
export function buildAntivirusDetailNavigationPayload(client, solution) {
  const normalized = normalizeAntivirusItem(solution);
  if (!normalized) return null;
  const productName = resolveAntivirusProductName(normalized);
  return {
    ...normalized,
    clientId: client?.id ?? solution?.clientId ?? null,
    clientName: client?.name ?? solution?.clientName ?? null,
    productName,
    solution: productName
  };
}
