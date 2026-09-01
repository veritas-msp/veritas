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
  description: "Key figures",
  icon: "mdi:view-dashboard-outline"
}, {
  id: "domains",
  group: "admin",
  label: "Domains",
  description: "Monitored domains",
  icon: "mdi:web",
  sectionKey: "domains"
}, {
  id: "users",
  group: "admin",
  label: "Users",
  description: "Protected accounts",
  icon: "mdi:account-group-outline",
  sectionKey: "users"
}, {
  id: "licenses",
  group: "admin",
  label: "Licenses",
  description: "Protect seats",
  icon: "mdi:license",
  sectionKey: "licenses"
}, {
  id: "emails",
  group: "admin",
  label: "E-mails",
  description: "Admin addresses",
  icon: "mdi:email-outline",
  sectionKey: "emails"
}, {
  id: "servers",
  group: "admin",
  label: "Servers",
  description: "Mail servers",
  icon: "mdi:server-network",
  sectionKey: "servers"
}, {
  id: "senders",
  group: "protect",
  label: "Senders",
  description: "Protect list",
  icon: "mdi:email-arrow-right-outline",
  sectionKey: "senders"
}, {
  id: "spools",
  group: "protect",
  label: "Spools",
  description: "Queued messages",
  icon: "mdi:email-multiple-outline",
  sectionKey: "spools"
}];
