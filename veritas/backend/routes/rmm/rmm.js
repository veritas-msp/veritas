import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { rmmEnrollRateLimit } from "../../middleware/rateLimit.js";
import { generateRmmToken, hashRmmSecret, encryptRmmToken, mapEnrollmentTokenRow } from "../../utils/rmmCrypto.js";
import { fetchRmmSettings, fetchRmmSettingsForAgent, fetchGlobalRmmSettings, saveRmmSettings, listTokenRmmSettings, fetchTokenRmmOverrides, saveTokenRmmSettings, deleteTokenRmmSettings, mergeRmmSettings, isAgentOnline, effectiveOfflineThresholdMinutes, requestFullSyncForAgents } from "../../utils/rmmSettings.js";
import { assertCommunityRmmAgentLimit, sendCommunityLimitError } from "../../utils/communityLimits.js";
import { enableMonitoringAlertsForEquipment } from "../../utils/equipmentInventoryScan.js";
import { isCommunity } from "../../utils/edition.js";
import { requirePro } from "../../middleware/edition.js";
import { agentMsiAvailable, streamWindowsSetupMsi, streamWindowsAgentUpdateMsi, WINDOWS_INSTALLER_VERSION, getWindowsInstallerFilenames, isAgentVersionOlderThan } from "../../utils/rmmAgentPackage.js";
import { mergeRmmInventoryData } from "../../utils/rmmInventory.js";
import { fetchRmmMetricHistory, metricIdToName, recordRmmMetricsFromHeartbeat, resolveDimId, resolveMetricId, dimIdToDrive } from "../../utils/rmmMetrics.js";
import { estimateRmmMetricsStorage, fetchRmmMetricsStorageStats } from "../../utils/rmmMetricsStorage.js";
import { maybeLogRmmAgentVersionChange, logRmmHeartbeatActivity, logRmmAgentEquipmentActivity } from "../../utils/rmmEquipmentLog.js";
import { findUnlinkedManualEquipment, getAgentEquipmentFamily, normalizeEquipmentFamily } from "../../utils/rmmEquipmentMatch.js";
const router = express.Router();
function requireAdmin(req, res, next) {
  return requirePermission("rmm.manage")(req, res, next);
}
async function resolveRmmActor(req) {
  const userId = req.user?.id || req.user?.user_id || null;
  if (!userId) {
    return {
      userId: null,
      userName: req.user?.name || req.user?.username || req.user?.email || "Unknown user"
    };
  }
  try {
    const userResult = await pool.query(`SELECT email, username FROM v_b_users WHERE id::text = $1`, [String(userId)]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      return {
        userId,
        userName: user.email || user.username || "Unknown user"
      };
    }
  } catch {}
  return {
    userId,
    userName: req.user?.name || req.user?.username || req.user?.email || "Unknown user"
  };
}
async function resolveAgentEquipmentLogTarget(agentId) {
  const result = await pool.query(
    `SELECT a.id, a.agent_version, a.status, a.client_id, a.ordinateur_id, a.hostname, a.machine_id,
            COALESCE(NULLIF(o.name, ''), NULLIF(o.data->>'nom', ''), NULLIF(o.data->>'name', ''), a.hostname, a.machine_id) AS equipment_name
     FROM v_b_rmm_agents a
     LEFT JOIN v_b_clients_m_ordinateurs o ON o.id = a.ordinateur_id
     WHERE a.id = $1 AND a.status = 'active'
     LIMIT 1`,
    [agentId]
  );
  return result.rows[0] || null;
}
async function verifyAgentAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Agent not authenticated"
    });
  }
  const secret = authHeader.slice(7).trim();
  if (!secret) {
    return res.status(401).json({
      error: "Agent not authenticated"
    });
  }
  try {
    const result = await pool.query(`SELECT * FROM v_b_rmm_agents
       WHERE secret_hash = $1 AND status = 'active'
       LIMIT 1`, [hashRmmSecret(secret)]);
    if (!result.rows.length) {
      return res.status(401).json({
        error: "Invalid or revoked agent"
      });
    }
    req.agent = result.rows[0];
    next();
  } catch (err) {
    console.error("[rmm] verifyAgentAuth:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
}
async function validateEnrollmentToken(token) {
  const plain = String(token || "").trim();
  if (!plain) {
    return {
      error: "Enrollment token invalid or expired"
    };
  }
  const tokenHash = hashRmmSecret(plain);
  const result = await pool.query(`SELECT t.*, c.name AS client_name
     FROM v_b_rmm_enrollment_tokens t
     JOIN v_b_clients c ON c.id = t.client_id
     WHERE t.token_hash = $1
       AND t.revoked_at IS NULL
       AND (t.expires_at IS NULL OR t.expires_at > NOW())
     LIMIT 1`, [tokenHash]);
  const row = result.rows[0];
  if (!row) return {
    error: "Enrollment token invalid or expired"
  };
  if (row.max_uses != null && row.uses_count >= row.max_uses) {
    return {
      error: "Enrollment token exhausted"
    };
  }
  return {
    token: row
  };
}
async function upsertRmmEquipment(agent, inventory = {}, meta = {}) {
  const family = getAgentEquipmentFamily(agent);
  if (family === "serveurs") {
    return upsertServeur(agent, inventory, meta);
  }
  return upsertOrdinateur(agent, inventory, meta);
}
async function upsertOrdinateur(agent, inventory = {}, meta = {}) {
  const settings = await fetchRmmSettingsForAgent(agent);
  const netbios = inventory.hostname || meta.hostname || agent.hostname || inventory.computerName || agent.machine_id;
  let existingRow = null;
  let linkMatchType = null;
  if (agent.ordinateur_id) {
    const byId = await pool.query(`SELECT id, name, data FROM v_b_clients_m_ordinateurs
       WHERE id = $1 AND client_id = $2
       LIMIT 1`, [agent.ordinateur_id, agent.client_id]);
    existingRow = byId.rows[0] || null;
  }
  if (!existingRow) {
    const byAgent = await pool.query(`SELECT id, name, data FROM v_b_clients_m_ordinateurs
       WHERE agent_id = $1
       LIMIT 1`, [agent.id]);
    existingRow = byAgent.rows[0] || null;
  }
  if (!existingRow) {
    const byKey = await pool.query(`SELECT id, name, data FROM v_b_clients_m_ordinateurs
       WHERE client_id = $1 AND item_key = $2
       LIMIT 1`, [agent.client_id, agent.machine_id]);
    existingRow = byKey.rows[0] || null;
  }
  if (!existingRow) {
    const manualMatch = await findUnlinkedManualEquipment(pool, {
      clientId: agent.client_id,
      table: "v_b_clients_m_ordinateurs",
      inventory,
      meta: {
        ...meta,
        hostname: netbios
      }
    });
    if (manualMatch) {
      existingRow = manualMatch;
      linkMatchType = manualMatch.matchType || "manual";
    }
  }
  const previousDataRaw = existingRow?.data || {};
  let previousData = previousDataRaw;
  if (previousData && typeof previousData === "string") {
    try {
      previousData = JSON.parse(previousData);
    } catch {
      previousData = {};
    }
  }
  if (!previousData || typeof previousData !== "object") {
    previousData = {};
  }
  const veritasName = String(previousData.nom || existingRow?.name || netbios || "").trim() || netbios;
  const data = mergeRmmInventoryData(previousData, inventory, {
    hostname: netbios,
    machineId: agent.machine_id,
    agentId: agent.id,
    agentVersion: meta.agentVersion || inventory.agentVersion || null
  }, settings.collectors || {});
  data.nom = data.nom || veritasName;
  if (linkMatchType) {
    data.rmmLinkMatch = linkMatchType;
  }
  let ordinateurId;
  if (existingRow) {
    const result = await pool.query(`UPDATE v_b_clients_m_ordinateurs
       SET item_key = $1,
           name = $2,
           data = $3,
           agent_id = $4,
           is_active = true,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id`, [agent.machine_id, veritasName, data, agent.id, existingRow.id]);
    ordinateurId = result.rows[0]?.id;
  } else {
    const result = await pool.query(`INSERT INTO v_b_clients_m_ordinateurs (client_id, item_key, name, data, agent_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`, [agent.client_id, agent.machine_id, veritasName, data, agent.id]);
    ordinateurId = result.rows[0]?.id;
  }
  if (ordinateurId) {
    await pool.query(`UPDATE v_b_rmm_agents SET ordinateur_id = $1, updated_at = NOW() WHERE id = $2`, [ordinateurId, agent.id]);
  }
  return {
    id: ordinateurId,
    veritasName,
    netbios,
    equipmentFamily: "ordinateurs",
    linkMatchType
  };
}
async function upsertServeur(agent, inventory = {}, meta = {}) {
  const settings = await fetchRmmSettingsForAgent(agent);
  const netbios = inventory.hostname || meta.hostname || agent.hostname || inventory.computerName || agent.machine_id;
  let existingRow = null;
  let linkMatchType = null;
  if (agent.serveur_id) {
    const byId = await pool.query(`SELECT id, name, data FROM v_b_clients_m_servers
       WHERE id = $1 AND client_id = $2
       LIMIT 1`, [agent.serveur_id, agent.client_id]);
    existingRow = byId.rows[0] || null;
  }
  if (!existingRow) {
    const byAgent = await pool.query(`SELECT id, name, data FROM v_b_clients_m_servers
       WHERE agent_id = $1
       LIMIT 1`, [agent.id]);
    existingRow = byAgent.rows[0] || null;
  }
  if (!existingRow) {
    const byKey = await pool.query(`SELECT id, name, data FROM v_b_clients_m_servers
       WHERE client_id = $1 AND item_key = $2
       LIMIT 1`, [agent.client_id, agent.machine_id]);
    existingRow = byKey.rows[0] || null;
  }
  if (!existingRow) {
    const manualMatch = await findUnlinkedManualEquipment(pool, {
      clientId: agent.client_id,
      table: "v_b_clients_m_servers",
      inventory,
      meta: {
        ...meta,
        hostname: netbios
      }
    });
    if (manualMatch) {
      existingRow = manualMatch;
      linkMatchType = manualMatch.matchType || "manual";
    }
  }
  const previousDataRaw = existingRow?.data || {};
  let previousData = previousDataRaw;
  if (previousData && typeof previousData === "string") {
    try {
      previousData = JSON.parse(previousData);
    } catch {
      previousData = {};
    }
  }
  if (!previousData || typeof previousData !== "object") {
    previousData = {};
  }
  const veritasName = String(previousData.nom || existingRow?.name || netbios || "").trim() || netbios;
  const data = mergeRmmInventoryData(previousData, inventory, {
    hostname: netbios,
    machineId: agent.machine_id,
    agentId: agent.id,
    agentVersion: meta.agentVersion || inventory.agentVersion || null
  }, settings.collectors || {});
  data.nom = data.nom || veritasName;
  if (linkMatchType) {
    data.rmmLinkMatch = linkMatchType;
  }
  let serveurId;
  if (existingRow) {
    const result = await pool.query(`UPDATE v_b_clients_m_servers
       SET item_key = $1,
           name = $2,
           data = $3,
           agent_id = $4,
           is_active = true,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id`, [agent.machine_id, veritasName, data, agent.id, existingRow.id]);
    serveurId = result.rows[0]?.id;
  } else {
    const result = await pool.query(`INSERT INTO v_b_clients_m_servers (client_id, item_key, name, data, agent_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`, [agent.client_id, agent.machine_id, veritasName, data, agent.id]);
    serveurId = result.rows[0]?.id;
  }
  if (serveurId) {
    await pool.query(`UPDATE v_b_rmm_agents SET serveur_id = $1, updated_at = NOW() WHERE id = $2`, [serveurId, agent.id]);
  }
  return {
    id: serveurId,
    veritasName,
    netbios,
    equipmentFamily: "serveurs",
    linkMatchType
  };
}
/** Preview enrollment token: connectivity + company stats (does not consume uses). */
router.post("/enroll/preview", rmmEnrollRateLimit, async (req, res) => {
  try {
    const enrollmentToken = String(req.body?.enrollmentToken || "").trim();
    if (!enrollmentToken) {
      return res.status(400).json({
        error: "enrollmentToken required"
      });
    }
    const validation = await validateEnrollmentToken(enrollmentToken);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error
      });
    }
    const {
      token
    } = validation;
    const clientId = token.client_id;
    const [agents, workstations, servers] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'revoked')::int AS revoked
         FROM v_b_rmm_agents WHERE client_id = $1`,
        [clientId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM v_b_clients_m_ordinateurs WHERE client_id = $1`,
        [clientId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM v_b_clients_m_servers WHERE client_id = $1`,
        [clientId]
      )
    ]);
    const agentStats = agents.rows[0] || {};
    const usesRemaining =
      token.max_uses == null ? null : Math.max(0, Number(token.max_uses) - Number(token.uses_count || 0));
    return res.json({
      ok: true,
      clientId: clientId == null ? null : String(clientId),
      clientName: token.client_name || null,
      tokenLabel: token.label || null,
      maxUses: token.max_uses ?? null,
      usesCount: token.uses_count ?? 0,
      usesRemaining,
      agentsTotal: agentStats.total ?? 0,
      agentsActive: agentStats.active ?? 0,
      agentsRevoked: agentStats.revoked ?? 0,
      workstationsTotal: workstations.rows[0]?.total ?? 0,
      serversTotal: servers.rows[0]?.total ?? 0,
      devicesTotal: (workstations.rows[0]?.total ?? 0) + (servers.rows[0]?.total ?? 0)
    });
  } catch (err) {
    console.error("[rmm] enroll/preview:", err.message);
    return res.status(500).json({
      error: "Error during enrollment preview",
      detail: process.env.NODE_ENV === "production" ? undefined : err.message
    });
  }
});
router.post("/enroll", rmmEnrollRateLimit, async (req, res) => {
  try {
    const {
      enrollmentToken,
      machineId,
      hostname,
      agentVersion,
      equipmentFamily: rawFamily
    } = req.body || {};
    if (!enrollmentToken || !machineId) {
      return res.status(400).json({
        error: "enrollmentToken et machineId required"
      });
    }
    const equipmentFamily = normalizeEquipmentFamily(rawFamily);
    const validation = await validateEnrollmentToken(enrollmentToken);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error
      });
    }
    const {
      token
    } = validation;
    const settings = await fetchRmmSettings({
      enrollmentTokenId: token.id
    });
    const agentSecret = generateRmmToken(32);
    const secretHash = hashRmmSecret(agentSecret);
    const existing = await pool.query(`SELECT id, status, agent_version FROM v_b_rmm_agents WHERE machine_id = $1 LIMIT 1`, [String(machineId)]);
    let agentRow;
    const familyConfig = JSON.stringify({
      equipmentFamily
    });
    if (existing.rows.length) {
      const updated = await pool.query(`UPDATE v_b_rmm_agents
         SET client_id = $1,
             enrollment_token_id = $2,
             hostname = $3,
             secret_hash = $4,
             agent_version = $5,
             status = 'active',
             last_seen_at = NOW(),
             config = COALESCE(config, '{}'::jsonb) || $6::jsonb,
             updated_at = NOW()
         WHERE machine_id = $7
         RETURNING *`, [token.client_id, token.id, hostname || null, secretHash, agentVersion || null, familyConfig, String(machineId)]);
      agentRow = updated.rows[0];
    } else {
      await assertCommunityRmmAgentLimit(1);
      const inserted = await pool.query(`INSERT INTO v_b_rmm_agents (client_id, enrollment_token_id, machine_id, hostname, secret_hash, agent_version, last_seen_at, config)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7::jsonb)
         RETURNING *`, [token.client_id, token.id, String(machineId), hostname || null, secretHash, agentVersion || null, familyConfig]);
      agentRow = inserted.rows[0];
    }
    await pool.query(`UPDATE v_b_rmm_enrollment_tokens SET uses_count = uses_count + 1 WHERE id = $1`, [token.id]);
    const equipmentName = hostname || agentRow.hostname || agentRow.machine_id;
    const upsertResult = await upsertRmmEquipment(agentRow, {
      hostname
    }, {
      agentVersion
    });
    const equipmentId = upsertResult?.id || null;
    try {
      await maybeLogRmmAgentVersionChange(pool, {
        clientId: agentRow.client_id,
        equipmentName: upsertResult?.veritasName || equipmentName,
        equipmentId: equipmentId,
        previousVersion: existing.rows.length ? existing.rows[0]?.agent_version : null,
        newVersion: agentVersion,
        event: existing.rows.length ? "re_enroll" : "install",
        source: "enroll",
        hostname: equipmentName,
        machineId: agentRow.machine_id,
        equipmentFamily: upsertResult?.equipmentFamily || equipmentFamily,
        linkMatchType: upsertResult?.linkMatchType || null
      });
    } catch (logErr) {
      console.error("[rmm] enroll log:", logErr.message);
    }
    try {
      if (settings.alertsEnabledOnEnroll !== false && equipmentId) {
        await enableMonitoringAlertsForEquipment({
          clientId: agentRow.client_id,
          equipmentId,
          equipmentFamily: upsertResult?.equipmentFamily || equipmentFamily,
          equipmentName: upsertResult?.veritasName || equipmentName
        });
      }
    } catch (alertErr) {
      console.error("[rmm] enroll alerts enable:", alertErr.message);
    }
    res.status(201).json({
      agentId: agentRow.id,
      clientId: agentRow.client_id,
      agentSecret,
      equipmentFamily: upsertResult?.equipmentFamily || equipmentFamily,
      equipmentId,
      linkMatchType: upsertResult?.linkMatchType || null,
      config: {
        heartbeatIntervalMinutes: settings.heartbeatIntervalMinutes,
        collectors: settings.collectors,
        equipmentFamily: upsertResult?.equipmentFamily || equipmentFamily,
        latestAgentVersion: WINDOWS_INSTALLER_VERSION,
        autoUpdateEnabled: settings.autoUpdateEnabled !== false
      }
    });
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    console.error("[rmm] enroll:", err.message);
    res.status(500).json({
      error: "Error during enrollment"
    });
  }
});
router.get("/agent/commands", verifyAgentAuth, async (req, res) => {
  try {
    const syncRequestedAt = req.agent?.config?.syncRequestedAt || null;
    const updateRequestedAt = req.agent?.config?.updateRequestedAt || null;
    const heartbeatRequestedAt = req.agent?.config?.heartbeatRequestedAt || null;
    const settings = await fetchRmmSettingsForAgent(req.agent);
    const agentVersion = req.agent?.agent_version || null;
    const updateNeeded = isAgentVersionOlderThan(agentVersion, WINDOWS_INSTALLER_VERSION);
    res.json({
      fullSyncRequested: Boolean(syncRequestedAt),
      syncRequestedAt,
      forceUpdateRequested: Boolean(updateRequestedAt) && updateNeeded,
      updateRequestedAt,
      immediateHeartbeatRequested: Boolean(heartbeatRequestedAt) || Boolean(updateRequestedAt) && updateNeeded,
      heartbeatRequestedAt,
      latestAgentVersion: WINDOWS_INSTALLER_VERSION,
      heartbeatIntervalMinutes: settings.heartbeatIntervalMinutes
    });
  } catch (err) {
    console.error("[rmm] agent commands:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/heartbeat", verifyAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;
    const {
      inventory,
      agentVersion,
      hostname
    } = req.body || {};
    const settings = await fetchRmmSettingsForAgent(agent);
    const previousVersion = agent.agent_version;
    const resolvedHostname = inventory?.hostname || hostname || agent.hostname || agent.machine_id;
    await pool.query(`UPDATE v_b_rmm_agents
       SET last_seen_at = NOW(),
           agent_version = COALESCE($1, agent_version),
           hostname = COALESCE($2, hostname),
           updated_at = NOW()
       WHERE id = $3`, [agentVersion || null, hostname || null, agent.id]);
    let equipmentId = agent.ordinateur_id || agent.serveur_id || null;
    let logEquipmentName = resolvedHostname;
    const syncRequested = Boolean(agent.config?.syncRequestedAt);
    const updateRequested = Boolean(agent.config?.updateRequestedAt);
    const heartbeatRequested = Boolean(agent.config?.heartbeatRequestedAt);
    if (inventory && typeof inventory === "object") {
      const upsertResult = await upsertRmmEquipment(agent, inventory, {
        agentVersion
      });
      equipmentId = upsertResult?.id || equipmentId;
      logEquipmentName = upsertResult?.veritasName || resolvedHostname;
      try {
        await logRmmHeartbeatActivity(pool, {
          clientId: agent.client_id,
          equipmentName: logEquipmentName,
          equipmentId: equipmentId,
          inventory,
          agentVersion: agentVersion || previousVersion,
          hostname: resolvedHostname,
          machineId: agent.machine_id,
          syncRequested
        });
      } catch (logErr) {
        console.error("[rmm] heartbeat activity log:", logErr.message);
      }
      try {
        await maybeLogRmmAgentVersionChange(pool, {
          clientId: agent.client_id,
          equipmentName: logEquipmentName,
          equipmentId: equipmentId,
          previousVersion,
          newVersion: agentVersion || previousVersion,
          event: "update",
          source: "heartbeat",
          hostname: resolvedHostname,
          machineId: agent.machine_id
        });
      } catch (logErr) {
        console.error("[rmm] heartbeat log:", logErr.message);
      }
      try {
        await recordRmmMetricsFromHeartbeat(agent, inventory, settings);
      } catch (metricsErr) {
        console.error("[rmm] metrics:", metricsErr.message);
      }
      if (inventory.inventoryMode === "full") {
        await pool.query(`UPDATE v_b_rmm_agents
           SET config = COALESCE(config, '{}'::jsonb) - 'syncRequestedAt',
               updated_at = NOW()
           WHERE id = $1 AND (config ? 'syncRequestedAt')`, [agent.id]);
      }
    }
    // Any successful heartbeat clears an explicit wake request.
    if (heartbeatRequested) {
      await pool.query(`UPDATE v_b_rmm_agents
         SET config = COALESCE(config, '{}'::jsonb) - 'heartbeatRequestedAt',
             updated_at = NOW()
         WHERE id = $1 AND (config ? 'heartbeatRequestedAt')`, [agent.id]);
    }
    if (updateRequested && !isAgentVersionOlderThan(agentVersion || previousVersion, WINDOWS_INSTALLER_VERSION)) {
      await pool.query(`UPDATE v_b_rmm_agents
         SET config = COALESCE(config, '{}'::jsonb) - 'updateRequestedAt' - 'heartbeatRequestedAt',
             updated_at = NOW()
         WHERE id = $1 AND (config ? 'updateRequestedAt')`, [agent.id]);
    }
    const fullSyncRequested = syncRequested;
    const forceUpdateRequested = updateRequested && isAgentVersionOlderThan(agentVersion || previousVersion, WINDOWS_INSTALLER_VERSION);
    res.json({
      ok: true,
      config: {
        heartbeatIntervalMinutes: settings.heartbeatIntervalMinutes,
        collectors: settings.collectors,
        fullSyncRequested,
        immediateHeartbeatRequested: false,
        latestAgentVersion: WINDOWS_INSTALLER_VERSION,
        updateAvailable: isAgentVersionOlderThan(agentVersion || previousVersion, WINDOWS_INSTALLER_VERSION),
        forceUpdateRequested,
        // Force auto-update for this cycle when an admin pushed an update.
        autoUpdateEnabled: settings.autoUpdateEnabled !== false || forceUpdateRequested
      }
    });
  } catch (err) {
    console.error("[rmm] heartbeat:", err.message);
    res.status(500).json({
      error: "Error heartbeat"
    });
  }
});
router.get("/settings", verifyJWT, requireAdmin, async (_req, res) => {
  try {
    const settings = await fetchGlobalRmmSettings();
    res.json(settings);
  } catch (err) {
    console.error("[rmm] get settings:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.put("/settings", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const payload = {
      ...(req.body || {})
    };
    if (isCommunity() && payload.collectors) {
      delete payload.collectors;
    }
    const settings = await saveRmmSettings(payload);
    try {
      await requestFullSyncForAgents(null);
    } catch (syncErr) {
      console.error("[rmm] settings sync flag:", syncErr.message);
    }
    res.json(settings);
  } catch (err) {
    console.error("[rmm] put settings:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/settings/metrics-storage", verifyJWT, requireAdmin, async (_req, res) => {
  try {
    const [stats, global] = await Promise.all([fetchRmmMetricsStorageStats(), fetchGlobalRmmSettings()]);
    const estimate = estimateRmmMetricsStorage({
      agentCount: stats.activeAgents || stats.agentCountWithData,
      retentionDays: global.metrics?.retentionDays,
      collectors: global.collectors,
      avgDisksPerAgent: stats.avgDisksPerAgent
    });
    res.json({
      stats,
      estimate,
      settings: {
        metrics: global.metrics,
        collectors: global.collectors
      }
    });
  } catch (err) {
    console.error("[rmm] metrics storage:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/settings/tokens", verifyJWT, requireAdmin, requirePro, async (_req, res) => {
  try {
    const items = await listTokenRmmSettings();
    res.json(items);
  } catch (err) {
    console.error("[rmm] list token settings:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/settings/tokens/:tokenId", verifyJWT, requireAdmin, requirePro, async (req, res) => {
  try {
    const tokenId = String(req.params.tokenId || "").trim();
    if (!tokenId) return res.status(400).json({
      error: "Invalid tokenId"
    });
    const tokenCheck = await pool.query(`SELECT t.id, t.client_id, t.label, c.name AS client_name
       FROM v_b_rmm_enrollment_tokens t
       JOIN v_b_clients c ON c.id = t.client_id
       WHERE t.id = $1
       LIMIT 1`, [tokenId]);
    if (!tokenCheck.rows.length) {
      return res.status(404).json({
        error: "Token not found"
      });
    }
    const tokenRow = tokenCheck.rows[0];
    const global = await fetchGlobalRmmSettings();
    const overrides = await fetchTokenRmmOverrides(tokenId);
    const effective = mergeRmmSettings(global, overrides, "token");
    res.json({
      enrollmentTokenId: tokenId,
      clientId: tokenRow.client_id,
      clientName: tokenRow.client_name,
      tokenLabel: tokenRow.label,
      global,
      overrides,
      effective,
      hasCustomConfig: Boolean(overrides && Object.keys(overrides).length > 0)
    });
  } catch (err) {
    console.error("[rmm] get token settings:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.put("/settings/tokens/:tokenId", verifyJWT, requireAdmin, requirePro, async (req, res) => {
  try {
    const tokenId = String(req.params.tokenId || "").trim();
    if (!tokenId) return res.status(400).json({
      error: "Invalid tokenId"
    });
    const tokenCheck = await pool.query(`SELECT id, client_id, label FROM v_b_rmm_enrollment_tokens WHERE id = $1 LIMIT 1`, [tokenId]);
    if (!tokenCheck.rows.length) {
      return res.status(404).json({
        error: "Token not found"
      });
    }
    const {
      overrides,
      useCustom
    } = req.body || {};
    if (useCustom === false) {
      await deleteTokenRmmSettings(tokenId);
    } else {
      await saveTokenRmmSettings(tokenId, overrides || {}, req.user?.id || null);
    }
    try {
      await requestFullSyncForAgents({
        tokenId
      });
    } catch (syncErr) {
      console.error("[rmm] token settings sync flag:", syncErr.message);
    }
    const global = await fetchGlobalRmmSettings();
    const savedOverrides = await fetchTokenRmmOverrides(tokenId);
    res.json({
      enrollmentTokenId: tokenId,
      clientId: tokenCheck.rows[0].client_id,
      tokenLabel: tokenCheck.rows[0].label,
      global,
      overrides: savedOverrides,
      effective: mergeRmmSettings(global, savedOverrides, "token"),
      hasCustomConfig: Boolean(savedOverrides && Object.keys(savedOverrides).length > 0)
    });
  } catch (err) {
    console.error("[rmm] put token settings:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.delete("/settings/tokens/:tokenId", verifyJWT, requireAdmin, requirePro, async (req, res) => {
  try {
    const tokenId = String(req.params.tokenId || "").trim();
    if (!tokenId) return res.status(400).json({
      error: "Invalid tokenId"
    });
    await deleteTokenRmmSettings(tokenId);
    try {
      await requestFullSyncForAgents({
        tokenId
      });
    } catch (syncErr) {
      console.error("[rmm] token settings delete sync flag:", syncErr.message);
    }
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[rmm] delete token settings:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
// Legacy client-settings routes — gone (token model).
function goneClientSettings(_req, res) {
  res.status(410).json({
    error: "RMM client settings replaced by token settings. Use /rmm/settings/tokens."
  });
}
router.all("/settings/clients", verifyJWT, requireAdmin, goneClientSettings);
router.all("/settings/clients/:clientId", verifyJWT, requireAdmin, goneClientSettings);
router.get("/enrollment-tokens", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const {
      clientId,
      status = "active"
    } = req.query;
    const params = [];
    let where = status === "revoked" ? "WHERE t.revoked_at IS NOT NULL" : "WHERE t.revoked_at IS NULL";
    if (clientId) {
      params.push(clientId);
      where += ` AND t.client_id = $${params.length}`;
    }
    const orderBy = status === "revoked" ? "ORDER BY t.revoked_at DESC NULLS LAST" : "ORDER BY t.created_at DESC";
    const result = await pool.query(`SELECT t.id, t.client_id, t.label, t.expires_at, t.max_uses, t.uses_count,
              t.created_at, t.revoked_at, t.token_encrypted, c.name AS client_name
       FROM v_b_rmm_enrollment_tokens t
       JOIN v_b_clients c ON c.id = t.client_id
       ${where}
       ${orderBy}`, params);
    res.json(result.rows.map(mapEnrollmentTokenRow));
  } catch (err) {
    console.error("[rmm] list tokens:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/enrollment-tokens", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const {
      clientId,
      label,
      expiresAt,
      maxUses
    } = req.body || {};
    if (!clientId) {
      return res.status(400).json({
        error: "clientId required"
      });
    }
    const plainToken = generateRmmToken(24);
    const tokenHash = hashRmmSecret(plainToken);
    const tokenEncrypted = encryptRmmToken(plainToken);
    const result = await pool.query(`INSERT INTO v_b_rmm_enrollment_tokens (client_id, token_hash, token_encrypted, label, expires_at, max_uses, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, client_id, label, expires_at, max_uses, uses_count, created_at, token_encrypted`, [clientId, tokenHash, tokenEncrypted, label || null, expiresAt || null, maxUses ?? null, req.user?.id || null]);
    res.status(201).json({
      ...mapEnrollmentTokenRow(result.rows[0]),
      token: plainToken
    });
  } catch (err) {
    console.error("[rmm] create token:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/enrollment-tokens/:id/restore", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE v_b_rmm_enrollment_tokens
       SET revoked_at = NULL
       WHERE id = $1 AND revoked_at IS NOT NULL
       RETURNING id`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Tokin not found or already active"
      });
    }
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[rmm] restore token:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.delete("/enrollment-tokens/:id/permanent", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM v_b_rmm_enrollment_tokens
       WHERE id = $1 AND revoked_at IS NOT NULL
       RETURNING id`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Tokin not found or not in the trash"
      });
    }
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[rmm] delete token permanently:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.delete("/enrollment-tokens/:id", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE v_b_rmm_enrollment_tokens
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Tokin not found or already revoked"
      });
    }
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[rmm] revoke token:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/agents", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const {
      clientId
    } = req.query;
    const params = [];
    let where = "WHERE a.status = 'active'";
    if (clientId) {
      params.push(clientId);
      where += ` AND a.client_id = $${params.length}`;
    }
    const result = await pool.query(`SELECT a.id, a.client_id, a.enrollment_token_id, a.machine_id, a.hostname, a.status,
              a.agent_version, a.last_seen_at, a.created_at, a.updated_at, a.config,
              c.name AS client_name,
              t.label AS enrollment_token_label
       FROM v_b_rmm_agents a
       JOIN v_b_clients c ON c.id = a.client_id
       LEFT JOIN v_b_rmm_enrollment_tokens t ON t.id = a.enrollment_token_id
       ${where}
       ORDER BY a.last_seen_at DESC NULLS LAST`, params);
    const settingsCache = new Map();
    const agents = [];
    for (const row of result.rows) {
      const cacheKey = row.enrollment_token_id || "__global__";
      let settings = settingsCache.get(cacheKey);
      if (!settings) {
        settings = await fetchRmmSettings({
          enrollmentTokenId: row.enrollment_token_id || null
        });
        settingsCache.set(cacheKey, settings);
      }
      const offlineMinutes = effectiveOfflineThresholdMinutes(
        settings.heartbeatIntervalMinutes,
        settings.offlineThresholdMinutes
      );
      agents.push({
        ...row,
        online: isAgentOnline(row.last_seen_at, offlineMinutes),
        sync_requested_at: row.config?.syncRequestedAt || null,
        update_requested_at: row.config?.updateRequestedAt || null,
        latest_agent_version: WINDOWS_INSTALLER_VERSION,
        settings_scope: settings.scope || "global",
        heartbeat_interval_minutes: settings.heartbeatIntervalMinutes,
        offline_threshold_minutes: settings.offlineThresholdMinutes,
        offline_threshold_effective_minutes: offlineMinutes,
        auto_update_enabled: settings.autoUpdateEnabled !== false
      });
    }
    res.json(agents);
  } catch (err) {
    console.error("[rmm] list agents:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/agents/:id/metrics/history", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const metricId = resolveMetricId(req.query.metric || "disk_used_pct");
    if (!metricId) {
      return res.status(400).json({
        error: "Invalid metric"
      });
    }
    const dimId = resolveDimId(req.query.dim);
    const days = req.query.days;
    const agentCheck = await pool.query(`SELECT id FROM v_b_rmm_agents WHERE id = $1 AND status = 'active' LIMIT 1`, [req.params.id]);
    if (!agentCheck.rows.length) {
      return res.status(404).json({
        error: "Agent not found"
      });
    }
    const points = await fetchRmmMetricHistory(agentCheck.rows[0].id, {
      metricId,
      dimId,
      days
    });
    res.json({
      agentId: agentCheck.rows[0].id,
      metric: metricIdToName(metricId),
      dim: dimId ? dimIdToDrive(dimId) : null,
      dimId,
      days: Math.min(730, Math.max(1, Number.parseInt(String(days), 10) || 90)),
      points
    });
  } catch (err) {
    console.error("[rmm] metrics history:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/agents/:id/request-sync", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE v_b_rmm_agents
       SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('syncRequestedAt', to_jsonb(NOW()::text)),
           updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id, config`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Agent not found or inactive"
      });
    }
    res.json({
      ok: true,
      sync_requested_at: result.rows[0].config?.syncRequestedAt || new Date().toISOString()
    });
  } catch (err) {
    console.error("[rmm] request-sync:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/agents/:id/request-heartbeat", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE v_b_rmm_agents
       SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('heartbeatRequestedAt', to_jsonb(NOW()::text)),
           updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id, config`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Agent not found or inactive"
      });
    }
    res.json({
      ok: true,
      heartbeat_requested_at: result.rows[0].config?.heartbeatRequestedAt || new Date().toISOString()
    });
  } catch (err) {
    console.error("[rmm] request-heartbeat:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/agents/:id/request-update", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const agent = await resolveAgentEquipmentLogTarget(req.params.id);
    if (!agent) {
      return res.status(404).json({
        error: "Agent not found or inactive"
      });
    }
    const agentVersion = agent.agent_version || null;
    if (!isAgentVersionOlderThan(agentVersion, WINDOWS_INSTALLER_VERSION)) {
      return res.status(409).json({
        error: "Agent already on latest version",
        code: "ALREADY_UP_TO_DATE",
        agent_version: agentVersion,
        latest_agent_version: WINDOWS_INSTALLER_VERSION
      });
    }
    if (!agentMsiAvailable() && process.platform !== "win32") {
      return res.status(404).json({
        error: "Agent MSI package unavailable on server",
        code: "MSI_UNAVAILABLE",
        latest_agent_version: WINDOWS_INSTALLER_VERSION
      });
    }
    const result = await pool.query(`UPDATE v_b_rmm_agents
       SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
             'updateRequestedAt', to_jsonb(NOW()::text),
             'heartbeatRequestedAt', to_jsonb(NOW()::text)
           ),
           updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id, config, agent_version`, [req.params.id]);
    const updateRequestedAt = result.rows[0].config?.updateRequestedAt || new Date().toISOString();
    try {
      const actor = await resolveRmmActor(req);
      const previous = agentVersion || "—";
      const next = WINDOWS_INSTALLER_VERSION;
      await logRmmAgentEquipmentActivity(pool, {
        clientId: agent.client_id,
        equipmentName: agent.equipment_name || agent.hostname || agent.machine_id,
        equipmentId: agent.ordinateur_id || null,
        action: `RMM agent update requested — ${previous} → ${next}`,
        userId: actor.userId,
        userName: actor.userName,
        details: {
          kind: "rmm_agent_update_request",
          event: "request",
          source: "console",
          previousVersion: agentVersion,
          newVersion: WINDOWS_INSTALLER_VERSION,
          hostname: agent.hostname || null,
          machineId: agent.machine_id || null,
          requestedAt: updateRequestedAt
        }
      });
    } catch (logErr) {
      console.error("[rmm] request-update log:", logErr.message);
    }
    res.json({
      ok: true,
      update_requested_at: updateRequestedAt,
      agent_version: result.rows[0].agent_version || agentVersion,
      latest_agent_version: WINDOWS_INSTALLER_VERSION
    });
  } catch (err) {
    console.error("[rmm] request-update:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/agents/:id/cancel-update", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const agent = await resolveAgentEquipmentLogTarget(req.params.id);
    if (!agent) {
      return res.status(404).json({
        error: "Agent not found or inactive"
      });
    }
    const result = await pool.query(`UPDATE v_b_rmm_agents
       SET config = COALESCE(config, '{}'::jsonb) - 'updateRequestedAt' - 'heartbeatRequestedAt',
           updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id, config`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Agent not found or inactive"
      });
    }
    try {
      const actor = await resolveRmmActor(req);
      await logRmmAgentEquipmentActivity(pool, {
        clientId: agent.client_id,
        equipmentName: agent.equipment_name || agent.hostname || agent.machine_id,
        equipmentId: agent.ordinateur_id || null,
        action: "RMM agent update cancelled",
        userId: actor.userId,
        userName: actor.userName,
        details: {
          kind: "rmm_agent_update_cancel",
          event: "cancel",
          source: "console",
          previousVersion: agent.agent_version || null,
          newVersion: WINDOWS_INSTALLER_VERSION,
          hostname: agent.hostname || null,
          machineId: agent.machine_id || null
        }
      });
    } catch (logErr) {
      console.error("[rmm] cancel-update log:", logErr.message);
    }
    res.json({
      ok: true,
      update_requested_at: null
    });
  } catch (err) {
    console.error("[rmm] cancel-update:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.post("/agents/:id/cancel-sync", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE v_b_rmm_agents
       SET config = COALESCE(config, '{}'::jsonb) - 'syncRequestedAt',
           updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id, config, ordinateur_id`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Agent not found or inactive"
      });
    }
    const ordinateurId = result.rows[0].ordinateur_id;
    if (ordinateurId) {
      await pool.query(`UPDATE v_b_clients_m_ordinateurs
         SET data = COALESCE(data, '{}'::jsonb)
           - 'syncRequestedAt'
           - 'sync_requested_at'
           - 'Sync_requested_at'
           - 'SyncRequestedAt',
             updated_at = NOW()
         WHERE id = $1`, [ordinateurId]);
    }
    res.json({
      ok: true,
      sync_requested_at: null
    });
  } catch (err) {
    console.error("[rmm] cancel-sync:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.patch("/agents/:id", verifyJWT, requireAdmin, async (req, res) => {
  try {
    const {
      status
    } = req.body || {};
    if (!["active", "revoked"].includes(status)) {
      return res.status(400).json({
        error: "status invalid (active|revoked)"
      });
    }
    if (status === "active") {
      const existing = await pool.query(`SELECT status FROM v_b_rmm_agents WHERE id = $1 LIMIT 1`, [req.params.id]);
      if (existing.rows[0]?.status !== "active") {
        await assertCommunityRmmAgentLimit(1);
      }
    }
    const result = await pool.query(`UPDATE v_b_rmm_agents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "Agent not found"
      });
    }
    if (status === "revoked") {
      await pool.query(`UPDATE v_b_clients_m_ordinateurs
         SET is_active = false, agent_id = NULL, updated_at = NOW()
         WHERE agent_id = $1`, [req.params.id]);
      await pool.query(`UPDATE v_b_clients_m_servers
         SET agent_id = NULL, updated_at = NOW()
         WHERE agent_id = $1`, [req.params.id]);
      await pool.query(`UPDATE v_b_rmm_agents
         SET ordinateur_id = NULL, serveur_id = NULL, updated_at = NOW()
         WHERE id = $1`, [req.params.id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    console.error("[rmm] patch agent:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/agent/installer-info", verifyJWT, requireAdmin, (_req, res) => {
  try {
    const names = getWindowsInstallerFilenames();
    res.json({
      version: WINDOWS_INSTALLER_VERSION,
      filenames: names,
      msiAvailable: agentMsiAvailable() || process.platform === "win32",
      format: "msi"
    });
  } catch (err) {
    console.error("[rmm] installer-info:", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
router.get("/agent/download/windows", verifyJWT, requireAdmin, (_req, res) => {
  res.status(410).json({
    error: "CMD installer removed — use /rmm/agent/download/windows/msi"
  });
});
router.get("/agent/download/windows/zip", verifyJWT, requireAdmin, (_req, res) => {
  res.status(410).json({
    error: "ZIP installer removed — use /rmm/agent/download/windows/msi"
  });
});
router.get("/agent/download/windows/msi", verifyJWT, requireAdmin, (req, res) => {
  try {
    streamWindowsSetupMsi(res);
  } catch (err) {
    if (!res.headersSent) {
      const status = err.message?.includes("unavailable") || err.message?.includes("WiX") || err.message?.includes("not found") ? 404 : 500;
      console.error("[rmm] download windows msi:", err.message);
      return res.status(status).json({
        error: err.message || "Error during download"
      });
    }
    res.end();
  }
});
router.get("/agent/update/windows/msi", verifyAgentAuth, (req, res) => {
  try {
    streamWindowsAgentUpdateMsi(res);
  } catch (err) {
    if (!res.headersSent) {
      const status = err.message?.includes("unavailable") || err.message?.includes("not found") ? 404 : 500;
      console.error("[rmm] agent self-update msi:", err.message);
      return res.status(status).json({
        error: err.message || "Error during download"
      });
    }
    res.end();
  }
});
export default router;
