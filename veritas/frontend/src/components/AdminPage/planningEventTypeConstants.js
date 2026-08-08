export const PLANNING_KPI_TONE_OPTIONS = [{
  value: "blue",
  label: "Bleu",
  color: "#2b5fab"
}, {
  value: "violet",
  label: "Violet",
  color: "#6d28d9"
}, {
  value: "amber",
  label: "Ambre",
  color: "#d97706"
}, {
  value: "orange",
  label: "Orange",
  color: "#ea580c"
}, {
  value: "teal",
  label: "Turquoise",
  color: "#0d9488"
}, {
  value: "cyan",
  label: "Cyan",
  color: "#0891b2"
}];

export function getPlanningKpiToneColor(tone) {
  const match = PLANNING_KPI_TONE_OPTIONS.find(opt => opt.value === tone);
  return match?.color || PLANNING_KPI_TONE_OPTIONS[0].color;
}

export const PLANNING_EVENT_TYPE_ICON_CHOICES = ["mdi:wrench", "mdi:presentation", "mdi:shield-check", "mdi:cog", "mdi:update", "mdi:beach", "mdi:chart-line-variant", "mdi:shield-lock", "mdi:calendar-blank", "mdi:calendar-clock", "mdi:account-hard-hat", "mdi:tools", "mdi:hammer-wrench", "mdi:clipboard-check-outline", "mdi:phone", "mdi:video", "mdi:map-marker", "mdi:airplane", "mdi:car", "mdi:school", "mdi:certificate", "mdi:bug-outline", "mdi:lightning-bolt", "mdi:server", "mdi:laptop", "mdi:account-group", "mdi:handshake", "mdi:star-outline", "mdi:flag-outline", "mdi:bell-outline"];

export function buildDefaultPlanningEventTypeDraft() {
  return {
    typeKey: "",
    label: "",
    icon: "mdi:calendar-blank",
    kpiTone: "blue",
    enabled: true,
    formSelectable: true,
    sortOrder: ""
  };
}

export function buildPlanningEventTypeDraftFromType(type) {
  return {
    typeKey: type?.typeKey || "",
    label: type?.label || "",
    icon: type?.icon || "mdi:calendar-blank",
    kpiTone: type?.kpiTone || "blue",
    enabled: type?.enabled !== false,
    formSelectable: type?.formSelectable !== false,
    sortOrder: type?.sortOrder ?? ""
  };
}

export function mapPlanningEventTypeToUi(type) {
  return {
    value: type.typeKey,
    label: type.label,
    icon: type.icon || "mdi:calendar-blank",
    kpiTone: type.kpiTone || "blue",
    formSelectable: type.formSelectable !== false,
    enabled: type.enabled !== false
  };
}
