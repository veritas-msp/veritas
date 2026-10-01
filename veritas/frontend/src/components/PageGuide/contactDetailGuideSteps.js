import { getContactDetailCopy } from "../ContactsPage/contactDetailI18n";
const STEP_TARGETS = [{
  key: "hero",
  target: '[data-guide="contact-hero"]'
}, {
  key: "ticketBookmarks",
  target: '[data-guide="contact-ticket-bookmarks"]'
}, {
  key: "activity",
  target: '[data-guide="contact-activity"]',
  handler: "showActivity"
}, {
  key: "portal",
  target: '[data-guide="contact-portal"]',
  handler: "showPortal"
}, {
  key: "sharedAccess",
  target: '[data-guide="contact-shared-access"]',
  handler: "showShare"
}, {
  key: "sidebarInfo",
  target: '[data-guide="contact-sidebar-info"]'
}, {
  key: "emails",
  target: '[data-guide="contact-sidebar-emails"]'
}, {
  key: "phones",
  target: '[data-guide="contact-sidebar-phones"]'
}, {
  key: "heroActions",
  target: '[data-guide="contact-hero-actions"]'
}];
export function getContactDetailGuideSteps(handlers = {}, locale = "fr") {
  const {
    showActivity = () => {},
    showPortal = () => {},
    showShare = () => {}
  } = handlers;
  const handlerMap = {
    showActivity,
    showPortal,
    showShare
  };
  const steps = getContactDetailCopy(locale).guide.steps;
  return STEP_TARGETS.map(({
    key,
    target,
    handler
  }) => {
    const step = steps[key];
    if (!step) return null;
    return {
      target,
      title: step.title,
      content: step.content,
      ...(handler ? {
        onEnter: handlerMap[handler]
      } : {})
    };
  }).filter(Boolean);
}
