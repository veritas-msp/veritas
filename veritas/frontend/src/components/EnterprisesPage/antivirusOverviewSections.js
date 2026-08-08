export const ANTIVIRUS_OVERVIEW_GROUPS = [{
  id: "core",
  label: "Overview"
}, {
  id: "exploited",
  label: "Integrated with Veritas"
}, {
  id: "preview",
  label: "Available APIs (preview)"
}];
export const ANTIVIRUS_OVERVIEW_SECTIONS = [{
  id: "overview",
  group: "core",
  label: "Summary",
  description: "KPIs and API status",
  icon: "mdi:view-dashboard-outline"
}, {
  id: "endpoints",
  group: "exploited",
  label: "Workstations & network",
  description: "Network inventory",
  icon: "mdi:desktop-classic",
  sectionKey: "endpoints"
}, {
  id: "license",
  group: "exploited",
  label: "Licenses",
  description: "Quotas GravityZone",
  icon: "mdi:license",
  sectionKey: "license"
}, {
  id: "policies",
  group: "exploited",
  label: "Policies",
  description: "Security policies",
  icon: "mdi:shield-cog-outline",
  sectionKey: "policies"
}, {
  id: "reports",
  group: "exploited",
  label: "Reports",
  description: "Scheduled reports",
  icon: "mdi:file-chart-outline",
  sectionKey: "reports"
}, {
  id: "incidents",
  group: "preview",
  label: "Incidents",
  description: "EDR & detections",
  icon: "mdi:alert-octagon-outline",
  sectionKey: "incidents"
}, {
  id: "quarantine",
  group: "preview",
  label: "Quarantine",
  description: "Isolated files",
  icon: "mdi:archive-lock-outline",
  sectionKey: "quarantine"
}, {
  id: "patch",
  group: "preview",
  label: "Patch Management",
  description: "Missing / installed patches",
  icon: "mdi:package-variant-closed",
  sectionKey: "patchManagement"
}, {
  id: "phasr",
  group: "preview",
  label: "PHASR",
  description: "Recommendations",
  icon: "mdi:shield-search",
  sectionKey: "phasr"
}, {
  id: "investigation",
  group: "preview",
  label: "Investigation",
  description: "Investigation API",
  icon: "mdi:magnify-scan",
  sectionKey: "investigation"
}, {
  id: "push",
  group: "preview",
  label: "Event Push",
  description: "Real-time webhooks",
  icon: "mdi:webhook",
  sectionKey: "push"
}, {
  id: "packages",
  group: "preview",
  label: "Packages",
  description: "Agents & deployment",
  icon: "mdi:package-down",
  sectionKey: "packages"
}, {
  id: "integrations",
  group: "preview",
  label: "Integrations",
  description: "Third-party connectors",
  icon: "mdi:connection",
  sectionKey: "integrations"
}, {
  id: "maintenance",
  group: "preview",
  label: "Maintenance",
  description: "Scheduled windows",
  icon: "mdi:calendar-clock",
  sectionKey: "maintenance"
}, {
  id: "blocklist",
  group: "preview",
  label: "Blocklist",
  description: "Blocked EDR hashes",
  icon: "mdi:block-helper",
  sectionKey: "blocklist"
}];
