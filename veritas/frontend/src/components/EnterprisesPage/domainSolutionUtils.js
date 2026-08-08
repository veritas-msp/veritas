import { fetchClientModules, saveClientModules } from "../../api/clients";
import { fetchOvhDomains, fetchOvhDomainDetails } from "../../api/clientOvh";
import { getDnsProvider, inferProviderIdFromDomain } from "./dnsFormConfig";
function formatDateForStorage(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw).split("T")[0] || "";
  return date.toISOString().split("T")[0];
}
export function formatRenewalModeLabel(mode) {
  if (mode === "automatic") return "Automatique";
  if (mode === "manual") return "Manuel";
  return "Unknown";
}
export function normalizeDomainItem(item) {
  if (!item) return null;
  const nom = item.nom || item.domaine || item.name || item.domain || "";
  const expirationRaw = item.expiration || item.expirationDate || item.expirityDate || null;
  const autoRenew = item.autoRenew ?? item.auto_renewal ?? null;
  const hasManualHints = item.providerId === "manual" || item.isManual === true;
  const providerId = item.providerId || ((item.registrar || "").toLowerCase().includes("ovh") ? "ovh" : hasManualHints ? "manual" : inferProviderIdFromDomain({
    ...item,
    nom
  }));
  return {
    ...item,
    nom,
    domaine: item.domaine || nom,
    name: item.name || nom,
    domain: item.domain || nom,
    registrar: item.registrar || (providerId === "ovh" ? "OVH" : providerId === "manual" ? null : "") || "",
    providerId: providerId || null,
    isManual: item.isManual ?? providerId === "manual",
    expiration: formatDateForStorage(expirationRaw),
    expirationDate: expirationRaw,
    autoRenew,
    auto_renewal: autoRenew,
    manualPayment: item.manualPayment ?? null,
    deleteAtExpiration: item.deleteAtExpiration ?? null,
    renewalMode: item.renewalMode || null,
    renewalPeriod: item.renewalPeriod ?? null,
    dnsZone: item.dnsZone || null,
    hasDnsZone: item.hasDnsZone ?? Boolean(item.dnsZone),
    serviceId: item.serviceId ?? null,
    serviceStatus: item.serviceStatus ?? null,
    syncData: item.syncData || null
  };
}
export function mapOvhApiDomainToMonitored(ovhDomain) {
  const nom = ovhDomain.domain || ovhDomain.name || ovhDomain.nom || "";
  return normalizeDomainItem({
    nom,
    registrar: "OVH",
    providerId: "ovh",
    expiration: ovhDomain.expiration || ovhDomain.expirationDate,
    autoRenew: ovhDomain.autoRenew,
    manualPayment: ovhDomain.manualPayment,
    deleteAtExpiration: ovhDomain.deleteAtExpiration,
    renewalMode: ovhDomain.renewalMode,
    renewalPeriod: ovhDomain.renewalPeriod,
    dnsZone: ovhDomain.dnsZone,
    hasDnsZone: ovhDomain.hasDnsZone,
    serviceId: ovhDomain.serviceId,
    serviceStatus: ovhDomain.serviceStatus,
    nameServers: ovhDomain.nameServers,
    whoisOwner: ovhDomain.whoisOwner,
    syncData: ovhDomain.syncData
  });
}
export function formatDomainSummary(domain) {
  const normalized = normalizeDomainItem(domain);
  if (!normalized) return {
    label: "Domain",
    meta: ""
  };
  const providerId = normalized.providerId || inferProviderIdFromDomain(normalized) || "manual";
  const providerName = providerId === "manual" ? getDnsProvider("manual")?.label || "Other registrar" : providerId === "ovh" ? "OVH" : getDnsProvider(providerId)?.label || normalized.registrar || "-";
  const registrarLabel = normalized.registrar && normalized.registrar !== "N/A" && providerId !== "manual" ? normalized.registrar : providerId === "manual" && normalized.registrar ? normalized.registrar : null;
  const metaParts = [registrarLabel || providerName];
  if (normalized.expiration) {
    metaParts.push(`Expires on ${new Date(normalized.expiration).toLocaleDateString("en-GB")}`);
  }
  if (normalized.autoRenew != null) {
    metaParts.push(normalized.autoRenew ? "Auto-renewal" : "Manual renewal");
  }
  if (normalized.hasDnsZone) {
    metaParts.push("OVH DNS zone");
  }
  return {
    label: normalized.nom || "Domain",
    providerName,
    providerId,
    meta: metaParts.join(" · ")
  };
}
export function isDomainConfigured(item) {
  const normalized = normalizeDomainItem(item);
  return Boolean(normalized?.nom?.trim());
}
export function isManualDomain(item) {
  const normalized = normalizeDomainItem(item);
  if (!normalized?.nom?.trim()) return false;
  if (normalized.providerId === "ovh") return false;
  if ((normalized.registrar || "").toLowerCase().includes("ovh")) return false;
  return Boolean(normalized.providerId === "manual" || normalized.isManual);
}
export function extractDomainsFromModules(modulesData) {
  const list = modulesData?.equipements?.NDD;
  if (!Array.isArray(list)) return [];
  return list.map(item => normalizeDomainItem(item)).filter(Boolean);
}
function buildDomainDedupeKey(item) {
  const normalized = normalizeDomainItem(item);
  return (normalized?.nom || "").trim().toLowerCase();
}
export function listConfiguredDomains(client, domainItems = [], modulesData = null) {
  const sources = [...extractDomainsFromModules(modulesData || {
    equipements: client?.equipements
  }), ...(domainItems || []).map(item => normalizeDomainItem(item)).filter(Boolean)];
  const seen = new Set();
  const configured = [];
  for (const item of sources) {
    if (!isDomainConfigured(item)) continue;
    const dedupeKey = buildDomainDedupeKey(item);
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    configured.push(item);
  }
  return configured;
}
export function isClientDomainsConfigured(client, domainItems = [], modulesData = null) {
  return listConfiguredDomains(client, domainItems, modulesData).length > 0;
}
function domainMatches(a, b) {
  return buildDomainDedupeKey(a) === buildDomainDedupeKey(b);
}
export async function saveMonitoredDomains(clientId, domains) {
  const normalized = (domains || []).map(d => normalizeDomainItem(d)).filter(isDomainConfigured);
  const modulesData = await fetchClientModules(clientId);
  const existingEquipements = modulesData?.equipements || {};
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      ...(modulesData?.modules_monitoring || {}),
      NDD: normalized.length > 0
    },
    equipements: {
      ...existingEquipements,
      NDD: normalized
    }
  });
  return normalized;
}
export async function removeMonitoredDomain(clientId, domain) {
  const normalized = normalizeDomainItem(domain);
  if (!clientId || !normalized?.nom) {
    throw new Error("Domaine introuvable.");
  }
  const modulesData = await fetchClientModules(clientId);
  const existing = extractDomainsFromModules(modulesData);
  const remaining = existing.filter(entry => !domainMatches(entry, normalized));
  return saveMonitoredDomains(clientId, remaining);
}
export async function reorderMonitoredDomains(clientId, orderedItems = []) {
  const normalized = (orderedItems || []).map(d => normalizeDomainItem(d)).filter(isDomainConfigured);
  return saveMonitoredDomains(clientId, normalized);
}
export async function importOvhDomainsForClient(clientId, ovhDomains = [], existingDomains = []) {
  const existingKeys = new Set((existingDomains || []).map(d => buildDomainDedupeKey(d)).filter(Boolean));
  const toAdd = (ovhDomains || []).map(d => mapOvhApiDomainToMonitored(d)).filter(d => {
    const key = buildDomainDedupeKey(d);
    return key && !existingKeys.has(key);
  });
  const merged = [...(existingDomains || []).map(normalizeDomainItem), ...toAdd];
  return saveMonitoredDomains(clientId, merged);
}
export async function refreshMonitoredDomainsFromOvh(clientId) {
  const modulesData = await fetchClientModules(clientId);
  const existing = extractDomainsFromModules(modulesData);
  const ovhMonitored = existing.filter(d => d.providerId === "ovh" && d.nom);
  if (ovhMonitored.length === 0) {
    return existing;
  }
  const apiResult = await fetchOvhDomains({
    light: true
  });
  const apiDomains = Array.isArray(apiResult.domains) ? apiResult.domains : [];
  const apiByName = new Map(apiDomains.map(d => [(d.domain || d.name || "").toLowerCase(), mapOvhApiDomainToMonitored(d)]));
  const updated = existing.map(domain => {
    if (domain.providerId !== "ovh") return domain;
    const fresh = apiByName.get((domain.nom || "").toLowerCase());
    if (!fresh) return domain;
    return {
      ...domain,
      ...fresh,
      nom: domain.nom
    };
  });
  return saveMonitoredDomains(clientId, updated);
}
export async function refreshSingleMonitoredDomainFromOvh(clientId, domain) {
  const normalized = normalizeDomainItem(domain);
  if (!clientId || !normalized?.nom) {
    throw new Error("Domaine introuvable.");
  }
  if (normalized.providerId !== "ovh") {
    return normalized;
  }
  const result = await fetchOvhDomainDetails(normalized.nom);
  const fresh = result?.domain || result;
  const mapped = mapOvhApiDomainToMonitored(fresh || {});
  const modulesData = await fetchClientModules(clientId);
  const existing = extractDomainsFromModules(modulesData);
  const merged = existing.map(entry => domainMatches(entry, normalized) ? {
    ...entry,
    ...mapped,
    nom: normalized.nom
  } : entry);
  await saveMonitoredDomains(clientId, merged);
  return merged.find(entry => domainMatches(entry, normalized)) || mapped;
}
