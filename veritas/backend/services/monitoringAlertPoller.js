/**
 * CheckMK fleet sync is manual-only (Supervision Center / Admin → CheckMK).
 * This poller used to run background syncs on the admin interval — disabled.
 */
export function startMonitoringAlertPoller() {
  console.log("[monitoring-alert-poller] Disabled (fleet sync is manual-only).");
}
