import { resolveEquipmentFamilyForAlerts } from "../../api/equipmentMonitoringAlerts";

const SEVERITIES = new Set(["low", "normal", "high", "urgent"]);

/** Critères monitoring du centre (après sync CheckMK). */
export const CENTRE_MONITORING_CRITERION_KEYS = ["monitor_critical", "monitor_warning", "no_data"];
/** Critères contrats / licences du centre. */
export const CENTRE_CONTRACT_CRITERION_KEYS = [
  "contract_expired",
  "contract_expiring",
  "contract_suspended",
  "license_expired",
  "license_expiring"
];
/** Garantie, licence de maintenance et batterie (par famille). */
export const CENTRE_LIFECYCLE_CRITERION_KEYS = [
  "warranty_expired",
  "warranty_soon",
  "maintenance_expired",
  "maintenance_soon",
  "battery_expired",
  "battery_soon"
];
/** Tous les critères du panneau « règles du centre ». */
export const CENTRE_CRITERION_KEYS = [
  ...CENTRE_MONITORING_CRITERION_KEYS,
  ...CENTRE_LIFECYCLE_CRITERION_KEYS,
  ...CENTRE_CONTRACT_CRITERION_KEYS
];

export const SUPERVISION_ALERT_CRITERIA = [
  {
    key: "monitor_critical",
    label: "Critical",
    description: "Critical state reported by CheckMK or monitoring.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: []
  },
  {
    key: "monitor_warning",
    label: "Warning",
    description: "Warning reported by CheckMK or monitoring (e.g. Memory, Filesystem).",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: []
  },
  {
    key: "agent_offline",
    label: "RMM agent offline",
    description: "RMM-managed endpoint with no inventory since the alert threshold.",
    families: ["ordinateurs"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: [
      { key: "minutes", type: "number", label: "Offline alert threshold (minutes)", min: 15, max: 43200, default: 2880, unit: "min" }
    ]
  },
  {
    key: "updates_pending",
    label: "Pending updates",
    description: "Pending Windows updates on an RMM endpoint.",
    families: ["ordinateurs"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: [
      { key: "minPending", type: "number", label: "Minimum pending updates", min: 1, max: 500, default: 1 }
    ]
  },
  {
    key: "disk_critical",
    label: "Critical disk",
    description: "Critical disk usage on an RMM endpoint.",
    families: ["ordinateurs"],
    defaultEnabled: true,
    defaultSeverity: "urgent",
    parameters: [
      { key: "percent", type: "number", label: "Critical threshold (%)", min: 1, max: 100, default: 90, unit: "%" }
    ]
  },
  {
    key: "disk_warn",
    label: "Disk warning",
    description: "High disk usage on an RMM endpoint.",
    families: ["ordinateurs"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: [
      { key: "percent", type: "number", label: "Warning threshold (%)", min: 1, max: 100, default: 80, unit: "%" }
    ]
  },
  {
    key: "unmapped",
    label: "Not mapped to supervision",
    description: "Eligible device with no link to a supervision integration (coverage alert).",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: []
  },
  {
    key: "no_data",
    label: "No monitoring data",
    description: "Device linked to a supervision integration but without recent data.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
    defaultEnabled: false,
    defaultSeverity: "normal",
    parameters: []
  },
  {
    key: "warranty_expired",
    label: "Warranty expired",
    description: "Warranty end date has passed.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "alimentation"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: []
  },
  {
    key: "warranty_soon",
    label: "Warranty expiring soon",
    description: "Warranty ends within the configured number of days.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "alimentation"],
    defaultEnabled: true,
    defaultSeverity: "low",
    parameters: [
      { key: "days", type: "number", label: "Days before expiration", min: 1, max: 365, default: 30, unit: "d" }
    ]
  },
  {
    key: "maintenance_expired",
    label: "Maintenance license expired",
    description: "Firewall maintenance contract has expired.",
    families: ["firewall", "servers", "stockage"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: []
  },
  {
    key: "maintenance_soon",
    label: "Maintenance license soon",
    description: "Firewall maintenance contract due for renewal.",
    families: ["firewall", "servers", "stockage"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: [
      { key: "days", type: "number", label: "Days before expiration", min: 1, max: 365, default: 30, unit: "d" }
    ]
  },
  {
    key: "battery_expired",
    label: "Battery replacement needed",
    description: "UPS / battery out of service.",
    families: ["alimentation"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: []
  },
  {
    key: "battery_soon",
    label: "Battery to monitor",
    description: "UPS battery date is approaching.",
    families: ["alimentation"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: [
      { key: "days", type: "number", label: "Days before expiration", min: 1, max: 365, default: 30, unit: "d" }
    ]
  },
  {
    key: "contract_expired",
    label: "MSP contract expired",
    description: "Company MSP contract end date has passed.",
    families: ["contrats"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: []
  },
  {
    key: "contract_expiring",
    label: "MSP contract expiring soon",
    description: "MSP contract ends within the configured number of days.",
    families: ["contrats"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: [
      { key: "days", type: "number", label: "Days before expiration", min: 1, max: 365, default: 60, unit: "d" }
    ]
  },
  {
    key: "contract_suspended",
    label: "MSP contract suspended",
    description: "Company MSP contract is marked as suspended.",
    families: ["contrats"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: []
  },
  {
    key: "license_expired",
    label: "License / module expired",
    description: "A client license or module (antivirus, domain, SSL, etc.) has expired.",
    families: ["contrats"],
    defaultEnabled: true,
    defaultSeverity: "high",
    parameters: []
  },
  {
    key: "license_expiring",
    label: "License / module expiring soon",
    description: "A client license or module ends within the configured number of days.",
    families: ["contrats"],
    defaultEnabled: true,
    defaultSeverity: "normal",
    parameters: [
      { key: "days", type: "number", label: "Days before expiration", min: 1, max: 365, default: 60, unit: "d" }
    ]
  }
];

export const SUPERVISION_FAMILIES = [
  { key: "ordinateurs", label: "Computers", icon: "mdi:laptop" },
  { key: "servers", label: "Servers", icon: "mdi:server" },
  { key: "stockage", label: "Storage", icon: "mdi:nas" },
  { key: "firewall", label: "Firewalls", icon: "mdi:firewall" },
  { key: "switch", label: "Switch", icon: "mdi:switch" },
  { key: "wifi", label: "Wi‑Fi AP", icon: "mdi:wifi" },
  { key: "routeur", label: "Router / SD-WAN", icon: "mdi:router-wireless" },
  { key: "internet", label: "Internet", icon: "mdi:web" },
  { key: "toip", label: "TOIP", icon: "mdi:phone-voip" },
  { key: "alimentation", label: "Power", icon: "mdi:battery-charging" },
  { key: "contrats", label: "Contracts", icon: "mdi:file-document-alert-outline" }
];

const criteriaByKey = new Map(SUPERVISION_ALERT_CRITERIA.map(c => [c.key, c]));

export function getCriteriaForFamily(familyKey, { centreOnly = false } = {}) {
  const key = String(familyKey || "").toLowerCase();
  const centreSet = new Set(CENTRE_CRITERION_KEYS);
  return SUPERVISION_ALERT_CRITERIA.filter(c => {
    if (!c.families.includes(key)) return false;
    if (centreOnly && !centreSet.has(c.key)) return false;
    return true;
  });
}

export function filterCriteriaForScope(criteria = [], scope = "all") {
  const list = Array.isArray(criteria) ? criteria : [];
  if (scope !== "centre") return list;
  const centreSet = new Set(CENTRE_CRITERION_KEYS);
  return list.filter(c => centreSet.has(c.key));
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
    return { enabled: true, parameters: {}, severity: "normal", supportFormId: null, subjectFieldKey: null, descriptionFieldKey: null };
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

export function normalizeRuleValue(raw, criterionKey) {
  const meta = criteriaByKey.get(criterionKey);
  const defaults = buildDefaultRuleValue(meta || criterionKey);
  if (typeof raw === "boolean") {
    return { ...defaults, enabled: raw };
  }
  if (!raw || typeof raw !== "object") {
    return { ...defaults };
  }
  const parameters = { ...defaults.parameters };
  for (const field of meta?.parameters || []) {
    if (raw.parameters?.[field.key] != null) {
      const n = Number(raw.parameters[field.key]);
      parameters[field.key] = Number.isFinite(n) ? n : field.default;
    } else if (raw[field.key] != null) {
      const n = Number(raw[field.key]);
      parameters[field.key] = Number.isFinite(n) ? n : field.default;
    }
  }
  const severity = SEVERITIES.has(String(raw.severity || "").toLowerCase())
    ? String(raw.severity).toLowerCase()
    : defaults.severity;
  return {
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : defaults.enabled,
    parameters,
    severity,
    supportFormId: raw.supportFormId != null && String(raw.supportFormId).trim() !== "" ? String(raw.supportFormId).trim() : null,
    subjectFieldKey: raw.subjectFieldKey != null && String(raw.subjectFieldKey).trim() !== "" ? String(raw.subjectFieldKey).trim() : null,
    descriptionFieldKey: raw.descriptionFieldKey != null && String(raw.descriptionFieldKey).trim() !== "" ? String(raw.descriptionFieldKey).trim() : null
  };
}

export function isRuleEnabled(raw) {
  if (raw && typeof raw === "object") return Boolean(raw.enabled);
  return Boolean(raw);
}

export function normalizeRulesTree(rules, catalogCriteria = SUPERVISION_ALERT_CRITERIA, families = SUPERVISION_FAMILIES) {
  const criteriaList = Array.isArray(catalogCriteria) && catalogCriteria.length ? catalogCriteria : SUPERVISION_ALERT_CRITERIA;
  const familyList = Array.isArray(families) && families.length ? families : SUPERVISION_FAMILIES;
  const input = rules && typeof rules === "object" ? rules : {};
  const merged = {};
  for (const family of familyList) {
    const familyKey = family.key;
    merged[familyKey] = {};
    const inputFamily = input[familyKey] && typeof input[familyKey] === "object" ? input[familyKey] : {};
    const familyCriteria = criteriaList.filter(c => Array.isArray(c.families) && c.families.includes(familyKey));
    for (const criterion of familyCriteria) {
      merged[familyKey][criterion.key] = normalizeRuleValue(inputFamily[criterion.key], criterion.key);
    }
  }
  return merged;
}

export function buildDefaultMonitoringAlertRules() {
  return normalizeRulesTree(null);
}

export function countEnabledRulesForFamily(familyKey, rules, { centreOnly = false } = {}) {
  const criteria = getCriteriaForFamily(familyKey, { centreOnly });
  const familyRules = rules?.[familyKey] || {};
  return criteria.filter(c => isRuleEnabled(familyRules[c.key])).length;
}

export function isMonitoringCriterionEnabled(familyKey, criterionKey, rules) {
  const family = String(familyKey || "").toLowerCase();
  const criterion = String(criterionKey || "");
  const familyRules = rules?.[family];
  if (familyRules && familyRules[criterion] !== undefined) {
    return isRuleEnabled(familyRules[criterion]);
  }
  const meta = criteriaByKey.get(criterion);
  if (!meta) return true;
  return Boolean(meta.defaultEnabled);
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

export function resolveEquipmentFamilyKey(type) {
  return resolveEquipmentFamilyForAlerts(type);
}

export function isMonitorStatusAlertEnabled(equipment, monitorStatus, rules) {
  const family = resolveEquipmentFamilyKey(equipment?.type === "NAS" ? "Storage" : equipment?.type);
  if (!family) return true;
  const source =
    equipment?.type === "Ordinateurs" && (equipment?.agentManaged || equipment?.rawData?.source === "rmm")
      ? "rmm"
      : "checkmk";
  const criterionKey = resolveCriterionFromMonitorStatus(monitorStatus, source);
  if (!criterionKey) return true;
  return isMonitoringCriterionEnabled(family, criterionKey, rules);
}

export function filterMonitoringIssues(issues, equipmentType, rules) {
  const family = resolveEquipmentFamilyKey(equipmentType === "NAS" ? "Storage" : equipmentType);
  if (!family || !Array.isArray(issues)) return issues || [];
  return issues.filter(issue => isMonitoringCriterionEnabled(family, issue.key, rules));
}
