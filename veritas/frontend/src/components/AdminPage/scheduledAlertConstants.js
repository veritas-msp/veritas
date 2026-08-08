export const SCHEDULED_ALERT_TRIGGER_OPTIONS = [{
  value: "contract_expiration",
  label: "Client contract expiration"
}, {
  value: "license_expiration_antivirus",
  label: "Antivirus license expiration"
}, {
  value: "license_expiration_antispam",
  label: "Antispam license expiration"
}, {
  value: "ticket_sla_risk",
  label: "Ticket SLA about to be breached"
}];
export const SCHEDULED_ALERT_FORM_SECTIONS = [{
  id: "general",
  label: "Schedule",
  description: "Name, CRON and trigger",
  icon: "mdi:clock-outline"
}, {
  id: "delivery",
  label: "Delivery",
  description: "Channels and recipients",
  icon: "mdi:send-outline"
}];
const TRIGGER_LABELS = Object.fromEntries(SCHEDULED_ALERT_TRIGGER_OPTIONS.map(item => [item.value, item.label]));
export function buildDefaultScheduledAlertRule() {
  return {
    id: `cron-alert-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    cron: "0 8 * * *",
    triggerType: "contract_expiration",
    thresholdDays: 30,
    channels: ["mail"],
    recipients: "",
    enabled: true
  };
}
export function describeScheduledAlertRule(rule = {}) {
  const trigger = TRIGGER_LABELS[rule.triggerType] || rule.triggerType || "-";
  const channels = Array.isArray(rule.channels) ? rule.channels : [];
  const channelLabel = channels.length ? channels.map(c => c === "teams" ? "Teams" : "Mail").join(", ") : "No channel";
  return `${trigger} · D-${Number(rule.thresholdDays ?? 0)} · ${channelLabel}`;
}
