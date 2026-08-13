export const ANTISPAM_OVERVIEW_GROUPS = [{
  id: "core",
  label: "Overview"
}, {
  id: "admin",
  label: "Administration"
}, {
  id: "protect",
  label: "Module Protect"
}];
export const ANTISPAM_OVERVIEW_SECTIONS = [{
  id: "overview",
  group: "core",
  label: "Summary",
  description: "KPIs and API status",
  icon: "mdi:view-dashboard-outline"
}, {
  id: "domains",
  group: "admin",
  label: "Domains",
  description: "GET /admin/domains",
  icon: "mdi:web",
  sectionKey: "domains"
}, {
  id: "users",
  group: "admin",
  label: "Users",
  description: "GET /admin/users",
  icon: "mdi:account-group-outline",
  sectionKey: "users"
}, {
  id: "emails",
  group: "admin",
  label: "E-mails",
  description: "GET /admin/emails",
  icon: "mdi:email-outline",
  sectionKey: "emails"
}, {
  id: "servers",
  group: "admin",
  label: "Servers",
  description: "GET /admin/servers",
  icon: "mdi:server-network",
  sectionKey: "servers"
}, {
  id: "senders",
  group: "protect",
  label: "Senders",
  description: "GET /protect/senders",
  icon: "mdi:email-arrow-right-outline",
  sectionKey: "senders"
}, {
  id: "spools",
  group: "protect",
  label: "Spools",
  description: "GET /protect/spools",
  icon: "mdi:email-multiple-outline",
  sectionKey: "spools"
}, {
  id: "detectSpools",
  group: "protect",
  label: "Advanced spools",
  description: "GET /protect/detect/spools",
  icon: "mdi:radar",
  sectionKey: "detectSpools"
}];
