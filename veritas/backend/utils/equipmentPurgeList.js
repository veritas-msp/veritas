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
      ) AS manufacturer,
      COALESCE(
        NULLIF(TRIM(e.data->>'type'), ''),
        NULLIF(TRIM(e.data->>'typeServer'), ''),
        ''
      ) AS device_type,
      COALESCE(NULLIF(TRIM(e.data->>'fournisseur'), ''), '') AS fournisseur,
      COALESCE(NULLIF(TRIM(e.data->>'quickConnect'), ''), '') AS quick_connect,
      COALESCE(
        NULLIF(TRIM(e.data->>'adminUrl'), ''),
        NULLIF(TRIM(e.data->>'urlAdministration'), ''),
        NULLIF(TRIM(e.data->>'stormshieldWanUrl'), ''),
        ''
      ) AS admin_url,
      COALESCE(NULLIF(TRIM(e.data->>'stormshieldWanUrl'), ''), '') AS stormshield_wan_url,
      COALESCE(NULLIF(TRIM(e.data->>'remoteAccessSolution'), ''), '') AS remote_access_solution,
      COALESCE(
        NULLIF(TRIM(e.data->>'remoteAccessId'), ''),
        NULLIF(TRIM(e.data->>'anydeskId'), ''),
        ''
      ) AS remote_access_id,
      COALESCE(NULLIF(TRIM(e.data->>'anydeskId'), ''), '') AS anydesk_id,
      CASE
        WHEN lower(COALESCE(e.data->>'manageable', '')) IN ('true', 't', '1', 'yes') THEN true
        ELSE false
      END AS manageable,
      e.created_at
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
    deviceType: row.device_type || "",
    typeServer: row.device_type || "",
    fournisseur: row.fournisseur || "",
    quickConnect: row.quick_connect || "",
    adminUrl: row.admin_url || "",
    stormshieldWanUrl: row.stormshield_wan_url || "",
    remoteAccessSolution: row.remote_access_solution || "",
    remoteAccessId: row.remote_access_id || "",
    anydeskId: row.anydesk_id || "",
    manageable: row.manageable === true,
    createdAt: row.created_at || row.createdAt || null,
    created_at: row.created_at || row.createdAt || null,
    rawData: {
      type: row.device_type || "",
      typeServer: row.device_type || "",
      fournisseur: row.fournisseur || "",
      marque: row.manufacturer || "",
      fabricant: row.manufacturer || "",
      manufacturer: row.manufacturer || "",
      quickConnect: row.quick_connect || "",
      adminUrl: row.admin_url || "",
      urlAdministration: row.admin_url || "",
      stormshieldWanUrl: row.stormshield_wan_url || "",
      remoteAccessSolution: row.remote_access_solution || "",
      remoteAccessId: row.remote_access_id || "",
      anydeskId: row.anydesk_id || "",
      manageable: row.manageable === true
    },
    is_active: row.is_active !== false,
    familyKey: familyMeta.familyKey || null,
    familyLabel: familyMeta.familyLabel || familyMeta.type,
    isCustom: Boolean(familyMeta.isCustom)
  };
}

async function fetchCustomEquipmentPurgeRows() {
  try {
    const result = await pool.query(`
      SELECT
        ce.id,
        ce.client_id,
        c.name AS client_name,
        ce.family_key,
        ce.name AS row_name,
        ce.item_key,
        ce.is_active,
        COALESCE(NULLIF(TRIM(fd.label), ''), ce.family_key) AS family_label,
        COALESCE(
          NULLIF(TRIM(ce.data->>'nom'), ''),
          NULLIF(TRIM(ce.data->>'name'), ''),
          NULLIF(TRIM(ce.name), ''),
          NULLIF(TRIM(ce.item_key), ''),
          '—'
        ) AS display_name,
        COALESCE(NULLIF(TRIM(ce.data->>'ip'), ''), '') AS ip,
        COALESCE(
          NULLIF(TRIM(ce.data->>'numeroSerie'), ''),
          NULLIF(TRIM(ce.data->>'serial'), ''),
          NULLIF(TRIM(ce.data->>'sn'), ''),
          ''
        ) AS serial,
        COALESCE(
          NULLIF(TRIM(ce.data->>'site'), ''),
          NULLIF(TRIM(ce.data->>'location'), ''),
          NULLIF(TRIM(ce.data->>'emplacement'), ''),
          ''
        ) AS location,
        COALESCE(
          NULLIF(TRIM(ce.data->>'modele'), ''),
          NULLIF(TRIM(ce.data->>'model'), ''),
          ''
        ) AS model,
        COALESCE(
          NULLIF(TRIM(ce.data->>'adresseMac'), ''),
          NULLIF(TRIM(ce.data->>'mac'), ''),
          ''
        ) AS mac,
        COALESCE(
          NULLIF(TRIM(ce.data->>'marque'), ''),
          NULLIF(TRIM(ce.data->>'fabricant'), ''),
          NULLIF(TRIM(ce.data->>'manufacturer'), ''),
          ''
        ) AS manufacturer,
        COALESCE(NULLIF(TRIM(ce.data->>'type'), ''), '') AS device_type,
        COALESCE(NULLIF(TRIM(ce.data->>'fournisseur'), ''), '') AS fournisseur,
        false AS manageable
      FROM v_b_clients_m_custom_equipment ce
      INNER JOIN v_b_clients c ON c.id = ce.client_id
      LEFT JOIN v_b_equipment_family_definitions fd ON fd.family_key = ce.family_key
      WHERE ce.client_id IS NOT NULL
    `);
    return result.rows.map(row => {
      const familyKey = String(row.family_key || "custom");
      const familyLabel = row.family_label || familyKey;
      return mapLeanRow(row, {
        type: `Custom:${familyKey}`,
        family: `custom:${familyKey}`,
        familyKey,
        familyLabel,
        isCustom: true
      });
    });
  } catch (err) {
    if (err?.code === "42P01") {
      console.warn("[equipment-purge] custom equipment table missing");
      return [];
    }
    throw err;
  }
}

/**
 * Native hardware families only (no custom). Used by inventory + purge.
 */
export async function fetchStandardHardwarePurgeList() {
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
  return batches.flat();
}

function sortPurgeItems(items) {
  items.sort((a, b) => {
    const byClient = String(a.clientName || "").localeCompare(String(b.clientName || ""), "fr", {
      sensitivity: "base"
    });
    if (byClient !== 0) return byClient;
    const typeA = a.familyLabel || a.type || "";
    const typeB = b.familyLabel || b.type || "";
    const byType = String(typeA).localeCompare(String(typeB), "fr", {
      sensitivity: "base"
    });
    if (byType !== 0) return byType;
    return String(a.name || "").localeCompare(String(b.name || ""), "fr", {
      sensitivity: "base"
    });
  });
  return items;
}

/**
 * Lean hardware list for admin purge — native families + custom equipment.
 */
export async function fetchEquipmentPurgeList() {
  const [standard, custom] = await Promise.all([
    fetchStandardHardwarePurgeList(),
    fetchCustomEquipmentPurgeRows()
  ]);
  return sortPurgeItems([...standard, ...custom]);
}
