import moment from "moment";
import { fetchClientsList, fetchClientModules } from "../../api/clients";
export const INFRASTRUCTURE_TYPES = ["Servers", "Ordinateurs", "NAS", "SAN", "Firewalls", "Internet", "Switch", "BorneWifi"];
export const CYBERSECURITY_TYPES = ["Antispam", "Antivirus", "Backup"];
export const SERVICE_TYPES = ["Office365", "NDD"];
const PLANNING_CLIENTS_CACHE_KEY = "planning_clients_list_cache_v1";
const PLANNING_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const PLANNING_CLIENT_MODULES_CACHE_KEY = "planning_client_modules_cache_v1";
const PLANNING_CLIENT_MODULES_CACHE_TTL_MS = 5 * 60 * 1000;
export const EVENT_META_MARKER = "<!--VERITAS_EVENT_META:";
const planningClientModulesMemoryCache = new Map();
function safeEncodeMeta(obj) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return null;
  }
}
function safeDecodeMeta(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}
export function parseEventDescription(rawDescription) {
  const raw = (rawDescription || "").toString();
  const markerIndex = raw.indexOf(EVENT_META_MARKER);
  let text = raw;
  let meta = null;
  if (markerIndex !== -1) {
    const endIndex = raw.indexOf("-->", markerIndex);
    if (endIndex !== -1) {
      const encoded = raw.slice(markerIndex + EVENT_META_MARKER.length, endIndex).trim();
      meta = safeDecodeMeta(encoded);
      text = raw.slice(0, markerIndex).trimEnd();
      meta = meta && typeof meta === "object" ? meta : null;
    }
  }
  if (/VERITAS_TICKET:/i.test(raw)) {
    const match = raw.match(/VERITAS_TICKET:([0-9a-fA-F-]{36})(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?/);
    if (match) {
      meta = {
        ...(meta || {}),
        salesPmTask: true,
        ticketId: match[1] || meta?.ticketId || null,
        ticketNumber: match[2] || meta?.ticketNumber || null,
        kind: match[3] || meta?.kind || null,
        pmTaskId: match[4] || meta?.pmTaskId || null
      };
    }
  }
  text = text
    .replace(/VERITAS_TICKET:[^\n]*/gi, "")
    .replace(/<!--VERITAS_EVENT_META:[\s\S]*?-->/g, "")
    .trim();
  return {
    text,
    meta
  };
}
function ensureTicketSentinelInText(text, meta) {
  if (!meta?.salesPmTask || !meta?.ticketId) return (text || "").trim();
  const without = String(text || "").replace(/VERITAS_TICKET:[^\n]*/gi, "").trim();
  const sentinel = `VERITAS_TICKET:${meta.ticketId}|${meta.ticketNumber || ""}|${meta.kind || ""}|${meta.pmTaskId || ""}`;
  return without ? `${sentinel}\n\n${without}` : sentinel;
}
export function serializeEventDescription(text, meta) {
  const cleanText = ensureTicketSentinelInText(text, meta);
  const hasMeta =
    (Array.isArray(meta?.linkedItems) && meta.linkedItems.length > 0) ||
    (Array.isArray(meta?.assignedUserIds) && meta.assignedUserIds.length > 0) ||
    (Array.isArray(meta?.todos) && meta.todos.length > 0) ||
    meta?.schedule?.allDay === true ||
    meta?.schedule?.businessDaysOnly === false ||
    meta?.ticketReminder === true ||
    meta?.salesPmTask === true ||
    Boolean(meta?.ticketId) ||
    Boolean(meta?.pmTaskId);
  if (!hasMeta) return cleanText || null;
  const encoded = safeEncodeMeta(meta);
  if (!encoded) return cleanText || null;
  return `${cleanText}\n\n${EVENT_META_MARKER}${encoded}-->`;
}
function isBusinessDay(dayMoment) {
  const day = dayMoment.day();
  return day !== 0 && day !== 6;
}
export function getBusinessEndDate(startDate, durationDays) {
  const safeDuration = Math.max(1, Number(durationDays) || 1);
  const cursor = moment(startDate).startOf("day");
  let counted = 0;
  while (counted < safeDuration) {
    if (isBusinessDay(cursor)) {
      counted += 1;
      if (counted === safeDuration) break;
    }
    cursor.add(1, "day");
  }
  return cursor;
}
export function getBusinessDaysCountInclusive(startDate, endDate) {
  const start = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 1;
  let count = 0;
  const cursor = start.clone();
  while (cursor.isSameOrBefore(end, "day")) {
    if (isBusinessDay(cursor)) count += 1;
    cursor.add(1, "day");
  }
  return Math.max(1, count);
}
export function getCalendarEndDate(startDate, durationDays) {
  const safeDuration = Math.max(1, Number(durationDays) || 1);
  return moment(startDate).startOf("day").add(safeDuration - 1, "days");
}
export function getCalendarDaysCountInclusive(startDate, endDate) {
  const start = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 1;
  return Math.max(1, end.diff(start, "days") + 1);
}
export function getSlotDefaultTimes(slotDate) {
  const base = moment(slotDate);
  if (!base.isValid()) {
    const fallback = moment();
    return {
      startTime: "09:00",
      endTime: "12:00",
      endDate: fallback.format("YYYY-MM-DD")
    };
  }
  const isStartOfDay = base.hour() === 0 && base.minute() === 0 && base.second() === 0;
  if (isStartOfDay) {
    return {
      startTime: "09:00",
      endTime: "12:00",
      endDate: base.format("YYYY-MM-DD")
    };
  }
  const end = base.clone().add(1, "hour");
  return {
    startTime: base.format("HH:mm"),
    endTime: end.format("HH:mm"),
    endDate: end.format("YYYY-MM-DD")
  };
}
function normalizeClientListRow(client) {
  let modulesSnapshot = client.modules;
  if (typeof modulesSnapshot === "string") {
    try {
      modulesSnapshot = JSON.parse(modulesSnapshot);
    } catch {
      modulesSnapshot = {};
    }
  }
  if (!modulesSnapshot || typeof modulesSnapshot !== "object") {
    modulesSnapshot = {};
  }
  return {
    ...client,
    modules_monitoring: modulesSnapshot
  };
}
export async function loadPlanningClientsListCached({
  force = false,
  signal
} = {}) {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(PLANNING_CLIENTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < PLANNING_CLIENTS_CACHE_TTL_MS;
        if (isFresh) {
          return parsed.data.map(normalizeClientListRow);
        }
      }
    } catch {}
  }
  const clientsData = await fetchClientsList({
    signal
  });
  if (signal?.aborted) return [];
  const normalized = (Array.isArray(clientsData) ? clientsData : []).map(normalizeClientListRow);
  try {
    sessionStorage.setItem(PLANNING_CLIENTS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: normalized
    }));
  } catch {}
  return normalized;
}
function getPlanningClientModulesSessionCache() {
  try {
    const raw = sessionStorage.getItem(PLANNING_CLIENT_MODULES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function setPlanningClientModulesSessionCache(cacheObj) {
  try {
    sessionStorage.setItem(PLANNING_CLIENT_MODULES_CACHE_KEY, JSON.stringify(cacheObj));
  } catch {}
}
export async function loadClientModulesCached(clientId, {
  force = false,
  signal
} = {}) {
  const idStr = String(clientId || "").trim();
  if (!idStr) return null;
  const now = Date.now();
  if (!force) {
    const mem = planningClientModulesMemoryCache.get(idStr);
    if (mem?.savedAt && mem?.data && now - mem.savedAt < PLANNING_CLIENT_MODULES_CACHE_TTL_MS) {
      return mem.data;
    }
    const sessionCache = getPlanningClientModulesSessionCache();
    const entry = sessionCache[idStr];
    if (entry?.savedAt && entry?.data && now - entry.savedAt < PLANNING_CLIENT_MODULES_CACHE_TTL_MS) {
      planningClientModulesMemoryCache.set(idStr, entry);
      return entry.data;
    }
  }
  const mod = await fetchClientModules(idStr, {
    signal
  });
  if (signal?.aborted || !mod) return mod;
  const newEntry = {
    savedAt: now,
    data: mod
  };
  planningClientModulesMemoryCache.set(idStr, newEntry);
  const sessionCache = getPlanningClientModulesSessionCache();
  sessionCache[idStr] = newEntry;
  setPlanningClientModulesSessionCache(sessionCache);
  return mod;
}
export async function hydrateClientsEquipements(clientIds, clientsBase, signal) {
  const need = [...new Set(clientIds.map(String).filter(Boolean))];
  if (need.length === 0) {
    return clientsBase.map(c => ({
      ...c
    }));
  }
  const byId = new Map(clientsBase.map(c => [String(c.id), {
    ...c
  }]));
  await Promise.all(need.map(async idStr => {
    if (signal?.aborted) return;
    try {
      const mod = await loadClientModulesCached(idStr, {
        signal
      });
      if (signal?.aborted || !mod) return;
      const c = byId.get(idStr);
      if (!c) return;
      byId.set(idStr, {
        ...c,
        equipements: mod.equipements || {},
        modules_monitoring: mod.modules_monitoring || c.modules_monitoring
      });
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      console.error("Planning: chargement modules client", idStr, e);
    }
  }));
  return clientsBase.map(c => byId.get(String(c.id)) || {
    ...c
  });
}
export function buildClientEquipmentLists(client, equipmentMappings = {}) {
  const peripheralsList = [];
  const cybersecuritiesList = [];
  const servicesList = [];
  if (!client?.equipements) {
    return {
      peripherals: peripheralsList,
      cybersecurities: cybersecuritiesList,
      services: servicesList
    };
  }
  Object.keys(client.equipements).forEach(type => {
    if (INFRASTRUCTURE_TYPES.includes(type)) {
      const equipmentsOfType = client.equipements[type] || [];
      equipmentsOfType.forEach(eq => {
        const equipmentName = eq.name || eq.nom || "Sans nom";
        const mappingKey = `${type}-${equipmentName}`;
        const mapping = equipmentMappings[mappingKey];
        peripheralsList.push({
          id: eq.id || `${type}-${equipmentName}`,
          name: equipmentName,
          type,
          isMapped: mapping && mapping.checkmk_host_name && mapping.is_active !== false,
          mapping,
          ip: eq.ip || eq.adresseIP || eq.adresse_ip || null
        });
      });
    }
  });
  Object.keys(client.equipements).forEach(type => {
    if (!CYBERSECURITY_TYPES.includes(type)) return;
    const cybersecOfType = client.equipements[type];
    if (type === "Backup" && cybersecOfType && typeof cybersecOfType === "object") {
      if (cybersecOfType.instances && Array.isArray(cybersecOfType.instances)) {
        cybersecOfType.instances.forEach((instance, index) => {
          const instanceName = instance.logiciel || instance.nom || instance.name || "Instance de sauvegarde";
          cybersecuritiesList.push({
            id: `${type}-${instance.logiciel || instance.nom || instance.name || "instance"}-${index}`,
            name: instanceName,
            type
          });
        });
      }
    } else if (type === "Antivirus" && cybersecOfType && typeof cybersecOfType === "object") {
      if (cybersecOfType.solutions && Array.isArray(cybersecOfType.solutions)) {
        cybersecOfType.solutions.forEach((solution, index) => {
          const solutionName = solution.logiciel || solution.solution || solution.companyName || "Antivirus";
          cybersecuritiesList.push({
            id: `${type}-${solution.logiciel || solution.companyName || "solution"}-${index}`,
            name: solutionName,
            type
          });
        });
      }
    } else if (type === "Antispam" && cybersecOfType && typeof cybersecOfType === "object") {
      if (cybersecOfType.solutions && Array.isArray(cybersecOfType.solutions)) {
        cybersecOfType.solutions.forEach((solution, index) => {
          const solutionName = solution.logiciel || solution.solution || "Antispam";
          cybersecuritiesList.push({
            id: `${type}-${solution.logiciel || "solution"}-${index}`,
            name: solutionName,
            type
          });
        });
      }
    } else if (Array.isArray(cybersecOfType)) {
      cybersecOfType.forEach((cyber, index) => {
        if (cyber && typeof cyber === "object") {
          const displayName = cyber.logiciel || cyber.solution || cyber.companyName || cyber.name || cyber.nom || type;
          cybersecuritiesList.push({
            id: cyber.id || `${type}-${displayName}-${index}`,
            name: displayName,
            type
          });
        }
      });
    }
  });
  Object.keys(client.equipements).forEach(type => {
    if (!SERVICE_TYPES.includes(type)) return;
    const servicesOfType = client.equipements[type] || [];
    if (Array.isArray(servicesOfType)) {
      servicesOfType.forEach(svc => {
        if (svc && typeof svc === "object" && svc.id) {
          servicesList.push({
            id: svc.id,
            name: svc.name || svc.nom || type,
            type
          });
        }
      });
    } else if (servicesOfType && typeof servicesOfType === "object" && servicesOfType.id) {
      servicesList.push({
        id: servicesOfType.id,
        name: servicesOfType.name || servicesOfType.nom || "Office 365",
        type
      });
    }
  });
  return {
    peripherals: peripheralsList,
    cybersecurities: cybersecuritiesList,
    services: servicesList
  };
}
export function getLinkedTypeOrderIndex(itemOrType) {
  const typeValue = typeof itemOrType === "string" ? itemOrType : itemOrType?.type || itemOrType?.group || "";
  const type = String(typeValue).toLowerCase();
  if (type.includes("internet")) return 0;
  if (type.includes("firewall")) return 1;
  if (type.includes("serveur")) return 2;
  if (type.includes("ordinateur")) return 3;
  if (type.includes("stock")) return 4;
  if (type.includes("switch")) return 5;
  if (type.includes("borne") || type.includes("wifi")) return 6;
  if (type.includes("camera") || type.includes("cam")) return 7;
  if (type.includes("antivirus")) return 8;
  if (type.includes("antispam")) return 9;
  if (type.includes("sauveg")) return 10;
  if (type.includes("office365") || type.includes("tenant")) return 11;
  if (type.includes("ndd") || type.includes("domaine")) return 12;
  return 99;
}
export function buildLinkableItems(peripherals, cybersecurities, services) {
  const byId = new Map();
  const pushUnique = item => {
    if (!item?.id) return;
    const key = `${item.group}:${String(item.id)}`;
    if (byId.has(key)) return;
    byId.set(key, item);
  };
  peripherals.forEach(p => {
    pushUnique({
      id: String(p.id),
      label: p.name,
      type: p.type,
      group: "Infrastructure"
    });
  });
  cybersecurities.forEach(c => {
    pushUnique({
      id: String(c.id),
      label: c.name,
      type: c.type,
      group: c.type === "Antivirus" || c.type === "Antispam" ? c.type : "Cybersecurity"
    });
  });
  services.forEach(s => {
    pushUnique({
      id: String(s.id),
      label: s.name,
      type: s.type,
      group: s.type === "Office365" ? "Tenant" : "NDD"
    });
  });
  return Array.from(byId.values());
}
export function buildLinkableItemsByGroup(linkableItems, linkedSearch, linkedTypeFilter, locale = "fr") {
  const grouped = {};
  const query = linkedSearch.trim().toLowerCase();
  linkableItems.filter(item => {
    if (linkedTypeFilter !== "all" && item.type !== linkedTypeFilter) return false;
    if (!query) return true;
    return (item.label || "").toLowerCase().includes(query) || (item.type || "").toLowerCase().includes(query) || (item.group || "").toLowerCase().includes(query);
  }).sort((a, b) => {
    const typeCmp = getLinkedTypeOrderIndex(a) - getLinkedTypeOrderIndex(b);
    if (typeCmp !== 0) return typeCmp;
    return String(a.label || "").localeCompare(String(b.label || ""), locale);
  }).forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  });
  return grouped;
}
export function getLinkedTypeOptions(linkableItems, locale = "fr") {
  const set = new Set(linkableItems.map(item => item.type).filter(Boolean));
  return Array.from(set).sort((a, b) => {
    const orderDiff = getLinkedTypeOrderIndex(a) - getLinkedTypeOrderIndex(b);
    if (orderDiff !== 0) return orderDiff;
    return String(a).localeCompare(String(b), locale);
  });
}
