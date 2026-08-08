export function getStartOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}
export function groupNotificationsByPriority(items = [], sectionLabels = {}) {
  const startOfToday = getStartOfToday();
  const unread = [];
  const today = [];
  const history = [];
  items.forEach(item => {
    if (!item.isRead) {
      unread.push(item);
      return;
    }
    const created = new Date(item.createdAt);
    if (!Number.isNaN(created.getTime()) && created >= startOfToday) {
      today.push(item);
      return;
    }
    history.push(item);
  });
  const labels = {
    unread: sectionLabels.unread || "New",
    today: sectionLabels.today || "Today",
    history: sectionLabels.history || "History"
  };
  return [{
    key: "unread",
    label: labels.unread,
    items: unread
  }, {
    key: "today",
    label: labels.today,
    items: today
  }, {
    key: "history",
    label: labels.history,
    items: history
  }].filter(section => section.items.length > 0);
}
export function groupArchivedNotifications(items = [], sectionLabels = {}) {
  if (!items.length) return [];
  const label = sectionLabels.archived || "Archived";
  return [{
    key: "archived",
    label,
    items
  }];
}
