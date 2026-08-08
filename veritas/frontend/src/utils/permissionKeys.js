/**
 * Frontend mirrors of backend permission aliases / helpers.
 * Keep in sync with backend/config/permissionCatalog.js.
 */
export const LEGACY_PERMISSION_MAP = {
  "clients.edit": ["clients_detail.edit"],
  "clients.delete": ["clients_detail.delete"],
  "contacts.edit": ["contacts_detail.edit"],
  "contacts.delete": ["contacts_detail.delete"],
  "contacts.manage": ["contacts_detail.portal"],
  "tickets.edit": ["tickets_detail.public_reply", "tickets_detail.resolve", "tickets_detail.macro", "tickets_detail.edit_messages", "tickets_detail.request_validation", "tickets_detail.exclude", "tickets_detail.split", "tickets_detail.ai_suggest", "tickets_detail.ai_runbook", "tickets_detail.delete_attachments"],
  "tickets.delete": ["tickets_detail.delete"],
  "tickets.manage": ["tickets.trash", "tickets.manage_views", "tickets.all_customer_feedback", "tickets.random_mode", "tickets.manage"],
  "sales.edit": ["sales_detail.public_reply", "sales_detail.edit_messages", "sales_detail.request_validation", "sales_detail.tasks", "sales_detail.report", "sales_detail.delete_attachments"],
  "sales.delete": ["sales_detail.delete"],
  "vault.manage": ["vault.manage", "clients_detail.vault"]
};

export const LEGACY_KEY_EXPANSION = {
  "clients.edit": ["clients_detail.edit"],
  "clients.delete": ["clients_detail.delete"],
  "contacts.edit": ["contacts_detail.edit"],
  "contacts.delete": ["contacts_detail.delete"],
  "contacts.manage": ["contacts_detail.portal", "contacts_detail.access_sharing"],
  "tickets.edit": ["tickets_detail.public_reply", "tickets_detail.resolve", "tickets_detail.macro", "tickets_detail.edit_messages", "tickets_detail.request_validation", "tickets_detail.exclude", "tickets_detail.split", "tickets_detail.ai_suggest", "tickets_detail.ai_runbook", "tickets_detail.delete_attachments"],
  "tickets.delete": ["tickets_detail.delete", "tickets.trash"],
  "tickets.manage": ["tickets.trash", "tickets.manage_views", "tickets.customer_feedback", "tickets.all_customer_feedback", "tickets.random_mode", "tickets.public_views", "tickets.manage"],
  "sales.edit": ["sales_detail.public_reply", "sales_detail.edit_messages", "sales_detail.request_validation", "sales_detail.tasks", "sales_detail.report", "sales_detail.delete_attachments"],
  "sales.delete": ["sales_detail.delete", "sales.trash"],
  "planning.edit": ["planning.create", "planning.click_create", "planning.edit", "planning.open_ticket"],
  "clients.export": ["clients.export", "clients_detail.reversibility"],
  "vault.manage": ["vault.manage", "clients_detail.vault"],
  "vault.view": ["vault.view", "clients_detail.vault"],
  "cybersecurite.edit": ["clients_detail.campaigns"],
  "infrastructure.edit": ["clients_detail.devices", "clients_detail.solutions"],
  "services.create": ["clients_detail.solutions"],
  "services.edit": ["clients_detail.solutions"],
  "dashboard.view": ["home.view", "dashboard.view"]
};

/**
 * Exact matrix keys must NOT be satisfied by a parent coarse key.
 * Otherwise unchecking Accueil "+" still shows the button when sales.create / planning.edit remain.
 */
const STRICT_MATRIX_KEYS = new Set([
  "home.create_support",
  "home.create_sales",
  "home.create_event",
  "home.view"
]);

export function resolvePermissionCheckKeys(key) {
  if (STRICT_MATRIX_KEYS.has(key)) return [key];
  const aliases = new Set();
  if (LEGACY_PERMISSION_MAP[key]) {
    aliases.add(key);
    for (const mapped of LEGACY_PERMISSION_MAP[key]) aliases.add(mapped);
  } else {
    aliases.add(key);
  }
  for (const [legacy, expansions] of Object.entries(LEGACY_KEY_EXPANSION)) {
    if (expansions.includes(key)) aliases.add(legacy);
  }
  return [...aliases];
}

export function setHasPermission(permissionSet, key) {
  return resolvePermissionCheckKeys(key).some(k => permissionSet.has(String(k)));
}
