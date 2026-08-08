import { estimateRmmMetricsStorage, formatStorageBytes, formatStorageNumber } from "./rmmMetricsStorageUtils";
export const RMM_HEARTBEAT_UPLOAD_KB = 20;
export const RMM_HEARTBEAT_RESPONSE_KB = 1;
export const RMM_INVENTORY_BYTES_PER_AGENT = 32 * 1024;
export const STORAGE_PROJECTION_AGENT_COUNTS = [10, 50, 100, 250, 500, 1000, 2000];
export function heartbeatsPerDay(intervalMinutes = 5) {
  const interval = Math.max(1, Number(intervalMinutes) || 5);
  return Math.round(24 * 60 / interval);
}
export function heartbeatsPerAgentPerMonth(intervalMinutes = 5) {
  return heartbeatsPerDay(intervalMinutes) * 30;
}
export function estimateRmmClientImpact({
  heartbeatIntervalMinutes = 5,
  fullSyncPerWeek = 1
} = {}) {
  const perDay = heartbeatsPerDay(heartbeatIntervalMinutes);
  const durationTypicalSec = 6;
  const cpuPeakPct = 12;
  const activeSecPerDay = perDay * durationTypicalSec + fullSyncPerWeek * 45;
  const avgCpuPct = activeSecPerDay / 86400 * cpuPeakPct;
  return {
    intervalMinutes: heartbeatIntervalMinutes,
    heartbeatsPerDay: perDay,
    rows: [{
      key: "duration",
      value: "3–10 s"
    }, {
      key: "cpuPeak",
      value: "~5–15 %"
    }, {
      key: "cpuAvg",
      value: `< ${Math.max(0.05, avgCpuPct).toFixed(2)} %`,
      noteParams: {
        perDay
      }
    }, {
      key: "ram",
      value: "50–120 Mo"
    }, {
      key: "networkUpload",
      value: `~${RMM_HEARTBEAT_UPLOAD_KB} Ko / heartbeat`
    }, {
      key: "fullSync",
      value: "15–60 s",
      noteParams: {
        count: fullSyncPerWeek
      }
    }]
  };
}
export function estimateRmmServerImpact({
  agentCount = 0,
  heartbeatIntervalMinutes = 5
} = {}) {
  const agents = Math.max(0, Number(agentCount) || 0);
  const perDay = heartbeatsPerDay(heartbeatIntervalMinutes);
  const perAgentDay = perDay;
  const totalHeartbeatsDay = agents * perAgentDay;
  const heartbeatsPerMinute = agents / Math.max(1, heartbeatIntervalMinutes);
  const sqlPerHeartbeat = 5;
  const jsonbWriteKb = 12;
  return {
    agentCount: agents,
    intervalMinutes: heartbeatIntervalMinutes,
    heartbeatsPerMinute: Math.round(heartbeatsPerMinute * 10) / 10,
    heartbeatsPerDay: totalHeartbeatsDay,
    rows: [{
      key: "sqlPerHb",
      value: "~4–8"
    }, {
      key: "sqlPerDay",
      value: formatStorageNumber(totalHeartbeatsDay * sqlPerHeartbeat),
      noteParams: {
        agents,
        perDay: perAgentDay
      }
    }, {
      key: "cpuNode",
      value: "5–30 ms"
    }, {
      key: "inventoryWrite",
      value: `~${jsonbWriteKb} Ko / hb`
    }, {
      key: "historicalMetrics",
      value: "~1 / h / poste"
    }, {
      key: "avgLoad",
      value: `${Math.round(heartbeatsPerMinute * 10) / 10} hb/min`,
      noteParams: {
        note: agents > 0 ? "active" : "none"
      }
    }]
  };
}
export function estimateRmmNetworkImpact({
  agentCount = 0,
  heartbeatIntervalMinutes = 5
} = {}) {
  const agents = Math.max(0, Number(agentCount) || 0);
  const perDay = heartbeatsPerDay(heartbeatIntervalMinutes);
  const kbPerHeartbeat = RMM_HEARTBEAT_UPLOAD_KB + RMM_HEARTBEAT_RESPONSE_KB;
  const bytesPerAgentDay = perDay * kbPerHeartbeat * 1024;
  const bytesTotalDay = agents * bytesPerAgentDay;
  const bytesTotalMonth = bytesTotalDay * 30;
  return {
    agentCount: agents,
    intervalMinutes: heartbeatIntervalMinutes,
    kbPerHeartbeat,
    perAgentDay: formatStorageBytes(bytesPerAgentDay),
    perAgentMonth: formatStorageBytes(bytesPerAgentDay * 30),
    totalDay: formatStorageBytes(bytesTotalDay),
    totalMonth: formatStorageBytes(bytesTotalMonth),
    rows: [{
      key: "perHb",
      value: `~${kbPerHeartbeat} Ko`,
      noteParams: {
        upload: RMM_HEARTBEAT_UPLOAD_KB,
        response: RMM_HEARTBEAT_RESPONSE_KB
      }
    }, {
      key: "perAgentDay",
      value: formatStorageBytes(bytesPerAgentDay),
      noteParams: {
        perDay,
        kb: kbPerHeartbeat
      }
    }, {
      key: "perAgentMonth",
      value: formatStorageBytes(bytesPerAgentDay * 30)
    }, {
      key: "fleetDay",
      value: formatStorageBytes(bytesTotalDay),
      noteParams: {
        agents
      }
    }, {
      key: "fleetMonth",
      value: formatStorageBytes(bytesTotalMonth)
    }, {
      key: "fullSync",
      value: "50–200 Ko"
    }]
  };
}
export function buildRmmStorageProjection({
  agentCounts = STORAGE_PROJECTION_AGENT_COUNTS,
  retentionDays = 730,
  collectors = {},
  avgDisksPerAgent = 3
} = {}) {
  return agentCounts.map(agentCount => {
    const metrics = estimateRmmMetricsStorage({
      agentCount,
      retentionDays,
      collectors,
      avgDisksPerAgent
    });
    const inventoryBytes = agentCount * RMM_INVENTORY_BYTES_PER_AGENT;
    const totalBytes = metrics.estimatedBytes + inventoryBytes;
    return {
      agentCount,
      metricsBytes: metrics.estimatedBytes,
      inventoryBytes,
      totalBytes,
      rowsPerAgentDay: metrics.rowsPerAgentDay,
      steadyStateRows: metrics.steadyStateRows,
      retentionDays: metrics.retentionDays
    };
  });
}
export { formatStorageBytes, formatStorageNumber };
