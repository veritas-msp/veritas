import { pool } from "../database/db.js";

export const DEFAULT_PLANNING_EVENT_TYPES = [{
  type_key: "intervention",
  label: "Intervention",
  icon: "mdi:wrench",
  kpi_tone: "blue",
  sort_order: 10,
  form_selectable: true
}, {
  type_key: "presentation",
  label: "Présentation",
  icon: "mdi:presentation",
  kpi_tone: "violet",
  sort_order: 20,
  form_selectable: true
}, {
  type_key: "maintenance_preventive",
  label: "Préventive",
  icon: "mdi:shield-check",
  kpi_tone: "amber",
  sort_order: 30,
  form_selectable: true
}, {
  type_key: "maintenance",
  label: "Maintenance",
  icon: "mdi:cog",
  kpi_tone: "orange",
  sort_order: 40,
  form_selectable: true
}, {
  type_key: "mise_a_jour",
  label: "Mise à jour",
  icon: "mdi:update",
  kpi_tone: "blue",
  sort_order: 50,
  form_selectable: true
}, {
  type_key: "conge",
  label: "Congé",
  icon: "mdi:beach",
  kpi_tone: "teal",
  sort_order: 60,
  form_selectable: true
}, {
  type_key: "integration_monitoring",
  label: "Monitoring",
  icon: "mdi:chart-line-variant",
  kpi_tone: "cyan",
  sort_order: 70,
  form_selectable: true
}, {
  type_key: "campagne",
  label: "Campagne",
  icon: "mdi:shield-lock",
  kpi_tone: "violet",
  sort_order: 80,
  form_selectable: false
}, {
  type_key: "other",
  label: "Autre",
  icon: "mdi:calendar-blank",
  kpi_tone: "orange",
  sort_order: 90,
  form_selectable: true
}];

export const KPI_TONES = new Set(["blue", "violet", "amber", "orange", "teal", "cyan"]);

let tableReady = false;

function slugifyTypeKey(value) {
  return String(value || "type").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "type";
}

function normalizeKpiTone(value, fallback = "blue") {
  const tone = String(value || "").trim().toLowerCase();
  return KPI_TONES.has(tone) ? tone : fallback;
}

function mapRow(row, {
  includeUsage = false
} = {}) {
  const mapped = {
    id: row.id,
    typeKey: row.type_key,
    label: row.label,
    icon: row.icon || "mdi:calendar-blank",
    kpiTone: normalizeKpiTone(row.kpi_tone),
    enabled: Boolean(row.enabled),
    formSelectable: row.form_selectable !== false,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (includeUsage) {
    mapped.eventUsageCount = Number(row.event_usage_count) || 0;
  }
  return mapped;
}

export function toPlanningTypeUi(row) {
  return {
    value: row.typeKey,
    label: row.label,
    icon: row.icon,
    kpiTone: row.kpiTone,
    formSelectable: row.formSelectable !== false,
    enabled: row.enabled !== false
  };
}

export async function ensurePlanningEventTypesTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_planning_event_types (
      id SERIAL PRIMARY KEY,
      type_key VARCHAR(64) NOT NULL UNIQUE,
      label VARCHAR(120) NOT NULL,
      icon VARCHAR(120) NOT NULL DEFAULT 'mdi:calendar-blank',
      kpi_tone VARCHAR(20) NOT NULL DEFAULT 'blue',
      enabled BOOLEAN NOT NULL DEFAULT true,
      form_selectable BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_planning_event_types_enabled_sort
      ON v_b_planning_event_types(enabled, sort_order);
  `);
  tableReady = true;
}

async function seedDefaultsIfEmpty() {
  const count = await pool.query(`SELECT COUNT(*)::int AS count FROM v_b_planning_event_types`);
  if (Number(count.rows[0]?.count) > 0) return;
  for (const type of DEFAULT_PLANNING_EVENT_TYPES) {
    await pool.query(`INSERT INTO v_b_planning_event_types
        (type_key, label, icon, kpi_tone, enabled, form_selectable, sort_order)
       VALUES ($1, $2, $3, $4, true, $5, $6)`, [type.type_key, type.label, type.icon, type.kpi_tone, type.form_selectable !== false, type.sort_order]);
  }
}

export async function listPlanningEventTypes({
  includeDisabled = false,
  includeUsage = false
} = {}) {
  await ensurePlanningEventTypesTable();
  await seedDefaultsIfEmpty();
  const conditions = [];
  if (!includeDisabled) conditions.push("t.enabled = true");
  const usageSelect = includeUsage ? `, (
         SELECT COUNT(*)::int
         FROM v_b_events e
         WHERE e.type = t.type_key
       ) AS event_usage_count` : "";
  const result = await pool.query(`SELECT t.id, t.type_key, t.label, t.icon, t.kpi_tone, t.enabled,
            t.form_selectable, t.sort_order, t.created_at, t.updated_at${usageSelect}
     FROM v_b_planning_event_types t
     ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY t.sort_order ASC, t.id ASC`);
  return result.rows.map(row => mapRow(row, {
    includeUsage
  }));
}

export async function getPlanningEventTypeKeys({
  enabledOnly = false
} = {}) {
  const types = await listPlanningEventTypes({
    includeDisabled: !enabledOnly
  });
  return new Set(types.map(type => type.typeKey));
}

export async function isValidPlanningEventType(typeKey, {
  enabledOnly = true
} = {}) {
  const key = String(typeKey || "").trim();
  if (!key) return false;
  const keys = await getPlanningEventTypeKeys({
    enabledOnly
  });
  return keys.has(key);
}

export async function createPlanningEventType(payload) {
  await ensurePlanningEventTypesTable();
  await seedDefaultsIfEmpty();
  const label = String(payload.label || "").trim();
  if (!label) {
    const err = new Error("Label is required.");
    err.status = 400;
    throw err;
  }
  let typeKey = slugifyTypeKey(payload.typeKey || label);
  const exists = await pool.query(`SELECT id FROM v_b_planning_event_types WHERE type_key = $1`, [typeKey]);
  if (exists.rows.length > 0) {
    typeKey = `${typeKey}_${Date.now().toString(36)}`;
  }
  const icon = String(payload.icon || "mdi:calendar-blank").trim() || "mdi:calendar-blank";
  const kpiTone = normalizeKpiTone(payload.kpiTone);
  const sortOrder = Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : (await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM v_b_planning_event_types`)).rows[0].next;
  const formSelectable = payload.formSelectable !== false;
  const result = await pool.query(`INSERT INTO v_b_planning_event_types
      (type_key, label, icon, kpi_tone, enabled, form_selectable, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, type_key, label, icon, kpi_tone, enabled, form_selectable, sort_order, created_at, updated_at`, [typeKey, label, icon, kpiTone, payload.enabled !== false, formSelectable, sortOrder]);
  return mapRow(result.rows[0]);
}

export async function updatePlanningEventType(id, payload) {
  await ensurePlanningEventTypesTable();
  const typeId = Number(id);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    const err = new Error("Event type not found.");
    err.status = 404;
    throw err;
  }
  const existing = await pool.query(`SELECT * FROM v_b_planning_event_types WHERE id = $1`, [typeId]);
  if (!existing.rows[0]) {
    const err = new Error("Event type not found.");
    err.status = 404;
    throw err;
  }
  const row = existing.rows[0];
  const label = payload.label !== undefined ? String(payload.label).trim() : row.label;
  if (!label) {
    const err = new Error("Label is required.");
    err.status = 400;
    throw err;
  }
  const result = await pool.query(`UPDATE v_b_planning_event_types
     SET label = $1,
         icon = $2,
         kpi_tone = $3,
         enabled = $4,
         form_selectable = $5,
         sort_order = $6,
         updated_at = NOW()
     WHERE id = $7
     RETURNING id, type_key, label, icon, kpi_tone, enabled, form_selectable, sort_order, created_at, updated_at`, [label, payload.icon !== undefined ? String(payload.icon).trim() || "mdi:calendar-blank" : row.icon, payload.kpiTone !== undefined ? normalizeKpiTone(payload.kpiTone, row.kpi_tone) : normalizeKpiTone(row.kpi_tone), payload.enabled !== undefined ? Boolean(payload.enabled) : row.enabled, payload.formSelectable !== undefined ? Boolean(payload.formSelectable) : row.form_selectable !== false, payload.sortOrder !== undefined ? Number(payload.sortOrder) : row.sort_order, typeId]);
  return mapRow(result.rows[0]);
}

export async function deletePlanningEventType(id) {
  await ensurePlanningEventTypesTable();
  const typeId = Number(id);
  const existing = await pool.query(`SELECT id, type_key FROM v_b_planning_event_types WHERE id = $1`, [typeId]);
  if (!existing.rows[0]) {
    const err = new Error("Event type not found.");
    err.status = 404;
    throw err;
  }
  const typeKey = existing.rows[0].type_key;
  const usage = await pool.query(`SELECT COUNT(*)::int AS count FROM v_b_events WHERE type = $1`, [typeKey]);
  const usageCount = Number(usage.rows[0]?.count) || 0;
  if (usageCount > 0) {
    const err = new Error(usageCount === 1 ? "This type is used by 1 event and cannot be deleted." : `This type is used by ${usageCount} events and cannot be deleted.`);
    err.status = 409;
    err.usageCount = usageCount;
    throw err;
  }
  if (typeKey === "campagne") {
    const err = new Error("The campaign type is managed by the cybersecurity module and cannot be deleted.");
    err.status = 409;
    throw err;
  }
  const result = await pool.query(`DELETE FROM v_b_planning_event_types WHERE id = $1 RETURNING id`, [typeId]);
  if (!result.rows[0]) {
    const err = new Error("Event type not found.");
    err.status = 404;
    throw err;
  }
  return {
    success: true
  };
}

export async function resetPlanningEventTypes() {
  await ensurePlanningEventTypesTable();
  await pool.query(`DELETE FROM v_b_planning_event_types`);
  await seedDefaultsIfEmpty();
  return listPlanningEventTypes({
    includeDisabled: true,
    includeUsage: true
  });
}
