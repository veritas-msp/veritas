import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { getInfraStatusMeta, toInfraDisplayStatus } from "./infraMapUtils";
const HONEYCOMB_TYPE_KEYS = ["Internet", "Firewalls", "Serveurs", "Stockage", "Switch", "BorneWifi", "Routeur", "Alimentation", "TOIP", "Ordinateurs"];
const BRICK_GROUP_KEYS = ["cybersecurity", "services"];
const BRICK_TYPE_KEYS = ["Antivirus", "Antispam", "Sauvegarde", "TenantMicrosoft", "GoogleWorkspace", "NDD", "CertificatsSSL", "LicensesAbonnements", "Campagne"];
const STATUS_KEYS = ["disabled", "clear", "attention"];
const INFRA_MAP_COPY = {
  fr: {
    loadingAria: "Chargement de la cartographie",
    loadError: "Impossible de charger la cartographie",
    emptyTitle: "Aucun élément d'infrastructure à cartographier pour ce client",
    emptyHint: "Les hexagones illustrent la structure attendue. Ajoutez des périphériques ou une sauvegarde pour alimenter la cartographie.",
    attentionCategoriesOne: "1 rubrique à surveiller",
    attentionCategoriesMany: "{count} rubriques à surveiller",
    equipmentOne: "{count} équipement",
    equipmentMany: "{count} équipements",
    elementOne: "{count} élément",
    elementMany: "{count} éléments",
    customEquipmentGroup: "Équipements",
    status: {
      disabled: "Désactivé",
      clear: "Rien à signaler",
      attention: "À surveiller"
    },
    statusBreakdown: {
      attentionOne: "{count} à surveiller",
      attentionMany: "{count} à surveiller"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Pare-feu",
      Serveurs: "Serveurs",
      Servers: "Serveurs",
      Stockage: "NAS",
      Storage: "NAS",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Routeur",
      Alimentation: "UPS",
      TOIP: "TOIP",
      Ordinateurs: "PC",
      Backup: "Backup",
      "Security camera": "Caméra"
    },
    brickGroups: {
      cybersecurity: "Cybersécurité",
      services: "Services"
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Sauvegarde",
      Backup: "Sauvegarde",
      TenantMicrosoft: "Tenant Microsoft",
      GoogleWorkspace: "Google Workspace",
      NDD: "Nom de domaine",
      CertificatsSSL: "Certificats SSL",
      LicensesAbonnements: "Licences & abonnements",
      Campagne: "Campagne"
    },
    brick: {
      comingSoon: "Bientôt",
      comingSoonTooltip: "Bientôt disponible",
      comingSoonToast: "{label} · bientôt disponible",
      comingSoonAria: ", Bientôt disponible",
      proTooltip: "Disponible avec Veritas Pro",
      proAria: ", Veritas Pro",
      clickToConfigure: "Cliquer pour configurer",
      proFeatureFallback: "Cette fonctionnalité",
      proFeatureLabels: {
        Campagne: "Campagnes cybersécurité",
        TenantMicrosoft: "Tenant Microsoft",
        GoogleWorkspace: "Google Workspace"
      }
    },
    preview: {
      panelAria: "Aperçu du service",
      selectTitle: "Sélectionnez un service",
      selectHint: "Choisissez un module à gauche pour visualiser sa configuration ou en ajouter une.",
      open: "Ouvrir",
      add: "Ajouter",
      configure: "Configurer",
      editCurrent: "Éditer la solution",
      deleteCurrent: "Supprimer la solution",
      solutionSelect: "Solution",
      solutionSelectPrompt: "Quelle solution afficher ?",
      comingSoon: "Bientôt disponible",
      comingSoonHint: "Bientôt disponible",
      comingSoonBody: "Cette intégration arrive bientôt dans Veritas. Restez connecté pour la découverte.",
      proRequired: "Veritas Pro",
      proHint: "Disponible avec Veritas Pro",
      configuredHint: "Solution configurée",
      emptyHint: "Aucune solution configurée",
      emptyBody: "Ajoutez une solution pour ce client afin de commencer le suivi.",
      emptyAddCta: "Ajouter la première solution",
      searchPlaceholder: "Rechercher…",
      addInstance: "Ajouter une instance",
      addJob: "Ajouter un job",
      addJobDisabledHint: "Ajoutez d’abord une instance",
      syncSsl: "Synchroniser tous les certificats SSL",
      syncSslBusy: "Synchronisation en cours…",
      syncSslEmpty: "Aucun certificat à synchroniser",
      syncDomains: "Synchroniser les noms de domaine (OVH)",
      syncDomainsBusy: "Synchronisation en cours…",
      syncDomainsEmpty: "Aucun domaine OVH à synchroniser",
      syncDomainsSuccess: "Noms de domaine synchronisés",
      syncDomainsError: "Échec de la synchronisation des domaines"
    }
  },
  en: {
    loadingAria: "Loading infrastructure map",
    loadError: "Unable to load infrastructure map",
    emptyTitle: "No infrastructure items to map for this client",
    emptyHint: "The hexagons show the expected structure. Add devices or a backup to populate the map.",
    attentionCategoriesOne: "1 category needs attention",
    attentionCategoriesMany: "{count} categories need attention",
    equipmentOne: "{count} device",
    equipmentMany: "{count} devices",
    elementOne: "{count} item",
    elementMany: "{count} items",
    customEquipmentGroup: "Equipment",
    status: {
      disabled: "Disabled",
      clear: "Nothing to report",
      attention: "Needs attention"
    },
    statusBreakdown: {
      attentionOne: "{count} needs attention",
      attentionMany: "{count} need attention"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Servers: "Servers",
      Serveurs: "Servers",
      Storage: "NAS",
      Stockage: "NAS",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "UPS",
      TOIP: "VoIP",
      Ordinateurs: "PC",
      Backup: "Backup",
      "Security camera": "Camera"
    },
    brickGroups: {
      cybersecurity: "Cybersecurity",
      services: "Services",
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Backup: "Backup",
      TenantMicrosoft: "Microsoft tenant",
      GoogleWorkspace: "Google Workspace",
      NDD: "Domain name",
      CertificatsSSL: "SSL certificates",
      LicensesAbonnements: "Licenses & subscriptions",
      Campagne: "Campaign"
    },
    brick: {
      comingSoon: "Soon",
      comingSoonTooltip: "Coming soon",
      comingSoonToast: "{label} · coming soon",
      comingSoonAria: ", Coming soon",
      proTooltip: "Available with Veritas Pro",
      proAria: ", Veritas Pro",
      clickToConfigure: "Click to configure",
      proFeatureFallback: "This feature",
      proFeatureLabels: {
        Campagne: "Cybersecurity campaigns",
        TenantMicrosoft: "Microsoft tenant",
        GoogleWorkspace: "Google Workspace"
      }
    },
    preview: {
      panelAria: "Service preview",
      selectTitle: "Select a service",
      selectHint: "Pick a module on the left to preview its setup or add a solution.",
      open: "Open",
      add: "Add",
      configure: "Configure",
      editCurrent: "Edit solution",
      deleteCurrent: "Delete solution",
      solutionSelect: "Solution",
      solutionSelectPrompt: "Which solution to display?",
      comingSoon: "Coming soon",
      comingSoonHint: "Coming soon",
      comingSoonBody: "This integration is coming soon to Veritas. Stay tuned for the launch.",
      proRequired: "Veritas Pro",
      proHint: "Available with Veritas Pro",
      configuredHint: "Solution configured",
      emptyHint: "No solution configured",
      emptyBody: "Add a solution for this client to start tracking it.",
      emptyAddCta: "Add the first solution",
      searchPlaceholder: "Search…",
      addInstance: "Add an instance",
      addJob: "Add a job",
      addJobDisabledHint: "Add an instance first",
      syncSsl: "Sync all SSL certificates",
      syncSslBusy: "Syncing…",
      syncSslEmpty: "No certificates to sync",
      syncDomains: "Sync domain names (OVH)",
      syncDomainsBusy: "Syncing…",
      syncDomainsEmpty: "No OVH domains to sync",
      syncDomainsSuccess: "Domain names synchronized",
      syncDomainsError: "Domain synchronization failed"
    }
  },
  de: {
    loadingAria: "Infrastrukturkarte wird geladen",
    loadError: "Infrastrukturkarte konnte nicht geladen werden",
    emptyTitle: "Keine Infrastrukturelemente für diesen Kunden zu kartieren",
    emptyHint: "Die Hexagone zeigen die erwartete Struktur. Fügen Sie Geräte oder ein Backup hinzu, um die Karte zu füllen.",
    attentionCategoriesOne: "1 Rubrik zu prüfen",
    attentionCategoriesMany: "{count} Rubriken zu prüfen",
    equipmentOne: "{count} Gerät",
    equipmentMany: "{count} Geräte",
    elementOne: "{count} Element",
    elementMany: "{count} Elemente",
    customEquipmentGroup: "Geräte",
    status: {
      disabled: "Deaktiviert",
      clear: "Nichts zu melden",
      attention: "Zu prüfen"
    },
    statusBreakdown: {
      attentionOne: "{count} zu prüfen",
      attentionMany: "{count} zu prüfen"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Server",
      Servers: "Server",
      Stockage: "NAS",
      Storage: "NAS",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "UPS",
      TOIP: "VoIP",
      Ordinateurs: "PC",
      Backup: "Backup",
      "Security camera": "Kamera"
    },
    brickGroups: {
      cybersecurity: "Cybersicherheit",
      services: "Services",
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Backup",
      TenantMicrosoft: "Microsoft-Tenant",
      GoogleWorkspace: "Google Workspace",
      NDD: "Domainname",
      CertificatsSSL: "SSL-Zertifikate",
      LicensesAbonnements: "Lizenzen & Abonnements",
      Campagne: "Kampagne"
    },
    brick: {
      comingSoon: "Bald",
      comingSoonTooltip: "Demnächst verfügbar",
      comingSoonToast: "{label} · demnächst verfügbar",
      comingSoonAria: ", Demnächst verfügbar",
      proTooltip: "Verfügbar mit Veritas Pro",
      proAria: ", Veritas Pro",
      clickToConfigure: "Klicken zum Konfigurieren",
      proFeatureFallback: "Diese Funktion",
      proFeatureLabels: {
        Campagne: "Cybersicherheits-Kampagnen",
        TenantMicrosoft: "Microsoft-Tenant",
        GoogleWorkspace: "Google Workspace"
      }
    },
    preview: {
      panelAria: "Servicevorschau",
      selectTitle: "Service auswählen",
      selectHint: "Wählen Sie links ein Modul, um die Konfiguration anzuzeigen oder eine Lösung hinzuzufügen.",
      open: "Öffnen",
      add: "Hinzufügen",
      configure: "Konfigurieren",
      editCurrent: "Lösung bearbeiten",
      deleteCurrent: "Lösung löschen",
      solutionSelect: "Lösung",
      solutionSelectPrompt: "Welche Lösung anzeigen?",
      comingSoon: "Demnächst verfügbar",
      comingSoonHint: "Demnächst verfügbar",
      comingSoonBody: "Diese Integration kommt bald in Veritas. Bleiben Sie dran.",
      proRequired: "Veritas Pro",
      proHint: "Mit Veritas Pro verfügbar",
      configuredHint: "Lösung konfiguriert",
      emptyHint: "Keine Lösung konfiguriert",
      emptyBody: "Fügen Sie eine Lösung für diesen Kunden hinzu, um die Überwachung zu starten.",
      emptyAddCta: "Erste Lösung hinzufügen",
      searchPlaceholder: "Suchen…",
      addInstance: "Instanz hinzufügen",
      addJob: "Job hinzufügen",
      addJobDisabledHint: "Zuerst eine Instanz hinzufügen",
      syncSsl: "Alle SSL-Zertifikate synchronisieren",
      syncSslBusy: "Synchronisierung…",
      syncSslEmpty: "Keine Zertifikate zum Synchronisieren",
      syncDomains: "Domainnamen synchronisieren (OVH)",
      syncDomainsBusy: "Synchronisierung…",
      syncDomainsEmpty: "Keine OVH-Domains zum Synchronisieren",
      syncDomainsSuccess: "Domainnamen synchronisiert",
      syncDomainsError: "Domain-Synchronisierung fehlgeschlagen"
    }
  },
  it: {
    loadingAria: "Caricamento mappa infrastruttura",
    loadError: "Impossibile caricare la mappa infrastruttura",
    emptyTitle: "Nessun elemento infrastruttura da mappare per questo cliente",
    emptyHint: "Gli esagoni illustrano la struttura prevista. Aggiungete dispositivi o un backup per alimentare la mappa.",
    attentionCategoriesOne: "1 voce da verificare",
    attentionCategoriesMany: "{count} voci da verificare",
    equipmentOne: "{count} dispositivo",
    equipmentMany: "{count} dispositivi",
    elementOne: "{count} elemento",
    elementMany: "{count} elementi",
    customEquipmentGroup: "Apparecchiature",
    status: {
      disabled: "Disattivato",
      clear: "Niente da segnalare",
      attention: "Da verificare"
    },
    statusBreakdown: {
      attentionOne: "{count} da verificare",
      attentionMany: "{count} da verificare"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Server",
      Servers: "Server",
      Stockage: "NAS",
      Storage: "NAS",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "UPS",
      TOIP: "VoIP",
      Ordinateurs: "PC",
      Backup: "Backup",
      "Security camera": "Camera"
    },
    brickGroups: {
      cybersecurity: "Cybersicurezza",
      services: "Servizi",
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Backup",
      TenantMicrosoft: "Tenant Microsoft",
      GoogleWorkspace: "Google Workspace",
      NDD: "Nome di dominio",
      CertificatsSSL: "Certificati SSL",
      LicensesAbonnements: "Licenze e abbonamenti",
      Campagne: "Campagna"
    },
    brick: {
      comingSoon: "Presto",
      comingSoonTooltip: "Prossimamente disponibile",
      comingSoonToast: "{label} · prossimamente disponibile",
      comingSoonAria: ", Prossimamente disponibile",
      proTooltip: "Disponibile con Veritas Pro",
      proAria: ", Veritas Pro",
      clickToConfigure: "Clicca per configurare",
      proFeatureFallback: "Questa funzione",
      proFeatureLabels: {
        Campagne: "Campagne di cybersicurezza",
        TenantMicrosoft: "Tenant Microsoft",
        GoogleWorkspace: "Google Workspace"
      }
    },
    preview: {
      panelAria: "Anteprima servizio",
      selectTitle: "Seleziona un servizio",
      selectHint: "Scegli un modulo a sinistra per visualizzare la configurazione o aggiungerne una.",
      open: "Apri",
      add: "Aggiungi",
      configure: "Configura",
      editCurrent: "Modifica soluzione",
      deleteCurrent: "Elimina soluzione",
      solutionSelect: "Soluzione",
      solutionSelectPrompt: "Quale soluzione visualizzare?",
      comingSoon: "Presto disponibile",
      comingSoonHint: "Presto disponibile",
      comingSoonBody: "Questa integrazione arriverà presto in Veritas. Resta sintonizzato.",
      proRequired: "Veritas Pro",
      proHint: "Disponibile con Veritas Pro",
      configuredHint: "Soluzione configurata",
      emptyHint: "Nessuna soluzione configurata",
      emptyBody: "Aggiungi una soluzione per questo cliente per iniziare il monitoraggio.",
      emptyAddCta: "Aggiungi la prima soluzione",
      searchPlaceholder: "Cerca…",
      addInstance: "Aggiungi un'istanza",
      addJob: "Aggiungi un job",
      addJobDisabledHint: "Aggiungi prima un'istanza",
      syncSsl: "Sincronizza tutti i certificati SSL",
      syncSslBusy: "Sincronizzazione…",
      syncSslEmpty: "Nessun certificato da sincronizzare",
      syncDomains: "Sincronizza i nomi di dominio (OVH)",
      syncDomainsBusy: "Sincronizzazione…",
      syncDomainsEmpty: "Nessun dominio OVH da sincronizzare",
      syncDomainsSuccess: "Nomi di dominio sincronizzati",
      syncDomainsError: "Sincronizzazione domini non riuscita"
    }
  },
  es: {
    loadingAria: "Cargando mapa de infraestructura",
    loadError: "No se pudo cargar el mapa de infraestructura",
    emptyTitle: "No hay elementos de infraestructura para mapear en este cliente",
    emptyHint: "Los hexágonos muestran la estructura esperada. Añada dispositivos o una copia de seguridad para completar el mapa.",
    attentionCategoriesOne: "1 categoría a vigilar",
    attentionCategoriesMany: "{count} categorías a vigilar",
    equipmentOne: "{count} dispositivo",
    equipmentMany: "{count} dispositivos",
    elementOne: "{count} elemento",
    elementMany: "{count} elementos",
    customEquipmentGroup: "Equipos",
    status: {
      disabled: "Desactivado",
      clear: "Nada que señalar",
      attention: "A vigilar"
    },
    statusBreakdown: {
      attentionOne: "{count} a vigilar",
      attentionMany: "{count} a vigilar"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Servidores",
      Servers: "Servidores",
      Stockage: "NAS",
      Storage: "NAS",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "UPS",
      TOIP: "VoIP",
      Ordinateurs: "PC",
      Backup: "Backup",
      "Security camera": "Cámara"
    },
    brickGroups: {
      cybersecurity: "Ciberseguridad",
      services: "Servicios",
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Copia de seguridad",
      TenantMicrosoft: "Tenant Microsoft",
      GoogleWorkspace: "Google Workspace",
      NDD: "Nombre de dominio",
      CertificatsSSL: "Certificados SSL",
      LicensesAbonnements: "Licencias y suscripciones",
      Campagne: "Campaña"
    },
    brick: {
      comingSoon: "Pronto",
      comingSoonTooltip: "Próximamente disponible",
      comingSoonToast: "{label} · próximamente disponible",
      comingSoonAria: ", Próximamente disponible",
      proTooltip: "Disponible con Veritas Pro",
      proAria: ", Veritas Pro",
      clickToConfigure: "Clic para configurar",
      proFeatureFallback: "Esta función",
      proFeatureLabels: {
        Campagne: "Campañas de ciberseguridad",
        TenantMicrosoft: "Tenant Microsoft",
        GoogleWorkspace: "Google Workspace"
      }
    },
    preview: {
      panelAria: "Vista previa del servicio",
      selectTitle: "Seleccione un servicio",
      selectHint: "Elija un módulo a la izquierda para ver su configuración o añadir una solución.",
      open: "Abrir",
      add: "Añadir",
      configure: "Configurar",
      editCurrent: "Editar solución",
      deleteCurrent: "Eliminar solución",
      solutionSelect: "Solución",
      solutionSelectPrompt: "¿Qué solución mostrar?",
      comingSoon: "Próximamente disponible",
      comingSoonHint: "Próximamente",
      comingSoonBody: "Esta integración llegará pronto a Veritas. Mantente atento.",
      proRequired: "Veritas Pro",
      proHint: "Disponible con Veritas Pro",
      configuredHint: "Solución configurada",
      emptyHint: "Ninguna solución configurada",
      emptyBody: "Añada una solución para este cliente para empezar el seguimiento.",
      emptyAddCta: "Añadir la primera solución",
      searchPlaceholder: "Buscar…",
      addInstance: "Añadir una instancia",
      addJob: "Añadir un job",
      addJobDisabledHint: "Añada primero una instancia",
      syncSsl: "Sincronizar todos los certificados SSL",
      syncSslBusy: "Sincronizando…",
      syncSslEmpty: "Ningún certificado que sincronizar",
      syncDomains: "Sincronizar nombres de dominio (OVH)",
      syncDomainsBusy: "Sincronizando…",
      syncDomainsEmpty: "Ningún dominio OVH que sincronizar",
      syncDomainsSuccess: "Nombres de dominio sincronizados",
      syncDomainsError: "Error al sincronizar dominios"
    }
  }
};
function formatCountLabel(count, oneKey, manyKey, t) {
  const n = Number(count) || 0;
  const template = n > 1 ? t[manyKey] : t[oneKey];
  return interpolate(template, {
    count: String(n)
  });
}
export function getInfraMapCopy(locale) {
  const t = pickLocaleMessages(INFRA_MAP_COPY, locale);
  return {
    ...t,
    getHoneycombTypeLabel: (type, fallback = null) => {
      if (fallback) return fallback;
      if (type?.startsWith("Custom:")) return type.slice(7);
      if (t.honeycombTypes[type]) return t.honeycombTypes[type];
      // UI type ids vs localized dictionary keys
      if (type === "Servers") return t.honeycombTypes.Serveurs || t.honeycombTypes.Servers || type;
      if (type === "Storage") return t.honeycombTypes.Stockage || t.honeycombTypes.Storage || type;
      if (type === "Serveurs") return t.honeycombTypes.Servers || t.honeycombTypes.Serveurs || type;
      if (type === "Stockage") return t.honeycombTypes.Storage || t.honeycombTypes.Stockage || type;
      return type || "";
    },
    getBrickGroupLabel: groupId => t.brickGroups[groupId] || groupId,
    getBrickTypeLabel: type => {
      if (!type) return "";
      if (t.brickTypes[type]) return t.brickTypes[type];
      if (type === "Backup") return t.brickTypes.Sauvegarde || t.brickTypes.Backup || type;
      if (type === "Sauvegarde") return t.brickTypes.Backup || t.brickTypes.Sauvegarde || type;
      if (type === "LicencesAbonnements" || type === "LicensesAbonnements") {
        return t.brickTypes.LicensesAbonnements || type;
      }
      return type;
    },
    getStatusLabel: status => {
      const display = toInfraDisplayStatus(status);
      if (display === "clear") return null;
      return t.status[display] || null;
    },
    getStatusMeta: status => {
      const display = toInfraDisplayStatus(status);
      const palette = getInfraStatusMeta(display);
      return {
        ...palette,
        label: t.status[display] || palette.label
      };
    },
    formatEquipmentCount: count => formatCountLabel(count, "equipmentOne", "equipmentMany", t),
    formatElementCount: count => formatCountLabel(count, "elementOne", "elementMany", t),
    formatAttentionCategories: count => formatCountLabel(count, "attentionCategoriesOne", "attentionCategoriesMany", t),
    formatStatusBreakdown: (counts = {}) => {
      const attention = (Number(counts.critical) || 0) + (Number(counts.warning) || 0) + (Number(counts.attention) || 0);
      if (attention <= 0) return "";
      return formatCountLabel(attention, "attentionOne", "attentionMany", t.statusBreakdown);
    },
    formatComingSoonToast: label => interpolate(t.brick.comingSoonToast, {
      label
    }),
    getProFeatureLabel: (type, fallback) => t.brick.proFeatureLabels[type] || fallback || t.brick.proFeatureFallback,
    honeycombTypeKeys: HONEYCOMB_TYPE_KEYS,
    brickGroupKeys: BRICK_GROUP_KEYS,
    brickTypeKeys: BRICK_TYPE_KEYS,
    statusKeys: STATUS_KEYS
  };
}
