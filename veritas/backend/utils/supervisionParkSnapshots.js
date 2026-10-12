import { pool } from "../database/db.js";
import { fetchMonitorableEquipmentStats } from "./monitorableEquipmentStats.js";
import { listActiveMonitoringExclusions } from "./equipmentMonitoringExclusions.js";
import { listActiveSupervisionAlerts } from "./supervisionAlerts.js";

function startOfIsoWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftWeek(weekStart, weeks) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function buildParkStatsFromSources({
  alerts = [],
  exclusions = [],
  fleetTotal = 0,
  clientId = null
} = {}) {
  const cid = clientId == null || clientId === "" ? null : String(clientId);
  const filteredAlerts = (Array.isArray(alerts) ? alerts : []).filter(item => {
    if (item?.muted) return false;
    if (cid == null) return true;
    return String(item?.clientId ?? item?.client_id ?? "") === cid;
  });
  const filteredExclusions = (Array.isArray(exclusions) ? exclusions : []).filter(row => {
    if (cid == null) return true;
    return String(row?.clientId ?? row?.client_id ?? "") === cid;
  });

  const maintenanceIds = new Set(
    filteredExclusions
      .map(row => String(row?.equipmentId || row?.equipment_id || "").trim())
      .filter(Boolean)
  );
  const criticalIds = new Set();
  const alertIds = new Set();
  for (const item of filteredAlerts) {
    const id = String(item?.equipmentId || item?.equipment_id || "").trim();
    if (!id || maintenanceIds.has(id)) continue;
    if (String(item?.severity || "").toLowerCase() === "critical") criticalIds.add(id);
    else alertIds.add(id);
  }

  const total = Math.max(0, Number(fleetTotal) || 0);
  const maintenance = maintenanceIds.size;
  const down = criticalIds.size;
  const inAlert = alertIds.size;
  const accounted = maintenance + down + inAlert;
  const online = total > 0 ? Math.max(0, total - accounted) : 0;
  const resolvedTotal = total > 0 ? total : accounted;
  const availability =
    resolvedTotal > 0 ? Math.round((online / resolvedTotal) * 1000) / 10 : 100;

  return {
    total: resolvedTotal,
    online,
    inAlert,
    down,
    maintenance,
    availability
  };
}

async function resolveFleetTotal(clientId = null) {
  if (clientId == null) {
    const stats = await fetchMonitorableEquipmentStats({
      scope: "supervision"
    }).catch(() => null);
    return (
      Number(stats?.equipMonitoredTotal) ||
      Number(stats?.equipUnderSurveillanceCount) ||
      0
    );
  }
  const { fetchEquipmentFleetList } = await import("./equipmentFleetList.js");
  const list = await fetchEquipmentFleetList().catch(() => []);
  return (Array.isArray(list) ? list : []).filter(
    row => String(row?.clientId ?? row?.client_id ?? "") === String(clientId)
  ).length;
}

export async function computeLiveParkSnapshot({ clientId = null } = {}) {
  const cid =
    clientId == null || clientId === "" || Number.isNaN(Number(clientId))
      ? null
      : Number(clientId);
  const [alerts, exclusions, fleetTotal] = await Promise.all([
    listActiveSupervisionAlerts().catch(() => []),
    listActiveMonitoringExclusions({
      clientId: cid,
      limit: 500
    }).catch(() => []),
    resolveFleetTotal(cid)
  ]);
  return buildParkStatsFromSources({
    alerts,
    exclusions,
    fleetTotal,
    clientId: cid
  });
}

function mapSnapshotRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    weekStart: row.week_start,
    clientId: row.client_id,
    scope: row.scope,
    total: Number(row.total) || 0,
    online: Number(row.online) || 0,
    inAlert: Number(row.in_alert) || 0,
    down: Number(row.down) || 0,
    maintenance: Number(row.maintenance) || 0,
    availability: Number(row.availability_pct) || 0,
    source: row.source || "live",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function upsertParkSnapshot({
  weekStart = startOfIsoWeek(),
  clientId = null,
  stats,
  source = "live"
} = {}) {
  const weekKey = toDateKey(weekStart);
  const cid =
    clientId == null || clientId === "" || Number.isNaN(Number(clientId))
      ? null
      : Number(clientId);
  const park = stats || (await computeLiveParkSnapshot({ clientId: cid }));
  let existing;
  if (cid == null) {
    existing = await pool.query(
      `SELECT id FROM v_b_supervision_park_snapshots
       WHERE week_start = $1 AND client_id IS NULL AND scope = 'supervision'
       LIMIT 1`,
      [weekKey]
    );
  } else {
    existing = await pool.query(
      `SELECT id FROM v_b_supervision_park_snapshots
       WHERE week_start = $1 AND client_id = $2 AND scope = 'supervision'
       LIMIT 1`,
      [weekKey, cid]
    );
  }

  let result;
  if (existing.rows[0]?.id) {
    result = await pool.query(
      `UPDATE v_b_supervision_park_snapshots
       SET total = $2,
           online = $3,
           in_alert = $4,
           down = $5,
           maintenance = $6,
           availability_pct = $7,
           source = $8,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        existing.rows[0].id,
        park.total,
        park.online,
        park.inAlert,
        park.down,
        park.maintenance,
        park.availability,
        source
      ]
    );
  } else {
    result = await pool.query(
      `INSERT INTO v_b_supervision_park_snapshots (
         week_start, client_id, scope, total, online, in_alert, down, maintenance,
         availability_pct, source
       ) VALUES ($1, $2, 'supervision', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        weekKey,
        cid,
        park.total,
        park.online,
        park.inAlert,
        park.down,
        park.maintenance,
        park.availability,
        source
      ]
    );
  }
  return mapSnapshotRow(result.rows[0]);
}

export async function listParkSnapshots({
  clientId = null,
  weeks = 12
} = {}) {
  const cid =
    clientId == null || clientId === "" || Number.isNaN(Number(clientId))
      ? null
      : Number(clientId);
  const limit = Math.min(Math.max(Number(weeks) || 12, 1), 52);
  let result;
  if (cid == null) {
    result = await pool.query(
      `SELECT * FROM v_b_supervision_park_snapshots
       WHERE client_id IS NULL AND scope = 'supervision'
       ORDER BY week_start DESC
       LIMIT $1`,
      [limit]
    );
  } else {
    result = await pool.query(
      `SELECT * FROM v_b_supervision_park_snapshots
       WHERE client_id = $1 AND scope = 'supervision'
       ORDER BY week_start DESC
       LIMIT $2`,
      [cid, limit]
    );
  }
  return (result.rows || []).map(mapSnapshotRow);
}

export async function getParkAvailabilityTrend({ clientId = null } = {}) {
  const cid =
    clientId == null || clientId === "" || Number.isNaN(Number(clientId))
      ? null
      : Number(clientId);
  const weekStart = startOfIsoWeek();
  const currentStats = await computeLiveParkSnapshot({ clientId: cid });
  const current = await upsertParkSnapshot({
    weekStart,
    clientId: cid,
    stats: currentStats,
    source: "live"
  });

  const previousWeekStart = shiftWeek(weekStart, -1);
  let previous = null;
  if (cid == null) {
    const prevRes = await pool.query(
      `SELECT * FROM v_b_supervision_park_snapshots
       WHERE client_id IS NULL AND scope = 'supervision' AND week_start = $1
       LIMIT 1`,
      [toDateKey(previousWeekStart)]
    );
    previous = mapSnapshotRow(prevRes.rows[0]);
  } else {
    const prevRes = await pool.query(
      `SELECT * FROM v_b_supervision_park_snapshots
       WHERE client_id = $1 AND scope = 'supervision' AND week_start = $2
       LIMIT 1`,
      [cid, toDateKey(previousWeekStart)]
    );
    previous = mapSnapshotRow(prevRes.rows[0]);
  }

  const currentAvail = Number(current?.availability) || 0;
  const previousAvail = previous ? Number(previous.availability) || 0 : null;
  const delta =
    previousAvail == null
      ? 0
      : Math.round((currentAvail - previousAvail) * 10) / 10;

  return {
    weekStart: toDateKey(weekStart),
    previousWeekStart: toDateKey(previousWeekStart),
    current,
    previous,
    availability: currentAvail,
    previousAvailability: previousAvail,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    comparable: previous != null
  };
}

/** Capture globale (+ optionnellement clients distincts des alertes actives). */
export async function captureParkSnapshots({ includeClients = false, source = "sync" } = {}) {
  const globalSnap = await upsertParkSnapshot({
    weekStart: startOfIsoWeek(),
    clientId: null,
    source
  });
  const clients = [];
  if (includeClients) {
    const alerts = await listActiveSupervisionAlerts().catch(() => []);
    const ids = [
      ...new Set(
        (Array.isArray(alerts) ? alerts : [])
          .map(a => a?.clientId ?? a?.client_id)
          .filter(id => id != null && id !== "")
          .map(id => Number(id))
          .filter(id => Number.isFinite(id))
      )
    ].slice(0, 80);
    for (const id of ids) {
      clients.push(
        await upsertParkSnapshot({
          weekStart: startOfIsoWeek(),
          clientId: id,
          source
        })
      );
    }
  }
  return {
    global: globalSnap,
    clients
  };
}
