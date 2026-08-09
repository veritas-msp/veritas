import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import {
  appendCollectorLogInConfig,
  normalizeMailCollector,
  processMailCollector
} from "./mailCollectorIngest.js";
import { loadMailCollectorsRaw } from "./ticketAutomationConfigStore.js";

const TICK_MS = 60 * 1000;
const FIRST_RUN_DELAY_MS = 20 * 1000;

let timer = null;
let firstRunTimer = null;
let tickInFlight = false;
let setupSkipLogged = false;

export async function pollAllMailCollectors() {
  if (!String(process.env.DATABASE_URL || "").trim()) return;
  // Prefer DB readiness over the ephemeral .setup-complete file (lost on Docker rebuild).
  if (!(await canRunAutoSchemaMigrations())) {
    if (!setupSkipLogged) {
      console.log("[mail-collector-poller] Waiting for setup to complete before polling.");
      setupSkipLogged = true;
    }
    return;
  }
  setupSkipLogged = false;

  const rows = await loadMailCollectorsRaw();
  const collectors = (Array.isArray(rows) ? rows : []).map((row, idx) => normalizeMailCollector(row, idx));

  for (const collector of collectors) {
    if (!collector?.id || !collector.enabled || !collector.ingestEnabled) continue;
    try {
      await processMailCollector(collector, {
        force: false
      });
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`[mail-collector-poller] ${collector.name || collector.id}:`, message);
      await appendCollectorLogInConfig(collector.id, "error", `Automatic check failed: ${message}`).catch(() => {});
    }
  }
}

async function runTick() {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    await pollAllMailCollectors();
  } catch (err) {
    console.error("[mail-collector-poller]", err?.message || err);
  } finally {
    tickInFlight = false;
  }
}

export function startMailCollectorPoller() {
  if (timer) return;
  firstRunTimer = setTimeout(() => {
    runTick();
  }, FIRST_RUN_DELAY_MS);
  timer = setInterval(() => {
    runTick();
  }, TICK_MS);
  if (typeof timer.unref === "function") timer.unref();
  if (typeof firstRunTimer.unref === "function") firstRunTimer.unref();
  console.log("[mail-collector-poller] Started (tick every 60s, respects each collector interval).");
}

export function stopMailCollectorPoller() {
  if (firstRunTimer) {
    clearTimeout(firstRunTimer);
    firstRunTimer = null;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
