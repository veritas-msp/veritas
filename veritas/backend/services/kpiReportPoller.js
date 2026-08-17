import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { runDueKpiReportSchedules } from "./kpiReportSchedules.js";

const TICK_MS = 60 * 1000;
const FIRST_RUN_DELAY_MS = 12 * 1000;

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
        console.log("[kpi-report-poller] Waiting for setup to complete.");
        setupSkipLogged = true;
      }
      return;
    }
    setupSkipLogged = false;
    const results = await runDueKpiReportSchedules();
    const sent = results.filter(item => item.ok).length;
    if (sent > 0) console.log(`[kpi-report-poller] Sent ${sent} scheduled KPI report(s).`);
  } catch (err) {
    console.error("[kpi-report-poller]", err?.message || err);
  } finally {
    tickInFlight = false;
  }
}

export function startKpiReportPoller() {
  if (timer) return;
  firstRunTimer = setTimeout(() => {
    runTick();
  }, FIRST_RUN_DELAY_MS);
  timer = setInterval(runTick, TICK_MS);
  timer.unref?.();
  firstRunTimer.unref?.();
}
