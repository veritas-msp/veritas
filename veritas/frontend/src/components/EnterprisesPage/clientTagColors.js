export const CLIENT_TAG_COLORS = [{
  value: "#2b5fab",
  label: "Bleu"
}, {
  value: "#16a34a",
  label: "Vert"
}, {
  value: "#d97706",
  label: "Orange"
}, {
  value: "#7c3aed",
  label: "Violet"
}, {
  value: "#dc2626",
  label: "Rouge"
}, {
  value: "#0891b2",
  label: "Cyan"
}];
export const DEFAULT_CLIENT_TAG_COLOR = CLIENT_TAG_COLORS[0].value;
export function normalizeTagColor(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}
export function isPresetTagColor(color) {
  const normalized = normalizeTagColor(color);
  if (!normalized) return false;
  return CLIENT_TAG_COLORS.some(entry => entry.value === normalized);
}
export function getTagChipStyle(color) {
  const value = normalizeTagColor(color) || DEFAULT_CLIENT_TAG_COLOR;
  return {
    backgroundColor: `${value}18`,
    borderColor: `${value}55`,
    color: value
  };
}
export function pickTagColorFromLabel(label) {
  const colors = CLIENT_TAG_COLORS.map(entry => entry.value);
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i) * (i + 1)) % colors.length;
  }
  return colors[hash];
}
