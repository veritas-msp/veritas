export const RMM_METRICS_BYTES_PER_ROW = 72;
export const METRICS_FIELDS = [{
  key: "sampleIntervalMinutes",
  label: "Sampling interval",
  hint: "Minimum delay between two recordings (excluding disk variation). Does not affect row count · daily aggregation.",
  min: 15,
  max: 1440,
  suffix: "min",
  icon: "mdi:timer-outline"
}, {
  key: "diskDeltaPct",
  label: "Anticipated disk threshold",
  hint: "Variation of the worst disk (points) triggering a recording before the interval ends.",
  min: 1,
  max: 50,
  suffix: "pts",
  icon: "mdi:harddisk"
}, {
  key: "retentionDays",
  label: "Historical retention",
  hint: "Duration for keeping daily aggregates in the database.",
  min: 30,
  max: 3650,
  suffix: "d",
  icon: "mdi:calendar-clock"
}];
export function countMetricSeriesPerAgentDay(collectors = {}, avgDisksPerAgent = 3) {
  let count = 0;
  if (collectors.hardware !== false) {
    count += Math.max(1, Math.min(8, Math.round(Number(avgDisksPerAgent) || 3)));
  }
  if (collectors.updates !== false) count += 1;
  if (collectors.performance !== false) count += 2;
  if (collectors.sensors !== false) count += 1;
  return count;
}
export function estimateRmmMetricsStorage({
  agentCount = 0,
  retentionDays = 730,
  collectors = {},
  avgDisksPerAgent = 3
} = {}) {
  const safeAgents = Math.max(0, Math.round(Number(agentCount) || 0));
  const safeRetention = Math.max(1, Math.min(3650, Math.round(Number(retentionDays) || 730)));
  const rowsPerAgentDay = countMetricSeriesPerAgentDay(collectors, avgDisksPerAgent);
  const steadyStateRows = safeAgents * rowsPerAgentDay * safeRetention;
  const tableBytes = steadyStateRows * RMM_METRICS_BYTES_PER_ROW;
  const estimatedBytes = Math.round(tableBytes * 1.35);
  return {
    agentCount: safeAgents,
    retentionDays: safeRetention,
    avgDisksPerAgent: Math.max(1, Math.min(8, Math.round(Number(avgDisksPerAgent) || 3))),
    rowsPerAgentDay,
    steadyStateRows,
    estimatedBytes
  };
}
export function formatStorageBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
export function formatStorageNumber(value, locale = "fr") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const tag = `${locale}-${locale.toUpperCase()}`;
  return n.toLocaleString(tag);
}
export const DEFAULT_METRICS = {
  sampleIntervalMinutes: 60,
  diskDeltaPct: 5,
  retentionDays: 730
};
