import { getContactDetailCopy } from "../ContactsPage/contactDetailI18n";
const STEP_TARGETS = [{
  key: "hero",
  target: '[data-guide="contact-hero"]'
}, {
  key: "ticketBookmarks",
  target: '[data-guide="contact-ticket-bookmarks"]'
}, {
  key: "coordinates",
  target: '[data-guide="contact-coordinates"]'
}, {
  key: "activity",
  target: '[data-guide="contact-activity"]'
}, {
  key: "portal",
  target: '[data-guide="contact-portal"]'
}, {
  key: "sharedAccess",
  target: '[data-guide="contact-shared-access"]'
}, {
  key: "sidebarInfo",
  target: '[data-guide="contact-sidebar-info"]'
}, {
  key: "sidebarDates",
  target: '[data-guide="contact-sidebar-dates"]'
}, {
  key: "heroActions",
  target: '[data-guide="contact-hero-actions"]'
}];
export function getContactDetailGuideSteps(locale = "fr") {
  const steps = getContactDetailCopy(locale).guide.steps;
  return STEP_TARGETS.map(({
    key,
    target
  }) => ({
    target,
    title: steps[key].title,
    content: steps[key].content
  }));
}
