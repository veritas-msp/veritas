import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "tabs",
  target: '[data-guide="service-tabs"]'
}, {
  key: "dashboard",
  target: '[data-guide="service-dashboard"]',
  handler: "showMicrosoft"
}, {
  key: "sync",
  target: '[data-guide="service-sync"]'
}];

const COPY = {
  fr: {
    tourTitle: "Cloud IT et services",
    steps: {
      tabs: {
        title: "Rail des modules",
        content: "Naviguez via la colonne à gauche : Tenant Microsoft, Nom de domaine et Certificat SSL."
      },
      dashboard: {
        title: "Liste du service",
        content: "Recherche, filtres et tableau sont regroupés dans une carte. Ouvrez une ligne pour le détail client ou le tenant."
      },
      sync: {
        title: "Synchroniser / vérifier",
        content: "Le bouton Sync dans la barre de la carte rafraîchit les tenants, domaines ou le contrôle SSL selon le module."
      }
    }
  },
  en: {
    tourTitle: "Cloud IT and services",
    steps: {
      tabs: {
        title: "Module rail",
        content: "Use the left column to switch Microsoft tenant, Domain and SSL certificate."
      },
      dashboard: {
        title: "Service list",
        content: "Search, filters and the table live in one card. Open a row for the client or tenant detail."
      },
      sync: {
        title: "Sync / check",
        content: "The Sync button in the card toolbar refreshes tenants, domains or the SSL check for the open module."
      }
    }
  },
  de: {
    tourTitle: "Cloud IT und Dienste",
    steps: {
      tabs: {
        title: "Modul-Leiste",
        content: "Wechseln Sie links zwischen Microsoft-Tenant, Domain und SSL-Zertifikat."
      },
      dashboard: {
        title: "Dienstliste",
        content: "Suche, Filter und Tabelle sind in einer Karte. Eine Zeile öffnet das Kunden- oder Tenant-Detail."
      },
      sync: {
        title: "Synchronisieren / prüfen",
        content: "Je nach Modul aktualisiert diese Schaltfläche Tenants, Domains oder den SSL-Check."
      }
    }
  },
  it: {
    tourTitle: "Cloud IT e servizi",
    steps: {
      tabs: {
        title: "Rail moduli",
        content: "Passate a sinistra tra Tenant Microsoft, Domini e Certificati SSL."
      },
      dashboard: {
        title: "Elenco del servizio",
        content: "Ricerca, filtri e tabella sono in una sola card. Una riga apre il dettaglio cliente o tenant."
      },
      sync: {
        title: "Sincronizza / verifica",
        content: "A seconda del modulo, questo pulsante aggiorna i tenant Microsoft, i domini o il controllo SSL."
      }
    }
  },
  es: {
    tourTitle: "Cloud IT y servicios",
    steps: {
      tabs: {
        title: "Rail de módulos",
        content: "Cambie a la izquierda entre Tenant Microsoft, Dominio y Certificado SSL."
      },
      dashboard: {
        title: "Lista del servicio",
        content: "Búsqueda, filtros y tabla van en una tarjeta. Una fila abre el detalle de cliente o tenant."
      },
      sync: {
        title: "Sincronizar / verificar",
        content: "Según el módulo, este botón actualiza tenants Microsoft, dominios o el control SSL."
      }
    }
  }
};

export function getServicePageGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
