import { pool } from "../database/db.js";
import { getCheckmkMonitoringSettings } from "../utils/checkmkMonitoringSettings.js";
import { isCheckmkIntegrationEnabled } from "../utils/checkmkIntegrationStatus.js";
import {
  startCheckmkSyncRun,
  finishCheckmkSyncRun,
  updateCheckmkSyncRunProgress,
  getCheckmkSyncRun,
  getLatestRunningCheckmkSyncRun
} from "../utils/checkmkSyncRuns.js";
import { runEquipmentMonitoringSync, buildSystemCheckmkReq } from "../routes/integrations/checkmk/equipmentMonitoringSync.js";

const EQUIPMENT_FAMILY_TABLES = {
  servers: "v_b_clients_m_servers",
  stockage: "v_b_clients_m_stockage",
  firewall: "v_b_clients_m_firewall",
  switch: "v_b_clients_m_switch",
  wifi: "v_b_clients_m_wifi",
  alimentation: "v_b_clients_m_alimentation",
  routeur: "v_b_clients_m_routeur",
  toip: "v_b_clients_m_toip",
  internet: "v_b_clients_m_internet"
};

const CONCURRENCY = 4;
const PROGRESS_FLUSH_MS = 1500;
let fleetSyncInFlight = false;
const cancelledRunIds = new Set();

export function isCheckmkFleetSyncRunning() {
  return fleetSyncInFlight;
}

export function requestCheckmkFleetSyncCancel(runId) {
  const id = runId ? String(runId) : "";
  if (!id) return false;
  cancelledRunIds.add(id);
  return true;
}

export function isCheckmkFleetSyncCancelRequested(runId) {
  return Boolean(runId && cancelledRunIds.has(String(runId)));
}

function clearCheckmkFleetSyncCancel(runId) {
  if (runId) cancelledRunIds.delete(String(runId));
}

async function queryMappedFromTable(family, table) {
  const targets = [];
  try {
    const result = await pool.query(
      `SELECT id, client_id,
              NULLIF(TRIM(COALESCE(
                checkmk_host_name,
                data->>'checkmk_host_name',
                data->'checkmkMapping'->>'checkmk_host_name',
                ''
              )), '') AS host_name,
              NULLIF(TRIM(COALESCE(
                checkmk_site,
                data->>'checkmk_site',
                data->'checkmkMapping'->>'checkmk_site',
                ''
              )), '') AS site
         FROM ${table}
        WHERE NULLIF(TRIM(COALESCE(
                checkmk_host_name,
                data->>'checkmk_host_name',
                data->'checkmkMapping'->>'checkmk_host_name',
                ''
              )), '') IS NOT NULL
          AND (is_active IS NULL OR is_active = true)`
    );
    for (const row of result.rows) {
      if (!row.host_name) continue;
      targets.push({
        equipmentId: row.id,
        clientId: row.client_id,
        family,
        hostName: row.host_name,
        site: row.site || null
      });
    }
  } catch (err) {
    if (err?.code === "42703") {
      try {
        const fallback = await pool.query(
          `SELECT id, client_id, data
             FROM ${table}
            WHERE (is_active IS NULL OR is_active = true)`
        );
        for (const row of fallback.rows) {
          const data = row.data && typeof row.data === "object" ? row.data : {};
          const mapping = data.checkmkMapping && typeof data.checkmkMapping === "object" ? data.checkmkMapping : {};
          const hostName = String(data.checkmk_host_name || mapping.checkmk_host_name || "").trim();
          if (!hostName) continue;
          targets.push({
            equipmentId: row.id,
            clientId: row.client_id,
            family,
            hostName,
            site: data.checkmk_site || mapping.checkmk_site || null
          });
        }
      } catch (inner) {
        if (inner?.code !== "42P01") {
          console.warn(`[checkmk-fleet-sync] ${table}:`, inner.message);
        }
      }
    } else if (err?.code !== "42P01") {
      console.warn(`[checkmk-fleet-sync] ${table}:`, err.message);
    }
  }
  return targets;
}

export async function listMappedCheckmkTargets() {
  const targets = [];
  for (const [family, table] of Object.entries(EQUIPMENT_FAMILY_TABLES)) {
    const rows = await queryMappedFromTable(family, table);
    targets.push(...rows);
  }
  return targets;
}

async function mapPool(items, concurrency, worker, { shouldStop } = {}) {
  const results = [];
  let index = 0;
  let stopped = false;
  const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (index < items.length) {
      if (shouldStop?.()) {
        stopped = true;
        break;
      }
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return { results, stopped };
}

async function executeCheckmkFleetSyncBody({
  trigger,
  force,
  run,
  targets,
  mkSettings,
  syncMode = "fleet"
}) {
  const req = buildSystemCheckmkReq();
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  let alertsCreated = 0;
  let alertsResolved = 0;
  const failures = [];
  let processed = 0;
  const total = targets.length;
  let cancelled = false;
  const baseDetails = run?.details && typeof run.details === "object" ? { ...run.details } : {};
  const effectiveSyncMode = String(syncMode || "fleet").toLowerCase() === "full" ? "full" : "fleet";
  let lastProgressAt = 0;
  let pendingProgressHost = null;

  const pushProgress = async (currentHost = null, extraDetails = null, { flush = false } = {}) => {
    if (!run?.id) return;
    pendingProgressHost = currentHost;
    const now = Date.now();
    if (!flush && now - lastProgressAt < PROGRESS_FLUSH_MS) return;
    lastProgressAt = now;
    const done = synced + skipped + failed;
    await updateCheckmkSyncRunProgress(run.id, {
      synced,
      skipped,
      failed,
      currentHost: pendingProgressHost,
      message: cancelled
        ? "Arrêt en cours..."
        : total
          ? `Synchronisation ${done}/${total}${pendingProgressHost ? ` - ${pendingProgressHost}` : ""}`
          : "Aucun peripherique mappe",
      details: {
        syncMode: effectiveSyncMode,
        ...(extraDetails && typeof extraDetails === "object" ? extraDetails : {})
      }
    }).catch(() => {});
  };

  await pushProgress(null, null, { flush: true });

  const { stopped } = await mapPool(
    targets,
    CONCURRENCY,
    async target => {
      if (isCheckmkFleetSyncCancelRequested(run?.id)) {
        cancelled = true;
        return null;
      }
      try {
        await pushProgress(target.hostName);
        const result = await runEquipmentMonitoringSync(req, {
          equipmentId: target.equipmentId,
          clientId: target.clientId,
          family: target.family,
          hostName: target.hostName,
          site: target.site,
          force: Boolean(force),
          syncMode: effectiveSyncMode,
          mkSettings,
          availabilityPeriod: "1m"
        });
        if (isCheckmkFleetSyncCancelRequested(run?.id)) {
          cancelled = true;
        }
        if (result?.skipped) {
          skipped += 1;
        } else {
          synced += 1;
        }
        const reconcile = result?.alertReconcile;
        if (reconcile && !reconcile.skipped) {
          alertsCreated += Number(reconcile.created) || 0;
          alertsResolved += Number(reconcile.resolved) || 0;
        }
      } catch (err) {
        failed += 1;
        if (failures.length < 15) {
          failures.push({
            equipmentId: target.equipmentId,
            hostName: target.hostName,
            family: target.family,
            error: err?.message || String(err)
          });
        }
      } finally {
        processed += 1;
        if (processed === total || processed % 3 === 0) {
          await pushProgress(null, null, { flush: processed === total });
        }
      }
    },
    {
      shouldStop: () => {
        if (isCheckmkFleetSyncCancelRequested(run?.id)) {
          cancelled = true;
          return true;
        }
        return false;
      }
    }
  );

  if (stopped || isCheckmkFleetSyncCancelRequested(run?.id)) {
    cancelled = true;
  }

  if (cancelled) {
    await pushProgress(null, { cancelRequested: true }, { flush: true });
  }

  const status = cancelled
    ? "cancelled"
    : failed === 0
      ? "success"
      : synced > 0 || skipped > 0
        ? "partial"
        : "error";
  const messageParts = cancelled
    ? [`Annulee apres ${synced + skipped + failed}/${total}`, `${synced} ok`, `${failed} echecs`]
    : [
        `${synced} synced`,
        `${skipped} skipped`,
        `${failed} failed`
      ];
  if (!cancelled) {
    if (mkSettings.surveillanceSuspended) messageParts.push("surveillance suspendue");
    else messageParts.push(`alertes +${alertsCreated}/-${alertsResolved}`);
  }

  if (run?.id) {
    await finishCheckmkSyncRun(run.id, {
      status,
      synced,
      skipped,
      failed,
      alertsCreated,
      alertsResolved,
      message: messageParts.join(" - "),
      details: {
        ...baseDetails,
        syncMode: effectiveSyncMode,
        failures,
        surveillanceSuspended: mkSettings.surveillanceSuspended,
        syncIntervalMinutes: mkSettings.syncIntervalMinutes,
        cancelled,
        cancelRequested: cancelled
      },
      targetsTotal: targets.length
    });
  }

  clearCheckmkFleetSyncCancel(run?.id);

  console.log(
    `[checkmk-fleet-sync] trigger=${trigger} mode=${effectiveSyncMode} targets=${targets.length} synced=${synced} skipped=${skipped} failed=${failed} alerts=+${alertsCreated}/-${alertsResolved} cancelled=${cancelled}`
  );

  return {
    skipped: false,
    cancelled,
    runId: run?.id || null,
    targets: targets.length,
    synced,
    skippedCount: skipped,
    failed,
    alertsCreated,
    alertsResolved,
    status
  };
}

/**
 * Background CheckMK sync for all mapped equipment, then alert scan.
 * Honours Admin → Integrations interval / suspension flags (unless force).
 */
export async function runCheckmkFleetSync({
  trigger = "poller",
  force = false,
  startedBy = null,
  startedByUserId = null
} = {}) {
  if (fleetSyncInFlight) {
    const active = await getLatestRunningCheckmkSyncRun().catch(() => null);
    return {
      skipped: true,
      reason: "already_running",
      runId: active?.id || null,
      run: active
    };
  }
  fleetSyncInFlight = true;
  let run = null;
  try {
    if (!(await isCheckmkIntegrationEnabled())) {
      return {
        skipped: true,
        reason: "integration_disabled"
      };
    }
    const mkSettings = await getCheckmkMonitoringSettings();
    const starterDetails = {
      ...(startedBy ? { startedBy: String(startedBy).slice(0, 80) } : {}),
      ...(startedByUserId ? { startedByUserId: String(startedByUserId) } : {})
    };
    if (!force && mkSettings.syncSuspended) {
      run = await startCheckmkSyncRun({
        trigger,
        targetsTotal: 0,
        details: starterDetails
      });
      if (run?.id) {
        await finishCheckmkSyncRun(run.id, {
          status: "skipped",
          message: "Automatic sync suspended in Admin → Integrations.",
          details: starterDetails
        });
      }
      return {
        skipped: true,
        reason: "sync_suspended",
        runId: run?.id || null
      };
    }

    const targets = await listMappedCheckmkTargets();
    run = await startCheckmkSyncRun({
      trigger,
      targetsTotal: targets.length,
      details: starterDetails
    });
    return await executeCheckmkFleetSyncBody({
      trigger,
      force,
      run,
      targets,
      mkSettings,
      syncMode: "fleet"
    });
  } catch (err) {
    if (run?.id) {
      await finishCheckmkSyncRun(run.id, {
        status: "error",
        message: err?.message || String(err),
        details: run.details || {}
      }).catch(() => {});
    }
    throw err;
  } finally {
    clearCheckmkFleetSyncCancel(run?.id);
    fleetSyncInFlight = false;
  }
}

/**
 * Start fleet sync in background and return as soon as the run row exists.
 * Progress is polled via getCheckmkSyncRun / sync-logs/:id.
 */
export async function beginCheckmkFleetSync({
  trigger = "manual",
  force = false,
  startedBy = null,
  startedByUserId = null
} = {}) {
  if (fleetSyncInFlight) {
    const active = await getLatestRunningCheckmkSyncRun().catch(() => null);
    return {
      skipped: true,
      started: false,
      reason: "already_running",
      runId: active?.id || null,
      run: active
    };
  }

  if (!(await isCheckmkIntegrationEnabled())) {
    return {
      skipped: true,
      started: false,
      reason: "integration_disabled"
    };
  }

  const mkSettings = await getCheckmkMonitoringSettings();
  const starterDetails = {
    ...(startedBy ? { startedBy: String(startedBy).slice(0, 80) } : {}),
    ...(startedByUserId ? { startedByUserId: String(startedByUserId) } : {})
  };
  if (!force && mkSettings.syncSuspended) {
    const run = await startCheckmkSyncRun({
      trigger,
      targetsTotal: 0,
      details: starterDetails
    });
    if (run?.id) {
      await finishCheckmkSyncRun(run.id, {
        status: "skipped",
        message: "Automatic sync suspended in Admin → Integrations.",
        details: starterDetails
      });
    }
    return {
      skipped: true,
      started: false,
      reason: "sync_suspended",
      runId: run?.id || null
    };
  }

  fleetSyncInFlight = true;
  let run = null;
  try {
    const targets = await listMappedCheckmkTargets();
    run = await startCheckmkSyncRun({
      trigger,
      targetsTotal: targets.length,
      details: starterDetails
    });
    if (run?.id) {
      await updateCheckmkSyncRunProgress(run.id, {
        message: targets.length
          ? `Demarrage - ${targets.length} peripherique(s)`
          : "Aucun peripherique mappe CheckMK"
      }).catch(() => {});
    }

    setImmediate(() => {
      executeCheckmkFleetSyncBody({
        trigger,
        force,
        run,
        targets,
        mkSettings,
        syncMode: "fleet"
      })
        .catch(async err => {
          console.error("[checkmk-fleet-sync] background:", err?.message || err);
          if (run?.id) {
            await finishCheckmkSyncRun(run.id, {
              status: "error",
              message: err?.message || String(err),
              details: run.details || {}
            }).catch(() => {});
          }
        })
        .finally(() => {
          clearCheckmkFleetSyncCancel(run?.id);
          fleetSyncInFlight = false;
        });
    });

    return {
      skipped: false,
      started: true,
      runId: run?.id || null,
      targets: targets.length,
      run
    };
  } catch (err) {
    fleetSyncInFlight = false;
    clearCheckmkFleetSyncCancel(run?.id);
    if (run?.id) {
      await finishCheckmkSyncRun(run.id, {
        status: "error",
        message: err?.message || String(err),
        details: starterDetails
      }).catch(() => {});
    }
    throw err;
  }
}

/**
 * Request cancellation of a running fleet sync.
 * In-flight host syncs finish; remaining targets are skipped.
 */
export async function cancelCheckmkFleetSync(runId, { cancelledBy = null } = {}) {
  const id = runId ? String(runId) : "";
  if (!id) {
    return { success: false, reason: "missing_id" };
  }

  const run = await getCheckmkSyncRun(id);
  if (!run) {
    return { success: false, reason: "not_found" };
  }
  if (run.status !== "running") {
    return { success: true, alreadyFinished: true, run };
  }

  requestCheckmkFleetSyncCancel(id);

  const details = {
    ...(run.details && typeof run.details === "object" ? run.details : {}),
    cancelRequested: true,
    ...(cancelledBy ? { cancelledBy: String(cancelledBy).slice(0, 80) } : {})
  };

  await updateCheckmkSyncRunProgress(id, {
    message: "Arret demande...",
    details
  }).catch(() => {});

  // Orphaned DB row (process restarted): close immediately.
  if (!fleetSyncInFlight) {
    const finished = await finishCheckmkSyncRun(id, {
      status: "cancelled",
      synced: run.synced,
      skipped: run.skipped,
      failed: run.failed,
      alertsCreated: run.alertsCreated,
      alertsResolved: run.alertsResolved,
      message: "Annulee",
      details: { ...details, cancelled: true },
      targetsTotal: run.targetsTotal
    });
    clearCheckmkFleetSyncCancel(id);
    return { success: true, finished: true, run: finished };
  }

  return { success: true, cancelling: true, runId: id };
}
