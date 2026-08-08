import React from "react";
import { Icon } from "@iconify/react";
import { getIconPath } from "../../../utils/assetHelper";
import { normalizeServerType } from "../equipmentFormConfig";
import FirewallBrandIcon from "./FirewallBrandIcon";
import { getEquipmentFirewallBrandId, resolveFirewallBrandId } from "./firewallBrandIconMap";
import RouterBrandIcon, { getEquipmentRouterBrandId } from "./routerBrandIconMap";
import ServerBrandIcon, { getEquipmentServerBrandId, resolveServerBrandId } from "./serverBrandIconMap";
import StorageBrandIcon, { resolveStorageBrandId } from "./storageBrandIconMap";
import SwitchBrandIcon from "./switchBrandIconMap";
import WifiApBrandIcon from "./wifiApBrandIconMap";
import ToipBrandIcon from "./toipBrandIconMap";
import AlimentationBrandIcon from "./alimentationBrandIconMap";
const TYPE_FALLBACK_ICONS = {
  Internet: "mdi:web",
  Firewalls: "mdi:shield-outline",
  Servers: "mdi:server",
  Ordinateurs: "mdi:laptop",
  Storage: "mdi:harddisk",
  NAS: "mdi:nas",
  Switch: "mdi:lan-connect",
  BorneWifi: "mdi:wifi",
  Alimentation: "mdi:power-plug",
  Routeur: "mdi:router-wireless",
  Backup: "mdi:backup-restore",
  TOIP: "mdi:phone-voip"
};
const BACKUP_SOFTWARE_ICONS = {
  Veeam: "veeam.png",
  "HYCU Backup": "hycu.png",
  HyperBackup: "hyperbackup.png",
  "Active Backup for Microsoft 365": "active-backup.png"
};
export function getEquipmentManufacturer(equipment) {
  return String(equipment?.manufacturer || equipment?.rawData?.fabricant || equipment?.rawData?.marque || equipment?.rawData?.manufacturer || "").trim();
}
function getStorageTypeIconName(equipment) {
  const storageType = equipment?.rawData?.type || equipment?.type || "";
  const typeLower = storageType.toLowerCase();
  if (typeLower.includes("san")) return "mdi:server-network-outline";
  if (typeLower.includes("robot")) return "mdi:vhs";
  if (typeLower.includes("disque")) return "mdi:harddisk";
  return "mdi:nas";
}
function getInternetConnectionIconName(equipment) {
  const type = (equipment?.rawData?.type || equipment?.type || "").toLowerCase();
  const nom = (equipment?.name || equipment?.rawData?.nom || "").toLowerCase();
  const fournisseur = (equipment?.rawData?.fournisseur || equipment?.fournisseur || "").toLowerCase();
  const combined = `${type} ${nom} ${fournisseur}`;
  if (type.includes("fibre") || type.includes("fiber") || combined.includes("fibre") || combined.includes("fiber")) {
    return "streamline-ultimate:fiber-access-1";
  }
  if (type.includes("5g") || combined.includes("5g")) return "material-symbols:5g-mobiledata-badge";
  if (type.includes("4g") || combined.includes("4g") || type.includes("lte") || combined.includes("lte")) {
    return "material-symbols:4g-mobiledata-badge";
  }
  if (type.includes("adsl") || combined.includes("adsl") || type.includes("dsl") || combined.includes("dsl")) {
    return "mdi:ethernet-cable";
  }
  if (type.includes("satellite") || combined.includes("satellite")) return "tabler:satellite";
  if (type.includes("wifi") || combined.includes("wifi") || type.includes("wireless") || combined.includes("wireless")) {
    return "mdi:wifi";
  }
  if (type.includes("ethernet") || combined.includes("ethernet") || type.includes("cable") || combined.includes("cable")) {
    return "mdi:ethernet";
  }
  if (type.includes("mpls") || combined.includes("mpls")) return "mdi:network";
  return "mdi:router-wireless";
}
function renderTypeFallback(type, className, size) {
  return <Icon icon={TYPE_FALLBACK_ICONS[type] || "mdi:devices"} className={className} width={size} height={size} aria-hidden />;
}
function renderBackupSoftwareIcon(logiciel, className) {
  const iconFile = BACKUP_SOFTWARE_ICONS[logiciel];
  if (!iconFile) return null;
  return <img src={getIconPath(iconFile)} alt="" className={className} aria-hidden />;
}
function resolveBrandId(equipment, resolver) {
  const fromEquipment = typeof resolver === "function" ? resolver(equipment) : null;
  if (fromEquipment) return fromEquipment;
  const manufacturer = getEquipmentManufacturer(equipment);
  return manufacturer || null;
}
export default function EquipmentBrandIcon({
  equipment,
  equipmentType,
  className,
  card = false
}) {
  const type = equipmentType || equipment?.type || "";
  const manufacturer = getEquipmentManufacturer(equipment);
  const size = card ? 24 : 16;
  if (type === "Firewalls") {
    return <FirewallBrandIcon brand={resolveBrandId(equipment, getEquipmentFirewallBrandId)} className={className} />;
  }
  if (type === "Routeur") {
    return <RouterBrandIcon brand={resolveBrandId(equipment, getEquipmentRouterBrandId)} className={className} />;
  }
  if (type === "Servers") {
    const serverType = normalizeServerType(equipment?.typeServer || equipment?.rawData?.type || equipment?.type || "");
    if (serverType === "virtuel") {
      return <Icon icon="mdi:cloud-outline" className={className} width={size} height={size} aria-hidden />;
    }
    return <ServerBrandIcon brand={resolveBrandId(equipment, getEquipmentServerBrandId)} className={className} />;
  }
  if (type === "Ordinateurs") {
    const brandId = resolveServerBrandId(manufacturer);
    if (brandId) {
      return <ServerBrandIcon brand={brandId} className={className} />;
    }
    return renderTypeFallback("Ordinateurs", className, size);
  }
  if (type === "Storage" || type === "NAS") {
    const brandId = resolveStorageBrandId(manufacturer);
    if (brandId) {
      return <StorageBrandIcon brand={brandId} className={className} />;
    }
    return <Icon icon={getStorageTypeIconName(equipment)} className={className} width={size} height={size} aria-hidden />;
  }
  if (type === "Switch") {
    return <SwitchBrandIcon brand={resolveFirewallBrandId(manufacturer) || manufacturer} className={className} />;
  }
  if (type === "BorneWifi") {
    return <WifiApBrandIcon brand={resolveFirewallBrandId(manufacturer) || manufacturer} className={className} />;
  }
  if (type === "TOIP") {
    return <ToipBrandIcon brand={resolveFirewallBrandId(manufacturer) || manufacturer} className={className} />;
  }
  if (type === "Alimentation") {
    return <AlimentationBrandIcon brand={resolveFirewallBrandId(manufacturer) || manufacturer} className={className} />;
  }
  if (type === "Internet") {
    return <Icon icon={getInternetConnectionIconName(equipment)} className={className} width={size} height={size} aria-hidden />;
  }
  if (type === "Backup") {
    const backupIcon = renderBackupSoftwareIcon(equipment?.name, className);
    if (backupIcon) return backupIcon;
    return renderTypeFallback("Backup", className, size);
  }
  return renderTypeFallback(type, className, size);
}
