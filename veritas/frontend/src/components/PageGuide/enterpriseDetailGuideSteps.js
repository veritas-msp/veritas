import { getEnterpriseDetailCopy } from "../EnterprisesPage/enterpriseDetailI18n";
const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="enterprise-hero"]'
}, {
  key: "sidebarContracts",
  target: '[data-guide="enterprise-sidebar-contracts"]'
}, {
  key: "sidebarContacts",
  target: '[data-guide="enterprise-sidebar-contacts"]',
  handler: "expandContacts"
}, {
  key: "infraMap",
  target: '[data-guide="enterprise-infra-map"]',
  handler: "showInfraMap"
}, {
  key: "equipment",
  target: '[data-guide="enterprise-equipment"]'
}, {
  key: "activity",
  target: '[data-guide="enterprise-activity"]',
  handler: "showActivity"
}, {
  key: "vault",
  target: '[data-guide="enterprise-vault"]',
  handler: "showVault"
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
    expandContacts = () => {},
    expandNotes = () => {},
    showInfraMap = () => {},
    showActivity = () => {},
    showVault = () => {}
  } = handlers;
  const handlerMap = {
    expandContacts,
    expandNotes,
    showInfraMap,
    showActivity,
    showVault
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
