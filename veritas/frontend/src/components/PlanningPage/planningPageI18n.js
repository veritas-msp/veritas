import { createLocaleGetter, interpolate, pickLocaleMessages } from "../../i18n/translate";
import { PLANNING_EVENT_TYPES } from "./planningEventTypes";
import moment from "moment";
const PLANNING_PAGE = {
  fr: {
    eyebrow: "Organisation",
    title: "Planning",
    loading: "Chargement du planning…",
    eventsSubtitle: "{displayed} événement{displayedPlural} affiché{displayedPlural} sur {total}",
    newEvent: "Nouvel événement",
    defaults: {
      event: "Événement",
      user: "Utilisateur",
      client: "Client",
      agent: "Agent",
      team: "Équipe",
      noName: "Sans nom",
      cyberCampaign: "Campagne cybersécurité"
    },
    kpi: {
      total: "Total"
    },
    toolbar: {
      prevPeriod: "Période précédente",
      nextPeriod: "Période suivante",
      timezoneTooltip: "Fuseau horaire de référence : {timezone}",
      today: "Aujourd'hui",
      monthsCount: "{n} mois",
      week: "Semaine",
      day: "Jour",
      agenda: "Agenda",
      weekLabel: "Semaine {week} · {monthYear}"
    },
    calendar: {
      next: "Suivant",
      previous: "Précédent",
      today: "Aujourd'hui",
      month: "Mois",
      week: "Semaine",
      day: "Jour",
      agenda: "Agenda",
      date: "Date",
      time: "Heure",
      event: "Événement",
      noEventsInRange: "Aucun événement dans cette période"
    },
    filters: {
      aria: "Filtres planning",
      agents: "Agents",
      clients: "Clients",
      all: "Tous",
      none: "Aucun",
      clear: "Effacer",
      agent: "Agent",
      team: "Équipe",
      searchTeam: "Rechercher une équipe…",
      searchAgent: "Rechercher un agent…",
      noAgentFound: "Aucun agent trouvé.",
      allAgentsPinned: "Tous les agents sont déjà dans la liste.",
      loadingTeams: "Chargement des équipes…",
      noTeamFound: "Aucune équipe trouvée.",
      noActiveTeams: "Aucune équipe active configurée dans l'administration.",
      teamMemberCount: "{count} agent{plural}",
      addAgentsHint: "Ajoutez une équipe ou des agents pour filtrer le planning.",
      agentsSelected: "{count} agents sélectionnés · planning combiné",
      showAgentPlanning: "Afficher le planning de {name}",
      hideAgentPlanning: "Masquer le planning de {name}",
      showTeamPlanning: "Afficher le planning de l'équipe {name}",
      hideTeamPlanning: "Masquer le planning de l'équipe {name}",
      removeFromList: "Retirer de la liste",
      removeAgentFromList: "Retirer {name} de la liste",
      removeTeamFromList: "Retirer l'équipe {name} de la liste",
      teamEmptyMembers: "Aucun agent dans cette équipe.",
      searchClient: "Rechercher un client…",
      noClientFound: "Aucun client trouvé.",
      noClients: "Aucun client.",
      searchClientHint: "Recherchez un client pour l'ajouter au filtre.",
      meSuffix: "(Moi)"
    },
    search: {
      placeholder: "Événement, client, agent…",
      aria: "Rechercher dans le planning",
      clear: "Effacer la recherche",
      clearFilters: "Effacer les filtres"
    },
    supportLegend: {
      support_incident: "Incident support",
      support_demande: "Demande support",
      support_probleme: "Problème support"
    },
    dayAction: {
      close: "Fermer",
      hint: "Que souhaitez-vous faire ?",
      createEvent: "Créer un événement",
      goToDate: "Aller à cette date"
    },
    agenda: {
      weekOf: "Semaine du",
      eventCount: "{count} événement{plural}",
      emptyTitle: "Aucun événement cette semaine",
      emptyHint: "Ajustez les filtres agents ou types, ou naviguez vers une autre semaine avec les flèches du calendrier.",
      today: "Aujourd'hui",
      weekend: "Week-end"
    },
    agendaTime: {
      allDay: "Journée entière",
      startUntil: "Début · jusqu'au {date}",
      endSince: "Fin · depuis le {date}",
      endsAt: "→ {time}",
      startsAt: "{time} →",
      range: "{start} – {end}"
    },
    linkedGroups: {
      infrastructure: "Infrastructure",
      cybersecurity: "Cybersécurité",
      tenant: "Tenant",
      ndd: "NDD"
    },
    toasts: {
      assigneeUpdated: "Agent mis à jour",
      assigneeUpdateError: "Impossible de changer l'agent",
      moveError: "Impossible de déplacer l'événement",
      teamsLoadError: "Impossible de charger les équipes",
      teamNoMembers: "L'équipe « {name} » n'a aucun agent.",
      teamMembersAdded: "{count} agent{plural} ajouté{plural} depuis « {team} »",
      teamAdded: "Équipe « {team} » ajoutée"
    },
    deleteEvent: {
      confirm: "Êtes-vous sûr de vouloir supprimer cet événement ?",
      success: "Événement supprimé avec succès",
      error: "Erreur lors de la suppression de l'événement"
    }
  },
  en: {
    eyebrow: "Organization",
    title: "Planning",
    loading: "Loading schedule…",
    eventsSubtitle: "{displayed} event{displayedPlural} shown of {total}",
    newEvent: "New event",
    defaults: {
      event: "Event",
      user: "User",
      client: "Client",
      agent: "Assignee",
      team: "Team",
      noName: "Unnamed",
      cyberCampaign: "Cybersecurity campaign"
    },
    kpi: {
      total: "Total"
    },
    toolbar: {
      prevPeriod: "Previous period",
      nextPeriod: "Next period",
      timezoneTooltip: "Reference timezone: {timezone}",
      today: "Today",
      monthsCount: "{n} months",
      week: "Week",
      day: "Day",
      agenda: "Agenda",
      weekLabel: "Week {week} · {monthYear}"
    },
    calendar: {
      next: "Next",
      previous: "Previous",
      today: "Today",
      month: "Month",
      week: "Week",
      day: "Day",
      agenda: "Agenda",
      date: "Date",
      time: "Time",
      event: "Event",
      noEventsInRange: "No events in this period"
    },
    filters: {
      aria: "Schedule filters",
      agents: "Assignees",
      clients: "Clients",
      all: "All",
      none: "None",
      clear: "Clear",
      agent: "Assignee",
      team: "Team",
      searchTeam: "Search for a team…",
      searchAgent: "Search for an assignee…",
      noAgentFound: "No assignee found.",
      allAgentsPinned: "All assignees are already in the list.",
      loadingTeams: "Loading teams…",
      noTeamFound: "No team found.",
      noActiveTeams: "No active team configured in administration.",
      teamMemberCount: "{count} assignee{plural}",
      addAgentsHint: "Add a team or assignees to filter the schedule.",
      agentsSelected: "{count} assignees selected · combined schedule",
      showAgentPlanning: "Show schedule for {name}",
      hideAgentPlanning: "Hide schedule for {name}",
      showTeamPlanning: "Show schedule for team {name}",
      hideTeamPlanning: "Hide schedule for team {name}",
      removeFromList: "Remove from list",
      removeAgentFromList: "Remove {name} from list",
      removeTeamFromList: "Remove team {name} from list",
      teamEmptyMembers: "No assignees in this team.",
      searchClient: "Search for a client…",
      noClientFound: "No client found.",
      noClients: "No clients.",
      searchClientHint: "Search for a client to add it to the filter.",
      meSuffix: "(Me)"
    },
    search: {
      placeholder: "Event, client, assignee…",
      aria: "Search schedule",
      clear: "Clear search",
      clearFilters: "Clear filters"
    },
    supportLegend: {
      support_incident: "Support incident",
      support_demande: "Support request",
      support_probleme: "Support issue"
    },
    dayAction: {
      close: "Close",
      hint: "What would you like to do?",
      createEvent: "Create an event",
      goToDate: "Go to this date"
    },
    agenda: {
      weekOf: "Week of",
      eventCount: "{count} event{plural}",
      emptyTitle: "No events this week",
      emptyHint: "Adjust assignee or type filters, or navigate to another week using the calendar arrows.",
      today: "Today",
      weekend: "Weekend"
    },
    agendaTime: {
      allDay: "All day",
      startUntil: "Start · until {date}",
      endSince: "End · since {date}",
      endsAt: "→ {time}",
      startsAt: "{time} →",
      range: "{start} – {end}"
    },
    linkedGroups: {
      infrastructure: "Infrastructure",
      cybersecurity: "Cybersecurity",
      tenant: "Tenant",
      ndd: "Domain"
    },
    toasts: {
      assigneeUpdated: "Assignee updated",
      assigneeUpdateError: "Unable to change assignee",
      moveError: "Unable to move event",
      teamsLoadError: "Unable to load teams",
      teamNoMembers: "Team « {name} » has no assignees.",
      teamMembersAdded: "{count} assignee{plural} added from « {team} »",
      teamAdded: "Team « {team} » added"
    },
    deleteEvent: {
      confirm: "Are you sure you want to delete this event?",
      success: "Event deleted successfully",
      error: "Error deleting event"
    }
  },
  de: {
    eyebrow: "Organisation",
    title: "Planung",
    loading: "Planung wird geladen…",
    eventsSubtitle: "{displayed} Ereignis{displayedPlural} von {total} angezeigt",
    newEvent: "Neues Ereignis",
    defaults: {
      event: "Ereignis",
      user: "Benutzer",
      client: "Kunde",
      agent: "Mitarbeiter",
      team: "Team",
      noName: "Ohne Namen",
      cyberCampaign: "Cybersicherheitskampagne"
    },
    kpi: {
      total: "Gesamt"
    },
    toolbar: {
      prevPeriod: "Vorheriger Zeitraum",
      nextPeriod: "Nächster Zeitraum",
      timezoneTooltip: "Referenzzeitzone: {timezone}",
      today: "Heute",
      monthsCount: "{n} Monate",
      week: "Woche",
      day: "Tag",
      agenda: "Agenda",
      weekLabel: "Woche {week} · {monthYear}"
    },
    calendar: {
      next: "Weiter",
      previous: "Zurück",
      today: "Heute",
      month: "Monat",
      week: "Woche",
      day: "Tag",
      agenda: "Agenda",
      date: "Datum",
      time: "Uhrzeit",
      event: "Ereignis",
      noEventsInRange: "Keine Ereignisse in diesem Zeitraum"
    },
    filters: {
      aria: "Planungsfilter",
      agents: "Mitarbeiter",
      clients: "Kunden",
      all: "Alle",
      none: "Keine",
      clear: "Löschen",
      agent: "Mitarbeiter",
      team: "Team",
      searchTeam: "Team suchen…",
      searchAgent: "Mitarbeiter suchen…",
      noAgentFound: "Kein Mitarbeiter gefunden.",
      allAgentsPinned: "Alle Mitarbeiter sind bereits in der Liste.",
      loadingTeams: "Teams werden geladen…",
      noTeamFound: "Kein Team gefunden.",
      noActiveTeams: "Kein aktives Team in der Administration konfiguriert.",
      teamMemberCount: "{count} Mitarbeiter{plural}",
      addAgentsHint: "Fügen Sie ein Team oder Mitarbeiter hinzu, um die Planung zu filtern.",
      agentsSelected: "{count} Mitarbeiter ausgewählt · kombinierte Planung",
      showAgentPlanning: "Planung von {name} anzeigen",
      hideAgentPlanning: "Planung von {name} ausblenden",
      showTeamPlanning: "Planung des Teams {name} anzeigen",
      hideTeamPlanning: "Planung des Teams {name} ausblenden",
      removeFromList: "Aus Liste entfernen",
      removeAgentFromList: "{name} aus Liste entfernen",
      removeTeamFromList: "Team {name} aus Liste entfernen",
      teamEmptyMembers: "Keine Mitarbeiter in diesem Team.",
      searchClient: "Kunde suchen…",
      noClientFound: "Kein Kunde gefunden.",
      noClients: "Keine Kunden.",
      searchClientHint: "Suchen Sie einen Kunden, um ihn zum Filter hinzuzufügen.",
      meSuffix: "(Ich)"
    },
    search: {
      placeholder: "Ereignis, Kunde, Mitarbeiter…",
      aria: "Planung durchsuchen",
      clear: "Suche löschen",
      clearFilters: "Filter löschen"
    },
    supportLegend: {
      support_incident: "Support-Vorfall",
      support_demande: "Support-Anfrage",
      support_probleme: "Support-Problem"
    },
    dayAction: {
      close: "Schließen",
      hint: "Was möchten Sie tun?",
      createEvent: "Ereignis erstellen",
      goToDate: "Zu diesem Datum wechseln"
    },
    agenda: {
      weekOf: "Woche vom",
      eventCount: "{count} Ereignis{plural}",
      emptyTitle: "Keine Ereignisse diese Woche",
      emptyHint: "Passen Sie Mitarbeiter- oder Typfilter an oder navigieren Sie mit den Kalenderpfeilen zu einer anderen Woche.",
      today: "Heute",
      weekend: "Wochenende"
    },
    agendaTime: {
      allDay: "Ganztägig",
      startUntil: "Beginn · bis {date}",
      endSince: "Ende · seit {date}",
      endsAt: "→ {time}",
      startsAt: "{time} →",
      range: "{start} – {end}"
    },
    linkedGroups: {
      infrastructure: "Infrastruktur",
      cybersecurity: "Cybersicherheit",
      tenant: "Tenant",
      ndd: "Domain"
    },
    toasts: {
      assigneeUpdated: "Mitarbeiter aktualisiert",
      assigneeUpdateError: "Mitarbeiter konnte nicht geändert werden",
      moveError: "Ereignis konnte nicht verschoben werden",
      teamsLoadError: "Teams konnten nicht geladen werden",
      teamNoMembers: "Team « {name} » hat keine Mitarbeiter.",
      teamMembersAdded: "{count} Mitarbeiter{plural} aus « {team} » hinzugefügt",
      teamAdded: "Team « {team} » hinzugefügt"
    },
    deleteEvent: {
      confirm: "Möchten Sie dieses Ereignis wirklich löschen?",
      success: "Ereignis erfolgreich gelöscht",
      error: "Fehler beim Löschen des Ereignisses"
    }
  },
  it: {
    eyebrow: "Organizzazione",
    title: "Pianificazione",
    loading: "Caricamento pianificazione…",
    eventsSubtitle: "{displayed} evento{displayedPlural} visualizzato{displayedPlural} su {total}",
    newEvent: "Nuovo evento",
    defaults: {
      event: "Evento",
      user: "Utente",
      client: "Cliente",
      agent: "Agente",
      team: "Team",
      noName: "Senza nome",
      cyberCampaign: "Campagna cybersicurezza"
    },
    kpi: {
      total: "Totale"
    },
    toolbar: {
      prevPeriod: "Periodo precedente",
      nextPeriod: "Periodo successivo",
      timezoneTooltip: "Fuso orario di riferimento: {timezone}",
      today: "Oggi",
      monthsCount: "{n} mesi",
      week: "Settimana",
      day: "Giorno",
      agenda: "Agenda",
      weekLabel: "Settimana {week} · {monthYear}"
    },
    calendar: {
      next: "Successivo",
      previous: "Precedente",
      today: "Oggi",
      month: "Mese",
      week: "Settimana",
      day: "Giorno",
      agenda: "Agenda",
      date: "Data",
      time: "Ora",
      event: "Evento",
      noEventsInRange: "Nessun evento in questo periodo"
    },
    filters: {
      aria: "Filtri pianificazione",
      agents: "Agenti",
      clients: "Clienti",
      all: "Tutti",
      none: "Nessuno",
      clear: "Cancella",
      agent: "Agente",
      team: "Team",
      searchTeam: "Cerca un team…",
      searchAgent: "Cerca un agente…",
      noAgentFound: "Nessun agente trovato.",
      allAgentsPinned: "Tutti gli agenti sono già nell'elenco.",
      loadingTeams: "Caricamento team…",
      noTeamFound: "Nessun team trovato.",
      noActiveTeams: "Nessun team attivo configurato nell'amministrazione.",
      teamMemberCount: "{count} agente{plural}",
      addAgentsHint: "Aggiungi un team o degli agenti per filtrare la pianificazione.",
      agentsSelected: "{count} agenti selezionati · pianificazione combinata",
      showAgentPlanning: "Mostra pianificazione di {name}",
      hideAgentPlanning: "Nascondi pianificazione di {name}",
      showTeamPlanning: "Mostra pianificazione del team {name}",
      hideTeamPlanning: "Nascondi pianificazione del team {name}",
      removeFromList: "Rimuovi dall'elenco",
      removeAgentFromList: "Rimuovi {name} dall'elenco",
      removeTeamFromList: "Rimuovi il team {name} dall'elenco",
      teamEmptyMembers: "Nessun agente in questo team.",
      searchClient: "Cerca un cliente…",
      noClientFound: "Nessun cliente trovato.",
      noClients: "Nessun cliente.",
      searchClientHint: "Cerca un cliente per aggiungerlo al filtro.",
      meSuffix: "(Io)"
    },
    search: {
      placeholder: "Evento, cliente, agente…",
      aria: "Cerca nella pianificazione",
      clear: "Cancella ricerca",
      clearFilters: "Cancella filtri"
    },
    supportLegend: {
      support_incident: "Incidente supporto",
      support_demande: "Richiesta supporto",
      support_probleme: "Problema supporto"
    },
    dayAction: {
      close: "Chiudi",
      hint: "Cosa desideri fare?",
      createEvent: "Crea un evento",
      goToDate: "Vai a questa data"
    },
    agenda: {
      weekOf: "Settimana del",
      eventCount: "{count} evento{plural}",
      emptyTitle: "Nessun evento questa settimana",
      emptyHint: "Modifica i filtri agenti o tipi, oppure naviga verso un'altra settimana con le frecce del calendario.",
      today: "Oggi",
      weekend: "Fine settimana"
    },
    agendaTime: {
      allDay: "Giornata intera",
      startUntil: "Inizio · fino al {date}",
      endSince: "Fine · dal {date}",
      endsAt: "→ {time}",
      startsAt: "{time} →",
      range: "{start} – {end}"
    },
    linkedGroups: {
      infrastructure: "Infrastruttura",
      cybersecurity: "Cybersicurezza",
      tenant: "Tenant",
      ndd: "Dominio"
    },
    toasts: {
      assigneeUpdated: "Agente aggiornato",
      assigneeUpdateError: "Impossibile cambiare agente",
      moveError: "Impossibile spostare l'evento",
      teamsLoadError: "Impossibile caricare i team",
      teamNoMembers: "Il team « {name} » non ha agenti.",
      teamMembersAdded: "{count} agente{plural} aggiunto{plural} da « {team} »",
      teamAdded: "Team « {team} » aggiunto"
    },
    deleteEvent: {
      confirm: "Eliminare questo evento?",
      success: "Evento eliminato con successo",
      error: "Errore durante l'eliminazione dell'evento"
    }
  },
  es: {
    eyebrow: "Organización",
    title: "Planificación",
    loading: "Cargando planificación…",
    eventsSubtitle: "{displayed} evento{displayedPlural} mostrado{displayedPlural} de {total}",
    newEvent: "Nuevo evento",
    defaults: {
      event: "Evento",
      user: "Usuario",
      client: "Cliente",
      agent: "Agente",
      team: "Equipo",
      noName: "Sin nombre",
      cyberCampaign: "Campaña de ciberseguridad"
    },
    kpi: {
      total: "Total"
    },
    toolbar: {
      prevPeriod: "Periodo anterior",
      nextPeriod: "Periodo siguiente",
      timezoneTooltip: "Zona horaria de referencia: {timezone}",
      today: "Hoy",
      monthsCount: "{n} meses",
      week: "Semana",
      day: "Día",
      agenda: "Agenda",
      weekLabel: "Semana {week} · {monthYear}"
    },
    calendar: {
      next: "Siguiente",
      previous: "Anterior",
      today: "Hoy",
      month: "Mes",
      week: "Semana",
      day: "Día",
      agenda: "Agenda",
      date: "Fecha",
      time: "Hora",
      event: "Evento",
      noEventsInRange: "No hay eventos en este periodo"
    },
    filters: {
      aria: "Filtros de planificación",
      agents: "Agentes",
      clients: "Clientes",
      all: "Todos",
      none: "Ninguno",
      clear: "Borrar",
      agent: "Agente",
      team: "Equipo",
      searchTeam: "Buscar un equipo…",
      searchAgent: "Buscar un agente…",
      noAgentFound: "Ningún agente encontrado.",
      allAgentsPinned: "Todos los agentes ya están en la lista.",
      loadingTeams: "Cargando equipos…",
      noTeamFound: "Ningún equipo encontrado.",
      noActiveTeams: "Ningún equipo activo configurado en la administración.",
      teamMemberCount: "{count} agente{plural}",
      addAgentsHint: "Añada un equipo o agentes para filtrar la planificación.",
      agentsSelected: "{count} agentes seleccionados · planificación combinada",
      showAgentPlanning: "Mostrar planificación de {name}",
      hideAgentPlanning: "Ocultar planificación de {name}",
      showTeamPlanning: "Mostrar planificación del equipo {name}",
      hideTeamPlanning: "Ocultar planificación del equipo {name}",
      removeFromList: "Quitar de la lista",
      removeAgentFromList: "Quitar {name} de la lista",
      removeTeamFromList: "Quitar el equipo {name} de la lista",
      teamEmptyMembers: "Ningún agente en este equipo.",
      searchClient: "Buscar un cliente…",
      noClientFound: "Ningún cliente encontrado.",
      noClients: "Ningún cliente.",
      searchClientHint: "Busque un cliente para añadirlo al filtro.",
      meSuffix: "(Yo)"
    },
    search: {
      placeholder: "Evento, cliente, agente…",
      aria: "Buscar en la planificación",
      clear: "Borrar búsqueda",
      clearFilters: "Borrar filtros"
    },
    supportLegend: {
      support_incident: "Incidente de soporte",
      support_demande: "Solicitud de soporte",
      support_probleme: "Problema de soporte"
    },
    dayAction: {
      close: "Cerrar",
      hint: "¿Qué desea hacer?",
      createEvent: "Crear un evento",
      goToDate: "Ir a esta fecha"
    },
    agenda: {
      weekOf: "Semana del",
      eventCount: "{count} evento{plural}",
      emptyTitle: "Ningún evento esta semana",
      emptyHint: "Ajuste los filtros de agentes o tipos, o navegue a otra semana con las flechas del calendario.",
      today: "Hoy",
      weekend: "Fin de semana"
    },
    agendaTime: {
      allDay: "Todo el día",
      startUntil: "Inicio · hasta {date}",
      endSince: "Fin · desde {date}",
      endsAt: "→ {time}",
      startsAt: "{time} →",
      range: "{start} – {end}"
    },
    linkedGroups: {
      infrastructure: "Infraestructura",
      cybersecurity: "Ciberseguridad",
      tenant: "Tenant",
      ndd: "Dominio"
    },
    toasts: {
      assigneeUpdated: "Agente actualizado",
      assigneeUpdateError: "No se pudo cambiar el agente",
      moveError: "No se pudo mover el evento",
      teamsLoadError: "No se pudieron cargar los equipos",
      teamNoMembers: "El equipo « {name} » no tiene agentes.",
      teamMembersAdded: "{count} agente{plural} añadido{plural} desde « {team} »",
      teamAdded: "Equipo « {team} » añadido"
    },
    deleteEvent: {
      confirm: "¿Eliminar este evento?",
      success: "Evento eliminado correctamente",
      error: "Error al eliminar el evento"
    }
  }
};
function pluralSuffix(count, locale) {
  if (count === 1) return "";
  if (locale === "fr") return "s";
  return "s";
}
function formatToolbarLabel(activeView, date, monthsShown, t) {
  const m = moment(date);
  switch (activeView) {
    case "day":
      return m.format("dddd D MMMM YYYY");
    case "week":
      return interpolate(t.toolbar.weekLabel, {
        week: m.isoWeek(),
        monthYear: m.format("MMMM YYYY")
      });
    case "agenda":
      {
        const weekStart = m.clone().startOf("week");
        const weekEnd = m.clone().endOf("week");
        if (weekStart.isSame(weekEnd, "month")) {
          return `${weekStart.format("D")} – ${weekEnd.format("D MMMM YYYY")}`;
        }
        if (weekStart.isSame(weekEnd, "year")) {
          return `${weekStart.format("D MMMM")} – ${weekEnd.format("D MMMM YYYY")}`;
        }
        return `${weekStart.format("D MMMM YYYY")} – ${weekEnd.format("D MMMM YYYY")}`;
      }
    case "month":
    default:
      if (monthsShown <= 1) {
        return m.format("MMMM YYYY");
      }
      {
        const endMonth = m.clone().add(monthsShown - 1, "months");
        if (m.isSame(endMonth, "month")) {
          return m.format("MMMM YYYY");
        }
        if (m.isSame(endMonth, "year")) {
          return `${m.format("MMMM")} – ${endMonth.format("MMMM YYYY")}`;
        }
        return `${m.format("MMMM YYYY")} – ${endMonth.format("MMMM YYYY")}`;
      }
  }
}
export function getPlanningPageCopy(locale, eventTypeLabels = {}, catalogTypes = null) {
  const t = pickLocaleMessages(PLANNING_PAGE, locale);
  const baseTypes = Array.isArray(catalogTypes) && catalogTypes.length > 0 ? catalogTypes : PLANNING_EVENT_TYPES;
  const planningTypes = baseTypes.map(type => ({
    ...type,
    label: type.label || eventTypeLabels[type.value] || type.value
  }));
  const legendItems = [...planningTypes];
  return {
    ...t,
    locale,
    planningTypes,
    legendItems,
    calendarMessages: t.calendar,
    formatMonthsButton: n => interpolate(t.toolbar.monthsCount, {
      n
    }),
    formatEventsSubtitle: (displayed, total) => interpolate(t.eventsSubtitle, {
      displayed,
      total,
      displayedPlural: displayed > 1 ? pluralSuffix(displayed, locale) : ""
    }),
    formatTeamMemberCount: count => interpolate(t.filters.teamMemberCount, {
      count,
      plural: count > 1 ? pluralSuffix(count, locale) : ""
    }),
    formatAgentsSelected: count => interpolate(t.filters.agentsSelected, {
      count
    }),
    formatTeamMembersAdded: (count, team) => interpolate(t.toasts.teamMembersAdded, {
      count,
      team,
      plural: count > 1 ? pluralSuffix(count, locale) : ""
    }),
    formatTeamAdded: team => interpolate(t.toasts.teamAdded, {
      team
    }),
    formatShowAgentPlanning: name => interpolate(t.filters.showAgentPlanning, {
      name
    }),
    formatHideAgentPlanning: name => interpolate(t.filters.hideAgentPlanning, {
      name
    }),
    formatShowTeamPlanning: name => interpolate(t.filters.showTeamPlanning, {
      name
    }),
    formatHideTeamPlanning: name => interpolate(t.filters.hideTeamPlanning, {
      name
    }),
    formatRemoveAgentFromList: name => interpolate(t.filters.removeAgentFromList, {
      name
    }),
    formatRemoveTeamFromList: name => interpolate(t.filters.removeTeamFromList, {
      name
    }),
    formatTeamNoMembers: name => interpolate(t.toasts.teamNoMembers, {
      name
    }),
    formatTimezoneTooltip: timezone => interpolate(t.toolbar.timezoneTooltip, {
      timezone
    }),
    formatAgendaEventCount: count => interpolate(t.agenda.eventCount, {
      count,
      plural: count > 1 ? pluralSuffix(count, locale) : ""
    }),
    formatToolbarLabel: (activeView, date, monthsShown = 1) => formatToolbarLabel(activeView, date, monthsShown, t)
  };
}
export const getPlanningPageCopyBase = createLocaleGetter(PLANNING_PAGE);
