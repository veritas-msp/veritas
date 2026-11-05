/** Maps AdminPanel nav keys → permission keys (`admin_panel.*`). */
export const ADMIN_NAV_PERMISSION_BY_KEY = {
  general: "admin_panel.general",
  "login-branding": "admin_panel.login_branding",
  reports: "admin_panel.reports",
  "tech-news-feeds": "admin_panel.tech_news",
  users: "admin_panel.users",
  permissions: "admin_panel.permissions",
  teams: "admin_panel.teams",
  planning: "admin_panel.planning",
  clients: "admin_panel.clients",
  "client-portal": "admin_panel.client_portal",
  "support-credits": "admin_panel.support_credits",
  sla: "admin_panel.sla",
  "fiche-config": "admin_panel.contract_modules",
  "contract-modules": "admin_panel.contract_modules",
  "equipment-families": "admin_panel.equipment_families",
  tickets: "admin_panel.tickets",
  "mail-collect": "admin_panel.mail_collect",
  "service-settings": "admin_panel.service_settings",
  notifications: "admin_panel.notifications",
  "notifications-inapp": "admin_panel.notifications",
  injection: "admin_panel.injection",
  "equipment-purge": "admin_panel.equipment_purge",
  maintenance: "admin_panel.maintenance",
  rmm: "admin_panel.rmm",
  integrations: "admin_panel.integrations",
  license: "admin_panel.license"
};

export const ADMIN_PANEL_PERMISSION_KEYS = [...new Set(Object.values(ADMIN_NAV_PERMISSION_BY_KEY))];

export function permissionKeyForAdminNav(navKey) {
  return ADMIN_NAV_PERMISSION_BY_KEY[navKey] || null;
}

export function canAccessAdminPanel(canAny, isRoleAdmin = false) {
  if (isRoleAdmin) return true;
  if (typeof canAny !== "function") return false;
  return canAny(ADMIN_PANEL_PERMISSION_KEYS);
}

export function canAccessAdminNavKey(can, navKey, isRoleAdmin = false) {
  if (isRoleAdmin) return true;
  if (typeof can !== "function") return false;
  if (navKey === "fiche-config") {
    return can("admin_panel.contract_modules") || can("admin_panel.equipment_families");
  }
  const permissionKey = permissionKeyForAdminNav(navKey);
  if (!permissionKey) return false;
  return can(permissionKey);
}
