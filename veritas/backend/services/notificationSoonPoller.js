import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { runNotificationSoonScheduler } from "./notificationDispatcher.js";

const TICK_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 45 * 1000;

let timer = null;
let firstRunTimer = null;
let tickInFlight = false;
let setupSkipLogged = false;

async function runTick() {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    if (!(await canRunAutoSchemaMigrations())) {
      if (!setupSkipLogged) {
        console.log("[notification-soon-poller] Waiting for setup to complete.");
        setupSkipLogged = true;
      }
      return;
    }
    setupSkipLogged = false;
    await runNotificationSoonScheduler();
  } catch (err) {
    console.error("[notification-soon-poller]", err?.message || err);
  } finally {
    tickInFlight = false;
  }
}

export function startNotificationSoonPoller() {
  if (timer) return;
  firstRunTimer = setTimeout(() => {
    runTick();
  }, FIRST_RUN_DELAY_MS);
  timer = setInterval(runTick, TICK_MS);
  timer.unref?.();
  firstRunTimer.unref?.();
}
