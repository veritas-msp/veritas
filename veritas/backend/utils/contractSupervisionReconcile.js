/**
 * Réconciliation des alertes contrats / licences du centre de supervision.
 * Respecte les règles famille « contrats ».
 */
import { pool } from "../database/db.js";
import {
  autoResolveSupervisionAlertsByQueueItemIds,
  ensureSupervisionAlertsSeen
} from "./supervisionAlerts.js";
import {
  getSupervisionAlertRules,
  getSupervisionCriterionParameters,
  isSupervisionCriterionEnabled
} from "./supervisionAlertRules.js";

const FAMILY = "contrats";
const SOURCE = "contract_reconcile";
const RECONCILE_MIN_INTERVAL_MS = 60_000;

const LICENSE_MODULE_TABLES = [
  "v_b_clients_m_antivirus",
  "v_b_clients_m_antispam",
  "v_b_clients_m_save",
  "v_b_clients_m_o365",
  "v_b_clients_m_licences",
  "v_b_clients_m_ndd",
  "v_b_clients_m_ssl",
  "v_b_clients_m_firewall",
  "v_b_clients_m_toip"
];

const LICENSE_MODULE_META = {
  v_b_clients_m_antivirus: { module: "antivirus", label: "Antivirus" },
  v_b_clients_m_antispam: { module: "antispam", label: "Antispam" },
  v_b_clients_m_save: { module: "backup", label: "Backup" },
  v_b_clients_m_o365: { module: "o365", label: "Microsoft 365" },
  v_b_clients_m_licences: { module: "licences", label: "Licenses" },
  v_b_clients_m_ndd: { module: "domain", label: "Domain name" },
  v_b_clients_m_ssl: { module: "ssl", label: "SSL certificate" },
  v_b_clients_m_firewall: { module: "firewall", label: "Firewall" },
  v_b_clients_m_toip: { module: "toip", label: "TOIP / VoIP" }
};

const STATUS_TITLES = {
  expired: "Expiré",
  expiring: "Expire bientôt",
  suspended: "Suspendu"
};

let lastReconcileAt = 0;
let reconcileInFlight = null;

function parseJsonField(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function daysUntil(expirationDate) {
  if (!expirationDate) return null;
  const expiration = new Date(expirationDate);
  if (Number.isNaN(expiration.getTime())) return null;
  expiration.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiration - today) / (1000 * 60 * 60 * 24));
}

function contractStatus(expirationDate, isSuspended = false, expiringDays = 60) {
  if (isSuspended) return "suspended";
  const diffDays = daysUntil(expirationDate);
  if (diffDays == null) return null;
  if (diffDays < 0) return "expired";
  if (diffDays <= expiringDays) return "expiring";
  return null;
}

function licenseStatus(expirationDate, expiringDays = 60) {
  return contractStatus(expirationDate, false, expiringDays);
}

function resolveLicenseItemLabel(...candidates) {
  for (const value of candidates) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

function resolveLicenseExpiration(entry = {}) {
  return (
    entry.expiration ||
    entry.expirityDate ||
    entry.expirationDate ||
    entry.expiryDate ||
    entry.endDate ||
    entry.validTo ||
    entry.notAfter ||
    entry.syncData?.license?.expirationDate ||
    null
  );
}

function pushLicenseAlert(alerts, seen, ctx, label, expiration, expiringDays) {
  const status = licenseStatus(expiration, expiringDays);
  if (!status) return;
  const resolvedLabel = resolveLicenseItemLabel(label, ctx.itemKey) || ctx.moduleLabel || "License";
  const dedupeKey = `${ctx.clientId}|${ctx.module}|${resolvedLabel}|${expiration}|${status}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  alerts.push({
    id: dedupeKey,
    clientId: ctx.clientId,
    clientName: ctx.clientName,
    module: ctx.module,
    moduleLabel: ctx.moduleLabel,
    label: resolvedLabel,
    expiration,
    status
  });
}

function collectCyberLicenseAlertItems(parsed, ctx, alerts, seen, expiringDays) {
  const rootLabel = resolveLicenseItemLabel(
    parsed.logiciel,
    parsed.solution,
    parsed.solutionName,
    parsed.nom,
    parsed.name,
    parsed.provider,
    parsed.product,
    ctx.itemName
  );
  pushLicenseAlert(
    alerts,
    seen,
    ctx,
    rootLabel,
    resolveLicenseExpiration(parsed) || parsed.syncData?.license?.expirationDate,
    expiringDays
  );
  for (const collection of [parsed.solutions, parsed.licences, parsed.instances, parsed.items]) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      pushLicenseAlert(
        alerts,
        seen,
        ctx,
        resolveLicenseItemLabel(
          entry.logiciel,
          entry.solution,
          entry.nom,
          entry.name,
          entry.product,
          entry.label,
          entry.type,
          entry.jobName,
          entry.instance
        ),
        resolveLicenseExpiration(entry),
        expiringDays
      );
    }
  }
}

function collectDomainLicenseAlertItems(parsed, ctx, alerts, seen, expiringDays) {
  pushLicenseAlert(
    alerts,
    seen,
    ctx,
    resolveLicenseItemLabel(
      parsed.nom,
      parsed.name,
      parsed.domaine,
      parsed.domain,
      parsed.hostname,
      parsed.host,
      ctx.itemName
    ),
    resolveLicenseExpiration(parsed),
    expiringDays
  );
  for (const collection of [parsed.NDD, parsed.domains, parsed.domaines]) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      pushLicenseAlert(
        alerts,
        seen,
        ctx,
        resolveLicenseItemLabel(entry.nom, entry.name, entry.domaine, entry.domain),
        resolveLicenseExpiration(entry),
        expiringDays
      );
    }
  }
}

function collectFirewallLicenseAlertItems(parsed, ctx, alerts, seen, expiringDays) {
  if (!Array.isArray(parsed.licences)) return;
  for (const licence of parsed.licences) {
    const nom = String(licence?.nom || "").toLowerCase();
    const type = String(licence?.type || "").toLowerCase();
    // Licence de maintenance matériel : gérée par les règles famille (firewall / serveurs / stockage).
    if (nom.includes("maintenance") || type.includes("maintenance")) continue;
    pushLicenseAlert(
      alerts,
      seen,
      ctx,
      resolveLicenseItemLabel(licence.nom, licence.name, licence.type, licence.label),
      resolveLicenseExpiration(licence),
      expiringDays
    );
  }
}

function collectModuleLicenseAlertItems(data, table, ctx, alerts, seen, expiringDays) {
  const parsed = parseJsonField(data, null);
  if (!parsed || typeof parsed !== "object") return;
  if (table === "v_b_clients_m_ndd" || table === "v_b_clients_m_ssl" || table === "v_b_clients_m_licences") {
    collectDomainLicenseAlertItems(parsed, ctx, alerts, seen, expiringDays);
    return;
  }
  if (table === "v_b_clients_m_firewall") {
    collectFirewallLicenseAlertItems(parsed, ctx, alerts, seen, expiringDays);
    return;
  }
  collectCyberLicenseAlertItems(parsed, ctx, alerts, seen, expiringDays);
}

async function fetchLicenseAlerts(expiringDays = 60) {
  const alerts = [];
  const seen = new Set();
  for (const table of LICENSE_MODULE_TABLES) {
    const meta = LICENSE_MODULE_META[table];
    if (!meta) continue;
    try {
      const result = await pool.query(
        `SELECT m.client_id, m.data, m.item_key, c.id AS client_ref_id, c.name AS client_name
         FROM ${table} m
         LEFT JOIN v_b_clients c ON c.id = m.client_id
         WHERE m.data IS NOT NULL`
      );
      for (const row of result.rows) {
        const ctx = {
          clientId: row.client_ref_id ?? row.client_id,
          clientName: row.client_name || "Unknown client",
          module: meta.module,
          moduleLabel: meta.label,
          itemKey: row.item_key
        };
        collectModuleLicenseAlertItems(row.data, table, ctx, alerts, seen, expiringDays);
      }
    } catch (err) {
      if (err.code !== "42P01") {
        console.warn(`[contract-supervision] fetchLicenseAlerts: ${table}`, err.message);
      }
    }
  }
  return alerts;
}

function buildContractItem({ clientId, clientName, status, expiration, criterionKey, severity }) {
  const title = STATUS_TITLES[status] || status;
  const queueItemId = `contract-${clientId}`;
  return {
    id: queueItemId,
    queueItemId,
    domain: "contracts",
    severity,
    clientId,
    equipmentId: null,
    title,
    label: title,
    subtitle: "Contrat MSP",
    raisedAt: expiration || null,
    meta: {
      criterionKey,
      family: FAMILY,
      fingerprint: `${criterionKey}|${status}|${clientId}`,
      clientName: clientName || null,
      expiration: expiration || null,
      contractType: "msp",
      source: SOURCE
    }
  };
}

function buildLicenseItem({ alert, criterionKey, severity }) {
  const title = STATUS_TITLES[alert.status] || alert.status;
  const slug = String(alert.id || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  const queueItemId = `license-${slug || "x"}`;
  const subtitle = [alert.label, alert.moduleLabel || alert.module].filter(Boolean).join(" · ");
  return {
    id: queueItemId,
    queueItemId,
    domain: "contracts",
    severity,
    clientId: alert.clientId ?? null,
    equipmentId: null,
    title,
    label: title,
    subtitle: subtitle || "Licence",
    raisedAt: alert.expiration || null,
    meta: {
      criterionKey,
      family: FAMILY,
      fingerprint: `${criterionKey}|${alert.status}|${alert.id}`,
      clientName: alert.clientName || null,
      expiration: alert.expiration || null,
      module: alert.module || null,
      moduleLabel: alert.moduleLabel || null,
      licenseLabel: alert.label || null,
      source: SOURCE
    }
  };
}

function severityForCriterion(status, criterionKey) {
  if (status === "expired" || status === "suspended" || criterionKey.endsWith("_expired") || criterionKey === "contract_suspended") {
    return "critical";
  }
  return "warning";
}

export async function buildDesiredContractSupervisionAlerts(rules) {
  const allowExpired = isSupervisionCriterionEnabled(FAMILY, "contract_expired", rules);
  const allowExpiring = isSupervisionCriterionEnabled(FAMILY, "contract_expiring", rules);
  const allowSuspended = isSupervisionCriterionEnabled(FAMILY, "contract_suspended", rules);
  const allowLicenseExpired = isSupervisionCriterionEnabled(FAMILY, "license_expired", rules);
  const allowLicenseExpiring = isSupervisionCriterionEnabled(FAMILY, "license_expiring", rules);

  const expiringDays = Number(getSupervisionCriterionParameters(FAMILY, "contract_expiring", rules)?.days) || 60;
  const licenseExpiringDays = Number(getSupervisionCriterionParameters(FAMILY, "license_expiring", rules)?.days) || 60;

  const desired = [];

  if (allowExpired || allowExpiring || allowSuspended) {
    const clients = await pool.query(`SELECT id, name, contrat FROM v_b_clients`);
    for (const row of clients.rows) {
      const contrat = parseJsonField(row.contrat, {});
      const status = contractStatus(contrat.expiration, Boolean(contrat.suspendu), expiringDays);
      if (!status) continue;
      let criterionKey = null;
      if (status === "suspended" && allowSuspended) criterionKey = "contract_suspended";
      else if (status === "expired" && allowExpired) criterionKey = "contract_expired";
      else if (status === "expiring" && allowExpiring) criterionKey = "contract_expiring";
      if (!criterionKey) continue;
      desired.push(
        buildContractItem({
          clientId: row.id,
          clientName: row.name,
          status,
          expiration: contrat.expiration || null,
          criterionKey,
          severity: severityForCriterion(status, criterionKey)
        })
      );
    }
  }

  if (allowLicenseExpired || allowLicenseExpiring) {
    const licenseAlerts = await fetchLicenseAlerts(licenseExpiringDays);
    for (const alert of licenseAlerts) {
      let criterionKey = null;
      if (alert.status === "expired" && allowLicenseExpired) criterionKey = "license_expired";
      else if (alert.status === "expiring" && allowLicenseExpiring) criterionKey = "license_expiring";
      if (!criterionKey) continue;
      desired.push(
        buildLicenseItem({
          alert,
          criterionKey,
          severity: severityForCriterion(alert.status, criterionKey)
        })
      );
    }
  }

  return desired;
}

async function listOpenContractQueueItemIds() {
  const result = await pool.query(
    `SELECT queue_item_id, meta
     FROM v_b_supervision_alerts
     WHERE domain = 'contracts'
       AND status = ANY($1::text[])
       AND deleted_at IS NULL`,
    [["open", "acked", "linked"]]
  );
  return result.rows
    .filter(row => {
      const qid = String(row.queue_item_id || "");
      const source = String(row.meta?.source || (typeof row.meta === "string" ? parseJsonField(row.meta)?.source : "") || "");
      if (source === SOURCE || source === "seen") return true;
      return qid.startsWith("contract-") || qid.startsWith("license-");
    })
    .map(row => row.queue_item_id);
}

export async function reconcileContractSupervisionAlerts({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastReconcileAt < RECONCILE_MIN_INTERVAL_MS) {
    return { skipped: true, reason: "throttled" };
  }
  if (reconcileInFlight) return reconcileInFlight;

  reconcileInFlight = (async () => {
    try {
      const rules = await getSupervisionAlertRules();
      const desired = await buildDesiredContractSupervisionAlerts(rules);
      const desiredIds = new Set(desired.map(item => item.queueItemId));

      if (desired.length) {
        await ensureSupervisionAlertsSeen(desired);
      }

      const openIds = await listOpenContractQueueItemIds();
      const toResolve = openIds.filter(id => !desiredIds.has(id));
      let resolved = 0;
      if (toResolve.length) {
        resolved = await autoResolveSupervisionAlertsByQueueItemIds(toResolve, {
          reason: "contract_ok",
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
