export const BUILTIN_TICKET_VIEW_IDS = {
  MINE: "__builtin_mine__",
  NEW: "__builtin_new__",
  UNASSIGNED: "__builtin_unassigned__",
  IN_PROGRESS: "__builtin_in_progress__",
  PENDING: "__builtin_pending__",
  CRITICAL: "__builtin_critical__",
  SLA_OVERDUE: "__builtin_sla_overdue__",
  TO_PLAN: "__builtin_to_plan__",
  ALL: "__builtin_all__",
  /** @deprecated kept for persisted links / counts compatibility */
  TO_VALIDATE: "__builtin_to_validate__",
  OPEN: "__builtin_open__",
  MONITORING: "__builtin_monitoring__"
};

/** Sentinel resolved to the authenticated user when evaluating view rules. */
export const CURRENT_USER_ASSIGNEE_VALUE = "__current_user__";

const OPEN_STATUS = {
  field: "status",
  operator: "equals",
  value: "open"
};

export const BUILTIN_TICKET_VIEW_SECTION_IDS = {
  GENERAL: "general",
  MSP: "msp",
  HISTORY: "history"
};

/** Support-only MSP surveillance views (hidden on sales). */
export const BUILTIN_TICKET_MSP_VIEW_IDS = new Set([
  BUILTIN_TICKET_VIEW_IDS.CRITICAL,
  BUILTIN_TICKET_VIEW_IDS.SLA_OVERDUE,
  BUILTIN_TICKET_VIEW_IDS.TO_PLAN
]);

export const BUILTIN_TICKET_VIEWS = [{
  id: BUILTIN_TICKET_VIEW_IDS.MINE,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.GENERAL,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "assigned_user_id",
      operator: "equals",
      value: CURRENT_USER_ASSIGNEE_VALUE
    }, OPEN_STATUS]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.NEW,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.GENERAL,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "new"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.IN_PROGRESS,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.GENERAL,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "in_progress"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.PENDING,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.GENERAL,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "pending"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.UNASSIGNED,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.GENERAL,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "assigned_user_id",
      operator: "is_empty",
      value: ""
    }, OPEN_STATUS]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.CRITICAL,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.MSP,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [],
    filterRoot: {
      type: "group",
      id: "root-critical",
      children: [
        { type: "rule", id: "critical-open", field: "status", operator: "equals", value: "open" },
        {
          type: "group",
          id: "critical-or",
          connector: "and",
          children: [
            { type: "rule", id: "critical-major", field: "is_major_incident", operator: "equals", value: "true" },
            {
              type: "rule",
              id: "critical-priority",
              connector: "or",
              field: "priority",
              operator: "in",
              value: "high,urgent"
            }
          ]
        }
      ]
    }
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.SLA_OVERDUE,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.MSP,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "sla_breached",
      operator: "equals",
      value: "true"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.TO_PLAN,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.MSP,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "needs_planning",
      operator: "equals",
      value: "true"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.ALL,
  section: BUILTIN_TICKET_VIEW_SECTION_IDS.HISTORY,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: []
  }
}];

export function listBuiltinTicketViewsForScope(pageScope = "ticket") {
  const scope = String(pageScope || "ticket");
  if (scope === "ticket_sales") {
    return BUILTIN_TICKET_VIEWS.filter(view => !BUILTIN_TICKET_MSP_VIEW_IDS.has(view.id));
  }
  return BUILTIN_TICKET_VIEWS;
}

export function resolveBuiltinViewRules(viewId) {
  const found = BUILTIN_TICKET_VIEWS.find(view => String(view.id) === String(viewId));
  return found?.rules || null;
}
