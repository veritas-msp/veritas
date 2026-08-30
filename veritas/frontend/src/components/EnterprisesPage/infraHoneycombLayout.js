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
export function honeycombSlotKey(q, r) {
  return `${Number(q) || 0},${Number(r) || 0}`;
}
export function resolveHoneycombTileCollisions(tiles = []) {
  const list = Array.isArray(tiles) ? tiles.map(tile => ({
    ...tile
  })) : [];
  const kept = [];
  const displaced = [];
  const occupied = new Set();
  list.forEach(tile => {
    const key = honeycombSlotKey(tile.q, tile.r);
    if (occupied.has(key)) {
      displaced.push(tile);
      return;
    }
    occupied.add(key);
    kept.push(tile);
  });
  displaced.forEach(tile => {
    const free = allocateHoneycombSlots(1, kept)[0] || {
      q: 0,
      r: 0
    };
    kept.push({
      ...tile,
      q: free.q,
      r: free.r
    });
  });
  return kept;
}
export const HEX_NEIGHBOR_DIRS = [{
  id: "e",
  dq: 1,
  dr: 0,
  icon: "mdi:arrow-right"
}, {
  id: "se",
  dq: 0,
  dr: 1,
  icon: "mdi:arrow-bottom-right"
}, {
  id: "sw",
  dq: -1,
  dr: 1,
  icon: "mdi:arrow-bottom-left"
}, {
  id: "w",
  dq: -1,
  dr: 0,
  icon: "mdi:arrow-left"
}, {
  id: "nw",
  dq: 0,
  dr: -1,
  icon: "mdi:arrow-top-left"
}, {
  id: "ne",
  dq: 1,
  dr: -1,
  icon: "mdi:arrow-top-right"
}];
export function getHoneycombNeighbors(q, r) {
  return HEX_NEIGHBOR_DIRS.map(dir => ({
    ...dir,
    q: Number(q) + dir.dq,
    r: Number(r) + dir.dr
  }));
}
export function findHoneycombTile(tiles, key) {
  return (Array.isArray(tiles) ? tiles : []).find(tile => tile.key === key) || null;
}
export function findHoneycombTileAt(tiles, q, r) {
  return (Array.isArray(tiles) ? tiles : []).find(tile => Number(tile.q) === Number(q) && Number(tile.r) === Number(r)) || null;
}
export function moveHoneycombTile(tiles, key, dq, dr) {
  const list = (Array.isArray(tiles) ? tiles : []).map(tile => ({
    ...tile
  }));
  const tile = list.find(entry => entry.key === key);
  if (!tile) return list;
  const fromQ = Number(tile.q) || 0;
  const fromR = Number(tile.r) || 0;
  const nextQ = fromQ + Number(dq) || 0;
  const nextR = fromR + Number(dr) || 0;
  const occupant = list.find(entry => entry.key !== key && Number(entry.q) === nextQ && Number(entry.r) === nextR);
  tile.q = nextQ;
  tile.r = nextR;
  if (occupant) {
    occupant.q = fromQ;
    occupant.r = fromR;
  }
  return list;
}
export function placeHoneycombTile(tiles, key, q, r) {
  const tile = findHoneycombTile(tiles, key);
  if (!tile) return Array.isArray(tiles) ? tiles : [];
  return moveHoneycombTile(tiles, key, Number(q) - Number(tile.q || 0), Number(r) - Number(tile.r || 0));
}
export function swapHoneycombTiles(tiles, aKey, bKey) {
  if (!aKey || !bKey || aKey === bKey) return Array.isArray(tiles) ? tiles : [];
  const a = findHoneycombTile(tiles, aKey);
  if (!a) return Array.isArray(tiles) ? tiles : [];
  return placeHoneycombTile(tiles, aKey, findHoneycombTile(tiles, bKey)?.q ?? a.q, findHoneycombTile(tiles, bKey)?.r ?? a.r);
}
export function buildCustomFamilyHoneycombSlots(families = [], reservedSlots = []) {
  const hexFamilies = (Array.isArray(families) ? families : []).filter(family => family.displayMode !== "brick");
  const manual = [];
  const auto = [];
  hexFamilies.forEach(family => {
    if (family.honeycombQ != null && family.honeycombR != null && family.honeycombQ !== "" && family.honeycombR !== "") {
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
  const reserved = [...(reservedSlots || []), ...manual.map(entry => entry.slot)];
  const outerSlots = allocateHoneycombSlots(auto.length, reserved);
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
      rawHeightRem: 24,
      originX: 0,
      originY: 0
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
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  slots.forEach(slot => {
    const {
      x,
      y
    } = honeycombOffsetRem(slot.q ?? 0, slot.r ?? 0, layoutScale);
    minX = Math.min(minX, x - halfW);
    maxX = Math.max(maxX, x + halfW);
    minY = Math.min(minY, y - halfH);
    maxY = Math.max(maxY, y + halfH);
  });
  const originX = (minX + maxX) / 2;
  const originY = (minY + maxY) / 2;
  const rawWidth = Math.max(w * layoutScale, maxX - minX) + paddingRem * 2;
  const rawHeight = Math.max(h * layoutScale, maxY - minY) + paddingRem * 2;
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
    rawHeightRem: rawHeight,
    originX,
    originY
  };
}
export function honeycombDisplayOffsetRem(q, r, metrics = {}) {
  const {
    x,
    y
  } = honeycombOffsetRem(q, r, metrics.layoutScale ?? 1);
  return {
    x: x - (Number(metrics.originX) || 0),
    y: y - (Number(metrics.originY) || 0)
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
    alwaysClickable: true,
    familyKey: family.familyKey,
    customFamily: family
  }));
}
export const HARDWARE_TYPE_ORDER = ["Internet", "Firewalls", "Routeur", "Servers", "Storage", "Ordinateurs", "Switch", "BorneWifi", "TOIP", "Alimentation"];
export const HONEYCOMB_TABLE_TYPE_ORDER = HARDWARE_TYPE_ORDER.filter(type => type !== "Ordinateurs");
export const DEFAULT_HONEYCOMB_SLOTS = [{
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
}, {
  type: "Servers",
  q: 3,
  r: -1
}, {
  type: "Storage",
  q: 3,
  r: 0
}, {
  type: "Ordinateurs",
  q: 4,
  r: -1
}, {
  type: "Alimentation",
  q: 4,
  r: 0
}, {
  type: "Switch",
  q: 6,
  r: -1
}, {
  type: "BorneWifi",
  q: 6,
  r: 0
}, {
  type: "TOIP",
  q: 7,
  r: -1
}];
export const HONEYCOMB_THEME_GROUPS = [{
  id: "edge",
  types: ["Internet", "Firewalls", "Routeur"],
  slots: DEFAULT_HONEYCOMB_SLOTS.filter(slot => ["Internet", "Firewalls", "Routeur"].includes(slot.type))
}, {
  id: "compute",
  types: ["Servers", "Storage", "Ordinateurs", "Alimentation"],
  slots: DEFAULT_HONEYCOMB_SLOTS.filter(slot => ["Servers", "Storage", "Ordinateurs", "Alimentation"].includes(slot.type))
}, {
  id: "lan",
  types: ["Switch", "BorneWifi", "TOIP"],
  slots: DEFAULT_HONEYCOMB_SLOTS.filter(slot => ["Switch", "BorneWifi", "TOIP"].includes(slot.type))
}];
export const EMPTY_HONEYCOMB_LAYOUT = DEFAULT_HONEYCOMB_SLOTS;
export function getDefaultHoneycombSlot(type) {
  return DEFAULT_HONEYCOMB_SLOTS.find(slot => slot.type === type) || {
    type,
    q: 0,
    r: 0
  };
}
export function applyHoneycombLayoutOverrides(layouts = {}) {
  return DEFAULT_HONEYCOMB_SLOTS.map(slot => {
    const layout = layouts?.[slot.type];
    if (layout && layout.displayMode === "brick") return null;
    const q = layout?.honeycombQ == null || layout.honeycombQ === "" ? slot.q : Number(layout.honeycombQ);
    const r = layout?.honeycombR == null || layout.honeycombR === "" ? slot.r : Number(layout.honeycombR);
    return {
      ...slot,
      q: Number.isFinite(q) ? q : slot.q,
      r: Number.isFinite(r) ? r : slot.r,
      tileShape: layout?.tileShape || slot.tileShape || "hexagon"
    };
  }).filter(Boolean);
}
export function isHoneycombFeatured() {
  return false;
}
const UNIFIED_CLUSTER_METRICS_OPTIONS = {
  maxWidthRem: 72,
  minWidthRem: 12,
  minHeightRem: 10,
  paddingRem: 0.9
};
export function buildDefaultHoneycombEditorTiles(customFamilies = []) {
  return buildHoneycombEditorTiles({
    layouts: {},
    customFamilies: (Array.isArray(customFamilies) ? customFamilies : []).map(family => ({
      ...family,
      honeycombQ: null,
      honeycombR: null
    }))
  });
}
export function buildHoneycombEditorTiles({
  layouts = {},
  customFamilies = [],
  current = null
} = {}) {
  const systemSlots = applyHoneycombLayoutOverrides(layouts);
  const customEntries = buildCustomFamilyHoneycombSlots((Array.isArray(customFamilies) ? customFamilies : []).filter(family => !family.isSystem && family.displayMode !== "brick"), systemSlots);
  let tiles = [...systemSlots.map(slot => ({
    key: slot.type,
    familyKey: slot.type,
    isSystem: true,
    q: slot.q,
    r: slot.r,
    displayMode: "hexagon",
    tileShape: slot.tileShape || "hexagon"
  })), ...customEntries.map(({
    family,
    slot
  }) => ({
    key: `Custom:${family.familyKey}`,
    familyKey: family.familyKey,
    id: family.id || null,
    isSystem: false,
    label: family.label,
    icon: family.icon,
    q: slot.q,
    r: slot.r,
    displayMode: family.displayMode || "hexagon",
    tileShape: family.tileShape || "hexagon"
  }))];
  tiles = resolveHoneycombTileCollisions(tiles);
  if (!current || current.displayMode === "brick") return tiles;
  const currentKey = current.isSystem || HARDWARE_TYPE_ORDER.includes(current.familyKey) ? current.familyKey : current.familyKey ? `Custom:${current.familyKey}` : "__draft__";
  const draftQ = current.honeycombQ === "" || current.honeycombQ == null ? null : Number(current.honeycombQ);
  const draftR = current.honeycombR === "" || current.honeycombR == null ? null : Number(current.honeycombR);
  const existing = tiles.find(tile => tile.key === currentKey);
  if (existing) {
    if (Number.isFinite(draftQ) && Number.isFinite(draftR) && (Number(existing.q) !== draftQ || Number(existing.r) !== draftR)) {
      return resolveHoneycombTileCollisions(placeHoneycombTile(tiles, currentKey, draftQ, draftR));
    }
    return tiles;
  }
  const free = allocateHoneycombSlots(1, tiles)[0] || {
    q: 0,
    r: 0
  };
  const slot = Number.isFinite(draftQ) && Number.isFinite(draftR) ? {
    q: draftQ,
    r: draftR
  } : free;
  tiles = [...tiles, {
    key: currentKey,
    familyKey: current.familyKey,
    id: current.id || null,
    isSystem: Boolean(current.isSystem),
    label: current.label,
    icon: current.icon,
    q: slot.q,
    r: slot.r,
    displayMode: current.displayMode || "hexagon",
    tileShape: current.tileShape || "hexagon"
  }];
  return resolveHoneycombTileCollisions(placeHoneycombTile(tiles, currentKey, slot.q, slot.r));
}
export function buildHoneycombThemeClusters(items = []) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];
  return [{
    id: "hardware",
    items: list,
    clusterMetrics: computeHoneycombClusterMetrics(collectHoneycombSlotsFromItems(list), UNIFIED_CLUSTER_METRICS_OPTIONS)
  }];
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
