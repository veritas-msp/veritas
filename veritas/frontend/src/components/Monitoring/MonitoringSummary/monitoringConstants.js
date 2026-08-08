export const REPORT_OPTIONS = [{
  id: "infrastructure",
  label: "Infrastructure"
}, {
  id: "cybersecurite",
  label: "Cybersecurity"
}, {
  id: "services",
  label: "Services"
}];
export const fallbackModulesByReport = {
  infrastructure: ["internet", "firewall", "serveurs", "stockage", "switch", "wifi"],
  cybersecurite: ["sauvegarde", "antivirus", "antispam", "firewallregles"],
  services: ["office365", "ndd"]
};
export const reportTitleMap = {
  infrastructure: "Infrastructure",
  cybersecurite: "Cybersecurity",
  services: "Managed Services"
};
export const reportDescriptionMap = {
  infrastructure: "Topology, critical assets, and health of the technical foundation.",
  cybersecurite: "Protection, backup, and threat control.",
  services: "Visibility into managed services and the SaaS layer."
};
export const reportSubtitleMap = {
  infrastructure: "INFRASTRUCTURE",
  cybersecurite: "CYBERSECURITY",
  services: "MANAGED SERVICES"
};
export const SECTION_ID_MAP = {
  'internet': 'internet-section',
  'serveurs': 'serveurs-section',
  'stockage': 'stockage-section',
  'firewall': 'firewalls-section',
  'switch': 'switch-section',
  'wifi': 'wifi-section',
  'sauvegarde': 'sauvegarde-section',
  'antivirus': 'antivirus-section',
  'antispam': 'antispam-section',
  'firewallregles': 'firewallregles-section',
  'ndd': 'ndd-section',
  'office365': 'office365-section'
};
