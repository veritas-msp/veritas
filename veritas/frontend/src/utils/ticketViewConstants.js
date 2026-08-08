import { buildDefaultRule, buildEmptyFilterRoot, countRulesInTree, legacyRulesToFilterRoot, normalizeFilterRoot } from "./ticketViewFilterTree.js";
import { getTicketViewConstantsCopy } from "../i18n/ticketViewConstantsI18n.js";
export const TICKET_VIEW_FIELD_OPTIONS = [{
  value: "title",
  label: "Subject"
}, {
  value: "description",
  label: "Description"
}, {
  value: "type",
  label: "ITIL type"
}, {
  value: "category",
  label: "Category"
}, {
  value: "status",
  label: "Status"
}, {
  value: "priority",
  label: "Priority"
}, {
  value: "channel",
  label: "Channel"
}, {
  value: "ticket_number",
  label: "Ticket no."
}, {
  value: "client_id",
  label: "Client ID"
}, {
  value: "assigned",
  label: "Assignee (name / email)"
}, {
  value: "assigned_user_id",
  label: "Assignee (agent)"
}, {
  value: "pending_validator_user_id",
  label: "Pending validator"
}, {
  value: "requester_contact_id",
  label: "Requester contact ID"
}, {
  value: "tags",
  label: "Labels / tags"
}];
export const TICKET_VIEW_STATUS_OPTIONS = [{
  value: "open",
  label: "Open (excluding resolved / closed)"
}, {
  value: "new",
  label: "New"
}, {
  value: "in_progress",
  label: "In progress"
}, {
  value: "pending",
  label: "Pending"
}, {
  value: "resolved",
  label: "Resolved"
}, {
  value: "closed",
  label: "Closed"
}];
export const TICKET_VIEW_OPERATOR_OPTIONS = [{
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
  value: "in",
  label: "is among (list)"
}, {
  value: "not_in",
  label: "is not among"
}, {
  value: "is_empty",
  label: "is empty"
}, {
  value: "is_not_empty",
  label: "is not empty"
}];
export const TICKET_VIEW_MATCH_MODES = [{
  value: "all",
  label: "All criteria (AND)"
}, {
  value: "any",
  label: "At least one criterion (OR)"
}];
export const TICKET_VIEW_VISIBILITY_OPTIONS = [{
  value: "private",
  label: "Private",
  hint: "Visible only to you",
  icon: "mdi:lock-outline"
}, {
  value: "public",
  label: "Public",
  hint: "Visible to everyone",
  icon: "mdi:earth"
}, {
  value: "assigned",
  label: "Assigned",
  hint: "Users, profiles and/or teams",
  icon: "mdi:account-multiple-check-outline"
}];
export const TICKET_VIEW_FORM_SECTIONS = [{
  id: "general",
  label: "General",
  description: "Name and description",
  icon: "mdi:information-outline"
}, {
  id: "visibility",
  label: "Visibility",
  description: "Who can see the view",
  icon: "mdi:eye-outline"
}, {
  id: "filters",
  label: "Filters",
  description: "Ticket filter rules",
  icon: "mdi:filter-variant"
}];
export function getTicketViewFieldOptions(locale) {
  return getTicketViewConstantsCopy(locale).fieldOptions;
}
export function getTicketViewStatusOptions(locale) {
  return getTicketViewConstantsCopy(locale).statusOptions;
}
export function getTicketViewOperatorOptions(locale) {
  return getTicketViewConstantsCopy(locale).operatorOptions;
}
export function getTicketViewMatchModes(locale) {
  return getTicketViewConstantsCopy(locale).matchModes;
}
export function getTicketViewVisibilityOptions(locale) {
  return getTicketViewConstantsCopy(locale).visibilityOptions;
}
export function getTicketViewFormSections(locale) {
  return getTicketViewConstantsCopy(locale).formSections;
}
export function getBuiltinTicketViews(locale) {
  const copy = getTicketViewConstantsCopy(locale);
  return BUILTIN_TICKET_VIEWS.map(view => {
    const labels = copy.getBuiltinViewLabels(view.id);
    return {
      ...view,
      name: labels.name || view.name,
      description: labels.description || view.description
    };
  });
}
export function describeViewAssignments(view = {}, locale = "fr") {
  const copy = getTicketViewConstantsCopy(locale);
  const parts = [];
  const users = view.users || [];
  const teams = view.teams || [];
  const profiles = view.profileNames || [];
  if (users.length > 0) {
    parts.push(copy.formatUserCount(users.length));
  }
  if (profiles.length > 0) {
    parts.push(copy.formatProfileCount(profiles.length, profiles.join(", ")));
  }
  if (teams.length > 0) {
    const teamLabels = teams.map(t => t.name || t.id).join(", ");
    parts.push(copy.formatTeamCount(teams.length, teamLabels));
  }
  if (parts.length === 0) return copy.describe.noAssignment;
  return parts.join(" · ");
}
export const BUILTIN_TICKET_VIEW_IDS = {
  MINE: "__builtin_mine__",
  TO_VALIDATE: "__builtin_to_validate__",
  NEW: "__builtin_new__",
  IN_PROGRESS: "__builtin_in_progress__",
  PENDING: "__builtin_pending__",
  OPEN: "__builtin_open__",
  ALL: "__builtin_all__"
};
export const CURRENT_USER_ASSIGNEE_VALUE = "__current_user__";
export const DEFAULT_TICKET_VIEW_ID = BUILTIN_TICKET_VIEW_IDS.ALL;
export const BUILTIN_TICKET_VIEWS = [{
  id: BUILTIN_TICKET_VIEW_IDS.MINE,
  name: "My tickets",
  icon: "mdi:account-circle-outline",
  description: "Tickets assigned to me",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "assigned_user_id",
      operator: "equals",
      value: CURRENT_USER_ASSIGNEE_VALUE
    }]
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}, {
  id: BUILTIN_TICKET_VIEW_IDS.TO_VALIDATE,
  name: "To validate",
  icon: "mdi:clipboard-check-outline",
  description: "Tickets waiting for my validation",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "pending_validator_user_id",
      operator: "equals",
      value: CURRENT_USER_ASSIGNEE_VALUE
    }]
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}, {
  id: BUILTIN_TICKET_VIEW_IDS.NEW,
  name: "New tickets",
  icon: "mdi:inbox-arrow-down",
  description: "Tickets with new status",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "new"
    }]
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}, {
  id: BUILTIN_TICKET_VIEW_IDS.IN_PROGRESS,
  name: "Tickets in progress",
  icon: "mdi:progress-clock",
  description: "Tickets currently being handled",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "in_progress"
    }]
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}, {
  id: BUILTIN_TICKET_VIEW_IDS.PENDING,
  name: "Pending tickets",
  icon: "mdi:pause-circle-outline",
  description: "Tickets awaiting a reply",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "pending"
    }]
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}, {
  id: BUILTIN_TICKET_VIEW_IDS.OPEN,
  name: "All open tickets",
  icon: "mdi:ticket-confirmation-outline",
  description: "Open tickets (new, in progress, pending)",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "open"
    }]
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}, {
  id: BUILTIN_TICKET_VIEW_IDS.ALL,
  name: "All tickets",
  icon: "mdi:ticket-outline",
  description: "All active tickets (excluding trash)",
  visibility: "public",
  isBuiltin: true,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: []
  },
  sortBy: "updated_at",
  sortDirection: "desc"
}];
export const DEFAULT_TICKET_VIEW_RULES = {
  viewMode: "active",
  filterRoot: buildEmptyFilterRoot(),
  matchMode: "all",
  criteria: []
};
export function buildDefaultCriterion() {
  return buildDefaultRule();
}
export function normalizeTicketViewRules(rules = {}) {
  const filterRoot = normalizeFilterRoot(rules.filterRoot, rules);
  return {
    viewMode: rules.viewMode === "trash" ? "trash" : "active",
    filterRoot,
    matchMode: rules.matchMode === "any" ? "any" : "all",
    criteria: Array.isArray(rules.criteria) ? rules.criteria : []
  };
}
export function buildDefaultTicketView(partial = {}) {
  return {
    name: "",
    description: "",
    pageScope: "ticket",
    visibility: "private",
    icon: "mdi:view-list",
    rules: {
      ...DEFAULT_TICKET_VIEW_RULES,
      filterRoot: buildEmptyFilterRoot()
    },
    sortBy: "updated_at",
    sortDirection: "desc",
    displayOrder: 0,
    ...partial
  };
}
function describeRuleBrief(rule, copy) {
  const field = copy.getFieldLabel(rule.field);
  const operator = copy.getOperatorLabel(rule.operator);
  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return `${field} ${operator}`;
  }
  const value = String(rule.value || "").trim();
  return value ? `${field} ${operator} « ${value} »` : `${field} ${operator}…`;
}
function describeFilterGroupChildren(children = [], copy) {
  return children.map((child, index) => {
    const prefix = index > 0 ? ` ${child.connector === "or" ? copy.describe.connectorOr : copy.describe.connectorAnd} ` : "";
    if (child.type === "group") {
      const inner = describeFilterGroupChildren(child.children || [], copy);
      return `${prefix}(${inner || copy.describe.emptyGroup})`;
    }
    return `${prefix}${describeRuleBrief(child, copy)}`;
  }).join("");
}
export function describeViewCriteria(rules, locale = "fr") {
  const copy = getTicketViewConstantsCopy(locale);
  const filterRoot = normalizeFilterRoot(rules?.filterRoot, rules);
  const ruleCount = countRulesInTree(filterRoot);
  if (ruleCount === 0) return copy.describe.noFilter;
  const summary = describeFilterGroupChildren(filterRoot.children || [], copy);
  return summary.trim() || copy.describe.noFilter;
}
export function canUserEditTicketView(view, {
  userId,
  isAdmin = false
} = {}) {
  if (!view || view.isBuiltin) return false;
  const ownerId = view.ownerUserId ?? view.owner_user_id;
  const isOwner = ownerId && userId && String(ownerId) === String(userId);
  const visibility = view.visibility === "profile" ? "assigned" : view.visibility;
  if (visibility === "private") return isOwner;
  if (visibility === "public") return isOwner || isAdmin;
  if (visibility === "assigned") return isAdmin;
  return false;
}
export { countRulesInTree, legacyRulesToFilterRoot, normalizeFilterRoot };
