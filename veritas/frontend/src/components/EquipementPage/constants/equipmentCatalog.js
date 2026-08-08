export const FIREWALL_MODEL_OTHER = "__other__";
export const FIREWALL_BRAND_META = {
  Stormshield: {
    label: "Stormshield"
  },
  Fortinet: {
    label: "Fortinet"
  },
  PaloAltoNetworks: {
    label: "Palo Alto"
  },
  CheckPoint: {
    label: "Check Point"
  },
  Sophos: {
    label: "Sophos"
  },
  WatchGuard: {
    label: "WatchGuard"
  },
  Cisco: {
    label: "Cisco"
  },
  SonicWall: {
    label: "SonicWall"
  },
  Juniper: {
    label: "Juniper"
  },
  Ubiquiti: {
    label: "Ubiquiti"
  },
  pfSense: {
    label: "pfSense"
  },
  Huawei: {
    label: "Huawei"
  },
  HPE: {
    label: "HPE"
  },
  OPNsense: {
    label: "OPNsense"
  },
  DynFi: {
    label: "DynFi"
  },
  MicrosoftAzure: {
    label: "Azure"
  },
  AWS: {
    label: "AWS"
  },
  Cloudflare: {
    label: "Cloudflare"
  },
  GoogleCloud: {
    label: "Google Cloud"
  },
  Zscaler: {
    label: "Zscaler"
  }
};
export const FIREWALL_CATALOG_MATERIEL = {
  Stormshield: ["SN160W", "SN210W", "SN310", "SN510", "SN710", "SN920", "SN2100", "SN3100", "SN4100", "SN6100", "SN7100", "SN9100"],
  Fortinet: ["FortiGate 30G", "FortiGate 40F", "FortiGate 60F", "FortiGate 70G", "FortiGate 80F", "FortiGate 100F", "FortiGate 200F", "FortiGate 400F", "FortiGate 600F", "FortiGate 900G", "FortiGate 1000F", "FortiGate 2000F"],
  PaloAltoNetworks: ["PA-410", "PA-440", "PA-450", "PA-460", "PA-820", "PA-850", "PA-3220", "PA-3250", "PA-3410", "PA-3420", "PA-3430", "PA-3440", "PA-5450"],
  CheckPoint: ["1530", "1550", "1570", "1590", "1600", "1800", "6200", "6900", "7300", "7800", "Quantum Spark 1600", "Quantum Spark 1800"],
  Sophos: ["XGS 87", "XGS 107", "XGS 116", "XGS 126", "XGS 136", "XGS 2100", "XGS 2300", "XGS 3100", "XGS 4300", "SG 105", "SG 125", "SG 210"],
  WatchGuard: ["Firebox T20", "Firebox T25", "Firebox T40", "Firebox T45", "Firebox T55", "Firebox T70", "Firebox T80", "Firebox M270", "Firebox M370", "Firebox M470", "Firebox M570", "Firebox M670"],
  Cisco: ["Meraki MX64", "Meraki MX67", "Meraki MX68", "Meraki MX75", "Meraki MX85", "Meraki MX95", "Meraki MX105", "Meraki MX250", "Meraki MX450", "ASA 5506-X", "ASA 5508-X", "FPR-1010", "FPR-1120", "FPR-1140"],
  SonicWall: ["TZ270", "TZ370", "TZ470", "TZ570", "TZ670", "NSa 2700", "NSa 3700", "NSa 4700", "NSa 5700", "NSa 6700", "NSsp 13700"],
  Juniper: ["SRX300", "SRX320", "SRX340", "SRX345", "SRX550", "SRX1500", "SRX4100", "SRX4200", "SRX4600"],
  Ubiquiti: ["UniFi Gateway", "UniFi Gateway Ultra", "UniFi Gateway Max", "UniFi Gateway Pro", "UniFi Cloud Gateway", "EdgeRouter 4", "EdgeRouter 6P", "EdgeRouter 12"],
  pfSense: ["Netgate 1100", "Netgate 2100", "Netgate 4100", "Netgate 6100", "Netgate 8200", "Netgate 8300", "Netgate 1537"],
  Huawei: ["USG6300E", "USG6500E", "USG6600E", "USG6700E", "USG12000", "HiSecEngine USG6000F"],
  HPE: ["Aruba 9004 Gateway", "Aruba 9012 Gateway", "Aruba 9240 Gateway", "Aruba 9280 Gateway", "Aruba 7008 Controller", "Aruba 7010 Controller"]
};
export const FIREWALL_CATALOG_VIRTUEL = {
  Stormshield: ["Virtual SN210", "Virtual SN310", "Virtual SN510", "Virtual SN710", "Virtual SN910", "Virtual SN2000", "Virtual SN3000", "Virtual SN6000"],
  Fortinet: ["FortiGate VM", "FortiGate-VM00", "FortiGate-VM01", "FortiGate-VM02", "FortiGate-VM04", "FortiGate-VM08", "FortiGate-VM16", "FortiGate-VM32", "FortiGate-VM64"],
  PaloAltoNetworks: ["VM-Series", "PA-VM-50", "PA-VM-100", "PA-VM-300", "PA-VM-700", "PA-VM-1000"],
  CheckPoint: ["Security Gateway VM", "VSX", "Quantum Spark 1600 Virtual", "Quantum Spark 1800 Virtual"],
  Sophos: ["XGS Virtual", "SFOS Virtual", "Sophos Firewall Virtual"],
  WatchGuard: ["FireboxV Small", "FireboxV Medium", "FireboxV Large", "FireboxV XL", "FireboxV XXL"],
  Cisco: ["ASAv", "FTDv", "Meraki vMX", "Secure Firewall Threat Defense Virtual"],
  Juniper: ["vSRX"],
  SonicWall: ["NSv 270", "NSv 470", "NSv 570", "NSv 670", "NSv 870"],
  pfSense: ["VM", "CE VM", "Plus VM"],
  Huawei: ["USG6000V", "Virtual USG"]
};
export const FIREWALL_CATALOG_CLOUD = {
  PaloAltoNetworks: ["Prisma Access", "Strata Cloud Manager", "NGFW Credits", "Prisma SASE"],
  Fortinet: ["FortiGate Cloud", "FortiSASE", "FortiGate CNF (AWS)", "FortiGate CNF (Azure)"],
  CheckPoint: ["Harmony SASE", "Infinity Portal", "Quantum Spark Cloud", "Check Point CloudGuard"],
  Cisco: ["Meraki MX (cloud)", "Umbrella SIG", "Secure Access", "Hybrid Mesh Firewall"],
  Sophos: ["Sophos Central Firewall", "Sophos ZTNA", "Sophos Firewall cloud"],
  MicrosoftAzure: ["Azure Firewall", "Azure Firewall Basic", "Azure Firewall Premium", "Azure Firewall Manager"],
  AWS: ["AWS Network Firewall", "AWS WAF", "AWS Shield Advanced", "Gateway Load Balancer FW"],
  Cloudflare: ["Magic Firewall", "Cloudflare One", "Cloudflare WAF"],
  GoogleCloud: ["Cloud NGFW", "Cloud Armor", "Secure Access Edge"],
  Zscaler: ["ZIA", "ZPA", "Firewall as a Service"],
  Stormshield: ["ESC Cloud"]
};
export const FIREWALL_CATALOG_LOGICIEL = {
  pfSense: ["pfSense CE", "pfSense Plus"],
  OPNsense: ["OPNsense"],
  DynFi: ["DynFi Firewall"]
};
export const FIREWALL_CATALOG_AUTRE = {};
export const FIREWALL_CATALOG = FIREWALL_CATALOG_MATERIEL;
const ALL_FIREWALL_CATALOG_BRANDS = new Set([...Object.keys(FIREWALL_CATALOG_MATERIEL), ...Object.keys(FIREWALL_CATALOG_VIRTUEL), ...Object.keys(FIREWALL_CATALOG_CLOUD), ...Object.keys(FIREWALL_CATALOG_LOGICIEL)]);
export function normalizeFirewallDeploymentType(value) {
  const normalized = String(value || "materiel").trim().toLowerCase();
  if (["materiel", "hardware", "physique", "hardware", "appliance"].includes(normalized)) {
    return "materiel";
  }
  if (["virtuel", "virtual", "vm", "vfw"].includes(normalized)) return "virtuel";
  if (["cloud", "fwaas", "saas"].includes(normalized)) return "cloud";
  if (["logiciel", "software", "lpe"].includes(normalized)) return "logiciel";
  if (normalized === "autre") return "autre";
  return normalized || "materiel";
}
export function getFirewallCatalogByDeploymentType(deploymentType) {
  switch (normalizeFirewallDeploymentType(deploymentType)) {
    case "virtuel":
      return FIREWALL_CATALOG_VIRTUEL;
    case "cloud":
      return FIREWALL_CATALOG_CLOUD;
    case "logiciel":
      return FIREWALL_CATALOG_LOGICIEL;
    case "autre":
      return FIREWALL_CATALOG_AUTRE;
    default:
      return FIREWALL_CATALOG_MATERIEL;
  }
}
export function buildEquipmentBrandTiles(catalog, brandMeta = FIREWALL_BRAND_META) {
  return [...Object.keys(catalog || {}).map(id => ({
    id,
    label: brandMeta[id]?.label || id
  })), {
    id: "__other__",
    label: "Other"
  }];
}
export function buildFirewallBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, FIREWALL_BRAND_META);
}
export const ROUTER_BRAND_META = {
  Cisco: {
    label: "Cisco"
  },
  Fortinet: {
    label: "Fortinet"
  },
  MikroTik: {
    label: "MikroTik"
  },
  Ubiquiti: {
    label: "Ubiquiti"
  },
  Juniper: {
    label: "Juniper"
  },
  PaloAltoNetworks: {
    label: "Palo Alto"
  },
  HPE: {
    label: "HPE"
  },
  CheckPoint: {
    label: "Check Point"
  },
  Sophos: {
    label: "Sophos"
  },
  WatchGuard: {
    label: "WatchGuard"
  },
  Peplink: {
    label: "Peplink"
  },
  VMware: {
    label: "VMware"
  },
  Zscaler: {
    label: "Zscaler"
  },
  MicrosoftAzure: {
    label: "Azure"
  },
  AWS: {
    label: "AWS"
  },
  Cloudflare: {
    label: "Cloudflare"
  },
  Cradlepoint: {
    label: "Cradlepoint"
  },
  Huawei: {
    label: "Huawei"
  }
};
export const ROUTER_CATALOG_ROUTEUR = {
  Cisco: ["ISR 4331", "ISR 4451", "C1111-8P", "C9200CX", "Meraki MX68", "Meraki MX75"],
  MikroTik: ["RB4011", "CCR2004-16G-2S+", "hEX", "hAP ax3", "Chateau AX"],
  Ubiquiti: ["EdgeRouter 4", "EdgeRouter 12", "UDM Pro", "UDM SE", "UXG-Pro"],
  Fortinet: ["FortiGate 60F", "FortiGate 100F", "FortiGate 200F", "FortiGate 400F"],
  Juniper: ["SRX300", "SRX345", "SSR1100", "SSR1200"],
  HPE: ["MSR1002-4", "FlexNetwork 5940", "Aruba 9004"],
  Peplink: ["Balance 20X", "Balance 310", "MAX BR1 Pro 5G"],
  Cradlepoint: ["E3000", "R1900", "W1850"],
  Huawei: ["NetEngine AR6121", "NetEngine AR6280"]
};
export const ROUTER_CATALOG_SDWAN = {
  Cisco: ["Catalyst SD-WAN", "Meraki SD-WAN", "vManage", "Viptela"],
  Fortinet: ["FortiGate SD-WAN", "FortiExtender", "FortiSASE"],
  PaloAltoNetworks: ["Prisma SD-WAN", "CloudGenix", "ION 1200"],
  VMware: ["VeloCloud Edge", "VMware SASE", "Edge 610"],
  HPE: ["Aruba EdgeConnect", "EdgeConnect SD-WAN"],
  CheckPoint: ["Quantum SD-WAN", "Quantum Spark"],
  Zscaler: ["ZIA", "ZPA", "Zero Trust Exchange"],
  MicrosoftAzure: ["Azure Virtual WAN", "Azure VPN Gateway"],
  AWS: ["AWS Cloud WAN", "Transit Gateway"],
  Cloudflare: ["Magic WAN", "Cloudflare One"],
  Juniper: ["Session Smart Router", "SSR1200", "Mist SD-WAN"],
  Sophos: ["Sophos SD-RED", "Sophos ZTNA"]
};
const ALL_ROUTER_CATALOG_BRANDS = new Set([...Object.keys(ROUTER_CATALOG_ROUTEUR), ...Object.keys(ROUTER_CATALOG_SDWAN)]);
export function normalizeRouteurType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "routeur" || normalized === "router") return "Routeur";
  if (["sd-wan", "sdwan", "sd wan", "overlay"].includes(normalized)) return "SD-WAN";
  if (value === "Routeur" || value === "SD-WAN") return value;
  return normalized;
}
export function getRouterCatalogByType(routeurType) {
  return normalizeRouteurType(routeurType) === "SD-WAN" ? ROUTER_CATALOG_SDWAN : ROUTER_CATALOG_ROUTEUR;
}
export function buildRouterBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, ROUTER_BRAND_META);
}
export function applyRouterTypeChange(prev, nextType) {
  const nextCatalog = getRouterCatalogByType(nextType);
  const currentBrand = String(prev?.manufacturer || "").trim();
  const currentModel = String(prev?.model || "").trim();
  if (!currentBrand) {
    return {
      ...prev,
      routeurType: nextType
    };
  }
  if (!Object.keys(nextCatalog).includes(currentBrand)) {
    if (ALL_ROUTER_CATALOG_BRANDS.has(currentBrand)) {
      return {
        ...prev,
        routeurType: nextType,
        manufacturer: "",
        model: ""
      };
    }
    return {
      ...prev,
      routeurType: nextType,
      model: ""
    };
  }
  const models = nextCatalog[currentBrand] || [];
  if (currentModel && !models.includes(currentModel)) {
    return {
      ...prev,
      routeurType: nextType,
      model: ""
    };
  }
  return {
    ...prev,
    routeurType: nextType
  };
}
export function applyFirewallDeploymentTypeChange(prev, nextType) {
  const nextCatalog = getFirewallCatalogByDeploymentType(nextType);
  const currentBrand = String(prev?.manufacturer || "").trim();
  const currentModel = String(prev?.model || "").trim();
  if (!currentBrand) {
    return {
      ...prev,
      firewallType: nextType
    };
  }
  if (!Object.keys(nextCatalog).includes(currentBrand)) {
    if (ALL_FIREWALL_CATALOG_BRANDS.has(currentBrand)) {
      return {
        ...prev,
        firewallType: nextType,
        manufacturer: "",
        model: ""
      };
    }
    return {
      ...prev,
      firewallType: nextType,
      model: ""
    };
  }
  const models = nextCatalog[currentBrand] || [];
  if (currentModel && !models.includes(currentModel)) {
    return {
      ...prev,
      firewallType: nextType,
      model: ""
    };
  }
  return {
    ...prev,
    firewallType: nextType
  };
}
export const SERVER_CATALOG = {
  HPE: ["ProLiant DL360 Gen11", "ProLiant DL380 Gen11", "ProLiant DL365 Gen11", "ProLiant ML350 Gen11", "ProLiant DL20 Gen11"],
  FUJITSU: ["PRIMERGY RX2530 M7", "PRIMERGY RX2540 M6", "PRIMERGY RX2540 M7", "PRIMERGY TX1330 M6", "PRIMERGY BX900 S5"],
  Dell: ["PowerEdge R650", "PowerEdge R750", "PowerEdge R760", "PowerEdge T550", "PowerEdge T640"],
  Lenovo: ["ThinkSystem SR650 V3", "ThinkSystem SR630 V3", "ThinkSystem ST650 V3", "ThinkSystem SN550 V3"],
  Cisco: ["UCS C240 M7", "UCS C220 M7", "UCS B200 M6"]
};
export const SERVER_BRAND_META = {
  HPE: {
    label: "HPE"
  },
  FUJITSU: {
    label: "Fujitsu"
  },
  Dell: {
    label: "Dell"
  },
  Lenovo: {
    label: "Lenovo"
  },
  Cisco: {
    label: "Cisco"
  }
};
export function buildServerBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, SERVER_BRAND_META);
}
export const STORAGE_BRAND_META = {
  SYNOLOGY: {
    label: "Synology"
  },
  QNAP: {
    label: "QNAP"
  },
  Asustor: {
    label: "Asustor"
  },
  WesternDigital: {
    label: "Western Digital"
  },
  Netgear: {
    label: "Netgear"
  },
  FUJITSU: {
    label: "Fujitsu"
  },
  Dell: {
    label: "Dell EMC"
  },
  HPE: {
    label: "HPE"
  },
  NetApp: {
    label: "NetApp"
  },
  PureStorage: {
    label: "Pure Storage"
  },
  IBM: {
    label: "IBM"
  },
  VMware: {
    label: "VMware"
  },
  MicrosoftAzure: {
    label: "Azure"
  },
  AWS: {
    label: "AWS"
  },
  GoogleCloud: {
    label: "Google Cloud"
  },
  Proxmox: {
    label: "Proxmox"
  },
  Quantum: {
    label: "Quantum"
  },
  OverlandTandberg: {
    label: "Overland-Tandberg"
  },
  Wasabi: {
    label: "Wasabi"
  },
  OVHcloud: {
    label: "OVHcloud"
  }
};
export const STORAGE_CATALOG_NAS = {
  SYNOLOGY: ["DS923+", "DS1821+", "DS3622xs+", "RS1221+", "RS3621xs+", "FS2500", "DS224+", "DS423+"],
  QNAP: ["TS-464", "TS-h973ax", "TS-h1277AFX", "TVS-h674", "TS-873A", "TS-453D"],
  Asustor: ["AS6704T", "AS6604T", "AS5304T"],
  WesternDigital: ["My Cloud Pro Series PR4100", "My Cloud EX2 Ultra"],
  Netgear: ["ReadyNAS 424", "ReadyNAS 626X"]
};
export const STORAGE_CATALOG_SAN = {
  FUJITSU: ["ETERNUS DX100 S5", "ETERNUS DX200 S5", "ETERNUS AF250 S3", "ETERNUS DX60 S5", "ETERNUS AB7000"],
  Dell: ["PowerStore 500T", "PowerStore 1200T", "Unity XT 380", "PowerVault ME5024"],
  HPE: ["Alletra 6030", "Primera 630", "MSA 2060", "StoreOnce 5260"],
  NetApp: ["AFF A250", "AFF A400", "FAS2750", "FAS8300"],
  PureStorage: ["FlashArray//X70R3", "FlashArray//C60R3"],
  IBM: ["FlashSystem 5200", "FlashSystem 7300"]
};
export const STORAGE_CATALOG_VIRTUEL = {
  VMware: ["vSAN OSA", "vSAN ESA", "TrueNAS SCALE VM"],
  MicrosoftAzure: ["Azure Files", "Azure NetApp Files"],
  AWS: ["FSx for NetApp ONTAP", "EFS", "S3"],
  Proxmox: ["Ceph", "ZFS on Proxmox"],
  SYNOLOGY: ["Virtual DSM"],
  QNAP: ["QuTScloud"]
};
export const STORAGE_CATALOG_CLOUD = {
  MicrosoftAzure: ["Azure Files Premium", "Azure Blob Hot", "Azure NetApp Files"],
  AWS: ["S3 Standard", "EFS", "FSx Windows"],
  GoogleCloud: ["Cloud Storage", "Filestore"],
  Wasabi: ["Hot Cloud Storage"],
  OVHcloud: ["Object Storage", "Cloud Archive"]
};
export const STORAGE_CATALOG_ROBOT = {
  Quantum: ["Scalar i3", "Scalar i6"],
  HPE: ["StoreEver MSL6480", "StoreEver MSL3040"],
  Dell: ["PowerVault TL4000", "PowerVault ML3"],
  OverlandTandberg: ["NEOs T48", "NEOs T24"],
  IBM: ["TS4500", "TS4300"]
};
export const STORAGE_CATALOG_EXTERNE = {
  WesternDigital: ["My Passport", "Elements Desktop"],
  Seagate: ["Expansion Desktop", "Backup Plus"],
  SYNOLOGY: ["BeeStation"]
};
export const STORAGE_CATALOG = STORAGE_CATALOG_NAS;
export function getStorageCatalogByType(storageType) {
  switch (String(storageType || "").trim().toLowerCase()) {
    case "san":
      return STORAGE_CATALOG_SAN;
    case "virtuel":
    case "virtual":
      return STORAGE_CATALOG_VIRTUEL;
    case "cloud":
      return STORAGE_CATALOG_CLOUD;
    case "robot":
      return STORAGE_CATALOG_ROBOT;
    case "externe":
      return STORAGE_CATALOG_EXTERNE;
    default:
      return STORAGE_CATALOG_NAS;
  }
}
export function buildStorageBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, STORAGE_BRAND_META);
}
export const SWITCH_BRAND_META = {
  Ubiquiti: {
    label: "Ubiquiti"
  },
  Cisco: {
    label: "Cisco"
  },
  HPE: {
    label: "HPE Aruba"
  },
  Netgear: {
    label: "Netgear"
  },
  MikroTik: {
    label: "MikroTik"
  },
  Fortinet: {
    label: "Fortinet"
  },
  DLink: {
    label: "D-Link"
  },
  "TP-Link": {
    label: "TP-Link"
  }
};
export function buildSwitchBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, SWITCH_BRAND_META);
}
export const SWITCH_CATALOG = {
  Ubiquiti: ["UDM Pro", "UDM Pro Max", "UDM SE", "USW-Pro-24-PoE", "USW-Pro-48-PoE", "USW-Lite-16-PoE", "USW-Enterprise-24-PoE", "USW-Flex"],
  Cisco: ["Catalyst 9200", "Catalyst 9300", "Nexus 9300", "SG350-28", "CBS350-24P"],
  HPE: ["Aruba 2930F", "Aruba 6000", "Aruba 6100", "OfficeConnect 1920S"],
  Netgear: ["MS324TXUP", "GS728TP", "XS728T", "M4300-28G"],
  MikroTik: ["CRS326-24G-2S+", "CSS610-8G-2S+", "CRS354-48G-4S+2Q+"],
  Fortinet: ["FortiSwitch 148F", "FortiSwitch 424E", "FortiSwitch 1024E"],
  DLink: ["DGS-1210-28", "DXS-1210-28SC", "DGS-1100-16"],
  "TP-Link": ["TL-SG3428", "SG3428XMP", "T1600G-28TS"]
};
export const UNIFI_UDM_API_MODELS = ["UDM Pro", "UDM Pro Max"];
export const WIFI_AP_BRAND_META = {
  Ubiquiti: {
    label: "Ubiquiti"
  },
  HPE: {
    label: "HPE Aruba"
  },
  Cisco: {
    label: "Cisco"
  },
  Fortinet: {
    label: "Fortinet"
  },
  Ruckus: {
    label: "Ruckus"
  },
  Netgear: {
    label: "Netgear"
  },
  MikroTik: {
    label: "MikroTik"
  },
  "TP-Link": {
    label: "TP-Link"
  }
};
export function buildWifiApBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, WIFI_AP_BRAND_META);
}
export const WIFI_AP_CATALOG = {
  Ubiquiti: ["U6 Pro", "U6 Enterprise", "U6 LR", "U6 Lite", "U7 Pro", "UAP-AC-Pro", "UAP-AC-Lite", "UAP-AC-Mesh"],
  HPE: ["AP-515", "AP-535", "AP-555", "AP-635", "AP-655", "IAP-315", "IAP-325"],
  Cisco: ["Meraki MR46", "Meraki MR57", "Meraki MR36", "C9130AXI", "C9120AXI"],
  Fortinet: ["FAP-431F", "FAP-433F", "FAP-441K", "FAP-231K"],
  Ruckus: ["R750", "R650", "R550", "R350"],
  Netgear: ["WAX630", "WAX610", "WAX618", "WAX610Y"],
  MikroTik: ["cAP ax", "hAP ax3", "wAP ax", "cAP ac"],
  "TP-Link": ["EAP650", "EAP670", "EAP773", "EAP620 HD"]
};
export const ALIMENTATION_BRAND_META = {
  APC: {
    label: "APC"
  },
  Eaton: {
    label: "Eaton"
  },
  CyberPower: {
    label: "CyberPower"
  },
  Schneider: {
    label: "Schneider Electric"
  },
  Legrand: {
    label: "Legrand"
  },
  Vertiv: {
    label: "Vertiv"
  },
  Raritan: {
    label: "Raritan"
  }
};
export const ALIMENTATION_UPS_CATALOG = {
  APC: ["Smart-UPS 750", "Smart-UPS 1500", "Smart-UPS 3000", "Back-UPS Pro 1500", "Symmetra PX"],
  Eaton: ["5P 1550", "5P 3000", "9PX 1500", "9PX 3000", "Ellipse PRO 1600"],
  CyberPower: ["PR1500ELCD", "PR3000ELCD", "CP1500EPFCLCD", "OR2200LCDRT2U"],
  Schneider: ["Easy UPS SRV 3000", "Galaxy VS 10kVA", "Smart-UPS On-Line"],
  Legrand: ["Keor Multiplug 800", "Keor PDU"],
  Vertiv: ["Liebert GXT5", "Liebert PSI5"]
};
export const ALIMENTATION_PDU_CATALOG = {
  APC: ["AP7900", "AP7941", "AP8959", "APDU9941", "APDU9953"],
  Eaton: ["ePDU G3 Metered", "ePDU G3 Managed", "ePDU Basic"],
  CyberPower: ["PDU41004", "PDU81005", "PDU20SWHVIEC12ATNET"],
  Schneider: ["Metered Rack PDU", "Switched Rack PDU"],
  Legrand: ["Rack PDU 1U", "PDU modulaire"],
  Vertiv: ["Geist rPDU", "rPDUs Switched"],
  Raritan: ["PX3-5190", "PX3-5520", "PX3-5810"]
};
export function buildAlimentationBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, ALIMENTATION_BRAND_META);
}
export function getAlimentationCatalogByType(alimentationType) {
  return String(alimentationType || "UPS").trim() === "PDU" ? ALIMENTATION_PDU_CATALOG : ALIMENTATION_UPS_CATALOG;
}
export const TOIP_BRAND_META = {
  "3CX": {
    label: "3CX"
  },
  Yeastar: {
    label: "Yeastar"
  },
  Avaya: {
    label: "Avaya"
  },
  Cisco: {
    label: "Cisco"
  },
  Grandstream: {
    label: "Grandstream"
  },
  Mitel: {
    label: "Mitel"
  },
  AudioCodes: {
    label: "AudioCodes"
  },
  Patton: {
    label: "Patton"
  },
  Ribbon: {
    label: "Ribbon"
  },
  Yealink: {
    label: "Yealink"
  },
  Poly: {
    label: "Poly"
  },
  Fanvil: {
    label: "Fanvil"
  }
};
export const TOIP_CATALOG_PBX = {
  "3CX": ["3CX on-prem", "3CX cluster"],
  Yeastar: ["P-Series", "S-Series", "S50"],
  Avaya: ["IP Office", "Aura"],
  Cisco: ["CUCM", "BE6000", "BE7000"],
  Grandstream: ["UCM6301", "UCM6302", "UCM6510"],
  Mitel: ["MiVoice Connect", "MiVoice Business"]
};
export const TOIP_CATALOG_GATEWAY = {
  AudioCodes: ["Mediant 500", "Mediant 1000", "Mediant 800"],
  Patton: ["SmartNode SN2000", "SmartNode SN5500"],
  Cisco: ["VG350", "VG320", "ISR with CUBE"],
  Yeastar: ["TA200", "TA400", "TA800"],
  Grandstream: ["GXW4104", "GXW4216", "HT814"]
};
export const TOIP_CATALOG_SBC = {
  AudioCodes: ["Mediant VE", "Mediant 2600", "Mediant 4000"],
  Ribbon: ["EdgeMarc 4800", "SBC 2000", "SBC 1000"],
  Cisco: ["CUBE on ISR", "Unified Border Element"],
  Oracle: ["Oracle SBC", "Acme Packet"]
};
export const TOIP_CATALOG_PHONE = {
  Yealink: ["T46U", "T54W", "W73P", "T33G"],
  Poly: ["VVX 350", "Trio 8800", "CCX 400"],
  Cisco: ["CP-8841", "CP-8865", "CP-7841"],
  Grandstream: ["GRP2612", "GXP2170", "WP826"],
  Fanvil: ["X4U", "X7A", "W611W"]
};
export function buildToipBrandTiles(catalog) {
  return buildEquipmentBrandTiles(catalog, TOIP_BRAND_META);
}
export function getToipCatalogByType(toipType) {
  const type = String(toipType || "").trim();
  if (type === "Passerelle") return TOIP_CATALOG_GATEWAY;
  if (type === "SBC") return TOIP_CATALOG_SBC;
  if (type === "Phone IP") return TOIP_CATALOG_PHONE;
  if (type === "Autre") return {};
  return TOIP_CATALOG_PBX;
}
export const FIREWALL_BRANDS = Object.keys(FIREWALL_CATALOG_MATERIEL);
export const FIREWALL_BRAND_TILES = buildFirewallBrandTiles(FIREWALL_CATALOG_MATERIEL);
export const SERVER_BRANDS = Object.keys(SERVER_CATALOG);
export function buildBrandOptions(catalog, currentBrand = "") {
  const brands = Object.keys(catalog);
  const normalized = String(currentBrand || "").trim();
  if (normalized && !brands.includes(normalized)) {
    return [...brands, normalized];
  }
  return brands;
}
export function buildModelOptions(catalog, brand, currentModel = "") {
  const models = catalog[brand] || [];
  const normalized = String(currentModel || "").trim();
  if (normalized && !models.includes(normalized)) {
    return [...models, normalized];
  }
  return models;
}
