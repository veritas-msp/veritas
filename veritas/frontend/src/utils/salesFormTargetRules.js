import { conditionsMatch, evaluateCondition, fieldIsVisible, filterVisibleFields, normalizeVisibilityRules } from "./salesFormConditions.js";
function isLegacyFlatTargets(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (Array.isArray(raw.rules)) return false;
  return Object.prototype.hasOwnProperty.call(raw, "priority") || Object.prototype.hasOwnProperty.call(raw, "status") || Object.prototype.hasOwnProperty.call(raw, "assigneeUserIds") || Object.prototype.hasOwnProperty.call(raw, "watcherUserIds") || Object.prototype.hasOwnProperty.call(raw, "teamIds");
}
export function normalizeTicketTargetsConfig(raw = {}) {
  if (isLegacyFlatTargets(raw)) {
    return {
      version: 2,
      rules: [{
        id: "default",
        label: "Ticket principal",
        enabled: true,
        always: true,
        matchMode: "all",
        conditions: [],
        targets: raw
      }]
    };
  }
  const source = raw && typeof raw === "object" ? raw : {};
  const rules = Array.isArray(source.rules) ? source.rules : [];
  if (rules.length === 0) {
    return {
      version: 2,
      rules: [{
        id: "default",
        label: "Ticket principal",
        enabled: true,
        always: true,
        matchMode: "all",
        conditions: [],
        targets: {}
      }]
    };
  }
  return {
    version: 2,
    rules
  };
}
export function ruleMatches(rule, fieldValues = {}) {
  if (!rule || rule.enabled === false) return false;
  if (rule.always || !(rule.conditions || []).length) return true;
  return conditionsMatch({
    matchMode: rule.matchMode === "any" ? "any" : "all",
    conditions: rule.conditions || []
  }, fieldValues);
}
export function resolveMatchingRules(config = {}, fieldValues = {}) {
  const normalized = normalizeTicketTargetsConfig(config);
  return normalized.rules.filter(rule => ruleMatches(rule, fieldValues));
}
export function describeTicketTargetsSummary(config = {}) {
  const normalized = normalizeTicketTargetsConfig(config);
  const enabledRules = normalized.rules.filter(rule => rule.enabled !== false);
  if (enabledRules.length === 0) return "-";
  if (enabledRules.length === 1) return enabledRules[0].label || "1 cible";
  return `${enabledRules.length} cibles conditionnelles`;
}
export function describeMatchingRulesSummary(matchingRules = []) {
  if (!matchingRules.length) return "No ticket (no matching target)";
  if (matchingRules.length === 1) return `1 ticket : ${matchingRules[0].label}`;
  return `${matchingRules.length} tickets : ${matchingRules.map(rule => rule.label).join(", ")}`;
}
export { evaluateCondition, fieldIsVisible, filterVisibleFields, normalizeVisibilityRules };
