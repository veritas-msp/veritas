import { interpolate, normalizeLocale, pickLocaleMessages } from "../../i18n/translate";
import { REPORT_TYPE_DEFS } from "./reportTypeConstants";
const WIZARD_STEPS = {
  supervisionEtat: ["Périmètre", "État temps réel", "Synthèse", "Validation"],
  intervention: ["Contexte", "Interventions", "Compte-rendu", "Validation"],
  cahierRecette: ["Périmètre projet", "Solutions & matériel", "Fonctionnement", "Recette"]
};
const WIZARD_STEPS_EN = {
  supervisionEtat: ["Scope", "Live status", "Summary", "Sign-off"],
  intervention: ["Context", "Interventions", "Report", "Sign-off"],
  cahierRecette: ["Project scope", "Solutions & hardware", "Operation", "Acceptance"]
};
const WIZARD_STEPS_DE = {
  supervisionEtat: ["Umfang", "Live-Status", "Zusammenfassung", "Freigabe"],
  intervention: ["Kontext", "Einsätze", "Bericht", "Freigabe"],
  cahierRecette: ["Projektumfang", "Lösungen & Hardware", "Betrieb", "Abnahme"]
};
const WIZARD_STEPS_IT = {
  supervisionEtat: ["Perimetro", "Stato in tempo reale", "Sintesi", "Validazione"],
  intervention: ["Contesto", "Interventi", "Resoconto", "Validazione"],
  cahierRecette: ["Perimetro progetto", "Soluzioni & hardware", "Funzionamento", "Collaudo"]
};
const WIZARD_STEPS_ES = {
  supervisionEtat: ["Alcance", "Estado en tiempo real", "Síntesis", "Validación"],
  intervention: ["Contexto", "Intervenciones", "Informe", "Validación"],
  cahierRecette: ["Alcance del proyecto", "Soluciones y hardware", "Funcionamiento", "Recette"]
};
function buildWizard(localeCopy) {
  return {
    progressAria: localeCopy.wizardProgressAria,
    stepClient: localeCopy.wizardStepClient,
    stepRecap: localeCopy.wizardStepRecap,
    stepType: localeCopy.wizardStepType,
    stepBuild: localeCopy.wizardStepBuild,
    stepNavAria: localeCopy.wizardStepNavAria,
    clientTitle: localeCopy.wizardClientTitle,
    clientHint: localeCopy.wizardClientHint,
    recapTitle: localeCopy.wizardRecapTitle,
    recapHint: localeCopy.wizardRecapHint,
    recapEmpty: localeCopy.wizardRecapEmpty,
    typeTitle: localeCopy.wizardTypeTitle,
    typeHint: localeCopy.wizardTypeHint,
    continue: localeCopy.wizardContinue,
    back: localeCopy.wizardBack,
    startReport: localeCopy.wizardStartReport,
    backToSelection: localeCopy.wizardBackToSelection,
    placeholderTitle: localeCopy.wizardPlaceholderTitle,
    placeholderHint: localeCopy.wizardPlaceholderHint,
    placeholderBadge: localeCopy.wizardPlaceholderBadge,
    finishSoon: localeCopy.wizardFinishSoon,
    formatStepOf: (current, total) => interpolate(localeCopy.wizardStepOf, {
      current: String(current),
      total: String(total)
    }),
    clearSearch: localeCopy.wizardClearSearch,
    clearSearchAria: localeCopy.wizardClearSearchAria,
    loadingClients: localeCopy.wizardLoadingClients,
    clientGridAria: localeCopy.wizardClientGridAria,
    changeClient: localeCopy.wizardChangeClient,
    formatResultsCount: (filtered, total) => {
      if (filtered === total) {
        return interpolate(localeCopy.wizardResultsAll, {
          total: String(total)
        });
      }
      return interpolate(localeCopy.wizardResultsFiltered, {
        filtered: String(filtered),
        total: String(total)
      });
    },
    formatDevices: count => {
      const safe = Number(count) || 0;
      if (safe <= 0) return localeCopy.wizardDevicesNone;
      if (safe === 1) return localeCopy.wizardDevicesOne;
      return interpolate(localeCopy.wizardDevicesMany, {
        count: String(safe)
      });
    },
    formatServices: count => {
      const safe = Number(count) || 0;
      if (safe <= 0) return localeCopy.wizardServicesNone;
      if (safe === 1) return localeCopy.wizardServicesOne;
      return interpolate(localeCopy.wizardServicesMany, {
        count: String(safe)
      });
    },
    formatContinueWith: name => interpolate(localeCopy.wizardContinueWith, {
      name: String(name || "")
    })
  };
}
const RAPPORT_PAGE = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Documents",
    pageTitle: "Rapports",
    subtitle: "Choisissez une entreprise, puis le type de rapport à rédiger.",
    create: {
      enterpriseLabel: "Entreprise",
      enterpriseSearch: "Rechercher une entreprise…",
      noEnterprise: "Aucune entreprise trouvée",
      badgeSoon: "Bientôt disponible",
      getClientLabel: id => `Client #${id}`
    },
    reportTypes: {
      supervisionEtat: {
        title: "État de supervision",
        description: "Instantané temps réel du parc supervisé : alertes, disponibilité et indicateurs clés."
      },
      intervention: {
        title: "Rapport d'intervention",
        description: "Compte-rendu d'une intervention technique : contexte, actions réalisées et résultat."
      },
      cahierRecette: {
        title: "Cahier de recette",
        description: "Solutions, produits et matériels installés : rôle, fonctionnement et validation client."
      }
    },
    wizardProgressAria: "Progression de création",
    wizardStepClient: "Client",
    wizardStepRecap: "Récapitulatif",
    wizardStepType: "Type de rapport",
    wizardStepBuild: "Étapes du rapport",
    wizardStepNavAria: "Étapes du rapport",
    wizardClientTitle: "Pour quel client ?",
    wizardClientHint: "Cliquez sur une entreprise pour choisir le type de rapport.",
    wizardRecapTitle: "Récapitulatif entreprise",
    wizardRecapHint: "Vérifiez le contrat, les options et le parc avant de continuer.",
    wizardRecapEmpty: "Cliquez sur une carte entreprise pour afficher son récapitulatif.",
    wizardClearSearch: "Effacer la recherche",
    wizardClearSearchAria: "Effacer la recherche",
    wizardLoadingClients: "Chargement…",
    wizardClientGridAria: "Liste des entreprises",
    wizardChangeClient: "Changer",
    wizardResultsAll: "{total} entreprises",
    wizardResultsFiltered: "{filtered} sur {total}",
    wizardDevicesNone: "Aucun périph.",
    wizardDevicesOne: "1 périph.",
    wizardDevicesMany: "{count} périph.",
    wizardServicesNone: "Aucun service",
    wizardServicesOne: "1 service",
    wizardServicesMany: "{count} services",
    wizardContinueWith: "Continuer avec {name}",
    wizardTypeTitle: "Quel type de rapport ?",
    wizardTypeHint: "Cliquez sur un type de rapport pour commencer.",
    wizardContinue: "Continuer",
    wizardBack: "Retour",
    wizardStartReport: "Commencer le rapport",
    wizardBackToSelection: "Retour à la sélection",
    wizardPlaceholderTitle: "Contenu à venir",
    wizardPlaceholderHint: "Les formulaires et données de cette étape seront disponibles dans une prochaine version.",
    wizardPlaceholderBadge: "En développement",
    wizardFinishSoon: "Finaliser · bientôt disponible",
    wizardStepOf: "Étape {current} sur {total}",
    recap: {
      contract: "Contrat",
      contractExpires: "Expiration",
      contractOptions: "Options du contrat",
      services: "Services supervisés",
      equipment: "Périphériques",
      commercial: "Commercial",
      contact: "Contact principal",
      sites: "Sites",
      clientNumber: "N° client",
      noOptions: "Aucune option active.",
      noServices: "Aucun service de supervision activé.",
      noEquipment: "Aucun périphérique recensé.",
      contractActive: "Actif",
      contractExpiringSoon: "Expire bientôt",
      contractExpired: "Expiré",
      contractSuspended: "Suspendu",
      contractUnknown: "Non renseigné"
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Documents",
    pageTitle: "Reports",
    subtitle: "Pick a company, then choose the report type.",
    create: {
      enterpriseLabel: "Company",
      enterpriseSearch: "Search for a company…",
      noEnterprise: "No company found",
      badgeSoon: "Coming soon",
      getClientLabel: id => `Client #${id}`
    },
    reportTypes: {
      supervisionEtat: {
        title: "Monitoring snapshot",
        description: "Real-time view of supervised assets: alerts, availability and key indicators."
      },
      intervention: {
        title: "Intervention report",
        description: "Technical intervention report: context, actions performed and outcome."
      },
      cahierRecette: {
        title: "Acceptance workbook",
        description: "Installed solutions, products and hardware: role, operation and client sign-off."
      }
    },
    wizardProgressAria: "Creation progress",
    wizardStepClient: "Client",
    wizardStepRecap: "Summary",
    wizardStepType: "Report type",
    wizardStepBuild: "Report steps",
    wizardStepNavAria: "Report steps",
    wizardClientTitle: "Which client?",
    wizardClientHint: "Click a company to choose the report type.",
    wizardRecapTitle: "Company summary",
    wizardRecapHint: "Review contract, options and assets before continuing.",
    wizardRecapEmpty: "Click a company card to display its summary.",
    wizardClearSearch: "Clear search",
    wizardClearSearchAria: "Clear search",
    wizardLoadingClients: "Loading…",
    wizardClientGridAria: "Company list",
    wizardChangeClient: "Change",
    wizardResultsAll: "{total} companies",
    wizardResultsFiltered: "{filtered} of {total}",
    wizardDevicesNone: "No devices",
    wizardDevicesOne: "1 device",
    wizardDevicesMany: "{count} devices",
    wizardServicesNone: "No services",
    wizardServicesOne: "1 service",
    wizardServicesMany: "{count} services",
    wizardContinueWith: "Continue with {name}",
    wizardTypeTitle: "Which report type?",
    wizardTypeHint: "Click a report type to get started.",
    wizardContinue: "Continue",
    wizardBack: "Back",
    wizardStartReport: "Start report",
    wizardBackToSelection: "Back to selection",
    wizardPlaceholderTitle: "Content coming soon",
    wizardPlaceholderHint: "Forms and data for this step will be available in a future release.",
    wizardPlaceholderBadge: "In development",
    wizardFinishSoon: "Finish · coming soon",
    wizardStepOf: "Step {current} of {total}",
    recap: {
      contract: "Contract",
      contractExpires: "Expires",
      contractOptions: "Contract options",
      services: "Supervised services",
      equipment: "Devices",
      commercial: "Account manager",
      contact: "Primary contact",
      sites: "Sites",
      clientNumber: "Client no.",
      noOptions: "No active options.",
      noServices: "No supervision services enabled.",
      noEquipment: "No devices recorded.",
      contractActive: "Active",
      contractExpiringSoon: "Expiring soon",
      contractExpired: "Expired",
      contractSuspended: "Suspended",
      contractUnknown: "Not set"
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Dokumente",
    pageTitle: "Berichte",
    subtitle: "Kunde wählen, Berichtstyp wählen, dann die Schritte durchlaufen.",
    create: {
      enterpriseLabel: "Unternehmen",
      enterpriseSearch: "Unternehmen suchen…",
      noEnterprise: "Kein Unternehmen gefunden",
      badgeSoon: "Demnächst",
      getClientLabel: id => `Kunde #${id}`
    },
    reportTypes: {
      supervisionEtat: {
        title: "Supervisionsstatus",
        description: "Echtzeit-Snapshot der überwachten Assets: Alarme, Verfügbarkeit und Kennzahlen."
      },
      intervention: {
        title: "Interventionsbericht",
        description: "Technischer Einsatzbericht: Kontext, Maßnahmen und Ergebnis."
      },
      cahierRecette: {
        title: "Abnahmebuch",
        description: "Installierte Lösungen, Produkte und Hardware: Rolle, Betrieb und Kundenfreigabe."
      }
    },
    wizardProgressAria: "Erstellungsfortschritt",
    wizardStepClient: "Kunde",
    wizardStepRecap: "Übersicht",
    wizardStepType: "Berichtstyp",
    wizardStepBuild: "Berichtsschritte",
    wizardStepNavAria: "Berichtsschritte",
    wizardClientTitle: "Für welchen Kunden?",
    wizardClientHint: "Unternehmen anklicken, um den Berichtstyp zu wählen.",
    wizardRecapTitle: "Unternehmensübersicht",
    wizardRecapHint: "Vertrag, Optionen und Assets prüfen, bevor Sie den Berichtstyp wählen.",
    wizardRecapEmpty: "Klicken Sie auf eine Unternehmenskarte, um die Übersicht anzuzeigen.",
    wizardTypeTitle: "Welcher Berichtstyp?",
    wizardTypeHint: "Wählen Sie die passende Vorlage.",
    wizardContinue: "Weiter",
    wizardClearSearch: "Suche löschen",
    wizardClearSearchAria: "Suche löschen",
    wizardLoadingClients: "Laden…",
    wizardClientGridAria: "Unternehmensliste",
    wizardChangeClient: "Ändern",
    wizardResultsAll: "{total} Unternehmen",
    wizardResultsFiltered: "{filtered} von {total}",
    wizardDevicesNone: "Keine Geräte",
    wizardDevicesOne: "1 Gerät",
    wizardDevicesMany: "{count} Geräte",
    wizardServicesNone: "Keine Dienste",
    wizardServicesOne: "1 Dienst",
    wizardServicesMany: "{count} Dienste",
    wizardContinueWith: "Weiter mit {name}",
    wizardBack: "Zurück",
    wizardStartReport: "Bericht starten",
    wizardBackToSelection: "Zurück zur Auswahl",
    wizardPlaceholderTitle: "Inhalt folgt",
    wizardPlaceholderHint: "Formulare und Daten für diesen Schritt kommen in einer späteren Version.",
    wizardPlaceholderBadge: "In Entwicklung",
    wizardFinishSoon: "Abschließen · demnächst",
    wizardStepOf: "Schritt {current} von {total}",
    recap: {
      contract: "Vertrag",
      contractExpires: "Ablauf",
      contractOptions: "Vertragsoptionen",
      services: "Überwachte Dienste",
      equipment: "Geräte",
      commercial: "Vertrieb",
      contact: "Hauptkontakt",
      sites: "Standorte",
      clientNumber: "Kundennr.",
      noOptions: "Keine aktiven Optionen.",
      noServices: "Keine Überwachungsdienste aktiv.",
      noEquipment: "Keine Geräte erfasst.",
      contractActive: "Aktiv",
      contractExpiringSoon: "Läuft bald ab",
      contractExpired: "Abgelaufen",
      contractSuspended: "Ausgesetzt",
      contractUnknown: "Nicht angegeben"
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Documenti",
    pageTitle: "Report",
    subtitle: "Scegli un cliente, un tipo di report, poi segui le fasi di redazione.",
    create: {
      enterpriseLabel: "Azienda",
      enterpriseSearch: "Cerca un'azienda…",
      noEnterprise: "Nessuna azienda trovata",
      badgeSoon: "Prossimamente",
      getClientLabel: id => `Cliente #${id}`
    },
    reportTypes: {
      supervisionEtat: {
        title: "Stato di supervisione",
        description: "Istantanea in tempo reale del parco supervisionato: alert, disponibilità e KPI."
      },
      intervention: {
        title: "Report di intervento",
        description: "Resoconto di intervento tecnico: contesto, azioni svolte e esito."
      },
      cahierRecette: {
        title: "Cahier de recette",
        description: "Soluzioni, prodotti e hardware installati: ruolo, funzionamento e validazione cliente."
      }
    },
    wizardProgressAria: "Avanzamento creazione",
    wizardStepClient: "Cliente",
    wizardStepRecap: "Riepilogo",
    wizardStepType: "Tipo di report",
    wizardStepBuild: "Fasi del report",
    wizardStepNavAria: "Fasi del report",
    wizardClientTitle: "Per quale cliente?",
    wizardClientHint: "Clicca su un'azienda per scegliere il tipo di report.",
    wizardRecapEmpty: "Clicca su una scheda azienda per visualizzare il riepilogo.",
    wizardRecapTitle: "Riepilogo azienda",
    wizardRecapHint: "Verifica contratto, opzioni e parco prima di scegliere il report.",
    wizardTypeTitle: "Quale tipo di report?",
    wizardTypeHint: "Scegli il modello più adatto.",
    wizardContinue: "Continua",
    wizardClearSearch: "Cancella ricerca",
    wizardClearSearchAria: "Cancella ricerca",
    wizardLoadingClients: "Caricamento…",
    wizardClientGridAria: "Elenco aziende",
    wizardChangeClient: "Cambia",
    wizardResultsAll: "{total} aziende",
    wizardResultsFiltered: "{filtered} su {total}",
    wizardDevicesNone: "Nessun dispositivo",
    wizardDevicesOne: "1 dispositivo",
    wizardDevicesMany: "{count} dispositivi",
    wizardServicesNone: "Nessun servizio",
    wizardServicesOne: "1 servizio",
    wizardServicesMany: "{count} servizi",
    wizardContinueWith: "Continua con {name}",
    wizardBack: "Indietro",
    wizardStartReport: "Inizia il report",
    wizardBackToSelection: "Torna alla selezione",
    wizardPlaceholderTitle: "Contenuto in arrivo",
    wizardPlaceholderHint: "Moduli e dati di questa fase saranno disponibili prossimamente.",
    wizardPlaceholderBadge: "In sviluppo",
    wizardFinishSoon: "Finalizza · prossimamente",
    wizardStepOf: "Fase {current} di {total}",
    recap: {
      contract: "Contratto",
      contractExpires: "Scadenza",
      contractOptions: "Opzioni contratto",
      services: "Servizi supervisionati",
      equipment: "Dispositivi",
      commercial: "Commerciale",
      contact: "Contatto principale",
      sites: "Sedi",
      clientNumber: "N° cliente",
      noOptions: "Nessuna opzione attiva.",
      noServices: "Nessun servizio di supervisione attivo.",
      noEquipment: "Nessun dispositivo registrato.",
      contractActive: "Attivo",
      contractExpiringSoon: "In scadenza",
      contractExpired: "Scaduto",
      contractSuspended: "Sospeso",
      contractUnknown: "Non indicato"
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Documentos",
    pageTitle: "Informes",
    subtitle: "Elija un cliente, un tipo de informe y siga las fases de redacción.",
    create: {
      enterpriseLabel: "Empresa",
      enterpriseSearch: "Buscar una empresa…",
      noEnterprise: "Ninguna empresa encontrada",
      badgeSoon: "Próximamente",
      getClientLabel: id => `Cliente #${id}`
    },
    reportTypes: {
      supervisionEtat: {
        title: "Estado de supervisión",
        description: "Instantánea en tiempo real del parque supervisado: alertas, disponibilidad e indicadores."
      },
      intervention: {
        title: "Informe de intervención",
        description: "Informe de intervención técnica: contexto, acciones realizadas y resultado."
      },
      cahierRecette: {
        title: "Cuaderno de recette",
        description: "Soluciones, productos y hardware instalados: rol, funcionamiento y validación del cliente."
      }
    },
    wizardProgressAria: "Progreso de creación",
    wizardStepClient: "Cliente",
    wizardStepRecap: "Resumen",
    wizardStepType: "Tipo de informe",
    wizardStepBuild: "Fases del informe",
    wizardStepNavAria: "Fases del informe",
    wizardClientTitle: "¿Para qué cliente?",
    wizardClientHint: "Haga clic en una empresa para elegir el tipo de informe.",
    wizardRecapEmpty: "Haga clic en una tarjeta de empresa para ver su resumen.",
    wizardRecapTitle: "Resumen de la empresa",
    wizardRecapHint: "Revise contrato, opciones y parque antes de elegir el informe.",
    wizardTypeTitle: "¿Qué tipo de informe?",
    wizardTypeHint: "Elija la plantilla adecuada.",
    wizardContinue: "Continuar",
    wizardClearSearch: "Borrar búsqueda",
    wizardClearSearchAria: "Borrar búsqueda",
    wizardLoadingClients: "Cargando…",
    wizardClientGridAria: "Lista de empresas",
    wizardChangeClient: "Cambiar",
    wizardResultsAll: "{total} empresas",
    wizardResultsFiltered: "{filtered} de {total}",
    wizardDevicesNone: "Sin dispositivos",
    wizardDevicesOne: "1 dispositivo",
    wizardDevicesMany: "{count} dispositivos",
    wizardServicesNone: "Sin servicios",
    wizardServicesOne: "1 servicio",
    wizardServicesMany: "{count} servicios",
    wizardContinueWith: "Continuar con {name}",
    wizardBack: "Volver",
    wizardStartReport: "Iniciar informe",
    wizardBackToSelection: "Volver a la selección",
    wizardPlaceholderTitle: "Contenido próximamente",
    wizardPlaceholderHint: "Los formularios y datos de esta fase estarán disponibles pronto.",
    wizardPlaceholderBadge: "En desarrollo",
    wizardFinishSoon: "Finalizar · próximamente",
    wizardStepOf: "Fase {current} de {total}",
    recap: {
      contract: "Contrato",
      contractExpires: "Vencimiento",
      contractOptions: "Opciones del contrato",
      services: "Servicios supervisados",
      equipment: "Dispositivos",
      commercial: "Comercial",
      contact: "Contacto principal",
      sites: "Sitios",
      clientNumber: "N° cliente",
      noOptions: "Ninguna opción activa.",
      noServices: "Ningún servicio de supervisión activo.",
      noEquipment: "Ningún dispositivo registrado.",
      contractActive: "Activo",
      contractExpiringSoon: "Próximo a vencer",
      contractExpired: "Vencido",
      contractSuspended: "Suspendido",
      contractUnknown: "No indicado"
    }
  }
};
const WIZARD_STEP_MAP_BY_LOCALE = {
  fr: WIZARD_STEPS,
  en: WIZARD_STEPS_EN,
  de: WIZARD_STEPS_DE,
  it: WIZARD_STEPS_IT,
  es: WIZARD_STEPS_ES
};
export function getRapportPageCopy(locale) {
  const code = normalizeLocale(locale);
  const copy = pickLocaleMessages(RAPPORT_PAGE, locale);
  return {
    ...copy,
    wizard: buildWizard(copy),
    recap: copy.recap,
    localeCode: code
  };
}
export function getReportTypes(pageCopy, locale = "fr") {
  const stepMap = WIZARD_STEP_MAP_BY_LOCALE[locale] || WIZARD_STEPS;
  return REPORT_TYPE_DEFS.map(def => ({
    id: def.id,
    icon: def.icon,
    key: def.key,
    title: pageCopy.reportTypes[def.key].title,
    description: pageCopy.reportTypes[def.key].description,
    steps: stepMap[def.key] || []
  }));
}
export function getReportTypeLabel(pageCopy, rawType) {
  const normalized = String(rawType || "").trim().toLowerCase();
  if (normalized.includes("intervention")) return pageCopy.reportTypes.intervention.title;
  if (normalized.includes("recette")) return pageCopy.reportTypes.cahierRecette.title;
  if (normalized.includes("monitoring") || normalized.includes("supervision")) {
    return pageCopy.reportTypes.supervisionEtat.title;
  }
  return rawType || pageCopy.reportTypes.supervisionEtat.title;
}
