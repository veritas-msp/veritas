import { createLocaleGetter } from "../../i18n/translate";
const FR = {
  fields: {
    name: "Nom",
    nameVeritas: "Nom Veritas",
    netbios: "Nom NetBIOS",
    netbiosReadonlyTitle: "Nom remonté par l'agent RMM (non modifiable)",
    netbiosManualHint: "Optionnel. Aide à reconnaître le poste si le n° de série ou la MAC ne sont pas renseignés.",
    domain: "Domaine / workgroup",
    domainPlaceholder: "exemple.local",
    location: "Lieux",
    locationPlaceholder: "Rechercher ou saisir un lieu…",
    deploymentType: "Type de déploiement",
    serverType: "Type de serveur",
    storageType: "Type de stockage",
    equipmentType: "Type d'équipement",
    ipAddress: "Adresse IP",
    ipPlaceholder: "192.168.10.1",
    vlan: "VLAN",
    vlanPlaceholder: "10",
    adminUrl: "URL d'administration",
    adminUrlSupervision: "URL d'administration / supervision",
    macAddress: "Adresse MAC",
    macPlaceholder: "00:11:22:33:44:55",
    manageableEquipment: "Équipement manageable",
    manageableSwitch: "Switch manageable",
    yes: "Oui",
    no: "Non",
    switchManageableHint: "Un switch manageable dispose d'une interface de configuration (web, CLI ou contrôleur).",
    notes: "Notes",
    notesFirewallPlaceholder: "VPN SSL, accès support Stormshield 0800…",
    notesRouterPlaceholder: "Accès support, tunnel MPLS, procédure bascule…",
    notesServerPlaceholder: "Accès iLO/iDRAC, procédure de bascule, contacts support…",
    notesStoragePlaceholder: "Accès admin, procédure restauration, contacts support…",
    notesSwitchPlaceholder: "Empilement, ports uplink, accès UniFi, procédure de bascule…",
    notesWifiPlaceholder: "Contrôleur WiFi, emplacement physique, couverture, procédure de reset…",
    notesAlimentationPlaceholder: "Emplacement baie, procédure arrêt, contacts support, consignes batterie…",
    notesToipPlaceholder: "Trunk SIP, procédure bascule, contacts intégrateur, licences…",
    notesComputerPlaceholder: "Utilisateur principal, emplacement bureau, procédure remplacement…",
    brand: "Marque",
    model: "Modèle",
    otherBrandName: "Nom de la marque",
    otherModelManual: "Autre (saisie manuelle)",
    otherTile: "Autre",
    serialNumber: "N° série",
    warrantyEnd: "Garantie (fin)",
    firmware: "Firmware",
    softwareVersion: "Version logiciel",
    poePowered: "Alimentée en PoE",
    poeSupport: "Prise en charge PoE",
    stackable: "Empilable (stacking)",
    cloudServiceResource: "Service / ressource",
    sipDomain: "Domaine SIP",
    sipDomainPlaceholder: "pbx.exemple.fr",
    capacityVa: "Capacité (VA)",
    powerW: "Puissance (W)",
    outletCount: "Nombre de prises",
    batteryReplacementDate: "Date batterie (remplacement)",
    haMode: "Mode HA",
    haRole: "Rôle HA",
    haPartnerName: "Nom pair HA",
    haRolePrimary: "Primary",
    haRoleSecondary: "Secondary",
    haNoFirewallAvailable: "Aucun firewall disponible",
    haSelectFirewall: "Sélectionner un firewall",
    haNoPartnerHint: "Aucun autre firewall sans haute disponibilité sur ce client.",
    hypervisorPlatform: "Hyperviseur / Plateforme",
    osSystem: "OS / Système",
    currentValueSuffix: "(actuel)",
    roles: "Rôles",
    rolesPlaceholder: "Sélectionner les rôles",
    storageRole: "Rôle",
    quickConnect: "QuickConnect",
    quickConnectPlaceholder: "monnas.quickconnect.to",
    raid: "RAID",
    totalCapacity: "Capacité totale",
    diskRotationNumber: "N° disque (rotation)",
    provider: "Fournisseur",
    providerPlaceholder: "Orange, SFR, Bouygues…",
    category: "Catégorie",
    categoryLinkAria: "Catégorie de liaison",
    downloadSpeed: "Débit descendant",
    uploadSpeed: "Débit montant",
    speedPlaceholder: "100 Mbps, 1 Gbps…",
    publicIp: "Adresse IP publique",
    fixedIp: "IP fixe",
    nonFixedIp: "IP non fixe",
    nonFixedIpHint: "Cette connexion sera enregistrée sans IP publique fixe.",
    publicIpPlaceholder: "82.64.12.34",
    gateway: "Passerelle",
    gatewayPlaceholder: "192.168.1.254",
    lineIdentifier: "N° ligne / identifiant",
    lineIdentifierPlaceholder: "Référence ligne opérateur",
    contractNumber: "N° contrat",
    contractNumberPlaceholder: "Référence abonnement",
    operatorSupport: "Support opérateur",
    operatorSupportPlaceholder: "Numéro ou URL support",
    boxModem: "Box / modem",
    boxModemPlaceholder: "Modèle box ou routeur opérateur",
    serviceStartDate: "Mise en service",
    internetNotesPlaceholder: "SLA, plages horaires d'intervention, informations utiles…",
    defaultEquipmentName: "Nom de l'équipement",
    namePlaceholderSdwan: "SDWAN-Siège",
    switchModelPlaceholder: "USW-Pro-48-PoE",
    wifiModelPlaceholder: "U6 Pro",
    toipBrandPlaceholder: "3CX",
    dashOption: "-",
    cpuLabelDefault: "Processeur / vCPU"
  },
  moduleSectionDescriptions: {
    Internet: {
      identity: "Nom et lieux",
      internetType: "Technologie d'accès",
      internetLink: "Lieux, fournisseur et débits",
      internetNetwork: "IP publique et passerelle",
      internetContract: "Références et support",
      internetNotes: "Informations complémentaires"
    },
    Firewalls: {
      identity: "Nom, lieux et type de déploiement",
      hardware: "Marque, modèle, série et garantie",
      network: "IP, VLAN et URL d'administration",
      ha: "Cluster firewall et pair HA",
      licences: "Licences et dates d'expiration",
      notes: "Accès, procédures et informations utiles"
    },
    Serveurs: {
      identity: "Nom, lieux et type (Physique / Virtuel)",
      hardware: "Marque, modèle, n° de série et garantie",
      network: "Adresse IP et VLAN",
      system: "OS, ressources et rôles",
      remote: "Solution distante et identifiant de connexion",
      notes: "Accès, procédures et informations utiles"
    },
    Stockage: {
      identity: "Nom, lieux et type de stockage",
      hardware: "Marque, modèle et n° de série",
      network: "Adresse IP et VLAN",
      storage: "Rôle, RAID, capacité et disques",
      notes: "Accès, procédures et informations utiles"
    },
    Switch: {
      identity: "Nom et lieux",
      hardware: "Marque, modèle, firmware et caractéristiques",
      network: "Adresse IP, VLAN et MAC",
      management: "Manageabilité et interface d'administration",
      notes: "Accès, procédures et informations utiles"
    },
    BorneWifi: {
      identity: "Nom et lieux",
      hardware: "Marque, modèle, n° de série et firmware",
      network: "Adresse IP, VLAN et MAC",
      wifi: "SSID diffusés par la borne",
      notes: "Accès, procédures et informations utiles"
    },
    Alimentation: {
      identity: "Nom, lieux et type de déploiement (Onduleur / PDU)",
      hardware: "Marque, modèle, n° de série, firmware et garantie",
      power: "Capacité, prises et batterie",
      network: "Adresse IP, VLAN et MAC",
      management: "Gestion réseau et interface web",
      notes: "Accès, procédures et informations utiles"
    },
    Routeur: {
      identity: "Nom, lieux et type (Routeur / SD-WAN)",
      hardware: "Marque, modèle et caractéristiques",
      network: "IP, VLAN et URL d'administration",
      notes: "Accès, procédures et informations utiles"
    },
    TOIP: {
      identity: "Nom, lieux et type de déploiement VoIP",
      hardware: "Marque, modèle, n° de série et firmware",
      voip: "Extensions, domaine SIP et version",
      network: "Adresse IP, VLAN et MAC",
      management: "Console d'administration et supervision",
      notes: "Accès, procédures et informations utiles"
    }
  },
  internetCategories: {
    Principale: "Principale",
    Backup: "Backup"
  },
  internetConnectionCategories: {
    wired: "Filaire",
    wireless: "Sans fil",
    satellite: "Satellite",
    sdwan: "SD-WAN",
    other: "Autre"
  },
  internetConnectionTypes: {
    Fibre: "Fibre",
    ADSL: "ADSL",
    SDSL: "SDSL",
    VDSL: "VDSL",
    "4G": "4G",
    "5G": "5G",
    Satellite: "Satellite",
    Câble: "Câble",
    Radio: "Radio",
    "SD-WAN": "SD-WAN",
    Autre: "Autre"
  },
  typeOptions: {
    firewall: {
      materiel: {
        label: "Matériel",
        description: "Appliance physique (FortiGate, Stormshield…)"
      },
      virtuel: {
        label: "Virtuel",
        description: "Machine virtuelle (FortiGate VM, vSN…)"
      },
      cloud: {
        label: "Cloud",
        description: "FWaaS / pare-feu managé cloud"
      },
      logiciel: {
        label: "Logiciel",
        description: "Pare-feu logiciel (pfSense, OPNsense, DynFi…)"
      },
      autre: {
        label: "Autre",
        description: "Autre mode de déploiement"
      }
    },
    server: {
      physique: {
        label: "Physique",
        description: "Bare-metal, blade ou tour"
      },
      virtuel: {
        label: "Virtuel",
        description: "Machine virtuelle on-prem ou cloud"
      }
    },
    storage: {
      nas: {
        label: "NAS",
        description: "Appliance NAS (Synology, QNAP…)"
      },
      san: {
        label: "SAN",
        description: "Baie SAN ou appliance block storage"
      },
      virtuel: {
        label: "Virtuel",
        description: "Stockage virtuel, vSAN ou VM dédiée"
      },
      cloud: {
        label: "Cloud",
        description: "Stockage managé cloud (Azure, AWS…)"
      },
      robot: {
        label: "Robot sauvegarde",
        description: "Robot de bandes ou librairie RDX"
      },
      externe: {
        label: "Disque externe",
        description: "Disque USB ou rotation externe"
      }
    },
    router: {
      Routeur: {
        label: "Routeur",
        description: "Routeur edge, box opérateur ou appliance"
      },
      "SD-WAN": {
        label: "SD-WAN",
        description: "Overlay SD-WAN, orchestrateur ou service cloud"
      }
    },
    alimentation: {
      Onduleur: {
        label: "Onduleur (UPS sur site)",
        description: "UPS rack ou tour · offline, line-interactive ou online"
      },
      PDU: {
        label: "PDU (baie rack)",
        description: "Bandeau de prises en baie · basique, mesuré, commuté ou managé"
      }
    },
    toip: {
      "IP-PBX": {
        label: "IP-PBX (sur site / VM)",
        description: "Autocommutateur IP local ou virtualisé (3CX, Yeastar, CUCM…)"
      },
      Passerelle: {
        label: "Passerelle (trunk SIP)",
        description: "Passerelle FXO/FXS ou trunk SIP vers l'opérateur"
      },
      SBC: {
        label: "SBC (bordure SIP)",
        description: "Session Border Controller en périphérie du réseau VoIP"
      },
      "Téléphone IP": {
        label: "Téléphone IP (poste)",
        description: "Poste de bureau, DECT, conférence ou softphone matérialisé"
      },
      Autre: {
        label: "Autre",
        description: "Équipement VoIP non listé"
      }
    }
  },
  profiles: {
    firewall: {
      materiel: {
        hardwareLabel: "Matériel",
        hardwareDescription: "Marque, modèle, n° de série et garantie",
        modelLabel: "Modèle",
        modelPlaceholder: "FortiGate 60F",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "4.8.1",
        adminUrlPlaceholder: "https://192.168.10.1:10443"
      },
      virtuel: {
        hardwareLabel: "VM / Appliance virtuelle",
        hardwareDescription: "Marque, modèle VM et version firmware",
        modelLabel: "Modèle VM",
        modelPlaceholder: "FortiGate-VM64",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "7.4.3",
        adminUrlPlaceholder: "https://192.168.10.1:10443"
      },
      cloud: {
        hardwareLabel: "Plateforme",
        hardwareDescription: "Fournisseur cloud et offre souscrite",
        modelLabel: "Offre / Service",
        modelPlaceholder: "Prisma Access",
        adminUrlPlaceholder: "https://admin.cloudprovider.com"
      },
      logiciel: {
        hardwareLabel: "Logiciel",
        hardwareDescription: "Distribution et version installée",
        modelLabel: "Distribution",
        modelPlaceholder: "pfSense CE",
        firmwareLabel: "Version",
        firmwarePlaceholder: "2.7.2",
        adminUrlPlaceholder: "https://192.168.10.1"
      },
      autre: {
        hardwareLabel: "Matériel",
        hardwareDescription: "Marque, modèle et caractéristiques",
        modelLabel: "Modèle",
        modelPlaceholder: "FortiGate 60F",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "4.8.1",
        adminUrlPlaceholder: "https://192.168.10.1:10443"
      }
    },
    router: {
      Routeur: {
        hardwareLabel: "Matériel",
        hardwareDescription: "Marque, modèle, n° de série et garantie",
        modelLabel: "Modèle",
        modelPlaceholder: "ISR 4331",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "17.9.4",
        adminUrlPlaceholder: "https://192.168.1.1"
      },
      "SD-WAN": {
        hardwareLabel: "Plateforme SD-WAN",
        hardwareDescription: "Fournisseur et offre souscrite",
        modelLabel: "Offre / Service",
        modelPlaceholder: "Prisma SD-WAN",
        adminUrlPlaceholder: "https://admin.sdwan.example.com"
      }
    },
    server: {
      physique: {
        hardwareLabel: "Matériel",
        hardwareDescription: "Marque, modèle, n° de série et garantie",
        systemLabel: "Système",
        systemDescription: "OS, CPU, RAM, stockage et rôles",
        modelPlaceholder: "ProLiant DL360 Gen11",
        namePlaceholder: "SRV-AD-01",
        cpuLabel: "Processeur"
      },
      virtuel: {
        systemLabel: "Ressources VM",
        systemDescription: "Hyperviseur, vCPU, RAM et OS",
        namePlaceholder: "VM-APP-01",
        cpuLabel: "vCPU"
      }
    },
    storage: {
      nas: {
        modelPlaceholder: "DS923+",
        namePlaceholder: "NAS-Sauvegarde"
      },
      san: {
        modelPlaceholder: "PowerStore 500T",
        namePlaceholder: "SAN-Prod-01"
      },
      virtuel: {
        modelPlaceholder: "TrueNAS Scale VM",
        namePlaceholder: "VM-STORAGE-01"
      },
      cloud: {
        modelPlaceholder: "Azure Files Premium",
        namePlaceholder: "CLOUD-BACKUP"
      },
      robot: {
        modelPlaceholder: "Scalar i3",
        namePlaceholder: "ROBOT-BACKUP"
      },
      externe: {
        modelPlaceholder: "Expansion Desktop 8 To",
        namePlaceholder: "DD-Externe-01"
      }
    },
    alimentation: {
      Onduleur: {
        modelPlaceholder: "Smart-UPS 1500",
        managementLabel: "Onduleur manageable",
        managementHint: "Onduleur avec carte réseau ou interface web de supervision.",
        adminUrlPlaceholder: "https://192.168.1.51 ou interface NMC/APC"
      },
      PDU: {
        modelPlaceholder: "AP8941",
        managementLabel: "PDU manageable",
        managementHint: "PDU avec interface web ou SNMP pour supervision des prises et consommation.",
        adminUrlPlaceholder: "https://192.168.1.50 ou https://pdu.example.com"
      }
    },
    toip: {
      "IP-PBX": {
        extensionsLabel: "Nombre d'extensions",
        extensionsPlaceholder: "48",
        firmwareLabel: "Version logiciel",
        firmwarePlaceholder: "20.0 Update 1",
        managementLabel: "IP-PBX manageable",
        managementHint: "Console web ou interface d'administration de la solution VoIP.",
        adminUrlPlaceholder: "https://pbx.exemple.fr:5001 ou https://3cx.example.com",
        modelPlaceholder: "P-Series"
      },
      Passerelle: {
        extensionsLabel: "Nombre de lignes / canaux",
        extensionsPlaceholder: "8",
        firmwareLabel: "Version logiciel",
        firmwarePlaceholder: "20.0 Update 1",
        managementLabel: "Équipement manageable",
        managementHint: "Console web ou interface d'administration de la solution VoIP.",
        adminUrlPlaceholder: "https://192.168.1.60",
        modelPlaceholder: "TA400"
      },
      SBC: {
        extensionsLabel: "Nombre de lignes / canaux",
        extensionsPlaceholder: "8",
        firmwareLabel: "Version logiciel",
        firmwarePlaceholder: "20.0 Update 1",
        managementLabel: "SBC manageable",
        managementHint: "Console web ou interface d'administration de la solution VoIP.",
        adminUrlPlaceholder: "https://192.168.1.60",
        modelPlaceholder: "Mediant VE"
      },
      "Téléphone IP": {
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "96.36.199.66",
        modelPlaceholder: "T46U"
      },
      Autre: {
        extensionsLabel: "Nombre de lignes / canaux",
        extensionsPlaceholder: "8",
        firmwareLabel: "Version logiciel",
        firmwarePlaceholder: "20.0 Update 1",
        modelPlaceholder: "Solution VoIP"
      }
    }
  },
  formatCustomModelAria: label => `${label} personnalisé`,
  namePlaceholders: {
    Internet: "INT-Principale-Siège",
    Firewalls: "FW-Siège-Bordeaux",
    Serveurs: "SRV-AD-01",
    NAS: "NAS-Sauvegarde",
    Switch: "SW-Core-BA",
    BorneWifi: "AP-RDC",
    Alimentation: "PDU-Baie-A",
    Routeur: "RT-Siège",
    TOIP: "PBX-Siège"
  }
};
const EN = {
  fields: {
    name: "Name",
    nameVeritas: "Veritas name",
    netbios: "NetBIOS name",
    netbiosReadonlyTitle: "Name reported by the RMM agent (read-only)",
    netbiosManualHint: "Optional. Helps match the device when serial number or MAC is missing.",
    domain: "Domain / workgroup",
    domainPlaceholder: "example.local",
    location: "Site",
    locationPlaceholder: "Search or enter a site…",
    deploymentType: "Deployment type",
    serverType: "Server type",
    storageType: "Storage type",
    equipmentType: "Equipment type",
    ipAddress: "IP address",
    ipPlaceholder: "192.168.10.1",
    vlan: "VLAN",
    vlanPlaceholder: "10",
    adminUrl: "Admin URL",
    adminUrlSupervision: "Admin / monitoring URL",
    macAddress: "MAC address",
    macPlaceholder: "00:11:22:33:44:55",
    manageableEquipment: "Manageable device",
    manageableSwitch: "Manageable switch",
    yes: "Yes",
    no: "No",
    switchManageableHint: "A manageable switch has a configuration interface (web, CLI or controller).",
    notes: "Notes",
    notesFirewallPlaceholder: "SSL VPN, Stormshield support access…",
    notesRouterPlaceholder: "Support access, MPLS tunnel, failover procedure…",
    notesServerPlaceholder: "iLO/iDRAC access, failover procedure, support contacts…",
    notesStoragePlaceholder: "Admin access, restore procedure, support contacts…",
    notesSwitchPlaceholder: "Stacking, uplink ports, UniFi access, failover procedure…",
    notesWifiPlaceholder: "WiFi controller, physical location, coverage, reset procedure…",
    notesAlimentationPlaceholder: "Rack location, shutdown procedure, support contacts, battery notes…",
    notesToipPlaceholder: "SIP trunk, failover procedure, integrator contacts, licenses…",
    notesComputerPlaceholder: "Primary user, desk location, replacement procedure…",
    brand: "Brand",
    model: "Model",
    otherBrandName: "Brand name",
    otherModelManual: "Other (manual entry)",
    otherTile: "Other",
    serialNumber: "Serial no.",
    warrantyEnd: "Warranty (end)",
    firmware: "Firmware",
    softwareVersion: "Software version",
    poePowered: "PoE powered",
    poeSupport: "PoE support",
    stackable: "Stackable",
    cloudServiceResource: "Service / resource",
    sipDomain: "SIP domain",
    sipDomainPlaceholder: "pbx.example.com",
    capacityVa: "Capacity (VA)",
    powerW: "Power (W)",
    outletCount: "Outlet count",
    batteryReplacementDate: "Battery date (replacement)",
    haMode: "HA mode",
    haRole: "HA role",
    haPartnerName: "HA peer name",
    haRolePrimary: "Primary",
    haRoleSecondary: "Secondary",
    haNoFirewallAvailable: "No firewall available",
    haSelectFirewall: "Select a firewall",
    haNoPartnerHint: "No other firewall without high availability on this client.",
    hypervisorPlatform: "Hypervisor / platform",
    osSystem: "OS / system",
    currentValueSuffix: "(current)",
    roles: "Roles",
    rolesPlaceholder: "Select roles",
    storageRole: "Role",
    quickConnect: "QuickConnect",
    quickConnectPlaceholder: "mynas.quickconnect.to",
    raid: "RAID",
    totalCapacity: "Total capacity",
    diskRotationNumber: "Disk no. (rotation)",
    provider: "Provider",
    providerPlaceholder: "ISP name…",
    category: "Category",
    categoryLinkAria: "Link category",
    downloadSpeed: "Download speed",
    uploadSpeed: "Upload speed",
    speedPlaceholder: "100 Mbps, 1 Gbps…",
    publicIp: "Public IP address",
    fixedIp: "Fixed IP",
    nonFixedIp: "Non-fixed IP",
    nonFixedIpHint: "This connection will be saved without a fixed public IP.",
    publicIpPlaceholder: "82.64.12.34",
    gateway: "Gateway",
    gatewayPlaceholder: "192.168.1.254",
    lineIdentifier: "Line / identifier no.",
    lineIdentifierPlaceholder: "Carrier line reference",
    contractNumber: "Contract no.",
    contractNumberPlaceholder: "Subscription reference",
    operatorSupport: "Carrier support",
    operatorSupportPlaceholder: "Support number or URL",
    boxModem: "Box / modem",
    boxModemPlaceholder: "CPE or carrier router model",
    serviceStartDate: "In-service date",
    internetNotesPlaceholder: "SLA, support hours, useful information…",
    defaultEquipmentName: "Equipment name",
    namePlaceholderSdwan: "SDWAN-HQ",
    switchModelPlaceholder: "USW-Pro-48-PoE",
    wifiModelPlaceholder: "U6 Pro",
    toipBrandPlaceholder: "3CX",
    dashOption: "-",
    cpuLabelDefault: "Processor / vCPU"
  },
  moduleSectionDescriptions: {
    Internet: {
      identity: "Name and sites",
      internetType: "Access technology",
      internetLink: "Sites, provider and bandwidth",
      internetNetwork: "Public IP and gateway",
      internetContract: "References and support",
      internetNotes: "Additional information"
    },
    Firewalls: {
      identity: "Name, sites and deployment type",
      hardware: "Brand, model, serial and warranty",
      network: "IP, VLAN and admin URL",
      ha: "Firewall cluster and HA peer",
      licences: "Licenses and expiry dates",
      notes: "Access, procedures and useful information"
    },
    Serveurs: {
      identity: "Name, sites and type (Physical / Virtual)",
      hardware: "Brand, model, serial and warranty",
      network: "IP address and VLAN",
      system: "OS, resources and roles",
      remote: "Remote solution and connection ID",
      notes: "Access, procedures and useful information"
    },
    Stockage: {
      identity: "Name, sites and storage type",
      hardware: "Brand, model and serial",
      network: "IP address and VLAN",
      storage: "Role, RAID, capacity and disks",
      notes: "Access, procedures and useful information"
    },
    Switch: {
      identity: "Name and sites",
      hardware: "Brand, model, firmware and features",
      network: "IP address, VLAN and MAC",
      management: "Manageability and admin interface",
      notes: "Access, procedures and useful information"
    },
    BorneWifi: {
      identity: "Name and sites",
      hardware: "Brand, model, serial and firmware",
      network: "IP address, VLAN and MAC",
      wifi: "SSIDs broadcast by the AP",
      notes: "Access, procedures and useful information"
    },
    Alimentation: {
      identity: "Name, sites and deployment type (UPS / PDU)",
      hardware: "Brand, model, serial, firmware and warranty",
      power: "Capacity, outlets and battery",
      network: "IP address, VLAN and MAC",
      management: "Network management and web interface",
      notes: "Access, procedures and useful information"
    },
    Routeur: {
      identity: "Name, sites and type (Router / SD-WAN)",
      hardware: "Brand, model and characteristics",
      network: "IP, VLAN and admin URL",
      notes: "Access, procedures and useful information"
    },
    TOIP: {
      identity: "Name, sites and VoIP deployment type",
      hardware: "Brand, model, serial and firmware",
      voip: "Extensions, SIP domain and version",
      network: "IP address, VLAN and MAC",
      management: "Admin console and monitoring",
      notes: "Access, procedures and useful information"
    }
  },
  internetCategories: {
    Principale: "Primary",
    Backup: "Backup"
  },
  internetConnectionCategories: {
    wired: "Wired",
    wireless: "Wireless",
    satellite: "Satellite",
    sdwan: "SD-WAN",
    other: "Other"
  },
  internetConnectionTypes: {
    Fibre: "Fiber",
    ADSL: "ADSL",
    SDSL: "SDSL",
    VDSL: "VDSL",
    "4G": "4G",
    "5G": "5G",
    Satellite: "Satellite",
    Câble: "Cable",
    Radio: "Radio",
    "SD-WAN": "SD-WAN",
    Autre: "Other"
  },
  typeOptions: {
    firewall: {
      materiel: {
        label: "Hardware",
        description: "Physical appliance (FortiGate, Stormshield…)"
      },
      virtuel: {
        label: "Virtual",
        description: "Virtual machine (FortiGate VM, vSN…)"
      },
      cloud: {
        label: "Cloud",
        description: "FWaaS / managed cloud firewall"
      },
      logiciel: {
        label: "Software",
        description: "Software firewall (pfSense, OPNsense, DynFi…)"
      },
      autre: {
        label: "Other",
        description: "Other deployment mode"
      }
    },
    server: {
      physique: {
        label: "Physical",
        description: "Bare-metal, blade or tower"
      },
      virtuel: {
        label: "Virtual",
        description: "On-prem or cloud virtual machine"
      }
    },
    storage: {
      nas: {
        label: "NAS",
        description: "NAS appliance (Synology, QNAP…)"
      },
      san: {
        label: "SAN",
        description: "SAN array or block storage appliance"
      },
      virtuel: {
        label: "Virtual",
        description: "Virtual storage, vSAN or dedicated VM"
      },
      cloud: {
        label: "Cloud",
        description: "Managed cloud storage (Azure, AWS…)"
      },
      robot: {
        label: "Backup robot",
        description: "Tape library or RDX loader"
      },
      externe: {
        label: "External disk",
        description: "USB disk or external rotation"
      }
    },
    router: {
      Routeur: {
        label: "Router",
        description: "Edge router, ISP box or appliance"
      },
      "SD-WAN": {
        label: "SD-WAN",
        description: "SD-WAN overlay, orchestrator or cloud service"
      }
    },
    alimentation: {
      Onduleur: {
        label: "UPS (on-site)",
        description: "Rack or tower UPS · offline, line-interactive or online"
      },
      PDU: {
        label: "PDU (rack)",
        description: "Rack PDU · basic, metered, switched or managed"
      }
    },
    toip: {
      "IP-PBX": {
        label: "IP-PBX (on-site / VM)",
        description: "Local or virtual IP PBX (3CX, Yeastar, CUCM…)"
      },
      Passerelle: {
        label: "Gateway (SIP trunk)",
        description: "FXO/FXS gateway or SIP trunk to carrier"
      },
      SBC: {
        label: "SBC (SIP border)",
        description: "Session Border Controller at VoIP network edge"
      },
      "Téléphone IP": {
        label: "IP phone (handset)",
        description: "Desk phone, DECT, conference or softphone device"
      },
      Autre: {
        label: "Other",
        description: "Unlisted VoIP equipment"
      }
    }
  },
  profiles: {
    firewall: {
      materiel: {
        hardwareLabel: "Hardware",
        hardwareDescription: "Brand, model, serial and warranty",
        modelLabel: "Model",
        modelPlaceholder: "FortiGate 60F",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "4.8.1",
        adminUrlPlaceholder: "https://192.168.10.1:10443"
      },
      virtuel: {
        hardwareLabel: "VM / virtual appliance",
        hardwareDescription: "Brand, VM model and firmware version",
        modelLabel: "VM model",
        modelPlaceholder: "FortiGate-VM64",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "7.4.3",
        adminUrlPlaceholder: "https://192.168.10.1:10443"
      },
      cloud: {
        hardwareLabel: "Platform",
        hardwareDescription: "Cloud provider and subscribed offer",
        modelLabel: "Offer / service",
        modelPlaceholder: "Prisma Access",
        adminUrlPlaceholder: "https://admin.cloudprovider.com"
      },
      logiciel: {
        hardwareLabel: "Software",
        hardwareDescription: "Distribution and installed version",
        modelLabel: "Distribution",
        modelPlaceholder: "pfSense CE",
        firmwareLabel: "Version",
        firmwarePlaceholder: "2.7.2",
        adminUrlPlaceholder: "https://192.168.10.1"
      },
      autre: {
        hardwareLabel: "Hardware",
        hardwareDescription: "Brand, model and characteristics",
        modelLabel: "Model",
        modelPlaceholder: "FortiGate 60F",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "4.8.1",
        adminUrlPlaceholder: "https://192.168.10.1:10443"
      }
    },
    router: {
      Routeur: {
        hardwareLabel: "Hardware",
        hardwareDescription: "Brand, model, serial and warranty",
        modelLabel: "Model",
        modelPlaceholder: "ISR 4331",
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "17.9.4",
        adminUrlPlaceholder: "https://192.168.1.1"
      },
      "SD-WAN": {
        hardwareLabel: "SD-WAN platform",
        hardwareDescription: "Provider and subscribed offer",
        modelLabel: "Offer / service",
        modelPlaceholder: "Prisma SD-WAN",
        adminUrlPlaceholder: "https://admin.sdwan.example.com"
      }
    },
    server: {
      physique: {
        hardwareLabel: "Hardware",
        hardwareDescription: "Brand, model, serial and warranty",
        systemLabel: "System",
        systemDescription: "OS, CPU, RAM, storage and roles",
        modelPlaceholder: "ProLiant DL360 Gen11",
        namePlaceholder: "SRV-AD-01",
        cpuLabel: "Processor"
      },
      virtuel: {
        systemLabel: "VM resources",
        systemDescription: "Hypervisor, vCPU, RAM and OS",
        namePlaceholder: "VM-APP-01",
        cpuLabel: "vCPU"
      }
    },
    storage: {
      nas: {
        modelPlaceholder: "DS923+",
        namePlaceholder: "NAS-Backup"
      },
      san: {
        modelPlaceholder: "PowerStore 500T",
        namePlaceholder: "SAN-Prod-01"
      },
      virtuel: {
        modelPlaceholder: "TrueNAS Scale VM",
        namePlaceholder: "VM-STORAGE-01"
      },
      cloud: {
        modelPlaceholder: "Azure Files Premium",
        namePlaceholder: "CLOUD-BACKUP"
      },
      robot: {
        modelPlaceholder: "Scalar i3",
        namePlaceholder: "ROBOT-BACKUP"
      },
      externe: {
        modelPlaceholder: "Expansion Desktop 8 TB",
        namePlaceholder: "EXT-DISK-01"
      }
    },
    alimentation: {
      Onduleur: {
        modelPlaceholder: "Smart-UPS 1500",
        managementLabel: "Manageable UPS",
        managementHint: "UPS with network card or web supervision interface.",
        adminUrlPlaceholder: "https://192.168.1.51 or NMC/APC interface"
      },
      PDU: {
        modelPlaceholder: "AP8941",
        managementLabel: "Manageable PDU",
        managementHint: "PDU with web or SNMP interface for outlet and power monitoring.",
        adminUrlPlaceholder: "https://192.168.1.50 or https://pdu.example.com"
      }
    },
    toip: {
      "IP-PBX": {
        extensionsLabel: "Extension count",
        extensionsPlaceholder: "48",
        firmwareLabel: "Software version",
        firmwarePlaceholder: "20.0 Update 1",
        managementLabel: "Manageable IP-PBX",
        managementHint: "Web console or VoIP solution admin interface.",
        adminUrlPlaceholder: "https://pbx.example.com:5001",
        modelPlaceholder: "P-Series"
      },
      Passerelle: {
        extensionsLabel: "Line / channel count",
        extensionsPlaceholder: "8",
        firmwareLabel: "Software version",
        firmwarePlaceholder: "20.0 Update 1",
        managementLabel: "Manageable device",
        managementHint: "Web console or VoIP solution admin interface.",
        adminUrlPlaceholder: "https://192.168.1.60",
        modelPlaceholder: "TA400"
      },
      SBC: {
        extensionsLabel: "Line / channel count",
        extensionsPlaceholder: "8",
        firmwareLabel: "Software version",
        firmwarePlaceholder: "20.0 Update 1",
        managementLabel: "Manageable SBC",
        managementHint: "Web console or VoIP solution admin interface.",
        adminUrlPlaceholder: "https://192.168.1.60",
        modelPlaceholder: "Mediant VE"
      },
      "Téléphone IP": {
        firmwareLabel: "Firmware",
        firmwarePlaceholder: "96.36.199.66",
        modelPlaceholder: "T46U"
      },
      Autre: {
        extensionsLabel: "Line / channel count",
        extensionsPlaceholder: "8",
        firmwareLabel: "Software version",
        firmwarePlaceholder: "20.0 Update 1",
        modelPlaceholder: "VoIP solution"
      }
    }
  },
  formatCustomModelAria: label => `Custom ${label}`,
  namePlaceholders: {
    Internet: "INT-Primary-HQ",
    Firewalls: "FW-HQ",
    Serveurs: "SRV-AD-01",
    NAS: "NAS-Backup",
    Switch: "SW-Core",
    BorneWifi: "AP-GF",
    Alimentation: "PDU-Rack-A",
    Routeur: "RT-HQ",
    TOIP: "PBX-HQ"
  }
};
const DE = {
  ...EN,
  formatCustomModelAria: label => `Benutzerdefiniertes ${label}`,
  fields: {
    ...EN.fields,
    name: "Name",
    location: "Standort",
    locationPlaceholder: "Standort suchen oder eingeben…",
    yes: "Ja",
    no: "Nein",
    notes: "Notizen",
    brand: "Marke",
    model: "Modell",
    otherBrandName: "Markenname",
    otherModelManual: "Andere (manuelle Eingabe)",
    otherTile: "Andere",
    roles: "Rollen",
    rolesPlaceholder: "Rollen auswählen",
    storageRole: "Rolle",
    totalCapacity: "Gesamtkapazität",
    hypervisorPlatform: "Hypervisor / Plattform",
    osSystem: "OS / System",
    raid: "RAID",
    quickConnect: "QuickConnect",
    cpuLabelDefault: "Prozessor / vCPU"
  },
  internetCategories: {
    Principale: "Primär",
    Backup: "Backup"
  },
  internetConnectionCategories: {
    wired: "Kabelgebunden",
    wireless: "Drahtlos",
    satellite: "Satellit",
    sdwan: "SD-WAN",
    other: "Andere"
  },
  internetConnectionTypes: {
    Fibre: "Glasfaser",
    ADSL: "ADSL",
    SDSL: "SDSL",
    VDSL: "VDSL",
    "4G": "4G",
    "5G": "5G",
    Satellite: "Satellit",
    Câble: "Kabel",
    Radio: "Funk",
    "SD-WAN": "SD-WAN",
    Autre: "Andere"
  }
};
const IT = {
  ...EN,
  formatCustomModelAria: label => `${label} personalizzato`,
  fields: {
    ...EN.fields,
    name: "Nome",
    location: "Sede",
    locationPlaceholder: "Cerca o inserisci una sede…",
    yes: "Sì",
    no: "No",
    notes: "Note",
    brand: "Marca",
    model: "Modello",
    otherBrandName: "Nome marca",
    otherModelManual: "Altro (inserimento manuale)",
    otherTile: "Altro",
    roles: "Ruoli",
    rolesPlaceholder: "Seleziona i ruoli",
    storageRole: "Ruolo",
    totalCapacity: "Capacità totale",
    hypervisorPlatform: "Hypervisor / piattaforma",
    osSystem: "OS / sistema",
    raid: "RAID",
    quickConnect: "QuickConnect",
    cpuLabelDefault: "Processore / vCPU"
  },
  internetCategories: {
    Principale: "Principale",
    Backup: "Backup"
  },
  internetConnectionCategories: {
    wired: "Cablato",
    wireless: "Senza fili",
    satellite: "Satellitare",
    sdwan: "SD-WAN",
    other: "Altro"
  },
  internetConnectionTypes: {
    Fibre: "Fibra",
    ADSL: "ADSL",
    SDSL: "SDSL",
    VDSL: "VDSL",
    "4G": "4G",
    "5G": "5G",
    Satellite: "Satellite",
    Câble: "Cavo",
    Radio: "Radio",
    "SD-WAN": "SD-WAN",
    Autre: "Altro"
  }
};
const ES = {
  ...EN,
  formatCustomModelAria: label => `${label} personalizado`,
  fields: {
    ...EN.fields,
    name: "Nombre",
    location: "Sitio",
    locationPlaceholder: "Buscar o introducir un sitio…",
    yes: "Sí",
    no: "No",
    notes: "Notas",
    brand: "Marca",
    model: "Modelo",
    otherBrandName: "Nombre de marca",
    otherModelManual: "Otro (entrada manual)",
    otherTile: "Otro",
    roles: "Roles",
    rolesPlaceholder: "Seleccionar roles",
    storageRole: "Rol",
    totalCapacity: "Capacidad total",
    hypervisorPlatform: "Hipervisor / plataforma",
    osSystem: "SO / sistema",
    raid: "RAID",
    quickConnect: "QuickConnect",
    cpuLabelDefault: "Procesador / vCPU"
  },
  internetCategories: {
    Principale: "Principal",
    Backup: "Backup"
  },
  internetConnectionCategories: {
    wired: "Cableado",
    wireless: "Inalámbrico",
    satellite: "Satélite",
    sdwan: "SD-WAN",
    other: "Otro"
  },
  internetConnectionTypes: {
    Fibre: "Fibra",
    ADSL: "ADSL",
    SDSL: "SDSL",
    VDSL: "VDSL",
    "4G": "4G",
    "5G": "5G",
    Satellite: "Satélite",
    Câble: "Cable",
    Radio: "Radio",
    "SD-WAN": "SD-WAN",
    Autre: "Otro"
  }
};
export const EQUIPMENT_FORM_FIELDS = {
  fr: FR,
  en: EN,
  de: DE,
  it: IT,
  es: ES
};
export const getFormFields = createLocaleGetter(EQUIPMENT_FORM_FIELDS);
