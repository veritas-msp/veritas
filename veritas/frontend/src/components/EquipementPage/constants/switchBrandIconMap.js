import React from "react";
import { Icon } from "@iconify/react";
import { FIREWALL_BRAND_ICON_MAP, getFirewallBrandIconDef } from "./firewallBrandIconMap";
const SWITCH_SPECIFIC_ICON_MAP = {
  MikroTik: {
    type: "iconify",
    icon: "simple-icons:mikrotik"
  },
  Netgear: {
    type: "iconify",
    icon: "mdi:lan"
  },
  DLink: {
    type: "iconify",
    icon: "mdi:lan-connect"
  },
  "TP-Link": {
    type: "iconify",
    icon: "mdi:lan-connect"
  }
};
export const SWITCH_BRAND_ICON_MAP = {
  ...FIREWALL_BRAND_ICON_MAP,
  ...SWITCH_SPECIFIC_ICON_MAP
};
export function getSwitchBrandIconDef(brandId) {
  return SWITCH_BRAND_ICON_MAP[brandId] || getFirewallBrandIconDef(brandId) || null;
}
export default function SwitchBrandIcon({
  brand,
  className
}) {
  const def = getSwitchBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:lan-connect" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
