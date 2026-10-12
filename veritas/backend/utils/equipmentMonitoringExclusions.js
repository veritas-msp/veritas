import { pool } from "../database/db.js";
import { isEquipmentMonitoredInDb } from "./equipmentInventoryScan.js";

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    equipmentId: row.equipment_id,
    equipmentFamily: row.equipment_family,
    equipmentName: row.equipment_name || null,
    scope: row.scope,
    kind: row.kind,
    serviceKey: row.service_key || null,
    serviceName: row.service_name || null,
    reason: row.reason || null,
    excludedUntil: row.excluded_until || null,
    excludedBy: row.excluded_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    active:
      row.excluded_until == null ||
      (row.excluded_until && new Date(row.excluded_until).getTime() > Date.now())
  };
}

export async function listActiveMonitoringExclusions({
  clientId = null,
  equipmentId = null,
  family = null,
  limit = 200
} = {}) {
  const clauses = ["(excluded_until IS NULL OR excluded_until > NOW())"];
  const params = [];
  if (clientId != null && String(clientId).trim() !== "") {
    params.push(Number(clientId));
    clauses.push(`client_id = $${params.length}`);
  }
  if (equipmentId) {
    params.push(String(equipmentId));
    clauses.push(`equipment_id = $${params.length}`);
  }
  if (family) {
    params.push(String(family).toLowerCase());
    clauses.push(`equipment_family = $${params.length}`);
  }
  params.push(Math.min(500, Math.max(1, Number(limit) || 200)));
  const result = await pool.query(
    `SELECT * FROM v_b_equipment_monitoring_exclusions
     WHERE ${clauses.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return (result.rows || []).map(mapRow);
}

export async function listActiveExclusionsForEquipment(clientId, equipmentId, family) {
  if (!clientId || !equipmentId || !family) return [];
  return listActiveMonitoringExclusions({
    clientId,
    equipmentId,
    family: String(family).toLowerCase(),
    limit: 200
  });
}

export function isDeviceExcluded(exclusions = []) {
  return (Array.isArray(exclusions) ? exclusions : []).some(
    row => row?.scope === "device" && row.active !== false
  );
}

export function isServiceExcluded(exclusions = [], serviceKey) {
  const key = String(serviceKey || "").trim();
  if (!key) return false;
  const list = Array.isArray(exclusions) ? exclusions : [];
  if (list.some(row => row?.scope === "device" && row.active !== false)) return true;
  return list.some(
    row =>
      row?.scope === "service" &&
      row.active !== false &&
      String(row.serviceKey || "").trim() === key
  );
}

export async function upsertMonitoringExclusion({
  clientId,
  equipmentId,
  equipmentFamily,
  equipmentName = null,
  scope = "service",
  kind = "maintenance",
  serviceKey = null,
  serviceName = null,
  reason = null,
  excludedUntil = null,
  excludedBy = null
}) {
  const family = String(equipmentFamily || "").toLowerCase().trim();
  const normalizedScope = scope === "device" ? "device" : "service";
  const normalizedKind = kind === "ignore" ? "ignore" : "maintenance";
  const safeServiceKey =
    normalizedScope === "service" ? String(serviceKey || "").trim() || null : null;
  if (!clientId || !equipmentId || !family) {
    const err = new Error("clientId, equipmentId et family required");
    err.status = 400;
    throw err;
  }
  if (normalizedScope === "service" && !safeServiceKey) {
    const err = new Error("serviceKey required for service scope");
    err.status = 400;
    throw err;
  }

  // Maintenance appareil : uniquement si RMM ou mapping de surveillance (CheckMK…).
  if (normalizedScope === "device" && normalizedKind === "maintenance") {
    let monitored = false;
    try {
      monitored = await isEquipmentMonitoredInDb(clientId, equipmentId, family);
    } catch {
      monitored = false;
    }
    if (!monitored) {
      // Fallback : mapping CheckMK sur l’équipement (alias famille / familles custom).
      const mk = await pool.query(
        `SELECT 1 FROM v_b_equipment_checkmk_monitoring
         WHERE client_id = $1 AND equipment_id = $2::uuid
         LIMIT 1`,
        [clientId, String(equipmentId)]
      );
      monitored = Boolean(mk.rows?.length);
    }
    if (!monitored) {
      const err = new Error(
        "Maintenance réservée aux équipements sous RMM ou avec un mapping de surveillance"
      );
      err.status = 400;
      throw err;
    }
  }

  let existing;
  if (normalizedScope === "device") {
    existing = await pool.query(
      `SELECT id FROM v_b_equipment_monitoring_exclusions
       WHERE client_id = $1 AND equipment_id = $2 AND equipment_family = $3 AND scope = 'device'
       LIMIT 1`,
      [clientId, String(equipmentId), family]
    );
  } else {
    existing = await pool.query(
      `SELECT id FROM v_b_equipment_monitoring_exclusions
       WHERE client_id = $1 AND equipment_id = $2 AND equipment_family = $3
         AND scope = 'service' AND service_key = $4
       LIMIT 1`,
      [clientId, String(equipmentId), family, safeServiceKey]
    );
  }

  if (existing.rows?.[0]?.id) {
    const result = await pool.query(
      `UPDATE v_b_equipment_monitoring_exclusions
       SET equipment_name = COALESCE($2, equipment_name),
           kind = $3,
           service_name = COALESCE($4, service_name),
           reason = $5,
           excluded_until = $6,
           excluded_by = $7,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        existing.rows[0].id,
        equipmentName || null,
        normalizedKind,
        serviceName || null,
        reason || null,
        excludedUntil || null,
        excludedBy || null
      ]
    );
    return mapRow(result.rows[0]);
  }

  const result = await pool.query(
    `INSERT INTO v_b_equipment_monitoring_exclusions (
       client_id, equipment_id, equipment_family, equipment_name,
       scope, kind, service_key, service_name, reason, excluded_until, excluded_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      clientId,
      String(equipmentId),
      family,
      equipmentName || null,
      normalizedScope,
      normalizedKind,
      safeServiceKey,
      serviceName || null,
      reason || null,
      excludedUntil || null,
      excludedBy || null
    ]
  );
  return mapRow(result.rows[0]);
}

export async function clearMonitoringExclusion(id) {
  const result = await pool.query(
    `DELETE FROM v_b_equipment_monitoring_exclusions WHERE id = $1 RETURNING *`,
    [String(id)]
  );
  return mapRow(result.rows[0]);
}

export async function clearExpiredMonitoringExclusions() {
  await pool.query(
    `DELETE FROM v_b_equipment_monitoring_exclusions
     WHERE excluded_until IS NOT NULL AND excluded_until <= NOW()`
  );
}
