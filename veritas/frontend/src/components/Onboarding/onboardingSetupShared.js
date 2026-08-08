import { DEFAULT_SLA_SETTINGS, createDefaultWeekSchedule } from "../../utils/slaSettingsUtils";
export const ONBOARDING_SETUP_EMPTY = {
  app_organization_name: "",
  app_support_email: "",
  app_support_phone: "",
  app_organization_address: "",
  app_organization_website: "",
  app_organization_employee_range: "",
  app_timezone: "Europe/Paris"
};
export function cloneWeekSchedule(rows) {
  return (rows || createDefaultWeekSchedule()).map(row => ({
    ...row
  }));
}
export function buildOnboardingSetupDraft(general = {}, sla = {}) {
  return {
    general: {
      app_organization_name: general?.app_organization_name || "",
      app_support_email: general?.app_support_email || "",
      app_support_phone: general?.app_support_phone || "",
      app_organization_address: general?.app_organization_address || "",
      app_organization_website: general?.app_organization_website || "",
      app_organization_employee_range: general?.app_organization_employee_range || "",
      app_timezone: general?.app_timezone || sla?.timezone || "Europe/Paris"
    },
    weekSchedule: cloneWeekSchedule(sla?.weekSchedule || DEFAULT_SLA_SETTINGS.weekSchedule)
  };
}
export const ONBOARDING_SAVE_STEP_KEYS = new Set(["identity", "support", "hours"]);
export const ONBOARDING_WIDE_CARD_KEYS = new Set(["welcome", "hours", "agents"]);
export function countActiveMspAgents(users) {
  if (!Array.isArray(users)) return 0;
  return users.filter(row => row?.is_active !== false && String(row?.role || "").toLowerCase() !== "client").length;
}
export function filterActiveMspAgents(users) {
  if (!Array.isArray(users)) return [];
  return users.filter(row => row?.is_active !== false && String(row?.role || "").toLowerCase() !== "client");
}
