const envEdition = String(process.env.REACT_APP_VERITAS_EDITION || "").trim().toLowerCase();
export function getEnvEdition() {
  return envEdition === "pro" ? "pro" : "community";
}
export const COMMUNITY_SIDEBAR_KEYS = new Set(["Contrat", "Contact", "Ticket", "Hardware", "Mon", "Cybersecurite", "Service"]);
export const COMMUNITY_ADMIN_KEYS = new Set(["general", "users", "permissions", "clients", "tickets", "mail-collect", "notifications", "rmm", "maintenance", "injection", "equipment-purge", "client-portal", "license", "integrations", "ai"]);
export function isCommunityEdition(edition) {
  return String(edition || getEnvEdition()).toLowerCase() !== "pro";
}
export const COMMUNITY_SITES_PER_CLIENT = 3;
export const COMMUNITY_TICKET_TEMPLATES_LIMIT = 3;
export const COMMUNITY_TICKET_MACROS_LIMIT = 3;
export const COMMUNITY_MSP_AGENTS_LIMIT = 5;
export const COMMUNITY_CLIENT_PORTAL_LIMIT = 3;
export function getCommunityMspAgentsLimit(limits) {
  const fromApi = limits?.mspAgents;
  if (Number.isFinite(Number(fromApi)) && Number(fromApi) > 0) {
    return Number(fromApi);
  }
  return COMMUNITY_MSP_AGENTS_LIMIT;
}
export function getCommunityClientPortalLimit(limits) {
  const fromApi = limits?.clientPortalUsers;
  if (Number.isFinite(Number(fromApi)) && Number(fromApi) > 0) {
    return Number(fromApi);
  }
  return COMMUNITY_CLIENT_PORTAL_LIMIT;
}
export function getCommunitySitesLimit(limits) {
  const fromApi = limits?.sitesPerClient;
  if (Number.isFinite(Number(fromApi)) && Number(fromApi) > 0) {
    return Number(fromApi);
  }
  return COMMUNITY_SITES_PER_CLIENT;
}
export function getCommunityTicketTemplatesLimit(limits) {
  const fromApi = limits?.ticketTemplates;
  if (Number.isFinite(Number(fromApi)) && Number(fromApi) > 0) {
    return Number(fromApi);
  }
  return COMMUNITY_TICKET_TEMPLATES_LIMIT;
}
export function getCommunityTicketMacrosLimit(limits) {
  const fromApi = limits?.ticketMacros;
  if (Number.isFinite(Number(fromApi)) && Number(fromApi) > 0) {
    return Number(fromApi);
  }
  return COMMUNITY_TICKET_MACROS_LIMIT;
}
export const PRO_ONLY_DOC_TYPES = new Set(["CampaignDetail", "Planning", "Dashboard", "TicketSales", "TicketSalesCreate", "TicketSalesDetail", "Rapport", "DocumentsHub"]);
export function isCampaignFeatureLocked(edition) {
  return isCommunityEdition(edition);
}
export function isProOnlyDocType(docType) {
  return PRO_ONLY_DOC_TYPES.has(String(docType || ""));
}
export function filterAccessForEdition(access, edition) {
  if (!isCommunityEdition(edition)) return access;
  const next = {};
  for (const key of Object.keys(access || {})) {
    if (COMMUNITY_SIDEBAR_KEYS.has(key)) {
      next[key] = !!access[key];
    } else {
      next[key] = false;
    }
  }
  for (const key of COMMUNITY_SIDEBAR_KEYS) {
    if (next[key] === undefined && access[key] !== undefined) {
      next[key] = !!access[key];
    }
  }
  next.Hardware = true;
  next.Mon = true;
  return next;
}
