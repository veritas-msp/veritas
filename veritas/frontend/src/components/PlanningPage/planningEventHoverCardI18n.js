import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const HOVER_CARD = {
  fr: {
    eventTypes: {
      intervention: "Intervention",
      presentation: "Présentation",
      maintenance_preventive: "Maintenance préventive",
      maintenance: "Maintenance",
      mise_a_jour: "Mise à jour",
      conge: "Congé",
      integration_monitoring: "Monitoring",
      campagne: "Campagne cybersécurité",
      other: "Autre"
    },
    campaignStatus: {
      active: "Active",
      inactive: "Terminée",
      draft: "Brouillon",
      planned: "Planifiée"
    },
    campaignTypes: {
      microsoft_security: "Microsoft Security",
      phishing: "Phishing",
      awareness: "Sensibilisation"
    },
    labels: {
      date: "Date",
      dates: "Dates",
      client: "Client",
      agent: "Agent",
      creation: "Création",
      updated: "Modification",
      description: "Description",
      equipment: "Équipement",
      service: "Service",
      linkedObjects: "Objets liés ({count})",
      mainObject: "Objet principal",
      createdBy: "Créé par",
      reference: "Référence",
      ticket: "Ticket",
      openTicket: "Ouvrir le ticket",
      campaignStatus: "Statut campagne",
      campaignType: "Type campagne",
      progress: "Progression",
      todos: "To-do ({done}/{total})",
      notes: "Notes ({count})"
    },
    schedule: {
      allDay: "Journée complète",
      businessDaysOnly: "Jours ouvrables uniquement",
      durationDays: "{count} jour(s)"
    },
    assignee: {
      change: "Changer l'agent assigné",
      choose: "Choisir…",
      search: "Rechercher…",
      typeToSearch: "Saisissez un caractère pour rechercher",
      noAgentFound: "Aucun agent trouvé"
    },
    footer: {
      close: "Fermer",
      edit: "Modifier",
      viewCampaign: "Voir la campagne"
    },
    defaults: {
      event: "Événement",
      reminder: "Rappel",
      user: "Utilisateur"
    },
    weekView: {
      resizeStart: "Modifier le début",
      resizeEnd: "Modifier la fin"
    }
  },
  en: {
    eventTypes: {
      intervention: "Intervention",
      presentation: "Presentation",
      maintenance_preventive: "Preventive maintenance",
      maintenance: "Maintenance",
      mise_a_jour: "Update",
      conge: "Leave",
      integration_monitoring: "Monitoring",
      campagne: "Cybersecurity campaign",
      other: "Other"
    },
    campaignStatus: {
      active: "Active",
      inactive: "Completed",
      draft: "Draft",
      planned: "Planned"
    },
    campaignTypes: {
      microsoft_security: "Microsoft Security",
      phishing: "Phishing",
      awareness: "Awareness"
    },
    labels: {
      date: "Date",
      dates: "Dates",
      client: "Client",
      agent: "Assignee",
      creation: "Created",
      updated: "Updated",
      description: "Description",
      equipment: "Equipment",
      service: "Service",
      linkedObjects: "Linked items ({count})",
      mainObject: "Primary item",
      createdBy: "Created by",
      reference: "Reference",
      ticket: "Ticket",
      openTicket: "Open ticket",
      campaignStatus: "Campaign status",
      campaignType: "Campaign type",
      progress: "Progress",
      todos: "To-do ({done}/{total})",
      notes: "Notes ({count})"
    },
    schedule: {
      allDay: "All day",
      businessDaysOnly: "Business days only",
      durationDays: "{count} day(s)"
    },
    assignee: {
      change: "Change assignee",
      choose: "Choose…",
      search: "Search…",
      typeToSearch: "Type a character to search",
      noAgentFound: "No assignee found"
    },
    footer: {
      close: "Close",
      edit: "Edit",
      viewCampaign: "View campaign"
    },
    defaults: {
      event: "Event",
      reminder: "Reminder",
      user: "User"
    },
    weekView: {
      resizeStart: "Adjust start",
      resizeEnd: "Adjust end"
    }
  },
  de: {
    eventTypes: {
      intervention: "Eingriff",
      presentation: "Präsentation",
      maintenance_preventive: "Vorbeugende Wartung",
      maintenance: "Wartung",
      mise_a_jour: "Aktualisierung",
      conge: "Urlaub",
      integration_monitoring: "Überwachung",
      campagne: "Cybersicherheitskampagne",
      other: "Sonstiges"
    },
    campaignStatus: {
      active: "Aktiv",
      inactive: "Abgeschlossen",
      draft: "Entwurf",
      planned: "Geplant"
    },
    campaignTypes: {
      microsoft_security: "Microsoft Security",
      phishing: "Phishing",
      awareness: "Sensibilisierung"
    },
    labels: {
      date: "Datum",
      dates: "Daten",
      client: "Kunde",
      agent: "Mitarbeiter",
      creation: "Erstellt",
      updated: "Aktualisiert",
      description: "Beschreibung",
      equipment: "Gerät",
      service: "Dienst",
      linkedObjects: "Verknüpfte Objekte ({count})",
      mainObject: "Hauptobjekt",
      createdBy: "Erstellt von",
      reference: "Referenz",
      ticket: "Ticket",
      openTicket: "Ticket öffnen",
      campaignStatus: "Kampagnenstatus",
      campaignType: "Kampagnentyp",
      progress: "Fortschritt",
      todos: "Aufgaben ({done}/{total})",
      notes: "Notizen ({count})"
    },
    schedule: {
      allDay: "Ganztägig",
      businessDaysOnly: "Nur Werktage",
      durationDays: "{count} Tag(e)"
    },
    assignee: {
      change: "Zugewiesenen Mitarbeiter ändern",
      choose: "Auswählen…",
      search: "Suchen…",
      typeToSearch: "Geben Sie ein Zeichen ein, um zu suchen",
      noAgentFound: "Kein Mitarbeiter gefunden"
    },
    footer: {
      close: "Schließen",
      edit: "Bearbeiten",
      viewCampaign: "Kampagne anzeigen"
    },
    defaults: {
      event: "Ereignis",
      reminder: "Erinnerung",
      user: "Benutzer"
    },
    weekView: {
      resizeStart: "Beginn anpassen",
      resizeEnd: "Ende anpassen"
    }
  },
  it: {
    eventTypes: {
      intervention: "Intervento",
      presentation: "Presentazione",
      maintenance_preventive: "Manutenzione preventiva",
      maintenance: "Manutenzione",
      mise_a_jour: "Aggiornamento",
      conge: "Permesso",
      integration_monitoring: "Monitoraggio",
      campagne: "Campagna cybersicurezza",
      other: "Altro"
    },
    campaignStatus: {
      active: "Attiva",
      inactive: "Completata",
      draft: "Bozza",
      planned: "Pianificata"
    },
    campaignTypes: {
      microsoft_security: "Microsoft Security",
      phishing: "Phishing",
      awareness: "Sensibilizzazione"
    },
    labels: {
      date: "Data",
      dates: "Date",
      client: "Cliente",
      agent: "Agente",
      creation: "Creazione",
      updated: "Modifica",
      description: "Descrizione",
      equipment: "Apparecchiatura",
      service: "Servizio",
      linkedObjects: "Oggetti collegati ({count})",
      mainObject: "Oggetto principale",
      createdBy: "Creato da",
      reference: "Riferimento",
      ticket: "Ticket",
      openTicket: "Apri ticket",
      campaignStatus: "Stato campagna",
      campaignType: "Tipo campagna",
      progress: "Avanzamento",
      todos: "Attività ({done}/{total})",
      notes: "Note ({count})"
    },
    schedule: {
      allDay: "Giornata intera",
      businessDaysOnly: "Solo giorni lavorativi",
      durationDays: "{count} giorno/i"
    },
    assignee: {
      change: "Cambia agente assegnato",
      choose: "Scegli…",
      search: "Cerca…",
      typeToSearch: "Digita un carattere per cercare",
      noAgentFound: "Nessun agente trovato"
    },
    footer: {
      close: "Chiudi",
      edit: "Modifica",
      viewCampaign: "Vedi campagna"
    },
    defaults: {
      event: "Evento",
      reminder: "Promemoria",
      user: "Utente"
    },
    weekView: {
      resizeStart: "Modifica inizio",
      resizeEnd: "Modifica fine"
    }
  },
  es: {
    eventTypes: {
      intervention: "Intervención",
      presentation: "Presentación",
      maintenance_preventive: "Mantenimiento preventivo",
      maintenance: "Mantenimiento",
      mise_a_jour: "Actualización",
      conge: "Permiso",
      integration_monitoring: "Supervisión",
      campagne: "Campaña de ciberseguridad",
      other: "Otro"
    },
    campaignStatus: {
      active: "Activa",
      inactive: "Finalizada",
      draft: "Borrador",
      planned: "Planificada"
    },
    campaignTypes: {
      microsoft_security: "Microsoft Security",
      phishing: "Phishing",
      awareness: "Concienciación"
    },
    labels: {
      date: "Fecha",
      dates: "Fechas",
      client: "Cliente",
      agent: "Agente",
      creation: "Creación",
      updated: "Modificación",
      description: "Descripción",
      equipment: "Equipo",
      service: "Servicio",
      linkedObjects: "Objetos vinculados ({count})",
      mainObject: "Objeto principal",
      createdBy: "Creado por",
      reference: "Referencia",
      ticket: "Ticket",
      openTicket: "Abrir ticket",
      campaignStatus: "Estado de campaña",
      campaignType: "Tipo de campaña",
      progress: "Progreso",
      todos: "Tareas ({done}/{total})",
      notes: "Notas ({count})"
    },
    schedule: {
      allDay: "Todo el día",
      businessDaysOnly: "Solo días laborables",
      durationDays: "{count} día(s)"
    },
    assignee: {
      change: "Cambiar agente asignado",
      choose: "Elegir…",
      search: "Buscar…",
      typeToSearch: "Escriba un carácter para buscar",
      noAgentFound: "Ningún agente encontrado"
    },
    footer: {
      close: "Cerrar",
      edit: "Editar",
      viewCampaign: "Ver campaña"
    },
    defaults: {
      event: "Evento",
      reminder: "Recordatorio",
      user: "Usuario"
    },
    weekView: {
      resizeStart: "Ajustar inicio",
      resizeEnd: "Ajustar fin"
    }
  }
};
export function getPlanningEventHoverCardCopy(locale) {
  const t = pickLocaleMessages(HOVER_CARD, locale);
  return {
    ...t,
    locale,
    getEventTypeLabel: key => t.eventTypes[key] || key,
    getCampaignStatusLabel: status => t.campaignStatus[status] || status,
    getCampaignTypeLabel: type => t.campaignTypes[type] || type,
    formatLinkedObjects: count => interpolate(t.labels.linkedObjects, {
      count
    }),
    formatTodos: (done, total) => interpolate(t.labels.todos, {
      done,
      total
    }),
    formatNotes: count => interpolate(t.labels.notes, {
      count
    }),
    formatDurationDays: count => interpolate(t.schedule.durationDays, {
      count
    })
  };
}
