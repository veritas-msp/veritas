import { parseVlanList } from "../EquipementPage/vlanUtils";
import { getEquipmentHaPairColor, getEquipmentHaPairKey, getEquipmentHaState } from "../EquipementPage/equipmentHaUtils";
import { getInfraTypeIcon } from "./infraMapUtils";

export const MANUAL_NODE_TYPES = [
  { id: "site", icon: "mdi:map-marker-outline" },
  { id: "link", icon: "mdi:link-variant" },
  { id: "application", icon: "mdi:application-outline" },
  { id: "directory", icon: "mdi:account-group-outline" },
  { id: "group", icon: "mdi:folder-multiple-outline" },
  { id: "vendor", icon: "mdi:truck-outline" },
  { id: "rack", icon: "mdi:server" }
];

const MANUAL_IDS = new Set(MANUAL_NODE_TYPES.map(entry => entry.id));
const ROUTING_TYPES = new Set(["Firewalls", "Firewall", "Routeur", "Internet"]);

export const IMPACT_FAMILY_ORDER = [
  "Internet",
  "Firewalls",
  "Firewall",
  "Serveurs",
  "Servers",
  "NAS",
  "Stockage",
  "Storage",
  "Switch",
  "BorneWifi",
  "Routeur",
  "Alimentation",
  "TOIP",
  "Ordinateurs",
  "Videosurveillance",
  "Cameras",
  "Camera"
];

const LABEL_ALIAS = {
  NAS: "Stockage",
  Servers: "Serveurs",
  Storage: "Stockage",
  Firewall: "Firewalls",
  Videosurveillance: "Security camera",
  Cameras: "Security camera",
  Camera: "Security camera"
};

const ICON_ALIAS = {
  Serveurs: "Servers",
  NAS: "Storage",
  Stockage: "Storage",
  Firewall: "Firewalls"
};

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function firstText(item, keys) {
  const layers = [item, item?.rawData, item?.data, item?.fields];
  for (const key of keys) {
    for (const layer of layers) {
      const value = layer?.[key];
      if (value != null && String(value).trim()) return String(value).trim();
    }
  }
  return "";
}

export function isCustomInventoryItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.isCustom === true) return true;
  if (String(item.type || "").startsWith("Custom:")) return true;
  return Boolean(item.familyKey && !item.type && !item.dbId);
}

export function normalizeInventoryRow(item) {
  if (!item || typeof item !== "object") return null;
  const custom = isCustomInventoryItem(item);
  const dbId = item.dbId || (isUuid(item.id) ? String(item.id) : null);
  if (!dbId) return null;
  const nodeType = custom
    ? (String(item.type || "").startsWith("Custom:") ? String(item.type) : `Custom:${item.familyKey || "custom"}`)
    : String(item.type || "device");
  const name = String(item.name || item.nom || item.data?.nom || item.data?.name || "—").trim() || "—";
  return {
    kind: custom ? "custom_equipment" : "equipment",
    refId: String(dbId),
    nodeType: nodeType.slice(0, 80),
    name,
    subtitle: firstText(item, ["ip", "hostname", "host", "fqdn", "netbios"]),
    location: firstText(item, ["location", "site", "lieu", "emplacement"]),
    vlans: parseVlanList(firstText(item, ["vlan", "vlans"])),
    icon: item.familyIcon || item.customFamily?.icon || null,
    groupLabel: item.familyLabel || item.customFamily?.label || null,
    isActive: item.is_active !== false && item.isActive !== false,
    source: item
  };
}

export function inventoryKey(kind, refId) {
  return `${kind}:${refId || ""}`;
}

/** HA réel : paire déclarée (pare-feu, serveur, stockage) ou lien internet principal + secours sur le même site. */
export function buildHaIndex(items) {
  const rows = [];
  const internetRoles = new Map();
  (Array.isArray(items) ? items : []).forEach(item => {
    const source = item?.source || item;
    if (!source) return;
    const state = getEquipmentHaState(source);
    const pairKey = getEquipmentHaPairKey(source);
    const internet = pairKey.startsWith("internet::");
    rows.push({
      key: inventoryKey(item.kind, item.refId),
      state,
      pairKey,
      internet,
      color: pairKey ? getEquipmentHaPairColor(source) : ""
    });
    if (!internet || !pairKey) return;
    const roles = internetRoles.get(pairKey) || new Set();
    roles.add(state.role || "Primary");
    internetRoles.set(pairKey, roles);
  });
  const index = new Map();
  rows.forEach(row => {
    const roles = internetRoles.get(row.pairKey);
    const redundant = row.internet
      ? Boolean(roles?.has("Primary") && roles?.has("Secondary"))
      : row.state.active;
    if (!redundant || !row.pairKey) return;
    index.set(row.key, {
      role: row.state.isSecondary ? "Secondary" : "Primary",
      internet: row.internet,
      partnerName: row.state.partnerName || "",
      pairKey: row.pairKey,
      color: row.color || ""
    });
  });
  return index;
}

export function resolveImpactIcon(nodeType, explicitIcon) {
  if (explicitIcon) return explicitIcon;
  const manual = MANUAL_NODE_TYPES.find(entry => entry.id === nodeType);
  if (manual) return manual.icon;
  if (/camera|video/i.test(String(nodeType || ""))) return "mdi:cctv";
  return getInfraTypeIcon(ICON_ALIAS[nodeType] || nodeType);
}

export function resolveFamilyLabel(nodeType, fallback, honeycombTypes = {}) {
  if (String(nodeType || "").startsWith("Custom:")) {
    return fallback || String(nodeType).slice("Custom:".length);
  }
  const alias = LABEL_ALIAS[nodeType];
  return honeycombTypes[nodeType] || (alias ? honeycombTypes[alias] : "") || fallback || nodeType;
}

export function isManualNodeType(nodeType) {
  return MANUAL_IDS.has(nodeType);
}

export function isRoutingNodeType(nodeType) {
  return ROUTING_TYPES.has(nodeType);
}

export function vlansOverlap(left = [], right = []) {
  if (!left.length || !right.length) return false;
  const known = new Set(left);
  return right.some(id => known.has(id));
}

/** same = VLAN commun, separated = réseaux disjoints, routed = passage pare-feu/routeur, unknown = VLAN absent. */
export function classifyNetworkLink(source, target) {
  const left = source?.data?.vlans || [];
  const right = target?.data?.vlans || [];
  if (vlansOverlap(left, right)) return "same";
  const routing = isRoutingNodeType(source?.data?.nodeType) || isRoutingNodeType(target?.data?.nodeType);
  if (left.length && right.length && !routing) return "separated";
  if (routing) return "routed";
  return "unknown";
}

export function collectImpactIds(focus, nodes, edges) {
  const ids = new Set(focus?.id ? [focus.id] : []);
  if (!focus?.id) return ids;
  const focusVlans = focus.data?.vlans || [];
  if (focusVlans.length) {
    nodes.forEach(node => {
      if (vlansOverlap(focusVlans, node.data?.vlans || [])) ids.add(node.id);
    });
  }
  edges.forEach(edge => {
    if (edge.source !== focus.id && edge.target !== focus.id) return;
    const otherId = edge.source === focus.id ? edge.target : edge.source;
    const other = nodes.find(node => node.id === otherId);
    if (!other) return;
    if (classifyNetworkLink(focus, other) !== "separated") ids.add(otherId);
  });
  return ids;
}

export function placeWithoutOverlap(origin, nodes) {
  const start = {
    x: Number(origin?.x) || 80,
    y: Number(origin?.y) || 80
  };
  const list = Array.isArray(nodes) ? nodes : [];
  for (let i = 0; i < 48; i += 1) {
    const angle = i * 0.85;
    const radius = i === 0 ? 0 : 20 + i * 22;
    const x = start.x + Math.cos(angle) * radius;
    const y = start.y + Math.sin(angle) * radius;
    const hit = list.some(node => Math.abs(node.position.x - x) < 160 && Math.abs(node.position.y - y) < 64);
    if (!hit) return { x, y };
  }
  return start;
}

export function serializeImpactGraph(nodes, edges) {
  return {
    nodes: (Array.isArray(nodes) ? nodes : []).map(node => ({
      id: node.id,
      kind: node.data?.kind,
      refId: node.data?.refId || null,
      nodeType: node.data?.nodeType,
      label: String(node.data?.label || "").trim() || "—",
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0
    })),
    edges: (Array.isArray(edges) ? edges : []).map(edge => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      label: edge.label || null
    }))
  };
}

export function flowNodeFromRecord(record) {
  return {
    id: record.id,
    type: "impact",
    position: { x: Number(record.x) || 0, y: Number(record.y) || 0 },
    data: {
      kind: record.kind,
      refId: record.refId || null,
      nodeType: record.nodeType,
      label: record.label || "—",
      subtitle: "",
      icon: resolveImpactIcon(record.nodeType),
      missing: false,
      inactive: false
    }
  };
}

export function flowEdgeFromRecord(record) {
  return {
    id: record.id,
    source: record.sourceId,
    target: record.targetId,
    label: record.label || undefined
  };
}
