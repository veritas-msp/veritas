export const ANTISPAM_OVERVIEW_GROUPS = [{
  id: "core",
  label: "Overview"
}, {
  id: "exploited",
  label: "Module Protect"
}, {
  id: "preview",
  label: "Additional APIs"
}];
export const ANTISPAM_OVERVIEW_SECTIONS = [{
  id: "overview",
  group: "core",
  label: "Summary",
  description: "KPIs and API status",
  icon: "mdi:view-dashboard-outline"
}, {
  id: "domains",
  group: "exploited",
  label: "Domains",
  description: "Admin / domains",
  icon: "mdi:web",
  sectionKey: "domains"
}, {
  id: "users",
  group: "exploited",
  label: "Users",
  description: "Protected accounts",
  icon: "mdi:account-group-outline",
  sectionKey: "users"
}, {
  id: "senders",
  group: "exploited",
  label: "Senders",
  description: "Protect / senders",
  icon: "mdi:email-arrow-right-outline",
  sectionKey: "senders"
}, {
  id: "spools",
  group: "exploited",
  label: "Spools",
  description: "Queued messages",
  icon: "mdi:email-multiple-outline",
  sectionKey: "spools"
}, {
  id: "detectSpools",
  group: "preview",
  label: "Spool detection",
  description: "AdvancedSpool",
  icon: "mdi:radar",
  sectionKey: "detectSpools"
}];
