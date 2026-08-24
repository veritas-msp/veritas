export const HONEYCOMB_HEX = {
  w: 6.25,
  h: 7.2,
  spacing: 1
};
export function honeycombOffsetRem(q, r, layoutScale = 1) {
  const {
    w,
    h,
    spacing
  } = HONEYCOMB_HEX;
  const scale = (1 + spacing / (h * 0.75)) * layoutScale;
  const stepX = w * scale;
  const stepY = h * 0.75 * scale;
  return {
    x: (q + r / 2) * stepX,
    y: r * stepY
  };
}
const RING_DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
function hexRingPositions(ring) {
  if (ring === 0) return [{
    q: 0,
    r: 0
  }];
  const positions = [];
  let q = 0;
  let r = -ring;
  RING_DIRS.forEach(([dq, dr]) => {
    for (let i = 0; i < ring; i += 1) {
      positions.push({
        q,
        r
      });
      q += dq;
      r += dr;
    }
  });
  const leftIndex = positions.findIndex(pos => pos.q === -ring && pos.r === 0);
  if (leftIndex > 0) {
    return [...positions.slice(leftIndex), ...positions.slice(0, leftIndex)];
  }
  return positions;
}
export function getHoneycombSlots(count) {
  if (count <= 0) return [];
  const slots = [{
    q: 0,
    r: 0
  }];
  if (count === 1) return slots;
  let ring = 1;
  while (slots.length < count) {
    hexRingPositions(ring).forEach(pos => {
      if (slots.length < count) slots.push(pos);
    });
    ring += 1;
  }
  return slots;
}
function getHoneycombSlotKey(slot) {
  return `${slot.q ?? 0},${slot.r ?? 0}`;
}
function allocateHoneycombSlots(count, reservedSlots = []) {
  if (count <= 0) return [];
  const occupied = new Set((reservedSlots || []).map(getHoneycombSlotKey));
  const allocated = [];
  let ring = 0;
  while (allocated.length < count) {
    hexRingPositions(ring).forEach(pos => {
      if (allocated.length >= count) return;
      const key = getHoneycombSlotKey(pos);
      if (occupied.has(key)) return;
      occupied.add(key);
      allocated.push(pos);
    });
    ring += 1;
  }
  return allocated;
}
export function buildCustomFamilyHoneycombSlots(families = []) {
  const hexFamilies = (Array.isArray(families) ? families : []).filter(family => family.displayMode !== "brick");
  const manual = [];
  const auto = [];
  hexFamilies.forEach(family => {
    if (family.honeycombQ != null && family.honeycombR != null) {
      manual.push({
        family,
        slot: {
          type: `Custom:${family.familyKey}`,
          q: Number(family.honeycombQ),
          r: Number(family.honeycombR)
        }
      });
      return;
    }
    auto.push(family);
  });
  const outerSlots = allocateHoneycombSlots(auto.length, manual.map(entry => entry.slot));
  const autoItems = auto.map((family, index) => ({
    family,
    slot: {
      type: `Custom:${family.familyKey}`,
      q: outerSlots[index]?.q ?? 0,
      r: outerSlots[index]?.r ?? 0
    }
  }));
  return [...manual, ...autoItems];
}
export function collectHoneycombSlotsFromItems(items = []) {
  return items.map(item => item.slot || EMPTY_HONEYCOMB_LAYOUT.find(entry => entry.type === item.type)).filter(Boolean);
}
export function computeHoneycombClusterMetrics(slots = [], options = {}) {
  const {
    maxWidthRem = 48,
    minWidthRem = 28,
    minHeightRem = 20,
    paddingRem = 1.35
  } = options;
  if (!slots.length) {
    return {
      widthRem: 38,
      heightRem: 24,
      layoutScale: 1,
      displayScale: 1,
      rawWidthRem: 38,
      rawHeightRem: 24
    };
  }
  const count = slots.length;
  let layoutScale = 1;
  if (count > 16) layoutScale = 0.76;else if (count > 13) layoutScale = 0.84;else if (count > 11) layoutScale = 0.92;
  const {
    w,
    h
  } = HONEYCOMB_HEX;
  const halfW = w * layoutScale / 2;
  const halfH = h * layoutScale / 2;
  let extentX = 0;
  let extentY = 0;
  slots.forEach(slot => {
    const {
      x,
      y
    } = honeycombOffsetRem(slot.q ?? 0, slot.r ?? 0, layoutScale);
    extentX = Math.max(extentX, Math.abs(x) + halfW);
    extentY = Math.max(extentY, Math.abs(y) + halfH);
  });
  const rawWidth = extentX * 2 + paddingRem * 2;
  const rawHeight = extentY * 2 + paddingRem * 2;
  let displayScale = 1;
  if (rawWidth > maxWidthRem) {
    displayScale = maxWidthRem / rawWidth;
  }
  return {
    widthRem: Math.max(minWidthRem, rawWidth * displayScale),
    heightRem: Math.max(minHeightRem, rawHeight * displayScale),
    layoutScale,
    displayScale,
    rawWidthRem: rawWidth,
    rawHeightRem: rawHeight
  };
}
export function buildCustomFamilyBricks(families = []) {
  return (Array.isArray(families) ? families : []).filter(family => family.displayMode === "brick").map(family => ({
    id: `custom-${family.familyKey}`,
    type: `Custom:${family.familyKey}`,
    label: family.label,
    name: family.label,
    status: (family.items || []).length > 0 ? "ok" : "unmonitored",
    count: family.count ?? (family.items || []).length,
    items: family.items || [],
    icon: family.icon,
    alwaysClickable: false,
    familyKey: family.familyKey,
    customFamily: family
  }));
}
export const HARDWARE_TYPE_ORDER = ["Internet", "Firewalls", "Routeur", "Servers", "Storage", "Ordinateurs", "Switch", "BorneWifi", "TOIP", "Alimentation"];
export const HONEYCOMB_TABLE_TYPE_ORDER = HARDWARE_TYPE_ORDER.filter(type => type !== "Ordinateurs");
export const HONEYCOMB_THEME_GROUPS = [{
  id: "edge",
  types: ["Internet", "Firewalls", "Routeur"],
  slots: [{
    type: "Firewalls",
    q: 0,
    r: -1
  }, {
    type: "Internet",
    q: 0,
    r: 0
  }, {
    type: "Routeur",
    q: 1,
    r: -1
  }]
}, {
  id: "compute",
  types: ["Servers", "Storage", "Ordinateurs", "Alimentation"],
  slots: [{
    type: "Servers",
    q: 0,
    r: -1
  }, {
    type: "Storage",
    q: 0,
    r: 0
  }, {
    type: "Ordinateurs",
    q: 1,
    r: -1
  }, {
    type: "Alimentation",
    q: 0,
    r: 1
  }]
}, {
  id: "lan",
  types: ["Switch", "BorneWifi", "TOIP"],
  slots: [{
    type: "Switch",
    q: 0,
    r: -1
  }, {
    type: "BorneWifi",
    q: 0,
    r: 0
  }, {
    type: "TOIP",
    q: 1,
    r: -1
  }]
}];
export const EMPTY_HONEYCOMB_LAYOUT = HONEYCOMB_THEME_GROUPS.flatMap(group => group.slots);
export function isHoneycombFeatured() {
  return false;
}
const THEME_CLUSTER_METRICS_OPTIONS = {
  maxWidthRem: 28,
  minWidthRem: 11,
  minHeightRem: 15,
  paddingRem: 0.45
};
export function buildHoneycombThemeClusters(items = []) {
  const list = Array.isArray(items) ? items : [];
  const byType = Object.fromEntries(list.map(item => [item.type, item]));
  const clusters = HONEYCOMB_THEME_GROUPS.map(group => {
    const clusterItems = group.slots.map(slot => byType[slot.type]).filter(Boolean);
    return {
      id: group.id,
      items: clusterItems,
      clusterMetrics: computeHoneycombClusterMetrics(collectHoneycombSlotsFromItems(clusterItems), THEME_CLUSTER_METRICS_OPTIONS)
    };
  }).filter(cluster => cluster.items.length > 0);
  const customItems = list.filter(item => String(item.type || "").startsWith("Custom:"));
  if (customItems.length) {
    clusters.push({
      id: "custom",
      items: customItems,
      clusterMetrics: computeHoneycombClusterMetrics(collectHoneycombSlotsFromItems(customItems), THEME_CLUSTER_METRICS_OPTIONS)
    });
  }
  return clusters;
}
export const INFRA_BRICK_GROUPS = [{
  id: "cybersecurity",
  label: "Cybersecurity",
  types: ["Antivirus", "Antispam"]
}, {
  id: "services",
  label: "Services",
  types: ["TenantMicrosoft", "GoogleWorkspace", "Backup"]
}, {
  id: "licensing",
  label: "Licenses & abonnements",
  types: ["NDD", "CertificatsSSL", "LicensesAbonnements"]
}, {
  id: "campaign",
  label: "Campagne",
  types: ["Campagne"]
}];
const BRICK_TYPE_META = {
  Antivirus: {
    id: "antivirus",
    label: "Antivirus"
  },
  Antispam: {
    id: "antispam",
    label: "Antispam"
  },
  Backup: {
    id: "sauvegarde",
    label: "Sauvegarde"
  },
  TenantMicrosoft: {
    id: "tenant",
    label: "Tenant Microsoft"
  },
  GoogleWorkspace: {
    id: "google-workspace",
    label: "Google Workspace"
  },
  NDD: {
    id: "ndd",
    label: "Domain name"
  },
  CertificatsSSL: {
    id: "ssl",
    label: "Certificats SSL"
  },
  LicensesAbonnements: {
    id: "licences",
    label: "Licenses & abonnements"
  },
  Campagne: {
    id: "campagne",
    label: "Campagne"
  }
};
const COMING_SOON_BRICK_TYPES = new Set(["GoogleWorkspace"]);
const PRO_ONLY_BRICK_TYPES = new Set(["TenantMicrosoft", "Campagne"]);
export const INFRA_BRICK_PRO_FEATURE_KEYS = {
  TenantMicrosoft: "Tenant Microsoft",
  GoogleWorkspace: "Google Workspace",
  Backup: "backup",
  Campagne: "cyberCampaigns"
};
const ALWAYS_CLICKABLE_BRICK_TYPES = new Set(["Antivirus", "Antispam", "NDD", "CertificatsSSL", "LicensesAbonnements", "Backup", "Campagne"]);
function applyBrickAccessFlags(brick) {
  if (!brick) return brick;
  let next = {
    ...brick
  };
  if (COMING_SOON_BRICK_TYPES.has(brick.type)) {
    next = {
      ...next,
      comingSoon: true,
      alwaysClickable: true
    };
  }
  if (ALWAYS_CLICKABLE_BRICK_TYPES.has(brick.type)) {
    next = {
      ...next,
      alwaysClickable: true,
      comingSoon: false
    };
  }
  if (PRO_ONLY_BRICK_TYPES.has(brick.type)) {
    next = {
      ...next,
      proOnly: true,
      alwaysClickable: true
    };
  }
  return next;
}
export const INFRA_BRICK_TYPES = INFRA_BRICK_GROUPS.flatMap(group => group.types.map(type => ({
  id: BRICK_TYPE_META[type]?.id || type.toLowerCase(),
  type,
  label: BRICK_TYPE_META[type]?.label || type
})));
export function buildSecurityBrick(type, label, items = []) {
  const list = Array.isArray(items) ? items : [];
  const primary = list[0];
  let status = "unmonitored";
  if (list.length > 0) {
    status = primary?.actif === false ? "neutral" : "ok";
  }
  return {
    id: type.toLowerCase(),
    type,
    label,
    name: label,
    status,
    count: list.length,
    items: list
  };
}
function getSslItemStatus(item) {
  if (item?.error) return "critical";
  const expiration = item?.expiration || item?.validTo;
  if (!expiration) return "neutral";
  const expiry = new Date(expiration);
  if (Number.isNaN(expiry.getTime())) return "neutral";
  const now = new Date();
  if (expiry < now) return "critical";
  const warnDate = new Date(now);
  warnDate.setDate(warnDate.getDate() + 30);
  if (expiry <= warnDate) return "warning";
  return "ok";
}
function buildSslBrick(items = [], label = "Certificats SSL") {
  const list = Array.isArray(items) ? items : [];
  let status = "unmonitored";
  if (list.length > 0) {
    const statuses = list.map(getSslItemStatus);
    if (statuses.includes("critical")) status = "critical";else if (statuses.includes("warning")) status = "warning";else if (statuses.includes("ok")) status = "ok";else status = "neutral";
  }
  return {
    id: "ssl",
    type: "CertificatsSSL",
    label,
    name: label,
    status,
    count: list.length,
    items: list
  };
}
function buildDomainBrick(items = [], {
  integrationReady = false,
  label = "Domain name"
} = {}) {
  const list = Array.isArray(items) ? items : [];
  const hasDomains = list.length > 0;
  return {
    id: "ndd",
    type: "NDD",
    label,
    name: label,
    status: hasDomains ? "ok" : "unmonitored",
    count: list.length,
    items: list
  };
}
function buildLicensesBrick(items = [], label = "Licenses & abonnements") {
  const list = Array.isArray(items) ? items : [];
  let status = "unmonitored";
  if (list.length > 0) {
    const statuses = list.map(getSslItemStatus);
    if (statuses.includes("critical")) status = "critical";else if (statuses.includes("warning")) status = "warning";else if (statuses.includes("ok")) status = "ok";else status = "neutral";
  }
  return {
    id: "licences",
    type: "LicensesAbonnements",
    label,
    name: label,
    status,
    count: list.length,
    items: list
  };
}
function buildTenantBrick(tenantInfo = {}, label = "Tenant Microsoft") {
  const configured = Boolean(tenantInfo.configured);
  let status = "unmonitored";
  if (configured) {
    status = tenantInfo.status === "inactive" ? "neutral" : "ok";
  }
  return {
    id: "tenant",
    type: "TenantMicrosoft",
    label,
    name: label,
    status,
    count: configured ? 1 : 0,
    items: configured ? [tenantInfo] : [],
    meta: tenantInfo
  };
}
function buildGoogleWorkspaceBrick(workspaceInfo = {}, label = "Google Workspace") {
  const configured = Boolean(workspaceInfo.configured);
  let status = "unmonitored";
  if (configured) {
    status = workspaceInfo.status === "inactive" ? "neutral" : "ok";
  }
  return {
    id: "google-workspace",
    type: "GoogleWorkspace",
    label,
    name: label,
    status,
    count: configured ? 1 : 0,
    items: configured ? [workspaceInfo] : [],
    meta: workspaceInfo
  };
}
function buildBackupBrick(instances = [], label = "Sauvegarde") {
  const list = Array.isArray(instances) ? instances : [];
  const jobsCount = list.reduce((sum, instance) => {
    if (Number.isFinite(Number(instance?.jobsCount))) return sum + Number(instance.jobsCount);
    return sum + (Array.isArray(instance?.jobs) ? instance.jobs.length : 0);
  }, 0);
  let status = "unmonitored";
  if (list.length > 0) {
    const hasUnmapped = list.some(instance => instance.jobsCount > 0 && instance.mappedJobsCount === 0);
    const hasMapped = list.some(instance => instance.jobsCount > 0 && instance.mappedJobsCount > 0);
    if (hasUnmapped && !hasMapped) status = "unmonitored";else if (hasMapped) status = "ok";else status = "neutral";
  }
  return {
    id: "sauvegarde",
    type: "Backup",
    label,
    name: label,
    status,
    count: list.length,
    jobsCount,
    countLabel: list.length > 0 ? `${list.length} | ${jobsCount}` : null,
    items: list
  };
}
function buildCampaignBrick(items = [], label = "Campagne") {
  const list = Array.isArray(items) ? items : [];
  let status = "unmonitored";
  if (list.length > 0) {
    const hasActive = list.some(campaign => campaign.status === "en_cours" || campaign.status === "active");
    status = hasActive ? "ok" : "neutral";
  }
  return {
    id: "campagne",
    type: "Campagne",
    label,
    name: label,
    status,
    count: list.length,
    items: list
  };
}
function buildAllInfraBricks({
  empty = false,
  antivirusItems = [],
  antispamItems = [],
  domainItems = [],
  domainIntegrationReady = false,
  sslItems = [],
  licenceItems = [],
  backupInstances = [],
  tenantInfo = {},
  googleWorkspaceInfo = {},
  campaignItems = [],
  getBrickTypeLabel = (type, fallback) => fallback || type
} = {}) {
  if (empty) {
    return INFRA_BRICK_TYPES.map(({
      id,
      type,
      label
    }) => applyBrickAccessFlags({
      id,
      type,
      label: getBrickTypeLabel(type, label),
      name: getBrickTypeLabel(type, label),
      status: "unmonitored",
      count: 0,
      items: []
    }));
  }
  return [buildSecurityBrick("Antivirus", getBrickTypeLabel("Antivirus", "Antivirus"), antivirusItems), buildSecurityBrick("Antispam", getBrickTypeLabel("Antispam", "Antispam"), antispamItems), buildBackupBrick(backupInstances, getBrickTypeLabel("Backup", "Sauvegarde")), buildTenantBrick(tenantInfo, getBrickTypeLabel("TenantMicrosoft", "Tenant Microsoft")), buildGoogleWorkspaceBrick(googleWorkspaceInfo, getBrickTypeLabel("GoogleWorkspace", "Google Workspace")), buildDomainBrick(domainItems, {
    integrationReady: domainIntegrationReady,
    label: getBrickTypeLabel("NDD", "Domain name")
  }), buildSslBrick(sslItems, getBrickTypeLabel("CertificatsSSL", "Certificats SSL")), buildLicensesBrick(licenceItems, getBrickTypeLabel("LicensesAbonnements", "Licenses & abonnements")), buildCampaignBrick(campaignItems, getBrickTypeLabel("Campagne", "Campagne"))].map(applyBrickAccessFlags);
}
export function buildInfraBrickGroups(options = {}) {
  const {
    getBrickGroupLabel,
    getBrickTypeLabel,
    ...brickOptions
  } = options;
  const resolveGroupLabel = getBrickGroupLabel || ((_, fallback) => fallback);
  const resolveBrickLabel = getBrickTypeLabel || ((_, fallback) => fallback);
  const bricksByType = Object.fromEntries(buildAllInfraBricks({
    ...brickOptions,
    getBrickTypeLabel: resolveBrickLabel
  }).map(brick => [brick.type, brick]));
  return INFRA_BRICK_GROUPS.map(group => ({
    id: group.id,
    label: resolveGroupLabel(group.id, group.label),
    bricks: group.types.map(type => bricksByType[type]).filter(Boolean)
  }));
}
export function buildInfraBricks(options = {}) {
  return buildAllInfraBricks(options);
}
export const SECURITY_BRICK_TYPES = INFRA_BRICK_TYPES.map(brick => brick.type);
