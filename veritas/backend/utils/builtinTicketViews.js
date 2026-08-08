export const BUILTIN_TICKET_VIEW_IDS = {
  MINE: "__builtin_mine__",
  TO_VALIDATE: "__builtin_to_validate__",
  NEW: "__builtin_new__",
  IN_PROGRESS: "__builtin_in_progress__",
  PENDING: "__builtin_pending__",
  OPEN: "__builtin_open__",
  MONITORING: "__builtin_monitoring__",
  ALL: "__builtin_all__"
};

/** Sentinel resolved to the authenticated user when evaluating view rules. */
export const CURRENT_USER_ASSIGNEE_VALUE = "__current_user__";

export const BUILTIN_TICKET_VIEWS = [{
  id: BUILTIN_TICKET_VIEW_IDS.MINE,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "assigned_user_id",
      operator: "equals",
      value: CURRENT_USER_ASSIGNEE_VALUE
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.TO_VALIDATE,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "pending_validator_user_id",
      operator: "equals",
      value: CURRENT_USER_ASSIGNEE_VALUE
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.NEW,
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
  id: BUILTIN_TICKET_VIEW_IDS.OPEN,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "status",
      operator: "equals",
      value: "open"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.MONITORING,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: [{
      field: "category",
      operator: "equals",
      value: "infrastructure"
    }, {
      field: "channel",
      operator: "equals",
      value: "monitoring"
    }]
  }
}, {
  id: BUILTIN_TICKET_VIEW_IDS.ALL,
  rules: {
    matchMode: "all",
    viewMode: "active",
    criteria: []
  }
}];
export function resolveBuiltinViewRules(viewId) {
  const found = BUILTIN_TICKET_VIEWS.find(view => String(view.id) === String(viewId));
  return found?.rules || null;
}
