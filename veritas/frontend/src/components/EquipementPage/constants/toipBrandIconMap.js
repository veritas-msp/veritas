import React from "react";
import { Icon } from "@iconify/react";
import { FIREWALL_BRAND_ICON_MAP, getFirewallBrandIconDef } from "./firewallBrandIconMap";
const TOIP_SPECIFIC_ICON_MAP = {
  "3CX": {
    type: "iconify",
    icon: "mdi:phone-in-talk"
  },
  Yeastar: {
    type: "iconify",
    icon: "mdi:phone-voip"
  },
  Avaya: {
    type: "iconify",
    icon: "mdi:phone-classic"
  },
  Grandstream: {
    type: "iconify",
    icon: "mdi:phone-voip"
  },
  Mitel: {
    type: "iconify",
    icon: "mdi:phone"
  },
  AudioCodes: {
    type: "iconify",
    icon: "mdi:phone-forward"
  },
  Patton: {
    type: "iconify",
    icon: "mdi:gate"
  },
  Ribbon: {
    type: "iconify",
    icon: "mdi:shield-key"
  },
  Yealink: {
    type: "iconify",
    icon: "mdi:deskphone"
  },
  Poly: {
    type: "iconify",
    icon: "mdi:deskphone"
  },
  Fanvil: {
    type: "iconify",
    icon: "mdi:deskphone"
  },
  Oracle: {
    type: "iconify",
    icon: "mdi:database"
  }
};
export const TOIP_BRAND_ICON_MAP = {
  ...FIREWALL_BRAND_ICON_MAP,
  ...TOIP_SPECIFIC_ICON_MAP
};
export function getToipBrandIconDef(brandId) {
  return TOIP_BRAND_ICON_MAP[brandId] || getFirewallBrandIconDef(brandId) || null;
}
export default function ToipBrandIcon({
  brand,
  className
}) {
  const def = getToipBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:phone-voip" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
