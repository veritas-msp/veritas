import { assessWarrantyStatus, buildComputerFleetStats, inferBrand, inferModelLabel } from "./computerFleetStats";
import { getRmmInventoryFromEquipment, isRmmManagedEquipment } from "../components/EquipementPage/rmmMonitoringUtils";
import {
  getWifiSsidById,
  isInternalSsidToken,
  normalizeWifiSsidCatalog,
  resolveAssignedSsidIds
} from "../components/EquipementPage/wifiApSsidUtils";

export const FLEET_FAMILY_CANON = {
  Ordinateurs: "computers",
  workstations: "computers",
  Internet: "internet",
  internet: "internet",
  Firewalls: "firewalls",
  firewall: "firewalls",
  Servers: "servers",
  Serveurs: "servers",
  servers: "servers",
  Storage: "storage",
  Stockage: "storage",
  NAS: "storage",
  stockage: "storage",
  Switch: "switch",
  switch: "switch",
  BorneWifi: "wifi",
  wifi: "wifi",
  Routeur: "router",
  routeur: "router",
  Alimentation: "power",
  alimentation: "power",
  TOIP: "toip",
  toip: "toip"
};

export const FLEET_FAMILY_META = {
  computers: { exportType: "Ordinateurs", icon: "mdi:laptop" },
  internet: { exportType: "Internet", icon: "mdi:web" },
  firewalls: { exportType: "Firewalls", icon: "mdi:shield-lock" },
  servers: { exportType: "Servers", icon: "mdi:server" },
  storage: { exportType: "Storage", icon: "mdi:harddisk" },
  switch: { exportType: "Switch", icon: "mdi:lan" },
  wifi: { exportType: "BorneWifi", icon: "mdi:wifi" },
  router: { exportType: "Routeur", icon: "mdi:router-wireless" },
  power: { exportType: "Alimentation", icon: "mdi:battery-charging" },
  toip: { exportType: "TOIP", icon: "mdi:phone-voip" },
  generic: { exportType: "Servers", icon: "mdi:devices" }
};

export function canonicalizeFleetFamily(type) {
  const raw = String(type || "").trim();
  if (!raw) return "generic";
  if (FLEET_FAMILY_CANON[raw]) return FLEET_FAMILY_CANON[raw];
  const lower = raw.toLowerCase();
  const hit = Object.entries(FLEET_FAMILY_CANON).find(([key]) => key.toLowerCase() === lower);
  if (hit) return hit[1];
  if (raw.startsWith("Custom:")) return "generic";
  return "generic";
}

export function equipmentMatchesFleetFamily(eqType, requestedType) {
  const requested = String(requestedType || "").trim();
  const actual = String(eqType || "").trim();
  if (!requested) return true;
  if (actual === requested) return true;
  const canonRequested = canonicalizeFleetFamily(requested);
  const canonActual = canonicalizeFleetFamily(actual);
  if (canonRequested !== "generic" && canonRequested === canonActual) return true;
  return false;
}

export function isComputerFleetFamily(type) {
  return canonicalizeFleetFamily(type) === "computers";
}

const WARRANTY_FLEET_FAMILIES = new Set([
  "computers",
  "servers",
  "storage",
  "firewalls",
  "switch",
  "wifi",
  "router",
  "power"
]);

export function familyShowsWarrantyStats(type) {
  return WARRANTY_FLEET_FAMILIES.has(canonicalizeFleetFamily(type));
}

export function getFleetFamilyExportType(type) {
  return FLEET_FAMILY_META[canonicalizeFleetFamily(type)]?.exportType || String(type || "Servers");
}

function equipmentBags(item) {
  const raw = item?.rawData && typeof item.rawData === "object" ? item.rawData : {};
  const nested = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data
    : item?.data && typeof item.data === "object" && !Array.isArray(item.data)
      ? item.data
      : {};
  const fields = item?.fields && typeof item.fields === "object" && !Array.isArray(item.fields)
    ? item.fields
    : {};
  return [item, fields, raw, nested].filter(bag => bag && typeof bag === "object");
}

const FAMILY_TYPE_LABELS = new Set([
  "internet", "firewall", "firewalls", "servers", "serveurs", "server",
  "storage", "stockage", "nas", "switch", "bornewifi", "wifi",
  "routeur", "router", "alimentation", "power", "toip",
  "ordinateurs", "computers", "workstations"
]);

function isEmptyPickValue(value) {
  if (value == null || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function pickRaw(item, keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const bag of equipmentBags(item)) {
    for (const key of list) {
      if (isEmptyPickValue(bag[key])) continue;
      return bag[key];
    }
  }
  return null;
}

function pickText(item, keys, fallback = "") {
  const value = pickRaw(item, keys);
  if (value == null || value === "") return fallback;
  if (Array.isArray(value)) {
    const first = value.map(entry => {
      if (entry == null) return "";
      if (typeof entry === "string" || typeof entry === "number") return String(entry).trim();
      if (typeof entry === "object") return String(entry.name || entry.label || entry.nom || entry.role || "").trim();
      return "";
    }).filter(Boolean);
    return first.join(", ") || fallback;
  }
  if (typeof value === "object") {
    return String(value.name || value.label || value.nom || "").trim() || fallback;
  }
  return String(value).trim() || fallback;
}

function pickTypedText(item, keys, fallback = "") {
  const value = pickText(item, keys, "");
  if (!value) return fallback;
  if (FAMILY_TYPE_LABELS.has(value.toLowerCase())) return fallback;
  return value;
}

function pickBool(item, keys) {
  const value = pickRaw(item, keys);
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const text = String(value || "").trim().toLowerCase();
  if (["true", "oui", "yes", "1", "on", "enabled"].includes(text)) return true;
  if (["false", "non", "no", "0", "off", "disabled"].includes(text)) return false;
  return null;
}

function unspecified() {
  return "Not specified";
}

function increment(map, key) {
  const label = String(key || "").trim() || unspecified();
  map[label] = (map[label] || 0) + 1;
}

function toDistribution(counts, total, { limit = 8, otherLabel = "Others" } = {}) {
  const entries = Object.entries(counts).map(([name, count]) => ({
    name,
    count,
    pct: total > 0 ? Math.round(count / total * 100) : 0
  })).sort((a, b) => b.count - a.count);
  if (entries.length <= limit) return entries;
  const top = entries.slice(0, limit);
  const otherCount = entries.slice(limit).reduce((sum, entry) => sum + entry.count, 0);
  if (otherCount > 0) {
    top.push({
      name: otherLabel,
      count: otherCount,
      pct: total > 0 ? Math.round(otherCount / total * 100) : 0
    });
  }
  return top;
}

function parseNumeric(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value).replace(",", ".").match(/-?[\d.]+/);
  if (!match) return null;
  const amount = Number(match[0]);
  return Number.isFinite(amount) ? amount : null;
}

function parseMbps(value) {
  const raw = String(value || "").trim();
  const amount = parseNumeric(raw);
  if (amount == null) return null;
  if (/gb/i.test(raw)) return amount * 1000;
  if (/kb/i.test(raw)) return amount / 1000;
  return amount;
}

function parseCapacityGb(value) {
  const raw = String(value || "").trim();
  const amount = parseNumeric(raw);
  if (amount == null || amount <= 0) return null;
  if (/to|tb/i.test(raw)) return amount * 1024;
  if (/mo|mb/i.test(raw)) return amount / 1024;
  return amount;
}

function isActiveItem(item) {
  return item?.is_active !== false && item?.active !== false;
}

function isMonitoredItem(item) {
  if (item?.monitored === true || item?.monitoring === true) return true;
  if (pickBool(item, ["monitoring", "monitored", "supervise"])) return true;
  return Boolean(item?.checkmk_host_name || item?.agent_id || item?.agentId);
}

function inferItemBrand(item) {
  return inferBrand(item, getRmmInventoryFromEquipment(item));
}

function inferItemModel(item) {
  return inferModelLabel(item, getRmmInventoryFromEquipment(item));
}

function debitBucket(mbps) {
  if (!Number.isFinite(mbps)) return unspecified();
  if (mbps < 100) return "< 100 Mbps";
  if (mbps < 500) return "100 – 500 Mbps";
  if (mbps < 1000) return "500 Mbps – 1 Gbps";
  return "1 Gbps+";
}

function capacityBucket(gb) {
  if (!Number.isFinite(gb) || gb <= 0) return unspecified();
  if (gb < 1024) return "< 1 To";
  if (gb < 10240) return "1 – 10 To";
  if (gb < 51200) return "10 – 50 To";
  return "50 To+";
}

function vaBucket(va) {
  if (!Number.isFinite(va) || va <= 0) return unspecified();
  if (va < 1000) return "< 1 kVA";
  if (va < 3000) return "1 – 3 kVA";
  if (va < 10000) return "3 – 10 kVA";
  return "10 kVA+";
}

export function buildCommonFamilyStats(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const brandCounts = {};
  const modelCounts = {};
  const siteCounts = {};
  const firmwareCounts = {};
  const warranty = { expired: 0, soon: 0, ok: 0, unknown: 0 };
  let active = 0;
  let monitored = 0;
  for (const item of list) {
    if (isActiveItem(item)) active += 1;
    if (isMonitoredItem(item) || isRmmManagedEquipment(item)) monitored += 1;
    increment(brandCounts, inferItemBrand(item));
    increment(modelCounts, inferItemModel(item));
    increment(siteCounts, pickText(item, ["location", "site", "emplacement", "lieu"], unspecified()));
    const firmware = pickText(item, ["firmware", "version", "osVersion"]);
    if (firmware) increment(firmwareCounts, firmware);
    else increment(firmwareCounts, unspecified());
    const status = assessWarrantyStatus(item, getRmmInventoryFromEquipment(item));
    warranty[status] = (warranty[status] || 0) + 1;
  }
  const inactive = total - active;
  const unmonitored = total - monitored;
  const warrantyKnown = warranty.expired + warranty.soon + warranty.ok;
  return {
    total,
    active,
    inactive,
    monitored,
    unmonitored,
    activePct: total > 0 ? Math.round(active / total * 100) : 0,
    monitoredPct: total > 0 ? Math.round(monitored / total * 100) : 0,
    brandDistribution: toDistribution(brandCounts, total, { limit: 6 }),
    modelDistribution: toDistribution(modelCounts, total, { limit: 8 }),
    siteDistribution: toDistribution(siteCounts, total, { limit: 6 }),
    firmwareDistribution: toDistribution(firmwareCounts, total, { limit: 6 }),
    warranty,
    warrantyOkPct: warrantyKnown > 0 ? Math.round(warranty.ok / warrantyKnown * 100) : null
  };
}

function yesNoUnknown(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return unspecified();
}

function buildInternetSpecifics(items) {
  const providerCounts = {};
  const typeCounts = {};
  const debitCounts = {};
  const boxCounts = {};
  const categoryCounts = {};
  const haCounts = {};
  let debitKnown = 0;
  let debitTotal = 0;
  let uploadKnown = 0;
  let uploadTotal = 0;
  let haEnabled = 0;
  for (const item of items) {
    increment(providerCounts, pickText(item, ["fournisseur", "provider", "isp", "operateur"], unspecified()));
    increment(typeCounts, pickTypedText(item, ["internetType", "typeLien", "technologie", "type"], unspecified()));
    increment(categoryCounts, pickTypedText(item, ["categorie", "category"], unspecified()));
    increment(boxCounts, pickText(item, ["boxModele", "boxModel", "modeleBox"], unspecified()));
    const ha = pickBool(item, ["ha"]);
    increment(haCounts, yesNoUnknown(ha));
    if (ha === true) haEnabled += 1;
    const mbps = parseMbps(pickText(item, ["debitDownload", "debit", "debitDescendant", "bandwidth"]));
    if (mbps != null) {
      debitKnown += 1;
      debitTotal += mbps;
      increment(debitCounts, debitBucket(mbps));
    } else {
      increment(debitCounts, unspecified());
    }
    const upload = parseMbps(pickText(item, ["debitUpload", "debitMontant"]));
    if (upload != null) {
      uploadKnown += 1;
      uploadTotal += upload;
    }
  }
  return {
    providerDistribution: toDistribution(providerCounts, items.length, { limit: 8 }),
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 6 }),
    debitDistribution: toDistribution(debitCounts, items.length, { limit: 5 }),
    boxDistribution: toDistribution(boxCounts, items.length, { limit: 6 }),
    categoryDistribution: toDistribution(categoryCounts, items.length, { limit: 5 }),
    haDistribution: toDistribution(haCounts, items.length, { limit: 3 }),
    avgDebitMbps: debitKnown > 0 ? Math.round(debitTotal / debitKnown) : null,
    avgUploadMbps: uploadKnown > 0 ? Math.round(uploadTotal / uploadKnown) : null,
    uniqueProviders: Object.keys(providerCounts).filter(name => name !== unspecified()).length,
    haEnabled
  };
}

function buildFirewallSpecifics(items) {
  const typeCounts = {};
  const haCounts = {};
  let licensed = 0;
  let haEnabled = 0;
  for (const item of items) {
    increment(typeCounts, pickTypedText(item, ["firewallType"], unspecified()));
    const ha = pickBool(item, ["modeHA", "ha"]);
    const haRole = pickTypedText(item, ["roleHA", "hauteDisponibilite"], "");
    increment(haCounts, haRole || yesNoUnknown(ha));
    if (ha === true || /actif|active|yes|oui|primary|primaire|secondary|secondaire/i.test(haRole)) {
      haEnabled += 1;
    }
    const license = pickText(item, ["licenceMaintenance", "maintenanceLicense"]);
    const licences = pickRaw(item, ["licences"]);
    if (license || (Array.isArray(licences) && licences.length)) licensed += 1;
  }
  return {
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 6 }),
    haDistribution: toDistribution(haCounts, items.length, { limit: 4 }),
    licensed,
    haEnabled
  };
}

function buildServerSpecifics(items) {
  const osCounts = {};
  const typeCounts = {};
  const roleCounts = {};
  const haCounts = {};
  const hypervisorCounts = {};
  let physical = 0;
  let virtual = 0;
  let haEnabled = 0;
  for (const item of items) {
    increment(osCounts, pickText(item, ["systeme", "os", "operatingSystem"], unspecified()));
    const kind = pickTypedText(item, ["typeServer", "serverType", "type"], "").toLowerCase();
    if (kind.includes("virt")) {
      increment(typeCounts, "Virtual");
      virtual += 1;
    } else if (kind.includes("phys") || kind.includes("bare")) {
      increment(typeCounts, "Physical");
      physical += 1;
    } else {
      increment(typeCounts, unspecified());
    }
    const roles = pickRaw(item, ["role", "roles", "roleServeur"]);
    const roleList = Array.isArray(roles) ? roles : String(roles || "").split(/[,;/]/);
    const cleaned = roleList.map(role => String(role?.name || role?.label || role || "").trim()).filter(Boolean);
    if (cleaned.length) cleaned.forEach(role => increment(roleCounts, role));
    else increment(roleCounts, unspecified());
    const ha = pickBool(item, ["modeHA", "ha"]);
    const haRole = pickTypedText(item, ["roleHA"], "");
    increment(haCounts, haRole || yesNoUnknown(ha));
    if (ha === true) haEnabled += 1;
    increment(hypervisorCounts, pickText(item, ["hypervisor", "hyperviseur", "hostServerName"], unspecified()));
  }
  return {
    osDistribution: toDistribution(osCounts, items.length, { limit: 6 }),
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 4 }),
    roleDistribution: toDistribution(roleCounts, items.length, { limit: 8 }),
    haDistribution: toDistribution(haCounts, items.length, { limit: 4 }),
    hypervisorDistribution: toDistribution(hypervisorCounts, items.length, { limit: 6 }),
    physical,
    virtual,
    haEnabled
  };
}

function buildStorageSpecifics(items) {
  const raidCounts = {};
  const typeCounts = {};
  const capacityCounts = {};
  const haCounts = {};
  let totalGb = 0;
  let knownCapacity = 0;
  let disks = 0;
  let haEnabled = 0;
  for (const item of items) {
    increment(raidCounts, pickText(item, ["raid", "niveauRaid", "raidLevel"], unspecified()));
    increment(typeCounts, pickTypedText(item, ["storageType", "type"], unspecified()));
    const ha = pickBool(item, ["modeHA", "ha"]);
    const haRole = pickTypedText(item, ["roleHA"], "");
    increment(haCounts, haRole || yesNoUnknown(ha));
    if (ha === true) haEnabled += 1;
    const gb = parseCapacityGb(pickText(item, ["capacite", "capacity", "stockage"]));
    if (gb != null) {
      totalGb += gb;
      knownCapacity += 1;
      increment(capacityCounts, capacityBucket(gb));
    } else {
      increment(capacityCounts, unspecified());
    }
    disks += parseNumeric(pickText(item, ["nbDisquesActuels", "diskCount"])) || 0;
  }
  return {
    raidDistribution: toDistribution(raidCounts, items.length, { limit: 6 }),
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 5 }),
    capacityDistribution: toDistribution(capacityCounts, items.length, { limit: 5 }),
    haDistribution: toDistribution(haCounts, items.length, { limit: 4 }),
    totalCapacityGb: knownCapacity > 0 ? Math.round(totalGb) : null,
    diskCount: disks,
    haEnabled
  };
}

function buildSwitchSpecifics(items) {
  const poeCounts = {};
  const manageableCounts = {};
  const stackCounts = {};
  for (const item of items) {
    increment(poeCounts, yesNoUnknown(pickBool(item, ["poeSupport", "poe", "alimentationPoE"])));
    increment(manageableCounts, yesNoUnknown(pickBool(item, ["manageable", "manageableSwitch"])));
    increment(stackCounts, yesNoUnknown(pickBool(item, ["empilage", "stacking", "stack"])));
  }
  return {
    poeDistribution: toDistribution(poeCounts, items.length, { limit: 3 }),
    manageableDistribution: toDistribution(manageableCounts, items.length, { limit: 3 }),
    stackDistribution: toDistribution(stackCounts, items.length, { limit: 3 }),
    poeCount: poeCounts.Yes || 0,
    manageableCount: manageableCounts.Yes || 0,
    stackCount: stackCounts.Yes || 0
  };
}

function collectItemSsids(item, catalog) {
  const assignedIds = pickRaw(item, ["assignedSsidIds"]);
  const raw = (Array.isArray(assignedIds) && assignedIds.length)
    ? assignedIds
    : pickRaw(item, ["ssids", "assignedSsids"]) || [];
  const list = Array.isArray(raw) ? raw : [];
  const ids = resolveAssignedSsidIds(list, catalog);
  const resolved = ids.map(id => {
    const entry = getWifiSsidById(catalog, id);
    const fallback = list.find(row => {
      if (row == null) return false;
      if (typeof row === "string") return row === id || row.toLowerCase() === String(entry?.nom || "").toLowerCase();
      return row.id === id || row.nom === entry?.nom;
    });
    const nom = entry?.nom
      || (fallback && typeof fallback === "object" ? fallback.nom || fallback.name || fallback.ssid : null)
      || (typeof fallback === "string" && !isInternalSsidToken(fallback) ? fallback : null)
      || (!isInternalSsidToken(id) ? String(id) : "");
    if (!nom || isInternalSsidToken(nom)) return null;
    return {
      id: entry?.id || id,
      nom,
      type: entry?.type || (fallback && typeof fallback === "object" ? fallback.type : "") || "prive",
      bande: entry?.bande || (fallback && typeof fallback === "object" ? fallback.bande : "") || "",
      portailCaptif: Boolean(entry?.portailCaptif || (fallback && typeof fallback === "object" && fallback.portailCaptif))
    };
  }).filter(Boolean);
  if (resolved.length) return resolved;
  return normalizeWifiSsidCatalog(list).filter(entry => entry.nom && !isInternalSsidToken(entry.nom));
}

function buildWifiSpecifics(items, clientSsids = []) {
  const catalog = normalizeWifiSsidCatalog(clientSsids);
  const ssidCounts = {};
  const typeCounts = {};
  const bandCounts = {};
  const poeCounts = {};
  const unique = new Map();
  let assignmentTotal = 0;
  let emptyAps = 0;
  let captive = 0;
  for (const item of items) {
    increment(poeCounts, yesNoUnknown(pickBool(item, ["alimentationPoE", "poeSupport", "poe"])));
    const assigned = collectItemSsids(item, catalog);
    if (!assigned.length) emptyAps += 1;
    assignmentTotal += assigned.length;
    assigned.forEach(ssid => {
      unique.set(ssid.nom.toLowerCase(), ssid);
      increment(ssidCounts, ssid.nom);
      increment(typeCounts, ssid.type === "public" ? "Guest" : "Private");
      increment(bandCounts, ssid.bande || unspecified());
      if (ssid.portailCaptif) captive += 1;
    });
  }
  return {
    uniqueSsidCount: unique.size,
    assignmentTotal,
    avgPerAp: items.length > 0 ? Math.round(assignmentTotal / items.length * 10) / 10 : 0,
    emptyApCount: emptyAps,
    captivePortalCount: captive,
    ssidDistribution: toDistribution(ssidCounts, Math.max(assignmentTotal, 1), { limit: 10 }),
    typeDistribution: toDistribution(typeCounts, Math.max(assignmentTotal, 1), { limit: 3 }),
    bandDistribution: toDistribution(bandCounts, Math.max(assignmentTotal, 1), { limit: 5 }),
    poeDistribution: toDistribution(poeCounts, items.length, { limit: 3 }),
    catalogCount: catalog.filter(entry => entry.nom).length
  };
}

function buildRouterSpecifics(items) {
  const typeCounts = {};
  for (const item of items) {
    increment(typeCounts, pickTypedText(item, ["routeurType", "routerType", "type"], unspecified()));
  }
  return {
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 6 })
  };
}

function buildPowerSpecifics(items) {
  const typeCounts = {};
  const vaCounts = {};
  let totalVa = 0;
  let knownVa = 0;
  let totalW = 0;
  let knownW = 0;
  let outlets = 0;
  let batteryAging = 0;
  let manageable = 0;
  for (const item of items) {
    increment(typeCounts, pickTypedText(item, ["alimentationType", "upsType", "type"], unspecified()));
    const va = parseNumeric(pickText(item, ["capaciteVA", "va", "powerRating"]));
    if (va != null && va > 0) {
      totalVa += va;
      knownVa += 1;
      increment(vaCounts, vaBucket(va));
    } else {
      increment(vaCounts, unspecified());
    }
    const watts = parseNumeric(pickText(item, ["capaciteW", "puissanceW"]));
    if (watts != null && watts > 0) {
      totalW += watts;
      knownW += 1;
    }
    outlets += parseNumeric(pickText(item, ["nbPrises", "nombrePrises"])) || 0;
    if (pickBool(item, ["manageable"]) === true) manageable += 1;
    const battery = pickText(item, ["dateBatterie", "batteryDate"]);
    if (battery) {
      const date = new Date(battery);
      if (!Number.isNaN(date.getTime())) {
        const years = (Date.now() - date.getTime()) / (365.25 * 86400000);
        if (years >= 4) batteryAging += 1;
      }
    }
  }
  return {
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 6 }),
    vaDistribution: toDistribution(vaCounts, items.length, { limit: 5 }),
    totalVa: knownVa > 0 ? Math.round(totalVa) : null,
    totalW: knownW > 0 ? Math.round(totalW) : null,
    outletCount: outlets,
    manageableCount: manageable,
    batteryAging
  };
}

function buildToipSpecifics(items) {
  const typeCounts = {};
  const domainCounts = {};
  let extensions = 0;
  let manageable = 0;
  for (const item of items) {
    increment(typeCounts, pickTypedText(item, ["toipType", "type"], unspecified()));
    increment(domainCounts, pickText(item, ["domaineSip", "sipDomain", "domaine"], unspecified()));
    extensions += parseNumeric(pickText(item, ["nombreExtensions", "extensions", "extensionCount"])) || 0;
    if (pickBool(item, ["manageable"]) === true) manageable += 1;
  }
  return {
    typeDistribution: toDistribution(typeCounts, items.length, { limit: 6 }),
    domainDistribution: toDistribution(domainCounts, items.length, { limit: 6 }),
    extensionCount: extensions,
    manageableCount: manageable
  };
}

const SPECIFIC_BUILDERS = {
  internet: buildInternetSpecifics,
  firewalls: buildFirewallSpecifics,
  servers: buildServerSpecifics,
  storage: buildStorageSpecifics,
  switch: buildSwitchSpecifics,
  wifi: (items, options) => buildWifiSpecifics(items, options?.clientSsids),
  router: buildRouterSpecifics,
  power: buildPowerSpecifics,
  toip: buildToipSpecifics
};

export function buildEquipmentFamilyStats(items, familyType, options = {}) {
  const list = Array.isArray(items) ? items : [];
  const family = canonicalizeFleetFamily(familyType);
  const common = buildCommonFamilyStats(list);
  if (family === "computers") {
    return {
      family,
      common,
      computers: buildComputerFleetStats(list, options),
      specifics: null
    };
  }
  const builder = SPECIFIC_BUILDERS[family];
  return {
    family,
    common,
    computers: null,
    specifics: builder ? builder(list, options) : {}
  };
}
