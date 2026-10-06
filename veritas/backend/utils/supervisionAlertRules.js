import { pool } from "../database/db.js";
import { resolveEquipmentFamilyKey } from "./equipmentMonitoringAlerts.js";
import { ensureSupervisionAlertRulesSchema } from "../services/ensureSupervisionAlertRulesSchema.js";
const SINGLETON_ID = 1;
const SEVERITIES = new Set(["low", "normal", "high", "urgent"]);
/** Critères monitoring du centre (réconciliation après sync CheckMK). */
export const CENTRE_MONITORING_CRITERION_KEYS = ["monitor_critical", "monitor_warning", "no_data"];
/** Critères contrats / licences du centre. */
export const CENTRE_CONTRACT_CRITERION_KEYS = [
  "contract_expired",
  "contract_expiring",
  "contract_suspended",
  "license_expired",
  "license_expiring"
];
/** Garantie, licence de maintenance et batterie (par famille de périphérique). */
export const CENTRE_LIFECYCLE_CRITERION_KEYS = [
  "warranty_expired",
  "warranty_soon",
  "maintenance_expired",
  "maintenance_soon",
  "battery_expired",
  "battery_soon"
];
/** Tous les critères exposés dans le panneau « règles du centre ». */
export const CENTRE_CRITERION_KEYS = [
  ...CENTRE_MONITORING_CRITERION_KEYS,
  ...CENTRE_LIFECYCLE_CRITERION_KEYS,
  ...CENTRE_CONTRACT_CRITERION_KEYS
];
/** Critères retirés : plus évalués, plus créés, alertes ouvertes auto-résolues. */
export const RETIRED_SUPERVISION_CRITERION_KEYS = ["missing_ip"];
const RETIRED_CRITERION_SET = new Set(RETIRED_SUPERVISION_CRITERION_KEYS);
export function isRetiredSupervisionCriterion(criterionKey) {
  return RETIRED_CRITERION_SET.has(String(criterionKey || "").trim());
}

export const SUPERVISION_ALERT_CRITERIA = [{
  key: "monitor_critical",
  label: "Critical",
  description: "Critical state reported by CheckMK or supervision.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: []
}, {
  key: "monitor_warning",
  label: "Warning",
  description: "Warning reported by CheckMK or supervision.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: []
}, {
  key: "agent_offline",
  label: "RMM agent offline",
  description: "RMM-managed endpoint with no inventory since the alert threshold (distinct from the RMM agent online status).",
  families: ["ordinateurs"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: [{
    key: "minutes",
    type: "number",
    label: "Offline alert threshold (minutes)",
    min: 15,
    max: 43200,
    default: 2880,
    unit: "min"
  }]
}, {
  key: "updates_pending",
  label: "Stale updates",
  description: "Pending Windows updates on an RMM endpoint.",
  families: ["ordinateurs"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: [{
    key: "minPending",
    type: "number",
    label: "Minimum pending updates",
    min: 1,
    max: 500,
    default: 1
  }]
}, {
  key: "disk_critical",
  label: "Critical disk",
  description: "Critical disk usage on an RMM endpoint.",
  families: ["ordinateurs"],
  defaultEnabled: true,
  defaultSeverity: "urgent",
  parameters: [{
    key: "percent",
    type: "number",
    label: "Critical threshold (%)",
    min: 1,
    max: 100,
    default: 90,
    unit: "%"
  }]
}, {
  key: "disk_warn",
  label: "Disk warning",
  description: "High disk usage on an RMM endpoint.",
  families: ["ordinateurs"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: [{
    key: "percent",
    type: "number",
    label: "Warning threshold (%)",
    min: 1,
    max: 100,
    default: 80,
    unit: "%"
  }]
}, {
  key: "unmapped",
  label: "Not mapped to supervision",
  description: "Eligible device with no link to a supervision integration (coverage alert).",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: []
}, {
  key: "no_data",
  label: "No supervision data",
  description: "Device linked to a supervision integration but without recent data.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: []
}, {
  key: "warranty_expired",
  label: "Warranty expired",
  description: "Warranty end date has passed.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "alimentation"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: []
}, {
  key: "warranty_soon",
  label: "Warranty expiring soon",
  description: "Warranty ends within the next days (configurable threshold).",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "alimentation"],
  defaultEnabled: true,
  defaultSeverity: "low",
  parameters: [{
    key: "days",
    type: "number",
    label: "Days before expiration",
    min: 1,
    max: 365,
    default: 30,
    unit: "d"
  }]
}, {
  key: "maintenance_expired",
  label: "Maintenance license expired",
  description: "Firewall maintenance contract has expired.",
  families: ["firewall", "servers", "stockage"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: []
}, {
  key: "maintenance_soon",
  label: "Maintenance license soon",
  description: "Firewall maintenance contract due for renewal.",
  families: ["firewall", "servers", "stockage"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: [{
    key: "days",
    type: "number",
    label: "Days before expiration",
    min: 1,
    max: 365,
    default: 30,
    unit: "d"
  }]
}, {
  key: "battery_expired",
  label: "Battery replacement needed",
  description: "UPS / battery out of service.",
  families: ["alimentation"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: []
}, {
  key: "battery_soon",
  label: "Battery to monitor",
  description: "UPS battery date is approaching.",
  families: ["alimentation"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: [{
    key: "days",
    type: "number",
    label: "Days before expiration",
    min: 1,
    max: 365,
    default: 30,
    unit: "d"
  }]
}, {
  key: "contract_expired",
  label: "MSP contract expired",
  description: "Company MSP contract end date has passed.",
  families: ["contrats"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: []
}, {
  key: "contract_expiring",
  label: "MSP contract expiring soon",
  description: "MSP contract ends within the configured number of days.",
  families: ["contrats"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: [{
    key: "days",
    type: "number",
    label: "Days before expiration",
    min: 1,
    max: 365,
    default: 60,
    unit: "d"
  }]
}, {
  key: "contract_suspended",
  label: "MSP contract suspended",
  description: "Company MSP contract is marked as suspended.",
  families: ["contrats"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: []
}, {
  key: "license_expired",
  label: "License / module expired",
  description: "A client license or module (antivirus, domain, SSL, etc.) has expired.",
  families: ["contrats"],
  defaultEnabled: true,
  defaultSeverity: "high",
  parameters: []
}, {
  key: "license_expiring",
  label: "License / module expiring soon",
  description: "A client license or module ends within the configured number of days.",
  families: ["contrats"],
  defaultEnabled: true,
  defaultSeverity: "normal",
  parameters: [{
    key: "days",
    type: "number",
    label: "Days before expiration",
    min: 1,
    max: 365,
    default: 60,
    unit: "d"
  }]
}];
export const SUPERVISION_FAMILIES = [{
  key: "ordinateurs",
  label: "Computers"
}, {
  key: "servers",
  label: "Servers"
}, {
  key: "stockage",
  label: "Storage"
}, {
  key: "firewall",
  label: "Firewalls"
}, {
  key: "switch",
  label: "Switch"
}, {
  key: "wifi",
  label: "Wi‑Fi AP"
}, {
  key: "routeur",
  label: "Router / SD-WAN"
}, {
  key: "internet",
  label: "Internet"
}, {
  key: "toip",
  label: "TOIP"
}, {
  key: "alimentation",
  label: "Power"
}, {
  key: "contrats",
  label: "Contracts"
}];
const criteriaByKey = new Map(SUPERVISION_ALERT_CRITERIA.map(c => [c.key, c]));
export function getCriteriaForFamily(familyKey) {
  const key = String(familyKey || "").toLowerCase();
  return SUPERVISION_ALERT_CRITERIA.filter(c => c.families.includes(key));
}
function defaultParametersForCriterion(meta) {
  const params = {};
  for (const field of meta?.parameters || []) {
    params[field.key] = field.default;
  }
  return params;
}
export function buildDefaultRuleValue(criterionKeyOrMeta) {
  const meta = typeof criterionKeyOrMeta === "string" ? criteriaByKey.get(criterionKeyOrMeta) : criterionKeyOrMeta;
  if (!meta) {
    return {
      enabled: true,
      parameters: {},
      severity: "normal",
      supportFormId: null,
      subjectFieldKey: null,
      descriptionFieldKey: null
    };
  }
  return {
    enabled: Boolean(meta.defaultEnabled),
    parameters: defaultParametersForCriterion(meta),
    severity: SEVERITIES.has(meta.defaultSeverity) ? meta.defaultSeverity : "normal",
    supportFormId: null,
    subjectFieldKey: null,
    descriptionFieldKey: null
  };
}
function clampNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n)) return field.default;
  let out = n;
  if (field.min != null) out = Math.max(field.min, out);
  if (field.max != null) out = Math.min(field.max, out);
  return Math.round(out);
}
export function normalizeRuleValue(raw, criterionKey) {
  const meta = criteriaByKey.get(criterionKey);
  const defaults = buildDefaultRuleValue(meta || criterionKey);
  if (typeof raw === "boolean") {
    return {
      ...defaults,
      enabled: raw
    };
  }
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const parameters = {
    ...defaults.parameters
  };
  for (const field of meta?.parameters || []) {
    if (raw.parameters?.[field.key] != null) {
      parameters[field.key] = clampNumber(raw.parameters[field.key], field);
    } else if (raw[field.key] != null) {
      parameters[field.key] = clampNumber(raw[field.key], field);
    }
  }
  const severity = SEVERITIES.has(String(raw.severity || "").toLowerCase()) ? String(raw.severity).toLowerCase() : defaults.severity;
  return {
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : defaults.enabled,
    parameters,
    severity,
    supportFormId: raw.supportFormId != null && String(raw.supportFormId).trim() !== "" ? String(raw.supportFormId).trim() : null,
    subjectFieldKey: raw.subjectFieldKey != null && String(raw.subjectFieldKey).trim() !== "" ? String(raw.subjectFieldKey).trim() : null,
    descriptionFieldKey: raw.descriptionFieldKey != null && String(raw.descriptionFieldKey).trim() !== "" ? String(raw.descriptionFieldKey).trim() : null
  };
}
export function buildDefaultSupervisionAlertRules() {
  const rules = {};
  for (const family of SUPERVISION_FAMILIES) {
    rules[family.key] = {};
    for (const criterion of getCriteriaForFamily(family.key)) {
      rules[family.key][criterion.key] = buildDefaultRuleValue(criterion);
    }
  }
  return rules;
}
function mergeStoredRules(stored) {
  const defaults = buildDefaultSupervisionAlertRules();
  const input = stored && typeof stored === "object" ? stored : {};
  const merged = {};
  for (const family of SUPERVISION_FAMILIES) {
    merged[family.key] = {};
    const inputFamily = input[family.key] && typeof input[family.key] === "object" ? input[family.key] : {};
    for (const criterion of getCriteriaForFamily(family.key)) {
      const raw = inputFamily[criterion.key] !== undefined ? inputFamily[criterion.key] : defaults[family.key][criterion.key];
      merged[family.key][criterion.key] = normalizeRuleValue(raw, criterion.key);
    }
  }
  return merged;
}
export function getSupervisionCriterionRule(familyKey, criterionKey, rules) {
  const family = String(familyKey || "").toLowerCase();
  const criterion = String(criterionKey || "");
  const raw = rules?.[family]?.[criterion];
  return normalizeRuleValue(raw, criterion);
}
export function isSupervisionCriterionEnabled(familyKey, criterionKey, rules) {
  return getSupervisionCriterionRule(familyKey, criterionKey, rules).enabled;
}
export function getSupervisionCriterionSeverity(familyKey, criterionKey, rules) {
  return getSupervisionCriterionRule(familyKey, criterionKey, rules).severity;
}
export function getSupervisionCriterionParameters(familyKey, criterionKey, rules) {
  return getSupervisionCriterionRule(familyKey, criterionKey, rules).parameters;
}
export function getOfflineAlertThresholdMinutesFromRules(rules) {
  const params = getSupervisionCriterionParameters("ordinateurs", "agent_offline", rules);
  const minutes = Number(params?.minutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 2880;
}
export function getEvaluationThresholdsFromRules(familyKey, rules) {
  const family = String(familyKey || "").toLowerCase();
  return {
    offlineAlertThresholdMinutes: getOfflineAlertThresholdMinutesFromRules(rules),
    diskCriticalPercent: Number(getSupervisionCriterionParameters(family, "disk_critical", rules)?.percent) || 90,
    diskWarnPercent: Number(getSupervisionCriterionParameters(family, "disk_warn", rules)?.percent) || 80,
    updatesMinPending: Number(getSupervisionCriterionParameters(family, "updates_pending", rules)?.minPending) || 1,
    warrantySoonDays: Number(getSupervisionCriterionParameters(family, "warranty_soon", rules)?.days) || 30,
    maintenanceSoonDays: Number(getSupervisionCriterionParameters(family, "maintenance_soon", rules)?.days) || 30,
    batterySoonDays: Number(getSupervisionCriterionParameters(family, "battery_soon", rules)?.days) || 30
  };
}
let rulesCache = null;
let rulesCacheAt = 0;
const CACHE_TTL_MS = 5000;

export async function getSupervisionAlertRules({
  fresh = false
} = {}) {
  if (!fresh && rulesCache && Date.now() - rulesCacheAt < CACHE_TTL_MS) {
    return rulesCache;
  }
  const ready = await ensureSupervisionAlertRulesSchema();
  if (!ready) {
    const defaults = buildDefaultSupervisionAlertRules();
    rulesCache = defaults;
    rulesCacheAt = Date.now();
    return defaults;
  }
  const result = await pool.query(`SELECT data FROM v_b_supervision_alert_rules_config WHERE id = $1 LIMIT 1`, [SINGLETON_ID]);
  const merged = mergeStoredRules(result.rows[0]?.data);
  rulesCache = merged;
  rulesCacheAt = Date.now();
  return merged;
}
export async function saveSupervisionAlertRules(rules) {
  const ready = await ensureSupervisionAlertRulesSchema();
  if (!ready) {
    const err = new Error("Supervision alert rules table is missing. Run schema migrations.");
    err.status = 503;
    throw err;
  }
  const merged = mergeStoredRules(rules);
  await pool.query(`INSERT INTO v_b_supervision_alert_rules_config (id, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [SINGLETON_ID, JSON.stringify(merged)]);
  rulesCache = merged;
  rulesCacheAt = Date.now();
  return merged;
}
export function resolveCriterionFromMonitorStatus(monitorStatus, source = "checkmk") {
  const status = String(monitorStatus || "").toLowerCase();
  if (status === "critical") return "monitor_critical";
  if (status === "warning") return "monitor_warning";
  if (status === "offline") return source === "rmm" ? "agent_offline" : "monitor_critical";
  if (status === "unmapped") return "unmapped";
  if (status === "no_data") return "no_data";
  return null;
}
export function resolveEquipmentFamilyFromType(type) {
  return resolveEquipmentFamilyKey(type);
}
export async function isSupervisionAlertAllowed({
  equipmentFamily,
  monitorStatus,
  source = "checkmk",
  criterionKey = null
}) {
  const rules = await getSupervisionAlertRules();
  const family = String(equipmentFamily || "").toLowerCase();
  const key = criterionKey || resolveCriterionFromMonitorStatus(monitorStatus, source);
  if (!key) return true;
  if (isRetiredSupervisionCriterion(key)) return false;
  return isSupervisionCriterionEnabled(family, key, rules);
}
export function getSupervisionAlertRulesPayload(rules) {
  return {
    families: SUPERVISION_FAMILIES,
    criteria: SUPERVISION_ALERT_CRITERIA,
    rules: rules || buildDefaultSupervisionAlertRules()
  };
}
