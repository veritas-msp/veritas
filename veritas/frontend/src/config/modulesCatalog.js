export const MODULE_SECTIONS = [{
  id: "crm",
  label: "CRM",
  modules: [{
    key: "Contrat",
    docType: "Contrat",
    label: "Companies",
    description: "Client records, contracts and linked contacts",
    icon: "mingcute:building-1-fill",
    proOnly: false
  }, {
    key: "Contact",
    docType: "Contact",
    label: "Contacts",
    description: "Directory and client portal access",
    icon: "mingcute:contacts-3-fill",
    proOnly: false
  }]
}, {
  id: "exploitation",
  label: "Operations",
  modules: [{
    key: "Ticket",
    docType: "Ticket",
    label: "Support",
    description: "Incident and request tickets",
    icon: "mdi:message-processing-outline",
    proOnly: false
  }, {
    key: "TicketSales",
    docType: "TicketSales",
    label: "Services",
    description: "Interventions and installations",
    icon: "mdi:briefcase-edit-outline",
    proOnly: true
  }, {
    key: "Planning",
    docType: "Planning",
    label: "Planning",
    description: "Team calendar and events",
    icon: "mingcute:calendar-time-add-fill",
    proOnly: true
  }]
}, {
  id: "managed",
  label: "Managed services",
  modules: [{
    key: "Hardware",
    docType: "Hardware",
    label: "Monitoring center",
    description: "MSP monitoring, devices, alerts and RMM agents",
    icon: "mdi:radar",
    proOnly: false
  }, {
    key: "Cybersecurite",
    docType: "Cybersecurite",
    label: "Cybersecurity",
    description: "Antivirus, antispam and campaigns",
    icon: "mdi:shield-lock",
    proOnly: false
  }, {
    key: "Service",
    docType: "Service",
    label: "Cloud IT and services",
    description: "Microsoft 365, domains, tenants",
    icon: "mdi:cloud-outline",
    proOnly: false
  }]
}, {
  id: "pilotage",
  label: "Steering",
  modules: [{
    key: "Rapport",
    docType: "Rapport",
    label: "Reports",
    description: "Documents and client acceptance reports",
    icon: "mingcute:report-forms-fill",
    proOnly: true
  }]
}];
export function getAllCatalogModules() {
  return MODULE_SECTIONS.flatMap(section => section.modules.map(module => ({
    ...module,
    sectionId: section.id,
    sectionLabel: section.label
  })));
}
export function getProOnlySidebarModules() {
  return getAllCatalogModules().filter(module => module.proOnly);
}
export function isModuleLockedForEdition(module, isCommunity) {
  return Boolean(isCommunity && module.proOnly);
}
