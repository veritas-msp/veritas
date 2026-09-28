import { pool } from "../database/db.js";
import { ensureCheckmkSyncRunsSchema } from "../services/ensureCheckmkSyncRunsSchema.js";

const MAX_KEPT_RUNS = 80;

function mapRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    trigger: row.trigger_source,
    targetsTotal: row.targets_total ?? 0,
    synced: row.synced ?? 0,
    skipped: row.skipped ?? 0,
    failed: row.failed ?? 0,
    alertsCreated: row.alerts_created ?? 0,
    alertsResolved: row.alerts_resolved ?? 0,
    message: row.message || null,
    details: row.details && typeof row.details === "object" ? row.details : {}
  };
}

export async function startCheckmkSyncRun({
  trigger = "poller",
  targetsTotal = 0
} = {}) {
  const ready = await ensureCheckmkSyncRunsSchema();
  if (!ready) return null;
  const result = await pool.query(
    `INSERT INTO v_b_checkmk_sync_runs (status, trigger_source, targets_total)
     VALUES ('running', $1, $2)
     RETURNING *`,
    [String(trigger || "poller").slice(0, 40), Number(targetsTotal) || 0]
  );
  return mapRun(result.rows[0]);
}

export async function finishCheckmkSyncRun(runId, payload = {}) {
  if (!runId) return null;
  const ready = await ensureCheckmkSyncRunsSchema();
  if (!ready) return null;
  const {
    status = "success",
    synced = 0,
    skipped = 0,
    failed = 0,
    alertsCreated = 0,
    alertsResolved = 0,
    message = null,
    details = {},
    targetsTotal = null
  } = payload;
  const result = await pool.query(
    `UPDATE v_b_checkmk_sync_runs
        SET finished_at = NOW(),
            status = $2,
            synced = $3,
            skipped = $4,
            failed = $5,
            alerts_created = $6,
            alerts_resolved = $7,
            message = $8,
            details = $9::jsonb,
            targets_total = COALESCE($10, targets_total)
      WHERE id = $1::uuid
      RETURNING *`,
    [
      runId,
      String(status).slice(0, 24),
      Number(synced) || 0,
      Number(skipped) || 0,
      Number(failed) || 0,
      Number(alertsCreated) || 0,
      Number(alertsResolved) || 0,
      message || null,
      JSON.stringify(details || {}),
      targetsTotal == null ? null : Number(targetsTotal) || 0
    ]
  );
  await pruneCheckmkSyncRuns().catch(() => {});
  return mapRun(result.rows[0]);
}

export async function listCheckmkSyncRuns({ limit = 40 } = {}) {
  const ready = await ensureCheckmkSyncRunsSchema();
  if (!ready) return [];
  const lim = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const result = await pool.query(
    `SELECT * FROM v_b_checkmk_sync_runs
      ORDER BY started_at DESC
      LIMIT $1`,
    [lim]
  );
  return result.rows.map(mapRun);
}

async function pruneCheckmkSyncRuns() {
  await pool.query(
    `DELETE FROM v_b_checkmk_sync_runs
      WHERE id IN (
        SELECT id FROM v_b_checkmk_sync_runs
         ORDER BY started_at DESC
         OFFSET $1
      )`,
    [MAX_KEPT_RUNS]
  );
}
