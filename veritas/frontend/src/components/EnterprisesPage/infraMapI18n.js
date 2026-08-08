import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const HONEYCOMB_TYPE_KEYS = ["Internet", "Firewalls", "Serveurs", "Stockage", "Switch", "BorneWifi", "Routeur", "Alimentation", "TOIP", "Ordinateurs"];
const BRICK_GROUP_KEYS = ["cybersecurity", "services", "licensing", "campaign"];
const BRICK_TYPE_KEYS = ["Antivirus", "Antispam", "Sauvegarde", "TenantMicrosoft", "GoogleWorkspace", "NDD", "CertificatsSSL", "LicencesAbonnements", "Campagne"];
const STATUS_KEYS = ["critical", "warning", "ok", "neutral", "unmonitored", "no_data"];
const INFRA_MAP_COPY = {
  fr: {
    loadingAria: "Chargement de la cartographie",
    legendAria: "Légende des statuts",
    loadError: "Impossible de charger la cartographie",
    emptyTitle: "Aucun élément d'infrastructure à cartographier pour ce client",
    emptyHint: "Les hexagones illustrent la structure attendue. Ajoutez des périphériques ou une sauvegarde pour alimenter la cartographie.",
    criticalCategoriesOne: "1 rubrique critique",
    criticalCategoriesMany: "{count} rubriques critiques",
    warningCategoriesOne: "1 rubrique en warning",
    warningCategoriesMany: "{count} rubriques en warning",
    equipmentOne: "{count} équipement",
    equipmentMany: "{count} équipements",
    elementOne: "{count} élément",
    elementMany: "{count} éléments",
    customEquipmentGroup: "Équipements",
    status: {
      critical: "Critique",
      warning: "Warning",
      ok: "OK",
      neutral: "Actif",
      unmonitored: "Non monitoré",
      no_data: "Sans données"
    },
    statusBreakdown: {
      criticalOne: "{count} critique",
      criticalMany: "{count} critiques",
      warningOne: "{count} warning",
      warningMany: "{count} warnings",
      ok: "{count} OK",
      unmonitoredOne: "{count} non monitoré",
      unmonitoredMany: "{count} non monitorés"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Pare-feu",
      Serveurs: "Serveurs",
      Stockage: "Stockage",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Routeur",
      Alimentation: "Alim.",
      TOIP: "TOIP",
      Ordinateurs: "Ordinateurs"
    },
    brickGroups: {
      cybersecurity: "Cybersécurité",
      services: "Services",
      licensing: "Licences & abonnements",
      campaign: "Campagne"
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Sauvegarde",
      TenantMicrosoft: "Tenant Microsoft",
      GoogleWorkspace: "Google Workspace",
      NDD: "Nom de domaine",
      CertificatsSSL: "Certificats SSL",
      LicencesAbonnements: "Licences & abonnements",
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
    }
  },
  en: {
    loadingAria: "Loading infrastructure map",
    legendAria: "Status legend",
    loadError: "Unable to load infrastructure map",
    emptyTitle: "No infrastructure items to map for this client",
    emptyHint: "The hexagons show the expected structure. Add devices or a backup to populate the map.",
    criticalCategoriesOne: "1 critical category",
    criticalCategoriesMany: "{count} critical categories",
    warningCategoriesOne: "1 category in warning",
    warningCategoriesMany: "{count} categories in warning",
    equipmentOne: "{count} device",
    equipmentMany: "{count} devices",
    elementOne: "{count} item",
    elementMany: "{count} items",
    customEquipmentGroup: "Equipment",
    status: {
      critical: "Critical",
      warning: "Warning",
      ok: "OK",
      neutral: "Active",
      unmonitored: "Not monitored",
      no_data: "No data"
    },
    statusBreakdown: {
      criticalOne: "{count} critical",
      criticalMany: "{count} critical",
      warningOne: "{count} warning",
      warningMany: "{count} warnings",
      ok: "{count} OK",
      unmonitoredOne: "{count} not monitored",
      unmonitoredMany: "{count} not monitored"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Servers: "Servers",
      Storage: "Storage",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "Power",
      TOIP: "VoIP",
      Ordinateurs: "Computers"
    },
    brickGroups: {
      cybersecurity: "Cybersecurity",
      services: "Services",
      licensing: "Licenses & subscriptions",
      campaign: "Campaign"
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
    }
  },
  de: {
    loadingAria: "Infrastrukturkarte wird geladen",
    legendAria: "Status-Legende",
    loadError: "Infrastrukturkarte konnte nicht geladen werden",
    emptyTitle: "Keine Infrastrukturelemente für diesen Kunden zu kartieren",
    emptyHint: "Die Hexagone zeigen die erwartete Struktur. Fügen Sie Geräte oder ein Backup hinzu, um die Karte zu füllen.",
    criticalCategoriesOne: "1 kritische Rubrik",
    criticalCategoriesMany: "{count} kritische Rubriken",
    warningCategoriesOne: "1 Rubrik mit Warning",
    warningCategoriesMany: "{count} Rubriken mit Warning",
    equipmentOne: "{count} Gerät",
    equipmentMany: "{count} Geräte",
    elementOne: "{count} Element",
    elementMany: "{count} Elemente",
    customEquipmentGroup: "Geräte",
    status: {
      critical: "Kritisch",
      warning: "Warning",
      ok: "OK",
      neutral: "Aktiv",
      unmonitored: "Nicht überwacht",
      no_data: "Keine Daten"
    },
    statusBreakdown: {
      criticalOne: "{count} kritisch",
      criticalMany: "{count} kritisch",
      warningOne: "{count} warning",
      warningMany: "{count} warnings",
      ok: "{count} OK",
      unmonitoredOne: "{count} nicht überwacht",
      unmonitoredMany: "{count} nicht überwacht"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Server",
      Stockage: "Speicher",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "Strom",
      TOIP: "VoIP",
      Ordinateurs: "Computer"
    },
    brickGroups: {
      cybersecurity: "Cybersicherheit",
      services: "Services",
      licensing: "Lizenzen & Abonnements",
      campaign: "Kampagne"
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Backup",
      TenantMicrosoft: "Microsoft-Tenant",
      GoogleWorkspace: "Google Workspace",
      NDD: "Domainname",
      CertificatsSSL: "SSL-Zertifikate",
      LicencesAbonnements: "Lizenzen & Abonnements",
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
    }
  },
  it: {
    loadingAria: "Caricamento mappa infrastruttura",
    legendAria: "Legenda stati",
    loadError: "Impossibile caricare la mappa infrastruttura",
    emptyTitle: "Nessun elemento infrastruttura da mappare per questo cliente",
    emptyHint: "Gli esagoni illustrano la struttura prevista. Aggiungete dispositivi o un backup per alimentare la mappa.",
    criticalCategoriesOne: "1 voce critica",
    criticalCategoriesMany: "{count} voci critiche",
    warningCategoriesOne: "1 voce in warning",
    warningCategoriesMany: "{count} voci in warning",
    equipmentOne: "{count} dispositivo",
    equipmentMany: "{count} dispositivi",
    elementOne: "{count} elemento",
    elementMany: "{count} elementi",
    customEquipmentGroup: "Apparecchiature",
    status: {
      critical: "Critico",
      warning: "Warning",
      ok: "OK",
      neutral: "Attivo",
      unmonitored: "Non monitorato",
      no_data: "Nessun dato"
    },
    statusBreakdown: {
      criticalOne: "{count} critico",
      criticalMany: "{count} critici",
      warningOne: "{count} warning",
      warningMany: "{count} warning",
      ok: "{count} OK",
      unmonitoredOne: "{count} non monitorato",
      unmonitoredMany: "{count} non monitorati"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Server",
      Stockage: "Storage",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "Alim.",
      TOIP: "VoIP",
      Ordinateurs: "Computer"
    },
    brickGroups: {
      cybersecurity: "Cybersicurezza",
      services: "Servizi",
      licensing: "Licenze e abbonamenti",
      campaign: "Campagna"
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Backup",
      TenantMicrosoft: "Tenant Microsoft",
      GoogleWorkspace: "Google Workspace",
      NDD: "Nome di dominio",
      CertificatsSSL: "Certificati SSL",
      LicencesAbonnements: "Licenze e abbonamenti",
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
    }
  },
  es: {
    loadingAria: "Cargando mapa de infraestructura",
    legendAria: "Leyenda de estados",
    loadError: "No se pudo cargar el mapa de infraestructura",
    emptyTitle: "No hay elementos de infraestructura para mapear en este cliente",
    emptyHint: "Los hexágonos muestran la estructura esperada. Añada dispositivos o una copia de seguridad para completar el mapa.",
    criticalCategoriesOne: "1 categoría crítica",
    criticalCategoriesMany: "{count} categorías críticas",
    warningCategoriesOne: "1 categoría en warning",
    warningCategoriesMany: "{count} categorías en warning",
    equipmentOne: "{count} dispositivo",
    equipmentMany: "{count} dispositivos",
    elementOne: "{count} elemento",
    elementMany: "{count} elementos",
    customEquipmentGroup: "Equipos",
    status: {
      critical: "Crítico",
      warning: "Warning",
      ok: "OK",
      neutral: "Activo",
      unmonitored: "No monitorizado",
      no_data: "Sin datos"
    },
    statusBreakdown: {
      criticalOne: "{count} crítico",
      criticalMany: "{count} críticos",
      warningOne: "{count} warning",
      warningMany: "{count} warnings",
      ok: "{count} OK",
      unmonitoredOne: "{count} no monitorizado",
      unmonitoredMany: "{count} no monitorizados"
    },
    honeycombTypes: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Servidores",
      Stockage: "Almacenamiento",
      Switch: "Switch",
      BorneWifi: "WiFi",
      Routeur: "Router",
      Alimentation: "Alim.",
      TOIP: "VoIP",
      Ordinateurs: "Ordenadores"
    },
    brickGroups: {
      cybersecurity: "Ciberseguridad",
      services: "Servicios",
      licensing: "Licencias y suscripciones",
      campaign: "Campaña"
    },
    brickTypes: {
      Antivirus: "Antivirus",
      Antispam: "Antispam",
      Sauvegarde: "Copia de seguridad",
      TenantMicrosoft: "Tenant Microsoft",
      GoogleWorkspace: "Google Workspace",
      NDD: "Nombre de dominio",
      CertificatsSSL: "Certificados SSL",
      LicencesAbonnements: "Licencias y suscripciones",
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
      return t.honeycombTypes[type] || type || "";
    },
    getBrickGroupLabel: groupId => t.brickGroups[groupId] || groupId,
    getBrickTypeLabel: type => t.brickTypes[type] || type || "",
    getStatusLabel: status => {
      if (status === "unmonitored" || status === "no_data") return null;
      return t.status[status] || null;
    },
    getStatusMeta: status => {
      const key = status === "no_data" ? "no_data" : status;
      const label = t.status[key] || t.status.unmonitored;
      const colors = {
        critical: {
          color: "#dc2626",
          soft: "rgba(239, 68, 68, 0.48)"
        },
        warning: {
          color: "#d97706",
          soft: "rgba(245, 158, 11, 0.46)"
        },
        ok: {
          color: "#2b5fab",
          soft: "rgba(43, 95, 171, 0.44)"
        },
        neutral: {
          color: "#1d4f9e",
          soft: "rgba(43, 95, 171, 0.28)"
        },
        unmonitored: {
          color: "#64748b",
          soft: "rgba(100, 116, 139, 0.38)"
        },
        no_data: {
          color: "#64748b",
          soft: "rgba(100, 116, 139, 0.38)"
        }
      };
      const palette = colors[key] || colors.unmonitored;
      return {
        label,
        ...palette
      };
    },
    formatEquipmentCount: count => formatCountLabel(count, "equipmentOne", "equipmentMany", t),
    formatElementCount: count => formatCountLabel(count, "elementOne", "elementMany", t),
    formatCriticalCategories: count => formatCountLabel(count, "criticalCategoriesOne", "criticalCategoriesMany", t),
    formatWarningCategories: count => formatCountLabel(count, "warningCategoriesOne", "warningCategoriesMany", t),
    formatStatusBreakdown: (counts = {}) => {
      const sb = t.statusBreakdown;
      const parts = [];
      if (counts.critical > 0) {
        parts.push(formatCountLabel(counts.critical, "criticalOne", "criticalMany", sb));
      }
      if (counts.warning > 0) {
        parts.push(formatCountLabel(counts.warning, "warningOne", "warningMany", sb));
      }
      if (counts.ok > 0) {
        parts.push(interpolate(sb.ok, {
          count: String(counts.ok)
        }));
      }
      if (counts.unmonitored > 0) {
        parts.push(formatCountLabel(counts.unmonitored, "unmonitoredOne", "unmonitoredMany", sb));
      }
      return parts.join(" · ");
    },
    formatComingSoonToast: label => interpolate(t.brick.comingSoonToast, {
      label
    }),
    getProFeatureLabel: (type, fallback) => t.brick.proFeatureLabels[type] || fallback || t.brick.proFeatureFallback,
    legendStatusKeys: ["critical", "warning", "ok", "unmonitored"],
    honeycombTypeKeys: HONEYCOMB_TYPE_KEYS,
    brickGroupKeys: BRICK_GROUP_KEYS,
    brickTypeKeys: BRICK_TYPE_KEYS,
    statusKeys: STATUS_KEYS
  };
}
