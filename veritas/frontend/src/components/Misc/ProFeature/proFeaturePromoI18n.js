import { normalizeLocale, pickLocaleMessages, interpolate } from "../../../i18n/translate";
import { PRO_FEATURE_PROMOS } from "./proFeaturePromos";
import { PRO_FEATURE_PROMOS_I18N, INTEGRATION_CATEGORY_BULLETS_I18N, INTEGRATION_PROMO_I18N } from "./proFeaturePromosI18nContent";
const MODAL_COPY = {
  fr: {
    close: "Fermer",
    pagesHeading: "Pages incluses en Veritas Pro",
    proNoteBefore: "Cette fonctionnalité est incluse dans ",
    proNoteAfter: ".",
    understand: "Compris"
  },
  en: {
    close: "Close",
    pagesHeading: "Pages included in Veritas Pro",
    proNoteBefore: "This feature is included in ",
    proNoteAfter: ".",
    understand: "Got it"
  },
  de: {
    close: "Schließen",
    pagesHeading: "In Veritas Pro enthaltene Seiten",
    proNoteBefore: "Diese Funktion ist in ",
    proNoteAfter: " enthalten.",
    understand: "Verstanden"
  },
  it: {
    close: "Chiudi",
    pagesHeading: "Pagine incluse in Veritas Pro",
    proNoteBefore: "Questa funzionalità è inclusa in ",
    proNoteAfter: ".",
    understand: "Capito"
  },
  es: {
    close: "Cerrar",
    pagesHeading: "Páginas incluidas en Veritas Pro",
    proNoteBefore: "Esta funcionalidad está incluida en ",
    proNoteAfter: ".",
    understand: "Entendido"
  }
};
const SIDEBAR_MODULES_PROMO = {
  fr: {
    title: "Modules supplémentaires",
    subtitle: "Débloquez les pages réservées à Veritas Pro.",
    description: "Veritas Community inclut déjà Entreprises, Contacts, Support, Centre de supervision, Cybersécurité, Services cloud et Monitoring. Veritas Pro ajoute les pages suivantes à votre navigation :",
    bullets: ["Ajoutez ces modules à la sidebar selon les besoins de votre activité MSP", "Adaptez la navigation à votre organisation et à vos processus", "Contrôlez les droits d'accès module par module pour chaque profil", "Faites évoluer votre espace Veritas au fil de votre croissance"],
    proPages: {
      sales: {
        label: "Prestations",
        description: "Interventions et installations"
      },
      planning: {
        label: "Planning",
        description: "Agenda et événements équipe"
      },
      reports: {
        label: "Rapports",
        description: "Documents et cahiers de recette clients"
      },
      campaigns: {
        label: "Campagnes cybersécurité",
        description: "Sensibilisation, simulations de phishing et conformité"
      }
    }
  },
  en: {
    title: "Additional modules",
    subtitle: "Unlock pages reserved for Veritas Pro.",
    description: "Veritas Community already includes Companies, Contacts, Support, Monitoring center, Cybersecurity, Cloud IT & Services and Monitoring. Veritas Pro adds the following pages to your navigation:",
    bullets: ["Add these modules to the sidebar based on your MSP workflow", "Adapt navigation to your organization and processes", "Control module access rights per profile", "Grow your Veritas workspace as your business expands"],
    proPages: {
      sales: {
        label: "Services",
        description: "Field work and installations"
      },
      planning: {
        label: "Scheduling",
        description: "Team calendar and events"
      },
      reports: {
        label: "Reports",
        description: "Client documents and acceptance test plans"
      },
      campaigns: {
        label: "Cybersecurity campaigns",
        description: "Awareness, phishing simulations and compliance"
      }
    }
  },
  de: {
    title: "Zusätzliche Module",
    subtitle: "Schalten Sie für Veritas Pro reservierte Seiten frei.",
    description: "Veritas Community umfasst bereits Unternehmen, Kontakte, Support, Supervisionszentrum, Cybersicherheit, Cloud IT & Services und Monitoring. Veritas Pro fügt folgende Seiten zur Navigation hinzu:",
    bullets: ["Fügen Sie diese Module der Sidebar nach Bedarf hinzu", "Passen Sie die Navigation an Ihre Organisation an", "Steuern Sie Modulrechte pro Profil", "Erweitern Sie Veritas mit Ihrem Wachstum"],
    proPages: {
      sales: {
        label: "Leistungen",
        description: "Einsätze und Installationen"
      },
      planning: {
        label: "Planung",
        description: "Teamkalender und Termine"
      },
      reports: {
        label: "Berichte",
        description: "Kundendokumente und Abnahmeprotokolle"
      },
      campaigns: {
        label: "Cybersicherheitskampagnen",
        description: "Sensibilisierung, Phishing-Simulationen und Compliance"
      }
    }
  },
  it: {
    title: "Moduli aggiuntivi",
    subtitle: "Sblocca le pagine riservate a Veritas Pro.",
    description: "Veritas Community include già Aziende, Contatti, Supporto, Centro di supervisione, Cybersicurezza, Cloud IT e servizi e Monitoring. Veritas Pro aggiunge le seguenti pagine alla navigazione:",
    bullets: ["Aggiungi questi moduli alla sidebar in base alle esigenze MSP", "Adatta la navigazione alla tua organizzazione", "Controlla i diritti di accesso per modulo e profilo", "Fai evolvere Veritas con la crescita della tua attività"],
    proPages: {
      sales: {
        label: "Prestazioni",
        description: "Interventi e installazioni"
      },
      planning: {
        label: "Planning",
        description: "Agenda ed eventi del team"
      },
      reports: {
        label: "Report",
        description: "Documenti e piani di collaudo clienti"
      },
      campaigns: {
        label: "Campagne cybersicurezza",
        description: "Sensibilizzazione, simulazioni phishing e conformità"
      }
    }
  },
  es: {
    title: "Módulos adicionales",
    subtitle: "Desbloquee las páginas reservadas a Veritas Pro.",
    description: "Veritas Community ya incluye Empresas, Contactos, Soporte, Centro de supervisión, Ciberseguridad, Cloud IT y servicios y Monitoring. Veritas Pro añade las siguientes páginas a su navegación:",
    bullets: ["Añada estos módulos a la barra lateral según su actividad MSP", "Adapte la navegación a su organización y procesos", "Controle los derechos de acceso por módulo y perfil", "Haga evolucionar Veritas con el crecimiento de su negocio"],
    proPages: {
      sales: {
        label: "Prestaciones",
        description: "Intervenciones e instalaciones"
      },
      planning: {
        label: "Planificación",
        description: "Agenda y eventos del equipo"
      },
      reports: {
        label: "Informes",
        description: "Documentos y actas de recepción clientes"
      },
      campaigns: {
        label: "Campañas de ciberseguridad",
        description: "Sensibilización, simulaciones de phishing y cumplimiento"
      }
    }
  }
};
const SIDEBAR_PRO_PAGE_META = [{
  id: "sales",
  icon: "mdi:briefcase-edit-outline"
}, {
  id: "planning",
  icon: "mingcute:calendar-time-add-fill"
}, {
  id: "reports",
  icon: "mingcute:report-forms-fill"
}, {
  id: "campaigns",
  icon: "mdi:shield-lock"
}];
const CYBER_CAMPAIGNS_PROMO = {
  fr: {
    title: "Campagnes cybersécurité",
    subtitle: "Pilotez vos actions de sensibilisation et de conformité.",
    description: "L'outil Campagnes permet de planifier, suivre et documenter vos actions cybersécurité chez vos clients : formations, audits RGPD, simulations de phishing, tests de pénétration et autres campagnes récurrentes.",
    bullets: ["Créez des campagnes par client avec type, statut et progression", "Suivez l'avancement global et les jalons de chaque action", "Centralisez l'historique des campagnes depuis la fiche entreprise", "Accédez au détail d'une campagne en un clic depuis la cartographie"]
  },
  en: {
    title: "Cybersecurity campaigns",
    subtitle: "Manage awareness and compliance initiatives.",
    description: "The Campaigns tool lets you plan, track and document cybersecurity actions for your clients: training, GDPR audits, phishing simulations, penetration tests and other recurring campaigns.",
    bullets: ["Create campaigns per client with type, status and progress", "Track overall progress and milestones for each action", "Centralize campaign history from the company record", "Open campaign details in one click from the infrastructure map"]
  },
  de: {
    title: "Cybersicherheitskampagnen",
    subtitle: "Steuern Sie Sensibilisierung und Compliance.",
    description: "Das Kampagnen-Tool plant, verfolgt und dokumentiert Cybersicherheitsaktionen bei Ihren Kunden: Schulungen, DSGVO-Audits, Phishing-Simulationen, Penetrationstests und wiederkehrende Kampagnen.",
    bullets: ["Kampagnen pro Kunde mit Typ, Status und Fortschritt anlegen", "Gesamtfortschritt und Meilensteine verfolgen", "Kampagnenverlauf in der Unternehmensakte zentralisieren", "Kampagnendetails per Klick aus der Karte öffnen"]
  },
  it: {
    title: "Campagne cybersicurezza",
    subtitle: "Gestisci sensibilizzazione e conformità.",
    description: "Lo strumento Campagne consente di pianificare, monitorare e documentare le azioni di cybersicurezza per i clienti: formazione, audit GDPR, simulazioni phishing, penetration test e altre campagne ricorrenti.",
    bullets: ["Crea campagne per cliente con tipo, stato e avanzamento", "Monitora progresso globale e milestone di ogni azione", "Centralizza lo storico campagne dalla scheda azienda", "Accedi al dettaglio campagna dalla mappa infrastruttura"]
  },
  es: {
    title: "Campañas de ciberseguridad",
    subtitle: "Gestione acciones de sensibilización y cumplimiento.",
    description: "La herramienta Campañas permite planificar, seguir y documentar acciones de ciberseguridad para sus clientes: formación, auditorías RGPD, simulaciones de phishing, pruebas de penetración y otras campañas recurrentes.",
    bullets: ["Cree campañas por cliente con tipo, estado y progreso", "Siga el avance global y los hitos de cada acción", "Centralice el historial desde la ficha empresa", "Acceda al detalle de una campaña desde el mapa de infraestructura"]
  }
};
const FEATURE_KEY_ALIASES = {
  "Campagnes cybersécurité": "cyberCampaigns",
  "Microsoft tenant": "Tenant Microsoft",
  backup: "backup"
};
function resolvePromoFeatureKey(featureKey) {
  return FEATURE_KEY_ALIASES[featureKey] || featureKey;
}
function mergePromoWithLocale(featureKey, locale) {
  const key = resolvePromoFeatureKey(featureKey);
  const base = PRO_FEATURE_PROMOS[key];
  if (!base) return null;
  const code = normalizeLocale(locale);
  if (code === "fr") return {
    ...base
  };
  const catalog = PRO_FEATURE_PROMOS_I18N[key];
  if (!catalog) return {
    ...base
  };
  const t = catalog[code] || catalog.en;
  if (!t) return {
    ...base
  };
  return {
    ...base,
    ...t
  };
}
function buildSidebarModulesPromo(locale) {
  const t = pickLocaleMessages(SIDEBAR_MODULES_PROMO, locale);
  return {
    title: t.title,
    icon: "mdi:puzzle-plus-outline",
    subtitle: t.subtitle,
    description: t.description,
    proPages: SIDEBAR_PRO_PAGE_META.map(({
      id,
      icon
    }) => ({
      icon,
      label: t.proPages[id].label,
      description: t.proPages[id].description
    })),
    bullets: t.bullets
  };
}
function buildCyberCampaignsPromo(locale) {
  const t = pickLocaleMessages(CYBER_CAMPAIGNS_PROMO, locale);
  return {
    icon: "mdi:shield-lock-outline",
    ...t
  };
}
export function getProFeaturePromoModalCopy(locale) {
  return pickLocaleMessages(MODAL_COPY, locale);
}
export function getLocalizedProFeaturePromo(featureKey, locale) {
  const key = resolvePromoFeatureKey(featureKey);
  if (key === "sidebarModules") {
    return buildSidebarModulesPromo(locale);
  }
  if (key === "cyberCampaigns") {
    return buildCyberCampaignsPromo(locale);
  }
  return mergePromoWithLocale(key, locale);
}
function getIntegrationCategoryBullets(category, locale) {
  const code = normalizeLocale(locale);
  if (code === "fr") {
    return INTEGRATION_CATEGORY_BULLETS_FR[category] || PRO_FEATURE_PROMOS.adminIntegrations.bullets;
  }
  const catalog = INTEGRATION_CATEGORY_BULLETS_I18N[category];
  if (!catalog) {
    return PRO_FEATURE_PROMOS.adminIntegrations.bullets;
  }
  return catalog[code] || catalog.en || PRO_FEATURE_PROMOS.adminIntegrations.bullets;
}
function getIntegrationPromoCopy(locale) {
  const code = normalizeLocale(locale);
  if (code === "fr") {
    return {
      defaultSubtitle: "Connecteur Veritas Pro",
      comingSoonDescription: "{name} sera prochainement disponible dans Veritas. Cette intégration est réservée à l'édition Pro et permettra de connecter cet outil à vos fiches entreprise.",
      availableDescription: "L'intégration {name} connecte Veritas à votre écosystème MSP : synchronisation des données, remontée d'alertes et vue unifiée depuis les fiches entreprise.",
      comingSoonBullet: "Soyez informé dès la mise à disposition du connecteur",
      availableBullet: "Disponible avec Veritas Pro et l'ensemble des connecteurs avancés"
    };
  }
  const pick = key => {
    const catalog = INTEGRATION_PROMO_I18N[key];
    return catalog[code] || catalog.en;
  };
  return {
    defaultSubtitle: pick("defaultSubtitle"),
    comingSoonDescription: pick("comingSoonDescription"),
    availableDescription: pick("availableDescription"),
    comingSoonBullet: pick("comingSoonBullet"),
    availableBullet: pick("availableBullet")
  };
}
const INTEGRATION_CATEGORY_BULLETS_FR = {
  monitoring: ["Remontez hôtes, alertes et métriques dans Veritas", "Croisez la supervision avec les fiches entreprise", "Réduisez les allers-retours entre la console de monitoring et Veritas"],
  ticketing: ["Synchronisez tickets et demandes avec votre ITSM", "Créez ou enrichissez des tickets depuis Veritas", "Gardez une vision unifiée du support client"],
  security: ["Centralisez l'inventaire antivirus et la posture sécurité", "Associez les tenants à vos fiches entreprise", "Suivez licences, postes et alertes depuis Veritas"],
  cloud: ["Reliez tenants cloud et identités à vos clients", "Préparez le pilotage Microsoft 365 ou Google Workspace", "Unifiez la visibilité cloud dans la cartographie entreprise"],
  email: ["Connectez notifications, SMTP ou canaux de messagerie", "Automatisez les échanges avec vos clients", "Intégrez les alertes dans vos processus support"],
  dns: ["Suivez domaines, zones DNS et dates de renouvellement", "Anticipez les expirations depuis Veritas", "Centralisez la gestion des noms de domaine clients"],
  backup: ["Remontez jobs, statuts et alertes de sauvegarde", "Croisez sauvegardes et fiches entreprise", "Pilotez la conformité backup depuis Veritas"],
  rmm: ["Synchronisez inventaire et endpoints RMM", "Réduisez la double saisie parc / supervision", "Harmonisez les données terrain avec Veritas"],
  platform: ["Connectez la plateforme à votre infrastructure", "Configurez les services techniques avancés", "Bénéficiez de l'ensemble des connecteurs Pro"]
};
export function buildIntegrationProPromo(integration, locale = "fr") {
  if (!integration) return getLocalizedProFeaturePromo("adminIntegrations", locale);
  const copy = getIntegrationPromoCopy(locale);
  const categoryBullets = getIntegrationCategoryBullets(integration.category, locale);
  const comingSoon = integration.status === "comingSoon";
  const name = integration.name;
  return {
    title: name,
    icon: integration.icon || "mdi:link-variant",
    subtitle: integration.description || copy.defaultSubtitle,
    description: comingSoon ? interpolate(copy.comingSoonDescription, {
      name
    }) : interpolate(copy.availableDescription, {
      name
    }),
    bullets: [...categoryBullets, comingSoon ? copy.comingSoonBullet : copy.availableBullet]
  };
}
