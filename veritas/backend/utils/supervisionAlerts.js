import { pool } from "../database/db.js";
import { listCheckmkHistoryItems } from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { ensureSupervisionAlertsSchema } from "../services/ensureSupervisionAlertsSchema.js";
import { formatMonitorIssueLabel } from "./monitorIssueLabel.js";
import {
  SUPERVISION_ALERT_CRITERIA,
  getSupervisionAlertRules,
  isRetiredSupervisionCriterion,
  isSupervisionCriterionEnabled
} from "./supervisionAlertRules.js";
import { getCheckmkMonitoringSettings, isCheckmkSyncStale } from "./checkmkMonitoringSettings.js";
import {
  areMonitoringAlertsEnabled,
  isAlertSuspensionActive,
  resolveAlertStatusFromSettings
} from "./equipmentMonitoringAlerts.js";
import { isClientMonitoringAlertsSuspended } from "./clientMonitoringAlerts.js";

const ACTIVE_STATUSES = new Set(["open", "acked", "linked"]);
const CLOSE_REASONS = new Set(["resolved", "dismissed"]);
/** Avoid reopening the same resolved alert when a sync runs again too soon. */
const ALERT_REOPEN_COOLDOWN_MS = 5 * 60 * 1000;
const CRITERION_LABEL_BY_KEY = new Map(SUPERVISION_ALERT_CRITERIA.map(c => [c.key, c.label]));

function msSince(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}

function sameAlertFingerprint(existingMeta, nextMeta) {
  const a = String(existingMeta?.fingerprint || "").trim();
  const b = String(nextMeta?.fingerprint || "").trim();
  if (!a || !b) return false;
  return a === b;
}

function isBareAlertText(value) {
  return /^(warning|critical|crit|warn|info|monitor_warning|monitor_critical)$/i.test(String(value || "").trim());
}

function isCrypticMonitorTitle(value) {
  // e.g. "Critical - /" left after mangling "Filesystem E:/"
  return /[-–—]\s*\/\s*$/.test(String(value || "").trim());
}

function isRicherAlertText(next, prev) {
  const a = String(next || "").trim();
  const b = String(prev || "").trim();
  if (!a) return false;
  if (!b) return true;
  if (a === b) return false;
  // Correct known mangled labels (e.g. "expirede", "Since le …").
  if (/\bexpirede\b/i.test(b) && !/\bexpirede\b/i.test(a)) return true;
  if (/\bsince\s+le\b/i.test(b) && !/\bsince\s+le\b/i.test(a)) return true;
  if (isBareAlertText(b) && !isBareAlertText(a)) return true;
  if (isCrypticMonitorTitle(b) && !isCrypticMonitorTitle(a)) return true;
  if ((a.includes(" - ") || a.includes(" — ")) && !(b.includes(" - ") || b.includes(" — "))) return true;
  if (a.length >= b.length + 4) return true;
  return false;
}

function criterionDisplayLabel(criterionKey) {
  const key = String(criterionKey || "").trim();
  if (!key) return null;
  return CRITERION_LABEL_BY_KEY.get(key) || key;
}

/** Corrige les titres mangled persistés (expirede / Since le / Maintenance license…). */
export function sanitizeSupervisionAlertTitle(raw) {
  let t = String(raw || "").trim();
  if (!t) return t;
  t = t.replace(/\bexpirede\b/gi, "expirée");
  t = t.replace(/\bSince\s+le\b/g, "depuis le");
  t = t.replace(/\bMaintenance license\b/gi, "Licence de maintenance");
  t = t.replace(/\bLicence maintenance\b/gi, "Licence de maintenance");
  t = t.replace(/\bIP not set\b/gi, "IP non renseignée");
  t = t.replace(/\bNot mapped to (?:CheckMK|supervision)\b/gi, "Non mappé à une supervision");
  t = t.replace(/\bNo monitoring data\b/gi, "Sans données supervision");
  t = t.replace(/\bBattery to replace\b/gi, "Batterie à remplacer");
  t = t.replace(/\bBattery to monitor\b/gi, "Batterie à surveiller");
  t = t.replace(/\s*[—–-]\s*(depuis le)\s+/gi, " $1 ");
  t = t.replace(/\s+[—–-]\s+/g, " — ");
  t = t.replace(/\s{2,}/g, " ").trim();
  if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

function buildMonitoringEventTitle(event) {
  const criterionKey = event?.criterion_key || null;
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const detail = payload.detail && typeof payload.detail === "object" ? payload.detail : payload;
  const baseLabel = criterionDisplayLabel(criterionKey);
  if (criterionKey === "monitor_warning" || criterionKey === "monitor_critical") {
    return formatMonitorIssueLabel(baseLabel || criterionKey, detail);
  }
  if (baseLabel) return baseLabel;
  return event?.event_type || "alert";
}

const ALERT_SELECT_WITH_ACTORS = `
  a.*,
  NULLIF(TRIM(COALESCE(c.name, '')), '') AS client_name,
  COALESCE(NULLIF(TRIM(ack_u.username), ''), NULLIF(TRIM(ack_u.email), '')) AS acked_by_name,
  COALESCE(NULLIF(TRIM(cls_u.username), ''), NULLIF(TRIM(cls_u.email), '')) AS closed_by_name
`;

const ALERT_ACTOR_JOINS = `
  LEFT JOIN v_b_clients c ON c.id = a.client_id
  LEFT JOIN v_b_users ack_u ON ack_u.id = a.acked_by
  LEFT JOIN v_b_users cls_u ON cls_u.id = a.closed_by
`;

function resolveAlertClientName(row) {
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  return String(
    row?.client_name ||
      meta.clientName ||
      meta.client_name ||
      ""
  ).trim() || null;
}

function mapAlert(row) {
  if (!row) return null;
  return {
    id: row.id,
    queueItemId: row.queue_item_id,
    domain: row.domain,
    severity: row.severity,
    clientId: row.client_id,
    clientName: resolveAlertClientName(row),
    equipmentId: row.equipment_id,
    refKey: row.ref_key,
    title: sanitizeSupervisionAlertTitle(row.title),
    subtitle: row.subtitle,
    label: sanitizeSupervisionAlertTitle(row.label || row.title),
    status: row.status,
    ackedAt: row.acked_at,
    ackedBy: row.acked_by,
    ackedByName: row.acked_by_name || null,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closedByName: row.closed_by_name || null,
    closedReason: row.closed_reason,
    linkedTicketId: row.linked_ticket_id,
    linkedTicketKind: row.linked_ticket_kind,
    linkedEventId: row.linked_event_id,
    note: row.note,
    meta: row.meta || {},
    deletedAt: row.deleted_at || null,
    deletedBy: row.deleted_by || null,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clip(value, max) {
  if (value == null) return null;
  const text = String(value);
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    alertId: row.alert_id,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name || null,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    note: row.note,
    meta: row.meta || {},
    createdAt: row.created_at
  };
}

async function insertEvent(client, {
  alertId,
  action,
  actorUserId,
  oldStatus,
  newStatus,
  note,
  meta
}) {
  const result = await client.query(
    `INSERT INTO v_b_supervision_alert_events
      (alert_id, action, actor_user_id, old_status, new_status, note, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      alertId,
      action,
      actorUserId || null,
      oldStatus || null,
      newStatus || null,
      note || null,
      JSON.stringify(meta || {})
    ]
  );
  return mapEvent(result.rows[0]);
}

async function getAlertByQueueItemId(client, queueItemId) {
  const result = await client.query(
    `SELECT * FROM v_b_supervision_alerts WHERE queue_item_id = $1 LIMIT 1`,
    [queueItemId]
  );
  return result.rows[0] || null;
}

function isRetiredIpAlertTitle(title) {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return false;
  return (
    t === "ip not set" ||
    t === "ip non renseignée" ||
    t === "missing ip" ||
    /\bip not set\b/i.test(t) ||
    /\bip non renseignée\b/i.test(t)
  );
}

function isRetiredCentreAlert(alert) {
  if (!alert) return false;
  if (isRetiredSupervisionCriterion(alert.meta?.criterionKey)) return true;
  // Anciennes lignes device-… sans meta.criterionKey (titre seul).
  if (isRetiredIpAlertTitle(alert.title) || isRetiredIpAlertTitle(alert.label)) return true;
  return false;
}

/** Ferme les alertes dont le critère a été retiré du catalogue (ex. missing_ip). */
export async function autoResolveRetiredSupervisionAlerts(alerts = []) {
  const ids = (Array.isArray(alerts) ? alerts : [])
    .filter(isRetiredCentreAlert)
    .map(a => a.queueItemId)
    .filter(Boolean);
  if (!ids.length) return 0;
  return autoResolveSupervisionAlertsByQueueItemIds(ids, {
    reason: "criterion_retired",
    meta: { source: "criterion_retired", retiredCriterion: "missing_ip" }
  });
}

export async function listActiveSupervisionAlerts() {
  await ensureSupervisionAlertsSchema();
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.status = ANY($1)
       AND a.deleted_at IS NULL
     ORDER BY
       CASE a.severity
         WHEN 'critical' THEN 0
         WHEN 'warning' THEN 1
         ELSE 2
       END,
       COALESCE(a.created_at, a.last_seen_at) ASC`,
    [["open", "acked", "linked"]]
  );
  const mapped = result.rows.map(mapAlert).filter(Boolean);
  const retired = mapped.filter(isRetiredCentreAlert);
  if (retired.length) {
    await autoResolveRetiredSupervisionAlerts(retired).catch(() => 0);
  }
  const active = mapped.filter(a => !isRetiredCentreAlert(a));
  return enrichSupervisionAlertsLiveContext(active);
}

function inferLifecycleCriterionKey(alert) {
  const existing = String(alert?.meta?.criterionKey || "").trim();
  if (existing) return existing;
  const t = `${alert?.title || ""} ${alert?.label || ""}`.toLowerCase();
  if (/\bgarantie\b/.test(t) && (/\bbientôt\b/.test(t) || /\bsoon\b/.test(t) || /\bexpire le\b/.test(t))) return "warranty_soon";
  if (/\bgarantie\b/.test(t) && /\bexpir/.test(t)) return "warranty_expired";
  if ((/licence de maintenance|maintenance license/).test(t) && (/\bbientôt\b/.test(t) || /\bsoon\b/.test(t) || /\bexpire le\b/.test(t))) {
    return "maintenance_soon";
  }
  if (/licence de maintenance|maintenance license/.test(t)) return "maintenance_expired";
  if (/\bbatterie\b/.test(t) && /\bsurveiller\b/.test(t)) return "battery_soon";
  if (/\bbatterie\b/.test(t) && (/\bremplacer\b/.test(t) || /\bexpir/.test(t))) return "battery_expired";
  return null;
}

function emaSettingsFromRow(row) {
  if (!row) return null;
  return {
    alertsEnabled: row.alerts_enabled !== false,
    suspensionType: row.suspension_type || null,
    suspendedUntil: row.suspended_until || null,
    suspensionReason: row.suspension_reason || null
  };
}

export async function enrichSupervisionAlertsLiveContext(alerts = []) {
  const list = Array.isArray(alerts) ? alerts.filter(Boolean) : [];
  if (!list.length) return list;

  const equipmentIds = [...new Set(list.map(a => String(a.equipmentId || "").trim()).filter(isUuid))];
  const clientIds = [
    ...new Set(list.map(a => Number(a.clientId)).filter(id => Number.isFinite(id) && id > 0))
  ];

  const [mkSettings, rules, mkRes, emaRes, clientRes, eqRes] = await Promise.all([
    getCheckmkMonitoringSettings().catch(() => null),
    getSupervisionAlertRules().catch(() => null),
    equipmentIds.length
      ? queryOrEmpty(
          `SELECT equipment_id, last_synced_at, checkmk_host_name, checkmk_site
             FROM v_b_equipment_checkmk_monitoring
            WHERE equipment_id = ANY($1::uuid[])`,
          [equipmentIds]
        )
      : { rows: [] },
    equipmentIds.length
      ? queryOrEmpty(
          `SELECT client_id, equipment_id, equipment_family, alerts_enabled,
                  suspension_type, suspended_until, suspension_reason
             FROM v_b_equipment_monitoring_alerts
            WHERE equipment_id = ANY($1::uuid[])`,
          [equipmentIds]
        )
      : { rows: [] },
    clientIds.length
      ? queryOrEmpty(
          `SELECT id,
                  monitoring_alerts_suspension_type,
                  monitoring_alerts_suspended_until,
                  monitoring_alerts_suspension_reason
             FROM v_b_clients
            WHERE id = ANY($1::bigint[])`,
          [clientIds]
        )
      : { rows: [] },
    equipmentIds.length
      ? queryOrEmpty(
          `SELECT id,
                  COALESCE(NULLIF(TRIM(data->>'ip'), ''), '') AS ip,
                  COALESCE(
                    NULLIF(TRIM(data->>'nom'), ''),
                    NULLIF(TRIM(data->>'name'), ''),
                    NULLIF(TRIM(name), ''),
                    NULLIF(TRIM(item_key), ''),
                    ''
                  ) AS display_name,
                  COALESCE(
                    NULLIF(TRIM(data->>'numeroSerie'), ''),
                    NULLIF(TRIM(data->>'serial'), ''),
                    NULLIF(TRIM(data->>'sn'), ''),
                    ''
                  ) AS serial,
                  COALESCE(
                    NULLIF(TRIM(data->>'adresseMac'), ''),
                    NULLIF(TRIM(data->>'mac'), ''),
                    ''
                  ) AS mac,
                  COALESCE(
                    NULLIF(TRIM(data->>'modele'), ''),
                    NULLIF(TRIM(data->>'model'), ''),
                    ''
                  ) AS model
             FROM v_b_clients_m_custom_equipment
            WHERE id = ANY($1::uuid[])`,
          [equipmentIds]
        )
      : { rows: [] }
  ]);

  const mkByEq = new Map(
    (mkRes.rows || []).map(row => [String(row.equipment_id), row])
  );
  const emaByEqClient = new Map();
  for (const row of emaRes.rows || []) {
    emaByEqClient.set(`${row.client_id}:${row.equipment_id}`, row);
  }
  const clientById = new Map((clientRes.rows || []).map(row => [Number(row.id), row]));
  const eqById = new Map((eqRes.rows || []).map(row => [String(row.id), row]));

  return list.map(alert => {
    const eqId = String(alert.equipmentId || "").trim();
    const mk = mkByEq.get(eqId);
    const eq = eqById.get(eqId);
    const ema = emaByEqClient.get(`${alert.clientId}:${eqId}`) || null;
    const clientRow = clientById.get(Number(alert.clientId));
    const eqSettings = emaSettingsFromRow(ema);
    const clientSuspended = isClientMonitoringAlertsSuspended({
      suspensionType: clientRow?.monitoring_alerts_suspension_type || null,
      suspendedUntil: clientRow?.monitoring_alerts_suspended_until || null
    });
    const eqMuted = eqSettings ? !areMonitoringAlertsEnabled(eqSettings) : false;
    const muted = Boolean(clientSuspended || eqMuted);
    let muteStatus = "active";
    if (clientSuspended) muteStatus = "client_suspended";
    else if (eqSettings) muteStatus = resolveAlertStatusFromSettings(eqSettings);
    const lastSyncedAt = mk?.last_synced_at || alert.meta?.lastSyncedAt || null;
    const stale = lastSyncedAt
      ? isCheckmkSyncStale(lastSyncedAt, mkSettings?.staleAfterMs)
      : true;
    const family = String(alert.meta?.family || ema?.equipment_family || "").trim() || null;
    const criterionKey = inferLifecycleCriterionKey(alert);
    const ruleEnabled =
      family && criterionKey && rules
        ? isSupervisionCriterionEnabled(family, criterionKey, rules)
        : null;
    const ip = eq?.ip || alert.meta?.ip || null;
    const serial = eq?.serial || alert.meta?.serial || null;
    const mac = eq?.mac || alert.meta?.mac || null;
    const model = eq?.model || alert.meta?.model || null;
    const equipmentName =
      alert.meta?.equipmentName ||
      eq?.display_name ||
      null;
    return {
      ...alert,
      lastSyncedAt,
      stale,
      freshnessMinutes: lastSyncedAt
        ? Math.max(0, Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / 60000))
        : null,
      hostName: alert.meta?.hostName || mk?.checkmk_host_name || null,
      checkmkSite: mk?.checkmk_site || null,
      ip: ip || null,
      serial: serial || null,
      mac: mac || null,
      model: model || null,
      muted,
      muteStatus,
      mutedUntil: eqSettings?.suspendedUntil || clientRow?.monitoring_alerts_suspended_until || null,
      muteReason:
        eqSettings?.suspensionReason ||
        clientRow?.monitoring_alerts_suspension_reason ||
        null,
      family,
      ruleEnabled,
      eqAlertsEnabled: eqSettings == null ? true : eqSettings.alertsEnabled !== false,
      eqSuspended: isAlertSuspensionActive(eqSettings),
      meta: {
        ...(alert.meta && typeof alert.meta === "object" ? alert.meta : {}),
        ...(equipmentName && !alert.meta?.equipmentName ? { equipmentName } : {}),
        ...(ip && !alert.meta?.ip ? { ip } : {})
      }
    };
  });
}

export async function getSupervisionAlertById(alertId) {
  await ensureSupervisionAlertsSchema();
  const id = String(alertId || "").trim();
  if (!isUuid(id)) return null;
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.id = $1::uuid
     LIMIT 1`,
    [id]
  );
  const mapped = mapAlert(result.rows[0]);
  if (!mapped) return null;
  const [enriched] = await enrichSupervisionAlertsLiveContext([mapped]);
  return enriched || mapped;
}

export async function getSupervisionAlertDiagnostic(alertId) {
  const alert = await getSupervisionAlertById(alertId);
  if (!alert) return null;
  const events = await getSupervisionAlertEvents(alertId);
  const criterionKey = alert.meta?.criterionKey || null;
  const serviceName = alert.meta?.serviceName || alert.meta?.primaryService || null;
  const lastAction = events[0] || null;
  const whyOpen = [
    serviceName
      ? `Service CheckMK « ${serviceName} » en ${alert.severity || "alerte"}`
      : `Alerte ${alert.severity || ""}`.trim(),
    criterionKey ? `règle ${criterionKey}` : null,
    alert.ruleEnabled === false ? "règle actuellement désactivée" : null,
    alert.stale ? "snapshot CheckMK périmé" : null,
    alert.muted ? `alertes fiche : ${alert.muteStatus}` : null
  ]
    .filter(Boolean)
    .join(" · ");
  const whyClosed =
    alert.status === "closed"
      ? [
          lastAction?.action || alert.closedReason || "closed",
          lastAction?.note || null,
          alert.meta?.autoResolved ? "auto-resolve (retour OK)" : null
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  return {
    alert,
    events,
    diagnostic: {
      serviceName,
      hostName: alert.hostName || alert.meta?.hostName || null,
      checkmkSite: alert.checkmkSite || null,
      family: alert.family || alert.meta?.family || null,
      criterionKey,
      fingerprint: alert.meta?.fingerprint || null,
      lastSyncedAt: alert.lastSyncedAt || null,
      stale: Boolean(alert.stale),
      ruleEnabled: alert.ruleEnabled,
      muteStatus: alert.muteStatus,
      mutedUntil: alert.mutedUntil,
      muteReason: alert.muteReason,
      pluginOutput: alert.meta?.pluginOutput || null,
      source: alert.meta?.source || null,
      whyOpen,
      whyClosed,
      lastAction: lastAction
        ? {
            action: lastAction.action,
            at: lastAction.createdAt,
            actor: lastAction.actorName || null,
            note: lastAction.note || null
          }
        : null
    }
  };
}

export async function listOpenSupervisionAlertsForEquipment(equipmentId) {
  await ensureSupervisionAlertsSchema();
  const id = String(equipmentId || "").trim();
  if (!id) return [];
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.equipment_id = $1
       AND a.status = ANY($2)
       AND a.deleted_at IS NULL
     ORDER BY a.updated_at DESC`,
    [id, ["open", "acked", "linked"]]
  );
  return result.rows.map(mapAlert);
}

/**
 * Ferme automatiquement des alertes encore actives (retour OK côté monitoring).
 * Ne touche pas aux alertes dismiss manuellement déjà closed.
 */
export async function autoResolveSupervisionAlertsByQueueItemIds(queueItemIds = [], {
  reason = "monitoring_ok",
  meta = {}
} = {}) {
  await ensureSupervisionAlertsSchema();
  const ids = [...new Set(
    (Array.isArray(queueItemIds) ? queueItemIds : [])
      .map(id => String(id || "").trim())
      .filter(Boolean)
  )];
  if (!ids.length) return 0;

  const client = await pool.connect();
  let resolved = 0;
  try {
    await client.query("BEGIN");
    const open = await client.query(
      `SELECT * FROM v_b_supervision_alerts
        WHERE queue_item_id = ANY($1::text[])
          AND status = ANY($2::text[])
          AND deleted_at IS NULL`,
      [ids, ["open", "acked", "linked"]]
    );
    for (const row of open.rows) {
      const updated = await client.query(
        `UPDATE v_b_supervision_alerts
            SET status = 'closed',
                closed_at = NOW(),
                closed_by = NULL,
                closed_reason = 'resolved',
                note = COALESCE(note, $2),
                meta = COALESCE(meta, '{}'::jsonb) || $3::jsonb,
                updated_at = NOW()
          WHERE id = $1::uuid
          RETURNING *`,
        [
          row.id,
          `Auto-resolved (${reason})`,
          JSON.stringify({
            ...(meta && typeof meta === "object" ? meta : {}),
            autoResolved: true,
            autoResolveReason: reason
          })
        ]
      );
      const next = updated.rows[0];
      if (!next) continue;
      await insertEvent(client, {
        alertId: next.id,
        action: "resolved",
        actorUserId: null,
        oldStatus: row.status,
        newStatus: "closed",
        note: `Auto-resolved (${reason})`,
        meta: { source: "auto_resolve", reason }
      });
      resolved += 1;
      broadcastSupervisionAlertUpdate({
        type: "alert",
        action: "resolved",
        alert: mapAlert(next),
        event: null,
        actorUserId: null
      });
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return resolved;
}

/**
 * Persist live queue items the first time they appear in the centre.
 * created_at stays the raise time; existing rows (incl. closed) are left untouched.
 */
export async function ensureSupervisionAlertsSeen(items = []) {
  await ensureSupervisionAlertsSchema();
  const normalized = [];
  const seenIds = new Set();
  for (const raw of Array.isArray(items) ? items : []) {
    const queueItemId = String(raw?.queueItemId || raw?.queue_item_id || raw?.id || "").trim();
    const domain = String(raw?.domain || "").trim();
    if (!queueItemId || !domain || seenIds.has(queueItemId)) continue;
    const probeMeta = raw?.meta && typeof raw.meta === "object" ? raw.meta : {};
    if (
      isRetiredSupervisionCriterion(probeMeta.criterionKey) ||
      isRetiredIpAlertTitle(raw?.title) ||
      isRetiredIpAlertTitle(raw?.label)
    ) {
      continue;
    }
    seenIds.add(queueItemId);
    const clientName = String(
      raw?.clientName ||
        raw?.client_name ||
        raw?.equipment?.clientName ||
        raw?.meta?.clientName ||
        ""
    ).trim();
    const baseMeta = raw?.meta && typeof raw.meta === "object" ? { ...raw.meta } : {};
    if (clientName && !baseMeta.clientName) baseMeta.clientName = clientName;
    const raisedAtRaw =
      raw?.raisedAt ||
      raw?.raised_at ||
      baseMeta.checkmkAlertAt ||
      baseMeta.raisedAt ||
      null;
    let raisedAt = null;
    if (raisedAtRaw) {
      const ms = typeof raisedAtRaw === "number"
        ? (raisedAtRaw < 1e12 ? raisedAtRaw * 1000 : raisedAtRaw)
        : new Date(raisedAtRaw).getTime();
      if (Number.isFinite(ms) && ms > 0) {
        raisedAt = new Date(ms).toISOString();
        if (!baseMeta.checkmkAlertAt) baseMeta.checkmkAlertAt = raisedAt;
      }
    }
    normalized.push({
      queueItemId,
      domain,
      severity: raw?.severity || null,
      clientId: raw?.clientId ?? raw?.client_id ?? raw?.equipment?.clientId ?? null,
      equipmentId: raw?.equipmentId ?? raw?.equipment_id ?? null,
      refKey: raw?.refKey ?? raw?.ref_key ?? null,
      title: clip(raw?.title, 255),
      subtitle: raw?.subtitle || null,
      label: clip(raw?.label, 255),
      raisedAt,
      meta: baseMeta
    });
    if (normalized.length >= 500) break;
  }
  if (!normalized.length) return [];

  const ids = normalized.map(item => item.queueItemId);
  const existing = await listSupervisionAlertsByQueueItemIds(ids, { includeDeleted: true });
  const existingById = new Map(existing.map(alert => [alert.queueItemId, alert]));
  const missing = normalized.filter(item => !existingById.has(item.queueItemId));
  const reopenable = normalized.filter(item => {
    const alert = existingById.get(item.queueItemId);
    if (!alert) return false;
    if (alert.deletedAt) {
      return msSince(alert.deletedAt) >= ALERT_REOPEN_COOLDOWN_MS;
    }
    if (alert?.status === "closed" && alert?.closedReason === "resolved") {
      // Same issue coming back immediately after resolve/sync → keep it closed.
      if (sameAlertFingerprint(alert.meta, item.meta) && msSince(alert.closedAt || alert.lastSeenAt) < ALERT_REOPEN_COOLDOWN_MS) {
        return false;
      }
      return msSince(alert.closedAt) >= ALERT_REOPEN_COOLDOWN_MS;
    }
    return false;
  });
  const enrichable = normalized.filter(item => {
    const alert = existingById.get(item.queueItemId);
    if (!alert || alert.deletedAt || !ACTIVE_STATUSES.has(alert.status)) return false;
    const incomingAlertAt = String(item.raisedAt || item.meta?.checkmkAlertAt || "").trim();
    const existingAlertAt = String(alert.meta?.checkmkAlertAt || "").trim();
    const alertAtChanged = Boolean(incomingAlertAt && incomingAlertAt !== existingAlertAt);
    // Touch last_seen even when text is identical so the row stays warm.
    if (sameAlertFingerprint(alert.meta, item.meta) && !alertAtChanged && msSince(alert.lastSeenAt) < 30 * 1000) {
      return false;
    }
    return (
      alertAtChanged ||
      isRicherAlertText(item.title, alert.title) ||
      isRicherAlertText(item.label, alert.label) ||
      isRicherAlertText(item.subtitle, alert.subtitle) ||
      String(item.severity || "") !== String(alert.severity || "") ||
      String(item.meta?.fingerprint || "") !== String(alert.meta?.fingerprint || "") ||
      msSince(alert.lastSeenAt) >= 30 * 1000
    );
  });

  if (!missing.length && !reopenable.length && !enrichable.length) {
    return existing.filter(alert => !alert.deletedAt);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of missing) {
      const insert = await client.query(
        `INSERT INTO v_b_supervision_alerts
          (queue_item_id, domain, severity, client_id, equipment_id, ref_key, title, subtitle, label, status, meta, last_seen_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10::jsonb, NOW(), COALESCE($11::timestamptz, NOW()))
         ON CONFLICT (queue_item_id) DO NOTHING
         RETURNING *`,
        [
          item.queueItemId,
          item.domain,
          item.severity,
          item.clientId || null,
          item.equipmentId ? String(item.equipmentId) : null,
          item.refKey || null,
          item.title,
          item.subtitle,
          item.label,
          JSON.stringify(item.meta || {}),
          item.raisedAt || null
        ]
      );
      const row = insert.rows[0];
      if (!row) continue;
      await insertEvent(client, {
        alertId: row.id,
        action: "opened",
        actorUserId: null,
        oldStatus: null,
        newStatus: "open",
        note: null,
        meta: { source: "seen" }
      });
    }
    for (const item of reopenable) {
      const current = existingById.get(item.queueItemId);
      if (!current?.id) continue;
      const updated = await client.query(
        `UPDATE v_b_supervision_alerts
         SET status = 'open',
             severity = COALESCE($2, severity),
             title = COALESCE($3, title),
             subtitle = COALESCE($4, subtitle),
             label = COALESCE($5, label),
             meta = COALESCE(meta, '{}'::jsonb) || COALESCE($6::jsonb, '{}'::jsonb),
             created_at = COALESCE($7::timestamptz, created_at),
             closed_at = NULL,
             closed_by = NULL,
             closed_reason = NULL,
             acked_at = NULL,
             acked_by = NULL,
             deleted_at = NULL,
             deleted_by = NULL,
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [current.id, item.severity, item.title, item.subtitle, item.label, JSON.stringify(item.meta || {}), item.raisedAt || null]
      );
      const row = updated.rows[0];
      if (!row) continue;
      await insertEvent(client, {
        alertId: row.id,
        action: "reopened",
        actorUserId: null,
        oldStatus: current.status,
        newStatus: "open",
        note: null,
        meta: { source: "seen", reason: current.deletedAt ? "restored_from_trash" : "issue_recurring" }
      });
    }
    for (const item of enrichable) {
      const current = existingById.get(item.queueItemId);
      if (!current?.id) continue;
      const nextTitle = isRicherAlertText(item.title, current.title) ? item.title : current.title;
      const nextLabel = isRicherAlertText(item.label, current.label) ? item.label : current.label;
      const nextSubtitle = isRicherAlertText(item.subtitle, current.subtitle) ? item.subtitle : current.subtitle;
      await client.query(
        `UPDATE v_b_supervision_alerts
         SET title = COALESCE($2, title),
             subtitle = COALESCE($3, subtitle),
             label = COALESCE($4, label),
             severity = COALESCE($5, severity),
             meta = COALESCE(meta, '{}'::jsonb) || COALESCE($6::jsonb, '{}'::jsonb),
             created_at = COALESCE($8::timestamptz, created_at),
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE id = $1::uuid
           AND status = ANY($7::text[])`,
        [
          current.id,
          nextTitle,
          nextSubtitle,
          nextLabel,
          item.severity,
          JSON.stringify(item.meta || {}),
          [...ACTIVE_STATUSES],
          item.raisedAt || null
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return listSupervisionAlertsByQueueItemIds(ids);
}

/** All persisted states (incl. closed) for the given queue item ids — used to hide dismissed/resolved alerts. */
export async function listSupervisionAlertsByQueueItemIds(queueItemIds = [], { includeDeleted = false } = {}) {
  await ensureSupervisionAlertsSchema();
  const ids = [...new Set((Array.isArray(queueItemIds) ? queueItemIds : []).map(id => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return [];
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.queue_item_id = ANY($1::text[])
       ${includeDeleted ? "" : "AND a.deleted_at IS NULL"}
     ORDER BY a.updated_at DESC`,
    [ids]
  );
  return result.rows.map(mapAlert);
}

export async function listSupervisionAlertHistory({
  limit = 100,
  offset = 0,
  domain = null,
  status = null,
  query = null,
  equipmentId = null,
  clientId = null,
  trash = false
} = {}) {
  await ensureSupervisionAlertsSchema();
  const params = [];
  const where = [];

  const inTrash = trash === true || trash === "1" || trash === "true";
  if (inTrash) {
    where.push("a.deleted_at IS NOT NULL");
  } else {
    where.push("a.deleted_at IS NULL");
  }

  const statusRaw = status == null ? "" : String(status).trim().toLowerCase();
  if (statusRaw && statusRaw !== "all" && statusRaw !== "*") {
    params.push(statusRaw);
    where.push(`a.status = $${params.length}`);
  } else if (!statusRaw && !inTrash) {
    // Default history: closed + currently handled (acked/linked)
    params.push(["acked", "linked", "closed"]);
    where.push(`a.status = ANY($${params.length})`);
  }

  if (domain) {
    params.push(domain);
    where.push(`a.domain = $${params.length}`);
  }
  if (equipmentId) {
    params.push(String(equipmentId));
    where.push(`(
      LOWER(TRIM(a.equipment_id)) = LOWER(TRIM($${params.length}))
      OR LOWER(TRIM(a.equipment_id)) LIKE '%:' || LOWER(TRIM($${params.length}))
      OR LOWER(TRIM(COALESCE(a.ref_key, ''))) = LOWER(TRIM($${params.length}))
    )`);
  }
  if (clientId != null && clientId !== "") {
    params.push(Number(clientId));
    where.push(`a.client_id = $${params.length}`);
  }
  const searchTokens = String(query || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  for (const token of searchTokens) {
    params.push(`%${token}%`);
    const p = `$${params.length}`;
    where.push(
      `(LOWER(COALESCE(a.title, '')) LIKE ${p}
        OR LOWER(COALESCE(a.subtitle, '')) LIKE ${p}
        OR LOWER(COALESCE(a.label, '')) LIKE ${p}
        OR LOWER(COALESCE(a.queue_item_id, '')) LIKE ${p}
        OR LOWER(COALESCE(a.equipment_id, '')) LIKE ${p}
        OR LOWER(COALESCE(a.ref_key, '')) LIKE ${p}
        OR LOWER(COALESCE(a.note, '')) LIKE ${p}
        OR LOWER(COALESCE(a.severity, '')) LIKE ${p}
        OR LOWER(COALESCE(a.status, '')) LIKE ${p}
        OR LOWER(COALESCE(a.linked_ticket_id::text, '')) LIKE ${p}
        OR LOWER(COALESCE(a.linked_ticket_kind, '')) LIKE ${p}
        OR LOWER(COALESCE(c.name, '')) LIKE ${p}
        OR LOWER(COALESCE(ack_u.username, '')) LIKE ${p}
        OR LOWER(COALESCE(ack_u.email, '')) LIKE ${p}
        OR LOWER(COALESCE(cls_u.username, '')) LIKE ${p}
        OR LOWER(COALESCE(cls_u.email, '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'clientName', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'equipmentName', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'hostName', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'serviceName', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'serviceKey', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'pluginOutput', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'criterionKey', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'family', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'fingerprint', '')) LIKE ${p}
        OR LOWER(COALESCE(a.meta->>'ip', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'ip', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'nom', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'name', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.name, '')) LIKE ${p}
        OR LOWER(COALESCE(ce.item_key, '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'numeroSerie', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'serial', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'adresseMac', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'mac', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'modele', '')) LIKE ${p}
        OR LOWER(COALESCE(ce.data->>'model', '')) LIKE ${p}
        OR LOWER(COALESCE(mk.checkmk_host_name, '')) LIKE ${p}
        OR LOWER(COALESCE(mk.checkmk_site, '')) LIKE ${p})`
    );
  }

  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  params.push(lim);
  params.push(off);

  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     LEFT JOIN v_b_clients_m_custom_equipment ce
       ON a.equipment_id IS NOT NULL
      AND ce.id::text = TRIM(a.equipment_id)
     LEFT JOIN v_b_equipment_checkmk_monitoring mk
       ON a.equipment_id IS NOT NULL
      AND mk.equipment_id::text = TRIM(a.equipment_id)
     WHERE ${where.length ? where.join(" AND ") : "TRUE"}
     ORDER BY COALESCE(a.deleted_at, a.closed_at, a.updated_at, a.created_at) DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows.map(mapAlert);
}

function inferCriterionSeverity(criterionKey) {
  const key = String(criterionKey || "").trim().toLowerCase();
  if (["monitor_critical", "agent_offline", "disk_critical", "maintenance_expired", "battery_expired", "warranty_expired"].includes(key)) {
    return "critical";
  }
  if (["monitor_warning", "disk_warn", "updates_pending", "warranty_soon", "maintenance_soon", "battery_soon", "unmapped", "no_data"].includes(key)) {
    return "warning";
  }
  return "info";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

async function queryOrEmpty(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    if (err?.code === "42P01") return { rows: [] };
    throw err;
  }
}

/**
 * Unified recent alerts for an equipment detail history (same sources as inventory 30-day count).
 */
export async function listRecentEquipmentAlerts({
  equipmentId,
  limit = 50,
  days = 30
} = {}) {
  const id = String(equipmentId || "").trim();
  if (!id) return [];

  const token = id.toLowerCase();
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sinceDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  await ensureSupervisionAlertsSchema();

  const supervision = await queryOrEmpty(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.created_at >= NOW() - ($2::int * INTERVAL '1 day')
       AND a.deleted_at IS NULL
       AND NULLIF(TRIM(a.equipment_id), '') IS NOT NULL
       AND (
         LOWER(TRIM(a.equipment_id)) = $1
         OR LOWER(TRIM(a.equipment_id)) LIKE '%:' || $1
         OR LOWER(TRIM(COALESCE(a.ref_key, ''))) = $1
       )
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [token, sinceDays, lim]
  );

  let monitoringRows = [];
  if (isUuid(token)) {
    const monitoring = await queryOrEmpty(
      `SELECT *
       FROM v_b_monitoring_events
       WHERE created_at >= NOW() - ($2::int * INTERVAL '1 day')
         AND equipment_id IS NOT NULL
         AND LOWER(equipment_id::text) = $1
       ORDER BY created_at DESC
       LIMIT $3`,
      [token, sinceDays, lim]
    );
    monitoringRows = monitoring.rows || [];
  }

  const items = [];

  for (const row of supervision.rows || []) {
    const alert = mapAlert(row);
    items.push({
      id: `sup-${alert.id}`,
      source: "supervision",
      title: alert.title || alert.label || alert.queueItemId,
      subtitle: alert.subtitle || null,
      typeKey: alert.label || alert.domain || null,
      typeKind: "label",
      domain: alert.domain || null,
      criterionKey: null,
      eventType: null,
      severity: alert.severity || "warning",
      status: alert.status || "open",
      at: alert.createdAt || alert.updatedAt || alert.closedAt || null,
      ticketId: alert.linkedTicketId || null
    });
  }

  for (const event of monitoringRows) {
    const criterionKey = event.criterion_key || null;
    const eventType = event.event_type || null;
    const resolved = String(eventType || "").includes("resolved");
    const explicitTitle = buildMonitoringEventTitle(event);
    items.push({
      id: `mon-${event.id}`,
      source: "monitoring",
      title: explicitTitle,
      subtitle: null,
      typeKey: criterionKey || eventType,
      typeKind: criterionKey ? "criterion" : "event",
      domain: "devices",
      criterionKey,
      eventType,
      severity: inferCriterionSeverity(criterionKey),
      status: resolved ? "closed" : event.status === "pending" ? "open" : event.status || "open",
      at: event.created_at || null,
      ticketId: event.ticket_id || null
    });
  }

  if (isUuid(token)) {
    const mk = await queryOrEmpty(
      `SELECT monitoring_data
       FROM v_b_equipment_checkmk_monitoring
       WHERE equipment_id = $1::uuid
       LIMIT 1`,
      [token]
    );
    const monitoringData = mk.rows?.[0]?.monitoring_data || null;
    for (const row of listCheckmkHistoryItems(monitoringData, { days: sinceDays, limit: lim })) {
      items.push(row);
    }
  }

  items.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });

  return items.slice(0, lim);
}

export async function getSupervisionAlertEvents(alertId) {
  await ensureSupervisionAlertsSchema();
  const result = await pool.query(
    `SELECT e.*,
            COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.email), '')) AS actor_name
     FROM v_b_supervision_alert_events e
     LEFT JOIN v_b_users u ON u.id = e.actor_user_id
     WHERE e.alert_id = $1
     ORDER BY e.created_at DESC`,
    [alertId]
  );
  return result.rows.map(mapEvent);
}

export async function upsertAndActOnSupervisionAlert({
  queueItemId,
  domain,
  severity,
  clientId,
  equipmentId,
  refKey,
  title,
  subtitle,
  label,
  meta,
  action,
  note,
  actorUserId,
  linkedTicketId,
  linkedTicketKind,
  linkedEventId,
  closedReason
}) {
  await ensureSupervisionAlertsSchema();
  if (!queueItemId) throw new Error("queueItemId required");
  if (!action) throw new Error("action required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let row = await getAlertByQueueItemId(client, queueItemId);
    const now = new Date();
    const resolvedDomain = domain || row?.domain || null;
    if (!resolvedDomain) throw new Error("domain required");

    const incomingMeta = meta && typeof meta === "object" ? { ...meta } : {};
    const clientNameFromMeta = String(incomingMeta.clientName || incomingMeta.client_name || "").trim();
    if (clientNameFromMeta) incomingMeta.clientName = clientNameFromMeta;
    const metaJson = Object.keys(incomingMeta).length ? JSON.stringify(incomingMeta) : null;

    if (!row) {
      const insert = await client.query(
        `INSERT INTO v_b_supervision_alerts
          (queue_item_id, domain, severity, client_id, equipment_id, ref_key, title, subtitle, label, status, meta, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10::jsonb, NOW())
         RETURNING *`,
        [
          queueItemId,
          resolvedDomain,
          severity || null,
          clientId || null,
          equipmentId ? String(equipmentId) : null,
          refKey || null,
          title || null,
          subtitle || null,
          label || null,
          JSON.stringify(incomingMeta)
        ]
      );
      row = insert.rows[0];
      await insertEvent(client, {
        alertId: row.id,
        action: "opened",
        actorUserId,
        oldStatus: null,
        newStatus: "open",
        note: null,
        meta: { source: "upsert" }
      });
    } else {
      const existingMeta = row.meta && typeof row.meta === "object" ? row.meta : {};
      const mergedMeta = {
        ...existingMeta,
        ...incomingMeta
      };
      if (clientNameFromMeta) mergedMeta.clientName = clientNameFromMeta;
      else if (existingMeta.clientName && !mergedMeta.clientName) mergedMeta.clientName = existingMeta.clientName;
      await client.query(
        `UPDATE v_b_supervision_alerts SET
          severity = COALESCE($2, severity),
          client_id = COALESCE($3, client_id),
          equipment_id = COALESCE($4, equipment_id),
          ref_key = COALESCE($5, ref_key),
          title = COALESCE($6, title),
          subtitle = COALESCE($7, subtitle),
          label = COALESCE($8, label),
          meta = CASE WHEN $9::text IS NULL THEN meta ELSE $9::jsonb END,
          last_seen_at = NOW(),
          updated_at = NOW()
         WHERE id = $1`,
        [
          row.id,
          severity || null,
          clientId || null,
          equipmentId ? String(equipmentId) : null,
          refKey || null,
          title || null,
          subtitle || null,
          label || null,
          metaJson ? JSON.stringify(mergedMeta) : null
        ]
      );
      const refreshed = await client.query(`SELECT * FROM v_b_supervision_alerts WHERE id = $1`, [row.id]);
      row = refreshed.rows[0];
    }

    const oldStatus = row.status;
    let newStatus = oldStatus;
    let eventAction = action;
    const patch = {
      updated_at: now
    };

    if (action === "ack") {
      newStatus = oldStatus === "linked" ? "linked" : "acked";
      patch.status = newStatus;
      patch.acked_at = now;
      patch.acked_by = actorUserId || null;
      if (note) patch.note = note;
    } else if (action === "unack") {
      if (oldStatus === "closed") throw new Error("Cannot unack a closed alert");
      newStatus = "open";
      patch.status = newStatus;
      patch.acked_at = null;
      patch.acked_by = null;
    } else if (action === "link") {
      newStatus = "linked";
      patch.status = newStatus;
      if (!row.acked_at) {
        patch.acked_at = now;
        patch.acked_by = actorUserId || null;
      }
      if (linkedTicketId) patch.linked_ticket_id = String(linkedTicketId);
      if (linkedTicketKind) patch.linked_ticket_kind = String(linkedTicketKind);
      if (linkedEventId) patch.linked_event_id = String(linkedEventId);
      if (note) patch.note = note;
    } else if (action === "resolve" || action === "dismiss") {
      newStatus = "closed";
      patch.status = newStatus;
      patch.closed_at = now;
      patch.closed_by = actorUserId || null;
      patch.closed_reason = CLOSE_REASONS.has(closedReason)
        ? closedReason
        : action === "dismiss"
          ? "dismissed"
          : "resolved";
      if (note) patch.note = note;
      eventAction = action === "dismiss" ? "dismissed" : "resolved";
    } else if (action === "reopen") {
      newStatus = "open";
      patch.status = newStatus;
      patch.closed_at = null;
      patch.closed_by = null;
      patch.closed_reason = null;
      patch.acked_at = null;
      patch.acked_by = null;
      patch.deleted_at = null;
      patch.deleted_by = null;
    } else if (action === "note") {
      if (note) patch.note = note;
      eventAction = "note";
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const sets = [];
    const values = [row.id];
    const add = (col, val) => {
      values.push(val);
      sets.push(`${col} = $${values.length}`);
    };
    Object.entries(patch).forEach(([key, val]) => {
      if (key === "updated_at") {
        sets.push("updated_at = NOW()");
        return;
      }
      add(key, val);
    });

    const updated = await client.query(
      `UPDATE v_b_supervision_alerts SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      values
    );
    row = updated.rows[0];

    const event = await insertEvent(client, {
      alertId: row.id,
      action: eventAction,
      actorUserId,
      oldStatus,
      newStatus: row.status,
      note: note || null,
      meta: {
        linkedTicketId: linkedTicketId || null,
        linkedTicketKind: linkedTicketKind || null,
        linkedEventId: linkedEventId || null,
        closedReason: patch.closed_reason || null
      }
    });

    const enriched = await client.query(
      `SELECT ${ALERT_SELECT_WITH_ACTORS}
       FROM v_b_supervision_alerts a
       ${ALERT_ACTOR_JOINS}
       WHERE a.id = $1`,
      [row.id]
    );
    row = enriched.rows[0] || row;

    await client.query("COMMIT");
    const result = {
      alert: mapAlert(row),
      event
    };
    broadcastSupervisionAlertUpdate({
      type: "alert",
      action: eventAction,
      alert: result.alert,
      event: result.event,
      actorUserId: actorUserId || null
    });
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const streamClients = new Set();

export function addSupervisionAlertStreamClient(res) {
  streamClients.add(res);
}

export function removeSupervisionAlertStreamClient(res) {
  streamClients.delete(res);
}

export function broadcastSupervisionAlertUpdate(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of streamClients) {
    try {
      client.write(data);
    } catch {
      streamClients.delete(client);
    }
  }
}

export function broadcastSupervisionAlertHeartbeat() {
  broadcastSupervisionAlertUpdate({
    type: "heartbeat",
    at: new Date().toISOString()
  });
}

async function getAlertRowById(alertId) {
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.id = $1::uuid
     LIMIT 1`,
    [alertId]
  );
  return result.rows[0] || null;
}

export async function trashSupervisionAlert({ alertId, queueItemId, actorUserId }) {
  await ensureSupervisionAlertsSchema();
  let row = null;
  if (alertId) {
    row = await getAlertRowById(alertId);
  } else if (queueItemId) {
    const result = await pool.query(
      `SELECT ${ALERT_SELECT_WITH_ACTORS}
       FROM v_b_supervision_alerts a
       ${ALERT_ACTOR_JOINS}
       WHERE a.queue_item_id = $1
       LIMIT 1`,
      [queueItemId]
    );
    row = result.rows[0] || null;
  }
  if (!row) throw new Error("Alert not found");
  if (row.deleted_at) {
    return { alert: mapAlert(row) };
  }
  const updated = await pool.query(
    `UPDATE v_b_supervision_alerts
     SET deleted_at = NOW(),
         deleted_by = $2,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id`,
    [row.id, actorUserId || null]
  );
  if (!updated.rows[0]) throw new Error("Alert not found");
  await pool.query(
    `INSERT INTO v_b_supervision_alert_events
      (alert_id, action, actor_user_id, old_status, new_status, note, meta)
     VALUES ($1, 'trashed', $2, $3, $3, NULL, '{}'::jsonb)`,
    [row.id, actorUserId || null, row.status]
  );
  const fresh = await getAlertRowById(row.id);
  const alert = mapAlert(fresh);
  broadcastSupervisionAlertUpdate({
    type: "alert",
    action: "trashed",
    alert,
    actorUserId: actorUserId || null
  });
  return { alert };
}

export async function restoreSupervisionAlert({ alertId, queueItemId, actorUserId }) {
  await ensureSupervisionAlertsSchema();
  let row = null;
  if (alertId) {
    row = await getAlertRowById(alertId);
  } else if (queueItemId) {
    const result = await pool.query(
      `SELECT ${ALERT_SELECT_WITH_ACTORS}
       FROM v_b_supervision_alerts a
       ${ALERT_ACTOR_JOINS}
       WHERE a.queue_item_id = $1
       LIMIT 1`,
      [queueItemId]
    );
    row = result.rows[0] || null;
  }
  if (!row) throw new Error("Alert not found");
  if (!row.deleted_at) {
    return { alert: mapAlert(row) };
  }
  await pool.query(
    `UPDATE v_b_supervision_alerts
     SET deleted_at = NULL,
         deleted_by = NULL,
         updated_at = NOW()
     WHERE id = $1::uuid`,
    [row.id]
  );
  await pool.query(
    `INSERT INTO v_b_supervision_alert_events
      (alert_id, action, actor_user_id, old_status, new_status, note, meta)
     VALUES ($1, 'restored', $2, $3, $3, NULL, '{}'::jsonb)`,
    [row.id, actorUserId || null, row.status]
  );
  const fresh = await getAlertRowById(row.id);
  const alert = mapAlert(fresh);
  broadcastSupervisionAlertUpdate({
    type: "alert",
    action: "restored",
    alert,
    actorUserId: actorUserId || null
  });
  return { alert };
}

export async function purgeSupervisionAlert({ alertId, queueItemId, actorUserId }) {
  await ensureSupervisionAlertsSchema();
  let row = null;
  if (alertId) {
    row = await getAlertRowById(alertId);
  } else if (queueItemId) {
    const result = await pool.query(
      `SELECT ${ALERT_SELECT_WITH_ACTORS}
       FROM v_b_supervision_alerts a
       ${ALERT_ACTOR_JOINS}
       WHERE a.queue_item_id = $1
       LIMIT 1`,
      [queueItemId]
    );
    row = result.rows[0] || null;
  }
  if (!row) throw new Error("Alert not found");
  if (!row.deleted_at) {
    throw new Error("Only trashed alerts can be permanently deleted");
  }
  const alert = mapAlert(row);
  await pool.query(`DELETE FROM v_b_supervision_alerts WHERE id = $1::uuid`, [row.id]);
  broadcastSupervisionAlertUpdate({
    type: "alert",
    action: "purged",
    alert: { ...alert, purged: true },
    actorUserId: actorUserId || null
  });
  return { alert: { ...alert, purged: true } };
}

const BULK_ACTIONS = new Set(["trash", "restore", "purge", "reopen"]);
const BULK_MAX_IDS = 200;

function normalizeBulkAlertIds(alertIds = []) {
  return [...new Set(
    (Array.isArray(alertIds) ? alertIds : [])
      .map(id => String(id || "").trim())
      .filter(Boolean)
  )].slice(0, BULK_MAX_IDS);
}

/**
 * Actions de masse sur l'historique / corbeille.
 * action: trash | restore | purge | reopen
 */
export async function bulkActOnSupervisionAlerts({
  action,
  alertIds = [],
  actorUserId = null
} = {}) {
  const act = String(action || "").trim().toLowerCase();
  if (!BULK_ACTIONS.has(act)) {
    const err = new Error(`Unknown bulk action: ${action}`);
    err.status = 400;
    throw err;
  }
  const ids = normalizeBulkAlertIds(alertIds);
  if (!ids.length) {
    const err = new Error("alertIds required");
    err.status = 400;
    throw err;
  }

  let ok = 0;
  let failed = 0;
  const errors = [];

  for (const alertId of ids) {
    try {
      if (act === "trash") {
        await trashSupervisionAlert({ alertId, actorUserId });
      } else if (act === "restore") {
        await restoreSupervisionAlert({ alertId, actorUserId });
      } else if (act === "purge") {
        await purgeSupervisionAlert({ alertId, actorUserId });
      } else if (act === "reopen") {
        const row = await getAlertRowById(alertId);
        if (!row) throw new Error("Alert not found");
        await upsertAndActOnSupervisionAlert({
          queueItemId: row.queue_item_id,
          domain: row.domain,
          action: "reopen",
          actorUserId
        });
      }
      ok += 1;
    } catch (err) {
      failed += 1;
      if (errors.length < 8) {
        errors.push({ alertId, error: err?.message || "Error" });
      }
    }
  }

  if (ok > 0) {
    broadcastSupervisionAlertUpdate({
      type: "bulk",
      action: act,
      count: ok,
      actorUserId: actorUserId || null
    });
  }

  return { action: act, requested: ids.length, ok, failed, errors };
}

export { ACTIVE_STATUSES };
