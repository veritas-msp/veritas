import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { isCheckmkIntegrationEnabled } from "../utils/checkmkIntegrationStatus.js";
import { getCheckmkMonitoringSettings } from "../utils/checkmkMonitoringSettings.js";
import { runEquipmentMonitoringAlertScan } from "./equipmentMonitoringAlertScan.js";

const FIRST_RUN_DELAY_MS = 45 * 1000;
const FALLBACK_TICK_MS = 5 * 60 * 1000;

let timer = null;
let firstRunTimer = null;
let tickInFlight = false;
let setupSkipLogged = false;

async function scheduleNext(delayMs) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  timer = setTimeout(() => {
    runTick();
  }, Math.max(60 * 1000, delayMs));
  timer.unref?.();
}

async function runTick() {
  if (tickInFlight) {
    await scheduleNext(FALLBACK_TICK_MS);
    return;
  }
  tickInFlight = true;
  let nextDelay = FALLBACK_TICK_MS;
  try {
    if (!(await canRunAutoSchemaMigrations())) {
      if (!setupSkipLogged) {
        console.log("[monitoring-alert-poller] Waiting for setup to complete.");
        setupSkipLogged = true;
      }
      return;
    }
    setupSkipLogged = false;
    if (!(await isCheckmkIntegrationEnabled())) return;
    const mkSettings = await getCheckmkMonitoringSettings();
    nextDelay = mkSettings.syncIntervalMs || FALLBACK_TICK_MS;
    if (mkSettings.syncSuspended || mkSettings.surveillanceSuspended) return;
    const result = await runEquipmentMonitoringAlertScan();
    if (result?.created > 0 || result?.resolved > 0) {
      console.log(
        `[monitoring-alert-poller] evaluated=${result.evaluated} created=${result.created} resolved=${result.resolved}`
      );
    }
  } catch (err) {
    console.error("[monitoring-alert-poller]", err?.message || err);
  } finally {
    tickInFlight = false;
    await scheduleNext(nextDelay);
  }
}

export function startMonitoringAlertPoller() {
  if (firstRunTimer || timer) return;
  firstRunTimer = setTimeout(() => {
    runTick();
  }, FIRST_RUN_DELAY_MS);
  firstRunTimer.unref?.();
  console.log("[monitoring-alert-poller] Started (interval from CheckMK admin settings).");
}
