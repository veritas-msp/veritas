export const RMM_TOKEN_FORM_SECTIONS = [{
  id: "enterprise",
  label: "Company",
  description: "Veritas assignment",
  icon: "mdi:office-building-outline"
}, {
  id: "details",
  label: "Details",
  description: "Label and expiration",
  icon: "mdi:tag-outline"
}];
export const RMM_TOKEN_EXPIRE_PRESETS = [{
  key: "d7",
  days: 7
}, {
  key: "d30",
  days: 30
}, {
  key: "d90",
  days: 90
}, {
  key: "never",
  days: null
}];
function pad2(value) {
  return String(value).padStart(2, "0");
}
export function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
export function fromDatetimeLocalValue(value) {
  if (!value || !String(value).trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
export function addDaysToDatetimeLocal(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return toDatetimeLocalValue(date);
}
export function buildDefaultTokenDraft() {
  return {
    id: null,
    clientId: "",
    label: "",
    expiresAt: ""
  };
}
export function buildEditTokenDraft(token) {
  return {
    id: token?.id || null,
    clientId: String(token?.client_id || ""),
    label: token?.label || "",
    expiresAt: toDatetimeLocalValue(token?.expires_at)
  };
}
