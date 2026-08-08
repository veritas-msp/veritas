import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const PAGE_GUIDE_COPY = {
  fr: {
    defaultTitle: "Guide de la page",
    closeAria: "Fermer le guide",
    skip: "Passer",
    previous: "Précédent",
    next: "Suivant",
    finish: "Terminer",
    stepProgress: "Étape {step} sur {total}",
    helpFabDefault: "Aide sur cette page"
  },
  en: {
    defaultTitle: "Page guide",
    closeAria: "Close guide",
    skip: "Skip",
    previous: "Previous",
    next: "Next",
    finish: "Finish",
    stepProgress: "Step {step} of {total}",
    helpFabDefault: "Help for this page"
  },
  de: {
    defaultTitle: "Seitenführung",
    closeAria: "Führung schließen",
    skip: "Überspringen",
    previous: "Zurück",
    next: "Weiter",
    finish: "Fertig",
    stepProgress: "Schritt {step} von {total}",
    helpFabDefault: "Hilfe zu dieser Seite"
  },
  it: {
    defaultTitle: "Guida pagina",
    closeAria: "Chiudi guida",
    skip: "Salta",
    previous: "Precedente",
    next: "Avanti",
    finish: "Fine",
    stepProgress: "Passaggio {step} di {total}",
    helpFabDefault: "Aiuto su questa pagina"
  },
  es: {
    defaultTitle: "Guía de la página",
    closeAria: "Cerrar guía",
    skip: "Omitir",
    previous: "Anterior",
    next: "Siguiente",
    finish: "Terminar",
    stepProgress: "Paso {step} de {total}",
    helpFabDefault: "Ayuda de esta página"
  }
};
export function getPageGuideCopy(locale) {
  const t = pickLocaleMessages(PAGE_GUIDE_COPY, locale);
  return {
    ...t,
    formatStepProgress: (step, total) => interpolate(t.stepProgress, {
      step: String(step),
      total: String(total)
    })
  };
}
