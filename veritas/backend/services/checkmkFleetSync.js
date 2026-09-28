import { pool } from "../database/db.js";
import { getCheckmkMonitoringSettings } from "../utils/checkmkMonitoringSettings.js";
import { isCheckmkIntegrationEnabled } from "../utils/checkmkIntegrationStatus.js";
import { startCheckmkSyncRun, finishCheckmkSyncRun } from "../utils/checkmkSyncRuns.js";
import { runEquipmentMonitoringSync, buildSystemCheckmkReq } from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { runEquipmentMonitoringAlertScan } from "./equipmentMonitoringAlertScan.js";

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

const CONCURRENCY = 2;
let fleetSyncInFlight = false;

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

async function mapPool(items, concurrency, worker) {
  const results = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Background CheckMK sync for all mapped equipment, then alert scan.
 * Honours Admin → Integrations interval / suspension flags.
 */
export async function runCheckmkFleetSync({
  trigger = "poller",
  force = false
} = {}) {
  if (fleetSyncInFlight) {
    return {
      skipped: true,
      reason: "already_running"
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
    if (!force && mkSettings.syncSuspended) {
      run = await startCheckmkSyncRun({
        trigger,
        targetsTotal: 0
      });
      if (run?.id) {
        await finishCheckmkSyncRun(run.id, {
          status: "skipped",
          message: "Automatic sync suspended in Admin → Integrations."
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
      targetsTotal: targets.length
    });
    const req = buildSystemCheckmkReq();
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const failures = [];

    await mapPool(targets, CONCURRENCY, async target => {
      try {
        const result = await runEquipmentMonitoringSync(req, {
          equipmentId: target.equipmentId,
          clientId: target.clientId,
          family: target.family,
          hostName: target.hostName,
          site: target.site,
          force: Boolean(force),
          availabilityPeriod: "1m"
        });
        if (result?.skipped) {
          skipped += 1;
        } else {
          synced += 1;
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
      }
    });

    let alertsCreated = 0;
    let alertsResolved = 0;
    let alertScanSkipped = false;
    if (!mkSettings.surveillanceSuspended) {
      try {
        const scan = await runEquipmentMonitoringAlertScan();
        alertsCreated = scan?.created || 0;
        alertsResolved = scan?.resolved || 0;
        alertScanSkipped = Boolean(scan?.skipped);
      } catch (err) {
        console.error("[checkmk-fleet-sync] alert scan:", err?.message || err);
        if (failures.length < 15) {
          failures.push({
            stage: "alert_scan",
            error: err?.message || String(err)
          });
        }
      }
    } else {
      alertScanSkipped = true;
    }

    const status = failed === 0 ? "success" : synced > 0 || skipped > 0 ? "partial" : "error";
    const messageParts = [
      `${synced} synced`,
      `${skipped} skipped`,
      `${failed} failed`
    ];
    if (alertScanSkipped) messageParts.push("alert scan skipped");
    else messageParts.push(`alerts +${alertsCreated}/-${alertsResolved}`);

    if (run?.id) {
      await finishCheckmkSyncRun(run.id, {
        status,
        synced,
        skipped,
        failed,
        alertsCreated,
        alertsResolved,
        message: messageParts.join(" · "),
        details: {
          failures,
          surveillanceSuspended: mkSettings.surveillanceSuspended,
          syncIntervalMinutes: mkSettings.syncIntervalMinutes
        },
        targetsTotal: targets.length
      });
    }

    console.log(
      `[checkmk-fleet-sync] trigger=${trigger} targets=${targets.length} synced=${synced} skipped=${skipped} failed=${failed}`
    );

    return {
      skipped: false,
      runId: run?.id || null,
      targets: targets.length,
      synced,
      skippedCount: skipped,
      failed,
      alertsCreated,
      alertsResolved,
      status
    };
  } catch (err) {
    if (run?.id) {
      await finishCheckmkSyncRun(run.id, {
        status: "error",
        message: err?.message || String(err)
      }).catch(() => {});
    }
    throw err;
  } finally {
    fleetSyncInFlight = false;
  }
}
