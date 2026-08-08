import { createLocaleGetter } from "./translate";
export const TICKET_SATISFACTION_CRITERION_KEYS = ["responsiveness", "solution_quality", "communication", "professionalism", "overall"];
const CRITERIA_COPY = {
  fr: {
    responsiveness: {
      label: "Réactivité",
      hint: "Rapidité de prise en charge et suivi de votre demande"
    },
    solution_quality: {
      label: "Qualité de la solution",
      hint: "Pertinence et efficacité de la résolution apportée"
    },
    communication: {
      label: "Communication",
      hint: "Clarté, écoute et courtoisie des échanges"
    },
    professionalism: {
      label: "Professionnalisme",
      hint: "Expertise et attitude de l'équipe support"
    },
    overall: {
      label: "Impression globale",
      hint: "Votre satisfaction générale sur cette demande"
    }
  },
  en: {
    responsiveness: {
      label: "Responsiveness",
      hint: "Speed of handling and follow-up on your request"
    },
    solution_quality: {
      label: "Solution quality",
      hint: "Relevance and effectiveness of the resolution provided"
    },
    communication: {
      label: "Communication",
      hint: "Clarity, listening and courtesy in interactions"
    },
    professionalism: {
      label: "Professionalism",
      hint: "Expertise and attitude of the support team"
    },
    overall: {
      label: "Overall impression",
      hint: "Your overall satisfaction with this request"
    }
  },
  de: {
    responsiveness: {
      label: "Reaktionszeit",
      hint: "Geschwindigkeit der Bearbeitung und Nachverfolgung Ihrer Anfrage"
    },
    solution_quality: {
      label: "Lösungsqualität",
      hint: "Relevanz und Wirksamkeit der bereitgestellten Lösung"
    },
    communication: {
      label: "Kommunikation",
      hint: "Klarheit, Zuhören und Höflichkeit im Austausch"
    },
    professionalism: {
      label: "Professionalität",
      hint: "Fachkompetenz und Auftreten des Support-Teams"
    },
    overall: {
      label: "Gesamteindruck",
      hint: "Ihre allgemeine Zufriedenheit mit dieser Anfrage"
    }
  },
  it: {
    responsiveness: {
      label: "Reattività",
      hint: "Velocità di presa in carico e follow-up della richiesta"
    },
    solution_quality: {
      label: "Qualità della soluzione",
      hint: "Pertinenza ed efficacia della risoluzione fornita"
    },
    communication: {
      label: "Comunicazione",
      hint: "Chiarezza, ascolto e cortesia negli scambi"
    },
    professionalism: {
      label: "Professionalità",
      hint: "Competenza e atteggiamento del team di supporto"
    },
    overall: {
      label: "Impressione generale",
      hint: "La sua soddisfazione complessiva per questa richiesta"
    }
  },
  es: {
    responsiveness: {
      label: "Reactividad",
      hint: "Rapidez en la toma en carga y el seguimiento de su solicitud"
    },
    solution_quality: {
      label: "Calidad de la solución",
      hint: "Pertinencia y eficacia de la resolución aportada"
    },
    communication: {
      label: "Comunicación",
      hint: "Claridad, escucha y cortesía en los intercambios"
    },
    professionalism: {
      label: "Profesionalismo",
      hint: "Experiencia y actitud del equipo de soporte"
    },
    overall: {
      label: "Impresión global",
      hint: "Su satisfacción general con esta solicitud"
    }
  }
};
const getCriteriaCopy = createLocaleGetter(CRITERIA_COPY);
export function getTicketSatisfactionCriteria(locale) {
  const copy = getCriteriaCopy(locale);
  return TICKET_SATISFACTION_CRITERION_KEYS.map(key => ({
    key,
    label: copy[key]?.label || key,
    hint: copy[key]?.hint || ""
  }));
}
export function getTicketSatisfactionCriterionLabel(locale, key) {
  const copy = getCriteriaCopy(locale);
  return copy[key]?.label || key;
}
