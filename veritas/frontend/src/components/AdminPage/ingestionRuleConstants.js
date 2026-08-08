import { buildEmptyFilterRoot } from "../../utils/ticketViewFilterTree";
import { MAIL_CRITERION_FIELD_OPTIONS, MAIL_CRITERION_OPERATOR_OPTIONS, describeExclusionRuleFilters, normalizeIngestionAction } from "../../utils/mailIngestionRules";
export const CRITERION_FIELD_OPTIONS = MAIL_CRITERION_FIELD_OPTIONS;
export const CRITERION_OPERATOR_OPTIONS = MAIL_CRITERION_OPERATOR_OPTIONS;
export const RULE_ACTION_OPTIONS = [{
  value: "create_ticket_support",
  label: "Create a support ticket"
}, {
  value: "create_ticket_services",
  label: "Create a services / professional services ticket",
  proOnly: true
}, {
  value: "attach_comment",
  label: "Attach to an existing ticket (reply)"
}, {
  value: "ignore_mail",
  label: "Ignore"
}];
export const RULE_ACTION_LABELS = {
  create_ticket: "Create a support ticket",
  create_ticket_support: "Create a support ticket",
  create_ticket_services: "Create a services / professional services ticket",
  attach_comment: "Attach to an existing ticket (reply)",
  ignore_mail: "Ignore"
};
export const INGESTION_RULE_FORM_SECTIONS = [{
  id: "general",
  label: "Settings",
  description: "Name, action and status",
  icon: "mdi:tune-variant"
}, {
  id: "criteria",
  label: "Criteria",
  description: "Matching conditions",
  icon: "mdi:filter-outline"
}];
export const buildDefaultExclusionCriterion = () => ({
  id: `criterion-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  field: "subject",
  operator: "contains",
  value: ""
});
export const buildDefaultExclusionRule = () => ({
  id: `exclude-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  name: "",
  collectorId: "",
  filterRoot: buildEmptyFilterRoot(),
  criteria: [],
  action: "create_ticket_support",
  actionTemplate: "",
  archiveOnMatch: true,
  enabled: true
});
export function getCollectorLabel(collector) {
  if (!collector) return "-";
  return String(collector.name || "").trim() || String(collector.username || "").trim() || String(collector.server || "").trim() || String(collector.id || "").trim() || "Collector";
}
export function describeRuleCollector(rule, collectors = []) {
  const collectorId = String(rule?.collectorId || "").trim();
  if (!collectorId) return "All collectors";
  const match = (Array.isArray(collectors) ? collectors : []).find(item => String(item?.id) === collectorId);
  return match ? getCollectorLabel(match) : "Deleted collector";
}
export function describeExclusionRuleCriteria(rule) {
  return describeExclusionRuleFilters(rule);
}
export function getRuleActionLabel(action) {
  return RULE_ACTION_LABELS[normalizeIngestionAction(action)] || action;
}
export { normalizeIngestionAction } from "../../utils/mailIngestionRules";
