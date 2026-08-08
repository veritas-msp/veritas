import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const TICKET_TYPE_KEYS = ["incident", "demande", "probleme", "changement"];
const PRIORITY_KEYS = ["low", "normal", "high", "urgent"];
const CHANNEL_KEYS = ["phone", "email", "web", "chat", "whatsapp"];
const STATUS_KEYS = ["new", "open", "in_progress", "pending", "resolved", "closed"];
const TICKET_TYPE_ICONS = {
  incident: "mdi:alert-circle-outline",
  demande: "mdi:hand-extended-outline",
  probleme: "mdi:bug-outline",
  changement: "mdi:swap-horizontal"
};
const PRIORITY_ICONS = {
  low: "mdi:arrow-down",
  normal: "mdi:minus",
  high: "mdi:arrow-up",
  urgent: "mdi:alert"
};
const CHANNEL_ICONS = {
  phone: "mdi:phone",
  email: "mdi:email-outline",
  web: "mdi:web",
  chat: "mdi:message-outline",
  whatsapp: "mdi:whatsapp"
};
const TIP_ICONS = ["mdi:ear-hearing", "mdi:message-reply-text", "mdi:account-voice", "mdi:text-box-search-outline"];
const ATTACHMENT_FORMATS_LABEL = "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX, MP4, 3GP, MP3, OGG, AAC, AMR, M4A";
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
function formatShortDate(dateString, locale) {
  if (!dateString) return null;
  try {
    return new Intl.DateTimeFormat(LOCALE_BCP47[locale] || "fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(dateString));
  } catch {
    return null;
  }
}
const CREATE_COPY = {
  fr: {
    eyebrow: "Helpdesk",
    pageTitle: "Nouveau ticket support",
    pageSubtitle: "Saisie interne par {agent} · pour le compte d'un client",
    back: "Retour",
    createTicket: "Créer le ticket",
    creating: "Création…",
    loadingData: "Chargement des données…",
    dropOverlayTitle: "Déposez vos documents pour les joindre au ticket",
    dropOverlayHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · 15 Mo max par fichier, {max} max",
    ticketTypes: {
      incident: {
        label: "Incident",
        hint: "Panne ou interruption de service"
      },
      demande: {
        label: "Demande",
        hint: "Besoin ou question client"
      },
      probleme: {
        label: "Problème",
        hint: "Cause racine récurrente"
      },
      changement: {
        label: "Changement",
        hint: "Modification planifiée"
      }
    },
    titlePlaceholders: {
      incident: "Poste inaccessible · erreur réseau au démarrage",
      demande: "Création compte pour nouveau collaborateur",
      probleme: "Déconnexions VPN récurrentes",
      changement: "Migration boîte mail vers Exchange Online"
    },
    descriptionPlaceholders: {
      incident: "Le client n'a plus accès à Internet depuis ce matin. L'icône réseau affiche une croix malgré un redémarrage. Accès au ERP impossible, impact sur la facturation.",
      demande: "Création d'un compte Windows et d'une boîte mail pour Mme Martin, nouvelle collaboratrice au service comptabilité, avec prise de poste lundi prochain.",
      probleme: "Déconnexions VPN aléatoires chez plusieurs utilisateurs du site de Lyon, 2 à 3 fois par jour, depuis la mise à jour du client la semaine dernière.",
      changement: "Migration de la messagerie vers Exchange Online prévue samedi 22 mars de 8h à 12h. Coupure d'accès pendant la bascule, fenêtre validée par le client."
    },
    priority: {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente"
    },
    channels: {
      phone: {
        label: "Téléphone",
        hint: "Appel entrant ou sortant"
      },
      email: {
        label: "Email",
        hint: "Demande reçue par mail"
      },
      web: {
        label: "Web",
        hint: "Portail ou saisie directe"
      },
      chat: {
        label: "Chat",
        hint: "Teams ou messagerie"
      },
      whatsapp: {
        label: "WhatsApp",
        hint: "Message WhatsApp Business"
      }
    },
    channelWhatsappDisabled: "WhatsApp réservé aux tickets créés via WhatsApp",
    statusLabels: {
      new: "Nouveau",
      open: "Nouveau",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolu",
      closed: "Clôturé"
    },
    statusShort: {
      new: "N",
      open: "N",
      in_progress: "E",
      pending: "A",
      resolved: "R",
      closed: "C"
    },
    tipsTitle: "Conseils",
    tips: ["Commencez par l'écoute : laissez le client exposer son besoin sans l'interrompre.", "Reformulez pour valider · « Si je comprends bien, vous… » · avec une phrase claire et intelligible que le client peut confirmer.", "Évitez le jargon : traduisez le technique en langage simple et adaptez-vous au niveau du demandeur.", "Notez le contexte, l'impact métier, les actions déjà tentées et un créneau de rappel si besoin."],
    sections: {
      requester: "Demandeur",
      ticketDetails: "Détails du ticket",
      contract: "Contrat et services",
      settings: "Paramètres",
      equipment: "Matériel concerné",
      ticketLink: "Liaison ticket"
    },
    requesterContact: "Contact demandeur",
    searchContact: "Rechercher un contact…",
    searchContactAria: "Rechercher un contact demandeur",
    noContactFound: "Aucun contact trouvé",
    createContact: "Créer un contact",
    newContact: "Nouveau",
    editContactAria: "Modifier le contact",
    ticketHistory: "Historique tickets",
    loading: "Chargement…",
    openTickets: "Ouverts",
    thisMonth: "Ce mois",
    thisYear: "Cette année",
    lastTicket: "Dernier ticket",
    noTicketForContact: "Aucun ticket enregistré pour ce contact",
    openTicketsTitle: "Tickets ouverts ({count})",
    viewOpenTicketsAria: "Voir les {count} tickets ouverts",
    updatedPrefix: "MAJ ",
    contactSlot: "Créneau de contact",
    availabilityAria: "Disponibilité du demandeur",
    slotNone: "Aucune",
    slotFrom: "Dès",
    slotRange: "Plage",
    dateAria: "Date",
    timeAria: "Heure",
    timeRangeAria: "Plage horaire",
    startTimeAria: "Heure de début",
    endTimeAria: "Heure de fin",
    notePlaceholder: "Note…",
    subject: "Sujet",
    detailedDescription: "Description détaillée",
    documents: "Documents",
    dragFiles: "Glissez vos fichiers ici ou parcourez",
    attachmentHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · 15 Mo max par fichier, {max} max",
    addFiles: "Ajouter des fichiers",
    removeFileAria: "Retirer {name}",
    showTipsAria: "Afficher les conseils de saisie",
    enterprise: "Entreprise",
    contract: "Contrat",
    options: "Options",
    credits: "Crédits",
    sla: "SLA",
    noContract: "Pas de contrat",
    noOption: "Pas d'option",
    noCredit: "Pas de crédit",
    noSla: "Pas de SLA",
    contractExpired: "Expiré le {date}",
    contractExpiredShort: "Expiré",
    contractPending: "Démarre le {date}",
    contractPendingShort: "Pas encore démarré",
    contractActive: "Valide jusqu'au {date}",
    contractActiveShort: "En cours",
    contractModules: {
      Support: "Support",
      Curatif: "Curatif",
      Preventif: "Préventif",
      Monitoring: "Monitoring",
      Hebergement: "Hébergement",
      MagicInfo: "MagicInfo"
    },
    contractValidity: {
      expiredTitle: "Contrat expiré",
      expiredDetailDays: "Expiré depuis {days} jour",
      expiredDetailDaysPlural: "Expiré depuis {days} jours",
      expiredInactive: "Le contrat client n'est plus actif",
      expiredShort: "Expiré",
      expiringTitle: "Contrat expire bientôt",
      expiringToday: "Expire aujourd'hui",
      expiringInDays: "Expire dans {days} jour",
      expiringInDaysPlural: "Expire dans {days} jours",
      expiringFallback: "Renouvellement à prévoir",
      expiringShort: "Expire bientôt"
    },
    slaFormat: "1ère rép. {first}h · résolution {resolution}h",
    majorIncident: "Incident majeur",
    itilCategory: "Catégorie ITIL",
    searchCategory: "Rechercher une catégorie…",
    noCategoryFound: "Aucune catégorie trouvée",
    uncategorized: "Non classée",
    priorityLabel: "Priorité",
    channelLabel: "Canal",
    preAssign: "Pré-assignation",
    searchAgent: "Rechercher un agent…",
    searchAgentAssignAria: "Rechercher un agent à pré-assigner",
    assignAgentsAria: "Agents à pré-assigner",
    noAgentFound: "Aucun agent trouvé",
    noAssignee: "Aucun assigné",
    followers: "Followers",
    searchFollowerAria: "Rechercher un agent follower",
    followerAgentsAria: "Agents followers",
    noFollower: "Aucun follower",
    removeAgentAria: "Retirer {name}",
    equipmentConcernedAria: "Matériel concerné",
    no: "Non",
    yes: "Oui",
    equipmentSourceAria: "Source matériel",
    equipmentVeritas: "Veritas",
    equipmentExternal: "Hors inventaire",
    equipment: "Matériel",
    selectRequesterFirst: "Sélectionnez d'abord un demandeur.",
    loadingFleet: "Chargement du parc…",
    noFleetEquipment: "Aucun matériel référencé · utilisez « Hors inventaire ».",
    selectEquipment: "Sélectionner",
    searchEquipment: "Rechercher par nom, type ou n° de série…",
    noEquipmentFound: "Aucun matériel trouvé",
    serialPrefix: "SN: ",
    brand: "Marque",
    model: "Modèle",
    serialNumber: "N° de série",
    brandPlaceholder: "Dell, HP, Lenovo…",
    modelPlaceholder: "Latitude 5520",
    serialPlaceholder: "Numéro de série",
    ticketLinkAria: "Liaison à un ticket existant",
    linkNone: "Aucune",
    existingTicket: "Ticket existant",
    loadingRequesterTickets: "Chargement des tickets du demandeur…",
    noRequesterTickets: "Aucun ticket trouvé pour ce demandeur.",
    ticketToLink: "Ticket à lier",
    searchTicketPlaceholder: "Rechercher par numéro ou titre…",
    noTicketFound: "Aucun ticket trouvé",
    selectTicketFromList: "Sélectionnez un ticket dans la liste",
    untitled: "Sans titre",
    recapTitle: "Récapitulatif du ticket",
    recapSubtitle: "Vérifiez les informations avant de confirmer la création.",
    recapMajor: "Majeure",
    recapRequester: "Demandeur",
    recapClient: "Client",
    recapChannel: "Canal",
    recapCategory: "Catégorie",
    recapEquipment: "Matériel",
    recapLinkedTicket: "Ticket lié",
    recapPreAssign: "Pré-assignation",
    recapDocuments: "Documents",
    recapCreatedBy: "Créé par {agent} pour le compte du client.",
    confirmCreate: "Confirmer la création",
    cancel: "Annuler",
    close: "Fermer",
    none: "Aucun",
    veritasEquipment: "Matériel Veritas",
    externalEquipment: "Hors Veritas",
    successTitle: "Ticket créé",
    successSubtitle: "Le ticket a été enregistré pour {client}",
    successRegistered: "Ticket #{number} enregistré",
    successCreatedFor: "Créé au nom de {contact}{clientSuffix}.",
    viewTicket: "Voir le ticket",
    createAnother: "Créer un autre",
    ticketList: "Liste des tickets",
    theClient: "le client",
    agentFallback: "Agent",
    contactFallback: "Contact #{id}",
    relativeToday: "aujourd'hui",
    relativeYesterday: "hier",
    relativeDays: "il y a {count} j",
    relativeMonths: "il y a {count} mois",
    slotFromLabel: "À partir du {date} à {time}{note}",
    slotRangeLabel: "{date} · {start} – {end}{note}",
    attachmentSizeBytes: "{size} o",
    attachmentSizeKb: "{size} Ko",
    attachmentSizeMb: "{size} Mo",
    attachmentTypeError: "Type de fichier non autorisé. Formats acceptés : {formats}.",
    attachmentSizeError: "Le fichier « {name} » dépasse 15 Mo.",
    attachmentInvalid: "Pièce jointe invalide",
    maxFilesWarning: "Maximum {max} fichiers par ticket.",
    openRecapError: "Impossible d'ouvrir le récapitulatif.",
    createSuccess: "Ticket créé avec succès",
    createError: "Erreur lors de la création du ticket",
    attachmentsUploadWarning: "Ticket créé, mais les documents n'ont pas pu être joints."
  },
  en: {
    eyebrow: "Helpdesk",
    pageTitle: "New support ticket",
    pageSubtitle: "Internal entry by {agent} · on behalf of a client",
    back: "Back",
    createTicket: "Create ticket",
    creating: "Creating…",
    loadingData: "Loading data…",
    dropOverlayTitle: "Drop your files to attach them to the ticket",
    dropOverlayHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · 15 MB max per file, {max} max",
    ticketTypes: {
      incident: {
        label: "Incident",
        hint: "Outage or service interruption"
      },
      demande: {
        label: "Request",
        hint: "Customer need or question"
      },
      probleme: {
        label: "Problem",
        hint: "Recurring root cause"
      },
      changement: {
        label: "Change",
        hint: "Planned modification"
      }
    },
    titlePlaceholders: {
      incident: "Workstation unreachable · network error at startup",
      demande: "Account creation for new employee",
      probleme: "Recurring VPN disconnections",
      changement: "Mailbox migration to Exchange Online"
    },
    descriptionPlaceholders: {
      incident: "The client has no internet access since this morning. The network icon shows a cross despite a restart. ERP access is impossible, impacting billing.",
      demande: "Create a Windows account and mailbox for Ms. Martin, new accounting team member, starting next Monday.",
      probleme: "Random VPN disconnections for several users at the Lyon site, 2 to 3 times a day, since last week's client update.",
      changement: "Mailbox migration to Exchange Online scheduled Saturday March 22 from 8am to 12pm. Access outage during cutover, window approved by the client."
    },
    priority: {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "Urgent"
    },
    channels: {
      phone: {
        label: "Phone",
        hint: "Incoming or outgoing call"
      },
      email: {
        label: "Email",
        hint: "Request received by email"
      },
      web: {
        label: "Web",
        hint: "Portal or direct entry"
      },
      chat: {
        label: "Chat",
        hint: "Teams or messaging"
      },
      whatsapp: {
        label: "WhatsApp",
        hint: "WhatsApp Business message"
      }
    },
    channelWhatsappDisabled: "WhatsApp reserved for tickets created via WhatsApp",
    statusLabels: {
      new: "New",
      open: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    statusShort: {
      new: "N",
      open: "N",
      in_progress: "P",
      pending: "W",
      resolved: "R",
      closed: "C"
    },
    tipsTitle: "Tips",
    tips: ["Start by listening: let the client explain their need without interrupting.", "Rephrase to confirm · \"If I understand correctly, you…\" · with a clear sentence the client can validate.", "Avoid jargon: translate technical terms into plain language adapted to the requester.", "Note context, business impact, actions already tried, and a callback slot if needed."],
    sections: {
      requester: "Requester",
      ticketDetails: "Ticket details",
      contract: "Contract and services",
      settings: "Settings",
      equipment: "Affected hardware",
      ticketLink: "Ticket link"
    },
    requesterContact: "Requesting contact",
    searchContact: "Search for a contact…",
    searchContactAria: "Search for a requester contact",
    noContactFound: "No contact found",
    createContact: "Create a contact",
    newContact: "New",
    editContactAria: "Edit contact",
    ticketHistory: "Ticket history",
    loading: "Loading…",
    openTickets: "Open",
    thisMonth: "This month",
    thisYear: "This year",
    lastTicket: "Last ticket",
    noTicketForContact: "No tickets recorded for this contact",
    openTicketsTitle: "Open tickets ({count})",
    viewOpenTicketsAria: "View {count} open tickets",
    updatedPrefix: "Updated ",
    contactSlot: "Contact slot",
    availabilityAria: "Requester availability",
    slotNone: "None",
    slotFrom: "From",
    slotRange: "Range",
    dateAria: "Date",
    timeAria: "Time",
    timeRangeAria: "Time range",
    startTimeAria: "Start time",
    endTimeAria: "End time",
    notePlaceholder: "Note…",
    subject: "Subject",
    detailedDescription: "Detailed description",
    documents: "Documents",
    dragFiles: "Drag files here or browse",
    attachmentHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · 15 MB max per file, {max} max",
    addFiles: "Add files",
    removeFileAria: "Remove {name}",
    showTipsAria: "Show entry tips",
    enterprise: "Company",
    contract: "Contract",
    options: "Options",
    credits: "Credits",
    sla: "SLA",
    noContract: "No contract",
    noOption: "No option",
    noCredit: "No credit",
    noSla: "No SLA",
    contractExpired: "Expired on {date}",
    contractExpiredShort: "Expired",
    contractPending: "Starts on {date}",
    contractPendingShort: "Not started yet",
    contractActive: "Valid until {date}",
    contractActiveShort: "Active",
    contractModules: {
      Support: "Support",
      Curatif: "Corrective",
      Preventif: "Preventive",
      Monitoring: "Monitoring",
      Hebergement: "Hosting",
      MagicInfo: "MagicInfo"
    },
    contractValidity: {
      expiredTitle: "Contract expired",
      expiredDetailDays: "Expired {days} day ago",
      expiredDetailDaysPlural: "Expired {days} days ago",
      expiredInactive: "The client contract is no longer active",
      expiredShort: "Expired",
      expiringTitle: "Contract expiring soon",
      expiringToday: "Expires today",
      expiringInDays: "Expires in {days} day",
      expiringInDaysPlural: "Expires in {days} days",
      expiringFallback: "Renewal required",
      expiringShort: "Expiring soon"
    },
    slaFormat: "1st resp. {first}h · resolution {resolution}h",
    majorIncident: "Major incident",
    itilCategory: "ITIL category",
    searchCategory: "Search for a category…",
    noCategoryFound: "No category found",
    uncategorized: "Uncategorized",
    priorityLabel: "Priority",
    channelLabel: "Channel",
    preAssign: "Pre-assignment",
    searchAgent: "Search for an agent…",
    searchAgentAssignAria: "Search for an agent to pre-assign",
    assignAgentsAria: "Agents to pre-assign",
    noAgentFound: "No agent found",
    noAssignee: "None assigned",
    followers: "Followers",
    searchFollowerAria: "Search for a follower agent",
    followerAgentsAria: "Follower agents",
    noFollower: "No follower",
    removeAgentAria: "Remove {name}",
    equipmentConcernedAria: "Affected hardware",
    no: "No",
    yes: "Yes",
    equipmentSourceAria: "Hardware source",
    equipmentVeritas: "Veritas",
    equipmentExternal: "Off inventory",
    equipment: "Hardware",
    selectRequesterFirst: "Select a requester first.",
    loadingFleet: "Loading fleet…",
    noFleetEquipment: "No registered hardware · use \"Off inventory\".",
    selectEquipment: "Select",
    searchEquipment: "Search by name, type or serial number…",
    noEquipmentFound: "No hardware found",
    serialPrefix: "SN: ",
    brand: "Brand",
    model: "Model",
    serialNumber: "Serial number",
    brandPlaceholder: "Dell, HP, Lenovo…",
    modelPlaceholder: "Latitude 5520",
    serialPlaceholder: "Serial number",
    ticketLinkAria: "Link to an existing ticket",
    linkNone: "None",
    existingTicket: "Existing ticket",
    loadingRequesterTickets: "Loading requester tickets…",
    noRequesterTickets: "No tickets found for this requester.",
    ticketToLink: "Ticket to link",
    searchTicketPlaceholder: "Search by number or title…",
    noTicketFound: "No ticket found",
    selectTicketFromList: "Select a ticket from the list",
    untitled: "Untitled",
    recapTitle: "Ticket summary",
    recapSubtitle: "Review the information before confirming creation.",
    recapMajor: "Major",
    recapRequester: "Requester",
    recapClient: "Client",
    recapChannel: "Channel",
    recapCategory: "Category",
    recapEquipment: "Hardware",
    recapLinkedTicket: "Linked ticket",
    recapPreAssign: "Pre-assignment",
    recapDocuments: "Documents",
    recapCreatedBy: "Created by {agent} on behalf of the client.",
    confirmCreate: "Confirm creation",
    cancel: "Cancel",
    close: "Close",
    none: "None",
    veritasEquipment: "Veritas hardware",
    externalEquipment: "Off Veritas",
    successTitle: "Ticket created",
    successSubtitle: "The ticket was saved for {client}",
    successRegistered: "Ticket #{number} saved",
    successCreatedFor: "Created on behalf of {contact}{clientSuffix}.",
    viewTicket: "View ticket",
    createAnother: "Create another",
    ticketList: "Ticket list",
    theClient: "the client",
    agentFallback: "Agent",
    contactFallback: "Contact #{id}",
    relativeToday: "today",
    relativeYesterday: "yesterday",
    relativeDays: "{count} days ago",
    relativeMonths: "{count} months ago",
    slotFromLabel: "From {date} at {time}{note}",
    slotRangeLabel: "{date} · {start} – {end}{note}",
    attachmentSizeBytes: "{size} B",
    attachmentSizeKb: "{size} KB",
    attachmentSizeMb: "{size} MB",
    attachmentTypeError: "File type not allowed. Accepted formats: {formats}.",
    attachmentSizeError: "File \"{name}\" exceeds 15 MB.",
    attachmentInvalid: "Invalid attachment",
    maxFilesWarning: "Maximum {max} files per ticket.",
    openRecapError: "Unable to open the summary.",
    createSuccess: "Ticket created successfully",
    createError: "Error creating ticket",
    attachmentsUploadWarning: "Ticket created, but attachments could not be uploaded."
  },
  de: {
    eyebrow: "Helpdesk",
    pageTitle: "Neues Support-Ticket",
    pageSubtitle: "Interne Erfassung durch {agent} · im Auftrag eines Kunden",
    back: "Zurück",
    createTicket: "Ticket erstellen",
    creating: "Erstellung…",
    loadingData: "Daten werden geladen…",
    dropOverlayTitle: "Dateien ablegen, um sie dem Ticket anzuhängen",
    dropOverlayHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · max. 15 MB pro Datei, {max} max",
    ticketTypes: {
      incident: {
        label: "Vorfall",
        hint: "Ausfall oder Dienstunterbrechung"
      },
      demande: {
        label: "Anfrage",
        hint: "Kundenbedarf oder Frage"
      },
      probleme: {
        label: "Problem",
        hint: "Wiederkehrende Ursache"
      },
      changement: {
        label: "Änderung",
        hint: "Geplante Änderung"
      }
    },
    titlePlaceholders: {
      incident: "Arbeitsplatz nicht erreichbar · Netzwerkfehler beim Start",
      demande: "Konto für neuen Mitarbeiter erstellen",
      probleme: "Wiederkehrende VPN-Trennungen",
      changement: "Postfachmigration zu Exchange Online"
    },
    descriptionPlaceholders: {
      incident: "Der Kunde hat seit heute Morgen keinen Internetzugang. Das Netzwerksymbol zeigt trotz Neustart ein Kreuz. ERP-Zugang unmöglich, Auswirkung auf die Abrechnung.",
      demande: "Windows-Konto und Postfach für Frau Martin, neue Mitarbeiterin in der Buchhaltung, mit Arbeitsbeginn nächsten Montag.",
      probleme: "Zufällige VPN-Trennungen bei mehreren Benutzern am Standort Lyon, 2–3 Mal täglich, seit dem Client-Update letzte Woche.",
      changement: "Migration der E-Mail zu Exchange Online geplant am Samstag, 22. März, 8–12 Uhr. Zugangsausfall während der Umstellung, Fenster vom Kunden bestätigt."
    },
    priority: {
      low: "Niedrig",
      normal: "Normal",
      high: "Hoch",
      urgent: "Dringend"
    },
    channels: {
      phone: {
        label: "Telefon",
        hint: "Eingehender oder ausgehender Anruf"
      },
      email: {
        label: "E-Mail",
        hint: "Anfrage per E-Mail erhalten"
      },
      web: {
        label: "Web",
        hint: "Portal oder direkte Eingabe"
      },
      chat: {
        label: "Chat",
        hint: "Teams oder Messaging"
      },
      whatsapp: {
        label: "WhatsApp",
        hint: "WhatsApp-Business-Nachricht"
      }
    },
    channelWhatsappDisabled: "WhatsApp nur für über WhatsApp erstellte Tickets",
    statusLabels: {
      new: "Neu",
      open: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Wartend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    statusShort: {
      new: "N",
      open: "N",
      in_progress: "B",
      pending: "W",
      resolved: "G",
      closed: "C"
    },
    tipsTitle: "Tipps",
    tips: ["Beginnen Sie mit Zuhören: Lassen Sie den Kunden sein Anliegen ohne Unterbrechung schildern.", "Formulieren Sie zur Bestätigung um · „Wenn ich Sie richtig verstehe…“ · mit einem klaren Satz.", "Vermeiden Sie Fachjargon: Übersetzen Sie Technik in einfache Sprache.", "Notieren Sie Kontext, Geschäftsauswirkung, bereits versuchte Maßnahmen und ggf. einen Rückruftermin."],
    sections: {
      requester: "Anfragender",
      ticketDetails: "Ticketdetails",
      contract: "Vertrag und Services",
      settings: "Einstellungen",
      equipment: "Betroffene Hardware",
      ticketLink: "Ticket-Verknüpfung"
    },
    requesterContact: "Anfragender Kontakt",
    searchContact: "Kontakt suchen…",
    searchContactAria: "Anfragenden Kontakt suchen",
    noContactFound: "Kein Kontakt gefunden",
    createContact: "Kontakt erstellen",
    newContact: "Neu",
    editContactAria: "Kontakt bearbeiten",
    ticketHistory: "Ticket-Verlauf",
    loading: "Laden…",
    openTickets: "Offen",
    thisMonth: "Diesen Monat",
    thisYear: "Dieses Jahr",
    lastTicket: "Letztes Ticket",
    noTicketForContact: "Keine Tickets für diesen Kontakt",
    openTicketsTitle: "Offene Tickets ({count})",
    viewOpenTicketsAria: "{count} offene Tickets anzeigen",
    updatedPrefix: "Akt. ",
    contactSlot: "Kontaktzeitfenster",
    availabilityAria: "Verfügbarkeit des Anfragenden",
    slotNone: "Keine",
    slotFrom: "Ab",
    slotRange: "Zeitraum",
    dateAria: "Datum",
    timeAria: "Uhrzeit",
    timeRangeAria: "Zeitspanne",
    startTimeAria: "Startzeit",
    endTimeAria: "Endzeit",
    notePlaceholder: "Notiz…",
    subject: "Betreff",
    detailedDescription: "Ausführliche Beschreibung",
    documents: "Dokumente",
    dragFiles: "Dateien hierher ziehen oder durchsuchen",
    attachmentHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · max. 15 MB pro Datei, {max} max",
    addFiles: "Dateien hinzufügen",
    removeFileAria: "{name} entfernen",
    showTipsAria: "Eingabetipps anzeigen",
    enterprise: "Unternehmen",
    contract: "Vertrag",
    options: "Optionen",
    credits: "Guthaben",
    sla: "SLA",
    noContract: "Kein Vertrag",
    noOption: "Keine Option",
    noCredit: "Kein Guthaben",
    noSla: "Kein SLA",
    contractExpired: "Abgelaufen am {date}",
    contractExpiredShort: "Abgelaufen",
    contractPending: "Beginnt am {date}",
    contractPendingShort: "Noch nicht gestartet",
    contractActive: "Gültig bis {date}",
    contractActiveShort: "Aktiv",
    contractModules: {
      Support: "Support",
      Curatif: "Korrektiv",
      Preventif: "Präventiv",
      Monitoring: "Monitoring",
      Hebergement: "Hosting",
      MagicInfo: "MagicInfo"
    },
    contractValidity: {
      expiredTitle: "Vertrag abgelaufen",
      expiredDetailDays: "Vor {days} Tag abgelaufen",
      expiredDetailDaysPlural: "Vor {days} Tagen abgelaufen",
      expiredInactive: "Der Kundenvertrag ist nicht mehr aktiv",
      expiredShort: "Abgelaufen",
      expiringTitle: "Vertrag läuft bald ab",
      expiringToday: "Läuft heute ab",
      expiringInDays: "Läuft in {days} Tag ab",
      expiringInDaysPlural: "Läuft in {days} Tagen ab",
      expiringFallback: "Verlängerung erforderlich",
      expiringShort: "Läuft bald ab"
    },
    slaFormat: "1. Reakt. {first}h · Lösung {resolution}h",
    majorIncident: "Schwerer Vorfall",
    itilCategory: "ITIL-Kategorie",
    searchCategory: "Kategorie suchen…",
    noCategoryFound: "Keine Kategorie gefunden",
    uncategorized: "Nicht kategorisiert",
    priorityLabel: "Priorität",
    channelLabel: "Kanal",
    preAssign: "Vorzuweisung",
    searchAgent: "Agent suchen…",
    searchAgentAssignAria: "Agent zur Vorzuweisung suchen",
    assignAgentsAria: "Vorzuzuweisende Agenten",
    noAgentFound: "Kein Agent gefunden",
    noAssignee: "Nicht zugewiesen",
    followers: "Follower",
    searchFollowerAria: "Follower-Agent suchen",
    followerAgentsAria: "Follower-Agenten",
    noFollower: "Kein Follower",
    removeAgentAria: "{name} entfernen",
    equipmentConcernedAria: "Betroffene Hardware",
    no: "Nein",
    yes: "Ja",
    equipmentSourceAria: "Hardware-Quelle",
    equipmentVeritas: "Veritas",
    equipmentExternal: "Außerhalb Inventar",
    equipment: "Hardware",
    selectRequesterFirst: "Wählen Sie zuerst einen Anfragenden.",
    loadingFleet: "Bestand wird geladen…",
    noFleetEquipment: "Keine Hardware im Bestand · „Außerhalb Inventar“ verwenden.",
    selectEquipment: "Auswählen",
    searchEquipment: "Nach Name, Typ oder Seriennummer suchen…",
    noEquipmentFound: "Keine Hardware gefunden",
    serialPrefix: "SN: ",
    brand: "Marke",
    model: "Modell",
    serialNumber: "Seriennummer",
    brandPlaceholder: "Dell, HP, Lenovo…",
    modelPlaceholder: "Latitude 5520",
    serialPlaceholder: "Seriennummer",
    ticketLinkAria: "Mit bestehendem Ticket verknüpfen",
    linkNone: "Keine",
    existingTicket: "Bestehendes Ticket",
    loadingRequesterTickets: "Tickets des Anfragenden werden geladen…",
    noRequesterTickets: "Keine Tickets für diesen Anfragenden.",
    ticketToLink: "Zu verknüpfendes Ticket",
    searchTicketPlaceholder: "Nach Nummer oder Titel suchen…",
    noTicketFound: "Kein Ticket gefunden",
    selectTicketFromList: "Ticket aus der Liste wählen",
    untitled: "Ohne Titel",
    recapTitle: "Ticket-Zusammenfassung",
    recapSubtitle: "Informationen vor der Erstellung prüfen.",
    recapMajor: "Schwer",
    recapRequester: "Anfragender",
    recapClient: "Kunde",
    recapChannel: "Kanal",
    recapCategory: "Kategorie",
    recapEquipment: "Hardware",
    recapLinkedTicket: "Verknüpftes Ticket",
    recapPreAssign: "Vorzuweisung",
    recapDocuments: "Dokumente",
    recapCreatedBy: "Erstellt von {agent} im Auftrag des Kunden.",
    confirmCreate: "Erstellung bestätigen",
    cancel: "Abbrechen",
    close: "Schließen",
    none: "Keine",
    veritasEquipment: "Veritas-Hardware",
    externalEquipment: "Außerhalb Veritas",
    successTitle: "Ticket erstellt",
    successSubtitle: "Das Ticket wurde für {client} gespeichert",
    successRegistered: "Ticket #{number} gespeichert",
    successCreatedFor: "Erstellt im Auftrag von {contact}{clientSuffix}.",
    viewTicket: "Ticket anzeigen",
    createAnother: "Weiteres erstellen",
    ticketList: "Ticketliste",
    theClient: "den Kunden",
    agentFallback: "Agent",
    contactFallback: "Kontakt #{id}",
    relativeToday: "heute",
    relativeYesterday: "gestern",
    relativeDays: "vor {count} T.",
    relativeMonths: "vor {count} Mon.",
    slotFromLabel: "Ab {date} um {time}{note}",
    slotRangeLabel: "{date} · {start} – {end}{note}",
    attachmentSizeBytes: "{size} B",
    attachmentSizeKb: "{size} KB",
    attachmentSizeMb: "{size} MB",
    attachmentTypeError: "Dateityp nicht erlaubt. Akzeptierte Formate: {formats}.",
    attachmentSizeError: "Datei „{name}“ überschreitet 15 MB.",
    attachmentInvalid: "Ungültiger Anhang",
    maxFilesWarning: "Maximal {max} Dateien pro Ticket.",
    openRecapError: "Zusammenfassung kann nicht geöffnet werden.",
    createSuccess: "Ticket erfolgreich erstellt",
    createError: "Fehler bei der Ticket-Erstellung",
    attachmentsUploadWarning: "Ticket erstellt, aber Anhänge konnten nicht hochgeladen werden."
  },
  it: {
    eyebrow: "Helpdesk",
    pageTitle: "Nuovo ticket di supporto",
    pageSubtitle: "Inserimento interno da {agent} · per conto di un cliente",
    back: "Indietro",
    createTicket: "Crea ticket",
    creating: "Creazione…",
    loadingData: "Caricamento dati…",
    dropOverlayTitle: "Rilascia i file per allegarli al ticket",
    dropOverlayHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · max 15 MB per file, {max} max",
    ticketTypes: {
      incident: {
        label: "Incidente",
        hint: "Guasto o interruzione del servizio"
      },
      demande: {
        label: "Richiesta",
        hint: "Esigenza o domanda del cliente"
      },
      probleme: {
        label: "Problema",
        hint: "Causa radice ricorrente"
      },
      changement: {
        label: "Cambio",
        hint: "Modifica pianificata"
      }
    },
    titlePlaceholders: {
      incident: "Postazione irraggiungibile · errore di rete all'avvio",
      demande: "Creazione account per nuovo collaboratore",
      probleme: "Disconnessioni VPN ricorrenti",
      changement: "Migrazione casella mail verso Exchange Online"
    },
    descriptionPlaceholders: {
      incident: "Il cliente non ha accesso a Internet da stamattina. L'icona di rete mostra una croce nonostante un riavvio. Accesso ERP impossibile, impatto sulla fatturazione.",
      demande: "Creazione account Windows e casella mail per la sig.ra Martin, nuova collaboratrice contabilità, con inizio lunedì prossimo.",
      probleme: "Disconnessioni VPN casuali per diversi utenti della sede di Lione, 2-3 volte al giorno, dall'aggiornamento client della scorsa settimana.",
      changement: "Migrazione posta verso Exchange Online prevista sabato 22 marzo dalle 8 alle 12. Interruzione accesso durante lo switch, finestra approvata dal cliente."
    },
    priority: {
      low: "Bassa",
      normal: "Normale",
      high: "Alta",
      urgent: "Urgente"
    },
    channels: {
      phone: {
        label: "Telefono",
        hint: "Chiamata in entrata o uscita"
      },
      email: {
        label: "Email",
        hint: "Richiesta ricevuta via email"
      },
      web: {
        label: "Web",
        hint: "Portale o inserimento diretto"
      },
      chat: {
        label: "Chat",
        hint: "Teams o messaggistica"
      },
      whatsapp: {
        label: "WhatsApp",
        hint: "Messaggio WhatsApp Business"
      }
    },
    channelWhatsappDisabled: "WhatsApp riservato ai ticket creati via WhatsApp",
    statusLabels: {
      new: "Nuovo",
      open: "Nuovo",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolto",
      closed: "Chiuso"
    },
    statusShort: {
      new: "N",
      open: "N",
      in_progress: "C",
      pending: "A",
      resolved: "R",
      closed: "C"
    },
    tipsTitle: "Consigli",
    tips: ["Iniziate ascoltando: lasciate che il cliente esponga il bisogno senza interromperlo.", "Riformulate per confermare · «Se ho capito bene, lei…» · con una frase chiara che il cliente possa validare.", "Evitate il gergo: traducete il tecnico in linguaggio semplice adattato al richiedente.", "Annotate contesto, impatto business, azioni già tentate e un slot di richiamata se necessario."],
    sections: {
      requester: "Richiedente",
      ticketDetails: "Dettagli del ticket",
      contract: "Contratto e servizi",
      settings: "Parametri",
      equipment: "Hardware interessato",
      ticketLink: "Collegamento ticket"
    },
    requesterContact: "Contatto richiedente",
    searchContact: "Cerca un contatto…",
    searchContactAria: "Cerca un contatto richiedente",
    noContactFound: "Nessun contatto trovato",
    createContact: "Crea un contatto",
    newContact: "Nuovo",
    editContactAria: "Modifica contatto",
    ticketHistory: "Storico ticket",
    loading: "Caricamento…",
    openTickets: "Aperti",
    thisMonth: "Questo mese",
    thisYear: "Quest'anno",
    lastTicket: "Ultimo ticket",
    noTicketForContact: "Nessun ticket registrato per questo contatto",
    openTicketsTitle: "Ticket aperti ({count})",
    viewOpenTicketsAria: "Vedi {count} ticket aperti",
    updatedPrefix: "Agg. ",
    contactSlot: "Fascia di contatto",
    availabilityAria: "Disponibilità del richiedente",
    slotNone: "Nessuna",
    slotFrom: "Da",
    slotRange: "Intervallo",
    dateAria: "Data",
    timeAria: "Ora",
    timeRangeAria: "Intervallo orario",
    startTimeAria: "Ora di inizio",
    endTimeAria: "Ora di fine",
    notePlaceholder: "Nota…",
    subject: "Oggetto",
    detailedDescription: "Descrizione dettagliata",
    documents: "Documenti",
    dragFiles: "Trascina i file qui o sfoglia",
    attachmentHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · max 15 MB per file, {max} max",
    addFiles: "Aggiungi file",
    removeFileAria: "Rimuovi {name}",
    showTipsAria: "Mostra consigli di inserimento",
    enterprise: "Azienda",
    contract: "Contratto",
    options: "Opzioni",
    credits: "Crediti",
    sla: "SLA",
    noContract: "Nessun contratto",
    noOption: "Nessuna opzione",
    noCredit: "Nessun credito",
    noSla: "Nessuno SLA",
    contractExpired: "Scaduto il {date}",
    contractExpiredShort: "Scaduto",
    contractPending: "Inizia il {date}",
    contractPendingShort: "Non ancora avviato",
    contractActive: "Valido fino al {date}",
    contractActiveShort: "In corso",
    contractModules: {
      Support: "Support",
      Curatif: "Correttivo",
      Preventif: "Preventivo",
      Monitoring: "Monitoraggio",
      Hebergement: "Hosting",
      MagicInfo: "MagicInfo"
    },
    contractValidity: {
      expiredTitle: "Contratto scaduto",
      expiredDetailDays: "Scaduto da {days} giorno",
      expiredDetailDaysPlural: "Scaduto da {days} giorni",
      expiredInactive: "Il contratto cliente non è più attivo",
      expiredShort: "Scaduto",
      expiringTitle: "Contratto in scadenza",
      expiringToday: "Scade oggi",
      expiringInDays: "Scade tra {days} giorno",
      expiringInDaysPlural: "Scade tra {days} giorni",
      expiringFallback: "Rinnovo da pianificare",
      expiringShort: "In scadenza"
    },
    slaFormat: "1ª risp. {first}h · risoluzione {resolution}h",
    majorIncident: "Incidente grave",
    itilCategory: "Categoria ITIL",
    searchCategory: "Cerca una categoria…",
    noCategoryFound: "Nessuna categoria trovata",
    uncategorized: "Non classificata",
    priorityLabel: "Priorità",
    channelLabel: "Canale",
    preAssign: "Pre-assegnazione",
    searchAgent: "Cerca un agente…",
    searchAgentAssignAria: "Cerca un agente da pre-assegnare",
    assignAgentsAria: "Agenti da pre-assegnare",
    noAgentFound: "Nessun agente trovato",
    noAssignee: "Nessun assegnatario",
    followers: "Follower",
    searchFollowerAria: "Cerca un agente follower",
    followerAgentsAria: "Agenti follower",
    noFollower: "Nessun follower",
    removeAgentAria: "Rimuovi {name}",
    equipmentConcernedAria: "Hardware interessato",
    no: "No",
    yes: "Sì",
    equipmentSourceAria: "Origine hardware",
    equipmentVeritas: "Veritas",
    equipmentExternal: "Fuori inventario",
    equipment: "Hardware",
    selectRequesterFirst: "Seleziona prima un richiedente.",
    loadingFleet: "Caricamento parco…",
    noFleetEquipment: "Nessun hardware registrato · usa «Fuori inventario».",
    selectEquipment: "Seleziona",
    searchEquipment: "Cerca per nome, tipo o numero di serie…",
    noEquipmentFound: "Nessun hardware trovato",
    serialPrefix: "SN: ",
    brand: "Marca",
    model: "Modello",
    serialNumber: "N. di serie",
    brandPlaceholder: "Dell, HP, Lenovo…",
    modelPlaceholder: "Latitude 5520",
    serialPlaceholder: "Numero di serie",
    ticketLinkAria: "Collegamento a ticket esistente",
    linkNone: "Nessuna",
    existingTicket: "Ticket esistente",
    loadingRequesterTickets: "Caricamento ticket del richiedente…",
    noRequesterTickets: "Nessun ticket trovato per questo richiedente.",
    ticketToLink: "Ticket da collegare",
    searchTicketPlaceholder: "Cerca per numero o titolo…",
    noTicketFound: "Nessun ticket trovato",
    selectTicketFromList: "Seleziona un ticket dall'elenco",
    untitled: "Senza titolo",
    recapTitle: "Riepilogo del ticket",
    recapSubtitle: "Verifica le informazioni prima di confermare la creazione.",
    recapMajor: "Grave",
    recapRequester: "Richiedente",
    recapClient: "Cliente",
    recapChannel: "Canale",
    recapCategory: "Categoria",
    recapEquipment: "Hardware",
    recapLinkedTicket: "Ticket collegato",
    recapPreAssign: "Pre-assegnazione",
    recapDocuments: "Documenti",
    recapCreatedBy: "Creato da {agent} per conto del cliente.",
    confirmCreate: "Conferma creazione",
    cancel: "Annulla",
    close: "Chiudi",
    none: "Nessuno",
    veritasEquipment: "Hardware Veritas",
    externalEquipment: "Fuori Veritas",
    successTitle: "Ticket creato",
    successSubtitle: "Il ticket è stato registrato per {client}",
    successRegistered: "Ticket #{number} registrato",
    successCreatedFor: "Creato per conto di {contact}{clientSuffix}.",
    viewTicket: "Vedi ticket",
    createAnother: "Creane un altro",
    ticketList: "Elenco ticket",
    theClient: "il cliente",
    agentFallback: "Agente",
    contactFallback: "Contatto #{id}",
    relativeToday: "oggi",
    relativeYesterday: "ieri",
    relativeDays: "{count} g fa",
    relativeMonths: "{count} mesi fa",
    slotFromLabel: "A partire dal {date} alle {time}{note}",
    slotRangeLabel: "{date} · {start} – {end}{note}",
    attachmentSizeBytes: "{size} o",
    attachmentSizeKb: "{size} KB",
    attachmentSizeMb: "{size} MB",
    attachmentTypeError: "Tipo di file non consentito. Formati accettati: {formats}.",
    attachmentSizeError: "Il file «{name}» supera 15 MB.",
    attachmentInvalid: "Allegato non valido",
    maxFilesWarning: "Massimo {max} file per ticket.",
    openRecapError: "Impossibile aprire il riepilogo.",
    createSuccess: "Ticket creato con successo",
    createError: "Errore durante la creazione del ticket",
    attachmentsUploadWarning: "Ticket creato, ma i documenti non sono stati allegati."
  },
  es: {
    eyebrow: "Helpdesk",
    pageTitle: "Nuevo ticket de soporte",
    pageSubtitle: "Entrada interna por {agent} · en nombre de un cliente",
    back: "Volver",
    createTicket: "Crear ticket",
    creating: "Creando…",
    loadingData: "Cargando datos…",
    dropOverlayTitle: "Suelta los archivos para adjuntarlos al ticket",
    dropOverlayHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · 15 MB máx. por archivo, {max} máx.",
    ticketTypes: {
      incident: {
        label: "Incidente",
        hint: "Avería o interrupción del servicio"
      },
      demande: {
        label: "Solicitud",
        hint: "Necesidad o pregunta del cliente"
      },
      probleme: {
        label: "Problema",
        hint: "Causa raíz recurrente"
      },
      changement: {
        label: "Cambio",
        hint: "Modificación planificada"
      }
    },
    titlePlaceholders: {
      incident: "Puesto inaccesible · error de red al iniciar",
      demande: "Creación de cuenta para nuevo empleado",
      probleme: "Desconexiones VPN recurrentes",
      changement: "Migración de buzón a Exchange Online"
    },
    descriptionPlaceholders: {
      incident: "El cliente no tiene acceso a Internet desde esta mañana. El icono de red muestra una cruz pese al reinicio. Acceso al ERP imposible, impacto en facturación.",
      demande: "Creación de cuenta Windows y buzón para la Sra. Martin, nueva empleada de contabilidad, con inicio el próximo lunes.",
      probleme: "Desconexiones VPN aleatorias en varios usuarios de la sede de Lyon, 2-3 veces al día, desde la actualización del cliente la semana pasada.",
      changement: "Migración del correo a Exchange Online prevista el sábado 22 de marzo de 8h a 12h. Corte de acceso durante el cambio, ventana validada por el cliente."
    },
    priority: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente"
    },
    channels: {
      phone: {
        label: "Teléfono",
        hint: "Llamada entrante o saliente"
      },
      email: {
        label: "Email",
        hint: "Solicitud recibida por correo"
      },
      web: {
        label: "Web",
        hint: "Portal o entrada directa"
      },
      chat: {
        label: "Chat",
        hint: "Teams o mensajería"
      },
      whatsapp: {
        label: "WhatsApp",
        hint: "Mensaje WhatsApp Business"
      }
    },
    channelWhatsappDisabled: "WhatsApp reservado para tickets creados vía WhatsApp",
    statusLabels: {
      new: "Nuevo",
      open: "Nuevo",
      in_progress: "En curso",
      pending: "En espera",
      resolved: "Resuelto",
      closed: "Cerrado"
    },
    statusShort: {
      new: "N",
      open: "N",
      in_progress: "C",
      pending: "E",
      resolved: "R",
      closed: "C"
    },
    tipsTitle: "Consejos",
    tips: ["Empiece escuchando: deje que el cliente exponga su necesidad sin interrumpirlo.", "Reformule para confirmar · «Si entiendo bien, usted…» · con una frase clara que el cliente pueda validar.", "Evite la jerga: traduzca lo técnico a un lenguaje sencillo adaptado al solicitante.", "Anote contexto, impacto empresarial, acciones ya intentadas y una franja de devolución de llamada si hace falta."],
    sections: {
      requester: "Solicitante",
      ticketDetails: "Detalles del ticket",
      contract: "Contrato y servicios",
      settings: "Parámetros",
      equipment: "Hardware afectado",
      ticketLink: "Vinculación de ticket"
    },
    requesterContact: "Contacto solicitante",
    searchContact: "Buscar un contacto…",
    searchContactAria: "Buscar un contacto solicitante",
    noContactFound: "Ningún contacto encontrado",
    createContact: "Crear un contacto",
    newContact: "Nuevo",
    editContactAria: "Editar contacto",
    ticketHistory: "Historial de tickets",
    loading: "Cargando…",
    openTickets: "Abiertos",
    thisMonth: "Este mes",
    thisYear: "Este año",
    lastTicket: "Último ticket",
    noTicketForContact: "Ningún ticket registrado para este contacto",
    openTicketsTitle: "Tickets abiertos ({count})",
    viewOpenTicketsAria: "Ver {count} tickets abiertos",
    updatedPrefix: "Act. ",
    contactSlot: "Franja de contacto",
    availabilityAria: "Disponibilidad del solicitante",
    slotNone: "Ninguna",
    slotFrom: "Desde",
    slotRange: "Rango",
    dateAria: "Fecha",
    timeAria: "Hora",
    timeRangeAria: "Franja horaria",
    startTimeAria: "Hora de inicio",
    endTimeAria: "Hora de fin",
    notePlaceholder: "Nota…",
    subject: "Asunto",
    detailedDescription: "Descripción detallada",
    documents: "Documentos",
    dragFiles: "Arrastra archivos aquí o explora",
    attachmentHint: "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX · 15 MB máx. por archivo, {max} máx.",
    addFiles: "Añadir archivos",
    removeFileAria: "Quitar {name}",
    showTipsAria: "Mostrar consejos de entrada",
    enterprise: "Empresa",
    contract: "Contrato",
    options: "Opciones",
    credits: "Créditos",
    sla: "SLA",
    noContract: "Sin contrato",
    noOption: "Sin opción",
    noCredit: "Sin crédito",
    noSla: "Sin SLA",
    contractExpired: "Caducado el {date}",
    contractExpiredShort: "Caducado",
    contractPending: "Empieza el {date}",
    contractPendingShort: "Aún no iniciado",
    contractActive: "Válido hasta el {date}",
    contractActiveShort: "En curso",
    contractModules: {
      Support: "Soporte",
      Curatif: "Correctivo",
      Preventif: "Preventivo",
      Monitoring: "Monitorización",
      Hebergement: "Alojamiento",
      MagicInfo: "MagicInfo"
    },
    contractValidity: {
      expiredTitle: "Contrato caducado",
      expiredDetailDays: "Caducado hace {days} día",
      expiredDetailDaysPlural: "Caducado hace {days} días",
      expiredInactive: "El contrato del cliente ya no está activo",
      expiredShort: "Caducado",
      expiringTitle: "Contrato próximo a caducar",
      expiringToday: "Caduca hoy",
      expiringInDays: "Caduca en {days} día",
      expiringInDaysPlural: "Caduca en {days} días",
      expiringFallback: "Renovación pendiente",
      expiringShort: "Caduca pronto"
    },
    slaFormat: "1ª resp. {first}h · resolución {resolution}h",
    majorIncident: "Incidente grave",
    itilCategory: "Categoría ITIL",
    searchCategory: "Buscar una categoría…",
    noCategoryFound: "Ninguna categoría encontrada",
    uncategorized: "Sin clasificar",
    priorityLabel: "Prioridad",
    channelLabel: "Canal",
    preAssign: "Preasignación",
    searchAgent: "Buscar un agente…",
    searchAgentAssignAria: "Buscar un agente para preasignar",
    assignAgentsAria: "Agentes a preasignar",
    noAgentFound: "Ningún agente encontrado",
    noAssignee: "Ningún asignado",
    followers: "Seguidores",
    searchFollowerAria: "Buscar un agente seguidor",
    followerAgentsAria: "Agentes seguidores",
    noFollower: "Ningún seguidor",
    removeAgentAria: "Quitar {name}",
    equipmentConcernedAria: "Hardware afectado",
    no: "No",
    yes: "Sí",
    equipmentSourceAria: "Origen del hardware",
    equipmentVeritas: "Veritas",
    equipmentExternal: "Fuera de inventario",
    equipment: "Hardware",
    selectRequesterFirst: "Seleccione primero un solicitante.",
    loadingFleet: "Cargando parque…",
    noFleetEquipment: "Ningún hardware registrado · use «Fuera de inventario».",
    selectEquipment: "Seleccionar",
    searchEquipment: "Buscar por nombre, tipo o número de serie…",
    noEquipmentFound: "No se encontró hardware",
    serialPrefix: "SN: ",
    brand: "Marca",
    model: "Modelo",
    serialNumber: "N.º de serie",
    brandPlaceholder: "Dell, HP, Lenovo…",
    modelPlaceholder: "Latitude 5520",
    serialPlaceholder: "Número de serie",
    ticketLinkAria: "Vinculación a ticket existente",
    linkNone: "Ninguna",
    existingTicket: "Ticket existente",
    loadingRequesterTickets: "Cargando tickets del solicitante…",
    noRequesterTickets: "Ningún ticket encontrado para este solicitante.",
    ticketToLink: "Ticket a vincular",
    searchTicketPlaceholder: "Buscar por número o título…",
    noTicketFound: "Ningún ticket encontrado",
    selectTicketFromList: "Seleccione un ticket de la lista",
    untitled: "Sin título",
    recapTitle: "Resumen del ticket",
    recapSubtitle: "Verifique la información antes de confirmar la creación.",
    recapMajor: "Grave",
    recapRequester: "Solicitante",
    recapClient: "Cliente",
    recapChannel: "Canal",
    recapCategory: "Categoría",
    recapEquipment: "Hardware",
    recapLinkedTicket: "Ticket vinculado",
    recapPreAssign: "Preasignación",
    recapDocuments: "Documentos",
    recapCreatedBy: "Creado por {agent} en nombre del cliente.",
    confirmCreate: "Confirmar creación",
    cancel: "Cancelar",
    close: "Cerrar",
    none: "Ninguno",
    veritasEquipment: "Hardware Veritas",
    externalEquipment: "Fuera de Veritas",
    successTitle: "Ticket creado",
    successSubtitle: "El ticket se ha registrado para {client}",
    successRegistered: "Ticket #{number} registrado",
    successCreatedFor: "Creado en nombre de {contact}{clientSuffix}.",
    viewTicket: "Ver ticket",
    createAnother: "Crear otro",
    ticketList: "Lista de tickets",
    theClient: "el cliente",
    agentFallback: "Agente",
    contactFallback: "Contacto #{id}",
    relativeToday: "hoy",
    relativeYesterday: "ayer",
    relativeDays: "hace {count} d",
    relativeMonths: "hace {count} meses",
    slotFromLabel: "A partir del {date} a las {time}{note}",
    slotRangeLabel: "{date} · {start} – {end}{note}",
    attachmentSizeBytes: "{size} B",
    attachmentSizeKb: "{size} KB",
    attachmentSizeMb: "{size} MB",
    attachmentTypeError: "Tipo de archivo no permitido. Formatos aceptados: {formats}.",
    attachmentSizeError: "El archivo «{name}» supera 15 MB.",
    attachmentInvalid: "Adjunto no válido",
    maxFilesWarning: "Máximo {max} archivos por ticket.",
    openRecapError: "No se puede abrir el resumen.",
    createSuccess: "Ticket creado con éxito",
    createError: "Error al crear el ticket",
    attachmentsUploadWarning: "Ticket creado, pero no se pudieron adjuntar los documentos."
  }
};
export function getTicketCreateCopy(locale) {
  const t = pickLocaleMessages(CREATE_COPY, locale);
  const bcp47 = LOCALE_BCP47[locale] || LOCALE_BCP47.fr;
  const ticketTypes = TICKET_TYPE_KEYS.map(key => ({
    key,
    label: t.ticketTypes[key].label,
    hint: t.ticketTypes[key].hint,
    icon: TICKET_TYPE_ICONS[key]
  }));
  const priorityOptions = PRIORITY_KEYS.map(key => ({
    key,
    label: t.priority[key],
    icon: PRIORITY_ICONS[key]
  }));
  const channelOptions = CHANNEL_KEYS.map(key => ({
    key,
    label: t.channels[key].label,
    hint: t.channels[key].hint,
    icon: CHANNEL_ICONS[key]
  }));
  const tips = TIP_ICONS.map((icon, index) => ({
    icon,
    text: t.tips[index]
  }));
  return {
    ...t,
    ticketTypes,
    priorityOptions,
    channelOptions,
    tips,
    getStatusLabel: status => t.statusLabels[status] || status || "-",
    getStatusShort: status => t.statusShort[status] || "?",
    getTitlePlaceholder: type => t.titlePlaceholders[type] || "",
    getDescriptionPlaceholder: type => t.descriptionPlaceholders[type] || "",
    formatPageSubtitle: agent => interpolate(t.pageSubtitle, {
      agent
    }),
    formatDropOverlayHint: max => interpolate(t.dropOverlayHint, {
      max: String(max)
    }),
    formatAttachmentHint: max => interpolate(t.attachmentHint, {
      max: String(max)
    }),
    formatOpenTicketsTitle: count => interpolate(t.openTicketsTitle, {
      count: String(count)
    }),
    formatViewOpenTicketsAria: count => interpolate(t.viewOpenTicketsAria, {
      count: String(count)
    }),
    formatRemoveFileAria: name => interpolate(t.removeFileAria, {
      name
    }),
    formatRemoveAgentAria: name => interpolate(t.removeAgentAria, {
      name
    }),
    formatSlaLabel: (first, resolution) => interpolate(t.slaFormat, {
      first: String(first),
      resolution: String(resolution)
    }),
    formatSuccessSubtitle: client => interpolate(t.successSubtitle, {
      client: client || t.theClient
    }),
    formatSuccessRegistered: number => interpolate(t.successRegistered, {
      number
    }),
    formatSuccessCreatedFor: (contact, clientLabel) => interpolate(t.successCreatedFor, {
      contact,
      clientSuffix: clientLabel ? ` · ${clientLabel}` : ""
    }),
    formatRecapCreatedBy: agent => interpolate(t.recapCreatedBy, {
      agent
    }),
    formatMaxFilesWarning: max => interpolate(t.maxFilesWarning, {
      max: String(max)
    }),
    formatContactFallback: id => interpolate(t.contactFallback, {
      id: String(id)
    }),
    formatRelativeDate: date => {
      if (!date) return "";
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayDiff = Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));
      if (dayDiff <= 0) return t.relativeToday;
      if (dayDiff === 1) return t.relativeYesterday;
      if (dayDiff < 30) return interpolate(t.relativeDays, {
        count: String(dayDiff)
      });
      const monthDiff = Math.floor(dayDiff / 30);
      if (monthDiff < 12) return interpolate(t.relativeMonths, {
        count: String(monthDiff)
      });
      return new Intl.DateTimeFormat(bcp47, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
    },
    formatContactSlotLabel: slot => {
      const slotDate = slot?.date || "-";
      const noteSuffix = slot?.note ? ` · ${slot.note}` : "";
      if (slot?.mode === "from" || !slot?.endTime && slot?.startTime) {
        return interpolate(t.slotFromLabel, {
          date: slotDate,
          time: slot.startTime || "-",
          note: noteSuffix
        });
      }
      return interpolate(t.slotRangeLabel, {
        date: slotDate,
        start: slot.startTime || "-",
        end: slot.endTime || "-",
        note: noteSuffix
      });
    },
    formatAttachmentSize: bytes => {
      const size = Number(bytes || 0);
      if (size < 1024) return interpolate(t.attachmentSizeBytes, {
        size: String(size)
      });
      if (size < 1024 * 1024) {
        return interpolate(t.attachmentSizeKb, {
          size: (size / 1024).toFixed(1)
        });
      }
      return interpolate(t.attachmentSizeMb, {
        size: (size / (1024 * 1024)).toFixed(1)
      });
    },
    getContractFactLabel: (validity, {
      startDate,
      expirationDate
    } = {}) => {
      const expiration = formatShortDate(expirationDate, locale);
      const start = formatShortDate(startDate, locale);
      const status = validity?.status || "unknown";
      if (status === "expired") {
        return expiration ? interpolate(t.contractExpired, {
          date: expiration
        }) : t.contractExpiredShort;
      }
      if (status === "pending") {
        return start ? interpolate(t.contractPending, {
          date: start
        }) : t.contractPendingShort;
      }
      if (status === "expiring" || status === "active") {
        return expiration ? interpolate(t.contractActive, {
          date: expiration
        }) : t.contractActiveShort;
      }
      return t.noContract;
    },
    getContractModuleLabel: (moduleKey, fallbackLabel) => {
      const key = String(moduleKey || "");
      return t.contractModules?.[key] || fallbackLabel || key;
    },
    getContractValidityAlert: (validity, contractFactLabel = "") => {
      const cv = t.contractValidity;
      const status = validity?.status;
      if (status !== "expired" && status !== "expiring") return null;
      const days = Number(validity?.daysUntilExpiration);
      if (status === "expired") {
        const daysAgo = Number.isFinite(days) ? Math.abs(days) : null;
        let detail = contractFactLabel || cv.expiredInactive;
        if (daysAgo != null && daysAgo > 0) {
          const template = daysAgo > 1 ? cv.expiredDetailDaysPlural : cv.expiredDetailDays;
          detail = interpolate(template, {
            days: String(daysAgo)
          });
        }
        return {
          status: "expired",
          title: cv.expiredTitle,
          detail,
          shortLabel: cv.expiredShort,
          icon: "mdi:alert-circle-outline"
        };
      }
      const daysLeft = Number.isFinite(days) ? days : null;
      let detail = contractFactLabel || cv.expiringFallback;
      if (daysLeft != null) {
        if (daysLeft <= 0) {
          detail = cv.expiringToday;
        } else {
          const template = daysLeft > 1 ? cv.expiringInDaysPlural : cv.expiringInDays;
          detail = interpolate(template, {
            days: String(daysLeft)
          });
        }
      }
      return {
        status: "expiring",
        title: cv.expiringTitle,
        detail,
        shortLabel: cv.expiringShort,
        icon: "mdi:clock-alert-outline"
      };
    },
    validateAttachmentFiles: (files = []) => {
      for (const file of files) {
        const name = String(file?.name || "");
        const ext = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
        const allowed = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"]);
        if (!allowed.has(ext)) {
          throw new Error(interpolate(t.attachmentTypeError, {
            formats: ATTACHMENT_FORMATS_LABEL
          }));
        }
        if (Number(file?.size || 0) > 15 * 1024 * 1024) {
          throw new Error(interpolate(t.attachmentSizeError, {
            name
          }));
        }
      }
    }
  };
}
export { ATTACHMENT_FORMATS_LABEL, STATUS_KEYS };
