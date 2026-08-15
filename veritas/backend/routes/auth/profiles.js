import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { isCommunity } from "../../utils/edition.js";
import { getProfileRow, resolveEffectiveProfile, profileHasChildren, PROFILE_PERMISSION_FLAGS } from "../../services/profilePermissions.js";
import { ensureProfilesSchema } from "../../services/ensureProfilesSchema.js";
import { syncPermissionsFromModuleFlag } from "../../services/permissionService.js";
import { MODULE_FLAG_TO_GROUPS } from "../../config/permissionCatalog.js";
import { isSuperAdminPresetProfile } from "../../config/permissionPresets.js";

const router = express.Router();
router.use(verifyJWT);

const TOGGLEABLE_FLAGS = PROFILE_PERMISSION_FLAGS.filter(f => f !== "contrat_enabled" && f !== "contact_enabled");

function mapProfileRow(row) {
  if (!row) return null;
  const mapped = {
    name: row.name,
    label: row.label,
    parent_profile: row.parent_profile || null,
    display_order: row.display_order
  };
  for (const flag of PROFILE_PERMISSION_FLAGS) {
    mapped[flag] = Boolean(row[flag]);
  }
  mapped.contrat_enabled = true;
  mapped.contact_enabled = true;
  return mapped;
}

router.get("/:name", async (req, res) => {
  const {
    name
  } = req.params;
  await ensureProfilesSchema();
  if (!name) {
    return res.status(400).json({
      error: "Nom de profil required"
    });
  }
  try {
    const effective = await resolveEffectiveProfile(name);
    if (!effective) {
      return res.status(404).json({
        error: "Profile not found"
      });
    }
    res.json(mapProfileRow(effective));
  } catch (err) {
    if (String(err.message || "").includes("Cycle")) {
      return res.status(500).json({
        error: err.message
      });
    }
    res.status(500).json({
      error: "Internal error retrieving profile."
    });
  }
});

router.patch("/:name", requireRole("admin"), async (req, res) => {
  const {
    name
  } = req.params;
  if (isSuperAdminPresetProfile(name)) {
    return res.status(403).json({
      error: "The Super Admin profile cannot be modified.",
      code: "PROTECTED_PROFILE"
    });
  }
  const {
    label
  } = req.body || {};
  try {
    if (isCommunity()) {
      const hasPermissionChanges = TOGGLEABLE_FLAGS.some(flag => req.body?.[flag] !== undefined);
      if (hasPermissionChanges) {
        return res.status(403).json({
          error: "Access rights customization — available with Veritas Pro.",
          code: "COMMUNITY_PROFILE_ACCESS"
        });
      }
      const result = await pool.query(`UPDATE v_b_users_profiles
         SET label = COALESCE($1, label)
         WHERE name = $2`, [label, name]);
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Profile not found"
        });
      }
      return res.json({
        success: true
      });
    }

    const sets = ["label = COALESCE($1, label)", "contrat_enabled = TRUE", "contact_enabled = TRUE"];
    const params = [label];
    let idx = 2;
    const syncedFlags = [];
    for (const flag of TOGGLEABLE_FLAGS) {
      if (req.body?.[flag] === undefined) continue;
      sets.push(`${flag} = $${idx}`);
      params.push(Boolean(req.body[flag]));
      syncedFlags.push([flag, Boolean(req.body[flag])]);
      idx += 1;
    }
    params.push(name);
    const result = await pool.query(`UPDATE v_b_users_profiles
       SET ${sets.join(", ")}
       WHERE name = $${idx}`, params);
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Profile not found"
      });
    }
    for (const [flagKey, value] of syncedFlags) {
      if (!MODULE_FLAG_TO_GROUPS[flagKey]) continue;
      await syncPermissionsFromModuleFlag(name, flagKey, value);
    }
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[profiles] PATCH failed:", err.message);
    res.status(500).json({
      error: "SQL error"
    });
  }
});

router.post("/", requireRole("admin"), async (req, res) => {
  if (isCommunity()) {
    return res.status(403).json({
      error: "Creating additional profiles — available with Veritas Pro.",
      code: "COMMUNITY_PROFILE_LIMIT"
    });
  }
  const body = req.body || {};
  const {
    name,
    label,
    parentProfile,
    parent_profile,
    display_order = 999
  } = body;
  const parentName = String(parentProfile || parent_profile || "").trim() || null;
  if (!name || !label) {
    return res.status(400).json({
      error: "Name and label required"
    });
  }
  if (isSuperAdminPresetProfile(name)) {
    return res.status(403).json({
      error: "The Super Admin profile name is reserved.",
      code: "PROTECTED_PROFILE"
    });
  }
  try {
    if (parentName) {
      const parent = await getProfileRow(parentName);
      if (!parent) {
        return res.status(400).json({
          error: `Profil parent « ${parentName} » not found`
        });
      }
      await pool.query(`INSERT INTO v_b_users_profiles
          (name, label, parent_profile,
           monitoring_enabled, infrastructure_enabled, cybersecurite_enabled,
           planning_enabled, service_enabled, contrat_enabled, contact_enabled,
           configurateur_enabled, tickets_enabled, sales_enabled, dashboard_enabled,
           documents_enabled, equipment_inventory_enabled, administration_enabled, display_order)
         SELECT
           $1, $2, $3,
           monitoring_enabled, infrastructure_enabled, cybersecurite_enabled,
           planning_enabled, service_enabled, TRUE, TRUE,
           configurateur_enabled, tickets_enabled, sales_enabled, dashboard_enabled,
           documents_enabled, equipment_inventory_enabled, administration_enabled,
           COALESCE($4, display_order)
         FROM v_b_users_profiles
         WHERE name = $3`, [String(name).trim(), String(label).trim(), parentName, Number(display_order) || 999]);
    } else {
      const flagValues = TOGGLEABLE_FLAGS.map(flag => Boolean(body[flag]));
      await pool.query(`INSERT INTO v_b_users_profiles
         (name, label,
          monitoring_enabled, infrastructure_enabled, cybersecurite_enabled,
          planning_enabled, service_enabled, contrat_enabled, contact_enabled,
          configurateur_enabled, tickets_enabled, sales_enabled, dashboard_enabled,
          documents_enabled, equipment_inventory_enabled, administration_enabled, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, $8, $9, $10, $11, $12, $13, $14, $15)`, [String(name).trim(), String(label).trim(),
      // monitoring, infrastructure, cyber, planning, service
      Boolean(body.monitoring_enabled), Boolean(body.infrastructure_enabled), Boolean(body.cybersecurite_enabled), Boolean(body.planning_enabled), Boolean(body.service_enabled),
      // configurateur, tickets, sales, dashboard, documents, inventory, administration
      Boolean(body.configurateur_enabled), Boolean(body.tickets_enabled), Boolean(body.sales_enabled), Boolean(body.dashboard_enabled), Boolean(body.documents_enabled), Boolean(body.equipment_inventory_enabled), Boolean(body.administration_enabled), Number.isFinite(Number(display_order)) ? Number(display_order) : 999]);
      void flagValues;
    }
    res.status(201).json({
      success: true
    });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({
        error: "A profile with this name already exists"
      });
    }
    res.status(500).json({
      error: "Error creating profile",
      details: err.message
    });
  }
});

router.delete("/:name", requireRole("admin"), async (req, res) => {
  const {
    name
  } = req.params;
  if (!name) {
    return res.status(400).json({
      error: "Nom de profil required"
    });
  }
  if (isSuperAdminPresetProfile(name)) {
    return res.status(403).json({
      error: "The Super Admin profile cannot be deleted.",
      code: "PROTECTED_PROFILE"
    });
  }
  try {
    if (await profileHasChildren(name)) {
      return res.status(400).json({
        error: "Profile has child profiles"
      });
    }
    const result = await pool.query("DELETE FROM v_b_users_profiles WHERE name = $1", [name]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Profile not found"
      });
    }
    res.json({
      success: true
    });
  } catch (err) {
    res.status(500).json({
      error: "Error deleting profile",
      details: err.message
    });
  }
});

router.get("/", async (req, res) => {
  try {
    await ensureProfilesSchema();
    const result = await pool.query(`SELECT name, label, parent_profile,
              ${PROFILE_PERMISSION_FLAGS.join(", ")}, display_order
       FROM v_b_users_profiles
       ORDER BY display_order ASC, label ASC`);
    res.json(result.rows.map(mapProfileRow));
  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

export default router;
