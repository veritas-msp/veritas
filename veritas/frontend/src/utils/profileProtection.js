/** Canonical Super Admin profile name (must match backend SUPER_ADMIN_PROFILE_NAME). */
export const SUPER_ADMIN_PROFILE_NAME = "Super Admin";

export function normalizeProfileName(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Immutable system profile — permissions and meta cannot be edited. */
export function isSuperAdminProtectedProfile(name) {
  const key = normalizeProfileName(name);
  return key === "super admin" || key === "superadmin" || key === "super administrateur";
}

/** @deprecated Use isSuperAdminProtectedProfile */
export function isAdminProtectedProfile(name) {
  return isSuperAdminProtectedProfile(name);
}
