export const DEFAULT_IN_APP_SETTINGS = {
  enabled: true,
  events: {
    ticket_commented: {
      enabled: true,
      notifyAssignees: true,
      notifyWatchers: true,
      excludeInternalComments: false
    },
    ticket_assigned: {
      enabled: true
    },
    ticket_created: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_updated: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_resolved: {
      enabled: true,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_satisfaction: {
      enabled: true,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_validation_requested: {
      enabled: true
    },
    ticket_validation_responded: {
      enabled: true
    }
  }
};
export const IN_APP_EVENT_OPTIONS = [{
  key: "ticket_commented",
  label: "Comment added",
  description: "Alert when a new message is posted on a followed ticket.",
  icon: "mdi:comment-text-outline",
  fields: [{
    key: "notifyAssignees",
    label: "Assignees",
    hint: "Agents assigned to the ticket"
  }, {
    key: "notifyWatchers",
    label: "Followers",
    hint: "Agents following the ticket"
  }, {
    key: "excludeInternalComments",
    label: "Ignore internal notes",
    hint: "Do not alert for private replies"
  }]
}, {
  key: "ticket_assigned",
  label: "Assignment",
  description: "Alert when an agent is added as assignee.",
  icon: "mdi:account-arrow-right-outline",
  fields: []
}, {
  key: "ticket_created",
  label: "Ticket creation",
  description: "Alert when a ticket is created.",
  icon: "mdi:ticket-confirmation-outline",
  fields: [{
    key: "notifyAssignees",
    label: "Assignees",
    hint: "Agents assigned to the ticket"
  }, {
    key: "notifyWatchers",
    label: "Followers",
    hint: "Agents following the ticket"
  }]
}, {
  key: "ticket_updated",
  label: "Ticket update",
  description: "Alert on an update (status, priority, etc.).",
  icon: "mdi:pencil-outline",
  fields: [{
    key: "notifyAssignees",
    label: "Assignees",
    hint: "Agents assigned to the ticket"
  }, {
    key: "notifyWatchers",
    label: "Followers",
    hint: "Agents following the ticket"
  }]
}, {
  key: "ticket_resolved",
  label: "Ticket resolution",
  description: "Alert when a ticket becomes resolved.",
  icon: "mdi:check-circle-outline",
  fields: [{
    key: "notifyAssignees",
    label: "Assignees",
    hint: "Agents assigned to the ticket"
  }, {
    key: "notifyWatchers",
    label: "Followers",
    hint: "Agents following the ticket"
  }]
}, {
  key: "ticket_satisfaction",
  label: "Customer satisfaction feedback",
  description: "Alert when a client leaves a rating on a completed ticket.",
  icon: "mdi:star-outline",
  fields: [{
    key: "notifyAssignees",
    label: "Assignees",
    hint: "Agent assigned to the ticket"
  }, {
    key: "notifyWatchers",
    label: "Followers",
    hint: "Agents following the ticket"
  }]
}, {
  key: "ticket_validation_requested",
  label: "Validation requested",
  description: "Alert when someone asks you to validate a ticket.",
  icon: "mdi:clipboard-check-outline",
  fields: []
}, {
  key: "ticket_validation_responded",
  label: "Validation answered",
  description: "Alert when your validation request is approved or rejected.",
  icon: "mdi:clipboard-text-outline",
  fields: []
}];
export const IN_APP_EVENT_GROUPS = [{
  id: "activity",
  title: "Activity",
  description: "Exchanges and messages on tickets.",
  eventKeys: ["ticket_commented", "ticket_validation_requested", "ticket_validation_responded"]
}, {
  id: "assignment",
  title: "Assignment",
  description: "Ownership and reassignment.",
  eventKeys: ["ticket_assigned"]
}, {
  id: "lifecycle",
  title: "Lifecycle",
  description: "Ticket creation, updates and closure.",
  eventKeys: ["ticket_created", "ticket_updated", "ticket_resolved", "ticket_satisfaction"]
}];
export function normalizeInAppSettings(raw = {}) {
  const defaults = DEFAULT_IN_APP_SETTINGS;
  const sourceEvents = raw?.events && typeof raw.events === "object" && !Array.isArray(raw.events) ? raw.events : {};
  const normalizeEvent = (key, fallback) => {
    const item = sourceEvents[key];
    if (!item || typeof item !== "object") return {
      ...fallback
    };
    return {
      ...fallback,
      ...Object.fromEntries(Object.entries(fallback).map(([field, defaultValue]) => [field, typeof item[field] === "boolean" ? item[field] : defaultValue]))
    };
  };
  return {
    enabled: raw?.enabled !== false,
    events: {
      ticket_commented: normalizeEvent("ticket_commented", defaults.events.ticket_commented),
      ticket_assigned: normalizeEvent("ticket_assigned", defaults.events.ticket_assigned),
      ticket_created: normalizeEvent("ticket_created", defaults.events.ticket_created),
      ticket_updated: normalizeEvent("ticket_updated", defaults.events.ticket_updated),
      ticket_resolved: normalizeEvent("ticket_resolved", defaults.events.ticket_resolved),
      ticket_satisfaction: normalizeEvent("ticket_satisfaction", defaults.events.ticket_satisfaction),
      ticket_validation_requested: normalizeEvent("ticket_validation_requested", defaults.events.ticket_validation_requested),
      ticket_validation_responded: normalizeEvent("ticket_validation_responded", defaults.events.ticket_validation_responded)
    }
  };
}
export const DEFAULT_USER_IN_APP_PREFERENCES = {
  enabled: true,
  events: {
    ticket_commented: {
      enabled: true
    },
    ticket_assigned: {
      enabled: true
    },
    ticket_created: {
      enabled: true
    },
    ticket_updated: {
      enabled: true
    },
    ticket_resolved: {
      enabled: true
    },
    ticket_satisfaction: {
      enabled: true
    },
    ticket_validation_requested: {
      enabled: true
    },
    ticket_validation_responded: {
      enabled: true
    }
  }
};
export function normalizeUserInAppPreferences(raw = {}) {
  const defaults = DEFAULT_USER_IN_APP_PREFERENCES;
  const sourceEvents = raw?.events && typeof raw.events === "object" && !Array.isArray(raw.events) ? raw.events : {};
  const normalizeEvent = key => {
    const item = sourceEvents[key];
    const defaultEnabled = defaults.events[key]?.enabled !== false;
    if (!item || typeof item !== "object") return {
      enabled: defaultEnabled
    };
    return {
      enabled: item.enabled !== false
    };
  };
  return {
    enabled: raw?.enabled !== false,
    events: {
      ticket_commented: normalizeEvent("ticket_commented"),
      ticket_assigned: normalizeEvent("ticket_assigned"),
      ticket_created: normalizeEvent("ticket_created"),
      ticket_updated: normalizeEvent("ticket_updated"),
      ticket_resolved: normalizeEvent("ticket_resolved"),
      ticket_satisfaction: normalizeEvent("ticket_satisfaction"),
      ticket_validation_requested: normalizeEvent("ticket_validation_requested"),
      ticket_validation_responded: normalizeEvent("ticket_validation_responded")
    }
  };
}
