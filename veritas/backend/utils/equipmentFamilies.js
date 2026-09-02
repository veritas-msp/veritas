import { pool } from "../database/db.js";
let tablesReady = false;
const FIELD_TYPES = new Set(["text", "textarea", "date", "number", "boolean", "select"]);
const DISPLAY_MODES = new Set(["hexagon", "brick"]);
const TILE_SHAPES = new Set(["hexagon", "rounded", "circle", "pentagon", "octagon"]);
function normalizeTileShape(value) {
  const raw = String(value || "").trim().toLowerCase();
  return TILE_SHAPES.has(raw) ? raw : "hexagon";
}
function slugifyFamilyKey(value) {
  return String(value || "famille").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "famille";
}
function normalizeFieldOptions(raw, fieldType) {
  if (fieldType !== "select") return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map(option => {
      if (typeof option === "string") return option.trim();
      if (option && typeof option === "object") {
        return String(option.label ?? option.value ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 100);
}
function parseStoredFieldOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
async function applyEquipmentFieldOptionsMigration() {
  await pool.query(`
    ALTER TABLE v_b_equipment_family_fields
      ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  await pool.query(`
    ALTER TABLE v_b_equipment_family_extension_fields
      ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'v_b_equipment_family_fields_field_type_check'
          AND conrelid = 'public.v_b_equipment_family_fields'::regclass
      ) THEN
        ALTER TABLE v_b_equipment_family_fields
          DROP CONSTRAINT v_b_equipment_family_fields_field_type_check;
      END IF;
      ALTER TABLE v_b_equipment_family_fields
        ADD CONSTRAINT v_b_equipment_family_fields_field_type_check
          CHECK (field_type IN ('text', 'textarea', 'date', 'number', 'boolean', 'select'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}
function slugifyFieldKey(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 72);
}
function isTruncatedFieldKey(fieldKey, label) {
  const provided = slugifyFieldKey(fieldKey);
  const fromLabel = slugifyFieldKey(label);
  if (!fromLabel) return false;
  if (!provided) return true;
  if (provided === fromLabel) return false;
  return fromLabel.startsWith(provided) && provided.length <= 2 && fromLabel.length > provided.length;
}
function canonicalFieldKeyFromLabel(fieldKey, label) {
  const fromLabel = slugifyFieldKey(label) || "champ";
  if (isTruncatedFieldKey(fieldKey, label)) return fromLabel;
  return slugifyFieldKey(fieldKey) || fromLabel;
}
function normalizeFamilyFields(fields = []) {
  const used = new Set();
  return (Array.isArray(fields) ? fields : []).map((field, index) => {
    const label = String(field.label || "").trim();
    if (!label) return null;
    const base = canonicalFieldKeyFromLabel(field.fieldKey || field.field_key, label);
    let fieldKey = base || "champ";
    let n = 2;
    while (used.has(fieldKey)) {
      fieldKey = `${base}_${n++}`.slice(0, 72);
    }
    used.add(fieldKey);
    const fieldType = FIELD_TYPES.has(field.fieldType || field.field_type) ? field.fieldType || field.field_type : "text";
    return {
      id: field.id == null || field.id === "" ? null : Number(field.id),
      fieldKey,
      label,
      fieldType,
      required: Boolean(field.required),
      options: normalizeFieldOptions(field.options, fieldType),
      displayOrder: Number.isFinite(Number(field.displayOrder ?? field.display_order)) ? Number(field.displayOrder ?? field.display_order) : (index + 1) * 10
    };
  }).filter(Boolean);
}
function mapFieldRow(row) {
  const fieldType = row.field_type;
  return {
    id: row.id,
    familyId: row.family_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType,
    required: Boolean(row.required),
    options: normalizeFieldOptions(parseStoredFieldOptions(row.options), fieldType),
    displayOrder: Number(row.display_order) || 0,
    createdAt: row.created_at
  };
}
function mapFamilyRow(row, fields = []) {
  return {
    id: row.id,
    familyKey: row.family_key,
    label: row.label,
    icon: row.icon || "mdi:devices",
    displayMode: row.display_mode || "hexagon",
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order) || 0,
    honeycombQ: row.honeycomb_q == null ? null : Number(row.honeycomb_q),
    honeycombR: row.honeycomb_r == null ? null : Number(row.honeycomb_r),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fields: fields.map(mapFieldRow).sort((a, b) => a.displayOrder - b.displayOrder),
    itemCount: Number(row.item_count) || 0
  };
}
export async function ensureEquipmentFamilyTables() {
  if (tablesReady) return;
  await applyEquipmentFieldOptionsMigration();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_equipment_family_definitions (
      id SERIAL PRIMARY KEY,
      family_key VARCHAR(80) NOT NULL UNIQUE,
      label VARCHAR(120) NOT NULL,
      icon VARCHAR(120) NOT NULL DEFAULT 'mdi:devices',
      display_mode VARCHAR(20) NOT NULL DEFAULT 'hexagon',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      honeycomb_q INTEGER,
      honeycomb_r INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_equipment_family_fields (
      id SERIAL PRIMARY KEY,
      family_id INTEGER NOT NULL REFERENCES v_b_equipment_family_definitions(id) ON DELETE CASCADE,
      field_key VARCHAR(80) NOT NULL,
      label VARCHAR(120) NOT NULL,
      field_type VARCHAR(20) NOT NULL DEFAULT 'text',
      required BOOLEAN NOT NULL DEFAULT FALSE,
      display_order INTEGER NOT NULL DEFAULT 100,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (family_id, field_key)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_clients_m_custom_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id INTEGER NOT NULL,
      family_key VARCHAR(80) NOT NULL,
      item_key TEXT,
      name TEXT,
      data JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tablesReady = true;
}
async function loadFieldsByFamilyIds(familyIds) {
  if (!familyIds.length) return new Map();
  const result = await pool.query(`SELECT *
     FROM v_b_equipment_family_fields
     WHERE family_id = ANY($1::int[])
     ORDER BY display_order ASC, id ASC`, [familyIds]);
  const map = new Map();
  result.rows.forEach(row => {
    if (!map.has(row.family_id)) map.set(row.family_id, []);
    map.get(row.family_id).push(row);
  });
  return map;
}
export async function listEquipmentFamilies({
  includeDisabled = false,
  includeUsage = false
} = {}) {
  await ensureEquipmentFamilyTables();
  const filters = includeDisabled ? "" : "WHERE d.enabled IS TRUE";
  const usageSelect = includeUsage ? `, (
         SELECT COUNT(*)::int
         FROM v_b_clients_m_custom_equipment ce
         WHERE ce.family_key = d.family_key AND ce.is_active IS NOT FALSE
       ) AS item_count` : ", 0 AS item_count";
  const result = await pool.query(`SELECT d.*${usageSelect}
     FROM v_b_equipment_family_definitions d
     ${filters}
     ORDER BY d.sort_order ASC, d.label ASC`);
  let fieldsMap = await loadFieldsByFamilyIds(result.rows.map(row => row.id));
  const familiesNeedingRepair = result.rows.filter(row => {
    const fields = (fieldsMap.get(row.id) || []).map(mapFieldRow);
    return fields.some(field => isTruncatedFieldKey(field.fieldKey, field.label));
  });
  if (familiesNeedingRepair.length) {
    for (const family of familiesNeedingRepair) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await replaceFamilyFields(client, family.id, (fieldsMap.get(family.id) || []).map(mapFieldRow), family.family_key);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("[equipment-families] field key repair failed", family.family_key, error);
      } finally {
        client.release();
      }
    }
    fieldsMap = await loadFieldsByFamilyIds(result.rows.map(row => row.id));
  }
  return result.rows.map(row => mapFamilyRow(row, fieldsMap.get(row.id) || []));
}
export async function getEquipmentFamilyByKey(familyKey) {
  await ensureEquipmentFamilyTables();
  const result = await pool.query(`SELECT *
     FROM v_b_equipment_family_definitions
     WHERE family_key = $1
     LIMIT 1`, [familyKey]);
  if (!result.rows.length) return null;
  const fieldsMap = await loadFieldsByFamilyIds([result.rows[0].id]);
  return mapFamilyRow(result.rows[0], fieldsMap.get(result.rows[0].id) || []);
}
async function assertUniqueFamilyKey(familyKey, excludeId = null) {
  const params = [familyKey];
  let query = `SELECT id FROM v_b_equipment_family_definitions WHERE family_key = $1`;
  if (excludeId) {
    query += " AND id <> $2";
    params.push(excludeId);
  }
  const existing = await pool.query(query, params);
  if (existing.rows.length) {
    const err = new Error("This family key already exists.");
    err.status = 409;
    throw err;
  }
}
async function remapCustomEquipmentDataKeys(client, familyKey, keyMap) {
  const entries = Object.entries(keyMap || {}).filter(([from, to]) => from && to && from !== to);
  if (!familyKey || !entries.length) return;
  const result = await client.query(
    `SELECT id, data FROM v_b_clients_m_custom_equipment WHERE family_key = $1`,
    [familyKey]
  );
  for (const row of result.rows) {
    const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? { ...row.data } : {};
    let changed = false;
    for (const [from, to] of entries) {
      if (!Object.prototype.hasOwnProperty.call(data, from)) continue;
      if (!Object.prototype.hasOwnProperty.call(data, to) || data[to] == null || data[to] === "") {
        data[to] = data[from];
      }
      delete data[from];
      changed = true;
    }
    if (!changed) continue;
    await client.query(
      `UPDATE v_b_clients_m_custom_equipment SET data = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, JSON.stringify(data)]
    );
  }
}
async function replaceFamilyFields(client, familyId, fields = [], familyKey = null) {
  const current = await client.query(
    `SELECT id, field_key FROM v_b_equipment_family_fields WHERE family_id = $1 ORDER BY display_order ASC, id ASC`,
    [familyId]
  );
  const currentById = new Map(current.rows.map(row => [Number(row.id), row.field_key]));
  const currentByIndex = current.rows.map(row => row.field_key);
  const normalized = normalizeFamilyFields(fields);
  const hasIds = normalized.some(field => Number.isInteger(field.id) && currentById.has(field.id));
  const keyMap = {};
  normalized.forEach((field, index) => {
    const oldKey = hasIds && Number.isInteger(field.id) && currentById.has(field.id)
      ? currentById.get(field.id)
      : !hasIds
        ? currentByIndex[index]
        : null;
    if (oldKey && oldKey !== field.fieldKey) {
      keyMap[oldKey] = field.fieldKey;
    }
  });
  await client.query(`DELETE FROM v_b_equipment_family_fields WHERE family_id = $1`, [familyId]);
  for (const field of normalized) {
    await client.query(`INSERT INTO v_b_equipment_family_fields
         (family_id, field_key, label, field_type, required, display_order, options)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, [
      familyId,
      field.fieldKey,
      field.label,
      field.fieldType,
      field.required,
      field.displayOrder,
      JSON.stringify(field.options || [])
    ]);
  }
  await remapCustomEquipmentDataKeys(client, familyKey, keyMap);
  return normalized;
}
export async function createEquipmentFamily(payload = {}) {
  await ensureEquipmentFamilyTables();
  const label = String(payload.label || "").trim();
  if (!label) {
    const err = new Error("The family label is required.");
    err.status = 400;
    throw err;
  }
  const familyKey = slugifyFamilyKey(payload.familyKey || payload.family_key || label);
  await assertUniqueFamilyKey(familyKey);
  const displayMode = DISPLAY_MODES.has(payload.displayMode) ? payload.displayMode : "hexagon";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(`INSERT INTO v_b_equipment_family_definitions
         (family_key, label, icon, display_mode, enabled, sort_order, honeycomb_q, honeycomb_r)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [familyKey, label, String(payload.icon || "mdi:devices").trim() || "mdi:devices", displayMode, payload.enabled !== false, Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 100, payload.honeycombQ == null || payload.honeycombQ === "" ? null : Number(payload.honeycombQ), payload.honeycombR == null || payload.honeycombR === "" ? null : Number(payload.honeycombR)]);
    await replaceFamilyFields(client, inserted.rows[0].id, payload.fields, familyKey);
    await client.query("COMMIT");
    const fieldsMap = await loadFieldsByFamilyIds([inserted.rows[0].id]);
    return mapFamilyRow(inserted.rows[0], fieldsMap.get(inserted.rows[0].id) || []);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function updateEquipmentFamily(id, payload = {}) {
  await ensureEquipmentFamilyTables();
  const existing = await pool.query(`SELECT * FROM v_b_equipment_family_definitions WHERE id = $1 LIMIT 1`, [id]);
  if (!existing.rows.length) {
    const err = new Error("Family not found.");
    err.status = 404;
    throw err;
  }
  const current = existing.rows[0];
  const nextLabel = payload.label !== undefined ? String(payload.label).trim() : current.label;
  if (!nextLabel) {
    const err = new Error("The family label is required.");
    err.status = 400;
    throw err;
  }
  const nextFamilyKey = payload.familyKey !== undefined ? slugifyFamilyKey(payload.familyKey) : current.family_key;
  if (nextFamilyKey !== current.family_key) {
    await assertUniqueFamilyKey(nextFamilyKey, id);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(`UPDATE v_b_equipment_family_definitions
       SET family_key = $2,
           label = $3,
           icon = COALESCE($4, icon),
           display_mode = COALESCE($5, display_mode),
           enabled = COALESCE($6, enabled),
           sort_order = COALESCE($7, sort_order),
           honeycomb_q = $8,
           honeycomb_r = $9,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`, [id, nextFamilyKey, nextLabel, payload.icon !== undefined ? String(payload.icon || "mdi:devices").trim() : null, payload.displayMode !== undefined && DISPLAY_MODES.has(payload.displayMode) ? payload.displayMode : null, payload.enabled !== undefined ? Boolean(payload.enabled) : null, payload.sortOrder !== undefined ? Number(payload.sortOrder) : null, payload.honeycombQ !== undefined ? payload.honeycombQ == null || payload.honeycombQ === "" ? null : Number(payload.honeycombQ) : current.honeycomb_q, payload.honeycombR !== undefined ? payload.honeycombR == null || payload.honeycombR === "" ? null : Number(payload.honeycombR) : current.honeycomb_r]);
    if (payload.fields !== undefined) {
      await replaceFamilyFields(client, id, payload.fields, nextFamilyKey);
    }
    if (nextFamilyKey !== current.family_key) {
      await client.query(`UPDATE v_b_clients_m_custom_equipment
         SET family_key = $2, updated_at = NOW()
         WHERE family_key = $1`, [current.family_key, nextFamilyKey]);
    }
    await client.query("COMMIT");
    const fieldsMap = await loadFieldsByFamilyIds([id]);
    return mapFamilyRow(updated.rows[0], fieldsMap.get(id) || []);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function deleteEquipmentFamily(id) {
  await ensureEquipmentFamilyTables();
  const result = await pool.query(`DELETE FROM v_b_equipment_family_definitions WHERE id = $1 RETURNING family_key`, [id]);
  if (!result.rows.length) {
    const err = new Error("Family not found.");
    err.status = 404;
    throw err;
  }
  return {
    familyKey: result.rows[0].family_key
  };
}
const INACTIVE_FLAG_KEYS = new Set(["false", "0", "no", "non", "off", "inactive", "inactif", "disabled"]);
const ACTIVE_FLAG_KEYS = new Set(["true", "1", "yes", "oui", "on", "active", "actif", "enabled"]);

export function parseEquipmentActiveFlag(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const key = String(value).trim().toLowerCase();
    if (INACTIVE_FLAG_KEYS.has(key)) return false;
    if (ACTIVE_FLAG_KEYS.has(key)) return true;
  }
  return undefined;
}

function resolveCustomIsActive(payload = {}, fallback = true) {
  const fields = payload.fields && typeof payload.fields === "object" ? payload.fields : payload;
  const parsed = parseEquipmentActiveFlag(
    payload.is_active,
    payload.isActive,
    payload.actif,
    payload.active,
    fields?.is_active,
    fields?.isActive,
    fields?.actif,
    fields?.active
  );
  return parsed !== undefined ? parsed : fallback;
}

export function mapCustomEquipmentRow(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  const name = String(data.name || row.name || row.item_key || "").trim();
  const fromJson = parseEquipmentActiveFlag(data.actif, data.is_active, data.active, data.isActive);
  const isActive = fromJson !== undefined ? fromJson : parseEquipmentActiveFlag(row.is_active) !== false;
  return {
    id: row.id,
    clientId: row.client_id,
    familyKey: row.family_key,
    name,
    data,
    fields: {
      ...data,
      name
    },
    isActive,
    is_active: isActive,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
export async function listClientCustomEquipment(clientId, familyKey = null) {
  await ensureEquipmentFamilyTables();
  const params = [clientId];
  let query = `
    SELECT *
    FROM v_b_clients_m_custom_equipment
    WHERE client_id = $1
  `;
  if (familyKey) {
    query += " AND family_key = $2";
    params.push(familyKey);
  }
  query += " ORDER BY name ASC NULLS LAST, created_at ASC";
  const result = await pool.query(query, params);
  return result.rows.map(mapCustomEquipmentRow);
}
export async function createClientCustomEquipment(clientId, familyKey, payload = {}) {
  await ensureEquipmentFamilyTables();
  const family = await getEquipmentFamilyByKey(familyKey);
  if (!family || !family.enabled) {
    const err = new Error("Equipment family not found or disabled.");
    err.status = 404;
    throw err;
  }
  const name = String(payload.name || "").trim();
  if (!name) {
    const err = new Error("The equipment name is required.");
    err.status = 400;
    throw err;
  }
  const data = {
    ...(payload.fields && typeof payload.fields === "object" ? payload.fields : payload),
    name
  };
  delete data.name;
  const isActive = resolveCustomIsActive(payload, true);
  delete data.actif;
  delete data.active;
  delete data.is_active;
  delete data.isActive;
  const storedData = {
    name,
    ...data,
    actif: isActive
  };
  const result = await pool.query(`INSERT INTO v_b_clients_m_custom_equipment
       (client_id, family_key, item_key, name, data, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [clientId, familyKey, name, name, JSON.stringify(storedData), isActive]);
  return mapCustomEquipmentRow(result.rows[0]);
}
export async function updateClientCustomEquipment(clientId, familyKey, itemId, payload = {}) {
  await ensureEquipmentFamilyTables();
  const existing = await pool.query(`SELECT *
     FROM v_b_clients_m_custom_equipment
     WHERE id = $1 AND client_id = $2 AND family_key = $3
     LIMIT 1`, [itemId, clientId, familyKey]);
  if (!existing.rows.length) {
    const err = new Error("Equipment not found.");
    err.status = 404;
    throw err;
  }
  const current = mapCustomEquipmentRow(existing.rows[0]);
  const name = payload.name !== undefined ? String(payload.name).trim() : current.name;
  if (!name) {
    const err = new Error("The equipment name is required.");
    err.status = 400;
    throw err;
  }
  const incomingFields = payload.fields && typeof payload.fields === "object" ? payload.fields : payload;
  const isActive = resolveCustomIsActive(payload, current.isActive !== false);
  const nextData = {
    ...current.data,
    ...incomingFields,
    name,
    actif: isActive
  };
  delete nextData.id;
  delete nextData.clientId;
  delete nextData.familyKey;
  delete nextData.is_active;
  delete nextData.isActive;
  delete nextData.active;
  const result = await pool.query(`UPDATE v_b_clients_m_custom_equipment
     SET name = $4,
         item_key = $4,
         data = $5,
         is_active = $6,
         updated_at = NOW()
     WHERE id = $1 AND client_id = $2 AND family_key = $3
     RETURNING *`, [itemId, clientId, familyKey, name, JSON.stringify(nextData), isActive]);
  return {
    item: mapCustomEquipmentRow(result.rows[0]),
    previous: current
  };
}
export const SYSTEM_FAMILY_KEYS = [
  "Internet",
  "Firewalls",
  "Routeur",
  "Servers",
  "Storage",
  "Ordinateurs",
  "Switch",
  "BorneWifi",
  "TOIP",
  "Alimentation"
];

const SYSTEM_FAMILY_ALIASES = {
  Serveurs: "Servers",
  Server: "Servers",
  servers: "Servers",
  NAS: "Storage",
  Stockage: "Storage",
  stockage: "Storage",
  Firewall: "Firewalls",
  firewall: "Firewalls",
  BorneWiFi: "BorneWifi",
  Wifi: "BorneWifi",
  WiFi: "BorneWifi"
};

export function canonicalizeSystemFamilyKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (SYSTEM_FAMILY_ALIASES[raw]) return SYSTEM_FAMILY_ALIASES[raw];
  const hit = SYSTEM_FAMILY_KEYS.find(key => key.toLowerCase() === raw.toLowerCase());
  return hit || null;
}

function mapExtensionFieldRow(row) {
  const fieldType = row.field_type;
  return {
    id: row.id,
    familyKey: row.family_key,
    fieldKey: row.field_key,
    label: row.label,
    fieldType,
    required: Boolean(row.required),
    options: normalizeFieldOptions(parseStoredFieldOptions(row.options), fieldType),
    displayOrder: Number(row.display_order) || 0,
    createdAt: row.created_at
  };
}

export async function ensureSystemFamilyExtensionTable() {
  await applyEquipmentFieldOptionsMigration();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_equipment_family_extension_fields (
      id SERIAL PRIMARY KEY,
      family_key VARCHAR(80) NOT NULL,
      field_key VARCHAR(80) NOT NULL,
      label VARCHAR(120) NOT NULL,
      field_type VARCHAR(20) NOT NULL DEFAULT 'text',
      required BOOLEAN NOT NULL DEFAULT FALSE,
      display_order INTEGER NOT NULL DEFAULT 100,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (family_key, field_key)
    )
  `);
}

export async function listSystemFamilyExtensions(familyKey = null) {
  await ensureSystemFamilyExtensionTable();
  const canonical = familyKey ? canonicalizeSystemFamilyKey(familyKey) : null;
  if (familyKey && !canonical) return [];
  const result = canonical
    ? await pool.query(
      `SELECT * FROM v_b_equipment_family_extension_fields
       WHERE family_key = $1
       ORDER BY display_order ASC, id ASC`,
      [canonical]
    )
    : await pool.query(
      `SELECT * FROM v_b_equipment_family_extension_fields
       ORDER BY family_key ASC, display_order ASC, id ASC`
    );
  return result.rows.map(mapExtensionFieldRow);
}

export async function listSystemFamilyExtensionsByKey() {
  const fields = await listSystemFamilyExtensions();
  const map = {};
  SYSTEM_FAMILY_KEYS.forEach(key => {
    map[key] = [];
  });
  fields.forEach(field => {
    if (!map[field.familyKey]) map[field.familyKey] = [];
    map[field.familyKey].push(field);
  });
  return map;
}

const RESERVED_SYSTEM_EXTENSION_KEYS = new Set([
  "nom", "name", "ip", "type", "site", "location", "emplacement",
  "marque", "modele", "numeroSerie", "adresseMac", "commentaire",
  "is_active", "isActive", "actif", "active", "data"
]);

export async function ensureEquipmentMapStyleTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_equipment_map_style (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      tile_shape VARCHAR(20) NOT NULL DEFAULT 'hexagon',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    INSERT INTO v_b_equipment_map_style (id, tile_shape)
    VALUES (1, 'hexagon')
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function getEquipmentMapStyle() {
  await ensureEquipmentMapStyleTable();
  const result = await pool.query(`SELECT tile_shape FROM v_b_equipment_map_style WHERE id = 1`);
  return { tileShape: normalizeTileShape(result.rows[0]?.tile_shape) };
}

export async function upsertEquipmentMapStyle(tileShape) {
  const shape = normalizeTileShape(tileShape);
  await ensureEquipmentMapStyleTable();
  await pool.query(
    `INSERT INTO v_b_equipment_map_style (id, tile_shape, updated_at)
     VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET
       tile_shape = EXCLUDED.tile_shape,
       updated_at = NOW()`,
    [shape]
  );
  return { tileShape: shape };
}

export async function ensureSystemFamilyLayoutTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_equipment_family_layout (
      family_key VARCHAR(80) PRIMARY KEY,
      honeycomb_q INTEGER,
      honeycomb_r INTEGER,
      display_mode VARCHAR(20) NOT NULL DEFAULT 'hexagon',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function mapLayoutRow(row) {
  return {
    familyKey: row.family_key,
    honeycombQ: row.honeycomb_q == null ? null : Number(row.honeycomb_q),
    honeycombR: row.honeycomb_r == null ? null : Number(row.honeycomb_r),
    displayMode: DISPLAY_MODES.has(row.display_mode) ? row.display_mode : "hexagon"
  };
}

export async function listSystemFamilyLayouts() {
  await ensureSystemFamilyLayoutTable();
  const result = await pool.query(
    `SELECT * FROM v_b_equipment_family_layout ORDER BY family_key ASC`
  );
  const map = {};
  SYSTEM_FAMILY_KEYS.forEach(key => {
    map[key] = null;
  });
  (result.rows || []).forEach(row => {
    const canonical = canonicalizeSystemFamilyKey(row.family_key);
    if (!canonical) return;
    map[canonical] = mapLayoutRow({ ...row, family_key: canonical });
  });
  return map;
}

export async function upsertSystemFamilyLayout(familyKey, layout = {}) {
  const canonical = canonicalizeSystemFamilyKey(familyKey);
  if (!canonical) {
    const err = new Error("Unknown built-in family.");
    err.status = 400;
    throw err;
  }
  await ensureSystemFamilyLayoutTable();
  const honeycombQ = layout.honeycombQ === "" || layout.honeycombQ == null ? null : Number(layout.honeycombQ);
  const honeycombR = layout.honeycombR === "" || layout.honeycombR == null ? null : Number(layout.honeycombR);
  const displayMode = DISPLAY_MODES.has(layout.displayMode) ? layout.displayMode : "hexagon";
  const result = await pool.query(
    `INSERT INTO v_b_equipment_family_layout (family_key, honeycomb_q, honeycomb_r, display_mode, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (family_key) DO UPDATE SET
       honeycomb_q = EXCLUDED.honeycomb_q,
       honeycomb_r = EXCLUDED.honeycomb_r,
       display_mode = EXCLUDED.display_mode,
       updated_at = NOW()
     RETURNING *`,
    [
      canonical,
      Number.isFinite(honeycombQ) ? honeycombQ : null,
      Number.isFinite(honeycombR) ? honeycombR : null,
      displayMode
    ]
  );
  return mapLayoutRow(result.rows[0]);
}

export async function upsertSystemFamilyLayouts(items = []) {
  const map = {};
  for (const item of Array.isArray(items) ? items : []) {
    const canonical = canonicalizeSystemFamilyKey(item.familyKey || item.family_key);
    if (!canonical) continue;
    map[canonical] = await upsertSystemFamilyLayout(canonical, item);
  }
  return map;
}

export async function replaceSystemFamilyExtensions(familyKey, fields, layout = null) {
  const canonical = canonicalizeSystemFamilyKey(familyKey);
  if (!canonical) {
    const err = new Error("Unknown built-in family.");
    err.status = 400;
    throw err;
  }
  if (Array.isArray(fields)) {
    await ensureSystemFamilyExtensionTable();
    const used = new Set();
    const normalized = normalizeFamilyFields(fields).map(field => {
      let fieldKey = field.fieldKey;
      if (RESERVED_SYSTEM_EXTENSION_KEYS.has(fieldKey)) fieldKey = `extra_${fieldKey}`;
      let unique = fieldKey;
      let n = 2;
      while (used.has(unique)) unique = `${fieldKey}_${n++}`.slice(0, 72);
      used.add(unique);
      return {
        ...field,
        fieldKey: unique
      };
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM v_b_equipment_family_extension_fields WHERE family_key = $1`,
        [canonical]
      );
      for (const field of normalized) {
        await client.query(
          `INSERT INTO v_b_equipment_family_extension_fields
             (family_key, field_key, label, field_type, required, display_order, options)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            canonical,
            field.fieldKey,
            field.label,
            field.fieldType,
            field.required,
            field.displayOrder,
            JSON.stringify(field.options || [])
          ]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  let savedLayout = null;
  if (layout && typeof layout === "object") {
    savedLayout = await upsertSystemFamilyLayout(canonical, layout);
  }
  return {
    fields: await listSystemFamilyExtensions(canonical),
    layout: savedLayout
  };
}

export async function deleteClientCustomEquipment(clientId, familyKey, itemId) {
  await ensureEquipmentFamilyTables();
  const result = await pool.query(`DELETE FROM v_b_clients_m_custom_equipment
     WHERE id = $1 AND client_id = $2 AND family_key = $3
     RETURNING *`, [itemId, clientId, familyKey]);
  if (!result.rows.length) {
    const err = new Error("Equipment not found.");
    err.status = 404;
    throw err;
  }
  return mapCustomEquipmentRow(result.rows[0]);
}
