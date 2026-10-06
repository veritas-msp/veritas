/**
 * Réconciliation des alertes garantie / licence de maintenance / batterie du centre.
 * Respecte les règles par famille (activable / désactivable).
 */
import { pool } from "../database/db.js";
import {
  autoResolveSupervisionAlertsByQueueItemIds,
  ensureSupervisionAlertsSeen
} from "./supervisionAlerts.js";
import {
  CENTRE_LIFECYCLE_CRITERION_KEYS,
  SUPERVISION_ALERT_CRITERIA,
  getSupervisionAlertRules,
  getSupervisionCriterionParameters,
  getSupervisionCriterionSeverity,
  isSupervisionCriterionEnabled
} from "./supervisionAlertRules.js";
import { fetchEquipmentFleetList } from "./equipmentFleetList.js";
import { resolveEquipmentFamilyKey } from "./equipmentMonitoringAlerts.js";
import {
  formatDateFr,
  getExpirationStatus,
  getMaintenanceLicenceExpiration
} from "./equipmentExpirationUtils.js";

const SOURCE = "lifecycle_reconcile";
const LIFECYCLE_KEYS = new Set(CENTRE_LIFECYCLE_CRITERION_KEYS);
const RECONCILE_MIN_INTERVAL_MS = 60_000;

const TITLE_BY_KEY = {
  warranty_expired: "Garantie expirée",
  warranty_soon: "Garantie expire bientôt",
  maintenance_expired: "Licence de maintenance expirée",
  maintenance_soon: "Licence de maintenance expire bientôt",
  battery_expired: "Batterie à remplacer",
  battery_soon: "Batterie à surveiller"
};

let lastReconcileAt = 0;
let reconcileInFlight = null;

function slugPart(value, max = 40) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return slug || "x";
}

export function buildLifecycleAlertQueueItemId(clientId, equipmentId, criterionKey) {
  return `life:${slugPart(clientId)}:${slugPart(equipmentId)}:${slugPart(criterionKey, 40)}`;
}

function formatDateForTitle(value) {
  return formatDateFr(value) || String(value || "").trim();
}

function buildTitle(criterionKey, dateValue) {
  const base = TITLE_BY_KEY[criterionKey] || criterionKey;
  const formatted = formatDateForTitle(dateValue);
  if (!formatted) return base;
  if (criterionKey.endsWith("_expired")) return `${base} depuis le ${formatted}`;
  return `${base} le ${formatted}`;
}

function criterionAppliesToFamily(family, criterionKey) {
  const meta = SUPERVISION_ALERT_CRITERIA.find(c => c.key === criterionKey);
  return Boolean(meta?.families?.includes(family));
}

function isLifecycleRuleOn(family, criterionKey, rules) {
  if (!criterionAppliesToFamily(family, criterionKey)) return false;
  return isSupervisionCriterionEnabled(family, criterionKey, rules);
}

function mapRuleSeverityToAlert(severity) {
  const key = String(severity || "").toLowerCase();
  if (key === "urgent" || key === "high") return "critical";
  if (key === "low") return "info";
  return "warning";
}

function buildItem({
  clientId,
  clientName,
  equipmentId,
  equipmentName,
  family,
  ip,
  criterionKey,
  dateValue,
  rules
}) {
  const title = buildTitle(criterionKey, dateValue);
  const queueItemId = buildLifecycleAlertQueueItemId(clientId, equipmentId, criterionKey);
  const ruleSeverity = getSupervisionCriterionSeverity(family, criterionKey, rules);
  return {
    id: queueItemId,
    queueItemId,
    domain: "devices",
    severity: mapRuleSeverityToAlert(ruleSeverity),
    clientId,
    equipmentId: String(equipmentId),
    title,
    label: title,
    subtitle: [equipmentName, ip].filter(Boolean).join(" · ") || null,
    raisedAt: new Date().toISOString(),
    meta: {
      criterionKey,
      family: family || null,
      clientName: clientName || null,
      equipmentName: equipmentName || null,
      ip: ip || null,
      expirationDate: dateValue || null,
      source: SOURCE,
      fingerprint: `${criterionKey}|${dateValue || ""}`
    }
  };
}

function evaluateEquipmentLifecycle(equipment, rules) {
  const family = resolveEquipmentFamilyKey(equipment?.type === "NAS" ? "Storage" : equipment?.type);
  if (!family) return [];
  const clientId = equipment.clientId;
  const equipmentId = equipment.dbId || equipment.id;
  if (!clientId || !equipmentId) return [];

  const items = [];
  const ctx = {
    clientId,
    clientName: equipment.clientName || null,
    equipmentId,
    equipmentName: equipment.name || null,
    family,
    ip: equipment.ip || null,
    rules
  };

  const serverType = String(equipment.typeServer || equipment.rawData?.typeServer || "").toLowerCase();
  const skipWarranty = family === "servers" && serverType === "virtuel";
  if (!skipWarranty) {
    const warrantyDate = equipment.expirationGarantie || equipment.rawData?.expirationGarantie || null;
    const soonDays = Number(getSupervisionCriterionParameters(family, "warranty_soon", rules)?.days) || 30;
    const status = getExpirationStatus(warrantyDate, soonDays);
    if (status === "expired" && isLifecycleRuleOn(family, "warranty_expired", rules)) {
      items.push(buildItem({ ...ctx, criterionKey: "warranty_expired", dateValue: warrantyDate }));
    } else if (status === "soon" && isLifecycleRuleOn(family, "warranty_soon", rules)) {
      items.push(buildItem({ ...ctx, criterionKey: "warranty_soon", dateValue: warrantyDate }));
    }
  }

  const licences = equipment.licences || equipment.rawData?.licences || [];
  const maintDate = getMaintenanceLicenceExpiration(licences);
  const maintSoonDays = Number(getSupervisionCriterionParameters(family, "maintenance_soon", rules)?.days) || 30;
  const maintStatus = getExpirationStatus(maintDate, maintSoonDays);
  if (maintStatus === "expired" && isLifecycleRuleOn(family, "maintenance_expired", rules)) {
    items.push(buildItem({ ...ctx, criterionKey: "maintenance_expired", dateValue: maintDate }));
  } else if (maintStatus === "soon" && isLifecycleRuleOn(family, "maintenance_soon", rules)) {
    items.push(buildItem({ ...ctx, criterionKey: "maintenance_soon", dateValue: maintDate }));
  }

  if (family === "alimentation") {
    const batteryDate = equipment.dateBatterie || equipment.rawData?.dateBatterie || null;
    const batterySoonDays = Number(getSupervisionCriterionParameters(family, "battery_soon", rules)?.days) || 30;
    const batteryStatus = getExpirationStatus(batteryDate, batterySoonDays);
    if (batteryStatus === "expired" && isLifecycleRuleOn(family, "battery_expired", rules)) {
      items.push(buildItem({ ...ctx, criterionKey: "battery_expired", dateValue: batteryDate }));
    } else if (batteryStatus === "soon" && isLifecycleRuleOn(family, "battery_soon", rules)) {
      items.push(buildItem({ ...ctx, criterionKey: "battery_soon", dateValue: batteryDate }));
    }
  }

  return items;
}

function isLifecycleQueueItem(row) {
  const qid = String(row.queue_item_id || row.queueItemId || "");
  const meta = row.meta && typeof row.meta === "object" ? row.meta : {};
  const source = String(meta.source || "");
  const key = String(meta.criterionKey || "").trim();
  if (LIFECYCLE_KEYS.has(key)) return true;
  if (source === SOURCE) return true;
  if (qid.startsWith("life:")) return true;
  const title = `${row.title || ""} ${row.label || ""}`.toLowerCase();
  if (/\bgarantie\b/.test(title) && /\bexpir/.test(title)) return true;
  if (/licence de maintenance|maintenance license/.test(title)) return true;
  if (/\bbatterie\b/.test(title) && (/\bremplacer\b/.test(title) || /\bsurveiller\b/.test(title) || /\bexpir/.test(title))) {
    return true;
  }
  return false;
}

async function listOpenLifecycleQueueItemIds() {
  const result = await pool.query(
    `SELECT queue_item_id, title, label, meta
     FROM v_b_supervision_alerts
     WHERE domain = 'devices'
       AND status = ANY($1::text[])
       AND deleted_at IS NULL`,
    [["open", "acked", "linked"]]
  );
  return result.rows.filter(isLifecycleQueueItem).map(row => row.queue_item_id);
}

export async function reconcileEquipmentLifecycleSupervisionAlerts({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastReconcileAt < RECONCILE_MIN_INTERVAL_MS) {
    return { skipped: true, reason: "throttled" };
  }
  if (reconcileInFlight) return reconcileInFlight;

  reconcileInFlight = (async () => {
    try {
      const [rules, fleet] = await Promise.all([
        getSupervisionAlertRules(),
        fetchEquipmentFleetList()
      ]);
      const desired = [];
      for (const equipment of Array.isArray(fleet) ? fleet : []) {
        if (equipment?.is_active === false) continue;
        desired.push(...evaluateEquipmentLifecycle(equipment, rules));
      }
      const desiredIds = new Set(desired.map(item => item.queueItemId));

      if (desired.length) {
        await ensureSupervisionAlertsSeen(desired);
      }

      const openIds = await listOpenLifecycleQueueItemIds();
      const toResolve = openIds.filter(id => !desiredIds.has(id));
      let resolved = 0;
      if (toResolve.length) {
        resolved = await autoResolveSupervisionAlertsByQueueItemIds(toResolve, {
          reason: "lifecycle_ok",
          meta: { source: SOURCE }
        });
      }

      lastReconcileAt = Date.now();
      return {
        skipped: false,
        desired: desired.length,
        resolved
      };
    } finally {
      reconcileInFlight = null;
    }
  })();

  return reconcileInFlight;
}
