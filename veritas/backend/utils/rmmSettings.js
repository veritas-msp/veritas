import { pool } from "../database/db.js";
const RMM_SETTING_KEYS = ["RMM_HEARTBEAT_INTERVAL_MINUTES", "RMM_OFFLINE_THRESHOLD_MINUTES", "RMM_ALERTS_ENABLED_ON_ENROLL", "RMM_AUTO_UPDATE_ENABLED", "RMM_COLLECT_OS", "RMM_COLLECT_DOMAIN", "RMM_COLLECT_UPDATES", "RMM_COLLECT_LICENSE", "RMM_COLLECT_HARDWARE", "RMM_COLLECT_CHASSIS", "RMM_COLLECT_SESSION", "RMM_COLLECT_NETWORK", "RMM_COLLECT_SOFTWARE", "RMM_COLLECT_PRINTERS", "RMM_COLLECT_SHARES", "RMM_COLLECT_SERVICES", "RMM_COLLECT_PERIPHERALS", "RMM_COLLECT_PERFORMANCE", "RMM_COLLECT_SENSORS", "RMM_COLLECT_SECURITY", "RMM_METRICS_SAMPLE_INTERVAL_MINUTES", "RMM_METRICS_DISK_DELTA_PCT", "RMM_METRICS_RETENTION_DAYS"];
const COLLECTOR_KEYS = ["os", "domain", "updates", "license", "hardware", "chassis", "session", "network", "software", "printers", "shares", "services", "peripherals", "performance", "sensors", "security"];
const DEFAULTS = {
  RMM_HEARTBEAT_INTERVAL_MINUTES: 5,
  RMM_OFFLINE_THRESHOLD_MINUTES: 15,
  RMM_ALERTS_ENABLED_ON_ENROLL: true,
  RMM_AUTO_UPDATE_ENABLED: true,
  RMM_COLLECT_OS: true,
  RMM_COLLECT_DOMAIN: true,
  RMM_COLLECT_UPDATES: true,
  RMM_COLLECT_LICENSE: true,
  RMM_COLLECT_HARDWARE: true,
  RMM_COLLECT_CHASSIS: true,
  RMM_COLLECT_SESSION: true,
  RMM_COLLECT_NETWORK: true,
  RMM_COLLECT_SOFTWARE: false,
  RMM_COLLECT_PRINTERS: true,
  RMM_COLLECT_SHARES: true,
  RMM_COLLECT_SERVICES: true,
  RMM_COLLECT_PERIPHERALS: true,
  RMM_COLLECT_PERFORMANCE: true,
  RMM_COLLECT_SENSORS: true,
  RMM_COLLECT_SECURITY: true,
  RMM_METRICS_SAMPLE_INTERVAL_MINUTES: 60,
  RMM_METRICS_DISK_DELTA_PCT: 5,
  RMM_METRICS_RETENTION_DAYS: 730
};
const METRICS_BOUNDS = {
  sampleIntervalMinutes: {
    min: 15,
    max: 1440
  },
  diskDeltaPct: {
    min: 1,
    max: 50
  },
  retentionDays: {
    min: 30,
    max: 3650
  }
};
function clampMetricsValue(key, value, fallback) {
  const bounds = METRICS_BOUNDS[key];
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(bounds.max, Math.max(bounds.min, n));
}
function buildMetricsFromDb(byKey = {}) {
  return {
    sampleIntervalMinutes: clampMetricsValue("sampleIntervalMinutes", byKey.RMM_METRICS_SAMPLE_INTERVAL_MINUTES, DEFAULTS.RMM_METRICS_SAMPLE_INTERVAL_MINUTES),
    diskDeltaPct: clampMetricsValue("diskDeltaPct", byKey.RMM_METRICS_DISK_DELTA_PCT, DEFAULTS.RMM_METRICS_DISK_DELTA_PCT),
    retentionDays: clampMetricsValue("retentionDays", byKey.RMM_METRICS_RETENTION_DAYS, DEFAULTS.RMM_METRICS_RETENTION_DAYS)
  };
}
function mergeMetricsSettings(baseMetrics, overridesMetrics = null) {
  const merged = {
    ...baseMetrics
  };
  if (!overridesMetrics || typeof overridesMetrics !== "object") return merged;
  for (const key of Object.keys(METRICS_BOUNDS)) {
    if (overridesMetrics[key] !== undefined && overridesMetrics[key] !== null) {
      merged[key] = clampMetricsValue(key, overridesMetrics[key], merged[key]);
    }
  }
  return merged;
}
function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "oui"].includes(normalized)) return true;
  if (["false", "0", "no", "non"].includes(normalized)) return false;
  return fallback;
}
function parseIntSetting(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function mapGlobalRows(byKey) {
  return {
    heartbeatIntervalMinutes: parseIntSetting(byKey.RMM_HEARTBEAT_INTERVAL_MINUTES, DEFAULTS.RMM_HEARTBEAT_INTERVAL_MINUTES),
    offlineThresholdMinutes: parseIntSetting(byKey.RMM_OFFLINE_THRESHOLD_MINUTES, DEFAULTS.RMM_OFFLINE_THRESHOLD_MINUTES),
    alertsEnabledOnEnroll: parseBool(byKey.RMM_ALERTS_ENABLED_ON_ENROLL, DEFAULTS.RMM_ALERTS_ENABLED_ON_ENROLL),
    autoUpdateEnabled: parseBool(byKey.RMM_AUTO_UPDATE_ENABLED, DEFAULTS.RMM_AUTO_UPDATE_ENABLED),
    collectors: {
      os: parseBool(byKey.RMM_COLLECT_OS, DEFAULTS.RMM_COLLECT_OS),
      domain: parseBool(byKey.RMM_COLLECT_DOMAIN, DEFAULTS.RMM_COLLECT_DOMAIN),
      updates: parseBool(byKey.RMM_COLLECT_UPDATES, DEFAULTS.RMM_COLLECT_UPDATES),
      license: parseBool(byKey.RMM_COLLECT_LICENSE, DEFAULTS.RMM_COLLECT_LICENSE),
      hardware: parseBool(byKey.RMM_COLLECT_HARDWARE, DEFAULTS.RMM_COLLECT_HARDWARE),
      chassis: parseBool(byKey.RMM_COLLECT_CHASSIS, DEFAULTS.RMM_COLLECT_CHASSIS),
      session: parseBool(byKey.RMM_COLLECT_SESSION, DEFAULTS.RMM_COLLECT_SESSION),
      network: parseBool(byKey.RMM_COLLECT_NETWORK, DEFAULTS.RMM_COLLECT_NETWORK),
      software: parseBool(byKey.RMM_COLLECT_SOFTWARE, DEFAULTS.RMM_COLLECT_SOFTWARE),
      printers: parseBool(byKey.RMM_COLLECT_PRINTERS, DEFAULTS.RMM_COLLECT_PRINTERS),
      shares: parseBool(byKey.RMM_COLLECT_SHARES, DEFAULTS.RMM_COLLECT_SHARES),
      services: parseBool(byKey.RMM_COLLECT_SERVICES, DEFAULTS.RMM_COLLECT_SERVICES),
      peripherals: parseBool(byKey.RMM_COLLECT_PERIPHERALS, DEFAULTS.RMM_COLLECT_PERIPHERALS),
      performance: parseBool(byKey.RMM_COLLECT_PERFORMANCE, DEFAULTS.RMM_COLLECT_PERFORMANCE),
      sensors: parseBool(byKey.RMM_COLLECT_SENSORS, DEFAULTS.RMM_COLLECT_SENSORS),
      security: parseBool(byKey.RMM_COLLECT_SECURITY, DEFAULTS.RMM_COLLECT_SECURITY)
    },
    metrics: buildMetricsFromDb(byKey)
  };
}
function normalizeSettingsOpts(opts = null) {
  if (opts == null || opts === "") {
    return {
      enrollmentTokenId: null
    };
  }
  if (typeof opts === "object" && !Array.isArray(opts)) {
    return {
      enrollmentTokenId: opts.enrollmentTokenId || opts.tokenId || null
    };
  }
  // Legacy positional clientId — ignored for overrides (token-only model).
  return {
    enrollmentTokenId: null
  };
}
export function mergeRmmSettings(global, overrides = null, scopeWhenOverridden = "token") {
  const base = global || mapGlobalRows({});
  if (!overrides || typeof overrides !== "object") {
    return {
      ...base,
      collectors: {
        ...base.collectors
      },
      metrics: {
        ...base.metrics
      },
      scope: "global"
    };
  }
  const merged = {
    heartbeatIntervalMinutes: overrides.heartbeatIntervalMinutes != null ? parseIntSetting(overrides.heartbeatIntervalMinutes, base.heartbeatIntervalMinutes) : base.heartbeatIntervalMinutes,
    offlineThresholdMinutes: overrides.offlineThresholdMinutes != null ? parseIntSetting(overrides.offlineThresholdMinutes, base.offlineThresholdMinutes) : base.offlineThresholdMinutes,
    alertsEnabledOnEnroll: overrides.alertsEnabledOnEnroll !== undefined && overrides.alertsEnabledOnEnroll !== null ? parseBool(overrides.alertsEnabledOnEnroll, base.alertsEnabledOnEnroll) : base.alertsEnabledOnEnroll,
    autoUpdateEnabled: overrides.autoUpdateEnabled !== undefined && overrides.autoUpdateEnabled !== null ? parseBool(overrides.autoUpdateEnabled, base.autoUpdateEnabled) : base.autoUpdateEnabled,
    collectors: {
      ...base.collectors
    },
    metrics: mergeMetricsSettings(base.metrics, overrides.metrics),
    scope: scopeWhenOverridden
  };
  if (overrides.collectors && typeof overrides.collectors === "object") {
    for (const key of COLLECTOR_KEYS) {
      if (overrides.collectors[key] !== undefined && overrides.collectors[key] !== null) {
        merged.collectors[key] = parseBool(overrides.collectors[key], base.collectors[key]);
      }
    }
  }
  return merged;
}
export async function fetchGlobalRmmSettings() {
  const result = await pool.query(`SELECT key, value FROM v_b_settings WHERE section = 'rmm' AND key = ANY($1::text[])`, [RMM_SETTING_KEYS]);
  const byKey = Object.fromEntries(result.rows.map(row => [row.key, row.value]));
  return mapGlobalRows(byKey);
}
export async function fetchRmmSettings(opts = null) {
  const global = await fetchGlobalRmmSettings();
  const {
    enrollmentTokenId
  } = normalizeSettingsOpts(opts);
  if (!enrollmentTokenId) {
    return {
      ...global,
      collectors: {
        ...global.collectors
      },
      metrics: {
        ...global.metrics
      },
      scope: "global"
    };
  }
  const overrides = await fetchTokenRmmOverrides(enrollmentTokenId);
  return mergeRmmSettings(global, overrides, "token");
}
export async function fetchRmmSettingsForAgent(agent) {
  return fetchRmmSettings({
    enrollmentTokenId: agent?.enrollment_token_id || null
  });
}
export async function fetchTokenRmmOverrides(enrollmentTokenId) {
  if (!enrollmentTokenId) return null;
  const result = await pool.query(`SELECT overrides FROM v_b_rmm_token_settings WHERE enrollment_token_id = $1 LIMIT 1`, [enrollmentTokenId]);
  const raw = result.rows[0]?.overrides;
  if (!raw || typeof raw !== "object" || Object.keys(raw).length === 0) return null;
  return raw;
}
export async function listTokenRmmSettings() {
  const result = await pool.query(`SELECT s.enrollment_token_id, s.overrides, s.updated_at,
            t.label AS token_label, t.client_id, t.revoked_at, t.expires_at, t.uses_count, t.max_uses,
            c.name AS client_name
     FROM v_b_rmm_token_settings s
     JOIN v_b_rmm_enrollment_tokens t ON t.id = s.enrollment_token_id
     JOIN v_b_clients c ON c.id = t.client_id
     ORDER BY c.name ASC, t.label ASC NULLS LAST, t.created_at DESC`);
  return result.rows.map(row => ({
    enrollmentTokenId: row.enrollment_token_id,
    tokenLabel: row.token_label,
    clientId: row.client_id,
    clientName: row.client_name,
    revokedAt: row.revoked_at,
    expiresAt: row.expires_at,
    usesCount: row.uses_count,
    maxUses: row.max_uses,
    overrides: row.overrides || {},
    updatedAt: row.updated_at
  }));
}
export function sanitizeRmmOverrides(payload = {}) {
  const overrides = {};
  if (payload.heartbeatIntervalMinutes !== undefined && payload.heartbeatIntervalMinutes !== null) {
    overrides.heartbeatIntervalMinutes = parseIntSetting(payload.heartbeatIntervalMinutes, null);
  }
  if (payload.offlineThresholdMinutes !== undefined && payload.offlineThresholdMinutes !== null) {
    overrides.offlineThresholdMinutes = parseIntSetting(payload.offlineThresholdMinutes, null);
  }
  if (payload.alertsEnabledOnEnroll !== undefined && payload.alertsEnabledOnEnroll !== null) {
    overrides.alertsEnabledOnEnroll = Boolean(payload.alertsEnabledOnEnroll);
  }
  if (payload.autoUpdateEnabled !== undefined && payload.autoUpdateEnabled !== null) {
    overrides.autoUpdateEnabled = Boolean(payload.autoUpdateEnabled);
  }
  if (payload.collectors && typeof payload.collectors === "object") {
    const collectors = {};
    for (const key of COLLECTOR_KEYS) {
      if (payload.collectors[key] !== undefined && payload.collectors[key] !== null) {
        collectors[key] = Boolean(payload.collectors[key]);
      }
    }
    if (Object.keys(collectors).length > 0) {
      overrides.collectors = collectors;
    }
  }
  if (payload.metrics && typeof payload.metrics === "object") {
    const metrics = {};
    for (const key of Object.keys(METRICS_BOUNDS)) {
      if (payload.metrics[key] !== undefined && payload.metrics[key] !== null) {
        const base = buildMetricsFromDb({});
        metrics[key] = clampMetricsValue(key, payload.metrics[key], base[key]);
      }
    }
    if (Object.keys(metrics).length > 0) {
      overrides.metrics = metrics;
    }
  }
  return overrides;
}
/** @deprecated use sanitizeRmmOverrides */
export const sanitizeClientRmmOverrides = sanitizeRmmOverrides;
export async function saveTokenRmmSettings(enrollmentTokenId, overrides = {}, updatedBy = null) {
  const sanitized = sanitizeRmmOverrides(overrides);
  if (Object.keys(sanitized).length === 0) {
    await deleteTokenRmmSettings(enrollmentTokenId);
    return null;
  }
  const result = await pool.query(`INSERT INTO v_b_rmm_token_settings (enrollment_token_id, overrides, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (enrollment_token_id) DO UPDATE SET
       overrides = EXCLUDED.overrides,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING overrides, updated_at`, [enrollmentTokenId, JSON.stringify(sanitized), updatedBy]);
  return result.rows[0]?.overrides || sanitized;
}
export async function deleteTokenRmmSettings(enrollmentTokenId) {
  await pool.query(`DELETE FROM v_b_rmm_token_settings WHERE enrollment_token_id = $1`, [enrollmentTokenId]);
}
export async function saveRmmSettings(payload = {}) {
  const updates = [];
  if (payload.heartbeatIntervalMinutes !== undefined) {
    updates.push(["RMM_HEARTBEAT_INTERVAL_MINUTES", String(payload.heartbeatIntervalMinutes)]);
  }
  if (payload.offlineThresholdMinutes !== undefined) {
    updates.push(["RMM_OFFLINE_THRESHOLD_MINUTES", String(payload.offlineThresholdMinutes)]);
  }
  if (payload.alertsEnabledOnEnroll !== undefined) {
    updates.push(["RMM_ALERTS_ENABLED_ON_ENROLL", payload.alertsEnabledOnEnroll ? "true" : "false"]);
  }
  if (payload.autoUpdateEnabled !== undefined) {
    updates.push(["RMM_AUTO_UPDATE_ENABLED", payload.autoUpdateEnabled ? "true" : "false"]);
  }
  if (payload.collectors) {
    const map = {
      os: "RMM_COLLECT_OS",
      domain: "RMM_COLLECT_DOMAIN",
      updates: "RMM_COLLECT_UPDATES",
      license: "RMM_COLLECT_LICENSE",
      hardware: "RMM_COLLECT_HARDWARE",
      chassis: "RMM_COLLECT_CHASSIS",
      session: "RMM_COLLECT_SESSION",
      network: "RMM_COLLECT_NETWORK",
      software: "RMM_COLLECT_SOFTWARE",
      printers: "RMM_COLLECT_PRINTERS",
      shares: "RMM_COLLECT_SHARES",
      services: "RMM_COLLECT_SERVICES",
      peripherals: "RMM_COLLECT_PERIPHERALS",
      performance: "RMM_COLLECT_PERFORMANCE",
      sensors: "RMM_COLLECT_SENSORS",
      security: "RMM_COLLECT_SECURITY"
    };
    for (const [key, settingKey] of Object.entries(map)) {
      if (payload.collectors[key] !== undefined) {
        updates.push([settingKey, payload.collectors[key] ? "true" : "false"]);
      }
    }
  }
  if (payload.metrics && typeof payload.metrics === "object") {
    const metricsMap = {
      sampleIntervalMinutes: "RMM_METRICS_SAMPLE_INTERVAL_MINUTES",
      diskDeltaPct: "RMM_METRICS_DISK_DELTA_PCT",
      retentionDays: "RMM_METRICS_RETENTION_DAYS"
    };
    for (const [key, settingKey] of Object.entries(metricsMap)) {
      if (payload.metrics[key] !== undefined) {
        const base = buildMetricsFromDb({});
        updates.push([settingKey, String(clampMetricsValue(key, payload.metrics[key], base[key]))]);
      }
    }
  }
  for (const [key, value] of updates) {
    await pool.query(`INSERT INTO v_b_settings (key, value, section)
       VALUES ($1, $2, 'rmm')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, section = EXCLUDED.section`, [key, value]);
  }
  return fetchGlobalRmmSettings();
}
export function isAgentOnline(lastSeenAt, offlineThresholdMinutes) {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(last)) return false;
  return Date.now() - last <= offlineThresholdMinutes * 60 * 1000;
}

/**
 * Offline display threshold must never be shorter than the heartbeat cycle,
 * otherwise healthy agents appear offline between heartbeats.
 */
export function effectiveOfflineThresholdMinutes(heartbeatIntervalMinutes, offlineThresholdMinutes) {
  const heartbeat = Math.max(1, Number(heartbeatIntervalMinutes) || DEFAULTS.RMM_HEARTBEAT_INTERVAL_MINUTES);
  const configured = Math.max(1, Number(offlineThresholdMinutes) || DEFAULTS.RMM_OFFLINE_THRESHOLD_MINUTES);
  const grace = Math.max(5, Math.ceil(heartbeat * 0.25));
  return Math.max(configured, heartbeat + grace);
}

/**
 * Flag agents to run a full inventory sync on next heartbeat.
 * @param {null|{ tokenId?: string, clientId?: number|string }|number|string} filter
 */
export async function requestFullSyncForAgents(filter = null) {
  const stamp = new Date().toISOString();
  let tokenId = null;
  let clientId = null;
  if (filter != null && typeof filter === "object" && !Array.isArray(filter)) {
    tokenId = filter.tokenId || filter.enrollmentTokenId || null;
    clientId = filter.clientId || null;
  } else if (filter != null && filter !== "") {
    clientId = filter;
  }
  if (tokenId) {
    await pool.query(
      `UPDATE v_b_rmm_agents
         SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('syncRequestedAt', $2::text),
             updated_at = NOW()
       WHERE enrollment_token_id = $1 AND status = 'active'`,
      [tokenId, stamp]
    );
    return;
  }
  if (clientId) {
    await pool.query(
      `UPDATE v_b_rmm_agents
         SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('syncRequestedAt', $2::text),
             updated_at = NOW()
       WHERE client_id = $1 AND status = 'active'`,
      [clientId, stamp]
    );
    return;
  }
  await pool.query(
    `UPDATE v_b_rmm_agents
       SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('syncRequestedAt', $1::text),
           updated_at = NOW()
     WHERE status = 'active'`,
    [stamp]
  );
}
