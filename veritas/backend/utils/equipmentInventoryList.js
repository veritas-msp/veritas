import { pool } from "../database/db.js";
import { fetchEquipmentPurgeList } from "./equipmentPurgeList.js";

const VIDEO_SURVEILLANCE_TABLES = [
  "v_b_clients_m_videosurveillance",
  "v_b_clients_m_camera",
  "v_b_clients_m_cameras"
];

function mapInventoryRow(row, extras = {}) {
  const dbId = String(row.id);
  const clientId = row.client_id;
  const name = row.display_name || row.row_name || row.item_key || "—";
  return {
    id: `${extras.family || "device"}:${clientId}:${dbId}`,
    dbId,
    clientId,
    clientName: row.client_name || String(clientId),
    type: extras.type,
    family: extras.family,
    familyKey: extras.familyKey || null,
    familyLabel: extras.familyLabel || extras.type,
    isCustom: Boolean(extras.isCustom),
    name,
    ip: row.ip || "",
    serial: row.serial || "",
    location: row.location || "",
    model: row.model || "",
    mac: row.mac || "",
    manufacturer: row.manufacturer || "",
    deviceType: row.device_type || extras.deviceType || "",
    typeServer: row.device_type || extras.typeServer || "",
    fournisseur: row.fournisseur || extras.fournisseur || "",
    familyIcon: extras.familyIcon || row.family_icon || null,
    rawData: extras.rawData || {
      type: row.device_type || "",
      typeServer: row.device_type || "",
      fournisseur: row.fournisseur || "",
      marque: row.manufacturer || "",
      fabricant: row.manufacturer || "",
      manufacturer: row.manufacturer || ""
    },
    is_active: row.is_active !== false
  };
}

async function fetchCustomEquipmentRows() {
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
        COALESCE(NULLIF(TRIM(fd.icon), ''), 'mdi:devices') AS family_icon,
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
        ) AS manufacturer
      FROM v_b_clients_m_custom_equipment ce
      INNER JOIN v_b_clients c ON c.id = ce.client_id
      LEFT JOIN v_b_equipment_family_definitions fd ON fd.family_key = ce.family_key
      WHERE ce.client_id IS NOT NULL
    `);
    return result.rows.map(row => {
      const familyKey = String(row.family_key || "custom");
      const familyLabel = row.family_label || familyKey;
      return mapInventoryRow(row, {
        type: `Custom:${familyKey}`,
        family: `custom:${familyKey}`,
        familyKey,
        familyLabel,
        familyIcon: row.family_icon || "mdi:devices",
        isCustom: true
      });
    });
  } catch (err) {
    if (err?.code === "42P01") {
      console.warn("[equipment-inventory] custom equipment table missing");
      return [];
    }
    throw err;
  }
}

async function fetchVideoSurveillanceRows() {
  for (const table of VIDEO_SURVEILLANCE_TABLES) {
    try {
      const result = await pool.query(`
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
      `);
      return result.rows.map(row => mapInventoryRow(row, {
        type: "Videosurveillance",
        family: "videosurveillance",
        familyLabel: "Videosurveillance"
      }));
    } catch (err) {
      if (err?.code === "42P01") continue;
      throw err;
    }
  }
  return [];
}

function sortInventory(items) {
  items.sort((a, b) => {
    const byClient = String(a.clientName || "").localeCompare(String(b.clientName || ""), "fr", {
      sensitivity: "base"
    });
    if (byClient !== 0) return byClient;
    const byType = String(a.familyLabel || a.type || "").localeCompare(String(b.familyLabel || b.type || ""), "fr", {
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
 * Full device inventory across all clients: standard hardware, custom families, cameras.
 */
export async function fetchEquipmentInventoryList() {
  const [standard, custom, video] = await Promise.all([
    fetchEquipmentPurgeList(),
    fetchCustomEquipmentRows(),
    fetchVideoSurveillanceRows()
  ]);
  const items = [
    ...standard.map(row => ({
      ...row,
      familyLabel: row.type,
      familyKey: null,
      isCustom: false
    })),
    ...custom,
    ...video
  ];
  return sortInventory(items);
}
