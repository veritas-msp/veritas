import { pool } from "../database/db.js";
import { ensureTicketSolutionCatalogSchema } from "./ensureTicketSolutionCatalogSchema.js";
function mapCatalogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    intervention: row.intervention || null,
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function findInterventionByLabel(label) {
  const normalized = String(label || "").trim();
  if (!normalized) return null;
  const result = await pool.query(`SELECT id, label
     FROM v_b_ticket_solution_catalog
     WHERE category = 'intervention'
       AND lower(trim(label)) = lower(trim($1))
     LIMIT 1`, [normalized]);
  return result.rows[0] || null;
}
async function countActionsForIntervention(interventionLabel) {
  const normalized = String(interventionLabel || "").trim();
  if (!normalized) return 0;
  const result = await pool.query(`SELECT COUNT(*)::int AS count
     FROM v_b_ticket_solution_catalog
     WHERE category = 'action'
       AND lower(trim(COALESCE(intervention, ''))) = lower(trim($1))`, [normalized]);
  return Number(result.rows?.[0]?.count || 0);
}
export async function listSolutionCatalog({
  category = "",
  includeInactive = false
} = {}) {
  const schema = await ensureTicketSolutionCatalogSchema();
  if (!schema.hasCatalog) return [];
  const values = [];
  const where = [];
  if (category) {
    values.push(String(category).trim());
    where.push(`category = $${values.length}`);
  }
  if (!includeInactive) {
    where.push("is_active = TRUE");
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const interventionSelect = schema.hasCatalogInterventionCol ? "intervention" : "NULL::varchar AS intervention";
  const result = await pool.query(`SELECT id, category, label, ${interventionSelect}, display_order, is_active, created_at, updated_at
     FROM v_b_ticket_solution_catalog
     ${whereSql}
     ORDER BY category ASC, display_order ASC, label ASC`, values);
  return (result.rows || []).map(mapCatalogRow);
}
export async function createSolutionCatalogEntry({
  category,
  label,
  intervention = null,
  displayOrder = 0,
  isActive = true
} = {}) {
  const schema = await ensureTicketSolutionCatalogSchema();
  const normalizedCategory = String(category || "").trim();
  const normalizedLabel = String(label || "").trim();
  if (!["intervention", "action"].includes(normalizedCategory)) {
    const err = new Error("INVALID_CATEGORY");
    throw err;
  }
  if (!normalizedLabel) {
    const err = new Error("LABEL_REQUIRED");
    throw err;
  }
  let normalizedIntervention = null;
  if (normalizedCategory === "action") {
    normalizedIntervention = String(intervention || "").trim();
    if (!normalizedIntervention) {
      const err = new Error("INTERVENTION_REQUIRED");
      throw err;
    }
    const parent = await findInterventionByLabel(normalizedIntervention);
    if (!parent) {
      const err = new Error("INTERVENTION_NOT_FOUND");
      throw err;
    }
    normalizedIntervention = parent.label;
  }
  if (schema.hasCatalogInterventionCol) {
    const result = await pool.query(`INSERT INTO v_b_ticket_solution_catalog (category, label, intervention, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, category, label, intervention, display_order, is_active, created_at, updated_at`, [normalizedCategory, normalizedLabel, normalizedIntervention, Number(displayOrder) || 0, isActive !== false]);
    return mapCatalogRow(result.rows[0]);
  }
  const result = await pool.query(`INSERT INTO v_b_ticket_solution_catalog (category, label, display_order, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING id, category, label, display_order, is_active, created_at, updated_at`, [normalizedCategory, normalizedLabel, Number(displayOrder) || 0, isActive !== false]);
  return mapCatalogRow({
    ...result.rows[0],
    intervention: null
  });
}
export async function updateSolutionCatalogEntry(id, patch = {}) {
  const schema = await ensureTicketSolutionCatalogSchema();
  const existingResult = await pool.query(`SELECT id, category, label, ${schema.hasCatalogInterventionCol ? "intervention" : "NULL::varchar AS intervention"}, display_order, is_active, created_at, updated_at
     FROM v_b_ticket_solution_catalog
     WHERE id = $1`, [id]);
  const existing = existingResult.rows[0];
  if (!existing) return null;
  const updates = [];
  const values = [];
  let idx = 1;
  let nextLabel = existing.label;
  let nextIntervention = existing.intervention || null;
  if (Object.prototype.hasOwnProperty.call(patch, "label")) {
    const label = String(patch.label || "").trim();
    if (!label) {
      const err = new Error("LABEL_REQUIRED");
      throw err;
    }
    updates.push(`label = $${idx++}`);
    values.push(label);
    nextLabel = label;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "intervention") && schema.hasCatalogInterventionCol) {
    if (existing.category === "action") {
      const intervention = String(patch.intervention || "").trim();
      if (!intervention) {
        const err = new Error("INTERVENTION_REQUIRED");
        throw err;
      }
      const parent = await findInterventionByLabel(intervention);
      if (!parent) {
        const err = new Error("INTERVENTION_NOT_FOUND");
        throw err;
      }
      updates.push(`intervention = $${idx++}`);
      values.push(parent.label);
      nextIntervention = parent.label;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "displayOrder")) {
    updates.push(`display_order = $${idx++}`);
    values.push(Number(patch.displayOrder) || 0);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "isActive")) {
    updates.push(`is_active = $${idx++}`);
    values.push(patch.isActive !== false);
  }
  if (updates.length === 0) {
    const err = new Error("NO_CHANGES");
    throw err;
  }
  updates.push("updated_at = NOW()");
  values.push(id);
  const returning = schema.hasCatalogInterventionCol ? "id, category, label, intervention, display_order, is_active, created_at, updated_at" : "id, category, label, display_order, is_active, created_at, updated_at";
  const result = await pool.query(`UPDATE v_b_ticket_solution_catalog
     SET ${updates.join(", ")}
     WHERE id = $${idx}
     RETURNING ${returning}`, values);
  const updated = result.rows[0] || null;
  if (updated && existing.category === "intervention" && schema.hasCatalogInterventionCol) {
    const oldName = String(existing.label || "").trim();
    const newName = String(nextLabel || "").trim();
    if (oldName && newName && oldName !== newName) {
      await pool.query(`UPDATE v_b_ticket_solution_catalog
         SET intervention = $1, updated_at = NOW()
         WHERE category = 'action'
           AND lower(trim(COALESCE(intervention, ''))) = lower(trim($2))`, [newName, oldName]);
    }
  }
  return mapCatalogRow(updated ? {
    ...updated,
    intervention: updated.intervention ?? nextIntervention
  } : null);
}
export async function deleteSolutionCatalogEntry(id) {
  const schema = await ensureTicketSolutionCatalogSchema();
  const existingResult = await pool.query(`SELECT id, category, label
     FROM v_b_ticket_solution_catalog
     WHERE id = $1`, [id]);
  const existing = existingResult.rows[0];
  if (!existing) return false;
  if (existing.category === "intervention" && schema.hasCatalogInterventionCol) {
    const linkedCount = await countActionsForIntervention(existing.label);
    if (linkedCount > 0) {
      const err = new Error("INTERVENTION_HAS_ACTIONS");
      err.linkedCount = linkedCount;
      throw err;
    }
  }
  const result = await pool.query(`DELETE FROM v_b_ticket_solution_catalog WHERE id = $1 RETURNING id`, [id]);
  return Boolean(result.rows[0]);
}
