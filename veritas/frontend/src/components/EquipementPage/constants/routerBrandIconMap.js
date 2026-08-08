import React from "react";
import { Icon } from "@iconify/react";
import { ROUTER_BRAND_META } from "./equipmentCatalog";
import { FIREWALL_BRAND_ICON_MAP, getFirewallBrandIconDef } from "./firewallBrandIconMap";
const ROUTER_SPECIFIC_ICON_MAP = {
  MikroTik: {
    type: "iconify",
    icon: "simple-icons:mikrotik"
  },
  VMware: {
    type: "iconify",
    icon: "simple-icons:vmware"
  },
  Peplink: {
    type: "iconify",
    icon: "simple-icons:peplink"
  },
  Cradlepoint: {
    type: "iconify",
    icon: "mdi:router-wireless"
  }
};
export const ROUTER_BRAND_ICON_MAP = {
  ...FIREWALL_BRAND_ICON_MAP,
  ...ROUTER_SPECIFIC_ICON_MAP
};
export function getRouterBrandIconDef(brandId) {
  return ROUTER_BRAND_ICON_MAP[brandId] || getFirewallBrandIconDef(brandId) || null;
}
function normalizeBrandLookup(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
export function resolveRouterBrandId(manufacturer) {
  const raw = String(manufacturer || "").trim();
  if (!raw) return null;
  if (ROUTER_BRAND_ICON_MAP[raw]) return raw;
  for (const [id, meta] of Object.entries(ROUTER_BRAND_META)) {
    if (String(meta?.label || "").trim().toLowerCase() === raw.toLowerCase()) return id;
  }
  const normalized = normalizeBrandLookup(raw);
  for (const id of Object.keys(ROUTER_BRAND_ICON_MAP)) {
    if (normalizeBrandLookup(id) === normalized) return id;
  }
  for (const [id, meta] of Object.entries(ROUTER_BRAND_META)) {
    if (normalizeBrandLookup(meta?.label) === normalized) return id;
  }
  return null;
}
export function getEquipmentRouterBrandId(equipment) {
  const manufacturer = equipment?.manufacturer || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.manufacturer || "";
  return resolveRouterBrandId(manufacturer);
}
export default function RouterBrandIcon({
  brand,
  className
}) {
  const def = getRouterBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:router-wireless" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
