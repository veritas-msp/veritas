import { normalizeServerRoles } from "./constants/serverRoleOptions";
import { readServerRemoteAccess } from "./constants/serverRemoteAccessUtils";
import { toDateInputValue } from "./constants/firewallLicenceUtils";
import { applyFirewallDeploymentTypeChange, applyRouterTypeChange } from "./constants/equipmentCatalog";
import { isInternetIpNonFixe } from "../RapportPage/monitoring/internetIpUtils";
import { getSiteLocationValue, normalizeClientSites } from "../../utils/clientSites";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { readInternetConnectionFields, buildInternetSectionNavMeta } from "./internetConnectionUtils";
import { buildBorneWifiSsidFormState } from "./wifiApSsidUtils";
export const ALIMENTATION_TYPE_OPTIONS = [{
  value: "Onduleur",
  label: "UPS (on-site)",
  icon: "mdi:power-plug",
  description: "Rack or tower UPS · offline, line-interactive or online"
}, {
  value: "PDU",
  label: "PDU (rack)",
  icon: "mdi:power-socket-eu",
  description: "Rack PDU strip · basic, metered, switched or managed"
}];
export const ROUTEUR_TYPE_OPTIONS = [{
  value: "Routeur",
  label: "Routeur",
  icon: "mdi:router-wireless",
  description: "Edge router, ISP box or appliance"
}, {
  value: "SD-WAN",
  label: "SD-WAN",
  icon: "mdi:wan",
  description: "SD-WAN overlay, orchestrator or cloud service"
}];
export const TOIP_TYPE_OPTIONS = [{
  value: "IP-PBX",
  label: "IP-PBX (on-prem / VM)",
  icon: "mdi:phone-in-talk",
  description: "Local or virtualized IP PBX (3CX, Yeastar, CUCM…)"
}, {
  value: "Passerelle",
  label: "Gateway (SIP trunk)",
  icon: "mdi:gate",
  description: "FXO/FXS gateway or SIP trunk to the carrier"
}, {
  value: "SBC",
  label: "SBC (SIP edge)",
  icon: "mdi:shield-key",
  description: "Session Border Controller at the edge of the VoIP network"
}, {
  value: "Phone IP",
  label: "Phone IP (poste)",
  icon: "mdi:deskphone",
  description: "Desktop phone, DECT, conference or softphone endpoint"
}, {
  value: "Autre",
  label: "Other",
  icon: "mdi:dots-horizontal",
  description: "VoIP equipment not listed"
}];
const TOIP_DEPLOYMENT_TYPE_VALUES = new Set(TOIP_TYPE_OPTIONS.map(option => option.value));
const ALIMENTATION_DEPLOYMENT_TYPE_VALUES = new Set(ALIMENTATION_TYPE_OPTIONS.map(option => option.value));
export function resolveToipDeploymentType(...candidates) {
  for (const value of candidates) {
    const trimmed = String(value ?? "").trim();
    if (TOIP_DEPLOYMENT_TYPE_VALUES.has(trimmed)) return trimmed;
  }
  return "";
}
export function resolveAlimentationDeploymentType(...candidates) {
  for (const value of candidates) {
    const trimmed = String(value ?? "").trim();
    if (ALIMENTATION_DEPLOYMENT_TYPE_VALUES.has(trimmed)) return trimmed;
  }
  return "";
}
export const INTERNET_TYPE_OPTIONS = ["Fibre", "ADSL", "SDSL", "VDSL", "4G", "5G", "Satellite", "Câble", "Radio", "SD-WAN", "Autre"];
export const INTERNET_CATEGORIE_OPTIONS = ["Primary", "Backup"];
export const OS_OPTION_GROUPS = [{
  label: "Windows Server",
  options: ["Windows Server 2012 R2 Standard", "Windows Server 2016 Standard", "Windows Server 2019 Standard", "Windows Server 2022 Standard", "Windows Server 2025 Standard"]
}, {
  label: "Windows client",
  options: ["Windows 10 Pro", "Windows 11 Pro"]
}, {
  label: "Linux · Ubuntu",
  options: ["Ubuntu Server 20.04 LTS", "Ubuntu Server 22.04 LTS", "Ubuntu Server 24.04 LTS"]
}, {
  label: "Linux · Debian",
  options: ["Debian 11 (Bullseye)", "Debian 12 (Bookworm)"]
}, {
  label: "Other",
  options: ["Autre"]
}];
export const OS_OPTIONS = OS_OPTION_GROUPS.flatMap(group => group.options);
export const RAID_OPTIONS = ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "RAID 10", "None", "Autre"];
export const SERVER_TYPE_OPTIONS = [{
  value: "physique",
  label: "Physical",
  icon: "mdi:server",
  description: "Bare-metal, blade or tower"
}, {
  value: "virtuel",
  label: "Virtual",
  icon: "mdi:cloud-outline",
  description: "Machine virtuelle on-prem ou cloud"
}];
export const SERVER_HYPERVISOR_OPTIONS = ["VMware ESXi", "Microsoft Hyper-V", "Proxmox VE", "Nutanix AHV", "KVM", "Xen", "Azure VM", "AWS EC2", "Autre"];
export function normalizeServerType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["physique", "physical", "hardware", "bare-metal", "baremetal"].includes(normalized)) {
    return "physique";
  }
  if (["virtuel", "virtual", "vm", "vms"].includes(normalized)) return "virtuel";
  return normalized;
}
export function getServerTypeLabel(value) {
  const key = normalizeServerType(value);
  return SERVER_TYPE_OPTIONS.find(option => option.value === key)?.label || value || "";
}
export const FIREWALL_TYPE_OPTIONS = [{
  value: "materiel",
  label: "Hardware",
  icon: "mdi:shield-outline",
  description: "Appliance physique (FortiGate, Stormshield…)"
}, {
  value: "virtuel",
  label: "Virtual",
  icon: "mdi:cloud-outline",
  description: "Machine virtuelle (FortiGate VM, vSN…)"
}, {
  value: "cloud",
  label: "Cloud",
  icon: "mdi:cloud-lock-outline",
  description: "FWaaS / managed cloud firewall"
}, {
  value: "logiciel",
  label: "Logiciel",
  icon: "mdi:application-outline",
  description: "Software firewall (pfSense, OPNsense, DynFi…)"
}, {
  value: "autre",
  label: "Other",
  icon: "mdi:dots-horizontal",
  description: "Other deployment mode"
}];
export function normalizeFirewallType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["materiel", "hardware", "physique", "hardware", "appliance"].includes(normalized)) return "materiel";
  if (["virtuel", "virtual", "vm", "vfw"].includes(normalized)) return "virtuel";
  if (["cloud", "fwaas", "saas"].includes(normalized)) return "cloud";
  if (["logiciel", "software", "lpe"].includes(normalized)) return "logiciel";
  if (normalized === "autre") return "autre";
  return normalized;
}
export function getFirewallTypeLabel(value) {
  const key = normalizeFirewallType(value);
  return FIREWALL_TYPE_OPTIONS.find(option => option.value === key)?.label || value || "";
}
const FIREWALL_FORM_PROFILES = {
  materiel: {
    sectionIds: new Set(["identity", "hardware", "network", "ha", "licences", "notes"]),
    showModel: true,
    showSerial: true,
    showFirmware: true,
    showWarranty: true,
    showHa: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model, serial number and warranty",
    modelLabel: "Model",
    modelPlaceholder: "FortiGate 60F",
    firmwareLabel: "Firmware",
    firmwarePlaceholder: "4.8.1",
    adminUrlPlaceholder: "https://192.168.10.1:10443"
  },
  virtuel: {
    sectionIds: new Set(["identity", "hardware", "network", "ha", "licences", "notes"]),
    showModel: true,
    showSerial: false,
    showFirmware: true,
    showWarranty: false,
    showHa: true,
    hardwareLabel: "VM / Virtual appliance",
    hardwareDescription: "VM brand, model, and firmware version",
    modelLabel: "Model VM",
    modelPlaceholder: "FortiGate-VM64",
    firmwareLabel: "Firmware",
    firmwarePlaceholder: "7.4.3",
    adminUrlPlaceholder: "https://192.168.10.1:10443"
  },
  cloud: {
    sectionIds: new Set(["identity", "hardware", "network", "licences", "notes"]),
    showModel: true,
    showSerial: false,
    showFirmware: false,
    showWarranty: false,
    showHa: false,
    hardwareLabel: "Platform",
    hardwareDescription: "Cloud provider and subscribed offer",
    modelLabel: "Offer / Service",
    modelPlaceholder: "Prisma Access",
    firmwareLabel: "Firmware",
    firmwarePlaceholder: "",
    adminUrlPlaceholder: "https://admin.cloudprovider.com"
  },
  logiciel: {
    sectionIds: new Set(["identity", "hardware", "network", "ha", "licences", "notes"]),
    showModel: true,
    showSerial: false,
    showFirmware: true,
    showWarranty: false,
    showHa: true,
    hardwareLabel: "Logiciel",
    hardwareDescription: "Installed distribution and version",
    modelLabel: "Distribution",
    modelPlaceholder: "pfSense CE",
    firmwareLabel: "Version",
    firmwarePlaceholder: "2.7.2",
    adminUrlPlaceholder: "https://192.168.10.1"
  },
  autre: {
    sectionIds: new Set(["identity", "hardware", "network", "ha", "licences", "notes"]),
    showModel: true,
    showSerial: true,
    showFirmware: true,
    showWarranty: true,
    showHa: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model and specifications",
    modelLabel: "Model",
    modelPlaceholder: "FortiGate 60F",
    firmwareLabel: "Firmware",
    firmwarePlaceholder: "4.8.1",
    adminUrlPlaceholder: "https://192.168.10.1:10443"
  }
};
export function getFirewallFormProfile(deploymentType) {
  const key = normalizeFirewallType(deploymentType) || "materiel";
  return FIREWALL_FORM_PROFILES[key] || FIREWALL_FORM_PROFILES.materiel;
}
export function applyFirewallTypeChange(prev, nextType) {
  let next = applyFirewallDeploymentTypeChange(prev, nextType);
  const profile = getFirewallFormProfile(nextType);
  if (!profile.showSerial) next = {
    ...next,
    serial: ""
  };
  if (!profile.showFirmware) next = {
    ...next,
    firmware: ""
  };
  if (!profile.showWarranty) next = {
    ...next,
    expirationGarantie: ""
  };
  if (!profile.showHa) {
    next = {
      ...next,
      modeHA: false,
      roleHA: "",
      firewallHAName: "",
      firewallHA: null
    };
  }
  return next;
}
export function normalizeRouteurType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "routeur" || normalized === "router") return "Routeur";
  if (["sd-wan", "sdwan", "sd wan", "overlay"].includes(normalized)) return "SD-WAN";
  if (value === "Routeur" || value === "SD-WAN") return value;
  return normalized;
}
export function getRouteurTypeLabel(value) {
  const key = normalizeRouteurType(value);
  return ROUTEUR_TYPE_OPTIONS.find(option => option.value === key)?.label || value || "";
}
const ROUTER_FORM_PROFILES = {
  Routeur: {
    sectionIds: new Set(["identity", "hardware", "network", "notes"]),
    showModel: true,
    showSerial: true,
    showFirmware: true,
    showMac: true,
    showWarranty: true,
    showAdminUrl: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model, serial number and warranty",
    modelLabel: "Model",
    modelPlaceholder: "ISR 4331",
    firmwareLabel: "Firmware",
    firmwarePlaceholder: "17.9.4",
    adminUrlPlaceholder: "https://192.168.1.1"
  },
  "SD-WAN": {
    sectionIds: new Set(["identity", "hardware", "network", "notes"]),
    showModel: true,
    showSerial: false,
    showFirmware: false,
    showMac: false,
    showWarranty: false,
    showAdminUrl: true,
    hardwareLabel: "Plateforme SD-WAN",
    hardwareDescription: "Fournisseur et offre souscrite",
    modelLabel: "Offre / Service",
    modelPlaceholder: "Prisma SD-WAN",
    firmwareLabel: "Firmware",
    firmwarePlaceholder: "",
    adminUrlPlaceholder: "https://admin.sdwan.example.com"
  }
};
export function getRouterFormProfile(routeurType) {
  const key = normalizeRouteurType(routeurType) || "Routeur";
  return ROUTER_FORM_PROFILES[key] || ROUTER_FORM_PROFILES.Routeur;
}
export function applyRouteurTypeChange(prev, nextType) {
  let next = applyRouterTypeChange(prev, nextType);
  const profile = getRouterFormProfile(nextType);
  if (!profile.showSerial) next = {
    ...next,
    serial: ""
  };
  if (!profile.showFirmware) next = {
    ...next,
    firmware: ""
  };
  if (!profile.showWarranty) next = {
    ...next,
    expirationGarantie: ""
  };
  if (!profile.showMac) next = {
    ...next,
    adresseMac: ""
  };
  return next;
}
export function getAlimentationFormProfile(alimentationType) {
  const isPdu = String(alimentationType || "UPS").trim() === "PDU";
  return {
    isPdu,
    isUps: !isPdu,
    showCapaciteVA: true,
    showCapaciteW: !isPdu,
    showNbPrises: isPdu,
    showBatteryDate: !isPdu,
    showFirmware: true,
    showWarranty: true,
    modelPlaceholder: isPdu ? "AP8941" : "Smart-UPS 1500",
    managementLabel: isPdu ? "PDU manageable" : "Manageable UPS",
    managementHint: isPdu ? "PDU with web or SNMP interface for outlet and power monitoring." : "UPS with network card or web monitoring interface.",
    adminUrlPlaceholder: isPdu ? "https://192.168.1.50 ou https://pdu.example.com" : "https://192.168.1.51 ou interface NMC/APC"
  };
}
export function applyAlimentationTypeChange(prev, nextType) {
  return {
    ...prev,
    alimentationType: nextType,
    manufacturer: "",
    model: ""
  };
}
export function isToipVoipSectionVisible(toipType) {
  const type = resolveToipDeploymentType(toipType);
  if (!type || type === "Phone IP") return false;
  return type === "IP-PBX" || type === "Passerelle" || type === "SBC" || type === "Autre";
}
export function getToipFormProfile(toipType) {
  const type = resolveToipDeploymentType(toipType);
  const isPbx = type === "IP-PBX";
  const isGateway = type === "Passerelle";
  const isSbc = type === "SBC";
  const isPhone = type === "Phone IP";
  const isOther = type === "Autre";
  return {
    isPbx,
    isGateway,
    isSbc,
    isPhone,
    isOther,
    showExtensions: isPbx || isGateway || isSbc || isOther,
    showDomainSip: isPbx || isGateway || isSbc || isOther,
    showManagement: isPbx || isGateway || isSbc,
    showFirmware: true,
    extensionsLabel: isPbx ? "Nombre d'extensions" : "Nombre de lignes / canaux",
    extensionsPlaceholder: isPbx ? "48" : "8",
    firmwareLabel: isPhone ? "Firmware" : "Version logiciel",
    firmwarePlaceholder: isPhone ? "126.96.36.199" : "20.0 Update 1",
    managementLabel: isPbx ? "IP-PBX manageable" : isSbc ? "SBC manageable" : "Equipment manageable",
    managementHint: "Console web ou interface d'administration de la solution VoIP.",
    adminUrlPlaceholder: isPbx ? "https://pbx.exemple.fr:5001 ou https://3cx.example.com" : "https://192.168.1.60",
    modelPlaceholder: isPhone ? "T46U" : isPbx ? "P-Series" : isSbc ? "Mediant VE" : "TA400"
  };
}
export function applyToipTypeChange(prev, nextType) {
  return {
    ...prev,
    toipType: nextType,
    manufacturer: "",
    model: "",
    nombreExtensions: "",
    domaineSip: ""
  };
}
const SERVER_FORM_PROFILES = {
  physique: {
    sectionIds: new Set(["identity", "network", "hardware", "system", "remote", "notes"]),
    showHardware: true,
    showSerial: true,
    showWarranty: true,
    showHypervisor: false,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model, serial number and warranty",
    modelPlaceholder: "ProLiant DL360 Gen11",
    systemLabel: "System",
    systemDescription: "OS, CPU, RAM, storage et roles",
    cpuLabel: "Processeur",
    cpuPlaceholder: "2 × Xeon Silver 4314",
    ramPlaceholder: "64 Go",
    storagePlaceholder: "2 × 480 Go SSD + 4 × 1,92 To SSD",
    namePlaceholder: "SRV-AD-01"
  },
  virtuel: {
    sectionIds: new Set(["identity", "network", "system", "remote", "notes"]),
    showHardware: false,
    showSerial: false,
    showWarranty: false,
    showHypervisor: true,
    systemLabel: "Ressources VM",
    systemDescription: "Hyperviseur, vCPU, RAM et OS",
    cpuLabel: "vCPU",
    cpuPlaceholder: "4 vCPU",
    ramPlaceholder: "16 Go",
    storagePlaceholder: "120 Go SSD",
    namePlaceholder: "VM-APP-01"
  }
};
export function getServerFormProfile(serverType) {
  const key = normalizeServerType(serverType) || "virtuel";
  return SERVER_FORM_PROFILES[key] || SERVER_FORM_PROFILES.virtuel;
}
export function applyServerTypeChange(prev, nextType) {
  const type = normalizeServerType(nextType) || nextType;
  const profile = getServerFormProfile(type);
  let next = {
    ...prev,
    typeServer: type
  };
  if (!profile.showHardware) {
    next = {
      ...next,
      manufacturer: "",
      model: "",
      serial: "",
      expirationGarantie: ""
    };
  }
  if (!profile.showHypervisor) {
    next = {
      ...next,
      hypervisor: ""
    };
  }
  return next;
}
export const STORAGE_TYPE_OPTIONS = [{
  value: "nas",
  label: "NAS",
  icon: "mdi:nas",
  description: "Appliance NAS (Synology, QNAP…)"
}, {
  value: "san",
  label: "SAN",
  icon: "mdi:server-network-outline",
  description: "Baie SAN ou appliance block storage"
}, {
  value: "virtuel",
  label: "Virtual",
  icon: "mdi:cloud-outline",
  description: "Virtual storage, vSAN or dedicated VM"
}, {
  value: "cloud",
  label: "Cloud",
  icon: "mdi:cloud-lock-outline",
  description: "Managed cloud storage (Azure, AWS…)"
}, {
  value: "robot",
  label: "Backup robot",
  icon: "mdi:backup-restore",
  description: "Robot de bandes ou librairie RDX"
}, {
  value: "externe",
  label: "Disque externe",
  icon: "mdi:harddisk",
  description: "Disque USB ou rotation externe"
}];
export function normalizeStorageType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "nas") return "nas";
  if (lower === "san") return "san";
  if (["virtuel", "virtual", "vm", "stockage virtuel"].includes(lower)) return "virtuel";
  if (["cloud", "stockage cloud"].includes(lower)) return "cloud";
  if (lower.includes("robot")) return "robot";
  if (lower.includes("disque") || lower.includes("externe")) return "externe";
  if (raw === "NAS") return "nas";
  if (raw === "SAN") return "san";
  if (raw === "Robot de sauvegarde") return "robot";
  if (raw === "Disque dur externe") return "externe";
  if (raw === "Virtual storage") return "virtuel";
  if (raw === "Cloud storage") return "cloud";
  return lower;
}
export function storageTypeToLegacyType(storageType) {
  const key = normalizeStorageType(storageType);
  const map = {
    nas: "NAS",
    san: "SAN",
    virtuel: "Virtual storage",
    cloud: "Cloud storage",
    robot: "Robot de sauvegarde",
    externe: "Disque dur externe"
  };
  return map[key] || "NAS";
}
export function getStorageTypeLabel(value) {
  const key = normalizeStorageType(value);
  return STORAGE_TYPE_OPTIONS.find(option => option.value === key)?.label || value || "";
}
const STORAGE_FORM_PROFILES = {
  nas: {
    sectionIds: new Set(["identity", "network", "hardware", "storage", "notes"]),
    showHardware: true,
    showSerial: true,
    showWarranty: true,
    showNetwork: true,
    showRaid: true,
    showDisques: true,
    showRole: true,
    showQuickConnect: true,
    showCapacite: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model, serial number and warranty",
    modelPlaceholder: "DS923+",
    namePlaceholder: "NAS-Backup"
  },
  san: {
    sectionIds: new Set(["identity", "network", "hardware", "storage", "notes"]),
    showHardware: true,
    showSerial: true,
    showWarranty: true,
    showNetwork: true,
    showRaid: true,
    showDisques: true,
    showRole: true,
    showQuickConnect: false,
    showCapacite: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model, serial number and warranty",
    modelPlaceholder: "PowerStore 500T",
    namePlaceholder: "SAN-Prod-01"
  },
  virtuel: {
    sectionIds: new Set(["identity", "network", "hardware", "storage", "notes"]),
    showHardware: true,
    showSerial: false,
    showWarranty: false,
    showNetwork: true,
    showRaid: true,
    showDisques: true,
    showRole: true,
    showQuickConnect: false,
    showCapacite: true,
    hardwareLabel: "Plateforme",
    hardwareDescription: "Hyperviseur, appliance virtuelle ou service",
    modelPlaceholder: "TrueNAS Scale VM",
    namePlaceholder: "VM-STORAGE-01"
  },
  cloud: {
    sectionIds: new Set(["identity", "hardware", "storage", "notes"]),
    showHardware: true,
    showSerial: false,
    showWarranty: false,
    showNetwork: false,
    showRaid: false,
    showDisques: false,
    showRole: true,
    showQuickConnect: false,
    showCapacite: true,
    hardwareLabel: "Fournisseur cloud",
    hardwareDescription: "Service et ressource cloud",
    modelPlaceholder: "Azure Files Premium",
    namePlaceholder: "CLOUD-BACKUP"
  },
  robot: {
    sectionIds: new Set(["identity", "network", "hardware", "storage", "notes"]),
    showHardware: true,
    showSerial: true,
    showWarranty: true,
    showNetwork: true,
    showRaid: false,
    showDisques: false,
    showRole: true,
    showQuickConnect: false,
    showCapacite: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand, model, serial number and warranty",
    modelPlaceholder: "Scalar i3",
    namePlaceholder: "ROBOT-BACKUP"
  },
  externe: {
    sectionIds: new Set(["identity", "hardware", "storage", "notes"]),
    showHardware: true,
    showSerial: false,
    showWarranty: false,
    showNetwork: false,
    showRaid: false,
    showDisques: false,
    showRole: true,
    showQuickConnect: false,
    showCapacite: true,
    showNumeroDisque: true,
    hardwareLabel: "Hardware",
    hardwareDescription: "Brand et model du device",
    modelPlaceholder: "Expansion Desktop 8 To",
    namePlaceholder: "DD-Externe-01"
  }
};
export function getStorageFormProfile(storageType) {
  const key = normalizeStorageType(storageType) || "nas";
  return STORAGE_FORM_PROFILES[key] || STORAGE_FORM_PROFILES.nas;
}
export function applyStorageTypeChange(prev, nextType) {
  const type = normalizeStorageType(nextType) || nextType;
  const profile = getStorageFormProfile(type);
  let next = {
    ...prev,
    storageType: type,
    type: storageTypeToLegacyType(type)
  };
  if (!profile.showHardware) {
    next = {
      ...next,
      manufacturer: "",
      model: "",
      serial: "",
      expirationGarantie: ""
    };
  }
  if (!profile.showQuickConnect) {
    next = {
      ...next,
      quickConnect: ""
    };
  }
  if (!profile.showNumeroDisque) {
    next = {
      ...next,
      numeroDisque: ""
    };
  }
  return next;
}
const SECTION_IDENTITY = {
  id: "identity",
  label: "Identity",
  icon: "mdi:tag-text-outline",
  description: "Name and site"
};
const SECTION_NETWORK = {
  id: "network",
  label: "Network",
  icon: "mdi:lan",
  description: "IP address and VLAN"
};
const SECTION_CONNECTION = {
  id: "connection",
  label: "Connection",
  icon: "mdi:wan",
  description: "Provider, bandwidth, IP and contract"
};
const SECTION_INTERNET_TYPE = {
  id: "internetType",
  label: "Type",
  icon: "mdi:transmission-tower",
  description: "Technologie d'access"
};
const SECTION_INTERNET_LINK = {
  id: "internetLink",
  label: "Liaison",
  icon: "mdi:handshake-outline",
  description: "Site, provider and bandwidth"
};
const SECTION_INTERNET_NETWORK = {
  id: "internetNetwork",
  label: "Network",
  icon: "mdi:ip-network-outline",
  description: "IP publique et passerelle"
};
const SECTION_INTERNET_CONTRACT = {
  id: "internetContract",
  label: "Contrat",
  icon: "mdi:file-document-outline",
  description: "References and support"
};
const SECTION_INTERNET_NOTES = {
  id: "internetNotes",
  label: "Notes",
  icon: "mdi:note-text-outline",
  description: "Additional information"
};
export const INTERNET_DRAFT_FORM_SECTIONS = [SECTION_INTERNET_TYPE, SECTION_INTERNET_LINK, SECTION_INTERNET_NETWORK, SECTION_INTERNET_CONTRACT, SECTION_INTERNET_NOTES];
const SECTION_HARDWARE = {
  id: "hardware",
  label: "Hardware",
  icon: "mdi:server-outline",
  description: "Brand, model and serial number"
};
const SECTION_SYSTEM = {
  id: "system",
  label: "System",
  icon: "mdi:microsoft-windows",
  description: "OS, resources and roles"
};
const SECTION_STORAGE = {
  id: "storage",
  label: "Storage",
  icon: "mdi:database-outline",
  description: "RAID, capacity and disks"
};
const SECTION_HA = {
  id: "ha",
  label: "High availability",
  icon: "mdi:shield-sync-outline",
  description: "Firewall cluster and HA peer"
};
const SECTION_LICENCES = {
  id: "licences",
  label: "Licenses",
  icon: "mdi:license",
  description: "Licenses and expiration dates"
};
const SECTION_MAINTENANCE = {
  id: "maintenance",
  label: "Maintenance",
  icon: "mdi:calendar-clock-outline",
  description: "Warranty and licenses"
};
const SECTION_NOTES = {
  id: "notes",
  label: "Notes",
  icon: "mdi:note-text-outline",
  description: "Access, procedures et useful information"
};
const SECTION_REMOTE = {
  id: "remote",
  label: "Prise en main",
  icon: "mdi:remote-desktop",
  description: "Remote solution and connection ID"
};
const SECTION_MANAGEMENT = {
  id: "management",
  label: "Gestion",
  icon: "mdi:cog-outline",
  description: "Manageability and admin interface"
};
const SECTION_WIFI = {
  id: "wifi",
  label: "WiFi",
  icon: "mdi:wifi",
  description: "Broadcast SSIDs and radio settings"
};
const SECTION_POWER = {
  id: "power",
  label: "Puissance",
  icon: "mdi:flash",
  description: "Capacity, outlets and battery"
};
const SECTION_VOIP = {
  id: "voip",
  label: "Telephony",
  icon: "mdi:phone-voip",
  description: "Extensions, domaine SIP et version logicielle"
};
export const EQUIPMENT_FORM_SECTIONS_BY_MODULE = {
  Internet: [SECTION_IDENTITY, SECTION_INTERNET_TYPE, SECTION_INTERNET_LINK, SECTION_INTERNET_NETWORK, SECTION_INTERNET_CONTRACT, SECTION_INTERNET_NOTES],
  Firewalls: [{
    ...SECTION_IDENTITY,
    description: "Name, site and deployment type"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model, serial and warranty"
  }, {
    ...SECTION_NETWORK,
    description: "IP, VLAN and admin URL"
  }, SECTION_HA, SECTION_LICENCES, SECTION_NOTES],
  Servers: [{
    ...SECTION_IDENTITY,
    description: "Name, site and type (Physical / Virtual)"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model, serial number and warranty"
  }, {
    ...SECTION_NETWORK,
    description: "IP address and VLAN"
  }, {
    ...SECTION_SYSTEM,
    description: "OS, resources and roles"
  }, SECTION_REMOTE, SECTION_NOTES],
  Storage: [{
    ...SECTION_IDENTITY,
    description: "Name, site and storage type"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model et serial number"
  }, {
    ...SECTION_NETWORK,
    description: "IP address and VLAN"
  }, {
    ...SECTION_STORAGE,
    description: "Role, RAID, capacity and disks"
  }, SECTION_NOTES],
  Switch: [{
    ...SECTION_IDENTITY,
    description: "Name and site"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model, firmware and specifications"
  }, {
    ...SECTION_NETWORK,
    description: "IP address, VLAN and MAC"
  }, {
    ...SECTION_MANAGEMENT,
    description: "Manageability and admin interface"
  }, SECTION_NOTES],
  BorneWifi: [{
    ...SECTION_IDENTITY,
    description: "Name and site"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model, serial number and firmware"
  }, {
    ...SECTION_NETWORK,
    description: "IP address, VLAN and MAC"
  }, {
    ...SECTION_WIFI,
    description: "SSIDs broadcast by the access point"
  }, SECTION_NOTES],
  Alimentation: [{
    ...SECTION_IDENTITY,
    description: "Name, site and deployment type (UPS / PDU)"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model, serial number, firmware et warranty"
  }, {
    ...SECTION_POWER,
    description: "Capacity, outlets and battery"
  }, {
    ...SECTION_NETWORK,
    description: "IP address, VLAN and MAC"
  }, {
    ...SECTION_MANAGEMENT,
    description: "Network management and web interface"
  }, SECTION_NOTES],
  Routeur: [{
    ...SECTION_IDENTITY,
    description: "Name, site and type (Router / SD-WAN)"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model and specifications"
  }, {
    ...SECTION_NETWORK,
    description: "IP, VLAN and admin URL"
  }, SECTION_NOTES],
  TOIP: [{
    ...SECTION_IDENTITY,
    description: "Name, site and VoIP deployment type"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model, serial number and firmware"
  }, {
    ...SECTION_VOIP,
    description: "Extensions, domaine SIP et version"
  }, {
    ...SECTION_NETWORK,
    description: "IP address, VLAN and MAC"
  }, {
    ...SECTION_MANAGEMENT,
    description: "Administration and monitoring console"
  }, SECTION_NOTES],
  Ordinateurs: [{
    ...SECTION_IDENTITY,
    description: "Nom Veritas et lieu du poste"
  }, {
    ...SECTION_HARDWARE,
    description: "Brand, model and serial number (recommended to link the RMM agent)"
  }, {
    ...SECTION_NETWORK,
    description: "IP address, VLAN and MAC (recommended to link the RMM agent)"
  }, {
    ...SECTION_SYSTEM,
    description: "Operating system, domain and resources"
  }, SECTION_NOTES]
};
export const EQUIPMENT_MODULE_LABELS = {
  Internet: "Internet",
  Firewalls: "Firewall",
  Servers: "Server",
  Storage: "Storage",
  Switch: "Switch",
  BorneWifi: "Borne WiFi",
  Alimentation: "Alimentation",
  Routeur: "Router / SD-WAN",
  TOIP: "TOIP / VOIP",
  Ordinateurs: "Ordinateur"
};
export const EQUIPMENT_MODULE_ICONS = {
  Internet: "mdi:web",
  Firewalls: "mdi:shield-outline",
  Servers: "mdi:server",
  Storage: "mdi:database-outline",
  Switch: "mdi:lan-connect",
  BorneWifi: "mdi:wifi",
  Alimentation: "mdi:power-plug",
  Routeur: "mdi:router-wireless",
  TOIP: "mdi:phone-voip",
  Ordinateurs: "mdi:laptop"
};
const EQUIPMENT_NAME_PLACEHOLDERS = {
  Internet: "INT-Primary-HQ",
  Firewalls: "FW-HQ-Bordeaux",
  Servers: "SRV-AD-01",
  NAS: "NAS-Backup",
  Switch: "SW-Core-BA",
  BorneWifi: "AP-RDC",
  Alimentation: "PDU-Baie-A",
  Routeur: "RT-HQ",
  TOIP: "PBX-HQ",
  Ordinateurs: "PC-COMPTA-01"
};
export const EQUIPMENT_SERIAL_PLACEHOLDER = "ABC123456789";
export function getEquipmentNamePlaceholder(apiType, {
  routeurType,
  serverType,
  storageType
} = {}) {
  if (apiType === "Routeur" && normalizeRouteurType(routeurType) === "SD-WAN") {
    return "SDWAN-HQ";
  }
  if (apiType === "Servers") {
    return getServerFormProfile(serverType).namePlaceholder || EQUIPMENT_NAME_PLACEHOLDERS.Servers;
  }
  if (apiType === "NAS") {
    return getStorageFormProfile(storageType).namePlaceholder || EQUIPMENT_NAME_PLACEHOLDERS.NAS;
  }
  return EQUIPMENT_NAME_PLACEHOLDERS[apiType] || "Equipment name";
}
export function getEquipmentFormSections(moduleKey, {
  firewallType,
  routeurType,
  serverType,
  storageType,
  toipType
} = {}) {
  const base = EQUIPMENT_FORM_SECTIONS_BY_MODULE[moduleKey] || [SECTION_IDENTITY, SECTION_NETWORK];
  if (moduleKey === "Firewalls") {
    const profile = getFirewallFormProfile(firewallType);
    return base.filter(section => profile.sectionIds.has(section.id)).map(section => {
      if (section.id !== "hardware") return section;
      return {
        ...section,
        label: profile.hardwareLabel,
        description: profile.hardwareDescription
      };
    });
  }
  if (moduleKey === "Routeur") {
    const profile = getRouterFormProfile(routeurType);
    return base.filter(section => profile.sectionIds.has(section.id)).map(section => {
      if (section.id !== "hardware") return section;
      return {
        ...section,
        label: profile.hardwareLabel,
        description: profile.hardwareDescription
      };
    });
  }
  if (moduleKey === "Servers") {
    const profile = getServerFormProfile(serverType);
    return base.filter(section => profile.sectionIds.has(section.id)).map(section => {
      if (section.id === "hardware") {
        return {
          ...section,
          label: profile.hardwareLabel,
          description: profile.hardwareDescription
        };
      }
      if (section.id === "system") {
        return {
          ...section,
          label: profile.systemLabel,
          description: profile.systemDescription
        };
      }
      return section;
    });
  }
  if (moduleKey === "Storage") {
    const profile = getStorageFormProfile(storageType);
    return base.filter(section => profile.sectionIds.has(section.id)).map(section => {
      if (section.id === "hardware") {
        return {
          ...section,
          label: profile.hardwareLabel,
          description: profile.hardwareDescription
        };
      }
      return section;
    });
  }
  if (moduleKey === "TOIP") {
    const profile = getToipFormProfile(toipType);
    const showVoip = isToipVoipSectionVisible(toipType);
    return base.filter(section => {
      if (section.id === "management" && !profile.showManagement) return false;
      if (section.id === "voip" && !showVoip) return false;
      return true;
    });
  }
  return base;
}
export function extractEquipmentSite(equipment) {
  if (!equipment) return "";
  const normalize = value => {
    if (value == null) return "";
    const trimmed = String(value).trim();
    return trimmed && trimmed !== "Sans site" ? trimmed : "";
  };
  const layers = [equipment, equipment.data && typeof equipment.data === "object" ? equipment.data : null, equipment.rawData && typeof equipment.rawData === "object" ? equipment.rawData : null, equipment.rawData?.data && typeof equipment.rawData.data === "object" ? equipment.rawData.data : null].filter(Boolean);
  for (const layer of layers) {
    for (const key of ["site", "location", "emplacement"]) {
      const found = normalize(layer[key]);
      if (found) return found;
    }
  }
  return "";
}
export function patchEquipmentLocation(equipment, location) {
  if (!equipment || location === undefined) return equipment;
  const trimmed = String(location || "").trim();
  const raw = {
    ...(equipment.rawData || {})
  };
  raw.site = trimmed;
  raw.location = trimmed;
  raw.emplacement = trimmed;
  return {
    ...equipment,
    location: trimmed,
    rawData: raw
  };
}
function collectSitesFromEquipements(equipements) {
  const sites = new Set();
  if (!equipements || typeof equipements !== "object") return sites;
  const visit = item => {
    const site = extractEquipmentSite(item);
    if (site) sites.add(site);
  };
  Object.values(equipements).forEach(bucket => {
    if (Array.isArray(bucket)) {
      bucket.forEach(visit);
      return;
    }
    if (bucket && typeof bucket === "object") {
      if (Array.isArray(bucket.instances)) bucket.instances.forEach(visit);
      if (Array.isArray(bucket.solutions)) bucket.solutions.forEach(visit);
    }
  });
  return sites;
}
export function buildAvailableSites(client, equipment) {
  const sites = collectSitesFromEquipements(client?.equipements);
  normalizeClientSites(client?.sites).forEach(site => {
    const value = getSiteLocationValue(site);
    if (value) sites.add(value);
  });
  const currentSite = extractEquipmentSite(equipment);
  if (currentSite) sites.add(currentSite);
  return Array.from(sites).sort((a, b) => a.localeCompare(b, "fr"));
}
function readEquipmentBool(equipment, key) {
  const layers = [equipment, equipment?.data, equipment?.rawData, equipment?.rawData?.data].filter(layer => layer && typeof layer === "object");
  for (const layer of layers) {
    if (layer[key] !== undefined && layer[key] !== null) return !!layer[key];
  }
  return false;
}
function readEquipmentText(equipment, key, fallback = "") {
  const layers = [equipment, equipment?.data, equipment?.rawData, equipment?.rawData?.data].filter(layer => layer && typeof layer === "object");
  for (const layer of layers) {
    const value = layer[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}
export function getFirewallDisplayName(fw) {
  return (fw?.nom || fw?.name || fw?.data?.nom || fw?.data?.name || "").trim();
}
function readFirewallHaPartnerName(fw) {
  return String(fw?.firewallHAName || fw?.data?.firewallHAName || fw?.rawData?.firewallHAName || fw?.rawData?.data?.firewallHAName || "").trim();
}
function isSameFirewallEquipment(a, b) {
  if (!a || !b) return false;
  const idA = a.id ?? a.rawData?.id;
  const idB = b.id ?? b.rawData?.id;
  if (idA != null && idB != null && String(idA) === String(idB)) return true;
  const nameA = getFirewallDisplayName(a);
  const nameB = getFirewallDisplayName(b);
  return Boolean(nameA && nameB && nameA.toLowerCase() === nameB.toLowerCase());
}
function findFirewallByName(catalog, partnerName, {
  exclude
} = {}) {
  const trimmed = String(partnerName || "").trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return catalog.find(fw => {
    if (exclude && isSameFirewallEquipment(fw, exclude)) return false;
    const name = getFirewallDisplayName(fw);
    return name === trimmed || name.toLowerCase() === lower;
  }) || null;
}
export function resolveFirewallHaPeer(equipment, peers = []) {
  const catalog = mergeFirewallPeerSources(peers);
  const partnerName = readFirewallHaPartnerName(equipment);
  if (partnerName) {
    const forward = findFirewallByName(catalog, partnerName, {
      exclude: equipment
    });
    if (forward) return forward;
  }
  const selfName = getFirewallDisplayName(equipment);
  if (!selfName) return null;
  return catalog.find(fw => {
    if (isSameFirewallEquipment(fw, equipment)) return false;
    const peerPartner = readFirewallHaPartnerName(fw);
    return peerPartner && peerPartner.toLowerCase() === selfName.toLowerCase();
  }) || null;
}
function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}
function isFirewallEngagedInHa(fw) {
  const layers = [fw, fw?.data, fw?.rawData, fw?.rawData?.data].filter(layer => layer && typeof layer === "object");
  for (const layer of layers) {
    if (isTruthyFlag(layer.modeHA)) return true;
    if (String(layer.firewallHAName || "").trim()) return true;
  }
  return false;
}
function mergeFirewallPeerSources(...sources) {
  const merged = new Map();
  sources.flat().forEach(fw => {
    if (!fw || typeof fw !== "object") return;
    const name = getFirewallDisplayName(fw);
    const id = fw.id != null ? String(fw.id) : fw.rawData?.id != null ? String(fw.rawData.id) : name || null;
    const key = id || name;
    if (!key) return;
    merged.set(key, fw);
  });
  return Array.from(merged.values());
}
export function getFirewallPartnerOptions(client, currentEquipment, {
  currentPartnerName = "",
  peerFirewalls = []
} = {}) {
  const currentId = currentEquipment?.id != null ? String(currentEquipment.id) : null;
  const currentRawId = currentEquipment?.rawData?.id != null ? String(currentEquipment.rawData.id) : null;
  const currentName = getFirewallDisplayName(currentEquipment);
  const keepPartnerName = String(currentPartnerName || "").trim();
  const firewalls = mergeFirewallPeerSources(Array.isArray(client?.equipements?.Firewalls) ? client.equipements.Firewalls : [], peerFirewalls);
  const options = new Map();
  firewalls.forEach(fw => {
    const id = fw?.id != null ? String(fw.id) : null;
    const rawId = fw?.rawData?.id != null ? String(fw.rawData.id) : null;
    if (id && currentId && id === currentId) return;
    if (rawId && currentId && rawId === currentId) return;
    if (rawId && currentRawId && rawId === currentRawId) return;
    if (id && currentRawId && id === currentRawId) return;
    const name = getFirewallDisplayName(fw);
    if (!name || currentName && name === currentName) return;
    if (isFirewallEngagedInHa(fw) && name !== keepPartnerName) return;
    options.set(name, name);
  });
  return Array.from(options.values()).sort((a, b) => a.localeCompare(b, "fr"));
}
export function buildInitialFormData(equipment, moduleKey, {
  client
} = {}) {
  const raw = equipment?.data || equipment?.rawData || equipment;
  if (!raw && !equipment) return {};
  const d = (key, def = "") => raw[key] ?? equipment?.[key] ?? def;
  const base = {
    name: d("nom", d("name", "")),
    location: extractEquipmentSite(equipment),
    ip: d("ip", "")
  };
  if (moduleKey === "Internet") {
    const ipFromData = d("ip", "");
    const ipNonFixe = isInternetIpNonFixe({
      ip: ipFromData,
      ipNonFixe: d("ipNonFixe", false)
    });
    const connection = readInternetConnectionFields({
      ...raw,
      type: d("type", d("internetType", "")),
      internetType: d("internetType", d("type", "")),
      ip: ipFromData,
      ipNonFixe
    });
    return {
      ...base,
      ip: ipNonFixe ? "" : ipFromData,
      internetType: connection.type,
      fournisseur: connection.fournisseur,
      debit: connection.debit,
      debitDownload: connection.debitDownload,
      debitUpload: connection.debitUpload,
      categorie: connection.categorie,
      ipNonFixe,
      numeroLigne: connection.numeroLigne,
      referenceContrat: connection.referenceContrat,
      supportTelephone: connection.supportTelephone,
      dateMiseEnService: connection.dateMiseEnService?.slice?.(0, 10) || connection.dateMiseEnService || "",
      boxModele: connection.boxModele,
      gateway: connection.gateway,
      commentaire: connection.commentaire
    };
  }
  if (moduleKey === "Firewalls" || moduleKey === "Firewall") {
    const licences = Array.isArray(raw.licences) ? raw.licences : Array.isArray(equipment?.licences) ? equipment.licences : [];
    return {
      ...base,
      firewallType: normalizeFirewallType(d("firewallType", d("type", equipment ? "" : "materiel"))),
      manufacturer: d("fabricant", d("marque", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      expirationGarantie: toDateInputValue(d("expirationGarantie", d("garantie", ""))),
      firmware: d("firmware", d("version", "")),
      vlan: d("vlan", ""),
      licences,
      modeHA: readEquipmentBool(equipment, "modeHA") || !!d("modeHA", false),
      roleHA: readEquipmentText(equipment, "roleHA", d("roleHA", "")),
      firewallHAName: readEquipmentText(equipment, "firewallHAName", d("firewallHAName", "")),
      stormshieldWanUrl: readEquipmentText(equipment, "stormshieldWanUrl", d("stormshieldWanUrl", "")),
      commentaire: d("commentaire", "")
    };
  }
  if (moduleKey === "Servers") {
    const serverType = normalizeServerType(d("type", d("typeServer", "")));
    const remoteAccess = readServerRemoteAccess({
      ...raw,
      ...equipment
    });
    return {
      ...base,
      vlan: d("vlan", ""),
      processeur: d("processeur", d("vcpu", d("vCpu", ""))),
      memoire: d("memoire", d("ram", "")),
      stockage: d("stockage", ""),
      systeme: d("systeme", d("os", "")),
      hypervisor: d("hypervisor", d("hyperviseur", "")),
      remoteAccessSolution: remoteAccess.solution,
      remoteAccessId: remoteAccess.id,
      typeServer: serverType || (equipment ? "" : "virtuel"),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      expirationGarantie: toDateInputValue(d("expirationGarantie", d("garantie", ""))),
      commentaire: d("commentaire", ""),
      role: normalizeServerRoles(raw.role ?? equipment?.role)
    };
  }
  if (moduleKey === "Routeur") {
    const readRouteurType = () => {
      const explicit = normalizeRouteurType(d("routeurType", ""));
      if (explicit) return explicit;
      const fromType = normalizeRouteurType(d("type", ""));
      if (fromType === "Routeur" || fromType === "SD-WAN") return fromType;
      return equipment ? "" : "Routeur";
    };
    return {
      ...base,
      routeurType: readRouteurType(),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      firmware: d("firmware", d("version", "")),
      adresseMac: d("adresseMac", d("mac", "")),
      vlan: d("vlan", ""),
      expirationGarantie: toDateInputValue(d("expirationGarantie", d("garantie", ""))),
      adminUrl: d("adminUrl", d("urlAdministration", "")),
      commentaire: d("commentaire", "")
    };
  }
  if (moduleKey === "Switch") {
    return {
      ...base,
      vlan: d("vlan", ""),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      firmware: d("firmware", d("version", "")),
      adresseMac: d("adresseMac", d("mac", "")),
      commentaire: d("commentaire", ""),
      manageable: Boolean(d("manageable", false)),
      adminUrl: d("adminUrl", d("urlAdministration", "")),
      poeSupport: Boolean(d("poeSupport", false)),
      empilage: Boolean(d("empilage", false))
    };
  }
  if (moduleKey === "BorneWifi") {
    const {
      clientSsids,
      assignedSsidIds
    } = buildBorneWifiSsidFormState(equipment, client);
    const rawSsids = d("ssids", []);
    return {
      ...base,
      vlan: d("vlan", ""),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      firmware: d("firmware", d("version", "")),
      adresseMac: d("adresseMac", d("mac", "")),
      commentaire: d("commentaire", ""),
      clientSsids,
      assignedSsidIds,
      ssids: Array.isArray(rawSsids) ? rawSsids : [],
      alimentationPoE: Boolean(d("alimentationPoE", d("poe", false)))
    };
  }
  if (moduleKey === "TOIP") {
    return {
      ...base,
      vlan: d("vlan", ""),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      firmware: d("firmware", d("version", "")),
      adresseMac: d("adresseMac", d("mac", "")),
      toipType: (() => {
        const resolved = resolveToipDeploymentType(d("toipType"), equipment?.toipType);
        if (resolved) return resolved;
        const hasPersistedIdentity = Boolean(equipment?.id || d("nom", d("name", "")).trim() || d("marque", d("fabricant", "")).trim());
        return hasPersistedIdentity ? "IP-PBX" : "";
      })(),
      nombreExtensions: d("nombreExtensions", d("nbExtensions", d("extensions", ""))),
      domaineSip: d("domaineSip", d("domaine", "")),
      manageable: Boolean(d("manageable", false)),
      adminUrl: d("adminUrl", d("urlAdministration", "")),
      commentaire: d("commentaire", "")
    };
  }
  if (moduleKey === "Alimentation") {
    return {
      ...base,
      vlan: d("vlan", ""),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      firmware: d("firmware", d("version", "")),
      adresseMac: d("adresseMac", d("mac", "")),
      alimentationType: resolveAlimentationDeploymentType(d("alimentationType"), d("type"), equipment?.alimentationType) || "UPS",
      capaciteVA: d("capaciteVA", d("capacite", "")),
      capaciteW: d("capaciteW", d("puissanceW", "")),
      nbPrises: d("nbPrises", d("nombrePrises", "")),
      dateBatterie: toDateInputValue(d("dateBatterie", "")),
      expirationGarantie: toDateInputValue(d("expirationGarantie", d("garantie", ""))),
      manageable: Boolean(d("manageable", false)),
      adminUrl: d("adminUrl", d("urlAdministration", "")),
      commentaire: d("commentaire", "")
    };
  }
  if (moduleKey === "Storage") {
    const legacyType = d("type", "NAS");
    const storageType = normalizeStorageType(legacyType) || (equipment ? "" : "nas");
    return {
      ...base,
      vlan: d("vlan", ""),
      manufacturer: d("marque", d("fabricant", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      quickConnect: d("quickConnect", ""),
      raid: d("raid", ""),
      capacite: d("capacite", ""),
      nbDisquesActuels: d("nbDisquesActuels", ""),
      nbDisquesMax: d("nbDisquesMax", ""),
      disques: Array.isArray(raw.disques) ? raw.disques : Array.isArray(d("disques")) ? d("disques") : [],
      numeroDisque: d("numeroDisque", ""),
      storageType,
      type: legacyType || storageTypeToLegacyType(storageType),
      role: typeof raw.role === "string" ? raw.role : Array.isArray(raw.role) ? raw.role[0] : "",
      expirationGarantie: toDateInputValue(d("expirationGarantie", d("garantie", ""))),
      commentaire: d("commentaire", "")
    };
  }
  if (moduleKey === "Ordinateurs") {
    return {
      ...base,
      netbios: d("netbios", d("hostname", "")),
      vlan: d("vlan", ""),
      manufacturer: d("fabricant", d("marque", d("manufacturer", ""))),
      model: d("modele", d("model", "")),
      serial: d("numeroSerie", d("sn", d("serial", ""))),
      systeme: d("systeme", d("os", "")),
      domaine: d("domaine", ""),
      mac: d("mac", d("adresseMac", "")),
      processeur: d("processeur", ""),
      memoire: d("memoire", ""),
      commentaire: d("commentaire", "")
    };
  }
  return base;
}
export function getApiType(moduleKey, equipment) {
  if (moduleKey === "Firewall") return "Firewalls";
  if (moduleKey === "Storage") return equipment?.type === "SAN" ? "NAS" : "NAS";
  return moduleKey;
}
export function buildEquipmentId(clientId, moduleKey, equipment) {
  if (equipment?.id != null) {
    const idStr = String(equipment.id);
    if (/^\d+$/.test(idStr) || /^[0-9a-f-]{36}$/i.test(idStr)) {
      return idStr;
    }
  }
  const apiType = getApiType(moduleKey, equipment);
  const name = (equipment?.nom || equipment?.name || equipment?.type || "").replace(/\s+/g, "-").slice(0, 50);
  const suffix = equipment?.numeroSerie || equipment?.serial || equipment?.adresseMac || equipment?.mac || "";
  if (suffix) return `${clientId}-${apiType}-${name}-${String(suffix).slice(0, 20)}`;
  return `${clientId}-${apiType}-${name}`;
}
export function buildEquipmentForUpdate(clientId, moduleKey, equipment) {
  const apiType = getApiType(moduleKey, equipment);
  const raw = equipment?.data || equipment?.rawData || equipment;
  const row = equipment?.rawData?.data && equipment?.rawData?.id != null ? equipment.rawData : null;
  return {
    clientId,
    type: apiType,
    id: getEquipmentDbId(equipment) || equipment?.id,
    dbId: getEquipmentDbId(equipment) || equipment?.dbId || null,
    rawData: row || raw || equipment,
    name: equipment?.nom || equipment?.name || ""
  };
}
export function cloneEquipmentFormSnapshot(form) {
  return JSON.parse(JSON.stringify(form || {}));
}
export function equipmentFormsEqual(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}
export function buildEquipmentSectionMeta(form, moduleKey, {
  isPhysicalServer = false,
  isAddMode = false
} = {}) {
  if (moduleKey === "Internet") {
    return buildInternetSectionNavMeta(form, {
      isAddMode,
      includeIdentity: true
    }).complete;
  }
  const meta = {
    identity: Boolean(form?.name?.trim()),
    network: Boolean(form?.ip?.trim() || form?.vlan?.trim()),
    connection: false,
    hardware: Boolean(form?.manufacturer?.trim() || form?.model?.trim() || form?.serial?.trim()),
    system: Boolean(form?.systeme?.trim() || form?.processeur?.trim() || form?.memoire?.trim() || Array.isArray(form?.role) && form.role.length > 0),
    storage: Boolean(form?.raid?.trim() || form?.capacite?.trim() || form?.quickConnect?.trim()),
    ha: Boolean(form?.modeHA),
    maintenance: Boolean(form?.expirationGarantie?.trim() || form?.stormshieldWanUrl?.trim() || form?.dateBatterie?.trim() || form?.capaciteVA?.trim())
  };
  if (moduleKey === "Firewalls") {
    const profile = getFirewallFormProfile(form?.firewallType);
    meta.identity = Boolean(form?.name?.trim() && form?.firewallType?.trim());
    meta.hardware = Boolean(form?.manufacturer?.trim() || profile.showModel && form?.model?.trim() || profile.showSerial && form?.serial?.trim() || profile.showFirmware && form?.firmware?.trim() || profile.showWarranty && form?.expirationGarantie?.trim());
    if (!profile.showHa) meta.ha = false;
    meta.licences = Boolean(Array.isArray(form?.licences) && form.licences.some(lic => String(lic?.nom || "").trim() || String(lic?.expiration || "").trim()));
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim() || form?.stormshieldWanUrl?.trim());
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "Routeur") {
    const profile = getRouterFormProfile(form?.routeurType);
    meta.identity = Boolean(form?.name?.trim() && form?.routeurType?.trim());
    meta.hardware = Boolean(form?.manufacturer?.trim() || profile.showModel && form?.model?.trim() || profile.showSerial && form?.serial?.trim() || profile.showFirmware && form?.firmware?.trim() || profile.showWarranty && form?.expirationGarantie?.trim());
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim() || form?.adminUrl?.trim());
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "Servers") {
    const profile = getServerFormProfile(form?.typeServer);
    meta.identity = Boolean(form?.name?.trim() && form?.typeServer?.trim());
    if (profile.showHardware) {
      meta.hardware = Boolean(form?.manufacturer?.trim() || form?.model?.trim() || form?.serial?.trim() || form?.expirationGarantie?.trim());
    } else {
      meta.hardware = false;
    }
    meta.system = Boolean(form?.systeme?.trim() || form?.processeur?.trim() || form?.memoire?.trim() || form?.stockage?.trim() || profile.showHypervisor && form?.hypervisor?.trim() || Array.isArray(form?.role) && form.role.length > 0);
    meta.remote = Boolean(form?.remoteAccessSolution?.trim() && form?.remoteAccessId?.trim());
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim());
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "Alimentation") {
    const profile = getAlimentationFormProfile(form?.alimentationType);
    meta.identity = Boolean(form?.name?.trim() && form?.alimentationType?.trim());
    meta.hardware = Boolean(form?.manufacturer?.trim() || form?.model?.trim() || form?.serial?.trim() || form?.firmware?.trim() || profile.showWarranty && form?.expirationGarantie?.trim());
    meta.power = Boolean(profile.showCapaciteVA && form?.capaciteVA?.trim() || profile.showCapaciteW && form?.capaciteW?.trim() || profile.showNbPrises && form?.nbPrises?.trim() || profile.showBatteryDate && form?.dateBatterie?.trim());
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim() || form?.adresseMac?.trim());
    meta.management = Boolean(form?.manageable || form?.adminUrl?.trim());
    meta.maintenance = false;
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "TOIP") {
    const profile = getToipFormProfile(form?.toipType);
    meta.identity = Boolean(form?.name?.trim() && form?.toipType?.trim());
    meta.hardware = Boolean(form?.manufacturer?.trim() || form?.model?.trim() || form?.serial?.trim() || form?.firmware?.trim());
    meta.voip = isToipVoipSectionVisible(form?.toipType) && Boolean(profile.showExtensions && form?.nombreExtensions?.trim() || profile.showDomainSip && form?.domaineSip?.trim());
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim() || form?.adresseMac?.trim());
    meta.management = Boolean(form?.manageable || form?.adminUrl?.trim());
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "Switch") {
    meta.hardware = Boolean(form?.manufacturer?.trim() || form?.model?.trim() || form?.serial?.trim() || form?.firmware?.trim() || form?.poeSupport || form?.empilage);
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim() || form?.adresseMac?.trim());
    meta.management = Boolean(form?.manageable || form?.adminUrl?.trim());
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "BorneWifi") {
    meta.hardware = Boolean(form?.manufacturer?.trim() || form?.model?.trim() || form?.serial?.trim() || form?.firmware?.trim() || form?.alimentationPoE);
    meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim() || form?.adresseMac?.trim());
    meta.wifi = Boolean(Array.isArray(form?.assignedSsidIds) && form.assignedSsidIds.length > 0 || Array.isArray(form?.clientSsids) && form.clientSsids.some(entry => String(entry?.nom || "").trim()));
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  if (moduleKey === "Storage") {
    const profile = getStorageFormProfile(form?.storageType);
    meta.identity = Boolean(form?.name?.trim() && form?.storageType?.trim());
    if (profile.showHardware) {
      meta.hardware = Boolean(form?.manufacturer?.trim() || form?.model?.trim() || profile.showSerial && form?.serial?.trim() || profile.showWarranty && form?.expirationGarantie?.trim());
    } else {
      meta.hardware = false;
    }
    if (profile.showNetwork) {
      meta.network = Boolean(form?.ip?.trim() || form?.vlan?.trim());
    } else {
      meta.network = false;
    }
    meta.storage = Boolean(profile.showRole && form?.role?.trim() || profile.showRaid && form?.raid?.trim() || profile.showCapacite && form?.capacite?.trim() || profile.showDisques && (form?.nbDisquesActuels?.trim() || form?.nbDisquesMax?.trim()) || profile.showQuickConnect && form?.quickConnect?.trim() || profile.showNumeroDisque && form?.numeroDisque?.trim());
    meta.maintenance = false;
    meta.notes = Boolean(form?.commentaire?.trim());
  }
  return meta;
}
export function isEquipmentRequiredSectionIncomplete(form, moduleKey, sectionId, {
  isAddMode = false
} = {}) {
  if (moduleKey === "Internet") {
    const {
      requiredIncomplete
    } = buildInternetSectionNavMeta(form, {
      isAddMode,
      includeIdentity: true
    });
    return Boolean(requiredIncomplete[sectionId]);
  }
  if (sectionId === "identity" && isAddMode) {
    if (moduleKey === "Firewalls") {
      return !form?.name?.trim() || !form?.firewallType?.trim();
    }
    if (moduleKey === "Routeur") {
      return !form?.name?.trim() || !form?.routeurType?.trim();
    }
    if (moduleKey === "Servers") {
      return !form?.name?.trim() || !form?.typeServer?.trim();
    }
    if (moduleKey === "Storage") {
      return !form?.name?.trim() || !form?.storageType?.trim();
    }
    if (moduleKey === "TOIP") {
      return !form?.name?.trim() || !form?.toipType?.trim();
    }
    return !form?.name?.trim();
  }
  if (moduleKey === "Firewalls" && sectionId === "hardware" && isAddMode) {
    return !form?.manufacturer?.trim();
  }
  if (moduleKey === "Routeur" && sectionId === "hardware" && isAddMode) {
    return !form?.manufacturer?.trim();
  }
  if (moduleKey === "Servers" && sectionId === "hardware" && isAddMode) {
    const profile = getServerFormProfile(form?.typeServer);
    return profile.showHardware && !form?.manufacturer?.trim();
  }
  if (moduleKey === "Storage" && sectionId === "hardware" && isAddMode) {
    const profile = getStorageFormProfile(form?.storageType);
    return profile.showHardware && !form?.manufacturer?.trim();
  }
  if (moduleKey === "Switch" && sectionId === "hardware" && isAddMode) {
    return !form?.manufacturer?.trim();
  }
  if (moduleKey === "BorneWifi" && sectionId === "hardware" && isAddMode) {
    return !form?.manufacturer?.trim();
  }
  if (moduleKey === "Alimentation" && sectionId === "hardware" && isAddMode) {
    return !form?.manufacturer?.trim();
  }
  if (moduleKey === "TOIP" && sectionId === "hardware" && isAddMode) {
    return !form?.manufacturer?.trim();
  }
  return false;
}
export function validateEquipmentForm(form, moduleKey, {
  setActiveSection,
  isAddMode
}) {
  if (isAddMode && !form?.name?.trim()) {
    setActiveSection("identity");
    return "Name is required";
  }
  if (moduleKey === "Firewalls" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "Routeur" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "Servers" && isAddMode && !form?.typeServer?.trim()) {
    setActiveSection("identity");
    return "Server type is required";
  }
  if (moduleKey === "Servers" && isAddMode && getServerFormProfile(form?.typeServer).showHardware && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "Storage" && isAddMode && !form?.storageType?.trim()) {
    setActiveSection("identity");
    return "Storage type is required";
  }
  if (moduleKey === "Storage" && isAddMode && getStorageFormProfile(form?.storageType).showHardware && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "Switch" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "BorneWifi" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "Alimentation" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "TOIP" && isAddMode && !form?.toipType?.trim()) {
    setActiveSection("identity");
    return "Le type d'equipment est required";
  }
  if (moduleKey === "TOIP" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return "Brand is required";
  }
  if (moduleKey === "Internet") {
    if (!form?.internetType?.trim()) {
      setActiveSection("internetType");
      return "Connection type is required";
    }
    if (!form?.fournisseur?.trim()) {
      setActiveSection("internetLink");
      return "Provider is required";
    }
    if (!form?.ipNonFixe && !form?.ip?.trim()) {
      setActiveSection("internetNetwork");
      return "Enter an IP address or select “Non-fixed IP”";
    }
  }
  return null;
}
