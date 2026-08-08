import express from "express";
import { body, param, validationResult } from "express-validator";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { ensureSalesTicketCategoriesSchema } from "../../services/ensureSalesTicketCategoriesSchema.js";

const router = express.Router();
router.use(verifyJWT);

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: "Validation error",
      errors: errors.array()
    });
    return true;
  }
  return false;
}

async function ensureSchemaOrFail(res) {
  const schema = await ensureSalesTicketCategoriesSchema();
  if (!schema?.ready) {
    res.status(503).json({
      error: "Service categories schema is not ready. Restart the backend to apply migrations."
    });
    return false;
  }
  return true;
}

function isUniqueViolation(err) {
  return err?.code === "23505";
}

router.get("/sections", async (_req, res) => {
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const result = await pool.query(`SELECT id, name, description, enabled, created_at, updated_at
       FROM v_b_sales_ticket_category_sections
       ORDER BY name ASC`);
    return res.json(result.rows || []);
  } catch (err) {
    console.error("Error loading sales category sections:", err);
    return res.status(500).json({
      error: "Error loading service category sections"
    });
  }
});

router.post("/sections", [body("name").isString().notEmpty(), body("description").optional().isString(), body("enabled").optional().isBoolean()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const id = `sales-sec-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const enabled = req.body?.enabled !== false;
    const result = await pool.query(
      `INSERT INTO v_b_sales_ticket_category_sections (id, name, description, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name, description, enabled, created_at, updated_at`,
      [id, name, description, enabled]
    );
    return res.status(201).json(result.rows?.[0] || null);
  } catch (err) {
    console.error("Failed to create sales category section:", err);
    if (isUniqueViolation(err)) {
      return res.status(409).json({
        error: "A section with this name already exists"
      });
    }
    return res.status(500).json({
      error: "Error creating service category section"
    });
  }
});

router.put("/sections/:sectionId", [param("sectionId").isString().notEmpty(), body("name").optional().isString(), body("description").optional().isString(), body("enabled").optional().isBoolean()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const sectionId = String(req.params?.sectionId || "").trim();
    const existing = await pool.query(`SELECT id, name FROM v_b_sales_ticket_category_sections WHERE id = $1`, [sectionId]);
    if (!existing.rows.length) {
      return res.status(404).json({
        error: "Service category section not found"
      });
    }
    const oldName = String(existing.rows[0]?.name || "").trim();
    const updates = [];
    const values = [];
    let idx = 1;
    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      updates.push(`name = $${idx++}`);
      values.push(String(req.body?.name || "").trim());
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      updates.push(`description = $${idx++}`);
      values.push(String(req.body?.description || "").trim());
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
      updates.push(`enabled = $${idx++}`);
      values.push(req.body?.enabled !== false);
    }
    if (updates.length === 0) {
      return res.status(400).json({
        error: "No fields to update"
      });
    }
    updates.push("updated_at = NOW()");
    values.push(sectionId);
    const result = await pool.query(
      `UPDATE v_b_sales_ticket_category_sections
         SET ${updates.join(", ")}
         WHERE id = $${idx}
         RETURNING id, name, description, enabled, created_at, updated_at`,
      values
    );
    const newName = String(result.rows?.[0]?.name || "").trim();
    if (oldName && newName && oldName !== newName) {
      await pool.query(`UPDATE v_b_sales_ticket_categories SET section = $1 WHERE section = $2`, [newName, oldName]);
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update sales category section:", err);
    if (isUniqueViolation(err)) {
      return res.status(409).json({
        error: "A section with this name already exists"
      });
    }
    return res.status(500).json({
      error: "Error updating service category section"
    });
  }
});

router.delete("/sections/:sectionId", [param("sectionId").isString().notEmpty()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const sectionId = String(req.params?.sectionId || "").trim();
    const existing = await pool.query(`SELECT id, name FROM v_b_sales_ticket_category_sections WHERE id = $1`, [sectionId]);
    if (!existing.rows.length) {
      return res.status(404).json({
        error: "Service category section not found"
      });
    }
    const sectionName = String(existing.rows[0]?.name || "").trim();
    const linkedCategories = await pool.query(`SELECT COUNT(*)::int AS count FROM v_b_sales_ticket_categories WHERE section = $1`, [sectionName]);
    const linkedCount = Number(linkedCategories.rows?.[0]?.count || 0);
    if (linkedCount > 0) {
      return res.status(409).json({
        error:
          linkedCount === 1
            ? "Unable to delete this section: 1 service category is still linked."
            : `Unable to delete this section: ${linkedCount} service categories are still linked.`
      });
    }
    await pool.query(`DELETE FROM v_b_sales_ticket_category_sections WHERE id = $1`, [sectionId]);
    return res.json({
      success: true
    });
  } catch (err) {
    console.error("Failed to delete sales category section:", err);
    return res.status(500).json({
      error: "Error deleting service category section"
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const result = await pool.query(`SELECT id, section, name, description, enabled, created_at, updated_at
       FROM v_b_sales_ticket_categories
       ORDER BY section ASC, name ASC`);
    return res.json(result.rows || []);
  } catch (err) {
    console.error("Error loading sales categories:", err);
    return res.status(500).json({
      error: "Error loading service categories"
    });
  }
});

router.post("/", [body("name").isString().notEmpty(), body("section").optional().isString(), body("description").optional().isString(), body("enabled").optional().isBoolean()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const name = String(req.body?.name || "").trim();
    const section = String(req.body?.section || "Uncategorized").trim() || "Uncategorized";
    const description = String(req.body?.description || "").trim();
    const enabled = req.body?.enabled !== false;
    const id = `sales-cat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const result = await pool.query(
      `INSERT INTO v_b_sales_ticket_categories (id, section, name, description, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, section, name, description, enabled, created_at, updated_at`,
      [id, section, name, description, enabled]
    );
    return res.status(201).json(result.rows?.[0] || null);
  } catch (err) {
    console.error("Failed to create sales category:", err);
    if (isUniqueViolation(err)) {
      return res.status(409).json({
        error: "A category with this name already exists"
      });
    }
    return res.status(500).json({
      error: "Error creating service category"
    });
  }
});

router.put("/:categoryId", [param("categoryId").isString().notEmpty(), body("name").optional().isString(), body("section").optional().isString(), body("description").optional().isString(), body("enabled").optional().isBoolean()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const categoryId = String(req.params?.categoryId || "").trim();
    const updates = [];
    const values = [];
    let idx = 1;
    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      updates.push(`name = $${idx++}`);
      values.push(String(req.body?.name || "").trim());
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "section")) {
      updates.push(`section = $${idx++}`);
      values.push(String(req.body?.section || "Uncategorized").trim() || "Uncategorized");
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      updates.push(`description = $${idx++}`);
      values.push(String(req.body?.description || "").trim());
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
      updates.push(`enabled = $${idx++}`);
      values.push(req.body?.enabled !== false);
    }
    if (updates.length === 0) {
      return res.status(400).json({
        error: "No fields to update"
      });
    }
    updates.push("updated_at = NOW()");
    values.push(categoryId);
    const result = await pool.query(
      `UPDATE v_b_sales_ticket_categories
         SET ${updates.join(", ")}
         WHERE id = $${idx}
         RETURNING id, section, name, description, enabled, created_at, updated_at`,
      values
    );
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Service category not found"
      });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update sales category:", err);
    if (isUniqueViolation(err)) {
      return res.status(409).json({
        error: "A category with this name already exists"
      });
    }
    return res.status(500).json({
      error: "Error updating service category"
    });
  }
});

router.delete("/:categoryId", [param("categoryId").isString().notEmpty()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    if (!(await ensureSchemaOrFail(res))) return;
    const categoryId = String(req.params?.categoryId || "").trim();
    const result = await pool.query(`DELETE FROM v_b_sales_ticket_categories WHERE id = $1`, [categoryId]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Service category not found"
      });
    }
    return res.json({
      success: true
    });
  } catch (err) {
    console.error("Failed to delete sales category:", err);
    return res.status(500).json({
      error: "Error deleting service category"
    });
  }
});

export default router;
