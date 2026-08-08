import React from "react";
import { Icon } from "@iconify/react";
import { getFirewallBrandIconDef } from "./firewallBrandIconMap";
export default function FirewallBrandIcon({
  brand,
  className
}) {
  const def = getFirewallBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:shield-outline" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
