import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="cyber-hero"]'
}, {
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
      hero: {
        title: "Pilotage cybersécurité",
        content: "Suivez les solutions de sécurité de vos clients : antivirus, antispam, sauvegarde et campagnes. Le bandeau résume l’état du module ouvert."
      },
      tabs: {
        title: "Modules",
        content: "Basculez entre Antivirus, Antispam, Sauvegarde et Campagnes. Chaque onglet affiche la flotte correspondante. Les campagnes peuvent être réservées à Veritas Pro."
      },
      dashboard: {
        title: "Flotte du module",
        content: "La liste montre les solutions par entreprise, leur statut et les échéances. Cliquez une ligne pour ouvrir le détail ou la fiche client."
      },
      sync: {
        title: "Synchroniser la flotte",
        content: "Ce bouton interroge les connecteurs antivirus ou antispam pour mettre à jour l’état de toutes les solutions."
      }
    }
  },
  en: {
    tourTitle: "Cybersecurity",
    steps: {
      hero: {
        title: "Cybersecurity overview",
        content: "Track your clients’ security solutions: antivirus, antispam, backup and campaigns. The header summarises the open module."
      },
      tabs: {
        title: "Modules",
        content: "Switch between Antivirus, Antispam, Backup and Campaigns. Each tab shows the matching fleet. Campaigns may be reserved for Veritas Pro."
      },
      dashboard: {
        title: "Module fleet",
        content: "The list shows solutions per company, status and expiry. Click a row to open the detail or the client record."
      },
      sync: {
        title: "Sync the fleet",
        content: "This button queries antivirus or antispam connectors to refresh every solution’s status."
      }
    }
  },
  de: {
    tourTitle: "Cybersicherheit",
    steps: {
      hero: {
        title: "Cybersicherheit im Überblick",
        content: "Verfolgen Sie die Sicherheitslösungen Ihrer Kunden: Antivirus, Antispam, Backup und Kampagnen. Der Kopfbereich fasst das geöffnete Modul zusammen."
      },
      tabs: {
        title: "Module",
        content: "Wechseln Sie zwischen Antivirus, Antispam, Backup und Kampagnen. Kampagnen können Veritas Pro vorbehalten sein."
      },
      dashboard: {
        title: "Modulflotte",
        content: "Die Liste zeigt Lösungen je Unternehmen, Status und Ablauf. Eine Zeile öffnet das Detail oder die Kundenakte."
      },
      sync: {
        title: "Flotte synchronisieren",
        content: "Diese Schaltfläche fragt Antivirus- oder Antispam-Konnektoren ab, um alle Status zu aktualisieren."
      }
    }
  },
  it: {
    tourTitle: "Cybersecurity",
    steps: {
      hero: {
        title: "Panoramica cybersecurity",
        content: "Seguite le soluzioni di sicurezza dei clienti: antivirus, antispam, backup e campagne. L’intestazione riepiloga il modulo aperto."
      },
      tabs: {
        title: "Moduli",
        content: "Passate tra Antivirus, Antispam, Backup e Campagne. Le campagne possono essere riservate a Veritas Pro."
      },
      dashboard: {
        title: "Flotta del modulo",
        content: "L’elenco mostra le soluzioni per azienda, stato e scadenze. Una riga apre il dettaglio o la scheda cliente."
      },
      sync: {
        title: "Sincronizza la flotta",
        content: "Questo pulsante interroga i connettori antivirus o antispam per aggiornare tutti gli stati."
      }
    }
  },
  es: {
    tourTitle: "Ciberseguridad",
    steps: {
      hero: {
        title: "Visión de ciberseguridad",
        content: "Siga las soluciones de seguridad de sus clientes: antivirus, antispam, copias de seguridad y campañas. El encabezado resume el módulo abierto."
      },
      tabs: {
        title: "Módulos",
        content: "Cambie entre Antivirus, Antispam, Copia de seguridad y Campañas. Las campañas pueden estar reservadas a Veritas Pro."
      },
      dashboard: {
        title: "Flota del módulo",
        content: "La lista muestra las soluciones por empresa, estado y vencimientos. Una fila abre el detalle o la ficha de cliente."
      },
      sync: {
        title: "Sincronizar la flota",
        content: "Este botón consulta los conectores antivirus o antispam para actualizar todos los estados."
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
