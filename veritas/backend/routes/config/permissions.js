import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { PERMISSION_CATALOG_NORMALIZED, PERMISSION_ACTION_LABELS, ALL_PERMISSION_KEYS, VIEW_PERMISSION_TO_MODULE_FLAG, permissionKey, getMatrixCatalog } from "../../config/permissionCatalog.js";
import { isSuperAdminPresetProfile, SUPER_ADMIN_PROFILE_NAME, getPresetForProfile } from "../../config/permissionPresets.js";
import { getUserPermissions, getProfilePermissions, invalidateProfilePermissions, sanitizeGrantedPermissions } from "../../services/permissionService.js";
import { ensurePermissionsSchema } from "../../services/ensurePermissionsSchema.js";
import { isCommunity } from "../../utils/edition.js";

const router = express.Router();
router.use(verifyJWT);

function moduleFlagsFromGranted(grantedSet) {
  const flags = {};
  for (const [viewKey, flag] of Object.entries(VIEW_PERMISSION_TO_MODULE_FLAG)) {
    if (!flags[flag]) flags[flag] = false;
    if (grantedSet.has(viewKey)) flags[flag] = true;
  }
  return flags;
}

async function syncModuleFlags(client, profileName, grantedSet) {
  const flags = moduleFlagsFromGranted(grantedSet);
  const entries = Object.entries(flags);
  if (entries.length === 0) return;
  const sets = entries.map(([col], idx) => `${col} = $${idx + 2}`);
  const params = [profileName, ...entries.map(([, v]) => v)];
  await client.query(`UPDATE v_b_users_profiles SET ${sets.join(", ")} WHERE name = $1`, params);
}

async function writeProfilePermissions(client, name, grantedSet) {
  await client.query(`DELETE FROM v_b_profile_permissions WHERE profile_name = $1`, [name]);
  const values = [];
  const params = [];
  let i = 1;
  for (const key of ALL_PERMISSION_KEYS) {
    values.push(`($${i++}, $${i++}, $${i++})`);
    params.push(name, key, grantedSet.has(key));
  }
  await client.query(`INSERT INTO v_b_profile_permissions (profile_name, permission_key, allowed)
     VALUES ${values.join(", ")}`, params);
  await syncModuleFlags(client, name, grantedSet);
}

function permissionsObjectFromSet(granted) {
  const permissions = {};
  for (const key of ALL_PERMISSION_KEYS) {
    permissions[key] = granted.has(key);
  }
  return permissions;
}

router.get("/catalog", requirePermission("admin_panel.permissions"), (req, res) => {
  const catalog = PERMISSION_CATALOG_NORMALIZED.map(group => ({
    group: group.group,
    label: group.label,
    section: group.section || "autres",
    adminOnly: Boolean(group.adminOnly),
    matrix: group.matrix !== false,
    actions: group.actions.map(action => ({
      action: action.action,
      key: permissionKey(group.group, action.action),
      label: action.label || PERMISSION_ACTION_LABELS[action.action] || action.action,
      dependsOn: action.dependsOn || [],
      matrix: action.matrix !== false
    }))
  }));
  res.json({
    catalog,
    matrixCatalog: getMatrixCatalog({
      includeAdminOnly: false,
      includeHidden: false
    }),
    actionLabels: PERMISSION_ACTION_LABELS
  });
});

router.get("/me", async (req, res) => {
  try {
    const perms = await getUserPermissions(req.user);
    res.json({
      isAdmin: String(req.user.role || "").toLowerCase() === "admin",
      permissions: Array.from(perms)
    });
  } catch (err) {
    console.error("[permissions] /me failed:", err.message);
    res.status(500).json({
      error: "Server error."
    });
  }
});

router.get("/matrix", requirePermission("admin_panel.permissions"), async (req, res) => {
  try {
    await ensurePermissionsSchema();
    const {
      rows: profiles
    } = await pool.query(`SELECT name, label, display_order
       FROM v_b_users_profiles
       ORDER BY COALESCE(display_order, 9999), name`);
    const permissionsByProfile = {};
    for (const profile of profiles) {
      let granted = await getProfilePermissions(profile.name);
      if (isSuperAdminPresetProfile(profile.name)) {
        granted = new Set(ALL_PERMISSION_KEYS);
      }
      permissionsByProfile[profile.name] = permissionsObjectFromSet(granted);
    }
    res.json({
      profiles: profiles.map(p => ({
        name: p.name,
        label: p.label,
        protected: isSuperAdminPresetProfile(p.name)
      })),
      permissionsByProfile,
      matrixCatalog: getMatrixCatalog({
        includeAdminOnly: false,
        includeHidden: false
      })
    });
  } catch (err) {
    console.error("[permissions] matrix read failed:", err.message);
    res.status(500).json({
      error: "Server error."
    });
  }
});

router.put("/matrix", requirePermission("admin_panel.permissions"), async (req, res) => {
  if (isCommunity()) {
    return res.status(403).json({
      error: "Custom permissions require Pro edition.",
      code: "COMMUNITY_LOCK"
    });
  }
  const input = req.body?.permissionsByProfile;
  if (!input || typeof input !== "object") {
    return res.status(400).json({
      error: "'permissionsByProfile' field required."
    });
  }
  const client = await pool.connect();
  try {
    await ensurePermissionsSchema();
    const {
      rows: existing
    } = await client.query(`SELECT name FROM v_b_users_profiles`);
    const existingNames = new Set(existing.map(r => r.name));
    await client.query("BEGIN");
    const saved = {};
    for (const [rawName, perms] of Object.entries(input)) {
      const name = String(rawName || "").trim();
      if (!name || !existingNames.has(name)) continue;
      if (isSuperAdminPresetProfile(name)) {
        const all = new Set(ALL_PERMISSION_KEYS);
        await writeProfilePermissions(client, name, all);
        saved[name] = Array.from(all);
        continue;
      }
      const grantedSet = sanitizeGrantedPermissions(perms);
      await writeProfilePermissions(client, name, grantedSet);
      saved[name] = Array.from(grantedSet);
      invalidateProfilePermissions(name);
    }
    // Always keep Super Admin fully granted
    if (existingNames.has(SUPER_ADMIN_PROFILE_NAME) || [...existingNames].some(isSuperAdminPresetProfile)) {
      for (const name of existingNames) {
        if (!isSuperAdminPresetProfile(name)) continue;
        const all = getPresetForProfile(name) || new Set(ALL_PERMISSION_KEYS);
        await writeProfilePermissions(client, name, all);
        invalidateProfilePermissions(name);
      }
    }
    await client.query("COMMIT");
    invalidateProfilePermissions();
    res.json({
      success: true,
      saved
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[permissions] matrix write failed:", err.message);
    res.status(500).json({
      error: "Error saving permissions"
    });
  } finally {
    client.release();
  }
});

router.get("/profiles/:name", requirePermission("admin_panel.permissions"), async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (!name) return res.status(400).json({
    error: "Nom de profil required."
  });
  try {
    await ensurePermissionsSchema();
    const granted = await getProfilePermissions(name);
    res.json({
      name,
      permissions: permissionsObjectFromSet(granted)
    });
  } catch (err) {
    console.error("[permissions] profile read failed:", err.message);
    res.status(500).json({
      error: "Server error."
    });
  }
});

router.put("/profiles/:name", requirePermission("admin_panel.permissions"), async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (!name) return res.status(400).json({
    error: "Nom de profil required."
  });
  if (isSuperAdminPresetProfile(name)) {
    return res.status(403).json({
      error: "The Super Admin profile keeps full non-modifiable access.",
      code: "PROTECTED_PROFILE"
    });
  }
  if (isCommunity()) {
    return res.status(403).json({
      error: "Custom permissions require Pro edition.",
      code: "COMMUNITY_LOCK"
    });
  }
  const input = req.body?.permissions;
  if (!input || typeof input !== "object") {
    return res.status(400).json({
      error: "'permissions' field required (key → boolean object)."
    });
  }
  const grantedSet = sanitizeGrantedPermissions(input);
  const client = await pool.connect();
  try {
    const profileExists = await client.query(`SELECT 1 FROM v_b_users_profiles WHERE name = $1 LIMIT 1`, [name]);
    if (profileExists.rows.length === 0) {
      return res.status(404).json({
        error: "Profile not found."
      });
    }
    await client.query("BEGIN");
    await writeProfilePermissions(client, name, grantedSet);
    await client.query("COMMIT");
    invalidateProfilePermissions(name);
    res.json({
      success: true,
      granted: Array.from(grantedSet)
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[permissions] profile write failed:", err.message);
    res.status(500).json({
      error: "Error saving permissions"
    });
  } finally {
    client.release();
  }
});

export default router;
