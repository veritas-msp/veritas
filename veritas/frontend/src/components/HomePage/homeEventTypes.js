import { PLANNING_EVENT_TYPES } from "../PlanningPage/planningEventTypes";
import { getHomePageCopy } from "./homePageI18n";
const TYPE_ICONS = Object.fromEntries(PLANNING_EVENT_TYPES.map(({
  value,
  icon
}) => [value, icon]));
const FALLBACK_ICON = "mdi:calendar-blank";
export function getHomeEventTypeMeta(type, typeLabel, locale) {
  const copy = getHomePageCopy(locale);
  return {
    icon: TYPE_ICONS[type] || FALLBACK_ICON,
    label: copy.getEventTypeLabel(type, typeLabel)
  };
}
