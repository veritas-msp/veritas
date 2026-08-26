import { normalizeClientSites, getSiteLocationValue } from "../../utils/clientSites";
import { filterBySite, getItemSiteValue, normalizeSiteFilterValue } from "../../utils/siteFilterUtils";

const SITE_STORAGE_PREFIX = "veritas_portal_site:";

export function readStoredPortalSite(clientId) {
  if (!clientId) return null;
  try {
    return sessionStorage.getItem(`${SITE_STORAGE_PREFIX}${clientId}`) || null;
  } catch {
    return null;
  }
}

export function writeStoredPortalSite(clientId, siteName) {
  if (!clientId) return;
  try {
    const key = `${SITE_STORAGE_PREFIX}${clientId}`;
    if (siteName) sessionStorage.setItem(key, siteName);
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPortalSites(dashboardOrClient) {
  const raw = dashboardOrClient?.sites ?? dashboardOrClient?.client?.sites;
  return normalizeClientSites(raw);
}

export function collectPortalEquipmentItems(dashboard) {
  const items = [];
  if (Array.isArray(dashboard?.computers)) items.push(...dashboard.computers);
  (dashboard?.infrastructure || []).forEach(group => {
    if (Array.isArray(group?.items)) items.push(...group.items);
  });
  (dashboard?.cloudServices || []).forEach(group => {
    if (Array.isArray(group?.items)) items.push(...group.items);
  });
  return items;
}

export function getPortalEquipmentSiteById(dashboard) {
  const map = new Map();
  for (const item of collectPortalEquipmentItems(dashboard)) {
    const id = item?.id ?? item?.dbId ?? item?.item_key;
    if (id == null) continue;
    const site = getItemSiteValue(item);
    if (site) map.set(String(id), site);
  }
  return map;
}

function parseTicketEquipmentInfo(ticket) {
  const raw = ticket?.equipment_info ?? ticket?.equipmentInfo ?? null;
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getPortalTicketSiteValue(ticket, equipmentSiteById) {
  const info = parseTicketEquipmentInfo(ticket);
  const fromInfo = String(info?.site || info?.location || "").trim();
  if (fromInfo) return fromInfo;
  const equipmentId = info?.equipmentId || info?.equipment_id;
  if (equipmentId && equipmentSiteById instanceof Map) {
    const fromEquipment = equipmentSiteById.get(String(equipmentId));
    if (fromEquipment) return fromEquipment;
  }
  return getItemSiteValue(ticket);
}

export function filterPortalTicketsBySite(tickets, siteFilter, equipmentSiteById) {
  if (!siteFilter) return Array.isArray(tickets) ? tickets : [];
  const needle = normalizeSiteFilterValue(siteFilter);
  return (Array.isArray(tickets) ? tickets : []).filter(ticket => {
    return normalizeSiteFilterValue(getPortalTicketSiteValue(ticket, equipmentSiteById)) === needle;
  });
}

function recountActive(items) {
  return (Array.isArray(items) ? items : []).filter(item => item?.active !== false && item?.is_active !== false).length;
}

export function filterPortalDashboardBySite(dashboard, siteFilter) {
  if (!dashboard) return dashboard;
  if (!siteFilter) return dashboard;
  const computers = filterBySite(dashboard.computers, siteFilter);
  const infrastructure = (dashboard.infrastructure || [])
    .map(group => ({
      ...group,
      items: filterBySite(group.items, siteFilter)
    }))
    .filter(group => group.items.length > 0);
  const cloudServices = (dashboard.cloudServices || [])
    .map(group => ({
      ...group,
      items: filterBySite(group.items, siteFilter)
    }))
    .filter(group => group.items.length > 0);
  const equipmentSiteById = getPortalEquipmentSiteById(dashboard);
  const tickets = filterPortalTicketsBySite(dashboard.tickets, siteFilter, equipmentSiteById);
  const actionRequiredTickets = filterPortalTicketsBySite(
    dashboard.actionRequiredTickets || dashboard.pendingValidationTickets,
    siteFilter,
    equipmentSiteById
  );
  const infraItems = infrastructure.flatMap(group => group.items || []);
  const cloudItems = cloudServices.flatMap(group => group.items || []);
  const allItems = [...infraItems, ...cloudItems];
  const computerCount = computers.length;
  const totalEquipment = allItems.length + computerCount;
  const activeEquipment = recountActive(allItems) + recountActive(computers);
  const openTickets = tickets.filter(ticket => !["resolved", "closed"].includes(String(ticket.status || "").toLowerCase())).length;
  return {
    ...dashboard,
    computers,
    infrastructure,
    cloudServices,
    tickets,
    actionRequiredTickets,
    pendingValidationTickets: actionRequiredTickets,
    stats: {
      ...(dashboard.stats || {}),
      totalEquipment,
      activeEquipment,
      openTickets,
      actionRequiredCount: actionRequiredTickets.length,
      pendingValidationCount: actionRequiredTickets.length,
      infraCount: infraItems.length,
      cloudCount: cloudItems.length,
      computerCount
    }
  };
}

export { getSiteLocationValue };
