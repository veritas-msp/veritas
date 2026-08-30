import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="service-hero"]'
}, {
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
      hero: {
        title: "Services cloud et SaaS",
        content: "Pilotez les tenants Microsoft, les noms de domaine et les certificats SSL de vos clients depuis un seul endroit."
      },
      tabs: {
        title: "Modules",
        content: "Tenant Microsoft, Nom de domaine ou Certificat SSL : chaque onglet affiche la flotte et les alertes du service."
      },
      dashboard: {
        title: "Liste du service",
        content: "Consultez l’état des tenants, domaines ou certificats. Ouvrez une ligne pour le détail client ou le tenant."
      },
      sync: {
        title: "Synchroniser / vérifier",
        content: "Selon l’onglet, ce bouton rafraîchit les tenants Microsoft, resynchronise les domaines ou relance le contrôle SSL."
      }
    }
  },
  en: {
    tourTitle: "Cloud IT and services",
    steps: {
      hero: {
        title: "Cloud and SaaS services",
        content: "Manage Microsoft tenants, domain names and SSL certificates for all clients from one place."
      },
      tabs: {
        title: "Modules",
        content: "Microsoft tenant, Domain name or SSL certificate: each tab shows that service’s fleet and alerts."
      },
      dashboard: {
        title: "Service list",
        content: "Review tenant, domain or certificate status. Open a row for the client or tenant detail."
      },
      sync: {
        title: "Sync / check",
        content: "Depending on the tab, this button refreshes Microsoft tenants, resyncs domains or re-runs the SSL check."
      }
    }
  },
  de: {
    tourTitle: "Cloud IT und Dienste",
    steps: {
      hero: {
        title: "Cloud- und SaaS-Dienste",
        content: "Steuern Sie Microsoft-Tenants, Domains und SSL-Zertifikate Ihrer Kunden an einem Ort."
      },
      tabs: {
        title: "Module",
        content: "Microsoft-Tenant, Domain oder SSL-Zertifikat: Jeder Tab zeigt die Flotte und Alarmierungen des Dienstes."
      },
      dashboard: {
        title: "Dienstliste",
        content: "Prüfen Sie Status von Tenants, Domains oder Zertifikaten. Eine Zeile öffnet das Kunden- oder Tenant-Detail."
      },
      sync: {
        title: "Synchronisieren / prüfen",
        content: "Je nach Tab aktualisiert diese Schaltfläche Tenants, Domains oder den SSL-Check."
      }
    }
  },
  it: {
    tourTitle: "Cloud IT e servizi",
    steps: {
      hero: {
        title: "Servizi cloud e SaaS",
        content: "Gestite tenant Microsoft, domini e certificati SSL dei clienti da un’unica pagina."
      },
      tabs: {
        title: "Moduli",
        content: "Tenant Microsoft, dominio o certificato SSL: ogni scheda mostra la flotta e gli alert del servizio."
      },
      dashboard: {
        title: "Elenco del servizio",
        content: "Consultate lo stato di tenant, domini o certificati. Una riga apre il dettaglio cliente o tenant."
      },
      sync: {
        title: "Sincronizza / verifica",
        content: "In base alla scheda, questo pulsante aggiorna i tenant Microsoft, i domini o il controllo SSL."
      }
    }
  },
  es: {
    tourTitle: "Cloud IT y servicios",
    steps: {
      hero: {
        title: "Servicios cloud y SaaS",
        content: "Gestione tenants Microsoft, dominios y certificados SSL de sus clientes en un solo lugar."
      },
      tabs: {
        title: "Módulos",
        content: "Tenant Microsoft, dominio o certificado SSL: cada pestaña muestra la flota y las alertas del servicio."
      },
      dashboard: {
        title: "Lista del servicio",
        content: "Consulte el estado de tenants, dominios o certificados. Una fila abre el detalle de cliente o tenant."
      },
      sync: {
        title: "Sincronizar / comprobar",
        content: "Según la pestaña, este botón actualiza tenants Microsoft, dominios o la comprobación SSL."
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
