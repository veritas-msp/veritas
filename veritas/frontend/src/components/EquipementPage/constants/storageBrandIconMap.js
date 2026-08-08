import React from "react";
import { Icon } from "@iconify/react";
import { STORAGE_BRAND_META } from "./equipmentCatalog";
import { SERVER_BRAND_ICON_MAP, getServerBrandIconDef } from "./serverBrandIconMap";
const STORAGE_SPECIFIC_ICON_MAP = {
  SYNOLOGY: {
    type: "iconify",
    icon: "simple-icons:synology"
  },
  QNAP: {
    type: "iconify",
    icon: "simple-icons:qnap"
  },
  NetApp: {
    type: "iconify",
    icon: "simple-icons:netapp"
  },
  PureStorage: {
    type: "iconify",
    icon: "mdi:database-outline"
  },
  Quantum: {
    type: "iconify",
    icon: "mdi:backup-restore"
  },
  WesternDigital: {
    type: "iconify",
    icon: "simple-icons:westerndigital"
  },
  Asustor: {
    type: "iconify",
    icon: "mdi:nas"
  },
  Netgear: {
    type: "iconify",
    icon: "simple-icons:netgear"
  },
  IBM: {
    type: "iconify",
    icon: "simple-icons:ibm"
  },
  Wasabi: {
    type: "iconify",
    icon: "mdi:cloud-outline"
  },
  OVHcloud: {
    type: "iconify",
    icon: "simple-icons:ovh"
  }
};
export const STORAGE_BRAND_ICON_MAP = {
  ...SERVER_BRAND_ICON_MAP,
  ...STORAGE_SPECIFIC_ICON_MAP
};
export function getStorageBrandIconDef(brandId) {
  return STORAGE_BRAND_ICON_MAP[brandId] || getServerBrandIconDef(brandId) || null;
}
function normalizeBrandLookup(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
export function resolveStorageBrandId(manufacturer) {
  const raw = String(manufacturer || "").trim();
  if (!raw) return null;
  if (STORAGE_BRAND_ICON_MAP[raw]) return raw;
  for (const [id, meta] of Object.entries(STORAGE_BRAND_META)) {
    if (String(meta?.label || "").trim().toLowerCase() === raw.toLowerCase()) return id;
  }
  const normalized = normalizeBrandLookup(raw);
  for (const id of Object.keys(STORAGE_BRAND_ICON_MAP)) {
    if (normalizeBrandLookup(id) === normalized) return id;
  }
  for (const [id, meta] of Object.entries(STORAGE_BRAND_META)) {
    if (normalizeBrandLookup(meta?.label) === normalized) return id;
  }
  return null;
}
export default function StorageBrandIcon({
  brand,
  className
}) {
  const def = getStorageBrandIconDef(brand);
  if (!def) {
    return <Icon icon="mdi:database-outline" className={className} aria-hidden />;
  }
  if (def.type === "iconify") {
    return <Icon icon={def.icon} className={className} aria-hidden />;
  }
  const SvgComponent = def.Component;
  return <SvgComponent className={className} />;
}
