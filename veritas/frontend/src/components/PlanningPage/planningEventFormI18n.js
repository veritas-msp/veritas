import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { PLANNING_EVENT_TYPES } from "./planningEventTypes";
import { getLinkedItemIcon } from "./planningEventFormConfig";
const SECTION_IDS = ["general", "schedule", "description", "objects", "todos"];
const PLANNING_EVENT_FORM_COPY = {
  fr: {
    eyebrow: "Planning",
    createTitle: "Nouvel événement",
    editTitle: "Modifier l'événement",
    createSubtitle: "Planifiez une intervention, une réunion ou un suivi client.",
    editSubtitle: "Mettez à jour le créneau, les agents et les éléments liés.",
    close: "Fermer",
    cancel: "Annuler",
    save: "Enregistrer",
    create: "Créer l'événement",
    saving: "Enregistrement…",
    deleting: "Suppression…",
    delete: "Supprimer",
    requiredHint: "Les champs * sont obligatoires",
    meSuffix: "(Moi)",
    sectionsAria: "Sections du formulaire",
    sections: {
      general: {
        label: "Général",
        description: "Titre, type et client"
      },
      schedule: {
        label: "Dates",
        description: "Créneau et agents"
      },
      description: {
        label: "Description",
        description: "Contexte et détails"
      },
      objects: {
        label: "Objets",
        description: "Équipements liés"
      },
      todos: {
        label: "To-do",
        description: "Liste de tâches"
      }
    },
    fields: {
      eventType: "Type d'événement",
      title: "Titre",
      titlePlaceholder: "Nom de l'événement",
      client: "Client",
      clientSearch: "Rechercher un client…",
      noClient: "Aucun client",
      agents: "Agents",
      agentsPlaceholder: "Sélectionner un ou plusieurs agents",
      agentsRequired: "Sélectionnez au moins un agent.",
      startDate: "Date de début",
      startTime: "Heure de début",
      endDate: "Date de fin",
      endTime: "Heure de fin",
      durationDays: "Durée (jours)",
      durationIncrease: "Augmenter la durée",
      durationDecrease: "Diminuer la durée",
      allDay: "Journée entière",
      businessDaysOnly: "Jours ouvrés uniquement",
      description: "Description",
      descriptionPlaceholder: "Détails supplémentaires sur l'événement…",
      linkedSearch: "Rechercher un objet…",
      linkedFilterAll: "Tous",
      todoPlaceholder: "Ajouter une tâche…",
      todoAdd: "Ajouter",
      noLinkedItems: "Aucun objet disponible pour ce client.",
      loadingLinked: "Chargement des objets…",
      noTodos: "Aucune tâche pour le moment.",
      customColor: "Couleur personnalisée",
      colorLabel: "Couleur {color}",
      editTask: "Modifier",
      removeTask: "Supprimer",
      clickToEdit: "Cliquer pour modifier",
      clientNotFound: "Aucun client trouvé",
      assigneeSearch: "Rechercher un agent…",
      allDayLabel: "Journée complète",
      descriptionRichPlaceholder: "Contexte, objectifs, points d'attention…",
      selectClientFirst: "Sélectionnez d'abord un client pour lier des objets.",
      loadingLinkedItems: "Chargement des objets liés…",
      linkedSearchExtended: "Rechercher un objet (nom, type, groupe)…",
      noLinkedFilterMatch: "Aucun objet ne correspond aux filtres.",
      todoColorNew: "Couleur de la nouvelle tâche",
      todoColorTask: "Couleur de la tâche « {text} »",
      todoEmptyHelp: "Aucune tâche pour le moment. Saisissez un libellé ci-dessus puis cliquez sur Ajouter.",
      moveTask: "Déplacer la tâche « {text} »",
      dragReorder: "Glisser-déposer pour réordonner",
      markTask: "Marquer la tâche « {text} »",
      editTaskLabel: "Modifier le libellé de la tâche",
      editTaskNamed: "Modifier la tâche « {text} »",
      deleteTaskNamed: "Supprimer la tâche « {text} »"
    },
    eventTypes: {
      intervention: "Intervention",
      presentation: "Présentation",
      maintenance_preventive: "Préventive",
      maintenance: "Maintenance",
      mise_a_jour: "Mise à jour",
      conge: "Congé",
      integration_monitoring: "Monitoring",
      campagne: "Campagne",
      other: "Autre"
    },
    linkedTypes: {
      all: "Tous",
      tenant: "Tenant",
      domain: "Nom de domaine",
      backup: "Sauvegardes",
      wifi: "Borne wifi",
      camera: "Caméra de sécurité"
    },
    toasts: {
      titleRequired: "Le titre est requis",
      assigneeRequired: "Au moins une personne doit être affectée",
      datesRequired: "Les dates de début et de fin sont requises",
      invalidDates: "Dates ou horaires invalides",
      endBeforeStart: "La date de fin doit être après la date de début",
      created: "Événement créé avec succès",
      updated: "Événement mis à jour avec succès",
      saveError: "Erreur lors de l'enregistrement de l'événement",
      createError: "Erreur lors de la création de l'événement",
      updateError: "Erreur lors de la mise à jour de l'événement"
    },
    deleteEvent: {
      confirm: "Êtes-vous sûr de vouloir supprimer cet événement ?",
      success: "Événement supprimé avec succès",
      error: "Erreur lors de la suppression de l'événement"
    }
  },
  en: {
    eyebrow: "Planning",
    createTitle: "New event",
    editTitle: "Edit event",
    createSubtitle: "Schedule an intervention, meeting, or client follow-up.",
    editSubtitle: "Update the slot, assignees, and linked items.",
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    create: "Create event",
    saving: "Saving…",
    deleting: "Deleting…",
    delete: "Delete",
    requiredHint: "Fields marked * are required",
    meSuffix: "(Me)",
    sectionsAria: "Form sections",
    sections: {
      general: {
        label: "General",
        description: "Title, type, and client"
      },
      schedule: {
        label: "Schedule",
        description: "Slot and assignees"
      },
      description: {
        label: "Description",
        description: "Context and details"
      },
      objects: {
        label: "Objects",
        description: "Linked equipment"
      },
      todos: {
        label: "To-do",
        description: "Task list"
      }
    },
    fields: {
      eventType: "Event type",
      title: "Title",
      titlePlaceholder: "Event name",
      client: "Client",
      clientSearch: "Search for a client…",
      noClient: "No client",
      agents: "Assignees",
      agentsPlaceholder: "Select one or more assignees",
      agentsRequired: "Select at least one assignee.",
      startDate: "Start date",
      startTime: "Start time",
      endDate: "End date",
      endTime: "End time",
      durationDays: "Duration (days)",
      durationIncrease: "Increase duration",
      durationDecrease: "Decrease duration",
      allDay: "All day",
      businessDaysOnly: "Business days only",
      description: "Description",
      descriptionPlaceholder: "Additional details about the event…",
      linkedSearch: "Search for an item…",
      linkedFilterAll: "All",
      todoPlaceholder: "Add a task…",
      todoAdd: "Add",
      noLinkedItems: "No items available for this client.",
      loadingLinked: "Loading items…",
      noTodos: "No tasks yet.",
      customColor: "Custom color",
      colorLabel: "Color {color}",
      editTask: "Edit",
      removeTask: "Delete",
      clickToEdit: "Click to edit",
      clientNotFound: "No client found",
      assigneeSearch: "Search for an assignee…",
      allDayLabel: "All day",
      descriptionRichPlaceholder: "Context, objectives, key points…",
      selectClientFirst: "Select a client first to link items.",
      loadingLinkedItems: "Loading linked items…",
      linkedSearchExtended: "Search for an item (name, type, group)…",
      noLinkedFilterMatch: "No items match the filters.",
      todoColorNew: "New task color",
      todoColorTask: "Color for task « {text} »",
      todoEmptyHelp: "No tasks yet. Enter a label above and click Add.",
      moveTask: "Move task « {text} »",
      dragReorder: "Drag and drop to reorder",
      markTask: "Mark task « {text} »",
      editTaskLabel: "Edit task label",
      editTaskNamed: "Edit task « {text} »",
      deleteTaskNamed: "Delete task « {text} »"
    },
    eventTypes: {
      intervention: "Intervention",
      presentation: "Presentation",
      maintenance_preventive: "Preventive",
      maintenance: "Maintenance",
      mise_a_jour: "Update",
      conge: "Leave",
      integration_monitoring: "Monitoring",
      campagne: "Campaign",
      other: "Other"
    },
    linkedTypes: {
      all: "All",
      tenant: "Tenant",
      domain: "Domain name",
      backup: "Backups",
      wifi: "Wi-Fi access point",
      camera: "Security camera"
    },
    toasts: {
      titleRequired: "Title is required",
      assigneeRequired: "At least one assignee is required",
      datesRequired: "Start and end dates are required",
      invalidDates: "Invalid dates or times",
      endBeforeStart: "End date must be after start date",
      created: "Event created successfully",
      updated: "Event updated successfully",
      saveError: "Error saving event",
      createError: "Error creating event",
      updateError: "Error updating event"
    },
    deleteEvent: {
      confirm: "Are you sure you want to delete this event?",
      success: "Event deleted successfully",
      error: "Error deleting event"
    }
  },
  de: {
    eyebrow: "Planung",
    createTitle: "Neues Ereignis",
    editTitle: "Ereignis bearbeiten",
    createSubtitle: "Planen Sie einen Einsatz, ein Meeting oder ein Kunden-Follow-up.",
    editSubtitle: "Aktualisieren Sie Slot, Zuständige und verknüpfte Elemente.",
    close: "Schließen",
    cancel: "Abbrechen",
    save: "Speichern",
    create: "Ereignis erstellen",
    saving: "Speichern…",
    deleting: "Löschen…",
    delete: "Löschen",
    requiredHint: "Mit * markierte Felder sind Pflichtfelder",
    meSuffix: "(Ich)",
    sectionsAria: "Formularbereiche",
    sections: {
      general: {
        label: "Allgemein",
        description: "Titel, Typ und Kunde"
      },
      schedule: {
        label: "Termine",
        description: "Slot und Zuständige"
      },
      description: {
        label: "Beschreibung",
        description: "Kontext und Details"
      },
      objects: {
        label: "Objekte",
        description: "Verknüpfte Geräte"
      },
      todos: {
        label: "To-do",
        description: "Aufgabenliste"
      }
    },
    fields: {
      eventType: "Ereignistyp",
      title: "Titel",
      titlePlaceholder: "Ereignisname",
      client: "Kunde",
      clientSearch: "Kunde suchen…",
      noClient: "Kein Kunde",
      agents: "Zuständige",
      agentsPlaceholder: "Einen oder mehrere Zuständige auswählen",
      agentsRequired: "Wählen Sie mindestens einen Zuständigen.",
      startDate: "Startdatum",
      startTime: "Startzeit",
      endDate: "Enddatum",
      endTime: "Endzeit",
      durationDays: "Dauer (Tage)",
      durationIncrease: "Dauer erhöhen",
      durationDecrease: "Dauer verringern",
      allDay: "Ganztägig",
      businessDaysOnly: "Nur Werktage",
      description: "Beschreibung",
      descriptionPlaceholder: "Zusätzliche Details zum Ereignis…",
      linkedSearch: "Objekt suchen…",
      linkedFilterAll: "Alle",
      todoPlaceholder: "Aufgabe hinzufügen…",
      todoAdd: "Hinzufügen",
      noLinkedItems: "Keine Objekte für diesen Kunden verfügbar.",
      loadingLinked: "Objekte werden geladen…",
      noTodos: "Noch keine Aufgaben.",
      customColor: "Benutzerdefinierte Farbe",
      colorLabel: "Farbe {color}",
      editTask: "Bearbeiten",
      removeTask: "Löschen",
      clickToEdit: "Zum Bearbeiten klicken",
      clientNotFound: "Kein Kunde gefunden",
      assigneeSearch: "Zuständigen suchen…",
      allDayLabel: "Ganztägig",
      descriptionRichPlaceholder: "Kontext, Ziele, wichtige Punkte…",
      selectClientFirst: "Wählen Sie zuerst einen Kunden, um Objekte zu verknüpfen.",
      loadingLinkedItems: "Verknüpfte Objekte werden geladen…",
      linkedSearchExtended: "Objekt suchen (Name, Typ, Gruppe)…",
      noLinkedFilterMatch: "Keine Objekte entsprechen den Filtern.",
      todoColorNew: "Farbe der neuen Aufgabe",
      todoColorTask: "Farbe der Aufgabe « {text} »",
      todoEmptyHelp: "Noch keine Aufgaben. Geben Sie oben ein Label ein und klicken Sie auf Hinzufügen.",
      moveTask: "Aufgabe « {text} » verschieben",
      dragReorder: "Zum Sortieren ziehen und ablegen",
      markTask: "Aufgabe « {text} » markieren",
      editTaskLabel: "Aufgabenbezeichnung bearbeiten",
      editTaskNamed: "Aufgabe « {text} » bearbeiten",
      deleteTaskNamed: "Aufgabe « {text} » löschen"
    },
    eventTypes: {
      intervention: "Einsatz",
      presentation: "Präsentation",
      maintenance_preventive: "Präventiv",
      maintenance: "Wartung",
      mise_a_jour: "Update",
      conge: "Urlaub",
      integration_monitoring: "Monitoring",
      campagne: "Kampagne",
      other: "Sonstiges"
    },
    linkedTypes: {
      all: "Alle",
      tenant: "Mandant",
      domain: "Domainname",
      backup: "Backups",
      wifi: "WLAN-Zugangspunkt",
      camera: "Überwachungskamera"
    },
    toasts: {
      titleRequired: "Titel ist erforderlich",
      assigneeRequired: "Mindestens eine zuständige Person ist erforderlich",
      datesRequired: "Start- und Enddatum sind erforderlich",
      invalidDates: "Ungültige Daten oder Zeiten",
      endBeforeStart: "Das Enddatum muss nach dem Startdatum liegen",
      created: "Ereignis erfolgreich erstellt",
      updated: "Ereignis erfolgreich aktualisiert",
      saveError: "Fehler beim Speichern des Ereignisses",
      createError: "Fehler beim Erstellen des Ereignisses",
      updateError: "Fehler beim Aktualisieren des Ereignisses"
    },
    deleteEvent: {
      confirm: "Möchten Sie dieses Ereignis wirklich löschen?",
      success: "Ereignis erfolgreich gelöscht",
      error: "Fehler beim Löschen des Ereignisses"
    }
  },
  it: {
    eyebrow: "Pianificazione",
    createTitle: "Nuovo evento",
    editTitle: "Modifica evento",
    createSubtitle: "Pianifica un intervento, una riunione o un follow-up cliente.",
    editSubtitle: "Aggiorna slot, agenti ed elementi collegati.",
    close: "Chiudi",
    cancel: "Annulla",
    save: "Salva",
    create: "Crea evento",
    saving: "Salvataggio…",
    deleting: "Eliminazione…",
    delete: "Elimina",
    requiredHint: "I campi * sono obbligatori",
    meSuffix: "(Io)",
    sectionsAria: "Sezioni del modulo",
    sections: {
      general: {
        label: "Generale",
        description: "Titolo, tipo e cliente"
      },
      schedule: {
        label: "Date",
        description: "Slot e agenti"
      },
      description: {
        label: "Descrizione",
        description: "Contesto e dettagli"
      },
      objects: {
        label: "Oggetti",
        description: "Apparecchiature collegate"
      },
      todos: {
        label: "To-do",
        description: "Elenco attività"
      }
    },
    fields: {
      eventType: "Tipo di evento",
      title: "Titolo",
      titlePlaceholder: "Nome dell'evento",
      client: "Cliente",
      clientSearch: "Cerca un cliente…",
      noClient: "Nessun cliente",
      agents: "Agenti",
      agentsPlaceholder: "Seleziona uno o più agenti",
      agentsRequired: "Seleziona almeno un agente.",
      startDate: "Data di inizio",
      startTime: "Ora di inizio",
      endDate: "Data di fine",
      endTime: "Ora di fine",
      durationDays: "Durata (giorni)",
      durationIncrease: "Aumenta la durata",
      durationDecrease: "Diminuisci la durata",
      allDay: "Tutto il giorno",
      businessDaysOnly: "Solo giorni lavorativi",
      description: "Descrizione",
      descriptionPlaceholder: "Dettagli aggiuntivi sull'evento…",
      linkedSearch: "Cerca un oggetto…",
      linkedFilterAll: "Tutti",
      todoPlaceholder: "Aggiungi un'attività…",
      todoAdd: "Aggiungi",
      noLinkedItems: "Nessun oggetto disponibile per questo cliente.",
      loadingLinked: "Caricamento oggetti…",
      noTodos: "Nessuna attività al momento.",
      customColor: "Colore personalizzato",
      colorLabel: "Colore {color}",
      editTask: "Modifica",
      removeTask: "Elimina",
      clickToEdit: "Clicca per modificare",
      clientNotFound: "Nessun cliente trovato",
      assigneeSearch: "Cerca un agente…",
      allDayLabel: "Tutto il giorno",
      descriptionRichPlaceholder: "Contesto, obiettivi, punti chiave…",
      selectClientFirst: "Seleziona prima un cliente per collegare oggetti.",
      loadingLinkedItems: "Caricamento oggetti collegati…",
      linkedSearchExtended: "Cerca un oggetto (nome, tipo, gruppo)…",
      noLinkedFilterMatch: "Nessun oggetto corrisponde ai filtri.",
      todoColorNew: "Colore della nuova attività",
      todoColorTask: "Colore dell'attività « {text} »",
      todoEmptyHelp: "Nessuna attività al momento. Inserisci un'etichetta sopra e clicca Aggiungi.",
      moveTask: "Sposta attività « {text} »",
      dragReorder: "Trascina per riordinare",
      markTask: "Segna attività « {text} »",
      editTaskLabel: "Modifica etichetta attività",
      editTaskNamed: "Modifica attività « {text} »",
      deleteTaskNamed: "Elimina attività « {text} »"
    },
    eventTypes: {
      intervention: "Intervento",
      presentation: "Presentazione",
      maintenance_preventive: "Preventiva",
      maintenance: "Manutenzione",
      mise_a_jour: "Aggiornamento",
      conge: "Congedo",
      integration_monitoring: "Monitoraggio",
      campagne: "Campagna",
      other: "Altro"
    },
    linkedTypes: {
      all: "Tutti",
      tenant: "Tenant",
      domain: "Nome di dominio",
      backup: "Backup",
      wifi: "Punto Wi-Fi",
      camera: "Telecamera di sicurezza"
    },
    toasts: {
      titleRequired: "Il titolo è obbligatorio",
      assigneeRequired: "È necessario assegnare almeno una persona",
      datesRequired: "Le date di inizio e fine sono obbligatorie",
      invalidDates: "Date o orari non validi",
      endBeforeStart: "La data di fine deve essere successiva alla data di inizio",
      created: "Evento creato con successo",
      updated: "Evento aggiornato con successo",
      saveError: "Errore durante il salvataggio dell'evento",
      createError: "Errore durante la creazione dell'evento",
      updateError: "Errore durante l'aggiornamento dell'evento"
    },
    deleteEvent: {
      confirm: "Eliminare questo evento?",
      success: "Evento eliminato con successo",
      error: "Errore durante l'eliminazione dell'evento"
    }
  },
  es: {
    eyebrow: "Planificación",
    createTitle: "Nuevo evento",
    editTitle: "Modificar evento",
    createSubtitle: "Planifique una intervención, reunión o seguimiento de cliente.",
    editSubtitle: "Actualice el horario, los agentes y los elementos vinculados.",
    close: "Cerrar",
    cancel: "Cancelar",
    save: "Guardar",
    create: "Crear evento",
    saving: "Guardando…",
    deleting: "Eliminando…",
    delete: "Eliminar",
    requiredHint: "Los campos * son obligatorios",
    meSuffix: "(Yo)",
    sectionsAria: "Secciones del formulario",
    sections: {
      general: {
        label: "General",
        description: "Título, tipo y cliente"
      },
      schedule: {
        label: "Fechas",
        description: "Horario y agentes"
      },
      description: {
        label: "Descripción",
        description: "Contexto y detalles"
      },
      objects: {
        label: "Objetos",
        description: "Equipos vinculados"
      },
      todos: {
        label: "To-do",
        description: "Lista de tareas"
      }
    },
    fields: {
      eventType: "Tipo de evento",
      title: "Título",
      titlePlaceholder: "Nombre del evento",
      client: "Cliente",
      clientSearch: "Buscar un cliente…",
      noClient: "Ningún cliente",
      agents: "Agentes",
      agentsPlaceholder: "Seleccionar uno o más agentes",
      agentsRequired: "Seleccione al menos un agente.",
      startDate: "Fecha de inicio",
      startTime: "Hora de inicio",
      endDate: "Fecha de fin",
      endTime: "Hora de fin",
      durationDays: "Duración (días)",
      durationIncrease: "Aumentar duración",
      durationDecrease: "Disminuir duración",
      allDay: "Todo el día",
      businessDaysOnly: "Solo días laborables",
      description: "Descripción",
      descriptionPlaceholder: "Detalles adicionales sobre el evento…",
      linkedSearch: "Buscar un objeto…",
      linkedFilterAll: "Todos",
      todoPlaceholder: "Añadir una tarea…",
      todoAdd: "Añadir",
      noLinkedItems: "No hay objetos disponibles para este cliente.",
      loadingLinked: "Cargando objetos…",
      noTodos: "Ninguna tarea por el momento.",
      customColor: "Color personalizado",
      colorLabel: "Color {color}",
      editTask: "Editar",
      removeTask: "Eliminar",
      clickToEdit: "Clic para editar",
      clientNotFound: "Ningún cliente encontrado",
      assigneeSearch: "Buscar un agente…",
      allDayLabel: "Todo el día",
      descriptionRichPlaceholder: "Contexto, objetivos, puntos clave…",
      selectClientFirst: "Seleccione primero un cliente para vincular objetos.",
      loadingLinkedItems: "Cargando objetos vinculados…",
      linkedSearchExtended: "Buscar un objeto (nombre, tipo, grupo)…",
      noLinkedFilterMatch: "Ningún objeto coincide con los filtros.",
      todoColorNew: "Color de la nueva tarea",
      todoColorTask: "Color de la tarea « {text} »",
      todoEmptyHelp: "Ninguna tarea por el momento. Escriba una etiqueta arriba y haga clic en Añadir.",
      moveTask: "Mover tarea « {text} »",
      dragReorder: "Arrastrar para reordenar",
      markTask: "Marcar tarea « {text} »",
      editTaskLabel: "Editar etiqueta de la tarea",
      editTaskNamed: "Editar tarea « {text} »",
      deleteTaskNamed: "Eliminar tarea « {text} »"
    },
    eventTypes: {
      intervention: "Intervención",
      presentation: "Presentación",
      maintenance_preventive: "Preventivo",
      maintenance: "Mantenimiento",
      mise_a_jour: "Actualización",
      conge: "Permiso",
      integration_monitoring: "Supervisión",
      campagne: "Campaña",
      other: "Otro"
    },
    linkedTypes: {
      all: "Todos",
      tenant: "Tenant",
      domain: "Nombre de dominio",
      backup: "Copias de seguridad",
      wifi: "Punto Wi-Fi",
      camera: "Cámara de seguridad"
    },
    toasts: {
      titleRequired: "El título es obligatorio",
      assigneeRequired: "Debe asignarse al menos una persona",
      datesRequired: "Las fechas de inicio y fin son obligatorias",
      invalidDates: "Fechas u horas no válidas",
      endBeforeStart: "La fecha de fin debe ser posterior a la de inicio",
      created: "Evento creado correctamente",
      updated: "Evento actualizado correctamente",
      saveError: "Error al guardar el evento",
      createError: "Error al crear el evento",
      updateError: "Error al actualizar el evento"
    },
    deleteEvent: {
      confirm: "¿Eliminar este evento?",
      success: "Evento eliminado correctamente",
      error: "Error al eliminar el evento"
    }
  }
};
function getLinkedTypeLabel(type, copy) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("office365")) return copy.linkedTypes.tenant;
  if (normalized.includes("ndd")) return copy.linkedTypes.domain;
  if (normalized.includes("sauveg")) return copy.linkedTypes.backup;
  if (normalized.includes("borne") || normalized.includes("wifi")) return copy.linkedTypes.wifi;
  if (normalized.includes("camera") || normalized.includes("cam")) return copy.linkedTypes.camera;
  return type;
}
export function getPlanningEventFormCopy(locale, catalogTypes = null) {
  const t = pickLocaleMessages(PLANNING_EVENT_FORM_COPY, locale);
  const baseTypes = Array.isArray(catalogTypes) && catalogTypes.length > 0 ? catalogTypes : PLANNING_EVENT_TYPES;
  return {
    ...t,
    locale,
    sections: SECTION_IDS.map(id => ({
      id,
      label: t.sections[id].label,
      description: t.sections[id].description,
      icon: id === "general" ? "mdi:calendar-text-outline" : id === "schedule" ? "mdi:clock-outline" : id === "description" ? "mdi:text-box-outline" : id === "objects" ? "mdi:cube-outline" : "mdi:format-list-checks"
    })),
    planningTypes: baseTypes.map(type => ({
      ...type,
      label: type.label || t.eventTypes[type.value] || type.value
    })),
    getLinkedTypeLabel: type => getLinkedTypeLabel(type, t),
    formatColorLabel: color => interpolate(t.fields.colorLabel, {
      color
    }),
    linkedTypeButtons: linkedTypeOptions => [{
      key: "all",
      label: t.linkedTypes.all,
      icon: "mdi:view-grid-outline"
    }, ...linkedTypeOptions.map(type => ({
      key: type,
      label: getLinkedTypeLabel(type, t),
      icon: getLinkedItemIcon({
        type
      })
    }))]
  };
}
