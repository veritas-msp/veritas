import { normalizeFilterRoot, ticketMatchesFilterRoot, validateFilterRoot } from "./ticketViewFilterTree";
export const MAIL_CRITERION_FIELD_OPTIONS = [{
  value: "subject",
  label: "Subject"
}, {
  value: "body",
  label: "Body"
}, {
  value: "fromAddress",
  label: "Sender email"
}, {
  value: "fromName",
  label: "Sender name"
}, {
  value: "fromDomain",
  label: "Sender domain"
}, {
  value: "toAddresses",
  label: "Recipients (To)"
}, {
  value: "ccAddresses",
  label: "Cc"
}, {
  value: "replyToAddress",
  label: "Reply-To"
}, {
  value: "isReply",
  label: "Reply / forward (RE/FW)"
}];
export const MAIL_CRITERION_OPERATOR_OPTIONS = [{
  value: "contains",
  label: "contains"
}, {
  value: "not_contains",
  label: "does not contain"
}, {
  value: "equals",
  label: "equals"
}, {
  value: "not_equals",
  label: "is not equal to"
}, {
  value: "starts_with",
  label: "starts with"
}, {
  value: "ends_with",
  label: "ends with"
}, {
  value: "is_empty",
  label: "is empty"
}, {
  value: "is_not_empty",
  label: "is not empty"
}, {
  value: "in",
  label: "contains one of the values (list)"
}, {
  value: "not_in",
  label: "contains none of the values"
}];
export const MAIL_CRITERION_FIELD_ICONS = {
  subject: "mdi:text-short",
  body: "mdi:text-long",
  fromAddress: "mdi:email-outline",
  fromName: "mdi:account-outline",
  fromDomain: "mdi:web",
  toAddresses: "mdi:email-multiple-outline",
  ccAddresses: "mdi:email-arrow-right-outline",
  replyToAddress: "mdi:reply-outline",
  isReply: "mdi:reply-all-outline"
};
export function normalizeIngestionAction(action = "") {
  const key = String(action || "create_ticket_support").trim();
  if (key === "create_ticket") return "create_ticket_support";
  if (key === "attach_comment") return "attach_comment";
  if (key === "ignore_mail") return "ignore_mail";
  if (key === "create_ticket_services") return "create_ticket_services";
  return "create_ticket_support";
}
export function evaluateMailCriterion(criterion = {}, context = {}) {
  const field = String(criterion?.field || "subject");
  const operator = String(criterion?.operator || "contains");
  const rawExpected = criterion?.value ?? "";
  const expected = String(rawExpected).trim().toLowerCase();
  const actual = String(context?.[field] ?? "").toLowerCase();
  if (operator === "is_empty") return actual.length === 0;
  if (operator === "is_not_empty") return actual.length > 0;
  if (operator === "equals") return actual === expected;
  if (operator === "not_equals") return actual !== expected;
  if (operator === "starts_with") return expected ? actual.startsWith(expected) : false;
  if (operator === "ends_with") return expected ? actual.endsWith(expected) : false;
  if (operator === "not_contains") return expected ? !actual.includes(expected) : false;
  if (operator === "in") {
    const list = String(rawExpected).split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
    return list.length > 0 && list.some(item => actual.includes(item));
  }
  if (operator === "not_in") {
    const list = String(rawExpected).split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
    return list.length === 0 || !list.some(item => actual.includes(item));
  }
  if (!expected) return false;
  return actual.includes(expected);
}
export function mailMatchesFilterRoot(filterRoot, context = {}) {
  return ticketMatchesFilterRoot(filterRoot, context, context, (criterion, _mail, ctx) => evaluateMailCriterion(criterion, ctx || _mail));
}
export function normalizeExclusionFilterRoot(rule = {}) {
  if (rule?.filterRoot?.type === "group") {
    return normalizeFilterRoot(rule.filterRoot);
  }
  return normalizeFilterRoot(null, {
    criteria: Array.isArray(rule?.criteria) ? rule.criteria : [],
    matchMode: rule?.matchMode
  });
}
export function validateMailFilterRoot(filterRoot) {
  const root = normalizeFilterRoot(filterRoot);
  if (!root.children?.length) return null;
  return validateFilterRoot(root);
}
const FIELD_LABELS = Object.fromEntries(MAIL_CRITERION_FIELD_OPTIONS.map(o => [o.value, o.label]));
const OPERATOR_LABELS = Object.fromEntries(MAIL_CRITERION_OPERATOR_OPTIONS.map(o => [o.value, o.label]));
export function describeMailCriterionBrief(criterion = {}) {
  const field = FIELD_LABELS[criterion.field] || criterion.field;
  const operator = OPERATOR_LABELS[criterion.operator] || criterion.operator;
  if (criterion.operator === "is_empty" || criterion.operator === "is_not_empty") {
    return `${field} ${operator}`;
  }
  const value = String(criterion.value || "").trim();
  return value ? `${field} ${operator} « ${value} »` : `${field} ${operator}…`;
}
export function describeExclusionRuleFilters(rule = {}) {
  const root = normalizeExclusionFilterRoot(rule);
  if (!root.children?.length) return "All emails (no criteria)";
  const parts = [];
  const walk = (group, depth = 0) => {
    (group.children || []).forEach((child, index) => {
      if (index > 0 && child.connector) {
        parts.push(child.connector === "or" ? " OU " : " ET ");
      }
      if (child.type === "group") {
        parts.push("(");
        walk(child, depth + 1);
        parts.push(")");
      } else {
        parts.push(describeMailCriterionBrief(child));
      }
    });
  };
  walk(root);
  return parts.join("") || "All emails";
}
