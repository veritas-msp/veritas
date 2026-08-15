const VLAN_SPLIT = /[,;/\s]+/;
const VLAN_MIN = 1;
const VLAN_MAX = 4094;

function normalizeVlanToken(raw) {
  const token = String(raw || "").trim();
  if (!token) return "";
  const digits = token.replace(/^vlan\s*/i, "").trim();
  if (!/^\d{1,4}$/.test(digits)) return "";
  const id = Number(digits);
  if (!Number.isInteger(id) || id < VLAN_MIN || id > VLAN_MAX) return "";
  return String(id);
}

export function parseVlanList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(VLAN_SPLIT);
  const seen = new Set();
  const list = [];
  source.forEach(item => {
    const vlan = normalizeVlanToken(item);
    if (!vlan || seen.has(vlan)) return;
    seen.add(vlan);
    list.push(vlan);
  });
  return list;
}

export function serializeVlanList(vlans = []) {
  return parseVlanList(vlans).join(", ");
}

export function addVlansToList(current, incoming) {
  return parseVlanList([...parseVlanList(current), incoming]);
}
