/**
 * Background CheckMK fleet sync poller.
 * Cadence = Admin → Intégrations → CheckMK (intervalle).
 * Respecte syncSuspended + intégration activée.
 */
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { isCheckmkIntegrationEnabled } from "../utils/checkmkIntegrationStatus.js";
import { getCheckmkMonitoringSettings } from "../utils/checkmkMonitoringSettings.js";
import { getLatestFinishedCheckmkSyncRun } from "../utils/checkmkSyncRuns.js";
import { isCheckmkFleetSyncRunning, runCheckmkFleetSync } from "./checkmkFleetSync.js";

const TICK_MS = 60 * 1000;
const FIRST_RUN_DELAY_MS = 45 * 1000;

let timer = null;
let firstRunTimer = null;
let tickInFlight = false;
let setupSkipLogged = false;
let suspendedLogged = false;
let disabledLogged = false;

async function shouldRunPollerNow() {
  if (!(await isCheckmkIntegrationEnabled())) {
    if (!disabledLogged) {
      console.log("[monitoring-alert-poller] CheckMK integration disabled — poller idle.");
      disabledLogged = true;
    }
    return { run: false, reason: "integration_disabled" };
  }
  disabledLogged = false;

  const settings = await getCheckmkMonitoringSettings();
  if (settings.syncSuspended) {
    if (!suspendedLogged) {
      console.log("[monitoring-alert-poller] Automatic sync suspended in Admin — poller idle.");
      suspendedLogged = true;
    }
    return { run: false, reason: "sync_suspended", settings };
  }
  suspendedLogged = false;

  if (isCheckmkFleetSyncRunning()) {
    return { run: false, reason: "already_running", settings };
  }

  const lastPoller = await getLatestFinishedCheckmkSyncRun({ trigger: "poller" }).catch(() => null);
  const lastAt = lastPoller?.finishedAt || lastPoller?.startedAt || null;
  const lastMs = lastAt ? new Date(lastAt).getTime() : NaN;
  const intervalMs = settings.syncIntervalMs || 30 * 60 * 1000;
  if (Number.isFinite(lastMs) && Date.now() - lastMs < intervalMs) {
    return { run: false, reason: "interval_not_elapsed", settings, lastPoller };
  }
  return { run: true, reason: "due", settings, lastPoller };
}

async function runTick() {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    if (!(await canRunAutoSchemaMigrations())) {
      if (!setupSkipLogged) {
        console.log("[monitoring-alert-poller] Waiting for setup to complete.");
        setupSkipLogged = true;
      }
      return;
    }
    setupSkipLogged = false;

    const decision = await shouldRunPollerNow();
    if (!decision.run) return;

    console.log(
      `[monitoring-alert-poller] Starting fleet sync (interval=${decision.settings.syncIntervalMinutes} min)`
    );
    await runCheckmkFleetSync({
      trigger: "poller",
      force: false,
      startedBy: "poller"
    });
  } catch (err) {
    console.error("[monitoring-alert-poller]", err?.message || err);
  } finally {
    tickInFlight = false;
  }
}

export function startMonitoringAlertPoller() {
  if (timer) return;
  console.log("[monitoring-alert-poller] Started (checks every 60s; sync cadence from Admin → CheckMK).");
  firstRunTimer = setTimeout(() => {
    runTick();
  }, FIRST_RUN_DELAY_MS);
  timer = setInterval(runTick, TICK_MS);
  timer.unref?.();
  firstRunTimer.unref?.();
}

export async function getMonitoringAlertPollerStatus() {
  const enabled = await isCheckmkIntegrationEnabled();
  const settings = await getCheckmkMonitoringSettings();
  const pollerActive = Boolean(enabled && !settings.syncSuspended);
  const [lastPoller, lastManual, running] = await Promise.all([
    getLatestFinishedCheckmkSyncRun({ trigger: "poller" }).catch(() => null),
    getLatestFinishedCheckmkSyncRun({ trigger: "manual" }).catch(() => null),
    Promise.resolve(isCheckmkFleetSyncRunning())
  ]);
  return {
    integrationEnabled: enabled,
    pollerActive,
    syncSuspended: Boolean(settings.syncSuspended),
    surveillanceSuspended: Boolean(settings.surveillanceSuspended),
    syncIntervalMinutes: settings.syncIntervalMinutes,
    running,
    lastPollerAt: lastPoller?.finishedAt || lastPoller?.startedAt || null,
    lastPollerStatus: lastPoller?.status || null,
    lastManualAt: lastManual?.finishedAt || lastManual?.startedAt || null,
    lastManualStatus: lastManual?.status || null,
    lastManualStartedBy: lastManual?.details?.startedBy || null
  };
}
