import { pickLocaleMessages } from "../../i18n/translate";
const SIDEBAR_GUIDE_COPY = {
  fr: {
    tourTitle: "Découverte du menu",
    helpAria: "Présentation du menu latéral",
    pageHelpAria: "Aide de la page en cours",
    intro: {
      title: "Bienvenue dans Veritas",
      content: "Ce guide vous présente le menu latéral : votre point d'entrée vers les entreprises, le support, la supervision et le pilotage."
    },
    brand: {
      title: "Accueil",
      content: "Revenez à tout moment sur le tableau de bord d'accueil en cliquant sur le logo Veritas."
    },
    crm: {
      title: "CRM",
      content: "Gérez vos entreprises sous contrat et vos contacts depuis cette section."
    },
    exploitation: {
      title: "Exploitation",
      content: "Tickets de support, prestations et planning : tout le quotidien opérationnel est ici."
    },
    managed: {
      title: "Services managés",
      content: "Supervision, cybersécurité et cloud : pilotez l'infrastructure de vos clients."
    },
    pilotage: {
      title: "Pilotage",
      content: "KPI, documents et rapports pour suivre l'activité et partager avec vos clients."
    },
    utilities: {
      title: "Réglages rapides",
      content: "Le ? ouvre l'aide de la page en cours lorsqu'elle existe, sinon ce guide du menu. Basculez aussi le thème et consultez vos notifications."
    },
    account: {
      title: "Votre compte",
      content: "Profil, administration, support et déconnexion sont accessibles depuis votre avatar."
    }
  },
  en: {
    tourTitle: "Menu tour",
    helpAria: "Sidebar menu tour",
    pageHelpAria: "Help for the current page",
    intro: {
      title: "Welcome to Veritas",
      content: "This tour walks you through the sidebar — your hub for companies, support, monitoring, and management."
    },
    brand: {
      title: "Home",
      content: "Return to the home dashboard anytime by clicking the Veritas logo."
    },
    crm: {
      title: "CRM",
      content: "Manage contracted companies and contacts from this section."
    },
    exploitation: {
      title: "Operations",
      content: "Support tickets, services, and scheduling — your day-to-day work lives here."
    },
    managed: {
      title: "Managed services",
      content: "Monitoring, cybersecurity, and cloud — run your clients' infrastructure."
    },
    pilotage: {
      title: "Management",
      content: "KPIs, documents, and reports to track activity and share with clients."
    },
    utilities: {
      title: "Quick settings",
      content: "? opens help for the current page when available, otherwise this menu tour. Also switch theme and check notifications."
    },
    account: {
      title: "Your account",
      content: "Profile, administration, support, and sign-out are available from your avatar."
    }
  },
  de: {
    tourTitle: "Menüführung",
    helpAria: "Seitenleisten-Tour",
    pageHelpAria: "Hilfe zur aktuellen Seite",
    intro: {
      title: "Willkommen bei Veritas",
      content: "Diese Führung zeigt die Seitenleiste — Ihr Einstieg zu Unternehmen, Support, Überwachung und Steuerung."
    },
    brand: {
      title: "Startseite",
      content: "Kehren Sie jederzeit über das Veritas-Logo zum Start-Dashboard zurück."
    },
    crm: {
      title: "CRM",
      content: "Verwalten Sie Vertragsunternehmen und Kontakte in diesem Bereich."
    },
    exploitation: {
      title: "Betrieb",
      content: "Support-Tickets, Leistungen und Planung — Ihr operativer Alltag."
    },
    managed: {
      title: "Managed Services",
      content: "Supervision, Cybersicherheit und Cloud — Infrastruktur Ihrer Kunden steuern."
    },
    pilotage: {
      title: "Steuerung",
      content: "KPIs, Dokumente und Berichte für Aktivität und Kundenkommunikation."
    },
    utilities: {
      title: "Schnelleinstellungen",
      content: "? öffnet die Seitenhilfe, falls vorhanden, sonst diese Menüführung. Thema wechseln und Benachrichtigungen prüfen."
    },
    account: {
      title: "Ihr Konto",
      content: "Profil, Administration, Support und Abmeldung über Ihren Avatar."
    }
  },
  it: {
    tourTitle: "Tour del menu",
    helpAria: "Presentazione menu laterale",
    pageHelpAria: "Guida della pagina corrente",
    intro: {
      title: "Benvenuti in Veritas",
      content: "Questa guida presenta la barra laterale — l'hub per aziende, supporto, supervisione e gestione."
    },
    brand: {
      title: "Home",
      content: "Tornate alla dashboard iniziale cliccando sul logo Veritas."
    },
    crm: {
      title: "CRM",
      content: "Gestite aziende in contratto e contatti da questa sezione."
    },
    exploitation: {
      title: "Operatività",
      content: "Ticket di supporto, prestazioni e pianificazione — il lavoro quotidiano."
    },
    managed: {
      title: "Servizi gestiti",
      content: "Supervisione, cybersicurezza e cloud — gestite l'infrastruttura dei clienti."
    },
    pilotage: {
      title: "Gestione",
      content: "KPI, documenti e report per monitorare l'attività e condividere con i clienti."
    },
    utilities: {
      title: "Impostazioni rapide",
      content: "Il ? apre la guida della pagina corrente se disponibile, altrimenti questo tour del menu. Cambiate anche tema e notifiche."
    },
    account: {
      title: "Il vostro account",
      content: "Profilo, amministrazione, supporto e disconnessione dall'avatar."
    }
  },
  es: {
    tourTitle: "Recorrido del menú",
    helpAria: "Presentación del menú lateral",
    pageHelpAria: "Ayuda de la página actual",
    intro: {
      title: "Bienvenido a Veritas",
      content: "Este recorrido presenta la barra lateral — su centro para empresas, soporte, supervisión y gestión."
    },
    brand: {
      title: "Inicio",
      content: "Vuelva al panel de inicio en cualquier momento con el logo Veritas."
    },
    crm: {
      title: "CRM",
      content: "Gestione empresas con contrato y contactos desde esta sección."
    },
    exploitation: {
      title: "Operaciones",
      content: "Tickets de soporte, servicios y planificación — el día a día operativo."
    },
    managed: {
      title: "Servicios gestionados",
      content: "Supervisión, ciberseguridad y cloud — gestione la infraestructura de sus clientes."
    },
    pilotage: {
      title: "Gestión",
      content: "KPI, documentos e informes para seguir la actividad y compartir con clientes."
    },
    utilities: {
      title: "Ajustes rápidos",
      content: "El ? abre la ayuda de la página actual si existe; si no, este recorrido del menú. También tema y notificaciones."
    },
    account: {
      title: "Su cuenta",
      content: "Perfil, administración, soporte y cierre de sesión desde su avatar."
    }
  }
};
export function getSidebarGuideCopy(locale) {
  return pickLocaleMessages(SIDEBAR_GUIDE_COPY, locale);
}
export function buildSidebarGuideSteps({
  locale,
  showCrmSection,
  showExploitationSection,
  showManagedSection,
  showPilotageSection
}) {
  const copy = getSidebarGuideCopy(locale);
  const steps = [{
    target: '[data-sidebar-guide="sidebar-root"]',
    title: copy.intro.title,
    content: copy.intro.content
  }, {
    target: '[data-sidebar-guide="brand"]',
    title: copy.brand.title,
    content: copy.brand.content
  }];
  if (showCrmSection) {
    steps.push({
      target: '[data-sidebar-guide="crm"]',
      title: copy.crm.title,
      content: copy.crm.content
    });
  }
  if (showExploitationSection) {
    steps.push({
      target: '[data-sidebar-guide="exploitation"]',
      title: copy.exploitation.title,
      content: copy.exploitation.content
    });
  }
  if (showManagedSection) {
    steps.push({
      target: '[data-sidebar-guide="managed"]',
      title: copy.managed.title,
      content: copy.managed.content
    });
  }
  if (showPilotageSection) {
    steps.push({
      target: '[data-sidebar-guide="pilotage"]',
      title: copy.pilotage.title,
      content: copy.pilotage.content
    });
  }
  steps.push({
    target: '[data-sidebar-guide="utilities"]',
    title: copy.utilities.title,
    content: copy.utilities.content
  }, {
    target: '[data-sidebar-guide="account"]',
    title: copy.account.title,
    content: copy.account.content
  });
  return {
    steps,
    tourTitle: copy.tourTitle,
    helpAria: copy.helpAria,
    pageHelpAria: copy.pageHelpAria
  };
}
