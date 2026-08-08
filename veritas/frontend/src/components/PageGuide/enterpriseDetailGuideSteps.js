import { getEnterpriseDetailCopy } from "../EnterprisesPage/enterpriseDetailI18n";
const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="enterprise-hero"]'
}, {
  key: "sidebarInfo",
  target: '[data-guide="enterprise-sidebar-info"]',
  handler: "expandInfo"
}, {
  key: "sidebarContacts",
  target: '[data-guide="enterprise-sidebar-contacts"]',
  handler: "expandContacts"
}, {
  key: "infraMap",
  target: '[data-guide="enterprise-infra-map"]'
}, {
  key: "equipment",
  target: '[data-guide="enterprise-equipment"]'
}, {
  key: "equipmentStats",
  target: '[data-guide="enterprise-equipment-stats"]',
  handler: "focusEquipmentStats"
}, {
  key: "activity",
  target: '[data-guide="enterprise-activity"]'
}, {
  key: "vault",
  target: '[data-guide="enterprise-vault"]'
}, {
  key: "sidebarNotes",
  target: '[data-guide="enterprise-sidebar-notes"]',
  handler: "expandNotes"
}, {
  key: "heroActions",
  target: '[data-guide="enterprise-hero-actions"]'
}];
export function getEnterpriseDetailGuideSteps(handlers = {}, locale = "fr") {
  const {
    expandInfo = () => {},
    expandContacts = () => {},
    expandNotes = () => {},
    focusEquipmentStats = () => {}
  } = handlers;
  const handlerMap = {
    expandInfo,
    expandContacts,
    expandNotes,
    focusEquipmentStats
  };
  const steps = getEnterpriseDetailCopy(locale).guide.steps;
  return STEP_CONFIG.map(({
    key,
    target,
    handler
  }) => ({
    target,
    title: steps[key].title,
    content: steps[key].content,
    ...(handler ? {
      onEnter: handlerMap[handler]
    } : {})
  }));
}
