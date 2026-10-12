import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="report-hero"]'
}, {
  key: "types",
  target: '[data-guide="report-types"]',
  handler: "showTypes"
}, {
  key: "client",
  target: '[data-guide="report-client"]',
  handler: "showClient"
}];

const COPY = {
  fr: {
    tourTitle: "Rapports",
    steps: {
      hero: {
        title: "Générer un rapport client",
        content: "Cette page crée un document professionnel : état de supervision, compte-rendu d’intervention ou cahier de recette. Choisissez d’abord le type de rapport, puis l’entreprise."
      },
      types: {
        title: "Quel rapport générer ?",
        content: "Choisissez un type (supervision, intervention, audit…). Un clic passe à la sélection de l’entreprise."
      },
      client: {
        title: "Entreprise",
        content: "Recherchez et cliquez sur le client : le rapport se lance immédiatement."
      }
    }
  },
  en: {
    tourTitle: "Reports",
    steps: {
      hero: {
        title: "Generate a client report",
        content: "This page builds a professional document: supervision status, intervention report or acceptance booklet. Pick the report type first, then the company."
      },
      steps: {
        title: "Two steps",
        content: "1) Pick the report type. 2) Pick the company."
      },
      types: {
        title: "Report type",
        content: "Supervision status, intervention report or acceptance booklet. A click continues to company selection."
      },
      client: {
        title: "Company",
        content: "Search and click the client to start the report."
      }
    }
  },
  de: {
    tourTitle: "Berichte",
    steps: {
      hero: {
        title: "Kundenbericht erzeugen",
        content: "Diese Seite erstellt ein professionelles Dokument: Überwachungsstatus, Einsatzbericht oder Abnahmeheft. Wählen Sie zuerst den Berichtstyp, dann das Unternehmen."
      },
      steps: {
        title: "Zwei Schritte",
        content: "1) Berichtstyp wählen. 2) Unternehmen wählen."
      },
      types: {
        title: "Berichtstyp",
        content: "Überwachungsstatus, Einsatzbericht oder Abnahmeheft. Ein Klick führt zur Unternehmensauswahl."
      },
      client: {
        title: "Unternehmen",
        content: "Suchen und wählen Sie den Kunden: der Bericht startet sofort."
      }
    }
  },
  it: {
    tourTitle: "Report",
    steps: {
      hero: {
        title: "Generare un report cliente",
        content: "Questa pagina crea un documento professionale: stato di supervisione, resoconto d’intervento o quaderno di collaudo. Scegliete prima il tipo, poi l’azienda."
      },
      steps: {
        title: "Due passaggi",
        content: "1) Scegliete il tipo di report. 2) Scegliete l’azienda."
      },
      types: {
        title: "Tipo di report",
        content: "Stato di supervisione, report d’intervento o quaderno di collaudo. Un clic passa alla selezione azienda."
      },
      client: {
        title: "Azienda",
        content: "Cercate e selezionate il cliente: il report si avvia subito."
      }
    }
  },
  es: {
    tourTitle: "Informes",
    steps: {
      hero: {
        title: "Generar un informe de cliente",
        content: "Esta página crea un documento profesional: estado de supervisión, informe de intervención o cuaderno de receta. Elija primero el tipo, luego la empresa."
      },
      steps: {
        title: "Dos pasos",
        content: "1) Elija el tipo de informe. 2) Elija la empresa."
      },
      types: {
        title: "Tipo de informe",
        content: "Estado de supervisión, informe de intervención o cuaderno de receta. Un clic pasa a la selección de empresa."
      },
      client: {
        title: "Empresa",
        content: "Busque y seleccione el cliente: el informe se inicia de inmediato."
      }
    }
  }
};

export function getRapportGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
