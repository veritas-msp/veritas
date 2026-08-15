import { isProOnlyDocType } from "../config/edition";
export const DOC_TYPE_ACCESS_KEY = {
  Hardware: "Hardware",
  EquipmentInventory: "EquipmentInventory",
  Equipment: "Hardware",
  EquipmentDetail: "Hardware",
  JobDetail: "Hardware",
  ComputerFleetStats: "Hardware",
  Cybersecurite: "Cybersecurite",
  CampaignDetail: "Cybersecurite",
  AntivirusDetail: "Cybersecurite",
  AntispamDetail: "Cybersecurite",
  Planning: "Planning",
  Dashboard: "Dashboard",
  Ticket: "Ticket",
  TicketCreate: "Ticket",
  TicketDetail: "Ticket",
  TicketSales: "TicketSales",
  TicketSalesCreate: "TicketSales",
  TicketSalesDetail: "TicketSales",
  Service: "Service",
  TenantDetail: "Service",
  Contrat: "Contrat",
  ContratDetail: "Contrat",
  Contact: "Contact",
  ContactDetail: "Contact",
  Mon: "Mon",
  MonitoringDetail: "Mon",
  Rapport: "Mon",
  DocumentsHub: "DocumentsHub",
  Admin: "Admin"
};
const QUERY_KEYS = {
  AntivirusDetail: ["companyId", "mappingMode", "bitdefenderTenantId", "productName", "antivirusId"],
  AntispamDetail: ["customerId", "mailinblackTenantId", "productName", "logiciel", "solution"],
  EquipmentDetail: ["id", "clientId", "type", "name"],
  JobDetail: ["id", "clientId", "nom", "name"],
  ComputerFleetStats: ["equipmentType", "siteFilter"],
  Cybersecurite: ["tab", "clientId"],
  Service: ["tab", "clientId"],
  Contrat: ["openClientId", "highlight"],
  Contact: ["openContactId", "highlight"],
  TicketCreate: ["clientId", "contactId"],
  TicketSalesCreate: ["kind", "category"]
};
function appendQuery(path, data, docType) {
  const keys = QUERY_KEYS[docType];
  if (!keys || !data) return path;
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
function readQuery(search) {
  const params = new URLSearchParams(search || "");
  const data = {};
  params.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}
function encodeSeg(value) {
  return encodeURIComponent(String(value ?? ""));
}
export function buildAgentPath(docType, data = null, options = {}) {
  const d = data || {};
  switch (docType) {
    case "Home":
      return "/";
    case "Hardware":
    case "Equipment":
      if (d.clientId && d.equipmentType) {
        return `/supervision/clients/${encodeSeg(d.clientId)}/equipment/${encodeSeg(d.equipmentType)}`;
      }
      return "/supervision";
    case "EquipmentDetail":
      return appendQuery("/supervision/items", d, docType);
    case "JobDetail":
      return appendQuery("/supervision/backup-jobs", d, docType);
    case "ComputerFleetStats":
      {
        const clientId = d.clientId;
        if (!clientId) return "/supervision";
        return appendQuery(`/supervision/clients/${encodeSeg(clientId)}/fleet`, d, docType);
      }
    case "Cybersecurite":
      return appendQuery("/cybersecurity", d, docType);
    case "CampaignDetail":
      {
        const campaignId = d.campaignId || d.id;
        return campaignId ? `/cybersecurity/campaigns/${encodeSeg(campaignId)}` : "/cybersecurity";
      }
    case "AntivirusDetail":
      {
        const clientId = d.clientId;
        if (!clientId) return "/cybersecurity";
        return appendQuery(`/cybersecurity/antivirus/${encodeSeg(clientId)}`, d, docType);
      }
    case "AntispamDetail":
      {
        const clientId = d.clientId;
        if (!clientId) return "/cybersecurity";
        return appendQuery(`/cybersecurity/antispam/${encodeSeg(clientId)}`, d, docType);
      }
    case "Service":
      return appendQuery("/services", d, docType);
    case "TenantDetail":
      {
        const clientId = d.clientId || d.tenantId;
        return clientId ? `/services/tenants/${encodeSeg(clientId)}` : "/services";
      }
    case "Planning":
      return "/planning";
    case "Dashboard":
      return "/dashboard";
    case "Ticket":
      return "/tickets";
    case "TicketCreate":
      return appendQuery("/tickets/new", d, docType);
    case "TicketDetail":
      {
        const ticketId = d.ticketId || d.id;
        return ticketId ? `/tickets/${encodeSeg(ticketId)}` : "/tickets";
      }
    case "TicketSales":
      return "/sales";
    case "TicketSalesCreate":
      return appendQuery("/sales/new", d, docType);
    case "TicketSalesDetail":
      {
        const ticketId = d.ticketId || d.id;
        return ticketId ? `/sales/${encodeSeg(ticketId)}` : "/sales";
      }
    case "Contrat":
      return appendQuery("/enterprises", d, docType);
    case "ContratDetail":
      {
        const clientId = d.clientId || d.id;
        return clientId ? `/enterprises/${encodeSeg(clientId)}` : "/enterprises";
      }
    case "Contact":
      return appendQuery("/contacts", d, docType);
    case "ContactDetail":
      {
        const contactId = d.contactId || d.id;
        return contactId ? `/contacts/${encodeSeg(contactId)}` : "/contacts";
      }
    case "Rapport":
      return "/reports";
    case "DocumentsHub":
      return "/documents";
    case "EquipmentInventory":
      return "/inventory";
    case "Mon":
      return "/reports";
    case "MonitoringDetail":
      {
        const clientId = d.client?.id || d.clientId;
        return clientId ? `/monitoring/report/${encodeSeg(clientId)}` : "/monitoring";
      }
    case "Admin":
      {
        const tab = options.adminTab || d.adminTab || d.tab;
        return tab ? `/admin/${encodeSeg(tab)}` : "/admin";
      }
    case "ReportBug":
      return "/support";
    case "User":
      return "/account";
    case "Updates":
      return "/updates";
    case "TabLauncher":
      return "/open";
    default:
      return null;
  }
}
export function parseAgentPath(pathname, search = "") {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const query = readQuery(search);
  const matchers = [{
    re: /^\/admin\/([^/]+)$/,
    run: ([, tab]) => ({
      docType: "Admin",
      data: null,
      adminTab: decodeURIComponent(tab)
    })
  }, {
    re: /^\/admin$/,
    run: () => ({
      docType: "Admin",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/monitoring\/report\/([^/]+)$/,
    run: ([, clientId]) => ({
      docType: "MonitoringDetail",
      data: {
        clientId: decodeURIComponent(clientId)
      },
      adminTab: null
    })
  }, {
    re: /^\/monitoring$/,
    run: () => ({
      docType: "Rapport",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/supervision\/clients\/([^/]+)\/equipment\/([^/]+)$/,
    run: ([, clientId, equipmentType]) => ({
      docType: "Equipment",
      data: {
        clientId: decodeURIComponent(clientId),
        equipmentType: decodeURIComponent(equipmentType)
      },
      adminTab: null
    })
  }, {
    re: /^\/supervision\/clients\/([^/]+)\/fleet$/,
    run: ([, clientId]) => ({
      docType: "ComputerFleetStats",
      data: {
        clientId: decodeURIComponent(clientId),
        ...query
      },
      adminTab: null
    })
  }, {
    re: /^\/supervision\/items$/,
    run: () => ({
      docType: "EquipmentDetail",
      data: query,
      adminTab: null
    })
  }, {
    re: /^\/supervision\/backup-jobs$/,
    run: () => ({
      docType: "JobDetail",
      data: query,
      adminTab: null
    })
  }, {
    re: /^\/supervision$/,
    run: () => ({
      docType: "Hardware",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/cybersecurity\/campaigns\/([^/]+)$/,
    run: ([, campaignId]) => ({
      docType: "CampaignDetail",
      data: {
        campaignId: decodeURIComponent(campaignId),
        id: decodeURIComponent(campaignId)
      },
      adminTab: null
    })
  }, {
    re: /^\/cybersecurity\/antivirus\/([^/]+)$/,
    run: ([, clientId]) => ({
      docType: "AntivirusDetail",
      data: {
        clientId: decodeURIComponent(clientId),
        ...query
      },
      adminTab: null
    })
  }, {
    re: /^\/cybersecurity\/antispam\/([^/]+)$/,
    run: ([, clientId]) => ({
      docType: "AntispamDetail",
      data: {
        clientId: decodeURIComponent(clientId),
        ...query
      },
      adminTab: null
    })
  }, {
    re: /^\/cybersecurity$/,
    run: () => ({
      docType: "Cybersecurite",
      data: Object.keys(query).length ? query : null,
      adminTab: null
    })
  }, {
    re: /^\/services\/tenants\/([^/]+)$/,
    run: ([, clientId]) => ({
      docType: "TenantDetail",
      data: {
        clientId: decodeURIComponent(clientId)
      },
      adminTab: null
    })
  }, {
    re: /^\/services$/,
    run: () => ({
      docType: "Service",
      data: Object.keys(query).length ? query : null,
      adminTab: null
    })
  }, {
    re: /^\/enterprises\/([^/]+)$/,
    run: ([, clientId]) => ({
      docType: "ContratDetail",
      data: {
        clientId: decodeURIComponent(clientId)
      },
      adminTab: null
    })
  }, {
    re: /^\/enterprises$/,
    run: () => ({
      docType: "Contrat",
      data: Object.keys(query).length ? query : null,
      adminTab: null
    })
  }, {
    re: /^\/contacts\/([^/]+)$/,
    run: ([, contactId]) => ({
      docType: "ContactDetail",
      data: {
        contactId: decodeURIComponent(contactId)
      },
      adminTab: null
    })
  }, {
    re: /^\/contacts$/,
    run: () => ({
      docType: "Contact",
      data: Object.keys(query).length ? query : null,
      adminTab: null
    })
  }, {
    re: /^\/tickets\/new$/,
    run: () => ({
      docType: "TicketCreate",
      data: query,
      adminTab: null
    })
  }, {
    re: /^\/tickets\/([^/]+)$/,
    run: ([, ticketId]) => ({
      docType: "TicketDetail",
      data: {
        ticketId: decodeURIComponent(ticketId)
      },
      adminTab: null
    })
  }, {
    re: /^\/tickets$/,
    run: () => ({
      docType: "Ticket",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/sales\/new$/,
    run: () => ({
      docType: "TicketSalesCreate",
      data: query,
      adminTab: null
    })
  }, {
    re: /^\/sales\/([^/]+)$/,
    run: ([, ticketId]) => ({
      docType: "TicketSalesDetail",
      data: {
        ticketId: decodeURIComponent(ticketId),
        ticketFamily: "sales",
        fromPage: "TicketSales"
      },
      adminTab: null
    })
  }, {
    re: /^\/sales$/,
    run: () => ({
      docType: "TicketSales",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/planning$/,
    run: () => ({
      docType: "Planning",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/dashboard$/,
    run: () => ({
      docType: "Dashboard",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/reports$/,
    run: () => ({
      docType: "Rapport",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/documents$/,
    run: () => ({
      docType: "DocumentsHub",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/inventory$/,
    run: () => ({
      docType: "EquipmentInventory",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/support$/,
    run: () => ({
      docType: "ReportBug",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/account$/,
    run: () => ({
      docType: "User",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/updates$/,
    run: () => ({
      docType: "Updates",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/open$/,
    run: () => ({
      docType: "TabLauncher",
      data: null,
      adminTab: null
    })
  }, {
    re: /^\/$/,
    run: () => ({
      docType: "Home",
      data: null,
      adminTab: null
    })
  }];
  for (const {
    re,
    run
  } of matchers) {
    const match = path.match(re);
    if (match) {
      const parsed = run(match);
      return {
        ...parsed,
        path
      };
    }
  }
  return null;
}
export function getSafeReturnPath(pathname, search = "") {
  const path = search && pathname && !String(pathname).includes("?") ? `${pathname}${search}` : String(pathname || "/") || "/";
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("/login") || path.startsWith("/reset-password") || path.startsWith("/setup")) {
    return "/";
  }
  if (path.startsWith("/client")) return "/";
  return path;
}
export function isAgentPathAllowed(docType, {
  userRole,
  access,
  isCommunity
}) {
  if (!docType) return false;
  if (docType === "Admin" && userRole !== "admin") return false;
  if (docType === "Admin" && access && access.Admin === false) return false;
  if (isCommunity && isProOnlyDocType(docType)) return false;
  const accessKey = DOC_TYPE_ACCESS_KEY[docType];
  if (accessKey && access && access[accessKey] === false) return false;
  return true;
}
export function routeToMainAppState(parsed) {
  if (!parsed) {
    return {
      docType: "Home",
      adminTab: null,
      resets: true
    };
  }
  const {
    docType,
    data,
    adminTab
  } = parsed;
  const state = {
    docType,
    adminTab: adminTab || null,
    contratDetailData: null,
    contratPageParams: null,
    contactPageParams: null,
    campaignDetailData: null,
    antivirusDetailData: null,
    antispamDetailData: null,
    tenantDetailData: null,
    ticketDetailData: null,
    ticketCreateData: null,
    ticketSalesCreateData: null,
    contactDetailData: null,
    equipmentFilterParams: null,
    equipmentDetailData: null,
    jobDetailData: null,
    computerFleetStatsData: null,
    cybersecuriteParams: null,
    serviceParams: null,
    planningParams: null
  };
  switch (docType) {
    case "ContratDetail":
      state.contratDetailData = data;
      break;
    case "Contrat":
      state.contratPageParams = data;
      break;
    case "ContactDetail":
      state.contactDetailData = data;
      break;
    case "Contact":
      state.contactPageParams = data;
      break;
    case "CampaignDetail":
      state.campaignDetailData = data?.campaign ? data.campaign : data;
      break;
    case "AntivirusDetail":
      state.antivirusDetailData = data;
      break;
    case "AntispamDetail":
      state.antispamDetailData = data;
      break;
    case "TenantDetail":
      state.tenantDetailData = data;
      break;
    case "TicketDetail":
      state.ticketDetailData = data;
      break;
    case "TicketSalesDetail":
      state.ticketDetailData = data;
      break;
    case "TicketCreate":
      state.ticketCreateData = data;
      break;
    case "TicketSalesCreate":
      state.ticketSalesCreateData = data;
      break;
    case "Equipment":
      state.equipmentFilterParams = data;
      break;
    case "EquipmentDetail":
      state.equipmentDetailData = data;
      break;
    case "JobDetail":
      state.jobDetailData = data;
      break;
    case "ComputerFleetStats":
      state.computerFleetStatsData = data;
      break;
    case "Cybersecurite":
      state.cybersecuriteParams = data;
      break;
    case "Service":
      state.serviceParams = data;
      break;
    case "Planning":
      state.planningParams = data;
      break;
    default:
      break;
  }
  return state;
}
