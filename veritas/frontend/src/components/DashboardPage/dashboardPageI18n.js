import { createLocaleGetter } from "../../i18n/translate";
const DASHBOARD_COPY = {
  fr: {
    eyebrow: "Pilotage",
    title: "Tableau de bord KPI",
    subtitle: "Indicateurs de l'activité support, du parc et des entreprises.",
    loading: "Chargement des indicateurs…",
    errorLoad: "Impossible de charger le tableau de bord.",
    proRequired: "Le tableau de bord KPI est réservé à Veritas Pro.",
    periodLabel: "Période",
    periodButtonAria: "Choisir la période d'analyse",
    periodCustomRange: "Du {start} au {end}",
    refresh: "Actualiser",
    export: "Exporter",
    exportPdf: "Télécharger le PDF",
    exportEmail: "Envoyer par e-mail",
    exportSchedule: "Programmer un envoi",
    exportMenuAria: "Actions d'export du rapport",
    headerSchedule: "Programmations",
    headerScheduleAria: "Gérer les programmations d'envoi",
    scopeFilter: {
      barAria: "Filtre de périmètre KPI",
      typeLabel: "Périmètre",
      typeAria: "Type de périmètre",
      entityLabel: "Sélection",
      entityAria: "Choisir un élément du périmètre",
      all: "Tout Veritas",
      agent: "Agent",
      client: "Entreprise",
      contact: "Contact",
      chooseEntity: "Choisir…",
      clear: "Effacer",
      clearAria: "Effacer le filtre de périmètre",
      activeAgent: "Agent : {name}",
      activeClient: "Entreprise : {name}",
      activeContact: "Contact : {name}",
      filteredBadge: "Périmètre filtré",
      infrastructureHint: "Le parc périphérique reste affiché au niveau global."
    },
    generatedAt: "Données au {date}",
    generatedAtRange: "Période du {start} au {end} · généré le {date}",
    periodModal: {
      eyebrow: "Filtre temporel",
      title: "Période d'analyse",
      subtitle: "Basculez entre un raccourci rapide ou une plage de dates personnalisée.",
      modeSwitchAria: "Mode de sélection de la période",
      modePreset: "Raccourcis",
      modeCustom: "Période personnalisée",
      presetsTitle: "Choisir une durée",
      orCustom: "ou",
      customTitle: "Plage personnalisée",
      customHint: "Indiquez la date et l'heure de début et de fin de l'analyse.",
      startLabel: "Début",
      endLabel: "Fin",
      customActive: "Période personnalisée sélectionnée",
      cancel: "Annuler",
      apply: "Appliquer",
      closeAria: "Fermer",
      errors: {
        missingCustomDates: "Renseignez la date et l'heure de début et de fin.",
        invalidRange: "La date de début doit être antérieure à la date de fin."
      }
    },
    tabsAria: "Catégories de statistiques",
    tabs: {
      support: "Support",
      devices: "Périphériques",
      enterprise: "Entreprise"
    },
    intros: {
      support: "Volume, délais et qualité du ticketing, plus les interventions planning.",
      devices: "Parc matériel, supervision et agents RMM.",
      enterprise: "Portefeuille clients, contrats, modules et solutions déployées."
    },
    periods: {
      "7d": "7 jours",
      "30d": "30 jours",
      "90d": "90 jours",
      "365d": "12 mois",
      ytd: "Année en cours",
      all: "Tout"
    },
    units: {
      hours: "{value} h",
      percent: "{value} %",
      stars: "{value} / 5",
      none: "-"
    },
    support: {
      created: "Tickets créés",
      closed: "Clôturés",
      openNow: "Ouverts actuellement",
      closureRate: "Taux de clôture",
      firstResponse: "Première prise en charge",
      resolution: "Délai de résolution",
      withResponse: "{count} tickets avec réponse",
      resolvedCount: "{count} tickets résolus",
      byStatus: "Par statut",
      byPriority: "Priorités",
      byType: "Types de ticket",
      byCategory: "Catégories",
      byChannel: "Canaux",
      topCategories: "Top catégories",
      topCompanies: "Top entreprises",
      topContacts: "Top contacts",
      allCategories: "Toutes les catégories",
      allCompanies: "Toutes les entreprises",
      allContacts: "Tous les contacts",
      viewAllStats: "Voir tout",
      othersCount: "+{count} autres",
      distributionModalClose: "Fermer",
      distributionModalSubtitle: "{total} tickets · {count} entrées",
      weekdayTrend: "Volume par jour de semaine",
      monthlyTrend: "Volume mensuel",
      yearlyTrend: "Volume annuel",
      topAgents: "Classement agents",
      satisfaction: "Satisfaction client",
      csat: "CSAT (notes ≥ 4)",
      detractors: "Insatisfaits (≤ 2)",
      satisfactionByAgent: "Satisfaction par agent",
      planningTitle: "Planning & interventions",
      agentColumns: {
        agent: "Agent",
        assigned: "Assignés",
        closed: "Clôturés",
        open: "Ouverts",
        resolution: "Résol. moy.",
        rating: "Note moy.",
        responses: "Réponses"
      }
    },
    planning: {
      total: "Événements",
      maintenancePeriod: "Maintenances (période)",
      maintenanceYtd: "Maintenances (année)",
      upcoming: "À venir",
      byType: "Types d'événement",
      byAgent: "Interventions par agent",
      monthlyTrend: "Activité mensuelle",
      unavailable: "Module planning non disponible."
    },
    devices: {
      fleet: "Parc total",
      supervised: "Supervisés",
      surveillance: "Taux de supervision",
      rmmAgents: "Agents RMM",
      rmmOnline: "RMM en ligne",
      computers: "Ordinateurs",
      computersActive: "Ordinateurs actifs",
      mspAgents: "Agents MSP",
      families: "Répartition du parc",
      familyTable: "Détail par famille",
      familyColumns: {
        family: "Famille",
        total: "Total",
        monitored: "Supervisés"
      }
    },
    enterprise: {
      clients: "Entreprises",
      contacts: "Contacts",
      contactsNew: "Nouveaux contacts",
      contractsActive: "Contrats actifs",
      contractsExpiring: "Échéance 30 jours",
      contractsExpired: "Contrats expirés",
      contractsSuspended: "Contrats suspendus",
      modules: "Couverture modules",
      solutions: "Solutions déployées",
      reportsTitle: "Rapports générés",
      reportsTotal: "Historique",
      reportsPeriod: "Sur la période",
      reportsByType: "Par type",
      reportsMonthly: "Production mensuelle",
      solutionLabels: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Sauvegarde",
        o365: "Microsoft 365",
        domain: "Noms de domaine",
        ssl: "Certificats SSL",
        campaigns: "Campagnes"
      }
    },
    exportModal: {
      eyebrow: "Rapport KPI",
      titlePdf: "Exporter en PDF",
      titleEmail: "Envoyer par e-mail",
      subtitlePdf: "Génère un PDF de la période et du périmètre actuellement affichés.",
      subtitleEmail: "Envoie le rapport PDF aux destinataires indiqués.",
      recipients: "Destinataires",
      recipientsPlaceholder: "email@entreprise.fr, autre@entreprise.fr",
      categories: "Catégories à inclure",
      cancel: "Annuler",
      download: "Télécharger",
      send: "Envoyer",
      working: "Traitement…",
      closeAria: "Fermer",
      errRecipients: "Indiquez au moins un e-mail.",
      errCategories: "Choisissez au moins une catégorie.",
      submitError: "Impossible de traiter le rapport.",
      pdfReady: "PDF téléchargé.",
      emailSent: "Rapport envoyé."
    },
    scheduleModal: {
      eyebrow: "Rapports automatiques",
      title: "Programmations d'envoi",
      subtitle: "Créez, modifiez, testez ou supprimez les envois PDF récurrents du tableau de bord KPI.",
      closeAria: "Fermer",
      createTitle: "Nouvelle programmation",
      editTitle: "Modifier la programmation",
      listTitle: "Programmations",
      name: "Nom",
      recipients: "Destinataires",
      recipientsPlaceholder: "email@entreprise.fr, autre@entreprise.fr",
      period: "Période analysée",
      frequency: "Fréquence d'envoi",
      freqDaily: "Quotidien",
      freqWeekly: "Hebdomadaire",
      freqMonthly: "Mensuel",
      hour: "Heure (0-23)",
      weekday: "Jour de la semaine",
      monthday: "Jour du mois",
      enabled: "Programmation active",
      create: "Créer",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancelEdit: "Annuler",
      edit: "Modifier",
      delete: "Supprimer",
      test: "Tester l'envoi",
      tested: "E-mail de test envoyé.",
      testError: "Impossible d'envoyer le test.",
      lastSent: "Dernier envoi",
      active: "Active",
      inactive: "Inactive",
      deleteTitle: "Supprimer la programmation",
      deleteMessage: "Supprimer « {name} » ? L'envoi automatique sera arrêté.",
      loading: "Chargement…",
      empty: "Aucune programmation.",
      nextRun: "Prochain envoi",
      validation: "Nom, destinataires et catégorie sont requis.",
      created: "Programmation créée.",
      updated: "Programmation mise à jour.",
      deleted: "Programmation supprimée.",
      loadError: "Impossible de charger les programmations.",
      saveError: "Impossible d'enregistrer.",
      deleteError: "Impossible de supprimer.",
      frequencies: {
        daily: "Quotidien",
        weekly: "Hebdomadaire",
        monthly: "Mensuel"
      },
      weekdays: {
        1: "Lundi",
        2: "Mardi",
        3: "Mercredi",
        4: "Jeudi",
        5: "Vendredi",
        6: "Samedi",
        7: "Dimanche"
      }
    },
    empty: "Aucune donnée sur cette période."
  },
  en: {
    eyebrow: "Operations",
    title: "KPI dashboard",
    subtitle: "Support, fleet and company activity metrics.",
    loading: "Loading metrics…",
    errorLoad: "Unable to load the dashboard.",
    proRequired: "The KPI dashboard is available with Veritas Pro.",
    periodLabel: "Period",
    periodButtonAria: "Choose analysis period",
    periodCustomRange: "From {start} to {end}",
    refresh: "Refresh",
    export: "Export",
    exportPdf: "Download PDF",
    exportEmail: "Send by email",
    exportSchedule: "Schedule sending",
    exportMenuAria: "Report export actions",
    headerSchedule: "Schedules",
    headerScheduleAria: "Manage send schedules",
    scopeFilter: {
      barAria: "KPI scope filter",
      typeLabel: "Scope",
      typeAria: "Scope type",
      entityLabel: "Selection",
      entityAria: "Choose a scope item",
      all: "All Veritas",
      agent: "Agent",
      client: "Company",
      contact: "Contact",
      chooseEntity: "Choose…",
      clear: "Clear",
      clearAria: "Clear scope filter",
      activeAgent: "Agent: {name}",
      activeClient: "Company: {name}",
      activeContact: "Contact: {name}",
      filteredBadge: "Filtered scope",
      infrastructureHint: "Device fleet metrics remain global."
    },
    generatedAt: "Data as of {date}",
    generatedAtRange: "Period from {start} to {end} · generated on {date}",
    periodModal: {
      eyebrow: "Time filter",
      title: "Analysis period",
      subtitle: "Switch between a quick shortcut or a custom date range.",
      modeSwitchAria: "Period selection mode",
      modePreset: "Shortcuts",
      modeCustom: "Custom range",
      presetsTitle: "Choose a duration",
      orCustom: "or",
      customTitle: "Custom range",
      customHint: "Enter the start and end date and time for the analysis.",
      startLabel: "Start",
      endLabel: "End",
      customActive: "Custom period selected",
      cancel: "Cancel",
      apply: "Apply",
      closeAria: "Close",
      errors: {
        missingCustomDates: "Enter both start and end date/time.",
        invalidRange: "Start must be before end."
      }
    },
    tabsAria: "Statistics categories",
    tabs: {
      support: "Support",
      devices: "Devices",
      enterprise: "Company"
    },
    intros: {
      support: "Ticket volume, response times and quality, plus scheduled interventions.",
      devices: "Hardware fleet, monitoring coverage and RMM agents.",
      enterprise: "Client portfolio, contracts, modules and deployed solutions."
    },
    periods: {
      "7d": "7 days",
      "30d": "30 days",
      "90d": "90 days",
      "365d": "12 months",
      ytd: "Year to date",
      all: "All time"
    },
    units: {
      hours: "{value} h",
      percent: "{value}%",
      stars: "{value}/5",
      none: "-"
    },
    support: {
      created: "Tickets created",
      closed: "Closed",
      openNow: "Currently open",
      closureRate: "Closure rate",
      firstResponse: "First response",
      resolution: "Resolution time",
      withResponse: "{count} tickets with response",
      resolvedCount: "{count} resolved tickets",
      byStatus: "By status",
      byPriority: "Priorities",
      byType: "Ticket types",
      byCategory: "Categories",
      byChannel: "Channels",
      topCategories: "Top categories",
      topCompanies: "Top companies",
      topContacts: "Top contacts",
      allCategories: "All categories",
      allCompanies: "All companies",
      allContacts: "All contacts",
      viewAllStats: "View all",
      othersCount: "+{count} more",
      distributionModalClose: "Close",
      distributionModalSubtitle: "{total} tickets · {count} entries",
      weekdayTrend: "Volume by weekday",
      monthlyTrend: "Monthly volume",
      yearlyTrend: "Yearly volume",
      topAgents: "Agent ranking",
      satisfaction: "Customer satisfaction",
      csat: "CSAT (rating ≥ 4)",
      detractors: "Detractors (≤ 2)",
      satisfactionByAgent: "Satisfaction by agent",
      planningTitle: "Scheduling & interventions",
      agentColumns: {
        agent: "Agent",
        assigned: "Assigned",
        closed: "Closed",
        open: "Open",
        resolution: "Avg. resolution",
        rating: "Avg. rating",
        responses: "Responses"
      }
    },
    planning: {
      total: "Events",
      maintenancePeriod: "Maintenance (period)",
      maintenanceYtd: "Maintenance (YTD)",
      upcoming: "Upcoming",
      byType: "Event types",
      byAgent: "Interventions by agent",
      monthlyTrend: "Monthly activity",
      unavailable: "Scheduling module unavailable."
    },
    devices: {
      fleet: "Total fleet",
      supervised: "Monitored",
      surveillance: "Monitoring rate",
      rmmAgents: "RMM agents",
      rmmOnline: "RMM online",
      computers: "Computers",
      computersActive: "Active computers",
      mspAgents: "MSP agents",
      families: "Fleet breakdown",
      familyTable: "Detail by family",
      familyColumns: {
        family: "Family",
        total: "Total",
        monitored: "Monitored"
      }
    },
    enterprise: {
      clients: "Companies",
      contacts: "Contacts",
      contactsNew: "New contacts",
      contractsActive: "Active contracts",
      contractsExpiring: "Expiring in 30 days",
      contractsExpired: "Expired contracts",
      contractsSuspended: "Suspended contracts",
      modules: "Module coverage",
      solutions: "Deployed solutions",
      reportsTitle: "Generated reports",
      reportsTotal: "All time",
      reportsPeriod: "In period",
      reportsByType: "By type",
      reportsMonthly: "Monthly output",
      solutionLabels: {
        antivirus: "Antivirus",
        antispam: "Antispam",
        backup: "Backup",
        o365: "Microsoft 365",
        domain: "Domains",
        ssl: "SSL certificates",
        campaigns: "Campaigns"
      }
    },
    exportModal: {
      eyebrow: "KPI report",
      titlePdf: "Export PDF",
      titleEmail: "Send by email",
      subtitlePdf: "Generate a PDF for the currently displayed period and scope.",
      subtitleEmail: "Send the PDF report to the listed recipients.",
      recipients: "Recipients",
      recipientsPlaceholder: "email@company.com, other@company.com",
      categories: "Categories to include",
      cancel: "Cancel",
      download: "Download",
      send: "Send",
      working: "Working…",
      closeAria: "Close",
      errRecipients: "Enter at least one email.",
      errCategories: "Choose at least one category.",
      submitError: "Unable to process the report.",
      pdfReady: "PDF downloaded.",
      emailSent: "Report sent."
    },
    scheduleModal: {
      eyebrow: "Automated reports",
      title: "Send schedules",
      subtitle: "Create, edit, test or delete recurring KPI dashboard PDF deliveries.",
      closeAria: "Close",
      createTitle: "New schedule",
      editTitle: "Edit schedule",
      listTitle: "Schedules",
      name: "Name",
      recipients: "Recipients",
      recipientsPlaceholder: "email@company.com, other@company.com",
      period: "Analysis period",
      frequency: "Send frequency",
      freqDaily: "Daily",
      freqWeekly: "Weekly",
      freqMonthly: "Monthly",
      hour: "Hour (0-23)",
      weekday: "Weekday",
      monthday: "Day of month",
      enabled: "Schedule enabled",
      create: "Create",
      save: "Save",
      saving: "Saving…",
      cancelEdit: "Cancel",
      edit: "Edit",
      delete: "Delete",
      test: "Send test",
      tested: "Test email sent.",
      testError: "Unable to send the test.",
      lastSent: "Last sent",
      active: "Active",
      inactive: "Inactive",
      deleteTitle: "Delete schedule",
      deleteMessage: "Delete “{name}”? Automatic sending will stop.",
      loading: "Loading…",
      empty: "No schedules yet.",
      nextRun: "Next send",
      validation: "Name, recipients and category are required.",
      created: "Schedule created.",
      updated: "Schedule updated.",
      deleted: "Schedule deleted.",
      loadError: "Unable to load schedules.",
      saveError: "Unable to save.",
      deleteError: "Unable to delete.",
      frequencies: {
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly"
      },
      weekdays: {
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
        7: "Sunday"
      }
    },
    empty: "No data for this period."
  }
};
function cloneLocale(source, overlay) {
  return {
    ...source,
    ...overlay,
    scopeFilter: {
      ...source.scopeFilter,
      ...overlay.scopeFilter
    },
    periodModal: {
      ...source.periodModal,
      ...overlay.periodModal,
      errors: {
        ...source.periodModal.errors,
        ...overlay.periodModal?.errors
      }
    },
    tabs: {
      ...source.tabs,
      ...overlay.tabs
    },
    intros: {
      ...source.intros,
      ...overlay.intros
    },
    periods: {
      ...source.periods,
      ...overlay.periods
    },
    units: {
      ...source.units,
      ...overlay.units
    },
    support: {
      ...source.support,
      ...overlay.support,
      agentColumns: {
        ...source.support.agentColumns,
        ...overlay.support?.agentColumns
      }
    },
    planning: {
      ...source.planning,
      ...overlay.planning
    },
    devices: {
      ...source.devices,
      ...overlay.devices,
      familyColumns: {
        ...source.devices.familyColumns,
        ...overlay.devices?.familyColumns
      }
    },
    enterprise: {
      ...source.enterprise,
      ...overlay.enterprise,
      solutionLabels: {
        ...source.enterprise.solutionLabels,
        ...overlay.enterprise?.solutionLabels
      }
    },
    exportModal: {
      ...source.exportModal,
      ...overlay.exportModal
    },
    scheduleModal: {
      ...source.scheduleModal,
      ...overlay.scheduleModal,
      frequencies: {
        ...source.scheduleModal.frequencies,
        ...overlay.scheduleModal?.frequencies
      },
      weekdays: {
        ...source.scheduleModal.weekdays,
        ...overlay.scheduleModal?.weekdays
      }
    }
  };
}
DASHBOARD_COPY.de = cloneLocale(DASHBOARD_COPY.en, {
  eyebrow: "Steuerung",
  title: "KPI-Dashboard",
  subtitle: "Kennzahlen nach Bereich: Support, Gerätepark und Unternehmen.",
  loading: "Kennzahlen werden geladen…",
  errorLoad: "Dashboard konnte nicht geladen werden.",
  proRequired: "Das KPI-Dashboard ist in Veritas Pro verfügbar.",
  periodLabel: "Zeitraum",
  periodButtonAria: "Analysezeitraum wählen",
  periodCustomRange: "Von {start} bis {end}",
  refresh: "Aktualisieren",
  export: "Exportieren",
  exportPdf: "PDF herunterladen",
  exportEmail: "Per E-Mail senden",
  exportSchedule: "Versand planen",
  headerSchedule: "Zeitpläne",
  headerScheduleAria: "Versandzeitpläne verwalten",
  tabs: {
    support: "Support",
    devices: "Geräte",
    enterprise: "Unternehmen"
  },
  intros: {
    support: "Ticketvolumen, Laufzeiten und Qualität sowie geplante Einsätze.",
    devices: "Hardwarebestand, Überwachung und RMM-Agenten.",
    enterprise: "Kundenportfolio, Verträge, Module und bereitgestellte Lösungen."
  },
  periods: {
    "7d": "7 Tage",
    "30d": "30 Tage",
    "90d": "90 Tage",
    "365d": "12 Monate",
    ytd: "Laufendes Jahr",
    all: "Gesamt"
  },
  empty: "Keine Daten für diesen Zeitraum.",
  scheduleModal: {
    title: "Versandzeitpläne",
    subtitle: "Erstellen, bearbeiten, testen oder löschen Sie wiederkehrende KPI-PDF-Versände.",
    test: "Test senden",
    tested: "Test-E-Mail gesendet.",
    testError: "Test konnte nicht gesendet werden.",
    lastSent: "Letzter Versand",
    active: "Aktiv",
    inactive: "Inaktiv",
    deleteTitle: "Zeitplan löschen",
    deleteMessage: "„{name}“ löschen? Der automatische Versand wird beendet.",
    frequencies: {
      daily: "Täglich",
      weekly: "Wöchentlich",
      monthly: "Monatlich"
    },
    weekdays: {
      1: "Montag",
      2: "Dienstag",
      3: "Mittwoch",
      4: "Donnerstag",
      5: "Freitag",
      6: "Samstag",
      7: "Sonntag"
    }
  }
});
DASHBOARD_COPY.it = cloneLocale(DASHBOARD_COPY.en, {
  eyebrow: "Pilotaggio",
  title: "Cruscotto KPI",
  subtitle: "Indicatori per area: supporto, parco dispositivi e aziende.",
  loading: "Caricamento indicatori…",
  errorLoad: "Impossibile caricare il cruscotto.",
  proRequired: "Il cruscotto KPI è disponibile con Veritas Pro.",
  periodLabel: "Periodo",
  periodButtonAria: "Scegliere il periodo di analisi",
  periodCustomRange: "Dal {start} al {end}",
  refresh: "Aggiorna",
  export: "Esporta",
  exportPdf: "Scarica PDF",
  exportEmail: "Invia via e-mail",
  exportSchedule: "Programma invio",
  headerSchedule: "Programmazioni",
  headerScheduleAria: "Gestire le programmazioni di invio",
  tabs: {
    support: "Supporto",
    devices: "Dispositivi",
    enterprise: "Azienda"
  },
  intros: {
    support: "Volume ticket, tempi e qualità, più gli interventi pianificati.",
    devices: "Parco hardware, supervisione e agenti RMM.",
    enterprise: "Portafoglio clienti, contratti, moduli e soluzioni distribuite."
  },
  periods: {
    "7d": "7 giorni",
    "30d": "30 giorni",
    "90d": "90 giorni",
    "365d": "12 mesi",
    ytd: "Anno in corso",
    all: "Tutto"
  },
  empty: "Nessun dato per questo periodo.",
  scheduleModal: {
    title: "Programmazioni di invio",
    subtitle: "Crea, modifica, testa o elimina gli invii PDF ricorrenti del cruscotto KPI.",
    test: "Invia test",
    tested: "E-mail di test inviata.",
    testError: "Impossibile inviare il test.",
    lastSent: "Ultimo invio",
    active: "Attiva",
    inactive: "Inattiva",
    deleteTitle: "Elimina programmazione",
    deleteMessage: "Eliminare « {name} »? L'invio automatico verrà interrotto."
  }
});
DASHBOARD_COPY.es = cloneLocale(DASHBOARD_COPY.en, {
  eyebrow: "Gestión",
  title: "Cuadro de mando KPI",
  subtitle: "Indicadores por área: soporte, parque de dispositivos y empresas.",
  loading: "Cargando indicadores…",
  errorLoad: "No se pudo cargar el cuadro de mando.",
  proRequired: "El cuadro de mando KPI está disponible con Veritas Pro.",
  periodLabel: "Periodo",
  periodButtonAria: "Elegir el periodo de análisis",
  periodCustomRange: "Del {start} al {end}",
  refresh: "Actualizar",
  export: "Exportar",
  exportPdf: "Descargar PDF",
  exportEmail: "Enviar por correo",
  exportSchedule: "Programar envío",
  headerSchedule: "Programaciones",
  headerScheduleAria: "Gestionar las programaciones de envío",
  tabs: {
    support: "Soporte",
    devices: "Dispositivos",
    enterprise: "Empresa"
  },
  intros: {
    support: "Volumen, plazos y calidad de tickets, más las intervenciones planificadas.",
    devices: "Parque de hardware, supervisión y agentes RMM.",
    enterprise: "Cartera de clientes, contratos, módulos y soluciones desplegadas."
  },
  periods: {
    "7d": "7 días",
    "30d": "30 días",
    "90d": "90 días",
    "365d": "12 meses",
    ytd: "Año en curso",
    all: "Todo"
  },
  empty: "Sin datos para este periodo.",
  scheduleModal: {
    title: "Programaciones de envío",
    subtitle: "Cree, edite, pruebe o elimine los envíos PDF periódicos del cuadro de mando KPI.",
    test: "Enviar prueba",
    tested: "Correo de prueba enviado.",
    testError: "No se pudo enviar la prueba.",
    lastSent: "Último envío",
    active: "Activa",
    inactive: "Inactiva",
    deleteTitle: "Eliminar programación",
    deleteMessage: "¿Eliminar « {name} »? El envío automático se detendrá."
  }
});
export const getDashboardPageCopy = createLocaleGetter(DASHBOARD_COPY);
export const DASHBOARD_PERIOD_OPTIONS = ["7d", "30d", "90d", "365d", "ytd", "all"];
