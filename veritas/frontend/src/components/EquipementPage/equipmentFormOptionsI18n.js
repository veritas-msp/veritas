import { createLocaleGetter } from "../../i18n/translate";
import { SERVER_ROLE_GROUPS } from "./constants/serverRoleOptions";
import { STORAGE_RAID_OPTIONS, STORAGE_ROLE_OPTIONS } from "./constants/storageRoleOptions";
import { OS_OPTION_GROUPS, SERVER_HYPERVISOR_OPTIONS } from "./equipmentFormConfig";
const SERVER_ROLE_GROUP_LABELS_FR = {
  Infrastructure: "Infrastructure",
  "Annuaire & réseau": "Annuaire & réseau",
  "Fichiers & impression": "Fichiers & impression",
  "Bureau à distance & VDI": "Bureau à distance & VDI",
  Applications: "Applications",
  "Bases de données": "Bases de données",
  "Sauvegarde & reprise": "Sauvegarde & reprise",
  "Supervision & sécurité": "Supervision & sécurité",
  "Messagerie & collaboration": "Messagerie & collaboration",
  "Développement & DevOps": "Développement & DevOps",
  Autre: "Autre"
};
const SERVER_ROLE_OPTION_LABELS_FR = {
  Hôte: "Hôte",
  Hyperviseur: "Hyperviseur",
  Cluster: "Cluster",
  "Jump server / Bastion": "Jump server / Bastion",
  "Load balancer": "Équilibreur de charge",
  "Stockage SAN/NAS": "Stockage SAN/NAS",
  "Active Directory": "Active Directory",
  "Contrôleur de domaine": "Contrôleur de domaine",
  "Azure AD Connect": "Azure AD Connect",
  DNS: "DNS",
  DHCP: "DHCP",
  "NPS (Radius)": "NPS (Radius)",
  "PKI / Autorité de certification": "PKI / Autorité de certification",
  "WDS / PXE": "WDS / PXE",
  "NTP / Heure": "NTP / Heure",
  "WSUS / Mises à jour": "WSUS / Mises à jour",
  "Partage de fichiers": "Partage de fichiers",
  DFS: "DFS",
  Impression: "Impression",
  RDS: "RDS",
  "VDI / Citrix": "VDI / Citrix",
  RemoteApp: "RemoteApp",
  Application: "Application",
  "Web (IIS / Apache)": "Web (IIS / Apache)",
  "ERP / Métier": "ERP / Métier",
  API: "API",
  "Middleware / ESB": "Middleware / ESB",
  "SQL Server": "SQL Server",
  "Base de données": "Base de données",
  PostgreSQL: "PostgreSQL",
  "MySQL / MariaDB": "MySQL / MariaDB",
  MongoDB: "MongoDB",
  "Redis / Cache": "Redis / Cache",
  Sauvegarde: "Sauvegarde",
  Réplication: "Réplication",
  Archivage: "Archivage",
  "PRA / Site de secours": "PRA / Site de secours",
  Monitoring: "Monitoring",
  Supervision: "Supervision",
  "Syslog / SIEM": "Syslog / SIEM",
  "Antivirus / EDR": "Antivirus / EDR",
  "Proxy / Filtrage web": "Proxy / Filtrage web",
  VPN: "VPN",
  "Pare-feu applicatif (WAF)": "Pare-feu applicatif (WAF)",
  Exchange: "Exchange",
  Messagerie: "Messagerie",
  "Teams / Collab": "Teams / Collab",
  SharePoint: "SharePoint",
  "Git / CI-CD": "Git / CI-CD",
  "Conteneurs / Kubernetes": "Conteneurs / Kubernetes",
  "Registry / Artefacts": "Registry / Artefacts",
  Test: "Test",
  Autres: "Autres"
};
const SERVER_ROLE_GROUP_LABELS_EN = {
  Infrastructure: "Infrastructure",
  "Annuaire & réseau": "Directory & network",
  "Fichiers & impression": "Files & printing",
  "Bureau à distance & VDI": "Remote desktop & VDI",
  Applications: "Applications",
  "Bases de données": "Databases",
  "Sauvegarde & reprise": "Backup & recovery",
  "Supervision & sécurité": "Monitoring & security",
  "Messagerie & collaboration": "Messaging & collaboration",
  "Développement & DevOps": "Development & DevOps",
  Autre: "Other"
};
const SERVER_ROLE_OPTION_LABELS_EN = {
  Hôte: "Host",
  Hyperviseur: "Hypervisor",
  Cluster: "Cluster",
  "Jump server / Bastion": "Jump server / Bastion",
  "Load balancer": "Load balancer",
  "Stockage SAN/NAS": "SAN/NAS storage",
  "Active Directory": "Active Directory",
  "Contrôleur de domaine": "Domain controller",
  "Azure AD Connect": "Azure AD Connect",
  DNS: "DNS",
  DHCP: "DHCP",
  "NPS (Radius)": "NPS (RADIUS)",
  "PKI / Autorité de certification": "PKI / Certificate authority",
  "WDS / PXE": "WDS / PXE",
  "NTP / Heure": "NTP / Time",
  "WSUS / Mises à jour": "WSUS / Updates",
  "Partage de fichiers": "File sharing",
  DFS: "DFS",
  Impression: "Printing",
  RDS: "RDS",
  "VDI / Citrix": "VDI / Citrix",
  RemoteApp: "RemoteApp",
  Application: "Application",
  "Web (IIS / Apache)": "Web (IIS / Apache)",
  "ERP / Métier": "ERP / Line-of-business",
  API: "API",
  "Middleware / ESB": "Middleware / ESB",
  "SQL Server": "SQL Server",
  "Base de données": "Database",
  PostgreSQL: "PostgreSQL",
  "MySQL / MariaDB": "MySQL / MariaDB",
  MongoDB: "MongoDB",
  "Redis / Cache": "Redis / Cache",
  Sauvegarde: "Backup",
  Réplication: "Replication",
  Archivage: "Archiving",
  "PRA / Site de secours": "DR / Secondary site",
  Monitoring: "Monitoring",
  Supervision: "Supervision",
  "Syslog / SIEM": "Syslog / SIEM",
  "Antivirus / EDR": "Antivirus / EDR",
  "Proxy / Filtrage web": "Proxy / Web filtering",
  VPN: "VPN",
  "Pare-feu applicatif (WAF)": "Web application firewall (WAF)",
  Exchange: "Exchange",
  Messagerie: "Messaging",
  "Teams / Collab": "Teams / Collab",
  SharePoint: "SharePoint",
  "Git / CI-CD": "Git / CI-CD",
  "Conteneurs / Kubernetes": "Containers / Kubernetes",
  "Registry / Artefacts": "Registry / Artifacts",
  Test: "Test",
  Autres: "Other"
};
const STORAGE_ROLE_LABELS_FR = {
  "Stockage de sauvegarde": "Stockage de sauvegarde",
  "Stockage de fichiers communs": "Stockage de fichiers communs",
  "Stockage principal": "Stockage principal",
  "Stockage d'archivage": "Stockage d'archivage",
  "Stockage de réplication": "Stockage de réplication",
  "Stockage VM / vSAN": "Stockage VM / vSAN",
  "Stockage cloud / tiering": "Stockage cloud / tiering",
  Autre: "Autre"
};
const STORAGE_ROLE_LABELS_EN = {
  "Stockage de sauvegarde": "Backup storage",
  "Stockage de fichiers communs": "Shared file storage",
  "Stockage principal": "Primary storage",
  "Stockage d'archivage": "Archive storage",
  "Stockage de réplication": "Replication storage",
  "Stockage VM / vSAN": "VM / vSAN storage",
  "Stockage cloud / tiering": "Cloud / tiering storage",
  Autre: "Other"
};
const RAID_LABELS_FR = {
  Aucun: "Aucun",
  Autre: "Autre"
};
const RAID_LABELS_EN = {
  Aucun: "None",
  Autre: "Other"
};
const OS_GROUP_LABELS_FR = {
  "Windows Server": "Windows Server",
  "Windows client": "Windows client",
  "Linux · Ubuntu": "Linux · Ubuntu",
  "Linux · Debian": "Linux · Debian",
  Autre: "Autre"
};
const OS_GROUP_LABELS_EN = {
  "Windows Server": "Windows Server",
  "Windows client": "Windows client",
  "Linux · Ubuntu": "Linux · Ubuntu",
  "Linux · Debian": "Linux · Debian",
  Autre: "Other"
};
const HYPERVISOR_LABELS_FR = {
  Autre: "Autre"
};
const HYPERVISOR_LABELS_EN = {
  Autre: "Other"
};
const WIDGETS_FR = {
  roleTagsSelect: {
    filterPlaceholder: "Filtrer…",
    noMatch: "Aucun rôle correspondant",
    savedRoles: "Rôles enregistrés",
    removeAria: "Retirer {label}"
  },
  serverSpec: {
    ram: "RAM",
    storage: "Stockage",
    processorCountAria: "Nombre de processeurs",
    ramUnitAria: "Unité RAM",
    diskCountAria: "Nombre de disques {index}",
    diskCapacityAria: "Capacité disque {index}",
    diskUnitAria: "Unité disque {index}",
    diskTypeAria: "Type disque {index}",
    removeVolumeAria: "Retirer le volume {index}",
    addVolume: "Ajouter un volume",
    totalCapacityApprox: "Capacité totale ≈ {hint}",
    vcpuSuffix: "vCPU"
  },
  capacity: {
    unitGb: "Go",
    totalApprox: "≈ {hint}"
  },
  diskBay: {
    title: "Baies de disques",
    hint: "Cliquez sur une baie vide pour installer un disque, sur un disque pour le retirer, ou sur une baie vide en bout de ligne pour la supprimer.",
    installedSummary: "{active} / {max} installés",
    removeDiskAria: "Retirer le disque {index}",
    removeBayAria: "Supprimer la baie {index}",
    installDiskAria: "Installer un disque dans la baie {index}",
    bayUnavailableAria: "Baie {index} indisponible",
    diskCapacityAria: "Capacité du disque {index} en Go",
    removeBayButtonAria: "Supprimer une baie",
    addBayButtonAria: "Ajouter une baie",
    baysLabel: "Baies",
    legendInstalled: "Disque installé",
    legendEmpty: "Baie libre",
    unitGb: "Go"
  },
  remoteAccess: {
    title: "Solution de prise en main",
    identifier: "Identifiant",
    testLaunch: "Tester la connexion (ouvre le client)",
    copyId: "Copier l'identifiant",
    test: "Tester",
    copy: "Copier",
    solutions: {
      anydesk: {
        description: "Client AnyDesk installé sur le serveur",
        idLabel: "ID AnyDesk"
      },
      teamviewer: {
        description: "ID numérique TeamViewer",
        idLabel: "ID TeamViewer"
      },
      rustdesk: {
        description: "ID RustDesk ou code de connexion",
        idLabel: "ID RustDesk"
      },
      splashtop: {
        description: "Code session ou identifiant Splashtop",
        idLabel: "Identifiant Splashtop"
      },
      rdp: {
        label: "Bureau à distance (RDP)",
        description: "Adresse IP ou nom d'hôte Windows",
        idLabel: "Hôte RDP"
      },
      other: {
        label: "Autre",
        description: "Autre outil (identifiant libre)",
        idLabel: "Identifiant"
      }
    }
  }
};
const WIDGETS_EN = {
  roleTagsSelect: {
    filterPlaceholder: "Filter…",
    noMatch: "No matching role",
    savedRoles: "Saved roles",
    removeAria: "Remove {label}"
  },
  serverSpec: {
    ram: "RAM",
    storage: "Storage",
    processorCountAria: "Processor count",
    ramUnitAria: "RAM unit",
    diskCountAria: "Disk count {index}",
    diskCapacityAria: "Disk {index} capacity",
    diskUnitAria: "Disk {index} unit",
    diskTypeAria: "Disk {index} type",
    removeVolumeAria: "Remove volume {index}",
    addVolume: "Add volume",
    totalCapacityApprox: "Total capacity ≈ {hint}",
    vcpuSuffix: "vCPU"
  },
  capacity: {
    unitGb: "GB",
    totalApprox: "≈ {hint}"
  },
  diskBay: {
    title: "Disk bays",
    hint: "Click an empty bay to install a disk, a disk to remove it, or the trailing empty bay to remove the bay.",
    installedSummary: "{active} / {max} installed",
    removeDiskAria: "Remove disk {index}",
    removeBayAria: "Remove bay {index}",
    installDiskAria: "Install a disk in bay {index}",
    bayUnavailableAria: "Bay {index} unavailable",
    diskCapacityAria: "Disk {index} capacity in GB",
    removeBayButtonAria: "Remove a bay",
    addBayButtonAria: "Add a bay",
    baysLabel: "Bays",
    legendInstalled: "Installed disk",
    legendEmpty: "Empty bay",
    unitGb: "GB"
  },
  remoteAccess: {
    title: "Remote management solution",
    identifier: "Identifier",
    testLaunch: "Test connection (opens client)",
    copyId: "Copy identifier",
    test: "Test",
    copy: "Copy",
    solutions: {
      anydesk: {
        description: "AnyDesk client installed on the server",
        idLabel: "AnyDesk ID"
      },
      teamviewer: {
        description: "TeamViewer numeric ID",
        idLabel: "TeamViewer ID"
      },
      rustdesk: {
        description: "RustDesk ID or connection code",
        idLabel: "RustDesk ID"
      },
      splashtop: {
        description: "Splashtop session code or identifier",
        idLabel: "Splashtop identifier"
      },
      rdp: {
        label: "Remote desktop (RDP)",
        description: "IP address or Windows hostname",
        idLabel: "RDP host"
      },
      other: {
        label: "Other",
        description: "Other tool (free-form identifier)",
        idLabel: "Identifier"
      }
    }
  }
};
function mapSelectOptions(values, labelsMap) {
  return values.map(value => ({
    value,
    label: labelsMap?.[value] ?? value
  }));
}
function buildServerRoleGroups(groupLabels, optionLabels) {
  return SERVER_ROLE_GROUPS.map(group => ({
    label: groupLabels[group.label] ?? group.label,
    options: group.options.map(value => ({
      value,
      label: optionLabels[value] ?? value
    }))
  }));
}
function buildOsOptionGroups(groupLabels) {
  return OS_OPTION_GROUPS.map(group => ({
    label: groupLabels[group.label] ?? group.label,
    options: group.options
  }));
}
function buildLocalePack({
  serverRoleGroupLabels,
  serverRoleOptionLabels,
  storageRoleLabels,
  raidLabels,
  osGroupLabels,
  hypervisorLabels,
  widgets
}) {
  const serverRoleGroups = buildServerRoleGroups(serverRoleGroupLabels, serverRoleOptionLabels);
  return {
    serverRoleGroups,
    serverRoleOptions: serverRoleGroups.flatMap(group => group.options),
    storageRoleOptions: mapSelectOptions(STORAGE_ROLE_OPTIONS, storageRoleLabels),
    storageRaidOptions: mapSelectOptions(STORAGE_RAID_OPTIONS, raidLabels),
    osOptionGroups: buildOsOptionGroups(osGroupLabels),
    hypervisorOptions: mapSelectOptions(SERVER_HYPERVISOR_OPTIONS, hypervisorLabels),
    widgets
  };
}
const FR = buildLocalePack({
  serverRoleGroupLabels: SERVER_ROLE_GROUP_LABELS_FR,
  serverRoleOptionLabels: SERVER_ROLE_OPTION_LABELS_FR,
  storageRoleLabels: STORAGE_ROLE_LABELS_FR,
  raidLabels: RAID_LABELS_FR,
  osGroupLabels: OS_GROUP_LABELS_FR,
  hypervisorLabels: HYPERVISOR_LABELS_FR,
  widgets: WIDGETS_FR
});
const EN = buildLocalePack({
  serverRoleGroupLabels: SERVER_ROLE_GROUP_LABELS_EN,
  serverRoleOptionLabels: SERVER_ROLE_OPTION_LABELS_EN,
  storageRoleLabels: STORAGE_ROLE_LABELS_EN,
  raidLabels: RAID_LABELS_EN,
  osGroupLabels: OS_GROUP_LABELS_EN,
  hypervisorLabels: HYPERVISOR_LABELS_EN,
  widgets: WIDGETS_EN
});
const DE = {
  ...EN,
  serverRoleGroups: buildServerRoleGroups({
    ...SERVER_ROLE_GROUP_LABELS_EN,
    Infrastructure: "Infrastruktur",
    "Annuaire & réseau": "Verzeichnis & Netzwerk",
    "Fichiers & impression": "Dateien & Druck",
    "Bureau à distance & VDI": "Remotedesktop & VDI",
    "Bases de données": "Datenbanken",
    "Sauvegarde & reprise": "Backup & Wiederherstellung",
    "Supervision & sécurité": "Überwachung & Sicherheit",
    "Messagerie & collaboration": "Messaging & Zusammenarbeit",
    "Développement & DevOps": "Entwicklung & DevOps",
    Autre: "Sonstige"
  }, {
    ...SERVER_ROLE_OPTION_LABELS_EN,
    Hôte: "Host",
    Hyperviseur: "Hypervisor",
    "Load balancer": "Load Balancer",
    "Stockage SAN/NAS": "SAN/NAS-Speicher",
    "Contrôleur de domaine": "Domänencontroller",
    "Partage de fichiers": "Dateifreigabe",
    Impression: "Drucken",
    Sauvegarde: "Backup",
    Réplication: "Replikation",
    Archivage: "Archivierung",
    Messagerie: "Messaging",
    Autres: "Sonstige"
  }),
  storageRoleOptions: mapSelectOptions(STORAGE_ROLE_OPTIONS, {
    ...STORAGE_ROLE_LABELS_EN,
    "Stockage de sauvegarde": "Backup-Speicher",
    "Stockage de fichiers communs": "Gemeinsamer Dateispeicher",
    "Stockage principal": "Primärspeicher",
    "Stockage d'archivage": "Archivspeicher",
    "Stockage de réplication": "Replikationsspeicher",
    Autre: "Sonstige"
  }),
  storageRaidOptions: mapSelectOptions(STORAGE_RAID_OPTIONS, {
    Aucun: "Keine",
    Autre: "Sonstige"
  }),
  osOptionGroups: buildOsOptionGroups({
    ...OS_GROUP_LABELS_EN,
    Autre: "Sonstige"
  }),
  hypervisorOptions: mapSelectOptions(SERVER_HYPERVISOR_OPTIONS, {
    Autre: "Sonstige"
  }),
  widgets: {
    ...WIDGETS_EN,
    roleTagsSelect: {
      filterPlaceholder: "Filtern…",
      noMatch: "Keine passende Rolle",
      savedRoles: "Gespeicherte Rollen",
      removeAria: "{label} entfernen"
    },
    serverSpec: {
      ...WIDGETS_EN.serverSpec,
      storage: "Speicher",
      addVolume: "Volume hinzufügen",
      totalCapacityApprox: "Gesamtkapazität ≈ {hint}"
    },
    diskBay: {
      ...WIDGETS_EN.diskBay,
      title: "Festplatteneinschübe",
      hint: "Klicken Sie auf einen leeren Einschub, um eine Festplatte einzusetzen, auf eine Festplatte, um sie zu entfernen, oder auf den letzten leeren Einschub, um ihn zu entfernen.",
      installedSummary: "{active} / {max} installiert",
      legendInstalled: "Festplatte installiert",
      legendEmpty: "Freier Einschub",
      baysLabel: "Einschübe"
    },
    remoteAccess: {
      ...WIDGETS_EN.remoteAccess,
      title: "Fernwartungslösung",
      identifier: "Kennung",
      solutions: {
        ...WIDGETS_EN.remoteAccess.solutions,
        rdp: {
          label: "Remotedesktop (RDP)",
          description: "IP-Adresse oder Windows-Hostname",
          idLabel: "RDP-Host"
        },
        other: {
          label: "Sonstige",
          description: "Anderes Tool (freie Kennung)",
          idLabel: "Kennung"
        }
      }
    }
  }
};
DE.serverRoleOptions = DE.serverRoleGroups.flatMap(group => group.options);
const IT = {
  ...EN,
  serverRoleGroups: buildServerRoleGroups({
    ...SERVER_ROLE_GROUP_LABELS_EN,
    Infrastructure: "Infrastruttura",
    "Annuaire & réseau": "Directory e rete",
    "Fichiers & impression": "File e stampa",
    "Bureau à distance & VDI": "Desktop remoto e VDI",
    "Bases de données": "Database",
    "Sauvegarde & reprise": "Backup e ripristino",
    "Supervision & sécurité": "Monitoraggio e sicurezza",
    "Messagerie & collaboration": "Messaggistica e collaborazione",
    "Développement & DevOps": "Sviluppo e DevOps",
    Autre: "Altro"
  }, {
    ...SERVER_ROLE_OPTION_LABELS_EN,
    Hôte: "Host",
    Hyperviseur: "Hypervisor",
    "Load balancer": "Bilanciatore di carico",
    "Stockage SAN/NAS": "Storage SAN/NAS",
    "Contrôleur de domaine": "Controller di dominio",
    "Partage de fichiers": "Condivisione file",
    Impression: "Stampa",
    Sauvegarde: "Backup",
    Réplication: "Replica",
    Archivage: "Archiviazione",
    Messagerie: "Messaggistica",
    Autres: "Altro"
  }),
  storageRoleOptions: mapSelectOptions(STORAGE_ROLE_OPTIONS, {
    ...STORAGE_ROLE_LABELS_EN,
    "Stockage de sauvegarde": "Storage di backup",
    "Stockage de fichiers communs": "Storage file condivisi",
    "Stockage principal": "Storage principale",
    "Stockage d'archivage": "Storage di archivio",
    "Stockage de réplication": "Storage di replica",
    Autre: "Altro"
  }),
  storageRaidOptions: mapSelectOptions(STORAGE_RAID_OPTIONS, {
    Aucun: "Nessuno",
    Autre: "Altro"
  }),
  osOptionGroups: buildOsOptionGroups({
    ...OS_GROUP_LABELS_EN,
    Autre: "Altro"
  }),
  hypervisorOptions: mapSelectOptions(SERVER_HYPERVISOR_OPTIONS, {
    Autre: "Altro"
  }),
  widgets: {
    ...WIDGETS_EN,
    roleTagsSelect: {
      filterPlaceholder: "Filtra…",
      noMatch: "Nessun ruolo corrispondente",
      savedRoles: "Ruoli salvati",
      removeAria: "Rimuovi {label}"
    },
    serverSpec: {
      ...WIDGETS_EN.serverSpec,
      storage: "Storage",
      addVolume: "Aggiungi volume",
      totalCapacityApprox: "Capacità totale ≈ {hint}"
    },
    diskBay: {
      ...WIDGETS_EN.diskBay,
      title: "Alloggiamenti disco",
      hint: "Clicca su un alloggiamento vuoto per installare un disco, su un disco per rimuoverlo, o sull'ultimo alloggiamento vuoto per eliminarlo.",
      installedSummary: "{active} / {max} installati",
      legendInstalled: "Disco installato",
      legendEmpty: "Alloggiamento libero",
      baysLabel: "Alloggiamenti"
    },
    remoteAccess: {
      ...WIDGETS_EN.remoteAccess,
      title: "Soluzione di gestione remota",
      identifier: "Identificativo",
      solutions: {
        ...WIDGETS_EN.remoteAccess.solutions,
        rdp: {
          label: "Desktop remoto (RDP)",
          description: "Indirizzo IP o nome host Windows",
          idLabel: "Host RDP"
        },
        other: {
          label: "Altro",
          description: "Altro strumento (identificativo libero)",
          idLabel: "Identificativo"
        }
      }
    }
  }
};
IT.serverRoleOptions = IT.serverRoleGroups.flatMap(group => group.options);
const ES = {
  ...EN,
  serverRoleGroups: buildServerRoleGroups({
    ...SERVER_ROLE_GROUP_LABELS_EN,
    Infrastructure: "Infraestructura",
    "Annuaire & réseau": "Directorio y red",
    "Fichiers & impression": "Archivos e impresión",
    "Bureau à distance & VDI": "Escritorio remoto y VDI",
    "Bases de données": "Bases de datos",
    "Sauvegarde & reprise": "Copia de seguridad y recuperación",
    "Supervision & sécurité": "Supervisión y seguridad",
    "Messagerie & collaboration": "Mensajería y colaboración",
    "Développement & DevOps": "Desarrollo y DevOps",
    Autre: "Otro"
  }, {
    ...SERVER_ROLE_OPTION_LABELS_EN,
    Hôte: "Host",
    Hyperviseur: "Hipervisor",
    "Load balancer": "Balanceador de carga",
    "Stockage SAN/NAS": "Almacenamiento SAN/NAS",
    "Contrôleur de domaine": "Controlador de dominio",
    "Partage de fichiers": "Compartición de archivos",
    Impression: "Impresión",
    Sauvegarde: "Copia de seguridad",
    Réplication: "Replicación",
    Archivage: "Archivo",
    Messagerie: "Mensajería",
    Autres: "Otro"
  }),
  storageRoleOptions: mapSelectOptions(STORAGE_ROLE_OPTIONS, {
    ...STORAGE_ROLE_LABELS_EN,
    "Stockage de sauvegarde": "Almacenamiento de backup",
    "Stockage de fichiers communs": "Almacenamiento de archivos compartidos",
    "Stockage principal": "Almacenamiento principal",
    "Stockage d'archivage": "Almacenamiento de archivo",
    "Stockage de réplication": "Almacenamiento de replicación",
    Autre: "Otro"
  }),
  storageRaidOptions: mapSelectOptions(STORAGE_RAID_OPTIONS, {
    Aucun: "Ninguno",
    Autre: "Otro"
  }),
  osOptionGroups: buildOsOptionGroups({
    ...OS_GROUP_LABELS_EN,
    Autre: "Otro"
  }),
  hypervisorOptions: mapSelectOptions(SERVER_HYPERVISOR_OPTIONS, {
    Autre: "Otro"
  }),
  widgets: {
    ...WIDGETS_EN,
    roleTagsSelect: {
      filterPlaceholder: "Filtrar…",
      noMatch: "Ningún rol coincidente",
      savedRoles: "Roles guardados",
      removeAria: "Quitar {label}"
    },
    serverSpec: {
      ...WIDGETS_EN.serverSpec,
      storage: "Almacenamiento",
      addVolume: "Añadir volumen",
      totalCapacityApprox: "Capacidad total ≈ {hint}"
    },
    diskBay: {
      ...WIDGETS_EN.diskBay,
      title: "Bahías de discos",
      hint: "Haz clic en una bahía vacía para instalar un disco, en un disco para retirarlo o en la última bahía vacía para eliminarla.",
      installedSummary: "{active} / {max} instalados",
      legendInstalled: "Disco instalado",
      legendEmpty: "Bahía libre",
      baysLabel: "Bahías"
    },
    remoteAccess: {
      ...WIDGETS_EN.remoteAccess,
      title: "Solución de gestión remota",
      identifier: "Identificador",
      solutions: {
        ...WIDGETS_EN.remoteAccess.solutions,
        rdp: {
          label: "Escritorio remoto (RDP)",
          description: "Dirección IP o nombre de host Windows",
          idLabel: "Host RDP"
        },
        other: {
          label: "Otro",
          description: "Otra herramienta (identificador libre)",
          idLabel: "Identificador"
        }
      }
    }
  }
};
ES.serverRoleOptions = ES.serverRoleGroups.flatMap(group => group.options);
const OPTIONS_COPY = {
  fr: FR,
  en: EN,
  de: DE,
  it: IT,
  es: ES
};
export const getEquipmentFormOptionsCopy = createLocaleGetter(OPTIONS_COPY);
export function getRoleOptionLabel(locale, value, optionsCopy) {
  const copy = optionsCopy || getEquipmentFormOptionsCopy(locale);
  const match = copy.serverRoleOptions.find(entry => entry.value === value);
  return match?.label ?? value;
}
