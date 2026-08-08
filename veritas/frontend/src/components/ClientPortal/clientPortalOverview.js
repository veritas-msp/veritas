export const PORTAL_INFRA_CATALOG = [{
  type: "internet",
  labelKey: "internet",
  icon: "mdi:web",
  moduleKeys: ["Internet"]
}, {
  type: "firewall",
  labelKey: "firewall",
  icon: "mdi:shield-lock",
  moduleKeys: ["Firewall", "Firewalls"]
}, {
  type: "servers",
  labelKey: "servers",
  icon: "mdi:server",
  moduleKeys: ["Servers"]
}, {
  type: "stockage",
  labelKey: "stockage",
  icon: "mdi:harddisk",
  moduleKeys: ["Storage", "NAS"]
}, {
  type: "switch",
  labelKey: "switch",
  icon: "mdi:lan",
  moduleKeys: ["Switch"]
}, {
  type: "wifi",
  labelKey: "wifi",
  icon: "mdi:wifi",
  moduleKeys: ["BorneWifi", "WiFi"]
}, {
  type: "alimentation",
  labelKey: "alimentation",
  icon: "mdi:power-plug",
  moduleKeys: ["Alimentation"]
}, {
  type: "routeur",
  labelKey: "routeur",
  icon: "mdi:router-wireless",
  moduleKeys: ["Routeur"]
}, {
  type: "toip",
  labelKey: "toip",
  icon: "mdi:phone-voip",
  moduleKeys: ["TOIP"]
}];
export const PORTAL_CLOUD_CATALOG = [{
  type: "o365",
  labelKey: "o365",
  icon: "mdi:microsoft-office",
  moduleKeys: ["Office365", "O365"]
}, {
  type: "save",
  labelKey: "save",
  icon: "mdi:backup-restore",
  moduleKeys: ["Backup"]
}, {
  type: "antivirus",
  labelKey: "antivirus",
  icon: "mdi:shield-check",
  moduleKeys: ["Antivirus"]
}, {
  type: "antispam",
  labelKey: "antispam",
  icon: "mdi:email-lock",
  moduleKeys: ["Antispam"]
}, {
  type: "ndd",
  labelKey: "ndd",
  icon: "mdi:domain",
  moduleKeys: ["NDD"]
}];
function isModuleEnabled(flags, moduleKeys) {
  if (!flags || typeof flags !== "object") return false;
  return moduleKeys.some(key => flags[key] === true);
}
function indexGroups(groups) {
  const map = {};
  (groups || []).forEach(group => {
    if (group?.type) map[group.type] = group.items || [];
  });
  return map;
}
function isComputerMonitored(computer) {
  return Boolean(computer?.monitored || computer?.agentManaged || computer?.checkmk_host_name || computer?.agent_id || computer?.agentId);
}
function isComputerRmm(computer) {
  return Boolean(computer?.agent_id || computer?.agentId || computer?.agentManaged);
}
export function computeWorkstationOverview(computers = [], mappedComputers = []) {
  const source = mappedComputers.length ? mappedComputers : computers;
  const total = source.length;
  let rmmManaged = 0;
  let monitored = 0;
  source.forEach(item => {
    if (isComputerRmm(item)) rmmManaged += 1;
    if (isComputerMonitored(item)) monitored += 1;
  });
  return {
    total,
    rmmManaged,
    monitored
  };
}
function buildWorkstationEntry(flags, stats) {
  const subscribed = isModuleEnabled(flags, ["Ordinateurs", "Hardware"]) || stats.total > 0;
  return {
    ...stats,
    subscribed
  };
}
function summarizeCloudItems(type, items) {
  if (!items?.length) return null;
  if (type === "o365") {
    const licenseCount = items.reduce((sum, item) => sum + (item.licenses?.length || 0), 0);
    if (licenseCount > 0) return {
      key: "licenseCount",
      count: licenseCount
    };
    const users = items.reduce((max, item) => Math.max(max, item.details?.userCount || 0), 0);
    if (users > 0) return {
      key: "userCount",
      count: users
    };
    return {
      key: "serviceCount",
      count: items.length
    };
  }
  if (type === "antivirus" || type === "antispam") {
    const products = items.map(item => item.product || item.name).filter(Boolean);
    if (products.length) return {
      key: "products",
      products: products.slice(0, 2)
    };
    return {
      key: "serviceCount",
      count: items.length
    };
  }
  if (type === "save") {
    const instances = items.filter(item => item.details?.kind !== "saveJob").length;
    const jobs = items.filter(item => item.details?.kind === "saveJob").length;
    return {
      key: "backupSummary",
      instances,
      jobs,
      count: items.length
    };
  }
  if (type === "ndd") {
    return {
      key: "serviceCount",
      count: items.length
    };
  }
  return {
    key: "serviceCount",
    count: items.length
  };
}
export function buildPortalOverview(data, copy) {
  const flags = {
    ...(data?.modules || {}),
    ...(data?.options || {})
  };
  const infraMap = indexGroups(data?.infrastructure);
  const cloudMap = indexGroups(data?.cloudServices);
  const workstations = buildWorkstationEntry(flags, computeWorkstationOverview(data?.computers, data?.mappedComputers));
  const infraTypes = PORTAL_INFRA_CATALOG.map(entry => {
    const items = infraMap[entry.type] || [];
    const count = items.length;
    const monitoredCount = items.filter(item => item.monitored).length;
    const subscribed = isModuleEnabled(flags, entry.moduleKeys) || count > 0;
    return {
      ...entry,
      label: copy.overviewCatalog[entry.labelKey],
      count,
      monitoredCount,
      subscribed
    };
  });
  const cloudTypes = PORTAL_CLOUD_CATALOG.map(entry => {
    const items = cloudMap[entry.type] || [];
    const count = items.length;
    const subscribed = isModuleEnabled(flags, entry.moduleKeys) || count > 0;
    return {
      ...entry,
      label: copy.overviewCatalog[entry.labelKey],
      count,
      subscribed,
      active: subscribed && count > 0,
      summary: summarizeCloudItems(entry.type, items),
      expiration: items.find(item => item.expiration)?.expiration || null
    };
  });
  const infraDeviceTotal = infraTypes.reduce((sum, entry) => sum + entry.count, 0);
  const infraMonitoredTotal = infraTypes.reduce((sum, entry) => sum + entry.monitoredCount, 0);
  return {
    workstations,
    infraTypes,
    cloudTypes,
    infraDeviceTotal,
    infraMonitoredTotal
  };
}
