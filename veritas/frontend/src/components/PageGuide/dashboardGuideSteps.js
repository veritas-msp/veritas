import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="kpi-hero"]'
}, {
  key: "period",
  target: '[data-guide="kpi-period"]'
}, {
  key: "tabs",
  target: '[data-guide="kpi-tabs"]'
}, {
  key: "scope",
  target: '[data-guide="kpi-scope"]'
}, {
  key: "content",
  target: '[data-guide="kpi-content"]',
  handler: "showSupport"
}, {
  key: "export",
  target: '[data-guide="kpi-export"]'
}];

const COPY = {
  fr: {
    tourTitle: "Tableau de bord KPI",
    steps: {
      hero: {
        title: "Pilotage de l’activité",
        content: "Les indicateurs regroupent le support, le parc, les entreprises et la base de connaissances. Le bandeau rappelle la période analysée."
      },
      period: {
        title: "Période d’analyse",
        content: "Choisissez une plage (semaine, mois, personnalisée). Tous les graphiques et totaux se recalculent."
      },
      tabs: {
        title: "Familles d’indicateurs",
        content: "Support, Parc, Entreprises ou Base de connaissances : chaque onglet a ses cartes, tendances et répartitions."
      },
      scope: {
        title: "Périmètre",
        content: "Restreignez les KPI à tout Veritas, un agent, une entreprise ou un contact."
      },
      content: {
        title: "Cartes et graphiques",
        content: "Cliquez une carte ou une répartition pour le détail. Les tendances montrent l’évolution sur la période."
      },
      export: {
        title: "Exporter et programmer",
        content: "Téléchargez un PDF, envoyez le rapport par e-mail ou planifiez un envoi récurrent. Actualisez aussi les données ici."
      }
    }
  },
  en: {
    tourTitle: "KPI dashboard",
    steps: {
      hero: {
        title: "Activity overview",
        content: "Metrics cover support, fleet, companies and the knowledge base. The header shows the analysis period."
      },
      period: {
        title: "Analysis period",
        content: "Pick a range (week, month, custom). Every chart and total recalculates."
      },
      tabs: {
        title: "Metric families",
        content: "Support, Fleet, Companies or Knowledge base: each tab has its own cards, trends and breakdowns."
      },
      scope: {
        title: "Scope",
        content: "Limit KPIs to all of Veritas, one agent, one company or one contact."
      },
      content: {
        title: "Cards and charts",
        content: "Click a card or breakdown for detail. Trends show how figures move over the period."
      },
      export: {
        title: "Export and schedule",
        content: "Download a PDF, email the report or schedule a recurring send. You can also refresh the data here."
      }
    }
  },
  de: {
    tourTitle: "KPI-Dashboard",
    steps: {
      hero: {
        title: "Aktivitätssteuerung",
        content: "Kennzahlen zu Support, Park, Unternehmen und Wissensdatenbank. Der Kopf zeigt den Analysezeitraum."
      },
      period: {
        title: "Analysezeitraum",
        content: "Wählen Sie einen Zeitraum. Alle Diagramme und Summen werden neu berechnet."
      },
      tabs: {
        title: "Kennzahlfamilien",
        content: "Support, Gerätepark, Unternehmen oder Wissensdatenbank: jeder Tab hat eigene Karten und Trends."
      },
      scope: {
        title: "Umfang",
        content: "Beschränken Sie die KPI auf ganz Veritas, einen Agenten, ein Unternehmen oder einen Kontakt."
      },
      content: {
        title: "Karten und Diagramme",
        content: "Klicken Sie eine Karte oder Verteilung für Details. Trends zeigen die Entwicklung im Zeitraum."
      },
      export: {
        title: "Export und Planung",
        content: "PDF herunterladen, per E-Mail senden oder einen wiederkehrenden Versand planen. Daten hier auch aktualisieren."
      }
    }
  },
  it: {
    tourTitle: "Cruscotto KPI",
    steps: {
      hero: {
        title: "Pilotaggio dell’attività",
        content: "Gli indicatori coprono supporto, parco, aziende e knowledge base. L’intestazione ricorda il periodo analizzato."
      },
      period: {
        title: "Periodo di analisi",
        content: "Scegliete un intervallo. Grafici e totali si ricalcolano."
      },
      tabs: {
        title: "Famiglie di indicatori",
        content: "Supporto, Parco, Aziende o Knowledge base: ogni scheda ha carte, trend e ripartizioni."
      },
      scope: {
        title: "Perimetro",
        content: "Limitate i KPI a tutto Veritas, un agente, un’azienda o un contatto."
      },
      content: {
        title: "Carte e grafici",
        content: "Cliccate una carta o una ripartizione per il dettaglio. I trend mostrano l’evoluzione nel periodo."
      },
      export: {
        title: "Esporta e programma",
        content: "Scaricate un PDF, inviate il report via e-mail o programmate un invio ricorrente."
      }
    }
  },
  es: {
    tourTitle: "Cuadro de mando KPI",
    steps: {
      hero: {
        title: "Pilotaje de la actividad",
        content: "Los indicadores cubren soporte, parque, empresas y base de conocimientos. El encabezado recuerda el periodo analizado."
      },
      period: {
        title: "Periodo de análisis",
        content: "Elija un intervalo. Gráficos y totales se recalculan."
      },
      tabs: {
        title: "Familias de indicadores",
        content: "Soporte, Parque, Empresas o Base de conocimientos: cada pestaña tiene sus tarjetas y tendencias."
      },
      scope: {
        title: "Ámbito",
        content: "Limite los KPI a todo Veritas, un agente, una empresa o un contacto."
      },
      content: {
        title: "Tarjetas y gráficos",
        content: "Pulse una tarjeta o un desglose para el detalle. Las tendencias muestran la evolución del periodo."
      },
      export: {
        title: "Exportar y programar",
        content: "Descargue un PDF, envíe el informe por correo o programe un envío recurrente."
      }
    }
  }
};

export function getDashboardGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
