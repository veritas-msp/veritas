import { getEquipmentFamilyLabel } from "../../i18n/equipmentFamilyLabels";
import { interpolate } from "../../i18n/translate";
import { getHomePageCopy } from "./homePageI18n";

const PREVIEW_NAMES = 3;
const CYBER_MODULES = new Set(["antivirus", "antispam"]);
const SERVICE_MODULES = new Set(["o365", "domain", "licences", "ssl", "toip"]);
const SOURCE_ICONS = {
  supervision: "mdi:radar",
  cyber: "mdi:shield-check-outline",
  services: "mdi:cloud-outline"
};
const SOURCE_NAV = {
  supervision: "Hardware",
  cyber: "Cybersecurite",
  services: "Service"
};
const MODULE_TO_FAMILY = {
  backup: "Sauvegarde",
  save: "Sauvegarde",
  sauvegarde: "Sauvegarde",
  firewall: "Firewalls",
  toip: "TOIP"
};

function resolveTodoSource(module) {
  if (CYBER_MODULES.has(module)) return "cyber";
  if (SERVICE_MODULES.has(module)) return "services";
  return "supervision";
}

function localizeTodoModuleLabel(module, locale, copy) {
  const raw = String(module || "").trim();
  const key = raw.toLowerCase();
  if (copy.todo.modules?.[key]) return copy.todo.modules[key];
  const familyKey = MODULE_TO_FAMILY[key] || raw;
  const familyLabel = getEquipmentFamilyLabel(familyKey, locale, null);
  if (familyLabel && familyLabel !== familyKey) return familyLabel;
  return copy.todo.licenseDefault;
}

function previewNames(names, copy) {
  const list = (names || []).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length <= PREVIEW_NAMES) return list.join(", ");
  return `${list.slice(0, PREVIEW_NAMES).join(", ")} ${interpolate(copy.todo.bulk.more, {
    count: list.length - PREVIEW_NAMES
  })}`;
}

function pushBucket(map, key, item) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

function buildContractGroup(status, alerts, copy) {
  const tone = status === "expired" ? "bad" : "warn";
  const label = copy.todo.contract[status] || copy.todo.contract.default;
  const children = alerts.map(alert => ({
    id: `contract-${alert.id}`,
    title: alert.name,
    meta: copy.todo.contract.meta,
    navigateType: "ContratDetail",
    navigateData: {
      clientId: alert.id,
      name: alert.name
    }
  }));

  if (alerts.length === 1) {
    const alert = alerts[0];
    return {
      id: `contract-${alert.id}`,
      bulk: false,
      source: "supervision",
      sourceLabel: copy.todo.sources.supervision,
      sourceIcon: SOURCE_ICONS.supervision,
      navigateType: "ContratDetail",
      navigateData: {
        clientId: alert.id,
        name: alert.name
      },
      tone,
      label,
      title: alert.name,
      meta: copy.todo.contract.meta,
      count: 1,
      children: []
    };
  }

  const bulkKey = status === "expired" ? "contractExpired" : status === "expiring" ? "contractExpiring" : status === "suspended" ? "contractSuspended" : "contractDefault";
  return {
    id: `bulk-contract-${status}`,
    bulk: true,
    groupKey: `contract:${status}`,
    source: "supervision",
    sourceLabel: copy.todo.sources.supervision,
    sourceIcon: SOURCE_ICONS.supervision,
    navigateType: "Contrat",
    navigateData: {
      highlight: status
    },
    tone,
    label,
    title: interpolate(copy.todo.bulk[bulkKey] || copy.todo.bulk.contractDefault, {
      count: alerts.length
    }),
    meta: previewNames(alerts.map(a => a.name), copy),
    count: alerts.length,
    children
  };
}

function buildLicenseGroup(module, status, alerts, locale, copy) {
  const source = resolveTodoSource(module);
  const tone = status === "expired" ? "bad" : "warn";
  const moduleLabel = localizeTodoModuleLabel(module, locale, copy);
  const children = alerts.map(alert => ({
    id: alert.id || `license-${alert.clientId}-${alert.module}-${alert.label}`,
    title: alert.label || alert.clientName,
    meta: alert.clientName,
    navigateType: SOURCE_NAV[source],
    navigateData: {
      clientId: alert.clientId,
      name: alert.clientName
    }
  }));

  if (alerts.length === 1) {
    const alert = alerts[0];
    return {
      id: alert.id || `license-${alert.clientId}-${alert.module}-${alert.label}`,
      bulk: false,
      source,
      sourceLabel: copy.todo.sources[source],
      sourceIcon: SOURCE_ICONS[source],
      navigateType: SOURCE_NAV[source],
      navigateData: {
        clientId: alert.clientId,
        name: alert.clientName
      },
      tone,
      label: moduleLabel,
      title: alert.label || alert.clientName,
      meta: alert.clientName,
      count: 1,
      children: []
    };
  }

  const bulkKey = status === "expired" ? "licenseExpired" : "licenseExpiring";
  return {
    id: `bulk-license-${module}-${status}`,
    bulk: true,
    groupKey: `license:${module}:${status}`,
    source,
    sourceLabel: copy.todo.sources[source],
    sourceIcon: SOURCE_ICONS[source],
    navigateType: SOURCE_NAV[source],
    navigateData: {},
    tone,
    label: moduleLabel,
    title: interpolate(copy.todo.bulk[bulkKey], {
      count: alerts.length,
      label: moduleLabel
    }),
    meta: previewNames(alerts.map(a => a.clientName || a.label), copy),
    count: alerts.length,
    children
  };
}

export function buildHomeTodoActions(dashboard, {
  locale = "fr"
} = {}) {
  const copy = getHomePageCopy(locale);
  const contractBuckets = new Map();
  const licenseBuckets = new Map();

  for (const alert of dashboard?.contractAlerts || []) {
    const status = String(alert?.status || "expired").toLowerCase();
    pushBucket(contractBuckets, status, alert);
  }
  for (const alert of dashboard?.licenseAlerts || []) {
    const module = String(alert?.module || "licence").toLowerCase();
    const status = String(alert?.status || "expired").toLowerCase();
    pushBucket(licenseBuckets, `${module}::${status}`, alert);
  }

  const items = [];
  for (const [status, alerts] of contractBuckets.entries()) {
    items.push(buildContractGroup(status, alerts, copy));
  }
  for (const [bucketKey, alerts] of licenseBuckets.entries()) {
    const [module, status] = bucketKey.split("::");
    items.push(buildLicenseGroup(module, status, alerts, locale, copy));
  }

  const toneOrder = {
    bad: 0,
    warn: 1
  };
  return items.sort((a, b) => {
    const byTone = (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9);
    if (byTone !== 0) return byTone;
    return (b.count || 1) - (a.count || 1);
  });
}
