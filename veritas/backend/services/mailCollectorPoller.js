import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import {
  appendCollectorLogInConfig,
  normalizeMailCollector,
  processMailCollector
} from "./mailCollectorIngest.js";
import { loadMailCollectorsRaw } from "./ticketAutomationConfigStore.js";

/** Poll cadence: wake often, each collector still respects its own interval. */
const TICK_MS = 30 * 1000;
const FIRST_RUN_DELAY_MS = 8 * 1000;

let timer = null;
let firstRunTimer = null;
let tickInFlight = false;
let setupSkipLogged = false;
let tickCount = 0;

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
  const eligible = collectors.filter(c => c?.id && c.enabled && c.ingestEnabled);

  if (eligible.length === 0) {
    if (tickCount % 10 === 1) {
      console.log("[mail-collector-poller] No enabled collectors with auto-ingest.");
    }
    return;
  }

  for (const collector of eligible) {
    const intervalMin = Math.max(1, Number(collector.checkIntervalMinutes || 5));
    try {
      const result = await processMailCollector(collector, {
        force: false
      });
      if (result?.skipped && result.reason === "interval") {
        continue;
      }
      if (result?.skipped) {
        console.log(
          `[mail-collector-poller] ${collector.name || collector.id}: skipped (${result.reason})`
        );
        continue;
      }
      console.log(
        `[mail-collector-poller] ${collector.name || collector.id}: automatic check ` +
          `(every ${intervalMin} min) inspected=${result?.inspected || 0} attached=${result?.attached || 0} ignored=${result?.ignored || 0}`
      );
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
  tickCount += 1;
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
  // Keep timers referenced so background collection is not GC'd / delayed under load.
  console.log(
    `[mail-collector-poller] Started (wake every ${TICK_MS / 1000}s; each collector uses its own interval; writes collector logs).`
  );
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
