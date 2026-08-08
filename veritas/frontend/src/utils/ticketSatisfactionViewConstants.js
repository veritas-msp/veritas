export const TICKET_SATISFACTION_VIEW_IDS = {
  MINE: "__satisfaction_mine__",
  ALL: "__satisfaction_all__"
};
export const TICKET_SATISFACTION_VIEWS = [{
  id: TICKET_SATISFACTION_VIEW_IDS.MINE,
  name: "My customer feedback",
  icon: "mdi:account-star-outline",
  description: "Customer feedback on your assigned tickets",
  scope: "mine",
  isSatisfactionView: true
}, {
  id: TICKET_SATISFACTION_VIEW_IDS.ALL,
  name: "All customer feedback",
  icon: "mdi:star-multiple-outline",
  description: "All customer feedback across tickets",
  scope: "all",
  adminOnly: true,
  isSatisfactionView: true
}];
export function isTicketSatisfactionViewId(viewId) {
  return TICKET_SATISFACTION_VIEWS.some(view => String(view.id) === String(viewId));
}
export function resolveTicketSatisfactionScope(viewId) {
  const view = TICKET_SATISFACTION_VIEWS.find(item => String(item.id) === String(viewId));
  return view?.scope || "mine";
}
export function localizeTicketSatisfactionViews(viewsCopy = {}, {
  isAdmin = false
} = {}) {
  return TICKET_SATISFACTION_VIEWS.filter(view => !view.adminOnly || isAdmin).map(view => {
    const labels = viewsCopy?.[view.scope] || {};
    return {
      ...view,
      name: labels.name || view.name,
      description: labels.description || view.description
    };
  });
}
