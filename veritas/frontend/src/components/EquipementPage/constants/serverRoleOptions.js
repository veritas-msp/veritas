export const SERVER_ROLE_GROUPS = [{
  label: "Infrastructure",
  options: ["Hôte", "Hyperviseur", "Cluster", "Jump server / Bastion", "Équilibreur de charge", "Storage SAN/NAS"]
}, {
  label: "Annuaire & réseau",
  options: ["Active Directory", "Contrôleur de domaine", "Azure AD Connect", "DNS", "DHCP", "NPS (Radius)", "PKI / Autorité de certification", "WDS / PXE", "NTP / Heure", "WSUS / Mises à jour"]
}, {
  label: "Files & impression",
  options: ["Partage de fichiers", "DFS", "Impression"]
}, {
  label: "Bureau à distance & VDI",
  options: ["RDS", "VDI / Citrix", "RemoteApp"]
}, {
  label: "Applications",
  options: ["Application", "Web (IIS / Apache)", "ERP / Métier", "API", "Middleware / ESB"]
}, {
  label: "Bases de data",
  options: ["SQL Server", "Base de data", "PostgreSQL", "MySQL / MariaDB", "MongoDB", "Redis / Cache"]
}, {
  label: "Backup & reprise",
  options: ["Backup", "Réplication", "Archivage", "PRA / Site de secours"]
}, {
  label: "Monitoring & sécurité",
  options: ["Monitoring", "Monitoring", "Syslog / SIEM", "Antivirus / EDR", "Proxy / Filtrage web", "VPN", "Firewalls applicatif (WAF)"]
}, {
  label: "Messagerie & collaboration",
  options: ["Exchange", "Messagerie", "Teams / Collab", "SharePoint"]
}, {
  label: "Développement & DevOps",
  options: ["Git / CI-CD", "Conteneurs / Kubernetes", "Registry / Artefacts"]
}, {
  label: "Autre",
  options: ["Test", "Autres"]
}];
export const SERVER_ROLE_OPTIONS = SERVER_ROLE_GROUPS.flatMap(group => group.options);
const SERVER_ROLE_LOOKUP = new Set(SERVER_ROLE_OPTIONS.map(role => role.trim().toLowerCase()));
export function isKnownServerRole(role) {
  return SERVER_ROLE_LOOKUP.has(String(role || "").trim().toLowerCase());
}
export const normalizeServerRoles = roles => {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return list.map(role => role == null ? "" : String(role).trim()).filter(Boolean);
};
