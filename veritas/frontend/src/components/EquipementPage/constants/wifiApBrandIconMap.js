import React from "react";
import { Icon } from "@iconify/react";
import { FIREWALL_BRAND_ICON_MAP, getFirewallBrandIconDef } from "./firewallBrandIconMap";
const WIFI_AP_SPECIFIC_ICON_MAP = {
  Ruckus: {
    type: "iconify",
    icon: "mdi:wifi"
  },
  Netgear: {
    type: "iconify",
    icon: "mdi:wifi"
  },
  MikroTik: {
    type: "iconify",
    icon: "simple-icons:mikrotik"
  },
  "TP-Link": {
    type: "iconify",
    icon: "mdi:wifi"
  }
};
export const WIFI_AP_BRAND_ICON_MAP = {
  ...FIREWALL_BRAND_ICON_MAP,
  ...WIFI_AP_SPECIFIC_ICON_MAP
};
export function getWifiApBrandIconDef(brandId) {
  return WIFI_AP_BRAND_ICON_MAP[brandId] || getFirewallBrandIconDef(brandId) || null;
}
export default function WifiApBrandIcon({
  brand,
  className
}) {
  const def = getWifiApBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:wifi" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
