export const FOLDER_MODE_THRESHOLD = 8;
export const TAB_FOLDER_GROUPS = [{
  key: "enterprise",
  types: ["ContratDetail", "Contrat"],
  icon: "mdi:office-building"
}, {
  key: "contact",
  types: ["ContactDetail", "Contact"],
  icon: "mdi:account-group"
}, {
  key: "ticket",
  types: ["TicketDetail", "TicketCreate", "Ticket"],
  icon: "mdi:message-processing-outline"
}, {
  key: "ticketSales",
  types: ["TicketSalesDetail", "TicketSalesCreate", "TicketSales"],
  icon: "mdi:briefcase-edit-outline"
}, {
  key: "planning",
  types: ["Planning"],
  icon: "mdi:calendar-clock"
}, {
  key: "hardware",
  types: ["Hardware", "Equipment", "EquipmentDetail", "JobDetail", "ComputerFleetStats"],
  icon: "mdi:monitor-dashboard"
}, {
  key: "cyber",
  types: ["CampaignDetail", "AntivirusDetail", "AntispamDetail", "Cybersecurite"],
  icon: "mdi:shield-lock"
}, {
  key: "service",
  types: ["TenantDetail", "Service"],
  icon: "mdi:cloud-outline"
}, {
  key: "monitoring",
  types: ["MonitoringDetail", "Mon", "Rapport"],
  icon: "mdi:chart-line"
}, {
  key: "documents",
  types: ["DocumentsHub"],
  icon: "mdi:folder-outline"
}];
const TYPE_TO_FOLDER = new Map();
TAB_FOLDER_GROUPS.forEach(group => {
  group.types.forEach(type => TYPE_TO_FOLDER.set(type, group.key));
});
const TYPE_RANK = new Map();
TAB_FOLDER_GROUPS.forEach((group, groupIndex) => {
  group.types.forEach((type, typeIndex) => {
    if (!TYPE_RANK.has(type)) {
      TYPE_RANK.set(type, groupIndex * 100 + typeIndex);
    }
  });
});
const UNKNOWN_TYPE_RANK = TAB_FOLDER_GROUPS.length * 100;
const OTHER_FOLDER = {
  key: "other",
  icon: "mdi:folder-outline"
};
export function getTabFolderKey(tabType) {
  return TYPE_TO_FOLDER.get(tabType) || OTHER_FOLDER.key;
}
export function getTabFolderMeta(tabType) {
  const key = getTabFolderKey(tabType);
  if (key === OTHER_FOLDER.key) return OTHER_FOLDER;
  return TAB_FOLDER_GROUPS.find(g => g.key === key) || OTHER_FOLDER;
}
export function shouldUseFolderMode(tabs) {
  return Array.isArray(tabs) && tabs.length >= FOLDER_MODE_THRESHOLD;
}
export function groupTabsIntoFolders(tabs, locale = "fr") {
  if (!Array.isArray(tabs) || tabs.length === 0) return [];
  const collator = new Intl.Collator(locale, {
    sensitivity: "base"
  });
  const buckets = new Map();
  tabs.forEach((tab, index) => {
    const folderKey = getTabFolderKey(tab.type);
    if (!buckets.has(folderKey)) {
      buckets.set(folderKey, []);
    }
    buckets.get(folderKey).push({
      tab,
      index
    });
  });
  const orderedKeys = [...TAB_FOLDER_GROUPS.map(g => g.key), ...(buckets.has(OTHER_FOLDER.key) ? [OTHER_FOLDER.key] : [])];
  return orderedKeys.filter(key => buckets.has(key)).map(key => {
    const meta = key === OTHER_FOLDER.key ? OTHER_FOLDER : TAB_FOLDER_GROUPS.find(g => g.key === key);
    const sortedTabs = buckets.get(key).sort((a, b) => {
      const titleCmp = collator.compare(String(a.tab.title || ""), String(b.tab.title || ""));
      if (titleCmp !== 0) return titleCmp;
      return a.index - b.index;
    }).map(({
      tab
    }) => tab);
    return {
      key,
      icon: meta.icon,
      tabs: sortedTabs
    };
  });
}
export function sortTabsByType(tabs, locale = "fr") {
  if (!Array.isArray(tabs) || tabs.length <= 1) return tabs;
  const collator = new Intl.Collator(locale, {
    sensitivity: "base"
  });
  return tabs.map((tab, index) => ({
    tab,
    index
  })).sort((a, b) => {
    const rankA = TYPE_RANK.get(a.tab.type) ?? UNKNOWN_TYPE_RANK;
    const rankB = TYPE_RANK.get(b.tab.type) ?? UNKNOWN_TYPE_RANK;
    if (rankA !== rankB) return rankA - rankB;
    const titleCmp = collator.compare(String(a.tab.title || ""), String(b.tab.title || ""));
    if (titleCmp !== 0) return titleCmp;
    return a.index - b.index;
  }).map(({
    tab
  }) => tab);
}
