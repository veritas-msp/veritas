export const ANTISPAM_OVERVIEW_GROUPS = [{
  id: "core",
  label: "Vue d’ensemble"
}, {
  id: "admin",
  label: "Administration"
}];
export const ANTISPAM_OVERVIEW_SECTIONS = [{
  id: "overview",
  group: "core",
  label: "Résumé",
  description: "Chiffres clés",
  icon: "mdi:view-dashboard-outline"
}, {
  id: "directory",
  group: "admin",
  label: "Domaines & utilisateurs",
  description: "Domaines surveillés et comptes protégés",
  icon: "mdi:account-network-outline",
  sectionKeys: ["domains", "users"]
}];
