import React from "react";
import { Icon } from "@iconify/react";
import { SERVER_BRAND_META } from "./equipmentCatalog";
import { ROUTER_BRAND_ICON_MAP, getRouterBrandIconDef } from "./routerBrandIconMap";
const SERVER_SPECIFIC_ICON_MAP = {
  Dell: {
    type: "iconify",
    icon: "simple-icons:dell"
  },
  Lenovo: {
    type: "iconify",
    icon: "simple-icons:lenovo"
  },
  FUJITSU: {
    type: "iconify",
    icon: "simple-icons:fujitsu"
  }
};
export const SERVER_BRAND_ICON_MAP = {
  ...ROUTER_BRAND_ICON_MAP,
  ...SERVER_SPECIFIC_ICON_MAP
};
export function getServerBrandIconDef(brandId) {
  return SERVER_BRAND_ICON_MAP[brandId] || getRouterBrandIconDef(brandId) || null;
}
function normalizeBrandLookup(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
export function resolveServerBrandId(manufacturer) {
  const raw = String(manufacturer || "").trim();
  if (!raw) return null;
  if (SERVER_BRAND_ICON_MAP[raw]) return raw;
  for (const [id, meta] of Object.entries(SERVER_BRAND_META)) {
    if (String(meta?.label || "").trim().toLowerCase() === raw.toLowerCase()) return id;
  }
  const normalized = normalizeBrandLookup(raw);
  for (const id of Object.keys(SERVER_BRAND_ICON_MAP)) {
    if (normalizeBrandLookup(id) === normalized) return id;
  }
  for (const [id, meta] of Object.entries(SERVER_BRAND_META)) {
    if (normalizeBrandLookup(meta?.label) === normalized) return id;
  }
  return null;
}
export function getEquipmentServerBrandId(equipment) {
  const manufacturer = equipment?.manufacturer || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.manufacturer || "";
  return resolveServerBrandId(manufacturer);
}
export default function ServerBrandIcon({
  brand,
  className
}) {
  const def = getServerBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:server" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
