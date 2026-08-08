import { getSupervisionCenterCopy } from "../EquipementPage/supervisionCenterPageI18n";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="supervision-hero"]',
  handler: "showOperations"
}, {
  key: "tabs",
  target: '[data-guide="supervision-tabs"]'
}, {
  key: "kpis",
  target: '[data-guide="supervision-kpis"]',
  handler: "showOperations"
}, {
  key: "filters",
  target: '[data-guide="supervision-filters"]',
  handler: "showOperations"
}, {
  key: "queue",
  target: '[data-guide="supervision-queue"]',
  handler: "showOperations"
}, {
  key: "fleet",
  target: '[data-guide="supervision-fleet"]',
  handler: "showFleet"
}, {
  key: "history",
  target: '[data-guide="supervision-history"]',
  handler: "showHistory"
}];

export function getSupervisionCenterGuideSteps(handlers = {}, locale = "fr") {
  const {
    showOperations = () => {},
    showFleet = () => {},
    showHistory = () => {}
  } = handlers;
  const handlerMap = {
    showOperations,
    showFleet,
    showHistory
  };
  const steps = getSupervisionCenterCopy(locale).guide?.steps || {};
  return STEP_CONFIG.map(({
    key,
    target,
    handler
  }) => ({
    target,
    title: steps[key]?.title || key,
    content: steps[key]?.content || "",
    ...(handler ? {
      onEnter: handlerMap[handler]
    } : {})
  })).filter(step => step.title && step.content);
}
