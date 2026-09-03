import { PERMISSION_CATALOG_NORMALIZED, permissionKey, enforcePermissionDependencies } from "./permissionCatalog.js";

function keysWhere(predicate) {
  const set = new Set();
  for (const group of PERMISSION_CATALOG_NORMALIZED) {
    for (const action of group.actions) {
      if (predicate(group, action)) set.add(permissionKey(group.group, action.action));
    }
  }
  return set;
}

function allKeys() {
  return keysWhere(() => true);
}

const DETAIL_WORK_GROUPS = new Set(["clients_detail", "contacts_detail", "tickets_detail", "sales_detail"]);

function isViewAction(action) {
  return action.action === "view";
}

function readerKeys() {
  return keysWhere((g, a) => !g.adminOnly && g.group !== "admin_panel" && isViewAction(a) && g.group !== "vault" && g.group !== "tabs" && g.group !== "knowledge_base");
}

function collaboratorKeys() {
  const set = keysWhere((g, a) => {
    if (g.adminOnly || g.group === "admin_panel") return false;
    if (g.group === "vault" || g.group === "tabs" || g.group === "knowledge_base") return false;
    if (["view", "create", "edit", "export"].includes(a.action)) return true;
    if (DETAIL_WORK_GROUPS.has(g.group) && !["delete", "credits", "all_customer_feedback"].includes(a.action)) {
      return !["ai_runbook", "ai_suggest", "exclude", "split"].includes(a.action);
    }
    if (g.group === "home") return true;
    if (g.group === "planning" && a.action !== "open_ticket") return true;
    if (["public_views", "manage_views", "customer_feedback", "notes", "tags", "sites", "solutions", "devices", "add_contact", "schedule_event", "portal", "tasks", "report", "public_reply", "edit_messages", "request_validation", "macro", "resolve"].includes(a.action)) {
      return true;
    }
    return false;
  });
  set.add("vault.view");
  return enforcePermissionDependencies(set);
}

function agentKeys() {
  const set = keysWhere((g, a) => {
    if (g.adminOnly || g.group === "admin_panel") return false;
    if (g.group === "tabs" || g.group === "knowledge_base") return false;
    if (a.action === "manage" && g.group === "tickets") return false;
    if (["all_customer_feedback", "random_mode"].includes(a.action)) return false;
    if (a.action === "credits") return false;
    return true;
  });
  set.add("contacts_detail.portal");
  set.add("contacts_detail.access_sharing");
  set.add("supervision.manage");
  set.add("vault.manage");
  set.add("clients_detail.vault");
  return enforcePermissionDependencies(set);
}

function supervisorKeys() {
  const set = agentKeys();
  set.add("tickets.manage");
  set.add("tickets.trash");
  set.add("tickets.manage_views");
  set.add("tickets.all_customer_feedback");
  set.add("tickets.random_mode");
  set.add("sales.trash");
  set.add("sales.manage_views");
  set.add("clients_detail.credits");
  set.add("tabs.open_restricted");
  return enforcePermissionDependencies(set);
}

/** Canonical profile name stored in DB / shown in UI. */
export const SUPER_ADMIN_PROFILE_NAME = "Super Admin";

const PRESET_BUILDERS = {
  "super admin": allKeys,
  "super-admin": allKeys,
  super_admin: allKeys,
  superadmin: allKeys,
  superadministrateur: allKeys,
  "super-administrateur": allKeys,
  administrateur: allKeys,
  administrator: allKeys,
  admin: allKeys,
  superviseur: supervisorKeys,
  supervisor: supervisorKeys,
  agent: agentKeys,
  collaborateur: collaboratorKeys,
  collaborator: collaboratorKeys,
  lecture: readerKeys,
  lecteur: readerKeys,
  reader: readerKeys,
  "read only": readerKeys,
  readonly: readerKeys
};

export function normalizeProfileName(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function getPresetForProfile(profileName) {
  const builder = PRESET_BUILDERS[normalizeProfileName(profileName)];
  return builder ? builder() : null;
}

/** Only Super Admin is immutable (permissions / profile meta). Administrator remains editable. */
export function isSuperAdminPresetProfile(profileName) {
  const key = normalizeProfileName(profileName);
  return key === "super admin" || key === "superadmin" || key === "super administrateur";
}

/** Admin-level profiles (Super Admin / Administrator): the only ones allowed to grant admin-level access. */
export function isAdminLevelProfile(profileName) {
  const key = normalizeProfileName(profileName);
  return isSuperAdminPresetProfile(profileName) || key === "admin" || key === "administrateur" || key === "administrator";
}

/** @deprecated Use isSuperAdminPresetProfile — kept for call sites that locked "admin" before. */
export function isAdminPresetProfile(profileName) {
  return isSuperAdminPresetProfile(profileName);
}
