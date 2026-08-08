import React from "react";
import { getAssetPath } from "../../../utils/assetHelper";
import { FIREWALL_BRAND_META } from "./equipmentCatalog";
import formStyles from "../../EnterprisesPage/EnterpriseFormModal.module.css";
function BrandSvg({
  className,
  viewBox,
  children
}) {
  return <svg className={className} viewBox={viewBox} aria-hidden fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>;
}
function CheckPointIcon({
  className
}) {
  return <BrandSvg className={className} viewBox="0 0 36 44">
      <g transform="translate(-17 0)">
        <path d="M44.2 11.2c-2.3 2.9-6.5 3.4-9.4 1-2.9-2.3-3.3-6.6-1-9.5 2.3-2.9 6.5-3.4 9.4-1 2.9 2.3 3.3 6.6 1 9.5z" />
        <path d="M35.2 21.7c-1.8.9-4.1.8-6-.2l-5.2 7.1c.7.8 1 1.7 1.1 2.7 0 .9-.2 1.8-.7 2.6-1.3 2.1-4 2.7-6.1 1.3-.2-.1-.4-.3-.6-.5 0 0-.1-.1-.2-.2-.1-.1-.2-.3-.3-.4 0 0 0-.1-.1-.2-.1-.2-.2-.4-.3-.6 0 0 0-.1 0-.2 0-.2-.1-.3-.2-.5 0 0 0-.1 0-.2 0-.2 0-.4-.1-.7v-.2c0-.2 0-.4 0-.6 0-.4 0-.6.1-.8 0 0 0-.1 0-.2 0-.2.2-.5.3-.7l-4.2-3.2-1.3 1.8-4.8-3.7 3.6-4.9 4.8 3.7-1.3 1.8 4.3 3.3c1.3-1.1 3.2-1.4 4.8-.5l5.2-7c-2.1-2.1-2.6-5.4-1.1-8.1.3-.5.7-1 1.1-1.4-2.8-2-6.3-3.1-10-3.1C8 7.8 0 15.9 0 25.9c0 10 7.9 18.1 17.8 18.1 9.8 0 17.8-8 17.9-18 0-1.5-.2-2.9-.5-4.2z" />
      </g>
    </BrandSvg>;
}
function ZscalerIcon({
  className
}) {
  return <BrandSvg className={className} viewBox="0 0 88 54">
      <path d="M84.53 27.46c1.34 8.25-5.82 12.89-13.08 13.43-4.62 9.5-20.91 15.91-35 9-6 .91-9.35-.6-11.9-3.48C29.69 39.77 45.32 27.82 64.41 34c10.2 3.29 12.85-4.45 10.28-7.35-9.62-10.92-31.34-1.09-32.11-.27C51.11 13.32 81.62 9.66 84.53 27.46zm-29.24-15c.05 0-6.94-2.49-16.7 1.73a10.37 10.37 0 0 1-1.16-.5c9.4-6.24 17.63-8.89 24.68-7.86C57.84.93 37.35-2.68 25.61 9.09 11.1 6.23.94 18.53 1.52 29.76S14.36 48 21.34 46.09a2.09 2.09 0 0 1 .5 0C23.4 38.67 29.7 21.4 55.29 12.47z" />
    </BrandSvg>;
}
function StormshieldIcon({
  className
}) {
  return <img src={getAssetPath("assets/brands/stormshield.png")} className={`${className} ${formStyles.moduleTileBrandLogoImg}`} alt="" draggable={false} />;
}
function SophosIcon({
  className
}) {
  return <BrandSvg className={className} viewBox="0 0 25 20">
      <path d="M1.38 1.34V10.05c0 1.48.8 2.83 2.09 3.55l9.08 5.03.06.03 9.13-5.06c1.29-.72 2.09-2.08 2.09-3.55V1.34H1.38zm14.62 10.32c-.68.37-1.44.57-2.21.57l-8.42-.02 4.72-2.63c.46-.26.97-.39 1.49-.39l8.92-.03-4.49 2.5zm-.13-4.3c-.46-.26-.97-.39-1.49-.39l-8.92-.03 4.49-2.5c.68-.38 1.44-.57 2.21-.57l8.42.02-4.72 2.63-.02-.03z" />
    </BrandSvg>;
}
function WatchGuardIcon({
  className
}) {
  return <BrandSvg className={className} viewBox="0 0 52 54">
      <path d="M41.7 14.9c3.1 3.4 4.9 7.8 5.2 12.4-1.1 5.3-2.8 10.4-5 15.3-2.9.1-8.1.2-8.1.2-1.2-7.5-3.3-15.4-4.7-20.8-1.4 5.5-3.5 13.4-4.7 20.8-5.2 0-8.1-.2-8.1-.2-5.8-12.6-7-27.4-7-27.4 2.6-.2 4.9-.3 7.1-.3.6 5.6 2.5 16.6 3.6 19.7 1-6.8 2.8-13.5 5.4-19.9 2.6 0 4.4-.1 7 0 2.6 6.4 4.5 13.1 5.5 19.9 1.1-3.1 3-14.1 3.6-19.7z" />
      <path d="M28.8 2.7c-.9 0-1.8-.1-2.8-.1C11.7 2.6.1 14.2.1 28.6c0 14.4 11.7 26 26.1 25.9 14.4 0 26-11.7 25.9-26.1 0-13.3-10.1-24.4-23.3-25.8l-.2 2.2c13.2 1.4 22.8 13.2 21.4 26.4-1.4 13.2-13.2 22.8-26.4 21.4C10.5 51.2.9 39.4 2.3 26.2 3.5 14 13.8 4.7 26.1 4.7c.9 0 1.7 0 2.5.1l.2-2.2z" />
    </BrandSvg>;
}
function HpeIcon({
  className
}) {
  return <BrandSvg className={className} viewBox="0 0 48 20">
      <text x="24" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="currentColor">
        HPE
      </text>
    </BrandSvg>;
}
function DynFiIcon({
  className
}) {
  return <BrandSvg className={className} viewBox="0 0 24 24">
      <path d="M4 4h8v16H4V4zm10 0h6v3h-3v4h3v3h-3v6h-3V4z" />
    </BrandSvg>;
}
export const FIREWALL_BRAND_ICON_MAP = {
  Stormshield: {
    type: "component",
    Component: StormshieldIcon
  },
  Fortinet: {
    type: "iconify",
    icon: "simple-icons:fortinet"
  },
  PaloAltoNetworks: {
    type: "iconify",
    icon: "simple-icons:paloaltonetworks"
  },
  CheckPoint: {
    type: "component",
    Component: CheckPointIcon
  },
  Sophos: {
    type: "component",
    Component: SophosIcon
  },
  WatchGuard: {
    type: "component",
    Component: WatchGuardIcon
  },
  Cisco: {
    type: "iconify",
    icon: "simple-icons:cisco"
  },
  SonicWall: {
    type: "iconify",
    icon: "simple-icons:sonicwall"
  },
  Juniper: {
    type: "iconify",
    icon: "simple-icons:junipernetworks"
  },
  Ubiquiti: {
    type: "iconify",
    icon: "simple-icons:ubiquiti"
  },
  pfSense: {
    type: "iconify",
    icon: "simple-icons:pfsense"
  },
  Huawei: {
    type: "iconify",
    icon: "simple-icons:huawei"
  },
  HPE: {
    type: "component",
    Component: HpeIcon
  },
  OPNsense: {
    type: "iconify",
    icon: "simple-icons:opnsense"
  },
  DynFi: {
    type: "component",
    Component: DynFiIcon
  },
  MicrosoftAzure: {
    type: "iconify",
    icon: "simple-icons:microsoftazure"
  },
  AWS: {
    type: "iconify",
    icon: "simple-icons:amazonwebservices"
  },
  Cloudflare: {
    type: "iconify",
    icon: "simple-icons:cloudflare"
  },
  GoogleCloud: {
    type: "iconify",
    icon: "simple-icons:googlecloud"
  },
  Zscaler: {
    type: "component",
    Component: ZscalerIcon
  }
};
export function getFirewallBrandIconDef(brandId) {
  return FIREWALL_BRAND_ICON_MAP[brandId] || null;
}
function normalizeBrandLookup(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
export function resolveFirewallBrandId(manufacturer) {
  const raw = String(manufacturer || "").trim();
  if (!raw) return null;
  if (FIREWALL_BRAND_ICON_MAP[raw]) return raw;
  for (const [id, meta] of Object.entries(FIREWALL_BRAND_META)) {
    if (String(meta?.label || "").trim().toLowerCase() === raw.toLowerCase()) return id;
  }
  const normalized = normalizeBrandLookup(raw);
  for (const id of Object.keys(FIREWALL_BRAND_ICON_MAP)) {
    if (normalizeBrandLookup(id) === normalized) return id;
  }
  for (const [id, meta] of Object.entries(FIREWALL_BRAND_META)) {
    if (normalizeBrandLookup(meta?.label) === normalized) return id;
  }
  return null;
}
export function getEquipmentFirewallBrandId(equipment) {
  const manufacturer = equipment?.manufacturer || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.manufacturer || "";
  return resolveFirewallBrandId(manufacturer);
}
