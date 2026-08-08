import { pool } from "../database/db.js";

/** Hardware families for admin equipment purge (lean list). */
export const PURGE_HARDWARE_FAMILIES = [
  { family: "servers", type: "Serveurs", table: "v_b_clients_m_servers" },
  { family: "internet", type: "Internet", table: "v_b_clients_m_internet" },
  { family: "firewall", type: "Firewalls", table: "v_b_clients_m_firewall" },
  { family: "nas", type: "NAS", table: "v_b_clients_m_stockage" },
  { family: "switch", type: "Switch", table: "v_b_clients_m_switch" },
  { family: "wifi", type: "BorneWifi", table: "v_b_clients_m_wifi" },
  { family: "alimentation", type: "Alimentation", table: "v_b_clients_m_alimentation" },
  { family: "routeur", type: "Routeur", table: "v_b_clients_m_routeur" },
  { family: "toip", type: "TOIP", table: "v_b_clients_m_toip" },
  { family: "ordinateurs", type: "Ordinateurs", table: "v_b_clients_m_ordinateurs" }
];

const MODULE_FLAG_LABELS = [
  "Internet",
  "Firewalls",
  "Firewall",
  "Serveurs",
  "Stockage",
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP",
  "Sauvegarde",
  "Ordinateurs"
];

const MODULE_FLAG_SQL_LIST = MODULE_FLAG_LABELS.map(label => `'${label.replace(/'/g, "''")}'`).join(", ");

const EXCLUDE_MODULE_FLAG_ROWS = `
  AND NOT (
    COALESCE(e.item_key, '') IN (${MODULE_FLAG_SQL_LIST})
    OR COALESCE(e.name, '') IN (${MODULE_FLAG_SQL_LIST})
  )
`;

function buildLeanSelect(table) {
  return `
    SELECT
      e.id,
      e.client_id,
      c.name AS client_name,
      e.name AS row_name,
      e.item_key,
      e.is_active,
      COALESCE(
        NULLIF(TRIM(e.data->>'nom'), ''),
        NULLIF(TRIM(e.data->>'name'), ''),
        NULLIF(TRIM(e.name), ''),
        NULLIF(TRIM(e.item_key), ''),
        '—'
      ) AS display_name,
      COALESCE(NULLIF(TRIM(e.data->>'ip'), ''), '') AS ip,
      COALESCE(
        NULLIF(TRIM(e.data->>'numeroSerie'), ''),
        NULLIF(TRIM(e.data->>'serial'), ''),
        NULLIF(TRIM(e.data->>'sn'), ''),
        ''
      ) AS serial,
      COALESCE(
        NULLIF(TRIM(e.data->>'site'), ''),
        NULLIF(TRIM(e.data->>'location'), ''),
        NULLIF(TRIM(e.data->>'emplacement'), ''),
        ''
      ) AS location,
      COALESCE(
        NULLIF(TRIM(e.data->>'modele'), ''),
        NULLIF(TRIM(e.data->>'model'), ''),
        ''
      ) AS model,
      COALESCE(
        NULLIF(TRIM(e.data->>'adresseMac'), ''),
        NULLIF(TRIM(e.data->>'mac'), ''),
        ''
      ) AS mac,
      COALESCE(
        NULLIF(TRIM(e.data->>'marque'), ''),
        NULLIF(TRIM(e.data->>'fabricant'), ''),
        NULLIF(TRIM(e.data->>'manufacturer'), ''),
        ''
      ) AS manufacturer
    FROM ${table} e
    INNER JOIN v_b_clients c ON c.id = e.client_id
    WHERE e.client_id IS NOT NULL
      ${EXCLUDE_MODULE_FLAG_ROWS}
  `;
}

function mapLeanRow(row, familyMeta) {
  const dbId = String(row.id);
  const clientId = row.client_id;
  const name = row.display_name || row.row_name || row.item_key || "—";
  return {
    id: `${clientId}:${dbId}`,
    dbId,
    clientId,
    clientName: row.client_name || String(clientId),
    type: familyMeta.type,
    family: familyMeta.family,
    name,
    ip: row.ip || "",
    serial: row.serial || "",
    location: row.location || "",
    model: row.model || "",
    mac: row.mac || "",
    manufacturer: row.manufacturer || "",
    is_active: row.is_active !== false
  };
}

/**
 * Lean hardware list for admin purge — ~10 queries total (one per family),
 * projected JSON fields only (no full data blob).
 */
export async function fetchEquipmentPurgeList() {
  const batches = await Promise.all(
    PURGE_HARDWARE_FAMILIES.map(async familyMeta => {
      try {
        const result = await pool.query(buildLeanSelect(familyMeta.table));
        return result.rows.map(row => mapLeanRow(row, familyMeta));
      } catch (err) {
        if (err?.code === "42P01") {
          console.warn(`[equipment-purge] table missing: ${familyMeta.table}`);
          return [];
        }
        throw err;
      }
    })
  );

  const items = batches.flat();
  items.sort((a, b) => {
    const byClient = String(a.clientName || "").localeCompare(String(b.clientName || ""), "fr", {
      sensitivity: "base"
    });
    if (byClient !== 0) return byClient;
    const byType = String(a.type || "").localeCompare(String(b.type || ""), "fr", {
      sensitivity: "base"
    });
    if (byType !== 0) return byType;
    return String(a.name || "").localeCompare(String(b.name || ""), "fr", {
      sensitivity: "base"
    });
  });
  return items;
}
