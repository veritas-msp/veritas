import { pool } from "../database/db.js";
import { isEquipmentMonitoredInDb } from "./equipmentInventoryScan.js";
import { ensureEquipmentMonitoringExclusionsSchema } from "../services/ensureEquipmentMonitoringExclusionsSchema.js";

function mapRow(row) {
  if (!row) return null;
  const endedAt = row.ended_at || null;
  const until = row.excluded_until || null;
  const untilActive = until == null || (until && new Date(until).getTime() > Date.now());
  const active = !endedAt && untilActive;
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name || null,
    equipmentId: row.equipment_id,
    equipmentFamily: row.equipment_family,
    equipmentName: row.equipment_name || null,
    scope: row.scope,
    kind: row.kind,
    serviceKey: row.service_key || null,
    serviceName: row.service_name || null,
    reason: row.reason || null,
    excludedUntil: until,
    excludedBy: row.excluded_by || null,
    endedAt,
    endedBy: row.ended_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    active,
    status: active ? "active" : endedAt ? "ended" : "expired"
  };
}

export async function listActiveMonitoringExclusions({
  clientId = null,
  equipmentId = null,
  family = null,
  limit = 200
} = {}) {
  await ensureEquipmentMonitoringExclusionsSchema();
  const build = (withEndedAt) => {
    const clauses = withEndedAt
      ? ["e.ended_at IS NULL", "(e.excluded_until IS NULL OR e.excluded_until > NOW())"]
      : ["(e.excluded_until IS NULL OR e.excluded_until > NOW())"];
    const params = [];
    if (clientId != null && String(clientId).trim() !== "") {
      const clientNum = Number(clientId);
      if (Number.isFinite(clientNum)) {
        params.push(clientNum);
        clauses.push(`e.client_id = $${params.length}`);
      }
    }
    if (equipmentId) {
      params.push(String(equipmentId));
      clauses.push(`e.equipment_id = $${params.length}`);
    }
    if (family) {
      params.push(String(family).toLowerCase());
      clauses.push(`e.equipment_family = $${params.length}`);
    }
    params.push(Math.min(500, Math.max(1, Number(limit) || 200)));
    return {
      sql: `SELECT e.*, c.name AS client_name
            FROM v_b_equipment_monitoring_exclusions e
            LEFT JOIN v_b_clients c ON c.id = e.client_id
            WHERE ${clauses.join(" AND ")}
            ORDER BY e.excluded_until ASC NULLS LAST, e.created_at ASC
            LIMIT $${params.length}`,
      params
    };
  };
  let result;
  try {
    const q = build(true);
    result = await pool.query(q.sql, q.params);
  } catch (err) {
    if (!/ended_at/i.test(String(err?.message || ""))) throw err;
    const q = build(false);
    result = await pool.query(q.sql, q.params);
  }
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

/** Historique des maintenances / exclusions d’un périphérique (actives + terminées). */
export async function listEquipmentMonitoringExclusionHistory({
  equipmentId,
  clientId = null,
  kind = null,
  limit = 50
} = {}) {
  await ensureEquipmentMonitoringExclusionsSchema();
  const id = String(equipmentId || "").trim();
  if (!id) return [];
  const clauses = ["e.equipment_id = $1"];
  const params = [id];
  if (clientId != null && String(clientId).trim() !== "") {
    const clientNum = Number(clientId);
    if (Number.isFinite(clientNum)) {
      params.push(clientNum);
      clauses.push(`e.client_id = $${params.length}`);
    }
  }
  if (kind) {
    params.push(String(kind));
    clauses.push(`e.kind = $${params.length}`);
  }
  params.push(Math.min(200, Math.max(1, Number(limit) || 50)));

  let result;
  try {
    result = await pool.query(
      `SELECT e.*,
              COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.email), '')) AS excluded_by_name,
              COALESCE(NULLIF(TRIM(eu.username), ''), NULLIF(TRIM(eu.email), '')) AS ended_by_name
         FROM v_b_equipment_monitoring_exclusions e
         LEFT JOIN v_b_users u ON u.id = e.excluded_by
         LEFT JOIN v_b_users eu ON eu.id = e.ended_by
        WHERE ${clauses.join(" AND ")}
        ORDER BY e.created_at DESC
        LIMIT $${params.length}`,
      params
    );
  } catch (err) {
    // Schéma historique pas encore migré : repli sans ended_by / ended_at.
    const msg = String(err?.message || "");
    if (!/ended_by|ended_at/i.test(msg)) throw err;
    result = await pool.query(
      `SELECT e.*,
              COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.email), '')) AS excluded_by_name,
              NULL::text AS ended_by_name
         FROM v_b_equipment_monitoring_exclusions e
         LEFT JOIN v_b_users u ON u.id = e.excluded_by
        WHERE ${clauses.join(" AND ")}
        ORDER BY e.created_at DESC
        LIMIT $${params.length}`,
      params
    );
  }

  return (result.rows || []).map(row => ({
    ...mapRow(row),
    excludedByName: row.excluded_by_name || null,
    endedByName: row.ended_by_name || null
  }));
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

async function softEndExclusion(id, endedBy = null) {
  const result = await pool.query(
    `UPDATE v_b_equipment_monitoring_exclusions
        SET ended_at = COALESCE(ended_at, NOW()),
            ended_by = COALESCE(ended_by, $2),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [String(id), endedBy || null]
  );
  return mapRow(result.rows[0]);
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
  await ensureEquipmentMonitoringExclusionsSchema();
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
       WHERE client_id = $1 AND equipment_id = $2 AND equipment_family = $3
         AND scope = 'device' AND ended_at IS NULL
       LIMIT 1`,
      [clientId, String(equipmentId), family]
    );
  } else {
    existing = await pool.query(
      `SELECT id FROM v_b_equipment_monitoring_exclusions
       WHERE client_id = $1 AND equipment_id = $2 AND equipment_family = $3
         AND scope = 'service' AND service_key = $4 AND ended_at IS NULL
       LIMIT 1`,
      [clientId, String(equipmentId), family, safeServiceKey]
    );
  }

  // Clôturer la période active pour conserver l’historique, puis créer une nouvelle entrée.
  if (existing.rows?.[0]?.id) {
    await softEndExclusion(existing.rows[0].id, excludedBy || null);
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

export async function clearMonitoringExclusion(id, endedBy = null) {
  await ensureEquipmentMonitoringExclusionsSchema();
  return softEndExclusion(id, endedBy);
}

export async function clearExpiredMonitoringExclusions() {
  await ensureEquipmentMonitoringExclusionsSchema();
  await pool.query(
    `UPDATE v_b_equipment_monitoring_exclusions
        SET ended_at = COALESCE(ended_at, NOW()),
            updated_at = NOW()
      WHERE ended_at IS NULL
        AND excluded_until IS NOT NULL
        AND excluded_until <= NOW()`
  );
}
