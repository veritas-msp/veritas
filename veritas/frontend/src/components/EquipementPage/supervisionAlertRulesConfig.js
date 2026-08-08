import { resolveEquipmentFamilyForAlerts } from "../../api/equipmentMonitoringAlerts";
export const SUPERVISION_ALERT_CRITERIA = [{
  key: "monitor_critical",
  label: "Alert critical (supervision)",
  description: "Critical state reported by CheckMK or monitoring.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
  defaultEnabled: true
}, {
  key: "monitor_warning",
  label: "Warning supervision",
  description: "Warning reported by CheckMK or monitoring.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
  defaultEnabled: true
}, {
  key: "agent_offline",
  label: "Agent RMM hors ligne (+48 h)",
  description: "Workstation managed by the RMM agent with no inventory for over 48 hours.",
  families: ["ordinateurs"],
  defaultEnabled: false
}, {
  key: "updates_pending",
  label: "Outdated updates",
  description: "Pending Windows updates on an RMM workstation.",
  families: ["ordinateurs"],
  defaultEnabled: true
}, {
  key: "disk_critical",
  label: "Disque critique (≥ 90 %)",
  description: "Espace disque critique sur un poste RMM.",
  families: ["ordinateurs"],
  defaultEnabled: true
}, {
  key: "disk_warn",
  label: "Disk to monitor (≥ 80%)",
  description: "High disk usage on an RMM workstation.",
  families: ["ordinateurs"],
  defaultEnabled: true
}, {
  key: "unmapped",
  label: "Not mapped to CheckMK",
  description: "CheckMK-eligible device without a configured mapping.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip"],
  defaultEnabled: true
}, {
  key: "no_data",
  label: "No monitoring data",
  description: "Device mapped to CheckMK but without recent data.",
  families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip"],
  defaultEnabled: false
}, {
  key: "warranty_expired",
  label: "Warranty expirede",
  description: "Warranty end date has passed.",
  families: ["servers", "stockage", "firewall"],
  defaultEnabled: true
}, {
  key: "warranty_soon",
  label: "Warranty expires soon",
  description: "Fin de garantie dans les prochains mois.",
  families: ["servers", "stockage", "firewall"],
  defaultEnabled: true
}, {
  key: "maintenance_expired",
  label: "License maintenance expirede",
  description: "Contrat de maintenance firewall expired.",
  families: ["firewall"],
  defaultEnabled: true
}, {
  key: "maintenance_soon",
  label: "License maintenance soon",
  description: "Firewall maintenance contract to renew.",
  families: ["firewall"],
  defaultEnabled: true
}, {
  key: "battery_expired",
  label: "Battery to replace",
  description: "UPS / battery out of service.",
  families: ["alimentation"],
  defaultEnabled: true
}, {
  key: "battery_soon",
  label: "Battery to monitor",
  description: "Date batterie onduleur proche.",
  families: ["alimentation"],
  defaultEnabled: true
}, {
  key: "missing_ip",
  label: "IP not set",
  description: "Missing IP address on a network device.",
  families: ["servers", "firewall", "switch", "wifi", "routeur", "toip"],
  defaultEnabled: false
}];
export const SUPERVISION_FAMILIES = [{
  key: "ordinateurs",
  label: "Ordinateurs"
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
  label: "Borne WiFi"
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
  label: "Alimentation"
}];
const criteriaByKey = new Map(SUPERVISION_ALERT_CRITERIA.map(c => [c.key, c]));
export function getCriteriaForFamily(familyKey) {
  const key = String(familyKey || "").toLowerCase();
  return SUPERVISION_ALERT_CRITERIA.filter(c => c.families.includes(key));
}
export function buildDefaultMonitoringAlertRules() {
  const rules = {};
  for (const family of SUPERVISION_FAMILIES) {
    rules[family.key] = {};
    for (const criterion of getCriteriaForFamily(family.key)) {
      rules[family.key][criterion.key] = criterion.defaultEnabled;
    }
  }
  return rules;
}
export function isMonitoringCriterionEnabled(familyKey, criterionKey, rules) {
  const family = String(familyKey || "").toLowerCase();
  const criterion = String(criterionKey || "");
  const familyRules = rules?.[family];
  if (familyRules && familyRules[criterion] !== undefined) {
    return Boolean(familyRules[criterion]);
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
  const source = equipment?.type === "Ordinateurs" && (equipment?.agentManaged || equipment?.rawData?.source === "rmm") ? "rmm" : "checkmk";
  const criterionKey = resolveCriterionFromMonitorStatus(monitorStatus, source);
  if (!criterionKey) return true;
  return isMonitoringCriterionEnabled(family, criterionKey, rules);
}
export function filterMonitoringIssues(issues, equipmentType, rules) {
  const family = resolveEquipmentFamilyKey(equipmentType === "NAS" ? "Storage" : equipmentType);
  if (!family || !Array.isArray(issues)) return issues || [];
  return issues.filter(issue => isMonitoringCriterionEnabled(family, issue.key, rules));
}
