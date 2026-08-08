import { createLocaleGetter, interpolate } from "../../i18n/translate";
const PAGE_COPY = {
  fr: {
    searchPlaceholder: "Rechercher un équipement…",
    embedded: {
      typeBarAria: "Types de périphériques",
      typeTooltip: "{label} ({count})",
      typeTabAriaOne: "{label}, {count} périphérique",
      typeTabAriaMany: "{label}, {count} périphériques",
      clearSearchAria: "Effacer la recherche",
      mkMappedTitle: "Périphériques mappés CheckMK",
      mkAlertsTitle: "Périphériques avec alertes",
      mkClearFilterTitle: "Effacer le filtre monitoring",
      mkSyncTitle: "Synchroniser tous les périphériques mappés",
      mkAlertsLabel: "Alertes",
      mkSyncLabel: "Sync"
    },
    mspHeader: {
      deviceCountOne: "{count} périphérique",
      deviceCountMany: "{count} périphériques",
      exportCsvTitle: "Exporter CSV",
      exportCurrentView: "Vue actuelle",
      exportAllTypes: "Tous les types",
      addEquipmentTitle: "Ajouter un équipement"
    },
    actions: {
      remoteAccess: "Connexion distante",
      remoteAccessNotConfigured: "Connexion distante non configurée",
      remoteAccessWithUrl: "{label} ({url})",
      remoteAccessSwitchUrlMissing: "Aucune URL d'administration renseignée",
      remoteAccessUrlMissing: "Aucune URL de connexion distante renseignée",
      checkmkMap: "Mapper CheckMK",
      checkmkEdit: "Modifier le mapping CheckMK",
      checkmkMapClick: "Cliquer pour mapper avec CheckMK",
      checkmkMappedClick: "Mappé: {host} - Cliquer pour modifier",
      quickConnect: "QuickConnect",
      quickConnectOpen: "Ouvrir QuickConnect ({value})",
      quickConnectMissing: "Aucune adresse QuickConnect renseignée",
      quickConnectWithValue: "QuickConnect ({value})",
      quickConnectNotConfigured: "QuickConnect non configuré",
      unifiEdit: "Modifier la connexion API UniFi (UDM Pro / UDM Pro Max)",
      unifiConfigure: "Configurer la connexion API UniFi (UDM Pro / UDM Pro Max)",
      unifiAria: "API UniFi UDM Pro",
      serverRemote: "Prise en main",
      serverRemoteNotConfigured: "Prise en main non configurée",
      serverRemoteWithId: "{label} ({id})",
      serverRemoteMenuNotConfigured: "{label} non configurée",
      serverRemoteTooltip: "{label} · {id}",
      copySheet: "Copier la fiche",
      copySheetEquipment: "Copier la fiche équipement",
      shareSheet: "Partager la fiche",
      shareSheetEquipment: "Partager la fiche équipement",
      sharePayloadTitle: "Fiche équipement · {name}",
      copySheetToast: "Fiche équipement",
      revokeRmmAgent: "Révoquer l'agent RMM",
      editEquipment: "Éditer l'équipement",
      openSheet: "Ouvrir la fiche"
    },
    monitoring: "Supervision",
    actionsColumn: "Actions",
    yes: "Oui",
    no: "Non",
    columns: {
      name: "Nom",
      monitoring: "Supervision",
      client: "Client",
      location: "Site",
      processeur: "VCPU/CPU",
      memoire: "RAM",
      stockage: "Stockage",
      ip: "Adresse IP",
      serial: "Numéro de série",
      mapping: "Action",
      model: "Modèle",
      manufacturer: "Fabricant",
      version: "Version",
      mac: "Adresse MAC",
      uptime: "Uptime",
      installDate: "Date d'installation",
      nbDisques: "Nb de disque",
      capacite: "Capacité totale (Gb)",
      fournisseur: "Fournisseur",
      internetType: "Type",
      categorie: "Catégorie",
      debit: "Débit",
      vlan: "Vlan",
      firmware: "Firmware",
      expirationGarantie: "Date de garantie",
      maintenanceLicence: "Date de licence maintenance",
      systeme: "OS",
      domaine: "Domaine",
      agentStatus: "Agent RMM",
      role: "Rôles",
      raid: "RAID",
      nbDisquesActuels: "NB disque actuels",
      nbDisquesMax: "Nb disque max",
      server: "Serveur",
      jobsCount: "Jobs",
      mappedJobsCount: "Jobs mappés",
      logiciel: "Logiciel"
    },
    typeOverrides: {
      Firewalls: {
        manufacturer: "Marque",
        serial: "SN"
      },
      Internet: {
        internetType: "Type de connexion"
      },
      Serveurs: {
        vlan: "VLAN",
        processeur: "Proc.",
        role: "Rôles"
      },
      Stockage: {
        raid: "RAID"
      },
      Switch: {
        manufacturer: "Marque"
      },
      BorneWifi: {
        manufacturer: "Marque"
      },
      Ordinateurs: {
        systeme: "OS",
        domaine: "Domaine",
        agentStatus: "Agent"
      },
      Sauvegarde: {
        name: "Logiciel",
        jobsCount: "Jobs",
        mappedJobsCount: "Jobs mappés"
      }
    },
    empty: {
      Internet: {
        embedded: "Aucun périphérique Internet pour ce client.",
        default: "Aucun périphérique Internet trouvé."
      },
      Firewalls: {
        embedded: "Aucun pare-feu pour ce client.",
        default: "Aucun pare-feu trouvé."
      },
      Serveurs: {
        embedded: "Aucun serveur pour ce client.",
        default: "Aucun serveur trouvé."
      },
      Ordinateurs: {
        embedded: "Aucun ordinateur pour ce client.",
        default: "Aucun ordinateur trouvé."
      },
      Stockage: {
        embedded: "Aucun périphérique de stockage pour ce client.",
        default: "Aucun périphérique de stockage trouvé."
      },
      Switch: {
        embedded: "Aucun switch pour ce client.",
        default: "Aucun switch trouvé."
      },
      BorneWifi: {
        embedded: "Aucune borne WiFi pour ce client.",
        default: "Aucune borne WiFi trouvée."
      },
      Alimentation: {
        embedded: "Aucun équipement d'alimentation pour ce client.",
        default: "Aucun équipement d'alimentation trouvé."
      },
      Routeur: {
        embedded: "Aucun routeur pour ce client.",
        default: "Aucun routeur trouvé."
      },
      TOIP: {
        embedded: "Aucun équipement TOIP pour ce client.",
        default: "Aucun équipement TOIP trouvé."
      },
      Sauvegarde: {
        embedded: "Aucune instance de sauvegarde pour ce client.",
        default: "Aucune instance de sauvegarde trouvée."
      },
      "Caméra de sécurité": {
        embedded: "Aucune caméra de sécurité pour ce client.",
        default: "Aucune caméra de sécurité trouvée."
      },
      default: {
        embedded: "Aucun équipement pour ce client.",
        default: "Aucun équipement trouvé."
      }
    }
  },
  en: {
    searchPlaceholder: "Search for equipment…",
    embedded: {
      typeBarAria: "Peripheral types",
      typeTooltip: "{label} ({count})",
      typeTabAriaOne: "{label}, {count} device",
      typeTabAriaMany: "{label}, {count} devices",
      clearSearchAria: "Clear search",
      mkMappedTitle: "CheckMK mapped devices",
      mkAlertsTitle: "Devices with alerts",
      mkClearFilterTitle: "Clear monitoring filter",
      mkSyncTitle: "Sync all mapped devices",
      mkAlertsLabel: "Alerts",
      mkSyncLabel: "Sync"
    },
    mspHeader: {
      deviceCountOne: "{count} device",
      deviceCountMany: "{count} devices",
      exportCsvTitle: "Export CSV",
      exportCurrentView: "Current view",
      exportAllTypes: "All types",
      addEquipmentTitle: "Add equipment"
    },
    actions: {
      remoteAccess: "Remote connection",
      remoteAccessNotConfigured: "Remote connection not configured",
      remoteAccessWithUrl: "{label} ({url})",
      remoteAccessSwitchUrlMissing: "No administration URL configured",
      remoteAccessUrlMissing: "No remote connection URL configured",
      checkmkMap: "Map CheckMK",
      checkmkEdit: "Edit CheckMK mapping",
      checkmkMapClick: "Click to map with CheckMK",
      checkmkMappedClick: "Mapped: {host} - Click to edit",
      quickConnect: "QuickConnect",
      quickConnectOpen: "Open QuickConnect ({value})",
      quickConnectMissing: "No QuickConnect address configured",
      quickConnectWithValue: "QuickConnect ({value})",
      quickConnectNotConfigured: "QuickConnect not configured",
      unifiEdit: "Edit UniFi API connection (UDM Pro / UDM Pro Max)",
      unifiConfigure: "Configure UniFi API connection (UDM Pro / UDM Pro Max)",
      unifiAria: "UniFi UDM Pro API",
      serverRemote: "Remote control",
      serverRemoteNotConfigured: "Remote control not configured",
      serverRemoteWithId: "{label} ({id})",
      serverRemoteMenuNotConfigured: "{label} not configured",
      serverRemoteTooltip: "{label} · {id}",
      copySheet: "Copy record",
      copySheetEquipment: "Copy equipment record",
      shareSheet: "Share record",
      shareSheetEquipment: "Share equipment record",
      sharePayloadTitle: "Equipment record · {name}",
      copySheetToast: "Equipment record",
      revokeRmmAgent: "Revoke RMM agent",
      editEquipment: "Edit equipment",
      openSheet: "Open record"
    },
    monitoring: "Monitoring",
    actionsColumn: "Actions",
    yes: "Yes",
    no: "No",
    columns: {
      name: "Name",
      monitoring: "Monitoring",
      client: "Client",
      location: "Site",
      processeur: "vCPU/CPU",
      memoire: "RAM",
      stockage: "Storage",
      ip: "IP address",
      serial: "Serial number",
      mapping: "Action",
      model: "Model",
      manufacturer: "Manufacturer",
      version: "Version",
      mac: "MAC address",
      uptime: "Uptime",
      installDate: "Install date",
      nbDisques: "Disk count",
      capacite: "Total capacity (GB)",
      fournisseur: "Provider",
      internetType: "Type",
      categorie: "Category",
      debit: "Bandwidth",
      vlan: "VLAN",
      firmware: "Firmware",
      expirationGarantie: "Warranty date",
      maintenanceLicense: "Maintenance licence date",
      systeme: "OS",
      domaine: "Domain",
      agentStatus: "RMM agent",
      role: "Roles",
      raid: "RAID",
      nbDisquesActuels: "Current disks",
      nbDisquesMax: "Max disks",
      server: "Server",
      jobsCount: "Jobs",
      mappedJobsCount: "Mapped jobs",
      logiciel: "Software"
    },
    typeOverrides: {
      Firewalls: {
        manufacturer: "Brand",
        serial: "SN"
      },
      Internet: {
        internetType: "Connection type"
      },
      Servers: {
        vlan: "VLAN",
        processeur: "CPU",
        role: "Roles"
      },
      Storage: {
        raid: "RAID"
      },
      Switch: {
        manufacturer: "Brand"
      },
      BorneWifi: {
        manufacturer: "Brand"
      },
      Ordinateurs: {
        systeme: "OS",
        domaine: "Domain",
        agentStatus: "Agent"
      },
      Backup: {
        name: "Software",
        jobsCount: "Jobs",
        mappedJobsCount: "Mapped jobs"
      }
    },
    empty: {
      Internet: {
        embedded: "No internet link for this client.",
        default: "No internet link found."
      },
      Firewalls: {
        embedded: "No firewall for this client.",
        default: "No firewall found."
      },
      Servers: {
        embedded: "No server for this client.",
        default: "No server found."
      },
      Ordinateurs: {
        embedded: "No computer for this client.",
        default: "No computer found."
      },
      Storage: {
        embedded: "No storage device for this client.",
        default: "No storage device found."
      },
      Switch: {
        embedded: "No switch for this client.",
        default: "No switch found."
      },
      BorneWifi: {
        embedded: "No WiFi AP for this client.",
        default: "No WiFi AP found."
      },
      Alimentation: {
        embedded: "No power device for this client.",
        default: "No power device found."
      },
      Routeur: {
        embedded: "No router for this client.",
        default: "No router found."
      },
      TOIP: {
        embedded: "No VoIP device for this client.",
        default: "No VoIP device found."
      },
      Backup: {
        embedded: "No backup instance for this client.",
        default: "No backup instance found."
      },
      "Caméra de sécurité": {
        embedded: "No security camera for this client.",
        default: "No security camera found."
      },
      default: {
        embedded: "No equipment for this client.",
        default: "No equipment found."
      }
    }
  },
  de: {
    searchPlaceholder: "Gerät suchen…",
    embedded: {
      typeBarAria: "Gerätetypen",
      typeTooltip: "{label} ({count})",
      typeTabAriaOne: "{label}, {count} Gerät",
      typeTabAriaMany: "{label}, {count} Geräte",
      clearSearchAria: "Suche löschen",
      mkMappedTitle: "CheckMK-zugeordnete Geräte",
      mkAlertsTitle: "Geräte mit Alarmen",
      mkClearFilterTitle: "Monitoring-Filter löschen",
      mkSyncTitle: "Alle zugeordneten Geräte synchronisieren",
      mkAlertsLabel: "Alarme",
      mkSyncLabel: "Sync"
    },
    mspHeader: {
      deviceCountOne: "{count} Gerät",
      deviceCountMany: "{count} Geräte",
      exportCsvTitle: "CSV exportieren",
      exportCurrentView: "Aktuelle Ansicht",
      exportAllTypes: "Alle Typen",
      addEquipmentTitle: "Gerät hinzufügen"
    },
    actions: {
      remoteAccess: "Fernverbindung",
      remoteAccessNotConfigured: "Fernverbindung nicht konfiguriert",
      remoteAccessWithUrl: "{label} ({url})",
      remoteAccessSwitchUrlMissing: "Keine Administrations-URL hinterlegt",
      remoteAccessUrlMissing: "Keine Fernverbindungs-URL hinterlegt",
      checkmkMap: "CheckMK zuordnen",
      checkmkEdit: "CheckMK-Zuordnung bearbeiten",
      checkmkMapClick: "Klicken, um mit CheckMK zuzuordnen",
      checkmkMappedClick: "Zugeordnet: {host} – Klicken zum Bearbeiten",
      quickConnect: "QuickConnect",
      quickConnectOpen: "QuickConnect öffnen ({value})",
      quickConnectMissing: "Keine QuickConnect-Adresse hinterlegt",
      quickConnectWithValue: "QuickConnect ({value})",
      quickConnectNotConfigured: "QuickConnect nicht konfiguriert",
      unifiEdit: "UniFi-API-Verbindung bearbeiten (UDM Pro / UDM Pro Max)",
      unifiConfigure: "UniFi-API-Verbindung konfigurieren (UDM Pro / UDM Pro Max)",
      unifiAria: "UniFi UDM Pro API",
      serverRemote: "Fernsteuerung",
      serverRemoteNotConfigured: "Fernsteuerung nicht konfiguriert",
      serverRemoteWithId: "{label} ({id})",
      serverRemoteMenuNotConfigured: "{label} nicht konfiguriert",
      serverRemoteTooltip: "{label} · {id}",
      copySheet: "Datensatz kopieren",
      copySheetEquipment: "Gerätedatensatz kopieren",
      shareSheet: "Datensatz teilen",
      shareSheetEquipment: "Gerätedatensatz teilen",
      sharePayloadTitle: "Gerätedatensatz · {name}",
      copySheetToast: "Gerätedatensatz",
      revokeRmmAgent: "RMM-Agent widerrufen",
      editEquipment: "Gerät bearbeiten",
      openSheet: "Datensatz öffnen"
    },
    monitoring: "Überwachung",
    actionsColumn: "Aktionen",
    yes: "Ja",
    no: "Nein",
    columns: {
      name: "Name",
      monitoring: "Überwachung",
      client: "Kunde",
      location: "Standort",
      processeur: "vCPU/CPU",
      memoire: "RAM",
      stockage: "Speicher",
      ip: "IP-Adresse",
      serial: "Seriennummer",
      mapping: "Aktion",
      model: "Modell",
      manufacturer: "Hersteller",
      version: "Version",
      mac: "MAC-Adresse",
      uptime: "Uptime",
      installDate: "Installationsdatum",
      nbDisques: "Anzahl Festplatten",
      capacite: "Gesamtkapazität (GB)",
      fournisseur: "Anbieter",
      internetType: "Typ",
      categorie: "Kategorie",
      debit: "Bandbreite",
      vlan: "VLAN",
      firmware: "Firmware",
      expirationGarantie: "Garantiedatum",
      maintenanceLicence: "Wartungslizenz",
      systeme: "OS",
      domaine: "Domäne",
      agentStatus: "RMM-Agent",
      role: "Rollen",
      raid: "RAID",
      nbDisquesActuels: "Aktuelle Festplatten",
      nbDisquesMax: "Max. Festplatten",
      server: "Server",
      jobsCount: "Jobs",
      mappedJobsCount: "Zugeordnete Jobs",
      logiciel: "Software"
    },
    typeOverrides: {
      Firewalls: {
        manufacturer: "Marke",
        serial: "SN"
      },
      Internet: {
        internetType: "Verbindungstyp"
      },
      Serveurs: {
        vlan: "VLAN",
        processeur: "CPU",
        role: "Rollen"
      },
      Ordinateurs: {
        systeme: "OS",
        domaine: "Domäne",
        agentStatus: "Agent"
      },
      Sauvegarde: {
        name: "Software",
        jobsCount: "Jobs",
        mappedJobsCount: "Zugeordnete Jobs"
      }
    },
    empty: {
      Internet: {
        embedded: "Keine Internetverbindung für diesen Kunden.",
        default: "Keine Internetverbindung gefunden."
      },
      Firewalls: {
        embedded: "Keine Firewall für diesen Kunden.",
        default: "Keine Firewall gefunden."
      },
      Serveurs: {
        embedded: "Kein Server für diesen Kunden.",
        default: "Kein Server gefunden."
      },
      Ordinateurs: {
        embedded: "Kein Computer für diesen Kunden.",
        default: "Kein Computer gefunden."
      },
      Stockage: {
        embedded: "Kein Speichergerät für diesen Kunden.",
        default: "Kein Speichergerät gefunden."
      },
      Switch: {
        embedded: "Kein Switch für diesen Kunden.",
        default: "Kein Switch gefunden."
      },
      BorneWifi: {
        embedded: "Kein WLAN-AP für diesen Kunden.",
        default: "Kein WLAN-AP gefunden."
      },
      Alimentation: {
        embedded: "Kein Stromgerät für diesen Kunden.",
        default: "Kein Stromgerät gefunden."
      },
      Routeur: {
        embedded: "Kein Router für diesen Kunden.",
        default: "Kein Router gefunden."
      },
      TOIP: {
        embedded: "Kein VoIP-Gerät für diesen Kunden.",
        default: "Kein VoIP-Gerät gefunden."
      },
      Sauvegarde: {
        embedded: "Keine Backup-Instanz für diesen Kunden.",
        default: "Keine Backup-Instanz gefunden."
      },
      default: {
        embedded: "Kein Gerät für diesen Kunden.",
        default: "Kein Gerät gefunden."
      }
    }
  },
  it: {
    searchPlaceholder: "Cerca un dispositivo…",
    embedded: {
      typeBarAria: "Tipi di periferica",
      typeTooltip: "{label} ({count})",
      typeTabAriaOne: "{label}, {count} periferica",
      typeTabAriaMany: "{label}, {count} periferiche",
      clearSearchAria: "Cancella ricerca",
      mkMappedTitle: "Periferiche mappate CheckMK",
      mkAlertsTitle: "Periferiche con alert",
      mkClearFilterTitle: "Cancella filtro monitoraggio",
      mkSyncTitle: "Sincronizza tutte le periferiche mappate",
      mkAlertsLabel: "Alert",
      mkSyncLabel: "Sync"
    },
    mspHeader: {
      deviceCountOne: "{count} dispositivo",
      deviceCountMany: "{count} dispositivi",
      exportCsvTitle: "Esporta CSV",
      exportCurrentView: "Vista attuale",
      exportAllTypes: "Tutti i tipi",
      addEquipmentTitle: "Aggiungi dispositivo"
    },
    actions: {
      remoteAccess: "Connessione remota",
      remoteAccessNotConfigured: "Connessione remota non configurata",
      remoteAccessWithUrl: "{label} ({url})",
      remoteAccessSwitchUrlMissing: "Nessun URL di amministrazione configurato",
      remoteAccessUrlMissing: "Nessun URL di connessione remota configurato",
      checkmkMap: "Mappa CheckMK",
      checkmkEdit: "Modifica mapping CheckMK",
      checkmkMapClick: "Clicca per mappare con CheckMK",
      checkmkMappedClick: "Mappato: {host} - Clicca per modificare",
      quickConnect: "QuickConnect",
      quickConnectOpen: "Apri QuickConnect ({value})",
      quickConnectMissing: "Nessun indirizzo QuickConnect configurato",
      quickConnectWithValue: "QuickConnect ({value})",
      quickConnectNotConfigured: "QuickConnect non configurato",
      unifiEdit: "Modifica connessione API UniFi (UDM Pro / UDM Pro Max)",
      unifiConfigure: "Configura connessione API UniFi (UDM Pro / UDM Pro Max)",
      unifiAria: "API UniFi UDM Pro",
      serverRemote: "Controllo remoto",
      serverRemoteNotConfigured: "Controllo remoto non configurato",
      serverRemoteWithId: "{label} ({id})",
      serverRemoteMenuNotConfigured: "{label} non configurato",
      serverRemoteTooltip: "{label} · {id}",
      copySheet: "Copia scheda",
      copySheetEquipment: "Copia scheda dispositivo",
      shareSheet: "Condividi scheda",
      shareSheetEquipment: "Condividi scheda dispositivo",
      sharePayloadTitle: "Scheda dispositivo · {name}",
      copySheetToast: "Scheda dispositivo",
      revokeRmmAgent: "Revoca agente RMM",
      editEquipment: "Modifica dispositivo",
      openSheet: "Apri scheda"
    },
    monitoring: "Monitoraggio",
    actionsColumn: "Azioni",
    yes: "Sì",
    no: "No",
    columns: {
      name: "Nome",
      monitoring: "Monitoraggio",
      client: "Cliente",
      location: "Sede",
      processeur: "vCPU/CPU",
      memoire: "RAM",
      stockage: "Storage",
      ip: "Indirizzo IP",
      serial: "Numero di serie",
      mapping: "Azione",
      model: "Modello",
      manufacturer: "Produttore",
      version: "Versione",
      mac: "Indirizzo MAC",
      uptime: "Uptime",
      installDate: "Data installazione",
      nbDisques: "N. dischi",
      capacite: "Capacità totale (GB)",
      fournisseur: "Fornitore",
      internetType: "Tipo",
      categorie: "Categoria",
      debit: "Banda",
      vlan: "VLAN",
      firmware: "Firmware",
      expirationGarantie: "Data garanzia",
      maintenanceLicence: "Licenza manutenzione",
      systeme: "OS",
      domaine: "Dominio",
      agentStatus: "Agente RMM",
      role: "Ruoli",
      raid: "RAID",
      nbDisquesActuels: "Dischi attuali",
      nbDisquesMax: "Dischi max",
      server: "Server",
      jobsCount: "Job",
      mappedJobsCount: "Job mappati",
      logiciel: "Software"
    },
    typeOverrides: {
      Firewalls: {
        manufacturer: "Marca",
        serial: "SN"
      },
      Internet: {
        internetType: "Tipo connessione"
      },
      Serveurs: {
        vlan: "VLAN",
        processeur: "CPU",
        role: "Ruoli"
      },
      Ordinateurs: {
        systeme: "OS",
        domaine: "Dominio",
        agentStatus: "Agente"
      },
      Sauvegarde: {
        name: "Software",
        jobsCount: "Job",
        mappedJobsCount: "Job mappati"
      }
    },
    empty: {
      Internet: {
        embedded: "Nessun collegamento internet per questo cliente.",
        default: "Nessun collegamento internet trovato."
      },
      Firewalls: {
        embedded: "Nessun firewall per questo cliente.",
        default: "Nessun firewall trovato."
      },
      Serveurs: {
        embedded: "Nessun server per questo cliente.",
        default: "Nessun server trovato."
      },
      Ordinateurs: {
        embedded: "Nessun computer per questo cliente.",
        default: "Nessun computer trovato."
      },
      Stockage: {
        embedded: "Nessun dispositivo storage per questo cliente.",
        default: "Nessun dispositivo storage trovato."
      },
      Switch: {
        embedded: "Nessuno switch per questo cliente.",
        default: "Nessuno switch trovato."
      },
      BorneWifi: {
        embedded: "Nessun AP WiFi per questo cliente.",
        default: "Nessun AP WiFi trovato."
      },
      Alimentation: {
        embedded: "Nessun dispositivo di alimentazione per questo cliente.",
        default: "Nessun dispositivo di alimentazione trovato."
      },
      Routeur: {
        embedded: "Nessun router per questo cliente.",
        default: "Nessun router trovato."
      },
      TOIP: {
        embedded: "Nessun dispositivo VoIP per questo cliente.",
        default: "Nessun dispositivo VoIP trovato."
      },
      Sauvegarde: {
        embedded: "Nessuna istanza backup per questo cliente.",
        default: "Nessuna istanza backup trovata."
      },
      default: {
        embedded: "Nessun dispositivo per questo cliente.",
        default: "Nessun dispositivo trovato."
      }
    }
  },
  es: {
    searchPlaceholder: "Buscar un equipo…",
    embedded: {
      typeBarAria: "Tipos de periférico",
      typeTooltip: "{label} ({count})",
      typeTabAriaOne: "{label}, {count} periférico",
      typeTabAriaMany: "{label}, {count} periféricos",
      clearSearchAria: "Borrar búsqueda",
      mkMappedTitle: "Periféricos mapeados CheckMK",
      mkAlertsTitle: "Periféricos con alertas",
      mkClearFilterTitle: "Borrar filtro de monitorización",
      mkSyncTitle: "Sincronizar todos los periféricos mapeados",
      mkAlertsLabel: "Alertas",
      mkSyncLabel: "Sync"
    },
    mspHeader: {
      deviceCountOne: "{count} dispositivo",
      deviceCountMany: "{count} dispositivos",
      exportCsvTitle: "Exportar CSV",
      exportCurrentView: "Vista actual",
      exportAllTypes: "Todos los tipos",
      addEquipmentTitle: "Añadir equipo"
    },
    actions: {
      remoteAccess: "Conexión remota",
      remoteAccessNotConfigured: "Conexión remota no configurada",
      remoteAccessWithUrl: "{label} ({url})",
      remoteAccessSwitchUrlMissing: "Sin URL de administración configurada",
      remoteAccessUrlMissing: "Sin URL de conexión remota configurada",
      checkmkMap: "Mapear CheckMK",
      checkmkEdit: "Editar mapeo CheckMK",
      checkmkMapClick: "Clic para mapear con CheckMK",
      checkmkMappedClick: "Mapeado: {host} - Clic para editar",
      quickConnect: "QuickConnect",
      quickConnectOpen: "Abrir QuickConnect ({value})",
      quickConnectMissing: "Sin dirección QuickConnect configurada",
      quickConnectWithValue: "QuickConnect ({value})",
      quickConnectNotConfigured: "QuickConnect no configurado",
      unifiEdit: "Editar conexión API UniFi (UDM Pro / UDM Pro Max)",
      unifiConfigure: "Configurar conexión API UniFi (UDM Pro / UDM Pro Max)",
      unifiAria: "API UniFi UDM Pro",
      serverRemote: "Control remoto",
      serverRemoteNotConfigured: "Control remoto no configurado",
      serverRemoteWithId: "{label} ({id})",
      serverRemoteMenuNotConfigured: "{label} no configurado",
      serverRemoteTooltip: "{label} · {id}",
      copySheet: "Copiar ficha",
      copySheetEquipment: "Copiar ficha de equipo",
      shareSheet: "Compartir ficha",
      shareSheetEquipment: "Compartir ficha de equipo",
      sharePayloadTitle: "Ficha de equipo · {name}",
      copySheetToast: "Ficha de equipo",
      revokeRmmAgent: "Revocar agente RMM",
      editEquipment: "Editar equipo",
      openSheet: "Abrir ficha"
    },
    monitoring: "Monitorización",
    actionsColumn: "Acciones",
    yes: "Sí",
    no: "No",
    columns: {
      name: "Nombre",
      monitoring: "Monitorización",
      client: "Cliente",
      location: "Sitio",
      processeur: "vCPU/CPU",
      memoire: "RAM",
      stockage: "Almacenamiento",
      ip: "Dirección IP",
      serial: "Número de serie",
      mapping: "Acción",
      model: "Modelo",
      manufacturer: "Fabricante",
      version: "Versión",
      mac: "Dirección MAC",
      uptime: "Uptime",
      installDate: "Fecha de instalación",
      nbDisques: "N.º discos",
      capacite: "Capacidad total (GB)",
      fournisseur: "Proveedor",
      internetType: "Tipo",
      categorie: "Categoría",
      debit: "Ancho de banda",
      vlan: "VLAN",
      firmware: "Firmware",
      expirationGarantie: "Fecha de garantía",
      maintenanceLicence: "Licencia mantenimiento",
      systeme: "SO",
      domaine: "Dominio",
      agentStatus: "Agente RMM",
      role: "Roles",
      raid: "RAID",
      nbDisquesActuels: "Discos actuales",
      nbDisquesMax: "Discos máx.",
      server: "Servidor",
      jobsCount: "Jobs",
      mappedJobsCount: "Jobs mapeados",
      logiciel: "Software"
    },
    typeOverrides: {
      Firewalls: {
        manufacturer: "Marca",
        serial: "SN"
      },
      Internet: {
        internetType: "Tipo de conexión"
      },
      Serveurs: {
        vlan: "VLAN",
        processeur: "CPU",
        role: "Roles"
      },
      Ordinateurs: {
        systeme: "SO",
        domaine: "Dominio",
        agentStatus: "Agente"
      },
      Sauvegarde: {
        name: "Software",
        jobsCount: "Jobs",
        mappedJobsCount: "Jobs mapeados"
      }
    },
    empty: {
      Internet: {
        embedded: "Ninguna conexión internet para este cliente.",
        default: "Ninguna conexión internet encontrada."
      },
      Firewalls: {
        embedded: "Ningún firewall para este cliente.",
        default: "Ningún firewall encontrado."
      },
      Serveurs: {
        embedded: "Ningún servidor para este cliente.",
        default: "Ningún servidor encontrado."
      },
      Ordinateurs: {
        embedded: "Ningún ordenador para este cliente.",
        default: "Ningún ordenador encontrado."
      },
      Stockage: {
        embedded: "Ningún dispositivo de almacenamiento para este cliente.",
        default: "Ningún dispositivo de almacenamiento encontrado."
      },
      Switch: {
        embedded: "Ningún switch para este cliente.",
        default: "Ningún switch encontrado."
      },
      BorneWifi: {
        embedded: "Ningún AP WiFi para este cliente.",
        default: "Ningún AP WiFi encontrado."
      },
      Alimentation: {
        embedded: "Ningún equipo de alimentación para este cliente.",
        default: "Ningún equipo de alimentación encontrado."
      },
      Routeur: {
        embedded: "Ningún router para este cliente.",
        default: "Ningún router encontrado."
      },
      TOIP: {
        embedded: "Ningún equipo VoIP para este cliente.",
        default: "Ningún equipo VoIP encontrado."
      },
      Sauvegarde: {
        embedded: "Ninguna instancia de backup para este cliente.",
        default: "Ninguna instancia de backup encontrada."
      },
      default: {
        embedded: "Ningún equipo para este cliente.",
        default: "Ningún equipo encontrado."
      }
    }
  }
};
export const getEquipmentPageCopy = createLocaleGetter(PAGE_COPY);
export function formatEquipmentDeviceCount(locale, count) {
  const copy = getEquipmentPageCopy(locale);
  const n = Number(count) || 0;
  const template = n === 1 ? copy.mspHeader.deviceCountOne : copy.mspHeader.deviceCountMany;
  return interpolate(template, {
    count: String(n)
  });
}
export function getEquipmentRemoteAccessLabel(locale, configured) {
  const actions = getEquipmentPageCopy(locale).actions;
  return configured ? actions.remoteAccess : actions.remoteAccessNotConfigured;
}
export function formatEquipmentRemoteAccessTooltip(locale, {
  configured,
  url,
  equipmentType
}) {
  const actions = getEquipmentPageCopy(locale).actions;
  if (!configured) {
    return equipmentType === "Switch" ? actions.remoteAccessSwitchUrlMissing : actions.remoteAccessUrlMissing;
  }
  return interpolate(actions.remoteAccessWithUrl, {
    label: actions.remoteAccess,
    url: url || ""
  });
}
export function getEquipmentServerRemoteLabel(locale) {
  return getEquipmentPageCopy(locale).actions.serverRemote;
}
export function formatEquipmentServerRemoteTooltip(locale, {
  solutionLabel,
  id
} = {}) {
  const actions = getEquipmentPageCopy(locale).actions;
  if (!id) return actions.serverRemoteNotConfigured;
  const label = solutionLabel || actions.serverRemote;
  return interpolate(actions.serverRemoteTooltip, {
    label,
    id
  });
}
export function getEquipmentColumnLabel(locale, type, colKey) {
  const copy = getEquipmentPageCopy(locale);
  const override = copy.typeOverrides?.[type]?.[colKey];
  if (override) return override;
  return copy.columns[colKey] || colKey;
}
export function getEquipmentEmptyMessage(locale, type, embedded = false) {
  const copy = getEquipmentPageCopy(locale);
  const entry = copy.empty[type] || copy.empty.default;
  return embedded ? entry.embedded : entry.default;
}
