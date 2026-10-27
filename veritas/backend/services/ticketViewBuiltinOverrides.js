import { pool } from "../database/db.js";
import { normalizeRules } from "./ticketViewRules.js";
import {
  BUILTIN_TICKET_VIEWS,
  listBuiltinTicketViewsForScope
} from "../utils/builtinTicketViews.js";

let overridesTableReady = false;

export async function ensureBuiltinOverridesTable() {
  if (overridesTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS v_b_ticket_view_builtin_overrides (
        builtin_id TEXT NOT NULL,
        page_scope TEXT NOT NULL DEFAULT 'ticket'
          CHECK (page_scope IN ('ticket', 'ticket_sales')),
        name VARCHAR(120),
        description TEXT,
        icon TEXT,
        rules JSONB,
        sort_by TEXT,
        sort_direction TEXT
          CHECK (sort_direction IS NULL OR sort_direction IN ('asc', 'desc')),
        updated_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (builtin_id, page_scope)
      )
    `);
    overridesTableReady = true;
  } catch (err) {
    console.error("[ticket-views] ensureBuiltinOverridesTable failed:", err.message);
  }
}

function isKnownBuiltinId(builtinId) {
  return BUILTIN_TICKET_VIEWS.some(view => String(view.id) === String(builtinId));
}

function overrideRulesAreMeaningful(rules) {
  if (rules == null || typeof rules !== "object") return false;
  const normalized = normalizeRules(rules);
  if ((normalized.criteria || []).some(c => c && String(c.field || "").trim())) return true;
  return (normalized.filterRoot?.children || []).length > 0;
}

export function mergeBuiltinWithOverride(baseView, overrideRow) {
  if (!baseView) return null;
  if (!overrideRow) {
    return {
      ...baseView,
      isBuiltin: true,
      visibility: "public",
      hasOverride: false
    };
  }
  const nextRules = overrideRulesAreMeaningful(overrideRow.rules)
    ? normalizeRules(overrideRow.rules)
    : baseView.rules;
  return {
    ...baseView,
    name: overrideRow.name != null && String(overrideRow.name).trim()
      ? String(overrideRow.name).trim()
      : baseView.name,
    description: overrideRow.description != null
      ? String(overrideRow.description)
      : baseView.description,
    icon: overrideRow.icon != null && String(overrideRow.icon).trim()
      ? String(overrideRow.icon).trim()
      : baseView.icon,
    rules: nextRules,
    sortBy: overrideRow.sort_by || baseView.sortBy || "updated_at",
    sortDirection: overrideRow.sort_direction || baseView.sortDirection || "desc",
    isBuiltin: true,
    visibility: "public",
    hasOverride: true,
    updatedAt: overrideRow.updated_at || null
  };
}

export async function loadBuiltinOverridesMap(pageScope = "ticket") {
  await ensureBuiltinOverridesTable();
  const scope = String(pageScope || "ticket");
  try {
    const result = await pool.query(
      `SELECT * FROM v_b_ticket_view_builtin_overrides WHERE page_scope = $1`,
      [scope]
    );
    const map = {};
    for (const row of result.rows || []) {
      map[String(row.builtin_id)] = row;
    }
    return map;
  } catch (err) {
    console.error("[ticket-views] loadBuiltinOverridesMap failed:", err.message);
    return {};
  }
}

export async function listMergedBuiltinViews(pageScope = "ticket") {
  const baseList = listBuiltinTicketViewsForScope(pageScope);
  const overrides = await loadBuiltinOverridesMap(pageScope);
  return baseList.map(view => mergeBuiltinWithOverride(view, overrides[String(view.id)]));
}

export async function resolveBuiltinViewRulesMerged(viewId, pageScope = "ticket") {
  const normalizedId = String(viewId || "").trim();
  if (!normalizedId) return null;
  const base = BUILTIN_TICKET_VIEWS.find(view => String(view.id) === normalizedId);
  if (!base) return null;
  const overrides = await loadBuiltinOverridesMap(pageScope);
  const merged = mergeBuiltinWithOverride(base, overrides[normalizedId]);
  return merged?.rules ? normalizeRules(merged.rules) : normalizeRules(base.rules);
}

export async function upsertBuiltinOverride(builtinId, pageScope, patch, updatedBy) {
  await ensureBuiltinOverridesTable();
  const id = String(builtinId || "").trim();
  const scope = String(pageScope || "ticket");
  if (!isKnownBuiltinId(id)) {
    const error = new Error("Unknown builtin view");
    error.status = 404;
    throw error;
  }
  const name = patch.name !== undefined
    ? (patch.name ? String(patch.name).trim() : null)
    : undefined;
  const description = patch.description !== undefined
    ? (patch.description ? String(patch.description).trim() : null)
    : undefined;
  const icon = patch.icon !== undefined
    ? (patch.icon ? String(patch.icon).trim() : null)
    : undefined;
  const rules = patch.rules !== undefined ? normalizeRules(patch.rules) : undefined;
  const sortBy = patch.sortBy !== undefined ? String(patch.sortBy || "updated_at") : undefined;
  const sortDirection = patch.sortDirection !== undefined
    ? String(patch.sortDirection || "desc")
    : undefined;

  const existing = await pool.query(
    `SELECT * FROM v_b_ticket_view_builtin_overrides
     WHERE builtin_id = $1 AND page_scope = $2`,
    [id, scope]
  );
  const prev = existing.rows[0] || null;
  const nextName = name !== undefined ? name : prev?.name ?? null;
  const nextDescription = description !== undefined ? description : prev?.description ?? null;
  const nextIcon = icon !== undefined ? icon : prev?.icon ?? null;
  const nextRules = rules !== undefined ? rules : prev?.rules ?? null;
  const nextSortBy = sortBy !== undefined ? sortBy : prev?.sort_by ?? null;
  const nextSortDirection = sortDirection !== undefined ? sortDirection : prev?.sort_direction ?? null;

  const result = await pool.query(
    `INSERT INTO v_b_ticket_view_builtin_overrides
      (builtin_id, page_scope, name, description, icon, rules, sort_by, sort_direction, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, NOW())
     ON CONFLICT (builtin_id, page_scope) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       icon = EXCLUDED.icon,
       rules = EXCLUDED.rules,
       sort_by = EXCLUDED.sort_by,
       sort_direction = EXCLUDED.sort_direction,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      scope,
      nextName,
      nextDescription,
      nextIcon,
      nextRules ? JSON.stringify(nextRules) : null,
      nextSortBy,
      nextSortDirection,
      updatedBy || null
    ]
  );
  const base = BUILTIN_TICKET_VIEWS.find(view => String(view.id) === id);
  return mergeBuiltinWithOverride(base, result.rows[0]);
}

export async function deleteBuiltinOverride(builtinId, pageScope = "ticket") {
  await ensureBuiltinOverridesTable();
  await pool.query(
    `DELETE FROM v_b_ticket_view_builtin_overrides
     WHERE builtin_id = $1 AND page_scope = $2`,
    [String(builtinId), String(pageScope || "ticket")]
  );
}
