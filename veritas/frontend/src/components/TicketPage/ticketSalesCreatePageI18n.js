import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SALES_KIND_KEYS = ["prestation", "installation"];
const PRIORITY_KEYS = ["low", "normal", "high", "urgent"];
const KIND_ICONS = {
  prestation: "mdi:briefcase-edit-outline",
  installation: "mdi:tools"
};
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const TICKET_SALES_CREATE_COPY = {
  fr: {
    eyebrow: "Exploitation",
    pageTitle: "Nouvelle demande",
    pageSubtitle: "Prestation ou installation · saisie par {agent}",
    back: "Retour",
    createRequest: "Créer la demande",
    creating: "Création…",
    loadingData: "Chargement des données…",
    agentFallback: "Agent",
    kinds: {
      prestation: {
        label: "Prestation",
        hint: "Services et ventes"
      },
      installation: {
        label: "Installation",
        hint: "Déploiement client"
      }
    },
    priority: {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente"
    },
    sections: {
      nature: "Nature de la demande",
      requester: "Demandeur",
      details: "Détails de la demande",
      context: "Contexte",
      commercial: "Informations commerciales",
      settings: "Paramètres"
    },
    loadingForms: "Chargement des natures de demande…",
    noForms: "Aucune nature configurée pour ce type. Contactez un administrateur.",
    requesterContact: "Demandeur",
    searchContact: "Rechercher un agent…",
    noContactFound: "Aucun agent trouvé",
    companyLabel: "Entreprise",
    searchCompany: "Rechercher une entreprise…",
    noCompanyFound: "Aucune entreprise trouvée",
    equipmentLabel: "Périphérique",
    searchEquipment: "Rechercher un périphérique…",
    noEquipmentFound: "Aucun périphérique trouvé",
    selectCompanyFirst: "Sélectionnez d’abord une entreprise",
    loadingEquipment: "Chargement du parc…",
    clearEquipment: "Retirer le périphérique",
    commentLabel: "Commentaire / précisions",
    commentPlaceholder: "Infos complémentaires utiles pour l'équipe…",
    subjectLabel: "Sujet",
    subjectOptional: "facultatif",
    subjectPlaceholder: "Laisser vide pour le titre automatique…",
    subjectFallbackHint: "Si vide, le sujet sera : {title}",
    defaultClientLabel: "Client",
    context: {
      subject: "Sujet",
      type: "Type",
      category: "Catégorie",
      company: "Entreprise",
      requester: "Demandeur",
      equipment: "Périphérique",
      purchaseOrder: "Bon de commande",
      commercial: "Commercial",
      projectManager: "Chef de projet"
    },
    purchaseOrder: "Bon de commande",
    purchaseOrderPlaceholder: "Ex: BC-2026-0142",
    commercial: "Commercial",
    selectCommercial: "Sélectionner un commercial",
    projectManager: "Chef de projet",
    projectManagerResponsible: "Responsable projet",
    selectProjectManager: "Sélectionner un chef de projet",
    yes: "Oui",
    no: "Non",
    noValue: "Non",
    priorityLabel: "Priorité",
    priorityLocked: "Priorité imposée par le formulaire.",
    generatedTickets: "Tickets générés",
    defaultRuleProps: "Propriétés par défaut",
    rulePriority: "Priorité {priority}",
    ruleStatus: "Statut {status}",
    ruleAssignees: "{count} assigné(s)",
    ruleTeams: "{count} équipe(s)",
    recap: {
      title: "Récapitulatif de la demande",
      subtitle: "Vérifiez les informations avant de confirmer la création.",
      close: "Fermer",
      cancel: "Annuler",
      confirm: "Confirmer la création",
      requester: "Demandeur",
      client: "Client",
      purchaseOrder: "Bon de commande",
      commercial: "Commercial",
      projectManager: "Chef de projet",
      comment: "Commentaire"
    },
    kindsShort: {
      prestation: "Prestation",
      installation: "Installation"
    },
    body: {
      purchaseOrder: "Bon de commande",
      commercial: "Commercial",
      projectManager: "Chef de projet",
      type: "Type",
      form: "Formulaire",
      requester: "Demandeur",
      company: "Entreprise",
      comment: "Commentaire"
    },
    toasts: {
      createdInstallation: "Demande d'installation créée",
      createdPrestation: "Demande de prestation créée",
      createdMultiple: "{count} tickets créés ({form})",
      createError: "Erreur lors de la création"
    },
    userFallback: "Utilisateur #{id}",
    contactFallback: "Contact #{id}"
  },
  en: {
    eyebrow: "Operations",
    pageTitle: "New request",
    pageSubtitle: "Service or installation · entered by {agent}",
    back: "Back",
    createRequest: "Create request",
    creating: "Creating…",
    loadingData: "Loading data…",
    agentFallback: "Agent",
    kinds: {
      prestation: {
        label: "Service",
        hint: "Services and sales"
      },
      installation: {
        label: "Installation",
        hint: "Client deployment"
      }
    },
    priority: {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "Urgent"
    },
    sections: {
      nature: "Request type",
      requester: "Requester",
      details: "Request details",
      context: "Context",
      commercial: "Commercial information",
      settings: "Settings"
    },
    loadingForms: "Loading request types…",
    noForms: "No type configured for this category. Contact an administrator.",
    requesterContact: "Requester",
    searchContact: "Search for an agent…",
    noContactFound: "No agent found",
    companyLabel: "Company",
    searchCompany: "Search for a company…",
    noCompanyFound: "No company found",
    equipmentLabel: "Device",
    searchEquipment: "Search for a device…",
    noEquipmentFound: "No device found",
    selectCompanyFirst: "Select a company first",
    loadingEquipment: "Loading fleet…",
    clearEquipment: "Remove device",
    commentLabel: "Comment / notes",
    commentPlaceholder: "Additional information useful for the team…",
    subjectLabel: "Subject",
    subjectOptional: "optional",
    subjectPlaceholder: "Leave empty for the automatic title…",
    subjectFallbackHint: "If empty, the subject will be: {title}",
    defaultClientLabel: "Client",
    context: {
      subject: "Subject",
      type: "Type",
      category: "Category",
      company: "Company",
      requester: "Requester",
      equipment: "Device",
      purchaseOrder: "Purchase order",
      commercial: "Sales rep",
      projectManager: "Project manager"
    },
    purchaseOrder: "Purchase order",
    purchaseOrderPlaceholder: "e.g. PO-2026-0142",
    commercial: "Sales rep",
    selectCommercial: "Select a sales rep",
    projectManager: "Project manager",
    projectManagerResponsible: "Project lead",
    selectProjectManager: "Select a project manager",
    yes: "Yes",
    no: "No",
    noValue: "No",
    priorityLabel: "Priority",
    priorityLocked: "Priority set by the form.",
    generatedTickets: "Tickets to be created",
    defaultRuleProps: "Default properties",
    rulePriority: "Priority {priority}",
    ruleStatus: "Status {status}",
    ruleAssignees: "{count} assignee(s)",
    ruleTeams: "{count} team(s)",
    recap: {
      title: "Request summary",
      subtitle: "Review the information before confirming creation.",
      close: "Close",
      cancel: "Cancel",
      confirm: "Confirm creation",
      requester: "Requester",
      client: "Client",
      purchaseOrder: "Purchase order",
      commercial: "Sales rep",
      projectManager: "Project manager",
      comment: "Comment"
    },
    kindsShort: {
      prestation: "Service",
      installation: "Installation"
    },
    body: {
      purchaseOrder: "Purchase order",
      commercial: "Sales rep",
      projectManager: "Project manager",
      type: "Type",
      form: "Form",
      requester: "Requester",
      company: "Company",
      comment: "Comment"
    },
    toasts: {
      createdInstallation: "Installation request created",
      createdPrestation: "Service request created",
      createdMultiple: "{count} tickets created ({form})",
      createError: "Error creating request"
    },
    userFallback: "User #{id}",
    contactFallback: "Contact #{id}"
  },
  de: {
    eyebrow: "Betrieb",
    pageTitle: "Neue Anfrage",
    pageSubtitle: "Leistung oder Installation · erfasst von {agent}",
    back: "Zurück",
    createRequest: "Anfrage erstellen",
    creating: "Erstellen…",
    loadingData: "Daten werden geladen…",
    agentFallback: "Agent",
    kinds: {
      prestation: {
        label: "Leistung",
        hint: "Dienstleistungen und Vertrieb"
      },
      installation: {
        label: "Installation",
        hint: "Kundenbereitstellung"
      }
    },
    priority: {
      low: "Niedrig",
      normal: "Normal",
      high: "Hoch",
      urgent: "Dringend"
    },
    sections: {
      nature: "Art der Anfrage",
      requester: "Anfragender",
      details: "Anfragedetails",
      context: "Kontext",
      commercial: "Kaufmännische Informationen",
      settings: "Einstellungen"
    },
    loadingForms: "Anfragearten werden geladen…",
    noForms: "Keine Art für diesen Typ konfiguriert. Administrator kontaktieren.",
    requesterContact: "Anfragender",
    searchContact: "Agent suchen…",
    noContactFound: "Kein Agent gefunden",
    companyLabel: "Unternehmen",
    searchCompany: "Unternehmen suchen…",
    noCompanyFound: "Kein Unternehmen gefunden",
    equipmentLabel: "Gerät",
    searchEquipment: "Gerät suchen…",
    noEquipmentFound: "Kein Gerät gefunden",
    selectCompanyFirst: "Zuerst ein Unternehmen wählen",
    loadingEquipment: "Flotte wird geladen…",
    clearEquipment: "Gerät entfernen",
    commentLabel: "Kommentar / Hinweise",
    commentPlaceholder: "Zusätzliche Informationen für das Team…",
    subjectLabel: "Betreff",
    subjectOptional: "optional",
    subjectPlaceholder: "Leer lassen für den automatischen Titel…",
    subjectFallbackHint: "Wenn leer, lautet der Betreff: {title}",
    defaultClientLabel: "Kunde",
    context: {
      subject: "Betreff",
      type: "Typ",
      category: "Kategorie",
      company: "Unternehmen",
      requester: "Anfragender",
      equipment: "Gerät",
      purchaseOrder: "Bestellung",
      commercial: "Vertrieb",
      projectManager: "Projektleiter"
    },
    purchaseOrder: "Bestellung",
    purchaseOrderPlaceholder: "z. B. BC-2026-0142",
    commercial: "Vertrieb",
    selectCommercial: "Vertriebsmitarbeiter wählen",
    projectManager: "Projektleiter",
    projectManagerResponsible: "Projektverantwortlicher",
    selectProjectManager: "Projektleiter wählen",
    yes: "Ja",
    no: "Nein",
    noValue: "Nein",
    priorityLabel: "Priorität",
    priorityLocked: "Priorität durch das Formular vorgegeben.",
    generatedTickets: "Zu erstellende Tickets",
    defaultRuleProps: "Standardeigenschaften",
    rulePriority: "Priorität {priority}",
    ruleStatus: "Status {status}",
    ruleAssignees: "{count} Zuständige",
    ruleTeams: "{count} Team(s)",
    recap: {
      title: "Zusammenfassung der Anfrage",
      subtitle: "Informationen vor der Bestätigung prüfen.",
      close: "Schließen",
      cancel: "Abbrechen",
      confirm: "Erstellung bestätigen",
      requester: "Anfragender",
      client: "Kunde",
      purchaseOrder: "Bestellung",
      commercial: "Vertrieb",
      projectManager: "Projektleiter",
      comment: "Kommentar"
    },
    kindsShort: {
      prestation: "Leistung",
      installation: "Installation"
    },
    body: {
      purchaseOrder: "Bestellung",
      commercial: "Vertrieb",
      projectManager: "Projektleiter",
      type: "Typ",
      form: "Formular",
      requester: "Anfragender",
      company: "Unternehmen",
      comment: "Kommentar"
    },
    toasts: {
      createdInstallation: "Installationsanfrage erstellt",
      createdPrestation: "Leistungsanfrage erstellt",
      createdMultiple: "{count} Tickets erstellt ({form})",
      createError: "Fehler beim Erstellen"
    },
    userFallback: "Benutzer #{id}",
    contactFallback: "Kontakt #{id}"
  },
  it: {
    eyebrow: "Operazioni",
    pageTitle: "Nuova richiesta",
    pageSubtitle: "Prestazione o installazione · inserita da {agent}",
    back: "Indietro",
    createRequest: "Crea richiesta",
    creating: "Creazione…",
    loadingData: "Caricamento dati…",
    agentFallback: "Agent",
    kinds: {
      prestation: {
        label: "Prestazione",
        hint: "Servizi e vendite"
      },
      installation: {
        label: "Installazione",
        hint: "Distribuzione cliente"
      }
    },
    priority: {
      low: "Bassa",
      normal: "Normale",
      high: "Alta",
      urgent: "Urgente"
    },
    sections: {
      nature: "Natura della richiesta",
      requester: "Richiedente",
      details: "Dettagli della richiesta",
      context: "Contesto",
      commercial: "Informazioni commerciali",
      settings: "Impostazioni"
    },
    loadingForms: "Caricamento nature di richiesta…",
    noForms: "Nessuna natura configurata per questo tipo. Contattare un amministratore.",
    requesterContact: "Richiedente",
    searchContact: "Cerca un agente…",
    noContactFound: "Nessun agente trovato",
    companyLabel: "Azienda",
    searchCompany: "Cerca un'azienda…",
    noCompanyFound: "Nessuna azienda trovata",
    equipmentLabel: "Dispositivo",
    searchEquipment: "Cerca un dispositivo…",
    noEquipmentFound: "Nessun dispositivo trovato",
    selectCompanyFirst: "Seleziona prima un'azienda",
    loadingEquipment: "Caricamento del parco…",
    clearEquipment: "Rimuovi dispositivo",
    commentLabel: "Commento / note",
    commentPlaceholder: "Informazioni aggiuntive utili per il team…",
    subjectLabel: "Oggetto",
    subjectOptional: "facoltativo",
    subjectPlaceholder: "Lasciare vuoto per il titolo automatico…",
    subjectFallbackHint: "Se vuoto, l'oggetto sarà: {title}",
    defaultClientLabel: "Cliente",
    context: {
      subject: "Oggetto",
      type: "Tipo",
      category: "Categoria",
      company: "Azienda",
      requester: "Richiedente",
      equipment: "Dispositivo",
      purchaseOrder: "Ordine d'acquisto",
      commercial: "Commerciale",
      projectManager: "Responsabile progetto"
    },
    purchaseOrder: "Ordine d'acquisto",
    purchaseOrderPlaceholder: "Es: BC-2026-0142",
    commercial: "Commerciale",
    selectCommercial: "Seleziona un commerciale",
    projectManager: "Responsabile progetto",
    projectManagerResponsible: "Responsabile progetto",
    selectProjectManager: "Seleziona un responsabile progetto",
    yes: "Sì",
    no: "No",
    noValue: "No",
    priorityLabel: "Priorità",
    priorityLocked: "Priorità imposta dal modulo.",
    generatedTickets: "Ticket da generare",
    defaultRuleProps: "Proprietà predefinite",
    rulePriority: "Priorità {priority}",
    ruleStatus: "Stato {status}",
    ruleAssignees: "{count} assegnatario/i",
    ruleTeams: "{count} team",
    recap: {
      title: "Riepilogo della richiesta",
      subtitle: "Verifica le informazioni prima di confermare la creazione.",
      close: "Chiudi",
      cancel: "Annulla",
      confirm: "Conferma creazione",
      requester: "Richiedente",
      client: "Cliente",
      purchaseOrder: "Ordine d'acquisto",
      commercial: "Commerciale",
      projectManager: "Responsabile progetto",
      comment: "Commento"
    },
    kindsShort: {
      prestation: "Prestazione",
      installation: "Installazione"
    },
    body: {
      purchaseOrder: "Ordine d'acquisto",
      commercial: "Commerciale",
      projectManager: "Responsabile progetto",
      type: "Tipo",
      form: "Modulo",
      requester: "Richiedente",
      company: "Azienda",
      comment: "Commento"
    },
    toasts: {
      createdInstallation: "Richiesta di installazione creata",
      createdPrestation: "Richiesta di prestazione creata",
      createdMultiple: "{count} ticket creati ({form})",
      createError: "Errore durante la creazione"
    },
    userFallback: "Utente #{id}",
    contactFallback: "Contatto #{id}"
  },
  es: {
    eyebrow: "Operaciones",
    pageTitle: "Nueva solicitud",
    pageSubtitle: "Prestación o instalación · introducida por {agent}",
    back: "Volver",
    createRequest: "Crear solicitud",
    creating: "Creando…",
    loadingData: "Cargando datos…",
    agentFallback: "Agent",
    kinds: {
      prestation: {
        label: "Prestación",
        hint: "Servicios y ventas"
      },
      installation: {
        label: "Instalación",
        hint: "Despliegue cliente"
      }
    },
    priority: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente"
    },
    sections: {
      nature: "Naturaleza de la solicitud",
      requester: "Solicitante",
      details: "Detalles de la solicitud",
      context: "Contexto",
      commercial: "Información comercial",
      settings: "Ajustes"
    },
    loadingForms: "Cargando tipos de solicitud…",
    noForms: "Ningún tipo configurado para esta categoría. Contacte a un administrador.",
    requesterContact: "Solicitante",
    searchContact: "Buscar un agente…",
    noContactFound: "Ningún agente encontrado",
    companyLabel: "Empresa",
    searchCompany: "Buscar una empresa…",
    noCompanyFound: "Ninguna empresa encontrada",
    equipmentLabel: "Dispositivo",
    searchEquipment: "Buscar un dispositivo…",
    noEquipmentFound: "Ningún dispositivo encontrado",
    selectCompanyFirst: "Seleccione primero una empresa",
    loadingEquipment: "Cargando el parque…",
    clearEquipment: "Quitar dispositivo",
    commentLabel: "Comentario / notas",
    commentPlaceholder: "Información adicional útil para el equipo…",
    subjectLabel: "Asunto",
    subjectOptional: "opcional",
    subjectPlaceholder: "Dejar vacío para el título automático…",
    subjectFallbackHint: "Si está vacío, el asunto será: {title}",
    defaultClientLabel: "Cliente",
    context: {
      subject: "Asunto",
      type: "Tipo",
      category: "Categoría",
      company: "Empresa",
      requester: "Solicitante",
      equipment: "Dispositivo",
      purchaseOrder: "Pedido",
      commercial: "Comercial",
      projectManager: "Jefe de proyecto"
    },
    purchaseOrder: "Pedido",
    purchaseOrderPlaceholder: "Ej: BC-2026-0142",
    commercial: "Comercial",
    selectCommercial: "Seleccionar un comercial",
    projectManager: "Jefe de proyecto",
    projectManagerResponsible: "Responsable de proyecto",
    selectProjectManager: "Seleccionar un jefe de proyecto",
    yes: "Sí",
    no: "No",
    noValue: "No",
    priorityLabel: "Prioridad",
    priorityLocked: "Prioridad impuesta por el formulario.",
    generatedTickets: "Tickets a generar",
    defaultRuleProps: "Propiedades predeterminadas",
    rulePriority: "Prioridad {priority}",
    ruleStatus: "Estado {status}",
    ruleAssignees: "{count} asignado(s)",
    ruleTeams: "{count} equipo(s)",
    recap: {
      title: "Resumen de la solicitud",
      subtitle: "Revise la información antes de confirmar la creación.",
      close: "Cerrar",
      cancel: "Cancelar",
      confirm: "Confirmar creación",
      requester: "Solicitante",
      client: "Cliente",
      purchaseOrder: "Pedido",
      commercial: "Comercial",
      projectManager: "Jefe de proyecto",
      comment: "Comentario"
    },
    kindsShort: {
      prestation: "Prestación",
      installation: "Instalación"
    },
    body: {
      purchaseOrder: "Pedido",
      commercial: "Comercial",
      projectManager: "Jefe de proyecto",
      type: "Tipo",
      form: "Formulario",
      requester: "Solicitante",
      company: "Empresa",
      comment: "Comentario"
    },
    toasts: {
      createdInstallation: "Solicitud de instalación creada",
      createdPrestation: "Solicitud de prestación creada",
      createdMultiple: "{count} tickets creados ({form})",
      createError: "Error al crear la solicitud"
    },
    userFallback: "Usuario #{id}",
    contactFallback: "Contacto #{id}"
  }
};
export function getTicketSalesCreatePageCopy(locale) {
  const t = pickLocaleMessages(TICKET_SALES_CREATE_COPY, locale);
  return {
    ...t,
    locale,
    localeTag: LOCALE_BCP47[locale] || "fr-FR",
    salesKinds: SALES_KIND_KEYS.map(key => ({
      key,
      icon: KIND_ICONS[key],
      label: t.kinds[key].label,
      hint: t.kinds[key].hint
    })),
    priorityOptions: PRIORITY_KEYS.map(key => ({
      key,
      label: t.priority[key]
    })),
    formatPageSubtitle: agent => interpolate(t.pageSubtitle, {
      agent
    }),
    formatSubjectFallbackHint: title => interpolate(t.subjectFallbackHint, {
      title: title || "—"
    }),
    formatUserFallback: id => interpolate(t.userFallback, {
      id: String(id)
    }),
    formatContactFallback: id => interpolate(t.contactFallback, {
      id: String(id)
    }),
    formatRulePriority: priority => interpolate(t.rulePriority, {
      priority
    }),
    formatRuleStatus: status => interpolate(t.ruleStatus, {
      status
    }),
    formatRuleAssignees: count => interpolate(t.ruleAssignees, {
      count: String(count)
    }),
    formatRuleTeams: count => interpolate(t.ruleTeams, {
      count: String(count)
    }),
    formatCreatedMultiple: (count, form) => interpolate(t.toasts.createdMultiple, {
      count: String(count),
      form
    }),
    getKindShortLabel: kind => kind === "installation" ? t.kindsShort.installation : t.kindsShort.prestation
  };
}
