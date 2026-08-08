import React from "react";
import { Icon } from "@iconify/react";
import { FIREWALL_BRAND_ICON_MAP, getFirewallBrandIconDef } from "./firewallBrandIconMap";
const ALIMENTATION_SPECIFIC_ICON_MAP = {
  APC: {
    type: "iconify",
    icon: "mdi:power-plug"
  },
  CyberPower: {
    type: "iconify",
    icon: "mdi:power-plug"
  },
  Schneider: {
    type: "iconify",
    icon: "mdi:flash"
  },
  Legrand: {
    type: "iconify",
    icon: "mdi:power-socket-eu"
  },
  Vertiv: {
    type: "iconify",
    icon: "mdi:server-security"
  },
  Raritan: {
    type: "iconify",
    icon: "mdi:power-socket"
  }
};
export const ALIMENTATION_BRAND_ICON_MAP = {
  ...FIREWALL_BRAND_ICON_MAP,
  ...ALIMENTATION_SPECIFIC_ICON_MAP
};
export function getAlimentationBrandIconDef(brandId) {
  return ALIMENTATION_BRAND_ICON_MAP[brandId] || getFirewallBrandIconDef(brandId) || null;
}
export default function AlimentationBrandIcon({
  brand,
  className
}) {
  const def = getAlimentationBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:power-plug" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
