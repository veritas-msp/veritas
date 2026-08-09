import { interpolate, pickLocaleMessages } from "../../i18n/translate";

const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};

const STATUS_KEYS = ["new", "in_progress", "pending", "resolved", "closed"];

const COPY = {
  fr: {
    back: "Retour aux demandes",
    loading: "Chargement de la demande…",
    loadError: "Impossible de charger la demande",
    notFound: "Demande introuvable",
    kind: {
      prestation: "Prestation",
      installation: "Installation"
    },
    family: {
      support: "Support",
      services: "Services"
    },
    ticketNumber: "Ticket #{number}",
    status: {
      new: "Nouveau",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolu",
      closed: "Fermé"
    },
    progress: "Avancement",
    progressFromTodos: "Calculé automatiquement selon les to-dos cochées",
    progressSaved: "Avancement mis à jour",
    progressError: "Erreur lors de la mise à jour de l'avancement",
    statusSaved: "Statut mis à jour",
    statusError: "Erreur lors de la mise à jour du statut",
    tags: {
      title: "Étiquettes",
      placeholder: "Étiquette…",
      add: "Ajouter une étiquette",
      remove: "Retirer l'étiquette",
      added: "Étiquette ajoutée",
      addError: "Erreur lors de l'ajout de l'étiquette",
      removed: "Étiquette retirée",
      removeError: "Erreur lors de la suppression de l'étiquette"
    },
    planning: {
      title: "Planification",
      notPlanned: "Aucune tâche planifiée",
      openPlanning: "Ouvrir le planning",
      start: "Début",
      end: "Fin",
      noEventHint: "Ajoutez une tâche avec une date pour créer un événement sur le planning."
    },
    form: {
      title: "Formulaire",
      creator: "Créateur",
      purchaseOrder: "Bon de commande",
      commercial: "Commercial",
      projectManager: "Chef de projet",
      empty: "Aucune donnée de formulaire"
    },
    searchRequester: "Rechercher un agent…",
    noRequesterFound: "Aucun agent trouvé",
    searchClient: "Rechercher une entreprise…",
    noClientFound: "Aucune entreprise trouvée",
    meta: {
      title: "Propriétés",
      client: "Entreprise",
      contact: "Contact",
      assignees: "Assigné",
      followers: "Suiveur",
      status: "Statut",
      none: "—",
      updateError: "Erreur lors de la mise à jour",
      requesterSaved: "Demandeur mis à jour",
      clientSaved: "Entreprise mise à jour",
      typeSaved: "Type mis à jour",
      categorySaved: "Catégorie mise à jour",
      prioritySaved: "Priorité mise à jour"
    },
    team: {
      title: "Équipe",
      addAssignee: "Ajouter un assigné",
      assignMe: "M'assigner",
      assignMeAlready: "Déjà assigné",
      addFollower: "Ajouter un suiveur",
      removeAssignee: "Retirer l'assigné",
      removeFollower: "Retirer le suiveur",
      searchAgent: "Rechercher un agent…",
      noAgentFound: "Aucun agent trouvé",
      noAssignee: "Aucun assigné",
      noFollower: "Aucun suiveur",
      error: "Impossible de mettre à jour l'équipe"
    },
    tasks: {
      title: "Tâches",
      empty: "Aucune tâche pour le moment",
      label: "Titre",
      placeholder: "Titre de la tâche…",
      add: "Ajouter une tâche",
      edit: "Modifier la tâche",
      save: "Enregistrer",
      cancel: "Annuler",
      remove: "Supprimer la tâche",
      removeConfirmTitle: "Supprimer la tâche ?",
      removeConfirmMessage: "Voulez-vous vraiment supprimer « {label} » ? Cette action est irréversible.",
      removeConfirmMessageFallback: "Voulez-vous vraiment supprimer cette tâche ? Cette action est irréversible.",
      removeConfirm: "Supprimer",
      saving: "Enregistrement…",
      saveError: "Erreur lors de l'enregistrement des tâches",
      assignee: "Assigné",
      assigneeNone: "Non assigné",
      start: "Début",
      end: "Fin",
      range: "Plage de dates",
      rangeJoiner: "→",
      startRequired: "Une date de début est obligatoire (événement planning).",
      eventType: "Type d'événement",
      eventTypeRequired: "Le type d'événement est obligatoire.",
      eventTypeRequiredShort: "Type requis",
      planningSyncError: "Impossible de synchroniser la tâche avec le planning.",
      planningLinkedHint: "Chaque tâche crée ou met à jour un événement sur le planning.",
      markDone: "Marquer comme faite",
      markTodo: "Marquer comme à faire",
      modal: {
        eyebrow: "Tâches",
        createSubtitle: "Planifiez une tâche liée à cette demande.",
        editSubtitle: "Modifiez la tâche et son événement planning.",
        sectionsAria: "Sections du formulaire tâche",
        footerUntitled: "Sans titre",
        generalTitle: "Général",
        generalDesc: "Type d'événement et titre de la tâche.",
        scheduleTitle: "Planning",
        scheduleDesc: "Créneau synchronisé avec le planning.",
        assigneeTitle: "Assignation",
        assigneeDesc: "Agent responsable de la tâche.",
        sections: {
          general: { label: "Général", description: "Type et titre" },
          schedule: { label: "Planning", description: "Dates" },
          assignee: { label: "Assigné", description: "Responsable" }
        }
      }
    },
    chat: {
      title: "Journal du projet",
      public: "Public",
      attach: "Joindre / image",
      removeFile: "Retirer le fichier",
      fileTooLarge: "Fichier trop volumineux (max 15 Mo)",
      attachment: "Pièce jointe",
      attachmentOnlyFallback: "Pièce(s) jointe(s)",
      unknownAuthor: "Utilisateur"
    },
    centerTabs: {
      aria: "Contenu de la demande",
      chat: "Discussion",
      tasks: "Tâches",
      form: "Formulaire"
    },
    report: {
      title: "Rapport d'intervention",
      hint: "Rédigez le rapport d'intervention lié à cette prestation depuis le module Rapports.",
      cta: "Créer un rapport"
    },
    delivery: {
      title: "Jalons",
      plan: "Intervention planifiée",
      tasks: "Tâches terminées",
      progress: "Avancement à 100%",
      close: "Demande clôturée"
    },
    taskStats: {
      title: "Statistiques des tâches",
      toggleTitle: "Statistiques des tâches",
      toggleAria: "Afficher les statistiques des tâches",
      empty: "Aucune tâche pour calculer des statistiques.",
      hoursHint: "Heures calculées à partir des plages début → fin des tâches.",
      hoursPlanned: "Heures planifiées",
      hoursDone: "Heures terminées",
      hoursRemaining: "Heures restantes",
      progress: "Avancement",
      done: "Terminées",
      todo: "À faire",
      overdue: "En retard",
      unassigned: "Non assignées",
      unscheduled: "Sans plage",
      byAssignee: "Par assigné",
      noAssignee: "Non assigné",
      tasksCount: "{done}/{total} tâches"
    },
    formatDuration: {
      lessThanOneMin: "< 1 min",
      daysHours: "{days} j {hours} h",
      daysOnly: "{days} j",
      hoursMinutes: "{hours} h {minutes} min",
      hoursOnly: "{hours} h",
      minutesOnly: "{minutes} min"
    },
    comments: {
      title: "Commentaires",
      empty: "Aucun commentaire",
      placeholder: "Écrire un message… (images et fichiers acceptés)",
      submit: "Envoyer",
      submitting: "Envoi…",
      added: "Message ajouté",
      error: "Erreur lors de l'ajout du message",
      internal: "Privé"
    }
  },
  en: {
    back: "Back to requests",
    loading: "Loading request…",
    loadError: "Unable to load request",
    notFound: "Request not found",
    kind: {
      prestation: "Service",
      installation: "Installation"
    },
    family: {
      support: "Support",
      services: "Services"
    },
    ticketNumber: "Ticket #{number}",
    status: {
      new: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    progress: "Progress",
    progressFromTodos: "Calculated automatically from completed to-dos",
    progressSaved: "Progress updated",
    progressError: "Error updating progress",
    statusSaved: "Status updated",
    statusError: "Error updating status",
    tags: {
      title: "Tags",
      placeholder: "Tag…",
      add: "Add a tag",
      remove: "Remove tag",
      added: "Tag added",
      addError: "Error adding tag",
      removed: "Tag removed",
      removeError: "Error removing tag"
    },
    planning: {
      title: "Planning",
      notPlanned: "No scheduled tasks",
      openPlanning: "Open planning",
      start: "Start",
      end: "End",
      noEventHint: "Add a task with a date to create a planning event."
    },
    form: {
      title: "Form",
      creator: "Creator",
      purchaseOrder: "Purchase order",
      commercial: "Sales rep",
      projectManager: "Project manager",
      empty: "No form data"
    },
    searchRequester: "Search for an agent…",
    noRequesterFound: "No agent found",
    searchClient: "Search for a company…",
    noClientFound: "No company found",
    meta: {
      title: "Properties",
      client: "Company",
      contact: "Contact",
      assignees: "Assignee",
      followers: "Follower",
      status: "Status",
      none: "—",
      updateError: "Error updating",
      requesterSaved: "Requester updated",
      clientSaved: "Company updated",
      typeSaved: "Type updated",
      categorySaved: "Category updated",
      prioritySaved: "Priority updated"
    },
    team: {
      title: "Team",
      addAssignee: "Add assignee",
      assignMe: "Assign to me",
      assignMeAlready: "Already assigned",
      addFollower: "Add follower",
      removeAssignee: "Remove assignee",
      removeFollower: "Remove follower",
      searchAgent: "Search for an agent…",
      noAgentFound: "No agent found",
      noAssignee: "None assigned",
      noFollower: "No follower",
      error: "Unable to update team"
    },
    tasks: {
      title: "Tasks",
      empty: "No tasks yet",
      label: "Title",
      placeholder: "Task title…",
      add: "Add task",
      edit: "Edit task",
      save: "Save",
      cancel: "Cancel",
      remove: "Remove task",
      removeConfirmTitle: "Delete this task?",
      removeConfirmMessage: "Do you really want to delete “{label}”? This action cannot be undone.",
      removeConfirmMessageFallback: "Do you really want to delete this task? This action cannot be undone.",
      removeConfirm: "Delete",
      saving: "Saving…",
      saveError: "Error saving tasks",
      assignee: "Assignee",
      assigneeNone: "Unassigned",
      start: "Start",
      end: "End",
      range: "Date range",
      rangeJoiner: "→",
      startRequired: "A start date is required (planning event).",
      eventType: "Event type",
      eventTypeRequired: "Event type is required.",
      eventTypeRequiredShort: "Type required",
      planningSyncError: "Unable to sync the task with planning.",
      planningLinkedHint: "Each task creates or updates a planning event.",
      markDone: "Mark as done",
      markTodo: "Mark as to do",
      modal: {
        eyebrow: "Tasks",
        createSubtitle: "Schedule a task linked to this request.",
        editSubtitle: "Edit the task and its planning event.",
        sectionsAria: "Task form sections",
        footerUntitled: "Untitled",
        generalTitle: "General",
        generalDesc: "Event type and task title.",
        scheduleTitle: "Schedule",
        scheduleDesc: "Time slot synced with planning.",
        assigneeTitle: "Assignment",
        assigneeDesc: "Agent responsible for the task.",
        sections: {
          general: { label: "General", description: "Type and title" },
          schedule: { label: "Schedule", description: "Dates" },
          assignee: { label: "Assignee", description: "Owner" }
        }
      }
    },
    chat: {
      title: "Project feed",
      public: "Public",
      attach: "Attach / image",
      removeFile: "Remove file",
      fileTooLarge: "File too large (max 15 MB)",
      attachment: "Attachment",
      attachmentOnlyFallback: "Attachment(s)",
      unknownAuthor: "User"
    },
    centerTabs: {
      aria: "Request content",
      chat: "Discussion",
      tasks: "Tasks",
      form: "Form"
    },
    report: {
      title: "Intervention report",
      hint: "Create the intervention report for this service from the Reports module.",
      cta: "Create report"
    },
    delivery: {
      title: "Milestones",
      plan: "Intervention scheduled",
      tasks: "Tasks completed",
      progress: "Progress at 100%",
      close: "Request closed"
    },
    taskStats: {
      title: "Task statistics",
      toggleTitle: "Task statistics",
      toggleAria: "Show task statistics",
      empty: "No tasks to compute statistics.",
      hoursHint: "Hours are calculated from each task’s start → end range.",
      hoursPlanned: "Planned hours",
      hoursDone: "Completed hours",
      hoursRemaining: "Remaining hours",
      progress: "Progress",
      done: "Done",
      todo: "To do",
      overdue: "Overdue",
      unassigned: "Unassigned",
      unscheduled: "No time range",
      byAssignee: "By assignee",
      noAssignee: "Unassigned",
      tasksCount: "{done}/{total} tasks"
    },
    formatDuration: {
      lessThanOneMin: "< 1 min",
      daysHours: "{days} d {hours} h",
      daysOnly: "{days} d",
      hoursMinutes: "{hours} h {minutes} min",
      hoursOnly: "{hours} h",
      minutesOnly: "{minutes} min"
    },
    comments: {
      title: "Comments",
      empty: "No comments",
      placeholder: "Write a message… (images and files accepted)",
      submit: "Send",
      submitting: "Sending…",
      added: "Message added",
      error: "Error adding message",
      internal: "Private"
    }
  },
  de: {
    back: "Zurück zu Anfragen",
    loading: "Anfrage wird geladen…",
    loadError: "Anfrage konnte nicht geladen werden",
    notFound: "Anfrage nicht gefunden",
    kind: {
      prestation: "Leistung",
      installation: "Installation"
    },
    family: {
      support: "Support",
      services: "Services"
    },
    ticketNumber: "Ticket #{number}",
    status: {
      new: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Ausstehend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    progress: "Fortschritt",
    progressFromTodos: "Automatisch aus erledigten To-dos berechnet",
    progressSaved: "Fortschritt aktualisiert",
    progressError: "Fehler beim Aktualisieren des Fortschritts",
    statusSaved: "Status aktualisiert",
    statusError: "Fehler beim Aktualisieren des Status",
    tags: {
      title: "Tags",
      placeholder: "Tag…",
      add: "Tag hinzufügen",
      remove: "Tag entfernen",
      added: "Tag hinzugefügt",
      addError: "Fehler beim Hinzufügen des Tags",
      removed: "Tag entfernt",
      removeError: "Fehler beim Entfernen des Tags"
    },
    planning: {
      title: "Planung",
      notPlanned: "Keine geplanten Aufgaben",
      openPlanning: "Planung öffnen",
      start: "Beginn",
      end: "Ende",
      noEventHint: "Fügen Sie eine Aufgabe mit Datum hinzu, um ein Planungsereignis zu erstellen."
    },
    form: {
      title: "Formular",
      creator: "Ersteller",
      purchaseOrder: "Bestellung",
      commercial: "Vertrieb",
      projectManager: "Projektleiter",
      empty: "Keine Formulardaten"
    },
    searchRequester: "Agent suchen…",
    noRequesterFound: "Kein Agent gefunden",
    searchClient: "Unternehmen suchen…",
    noClientFound: "Kein Unternehmen gefunden",
    meta: {
      title: "Eigenschaften",
      client: "Unternehmen",
      contact: "Kontakt",
      assignees: "Bearbeiter",
      followers: "Follower",
      status: "Status",
      none: "—",
      updateError: "Fehler beim Aktualisieren",
      requesterSaved: "Anfragender aktualisiert",
      clientSaved: "Unternehmen aktualisiert",
      typeSaved: "Typ aktualisiert",
      categorySaved: "Kategorie aktualisiert",
      prioritySaved: "Priorität aktualisiert"
    },
    team: {
      title: "Team",
      addAssignee: "Bearbeiter hinzufügen",
      addFollower: "Follower hinzufügen",
      removeAssignee: "Bearbeiter entfernen",
      removeFollower: "Follower entfernen",
      searchAgent: "Agent suchen…",
      noAgentFound: "Kein Agent gefunden",
      noAssignee: "Nicht zugewiesen",
      noFollower: "Kein Follower",
      error: "Team konnte nicht aktualisiert werden"
    },
    tasks: {
      title: "Aufgaben",
      empty: "Noch keine Aufgaben",
      label: "Titel",
      placeholder: "Aufgabentitel…",
      add: "Aufgabe hinzufügen",
      edit: "Aufgabe bearbeiten",
      save: "Speichern",
      cancel: "Abbrechen",
      remove: "Aufgabe entfernen",
      removeConfirmTitle: "Aufgabe löschen?",
      removeConfirmMessage: "Möchten Sie „{label}“ wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      removeConfirmMessageFallback: "Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      removeConfirm: "Löschen",
      saving: "Speichern…",
      saveError: "Fehler beim Speichern der Aufgaben",
      assignee: "Bearbeiter",
      assigneeNone: "Nicht zugewiesen",
      start: "Beginn",
      end: "Ende",
      range: "Zeitraum",
      rangeJoiner: "→",
      startRequired: "Ein Startdatum ist erforderlich (Planungsereignis).",
      eventType: "Ereignistyp",
      eventTypeRequired: "Der Ereignistyp ist erforderlich.",
      eventTypeRequiredShort: "Typ erforderlich",
      planningSyncError: "Aufgabe konnte nicht mit der Planung synchronisiert werden.",
      planningLinkedHint: "Jede Aufgabe erstellt oder aktualisiert ein Planungsereignis.",
      markDone: "Als erledigt markieren",
      markTodo: "Als offen markieren",
      modal: {
        eyebrow: "Aufgaben",
        createSubtitle: "Planen Sie eine Aufgabe für diese Anfrage.",
        editSubtitle: "Bearbeiten Sie die Aufgabe und ihr Planungsereignis.",
        sectionsAria: "Abschnitte des Aufgabenformulars",
        footerUntitled: "Ohne Titel",
        generalTitle: "Allgemein",
        generalDesc: "Ereignistyp und Aufgabentitel.",
        scheduleTitle: "Planung",
        scheduleDesc: "Zeitfenster mit der Planung synchronisiert.",
        assigneeTitle: "Zuweisung",
        assigneeDesc: "Verantwortlicher Agent.",
        sections: {
          general: { label: "Allgemein", description: "Typ und Titel" },
          schedule: { label: "Planung", description: "Daten" },
          assignee: { label: "Bearbeiter", description: "Verantwortlich" }
        }
      }
    },
    chat: {
      title: "Projekt-Feed",
      public: "Öffentlich",
      attach: "Anhang / Bild",
      removeFile: "Datei entfernen",
      fileTooLarge: "Datei zu groß (max. 15 MB)",
      attachment: "Anhang",
      attachmentOnlyFallback: "Anhang/Anhänge",
      unknownAuthor: "Benutzer"
    },
    centerTabs: {
      aria: "Anfrageinhalt",
      chat: "Diskussion",
      tasks: "Aufgaben",
      form: "Formular"
    },
    report: {
      title: "Einsatzbericht",
      hint: "Erstellen Sie den Einsatzbericht für diese Leistung im Modul Berichte.",
      cta: "Bericht erstellen"
    },
    delivery: {
      title: "Meilensteine",
      plan: "Einsatz geplant",
      tasks: "Aufgaben erledigt",
      progress: "Fortschritt bei 100%",
      close: "Anfrage geschlossen"
    },
    taskStats: {
      title: "Aufgabenstatistik",
      toggleTitle: "Aufgabenstatistik",
      toggleAria: "Aufgabenstatistik anzeigen",
      empty: "Keine Aufgaben für Statistiken.",
      hoursHint: "Stunden werden aus den Start→Ende-Zeiträumen der Aufgaben berechnet.",
      hoursPlanned: "Geplante Stunden",
      hoursDone: "Erledigte Stunden",
      hoursRemaining: "Verbleibende Stunden",
      progress: "Fortschritt",
      done: "Erledigt",
      todo: "Offen",
      overdue: "Überfällig",
      unassigned: "Nicht zugewiesen",
      unscheduled: "Ohne Zeitraum",
      byAssignee: "Nach Zuweisung",
      noAssignee: "Nicht zugewiesen",
      tasksCount: "{done}/{total} Aufgaben"
    },
    formatDuration: {
      lessThanOneMin: "< 1 Min.",
      daysHours: "{days} T {hours} Std.",
      daysOnly: "{days} T",
      hoursMinutes: "{hours} Std. {minutes} Min.",
      hoursOnly: "{hours} Std.",
      minutesOnly: "{minutes} Min."
    },
    comments: {
      title: "Kommentare",
      empty: "Keine Kommentare",
      placeholder: "Nachricht schreiben… (Bilder und Dateien erlaubt)",
      submit: "Senden",
      submitting: "Wird gesendet…",
      added: "Nachricht hinzugefügt",
      error: "Fehler beim Hinzufügen der Nachricht",
      internal: "Privat"
    }
  },
  it: {
    back: "Torna alle richieste",
    loading: "Caricamento richiesta…",
    loadError: "Impossibile caricare la richiesta",
    notFound: "Richiesta non trovata",
    kind: {
      prestation: "Prestazione",
      installation: "Installazione"
    },
    family: {
      support: "Supporto",
      services: "Servizi"
    },
    ticketNumber: "Ticket #{number}",
    status: {
      new: "Nuovo",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolto",
      closed: "Chiuso"
    },
    progress: "Avanzamento",
    progressFromTodos: "Calcolato automaticamente dai to-do completati",
    progressSaved: "Avanzamento aggiornato",
    progressError: "Errore durante l'aggiornamento dell'avanzamento",
    statusSaved: "Stato aggiornato",
    statusError: "Errore durante l'aggiornamento dello stato",
    tags: {
      title: "Tag",
      placeholder: "Tag…",
      add: "Aggiungi tag",
      remove: "Rimuovi tag",
      added: "Tag aggiunto",
      addError: "Errore durante l'aggiunta del tag",
      removed: "Tag rimosso",
      removeError: "Errore durante la rimozione del tag"
    },
    planning: {
      title: "Pianificazione",
      notPlanned: "Nessuna attività pianificata",
      openPlanning: "Apri pianificazione",
      start: "Inizio",
      end: "Fine",
      noEventHint: "Aggiungi un'attività con una data per creare un evento nel planning."
    },
    form: {
      title: "Modulo",
      creator: "Creatore",
      purchaseOrder: "Ordine d'acquisto",
      commercial: "Commerciale",
      projectManager: "Project manager",
      empty: "Nessun dato del modulo"
    },
    searchRequester: "Cerca un agente…",
    noRequesterFound: "Nessun agente trovato",
    searchClient: "Cerca un'azienda…",
    noClientFound: "Nessuna azienda trovata",
    meta: {
      title: "Proprietà",
      client: "Azienda",
      contact: "Contatto",
      assignees: "Assegnatario",
      followers: "Follower",
      status: "Stato",
      none: "—",
      updateError: "Errore durante l'aggiornamento",
      requesterSaved: "Richiedente aggiornato",
      clientSaved: "Azienda aggiornata",
      typeSaved: "Tipo aggiornato",
      categorySaved: "Categoria aggiornata",
      prioritySaved: "Priorità aggiornata"
    },
    team: {
      title: "Team",
      addAssignee: "Aggiungi assegnatario",
      addFollower: "Aggiungi follower",
      removeAssignee: "Rimuovi assegnatario",
      removeFollower: "Rimuovi follower",
      searchAgent: "Cerca un agente…",
      noAgentFound: "Nessun agente trovato",
      noAssignee: "Nessun assegnatario",
      noFollower: "Nessun follower",
      error: "Impossibile aggiornare il team"
    },
    tasks: {
      title: "Attività",
      empty: "Nessuna attività",
      label: "Titolo",
      placeholder: "Titolo attività…",
      add: "Aggiungi attività",
      edit: "Modifica attività",
      save: "Salva",
      cancel: "Annulla",
      remove: "Rimuovi attività",
      removeConfirmTitle: "Eliminare l'attività?",
      removeConfirmMessage: "Vuoi davvero eliminare « {label} »? Questa azione è irreversibile.",
      removeConfirmMessageFallback: "Vuoi davvero eliminare questa attività? Questa azione è irreversibile.",
      removeConfirm: "Elimina",
      saving: "Salvataggio…",
      saveError: "Errore nel salvataggio delle attività",
      assignee: "Assegnatario",
      assigneeNone: "Non assegnato",
      start: "Inizio",
      end: "Fine",
      range: "Intervallo date",
      rangeJoiner: "→",
      startRequired: "Una data di inizio è obbligatoria (evento planning).",
      eventType: "Tipo di evento",
      eventTypeRequired: "Il tipo di evento è obbligatorio.",
      eventTypeRequiredShort: "Tipo obbligatorio",
      planningSyncError: "Impossibile sincronizzare l'attività con il planning.",
      planningLinkedHint: "Ogni attività crea o aggiorna un evento nel planning.",
      markDone: "Segna come fatta",
      markTodo: "Segna come da fare",
      modal: {
        eyebrow: "Attività",
        createSubtitle: "Pianifica un'attività collegata a questa richiesta.",
        editSubtitle: "Modifica l'attività e il relativo evento planning.",
        sectionsAria: "Sezioni del modulo attività",
        footerUntitled: "Senza titolo",
        generalTitle: "Generale",
        generalDesc: "Tipo di evento e titolo dell'attività.",
        scheduleTitle: "Planning",
        scheduleDesc: "Fascia oraria sincronizzata con il planning.",
        assigneeTitle: "Assegnazione",
        assigneeDesc: "Agente responsabile dell'attività.",
        sections: {
          general: { label: "Generale", description: "Tipo e titolo" },
          schedule: { label: "Planning", description: "Date" },
          assignee: { label: "Assegnatario", description: "Responsabile" }
        }
      }
    },
    chat: {
      title: "Feed di progetto",
      public: "Pubblico",
      attach: "Allega / immagine",
      removeFile: "Rimuovi file",
      fileTooLarge: "File troppo grande (max 15 MB)",
      attachment: "Allegato",
      attachmentOnlyFallback: "Allegato/i",
      unknownAuthor: "Utente"
    },
    centerTabs: {
      aria: "Contenuto della richiesta",
      chat: "Discussione",
      tasks: "Attività",
      form: "Modulo"
    },
    report: {
      title: "Rapporto di intervento",
      hint: "Crea il rapporto di intervento per questa prestazione dal modulo Rapporti.",
      cta: "Crea rapporto"
    },
    delivery: {
      title: "Milestone",
      plan: "Intervento pianificato",
      tasks: "Attività completate",
      progress: "Avanzamento al 100%",
      close: "Richiesta chiusa"
    },
    taskStats: {
      title: "Statistiche attività",
      toggleTitle: "Statistiche attività",
      toggleAria: "Mostra le statistiche delle attività",
      empty: "Nessuna attività per calcolare le statistiche.",
      hoursHint: "Le ore sono calcolate dagli intervalli inizio → fine delle attività.",
      hoursPlanned: "Ore pianificate",
      hoursDone: "Ore completate",
      hoursRemaining: "Ore rimanenti",
      progress: "Avanzamento",
      done: "Completate",
      todo: "Da fare",
      overdue: "In ritardo",
      unassigned: "Non assegnate",
      unscheduled: "Senza intervallo",
      byAssignee: "Per assegnatario",
      noAssignee: "Non assegnato",
      tasksCount: "{done}/{total} attività"
    },
    formatDuration: {
      lessThanOneMin: "< 1 min",
      daysHours: "{days} g {hours} h",
      daysOnly: "{days} g",
      hoursMinutes: "{hours} h {minutes} min",
      hoursOnly: "{hours} h",
      minutesOnly: "{minutes} min"
    },
    comments: {
      title: "Commenti",
      empty: "Nessun commento",
      placeholder: "Scrivi un messaggio… (immagini e file accettati)",
      submit: "Invia",
      submitting: "Invio…",
      added: "Messaggio aggiunto",
      error: "Errore durante l'aggiunta del messaggio",
      internal: "Privato"
    }
  },
  es: {
    back: "Volver a solicitudes",
    loading: "Cargando solicitud…",
    loadError: "No se pudo cargar la solicitud",
    notFound: "Solicitud no encontrada",
    kind: {
      prestation: "Prestación",
      installation: "Instalación"
    },
    family: {
      support: "Soporte",
      services: "Servicios"
    },
    ticketNumber: "Ticket #{number}",
    status: {
      new: "Nuevo",
      in_progress: "En curso",
      pending: "Pendiente",
      resolved: "Resuelto",
      closed: "Cerrado"
    },
    progress: "Progreso",
    progressFromTodos: "Calculado automáticamente según las tareas completadas",
    progressSaved: "Progreso actualizado",
    progressError: "Error al actualizar el progreso",
    statusSaved: "Estado actualizado",
    statusError: "Error al actualizar el estado",
    tags: {
      title: "Etiquetas",
      placeholder: "Etiqueta…",
      add: "Añadir etiqueta",
      remove: "Quitar etiqueta",
      added: "Etiqueta añadida",
      addError: "Error al añadir la etiqueta",
      removed: "Etiqueta eliminada",
      removeError: "Error al eliminar la etiqueta"
    },
    planning: {
      title: "Planificación",
      notPlanned: "Ninguna tarea planificada",
      openPlanning: "Abrir planificación",
      start: "Inicio",
      end: "Fin",
      noEventHint: "Añada una tarea con fecha para crear un evento en la planificación."
    },
    form: {
      title: "Formulario",
      creator: "Creador",
      purchaseOrder: "Pedido de compra",
      commercial: "Comercial",
      projectManager: "Jefe de proyecto",
      empty: "Sin datos de formulario"
    },
    searchRequester: "Buscar un agente…",
    noRequesterFound: "Ningún agente encontrado",
    searchClient: "Buscar una empresa…",
    noClientFound: "Ninguna empresa encontrada",
    meta: {
      title: "Propiedades",
      client: "Empresa",
      contact: "Contacto",
      assignees: "Asignado",
      followers: "Seguidor",
      status: "Estado",
      none: "—",
      updateError: "Error al actualizar",
      requesterSaved: "Solicitante actualizado",
      clientSaved: "Empresa actualizada",
      typeSaved: "Tipo actualizado",
      categorySaved: "Categoría actualizada",
      prioritySaved: "Prioridad actualizada"
    },
    team: {
      title: "Equipo",
      addAssignee: "Añadir asignado",
      addFollower: "Añadir seguidor",
      removeAssignee: "Quitar asignado",
      removeFollower: "Quitar seguidor",
      searchAgent: "Buscar un agente…",
      noAgentFound: "Ningún agente encontrado",
      noAssignee: "Sin asignar",
      noFollower: "Sin seguidor",
      error: "No se pudo actualizar el equipo"
    },
    tasks: {
      title: "Tareas",
      empty: "Todavía no hay tareas",
      label: "Título",
      placeholder: "Título de la tarea…",
      add: "Añadir tarea",
      edit: "Editar tarea",
      save: "Guardar",
      cancel: "Cancelar",
      remove: "Eliminar tarea",
      removeConfirmTitle: "¿Eliminar la tarea?",
      removeConfirmMessage: "¿Seguro que quieres eliminar « {label} »? Esta acción no se puede deshacer.",
      removeConfirmMessageFallback: "¿Seguro que quieres eliminar esta tarea? Esta acción no se puede deshacer.",
      removeConfirm: "Eliminar",
      saving: "Guardando…",
      saveError: "Error al guardar las tareas",
      assignee: "Asignado",
      assigneeNone: "Sin asignar",
      start: "Inicio",
      end: "Fin",
      range: "Rango de fechas",
      rangeJoiner: "→",
      startRequired: "La fecha de inicio es obligatoria (evento de planning).",
      eventType: "Tipo de evento",
      eventTypeRequired: "El tipo de evento es obligatorio.",
      eventTypeRequiredShort: "Tipo obligatorio",
      planningSyncError: "No se pudo sincronizar la tarea con el planning.",
      planningLinkedHint: "Cada tarea crea o actualiza un evento en el planning.",
      markDone: "Marcar como hecha",
      markTodo: "Marcar como pendiente",
      modal: {
        eyebrow: "Tareas",
        createSubtitle: "Planifica una tarea vinculada a esta solicitud.",
        editSubtitle: "Edita la tarea y su evento de planning.",
        sectionsAria: "Secciones del formulario de tarea",
        footerUntitled: "Sin título",
        generalTitle: "General",
        generalDesc: "Tipo de evento y título de la tarea.",
        scheduleTitle: "Planning",
        scheduleDesc: "Franja sincronizada con el planning.",
        assigneeTitle: "Asignación",
        assigneeDesc: "Agente responsable de la tarea.",
        sections: {
          general: { label: "General", description: "Tipo y título" },
          schedule: { label: "Planning", description: "Fechas" },
          assignee: { label: "Asignado", description: "Responsable" }
        }
      }
    },
    chat: {
      title: "Feed del proyecto",
      public: "Público",
      attach: "Adjuntar / imagen",
      removeFile: "Quitar archivo",
      fileTooLarge: "Archivo demasiado grande (máx. 15 MB)",
      attachment: "Adjunto",
      attachmentOnlyFallback: "Adjunto(s)",
      unknownAuthor: "Usuario"
    },
    centerTabs: {
      aria: "Contenido de la solicitud",
      chat: "Discusión",
      tasks: "Tareas",
      form: "Formulario"
    },
    report: {
      title: "Informe de intervención",
      hint: "Cree el informe de intervención de esta prestación desde el módulo Informes.",
      cta: "Crear informe"
    },
    delivery: {
      title: "Hitos",
      plan: "Intervención planificada",
      tasks: "Tareas completadas",
      progress: "Progreso al 100%",
      close: "Solicitud cerrada"
    },
    taskStats: {
      title: "Estadísticas de tareas",
      toggleTitle: "Estadísticas de tareas",
      toggleAria: "Mostrar estadísticas de tareas",
      empty: "No hay tareas para calcular estadísticas.",
      hoursHint: "Las horas se calculan a partir de los rangos inicio → fin de las tareas.",
      hoursPlanned: "Horas planificadas",
      hoursDone: "Horas completadas",
      hoursRemaining: "Horas restantes",
      progress: "Progreso",
      done: "Completadas",
      todo: "Pendientes",
      overdue: "Atrasadas",
      unassigned: "Sin asignar",
      unscheduled: "Sin rango",
      byAssignee: "Por asignado",
      noAssignee: "Sin asignar",
      tasksCount: "{done}/{total} tareas"
    },
    formatDuration: {
      lessThanOneMin: "< 1 min",
      daysHours: "{days} d {hours} h",
      daysOnly: "{days} d",
      hoursMinutes: "{hours} h {minutes} min",
      hoursOnly: "{hours} h",
      minutesOnly: "{minutes} min"
    },
    comments: {
      title: "Comentarios",
      empty: "Sin comentarios",
      placeholder: "Escribir un mensaje… (imágenes y archivos aceptados)",
      submit: "Enviar",
      submitting: "Enviando…",
      added: "Mensaje añadido",
      error: "Error al añadir el mensaje",
      internal: "Privado"
    }
  }
};

export function getTicketSalesDetailCopy(locale) {
  const t = pickLocaleMessages(COPY, locale);
  const localeTag = LOCALE_BCP47[locale] || "fr-FR";
  return {
    ...t,
    locale,
    localeTag,
    statusOptions: STATUS_KEYS.map(value => ({
      value,
      label: t.status[value]
    })),
    formatTicketNumber: number => {
      const raw = String(number ?? "").trim();
      const normalized = raw.replace(/^#/, "");
      return interpolate(t.ticketNumber, { number: normalized || "-" });
    },
    formatDateTime: value => {
      if (!value) return t.meta.none;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return t.meta.none;
      return d.toLocaleString(localeTag, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    },
    formatDurationMs: ms => {
      if (ms == null || Number.isNaN(ms) || ms < 0) return t.meta.none;
      if (ms === 0) return interpolate(t.formatDuration.hoursOnly, { hours: "0" });
      if (ms < 60000) return t.formatDuration.lessThanOneMin;
      const totalMinutes = Math.floor(ms / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) {
        return hours > 0
          ? interpolate(t.formatDuration.daysHours, { days: String(days), hours: String(hours) })
          : interpolate(t.formatDuration.daysOnly, { days: String(days) });
      }
      if (hours > 0) {
        return minutes > 0
          ? interpolate(t.formatDuration.hoursMinutes, { hours: String(hours), minutes: String(minutes) })
          : interpolate(t.formatDuration.hoursOnly, { hours: String(hours) });
      }
      return interpolate(t.formatDuration.minutesOnly, { minutes: String(minutes) });
    }
  };
}

export { interpolate };
