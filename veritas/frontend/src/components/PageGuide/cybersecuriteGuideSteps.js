import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "tabs",
  target: '[data-guide="cyber-tabs"]'
}, {
  key: "dashboard",
  target: '[data-guide="cyber-dashboard"]',
  handler: "showAntivirus"
}, {
  key: "sync",
  target: '[data-guide="cyber-sync"]',
  handler: "showAntivirus"
}];

const COPY = {
  fr: {
    tourTitle: "Cybersécurité",
    steps: {
      tabs: {
        title: "Rail des modules",
        content: "Naviguez via la colonne à gauche : Antivirus, Antispam et Sauvegarde."
      },
      dashboard: {
        title: "Flotte du module",
        content: "Recherche, filtres et tableau sont regroupés dans une carte. Cliquez une ligne pour ouvrir le détail ou la fiche client."
      },
      sync: {
        title: "Synchroniser la flotte",
        content: "Le bouton Sync dans la barre de la carte interroge les connecteurs pour mettre à jour l’état des solutions."
      }
    }
  },
  en: {
    tourTitle: "Cybersecurity",
    steps: {
      tabs: {
        title: "Module rail",
        content: "Use the left column to switch Antivirus, Antispam and Backup."
      },
      dashboard: {
        title: "Module fleet",
        content: "Search, filters and the table live in one card. Click a row to open the detail or the client record."
      },
      sync: {
        title: "Sync the fleet",
        content: "The Sync button in the card toolbar queries connectors to refresh solution status."
      }
    }
  },
  de: {
    tourTitle: "Cybersicherheit",
    steps: {
      tabs: {
        title: "Modul-Leiste",
        content: "Wechseln Sie links zwischen Antivirus, Antispam und Backup."
      },
      dashboard: {
        title: "Modulflotte",
        content: "Suche, Filter und Tabelle sind in einer Karte. Eine Zeile öffnet das Detail oder die Kundenakte."
      },
      sync: {
        title: "Flotte synchronisieren",
        content: "Diese Schaltfläche fragt Konnektoren ab, um alle Status des aktiven Moduls zu aktualisieren."
      }
    }
  },
  it: {
    tourTitle: "Cybersecurity",
    steps: {
      tabs: {
        title: "Rail moduli",
        content: "Passate a sinistra tra Antivirus, Antispam e Backup."
      },
      dashboard: {
        title: "Flotta del modulo",
        content: "Ricerca, filtri e tabella sono in una sola card. Una riga apre il dettaglio o la scheda cliente."
      },
      sync: {
        title: "Sincronizza la flotta",
        content: "Questo pulsante interroga i connettori per aggiornare gli stati del modulo attivo."
      }
    }
  },
  es: {
    tourTitle: "Ciberseguridad",
    steps: {
      tabs: {
        title: "Rail de módulos",
        content: "Cambie a la izquierda entre Antivirus, Antispam y Copia."
      },
      dashboard: {
        title: "Flota del módulo",
        content: "Búsqueda, filtros y tabla van en una tarjeta. Una fila abre el detalle o la ficha de cliente."
      },
      sync: {
        title: "Sincronizar la flota",
        content: "Este botón consulta los conectores para actualizar el estado del módulo activo."
      }
    }
  }
};

export function getCybersecuriteGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
