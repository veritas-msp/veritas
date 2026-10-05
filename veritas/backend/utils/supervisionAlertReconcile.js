/**
 * Réconciliation des alertes du centre de supervision à partir du snapshot CheckMK.
 * 1 alerte = 1 service WARN/CRIT (ou host DOWN / no_data).
 * Après chaque sync (poller / manuelle / fiche), ouvre/rafraîchit et auto-résout.
 */
import {
  computeMonitoringSummary,
  listLiveFailingServices
} from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { getCheckmkMonitoringSettings, isCheckmkSyncStale } from "./checkmkMonitoringSettings.js";
import { formatMonitorIssueLabel } from "./monitorIssueLabel.js";
import {
  autoResolveSupervisionAlertsByQueueItemIds,
  ensureSupervisionAlertsSeen,
  listOpenSupervisionAlertsForEquipment
} from "./supervisionAlerts.js";
import {
  getSupervisionAlertRules,
  isSupervisionCriterionEnabled
} from "./supervisionAlertRules.js";

function slugPart(value, max = 80) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return slug || "x";
}

export function buildMonitoringAlertQueueItemId(clientId, equipmentId, serviceKey) {
  return `mk:${slugPart(clientId, 40)}:${slugPart(equipmentId, 40)}:${slugPart(serviceKey, 120)}`;
}

function buildDesiredAlertItem({
  clientId,
  equipmentId,
  family,
  hostName,
  equipmentName,
  clientName,
  criterionKey,
  severity,
  serviceName,
  serviceKey,
  raisedAt,
  pluginOutput
}) {
  const severityLabel = severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Info";
  const detail = {
    primaryService: serviceName,
    serviceName,
    failingServices: serviceName ? [serviceName] : [],
    hostName,
    pluginOutput,
    alertAt: raisedAt || null
  };
  const title =
    criterionKey === "no_data"
      ? formatMonitorIssueLabel("No monitoring data", { hostName })
      : formatMonitorIssueLabel(severityLabel, detail);
  const assetName = equipmentName || hostName || String(equipmentId);
  const queueItemId = buildMonitoringAlertQueueItemId(clientId, equipmentId, serviceKey);
  return {
    id: queueItemId,
    queueItemId,
    domain: "devices",
    severity,
    clientId,
    equipmentId: String(equipmentId),
    title,
    label: title,
    subtitle: [assetName, hostName && hostName !== assetName ? hostName : null].filter(Boolean).join(" · ") || null,
    raisedAt: raisedAt || null,
    meta: {
      criterionKey,
      family: family || null,
      hostName: hostName || null,
      serviceName: serviceName || null,
      serviceKey,
      fingerprint: `${criterionKey}|${severity}|${serviceKey}`,
      checkmkAlertAt: raisedAt || null,
      pluginOutput: pluginOutput || null,
      clientName: clientName || null,
      equipmentName: assetName || null,
      source: "monitoring_reconcile"
    }
  };
}

/**
 * Construit la liste d'alertes désirées pour un périphérique mappé (selon règles).
 */
export function buildDesiredMonitoringAlerts({
  clientId,
  equipmentId,
  family,
  hostName,
  equipmentName = null,
  clientName = null,
  monitoringData = null,
  hostDetails = null,
  lastSyncedAt = null,
  mkSettings,
  rules
}) {
  const familyKey = String(family || "").toLowerCase();
  if (!clientId || !equipmentId || !familyKey) return [];

  const allowCritical = isSupervisionCriterionEnabled(familyKey, "monitor_critical", rules);
  const allowWarning = isSupervisionCriterionEnabled(familyKey, "monitor_warning", rules);
  const allowNoData = isSupervisionCriterionEnabled(familyKey, "no_data", rules);

  const summary = computeMonitoringSummary(monitoringData, lastSyncedAt, hostDetails, {
    liveOnly: true
  });
  const stale = isCheckmkSyncStale(lastSyncedAt, mkSettings?.staleAfterMs);
  const live = listLiveFailingServices(monitoringData, hostDetails);
  const resolvedHost = hostName || live.hostName || summary.hostName || null;
  const desired = [];

  const hasFreshData = Boolean(monitoringData) && !stale;
  if (!hasFreshData) {
    if (allowNoData) {
      desired.push(
        buildDesiredAlertItem({
          clientId,
          equipmentId,
          family: familyKey,
          hostName: resolvedHost,
          equipmentName,
          clientName,
          criterionKey: "no_data",
          severity: "warning",
          serviceName: null,
          serviceKey: "__no_data__",
          raisedAt: lastSyncedAt || null,
          pluginOutput: stale ? "Sync stale" : "No monitoring data"
        })
      );
    }
    return desired;
  }

  for (const svc of live.services) {
    if (svc.severity === "critical" && !allowCritical) continue;
    if (svc.severity === "warning" && !allowWarning) continue;
    desired.push(
      buildDesiredAlertItem({
        clientId,
        equipmentId,
        family: familyKey,
        hostName: resolvedHost,
        equipmentName,
        clientName,
        criterionKey: svc.severity === "critical" ? "monitor_critical" : "monitor_warning",
        severity: svc.severity,
        serviceName: svc.serviceName,
        serviceKey: svc.serviceName,
        raisedAt: svc.alertAt || summary.alertAt || null,
        pluginOutput: svc.pluginOutput
      })
    );
  }

  if (!desired.length && live.hostIsDown && allowCritical) {
    desired.push(
      buildDesiredAlertItem({
        clientId,
        equipmentId,
        family: familyKey,
        hostName: resolvedHost,
        equipmentName,
        clientName,
        criterionKey: "monitor_critical",
        severity: "critical",
        serviceName: "Host DOWN",
        serviceKey: "__host_down__",
        raisedAt: live.hostAlertAt || summary.alertAt || null,
        pluginOutput: String(live.hostState || "DOWN")
      })
    );
  }

  return desired;
}

/**
 * Réconcilie les alertes supervision pour un périphérique après sync CheckMK.
 */
export async function reconcileEquipmentSupervisionAlerts({
  clientId,
  equipmentId,
  family,
  hostName = null,
  equipmentName = null,
  clientName = null,
  monitoringData = null,
  hostDetails = null,
  lastSyncedAt = null,
  mkSettings: mkSettingsArg = null,
  rules: rulesArg = null
} = {}) {
  if (!clientId || !equipmentId) {
    return { created: 0, refreshed: 0, resolved: 0, desired: 0, skipped: true, reason: "missing_ids" };
  }

  const mkSettings = mkSettingsArg || (await getCheckmkMonitoringSettings());
  if (mkSettings.surveillanceSuspended) {
    return { created: 0, refreshed: 0, resolved: 0, desired: 0, skipped: true, reason: "surveillance_suspended" };
  }

  const rules = rulesArg || (await getSupervisionAlertRules());
  const desired = buildDesiredMonitoringAlerts({
    clientId,
    equipmentId,
    family,
    hostName,
    equipmentName,
    clientName,
    monitoringData,
    hostDetails,
    lastSyncedAt,
    mkSettings,
    rules
  });
  const desiredIds = new Set(desired.map(item => item.queueItemId));

  let created = 0;
  let refreshed = 0;
  if (desired.length) {
    const before = await listOpenSupervisionAlertsForEquipment(equipmentId);
    const beforeIds = new Set(before.map(a => a.queueItemId));
    await ensureSupervisionAlertsSeen(desired);
    const after = await listOpenSupervisionAlertsForEquipment(equipmentId);
    for (const alert of after) {
      if (!desiredIds.has(alert.queueItemId)) continue;
      if (!beforeIds.has(alert.queueItemId)) created += 1;
      else refreshed += 1;
    }
  }

  const openAlerts = await listOpenSupervisionAlertsForEquipment(equipmentId);
  const toResolve = openAlerts
    .filter(alert => {
      if (desiredIds.has(alert.queueItemId)) return false;
      const qid = String(alert.queueItemId || "");
      const source = String(alert.meta?.source || "");
      // Nouvelle génération mk:… + anciennes alertes device-… du centre
      if (qid.startsWith("mk:")) return true;
      if (qid.startsWith("device-")) return true;
      if (source === "monitoring_reconcile" || source === "fleet_sync" || source === "seen") return true;
      return false;
    })
    .map(alert => alert.queueItemId);

  let resolved = 0;
  if (toResolve.length) {
    resolved = await autoResolveSupervisionAlertsByQueueItemIds(toResolve, {
      reason: "monitoring_ok",
      meta: { source: "monitoring_reconcile" }
    });
  }

  return {
    created,
    refreshed,
    resolved,
    desired: desired.length,
    skipped: false
  };
}
