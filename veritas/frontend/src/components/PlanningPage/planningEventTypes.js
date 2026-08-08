import { getTicketTypeIcon, getTicketTypeSupportLabel } from "../../utils/ticketReminderEvent";
import { mapPlanningEventTypeToUi } from "../AdminPage/planningEventTypeConstants";

export const PLANNING_EVENT_TYPES = [{
  value: "intervention",
  label: "Intervention",
  icon: "mdi:wrench",
  kpiTone: "blue"
}, {
  value: "presentation",
  label: "Presentation",
  icon: "mdi:presentation",
  kpiTone: "violet"
}, {
  value: "maintenance_preventive",
  label: "Preventive",
  icon: "mdi:shield-check",
  kpiTone: "amber"
}, {
  value: "maintenance",
  label: "Maintenance",
  icon: "mdi:cog",
  kpiTone: "orange"
}, {
  value: "mise_a_jour",
  label: "Update",
  icon: "mdi:update",
  kpiTone: "blue"
}, {
  value: "conge",
  label: "Leave",
  icon: "mdi:beach",
  kpiTone: "teal"
}, {
  value: "integration_monitoring",
  label: "Monitoring",
  icon: "mdi:chart-line-variant",
  kpiTone: "cyan"
}, {
  value: "campagne",
  label: "Campagne",
  icon: "mdi:shield-lock",
  kpiTone: "violet"
}, {
  value: "other",
  label: "Other",
  icon: "mdi:calendar-blank",
  kpiTone: "orange"
}];

let runtimePlanningTypes = null;

export function setPlanningEventTypesCache(types) {
  if (!Array.isArray(types) || types.length === 0) {
    runtimePlanningTypes = null;
    return;
  }
  runtimePlanningTypes = types.map(type => type.value ? type : mapPlanningEventTypeToUi(type));
}

export function getPlanningEventTypesList() {
  return runtimePlanningTypes || PLANNING_EVENT_TYPES;
}

export const PLANNING_TYPE_LABELS = Object.fromEntries(PLANNING_EVENT_TYPES.map(type => [type.value, type.label]));

export const PLANNING_SUPPORT_LEGEND = [{
  value: "support_incident",
  label: "Support incident",
  icon: "mdi:alert-circle-outline"
}, {
  value: "support_demande",
  label: "Support request",
  icon: "mdi:hand-extended-outline"
}, {
  value: "support_probleme",
  label: "Support issue",
  icon: "mdi:bug-outline"
}];

export function getPlanningLegendItems(types = getPlanningEventTypesList()) {
  return Array.isArray(types) ? [...types] : [];
}

export const PLANNING_LEGEND_ITEMS = getPlanningLegendItems(PLANNING_EVENT_TYPES);

export function getPlanningEventTypeKey(event) {
  if (event?.isTicketReminder || event?.ticketId) {
    return "support";
  }
  return event?.resource || event?.type || "other";
}

export function getPlanningEventTypeIcon(event, types = getPlanningEventTypesList()) {
  if (event?.isTicketReminder || event?.ticketId) {
    return getTicketTypeIcon(event.ticketType);
  }
  const key = getPlanningEventTypeKey(event);
  const match = types.find(type => type.value === key);
  return match?.icon || "mdi:calendar-blank";
}

export function getPlanningEventTypeLabel(event, types = getPlanningEventTypesList()) {
  if (event?.isTicketReminder || event?.ticketId) {
    return getTicketTypeSupportLabel(event.ticketType);
  }
  const key = getPlanningEventTypeKey(event);
  const match = types.find(type => type.value === key);
  return match?.label || PLANNING_TYPE_LABELS[key] || key;
}
