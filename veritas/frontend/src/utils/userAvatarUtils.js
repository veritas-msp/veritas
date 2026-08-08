import API_BASE_URL from "../config";
import { getAvatarPath } from "./assetHelper";
const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
export const PRESET_AVATARS = [{
  id: "blue",
  label: "Bleu"
}, {
  id: "green",
  label: "Vert"
}, {
  id: "orange",
  label: "Orange"
}, {
  id: "purple",
  label: "Violet"
}, {
  id: "rose",
  label: "Rose"
}, {
  id: "slate",
  label: "Ardoise"
}, {
  id: "teal",
  label: "Sarcelle"
}, {
  id: "amber",
  label: "Ambre"
}];
export function getUserInitials(name) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}
export function resolveAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== "object") return null;
  if (avatar.type === "preset" && avatar.presetId) {
    return getAvatarPath(`${avatar.presetId}.svg`);
  }
  if (avatar.type === "upload" && avatar.url) {
    const raw = String(avatar.url).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalized = raw.replace(/\\/g, "/");
    const uploadsIndex = normalized.toLowerCase().indexOf("/uploads/");
    const relativePath = uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : normalized;
    if (!relativePath.startsWith("/")) return null;
    const encodedPath = relativePath.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
    return `${BACKEND_BASE_URL}${encodedPath}`;
  }
  return null;
}
export function resolveUserAvatarSrc(user) {
  return resolveAvatarUrl(user?.avatar);
}
