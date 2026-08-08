import { pool } from "../database/db.js";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG_NORMALIZED, MODULE_FLAG_TO_GROUPS, defaultPermissionsForProfile, permissionKey, enforcePermissionDependencies, resolvePermissionCheckKeys } from "../config/permissionCatalog.js";
import { getPresetForProfile } from "../config/permissionPresets.js";
import { resolveEffectiveProfile } from "./profilePermissions.js";
const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSION_KEYS);
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();
export function invalidateProfilePermissions(name) {
  if (name) cache.delete(String(name));else cache.clear();
}
export function invalidateAllPermissions() {
  cache.clear();
}
function hasAnyViewPermission(perms) {
  for (const key of perms) {
    if (String(key).endsWith(".view")) return true;
  }
  return false;
}
/**
 * Normalize a granted set for runtime use (read / save / checks).
 * Do NOT expand legacy coarse keys here — that re-forces fine matrix rows
 * (e.g. sales.create → home.create_sales) and prevents admins from saving
 * independent toggles. Legacy compatibility is handled by
 * resolvePermissionCheckKeys() and by one-shot migration in ensurePermissionsSchema.
 */
function normalizeGrantedSet(rawSet) {
  return enforcePermissionDependencies(rawSet instanceof Set ? rawSet : new Set(rawSet));
}
async function persistProfileMatrix(name, grantedSet) {
  const normalized = normalizeGrantedSet(grantedSet);
  const client = await pool.connect();
  try {
    const values = [];
    const params = [];
    let i = 1;
    for (const key of ALL_PERMISSION_KEYS) {
      values.push(`($${i++}, $${i++}, $${i++})`);
      params.push(name, key, normalized.has(key));
    }
    await client.query(`DELETE FROM v_b_profile_permissions WHERE profile_name = $1`, [name]);
    await client.query(`INSERT INTO v_b_profile_permissions (profile_name, permission_key, allowed)
       VALUES ${values.join(", ")}`, params);
  } finally {
    client.release();
  }
}
export async function getProfilePermissions(profileName) {
  const name = String(profileName || "").trim();
  if (!name) return new Set();
  const cached = cache.get(name);
  if (cached && cached.expires > Date.now()) return cached.perms;
  let perms;
  try {
    const {
      rows
    } = await pool.query(`SELECT permission_key, allowed FROM v_b_profile_permissions WHERE profile_name = $1`, [name]);
    const preset = getPresetForProfile(name);
    if (rows.length === 0) {
      if (preset) {
        perms = normalizeGrantedSet(preset);
        persistProfileMatrix(name, perms).catch(err => console.warn("[permissions] Persist preset failed:", err.message));
      } else {
        const effective = await resolveEffectiveProfile(name);
        perms = effective ? normalizeGrantedSet(defaultPermissionsForProfile(effective)) : new Set();
      }
    } else {
      perms = normalizeGrantedSet(new Set(rows.filter(r => r.allowed).map(r => r.permission_key)));
      if (preset && !hasAnyViewPermission(perms)) {
        perms = normalizeGrantedSet(preset);
        persistProfileMatrix(name, perms).catch(err => console.warn("[permissions] Heal preset failed:", err.message));
      }
    }
  } catch (err) {
    console.error("[permissions] Profile resolution failed:", err.message);
    perms = new Set();
  }
  cache.set(name, {
    perms,
    expires: Date.now() + CACHE_TTL_MS
  });
  return perms;
}
async function resolveUserProfileName(user) {
  if (user?.id) {
    try {
      const {
        rows
      } = await pool.query(`SELECT profile FROM v_b_users WHERE id = $1`, [user.id]);
      if (rows[0]?.profile) return String(rows[0].profile);
    } catch {}
  }
  return user?.profile ? String(user.profile) : null;
}
export async function getUserPermissions(user) {
  if (!user) return new Set();
  if (String(user.role || "").toLowerCase() === "admin") {
    return ALL_PERMISSIONS_SET;
  }
  const profileName = await resolveUserProfileName(user);
  if (!profileName) return new Set();
  return getProfilePermissions(profileName);
}
function setHasPermission(perms, key) {
  return resolvePermissionCheckKeys(key).some(k => perms.has(k));
}
export async function userHasAllPermissions(user, keys) {
  if (String(user?.role || "").toLowerCase() === "admin") return true;
  const perms = await getUserPermissions(user);
  return keys.every(k => setHasPermission(perms, k));
}
export async function userHasAnyPermission(user, keys) {
  if (String(user?.role || "").toLowerCase() === "admin") return true;
  const perms = await getUserPermissions(user);
  return keys.some(k => setHasPermission(perms, k));
}
export function sanitizeGrantedPermissions(input) {
  const grantedSet = Array.isArray(input) ? new Set(input.filter(k => ALL_PERMISSION_KEYS.includes(k))) : new Set(Object.entries(input || {}).filter(([k, v]) => ALL_PERMISSION_KEYS.includes(k) && Boolean(v)).map(([k]) => k));
  return normalizeGrantedSet(grantedSet);
}
export async function syncPermissionsFromModuleFlag(profileName, flagKey, enabled) {
  const name = String(profileName || "").trim();
  const groups = MODULE_FLAG_TO_GROUPS[flagKey];
  if (!name || !groups?.length) return;
  const allKeys = [];
  const viewKeys = [];
  for (const groupName of groups) {
    const group = PERMISSION_CATALOG_NORMALIZED.find(g => g.group === groupName);
    if (!group || group.adminOnly) continue;
    for (const action of group.actions) {
      const key = permissionKey(group.group, action.action);
      allKeys.push(key);
      if (action.action === "view") viewKeys.push(key);
    }
  }
  if (allKeys.length === 0) return;
  const keysToUpsert = enabled ? viewKeys : allKeys;
  if (keysToUpsert.length === 0) return;
  const client = await pool.connect();
  try {
    const {
      rows
    } = await client.query(`SELECT 1 FROM v_b_profile_permissions WHERE profile_name = $1 LIMIT 1`, [name]);
    if (rows.length === 0) {
      const preset = getPresetForProfile(name);
      const effective = await resolveEffectiveProfile(name);
      const granted = preset ? new Set(preset) : effective ? defaultPermissionsForProfile(effective) : new Set();
      if (enabled) {
        for (const key of viewKeys) granted.add(key);
      } else {
        for (const key of allKeys) granted.delete(key);
      }
      const values = [];
      const params = [];
      let i = 1;
      for (const key of ALL_PERMISSION_KEYS) {
        values.push(`($${i++}, $${i++}, $${i++})`);
        params.push(name, key, granted.has(key));
      }
      await client.query(`INSERT INTO v_b_profile_permissions (profile_name, permission_key, allowed)
         VALUES ${values.join(", ")}`, params);
    } else {
      for (const key of keysToUpsert) {
        await client.query(`INSERT INTO v_b_profile_permissions (profile_name, permission_key, allowed)
           VALUES ($1, $2, $3)
           ON CONFLICT (profile_name, permission_key)
           DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = NOW()`, [name, key, Boolean(enabled)]);
      }
    }
    invalidateProfilePermissions(name);
  } finally {
    client.release();
  }
}
