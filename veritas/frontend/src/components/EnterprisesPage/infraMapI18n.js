import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { getInfraStatusMeta, toInfraDisplayStatus } from "./infraMapUtils";
const HONEYCOMB_TYPE_KEYS = ["Internet", "Firewalls", "Serveurs", "Stockage", "Switch", "BorneWifi", "Routeur", "Alimentation", "TOIP", "Ordinateurs"];
const BRICK_GROUP_KEYS = ["cybersecurity", "services", "licensing", "campaign"];
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
