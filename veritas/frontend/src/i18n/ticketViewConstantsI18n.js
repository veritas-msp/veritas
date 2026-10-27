import { interpolate, pickLocaleMessages } from "./translate";
const FIELD_KEYS = ["title", "description", "type", "category", "status", "priority", "channel", "ticket_number", "client_id", "assigned", "assigned_user_id", "pending_validator_user_id", "requester_contact_id", "tags"];
const STATUS_KEYS = ["open", "new", "in_progress", "pending", "resolved", "closed"];
const OPERATOR_KEYS = ["contains", "not_contains", "equals", "not_equals", "starts_with", "ends_with", "in", "not_in", "is_empty", "is_not_empty"];
const MATCH_MODE_KEYS = ["all", "any"];
const VISIBILITY_KEYS = ["private", "public", "assigned"];
const FORM_SECTION_IDS = ["general", "visibility", "filters"];
const BUILTIN_VIEW_IDS = ["__builtin_mine__", "__builtin_new__", "__builtin_unassigned__", "__builtin_in_progress__", "__builtin_pending__", "__builtin_critical__", "__builtin_sla_overdue__", "__builtin_to_plan__", "__builtin_all__"];
const TICKET_VIEW_COPY = {
  fr: {
    fields: {
      title: "Sujet",
      description: "Description",
      type: "Type ITIL",
      category: "Catégorie",
      status: "Statut",
      priority: "Priorité",
      channel: "Canal",
      ticket_number: "N° ticket",
      client_id: "ID client",
      assigned: "Assigné (nom / email)",
      assigned_user_id: "Assigné (agent)",
      pending_validator_user_id: "Validateur en attente",
      requester_contact_id: "ID contact demandeur",
      tags: "Étiquettes / tags"
    },
    statuses: {
      open: "Ouverts (hors résolu / clos)",
      new: "Nouveau",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolu",
      closed: "Clos"
    },
    operators: {
      contains: "contient",
      not_contains: "ne contient pas",
      equals: "est égal à",
      not_equals: "est différent de",
      starts_with: "commence par",
      ends_with: "se termine par",
      in: "est parmi (liste)",
      not_in: "n'est pas parmi",
      is_empty: "est vide",
      is_not_empty: "n'est pas vide"
    },
    matchModes: {
      all: "Tous les critères (ET)",
      any: "Au moins un critère (OU)"
    },
    visibility: {
      private: {
        label: "Privée",
        hint: "Visible uniquement par vous"
      },
      public: {
        label: "Publique",
        hint: "Visible de tous"
      },
      assigned: {
        label: "Assignée",
        hint: "Utilisateurs, profils et/ou équipes"
      }
    },
    formSections: {
      general: {
        label: "Général",
        description: "Nom et description"
      },
      visibility: {
        label: "Visibilité",
        description: "Qui peut voir la vue"
      },
      filters: {
        label: "Filtres",
        description: "Règles de tri des tickets"
      }
    },
    builtinViews: {
      __builtin_mine__: {
        name: "Mes tickets",
        description: "Tickets support qui vous sont assignés (non clos)"
      },
      __builtin_new__: {
        name: "Nouveaux tickets",
        description: "Tickets support au statut nouveau"
      },
      __builtin_unassigned__: {
        name: "Tickets non attribués",
        description: "Tickets support sans attribution (non clos)"
      },
      __builtin_in_progress__: {
        name: "Tickets en cours",
        description: "Tickets support au statut en cours (non clos)"
      },
      __builtin_pending__: {
        name: "Tickets en attente",
        description: "Tickets support au statut en attente (non clos)"
      },
      __builtin_critical__: {
        name: "Tickets prioritaires",
        description: "Incidents majeurs ou priorité haute / urgente (ouverts)"
      },
      __builtin_sla_overdue__: {
        name: "Tickets en retard",
        description: "Tickets support avec SLA client dépassé"
      },
      __builtin_to_plan__: {
        name: "Interventions à planifier",
        description: "Tickets ouverts sans intervention planifiée"
      },
      __builtin_all__: {
        name: "Tous les tickets",
        description: "Tous les tickets actifs (hors corbeille)"
      }
    },
    describe: {
      noAssignment: "Aucune assignation",
      user: "{count} utilisateur",
      userPlural: "{count} utilisateurs",
      profile: "{count} profil ({names})",
      profilePlural: "{count} profils ({names})",
      team: "{count} équipe ({names})",
      teamPlural: "{count} équipes ({names})",
      noFilter: "Aucun filtre (tous les tickets)",
      emptyGroup: "groupe vide",
      connectorOr: "OU",
      connectorAnd: "ET"
    }
  },
  en: {
    fields: {
      title: "Subject",
      description: "Description",
      type: "ITIL type",
      category: "Category",
      status: "Status",
      priority: "Priority",
      channel: "Channel",
      ticket_number: "Ticket #",
      client_id: "Client ID",
      assigned: "Assigned (name / email)",
      assigned_user_id: "Assigned (agent)",
      pending_validator_user_id: "Pending validator",
      requester_contact_id: "Requester contact ID",
      tags: "Tags"
    },
    statuses: {
      open: "Open (excluding resolved / closed)",
      new: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    operators: {
      contains: "contains",
      not_contains: "does not contain",
      equals: "equals",
      not_equals: "does not equal",
      starts_with: "starts with",
      ends_with: "ends with",
      in: "is in (list)",
      not_in: "is not in",
      is_empty: "is empty",
      is_not_empty: "is not empty"
    },
    matchModes: {
      all: "All criteria (AND)",
      any: "Any criterion (OR)"
    },
    visibility: {
      private: {
        label: "Private",
        hint: "Visible only to you"
      },
      public: {
        label: "Public",
        hint: "Visible to everyone"
      },
      assigned: {
        label: "Assigned",
        hint: "Users, profiles and/or teams"
      }
    },
    formSections: {
      general: {
        label: "General",
        description: "Name and description"
      },
      visibility: {
        label: "Visibility",
        description: "Who can see the view"
      },
      filters: {
        label: "Filters",
        description: "Ticket filtering rules"
      }
    },
    builtinViews: {
      __builtin_mine__: {
        name: "My tickets",
        description: "Support tickets assigned to you (not closed)"
      },
      __builtin_new__: {
        name: "New tickets",
        description: "Support tickets with new status"
      },
      __builtin_unassigned__: {
        name: "Unassigned tickets",
        description: "Support tickets with no assignee (not closed)"
      },
      __builtin_in_progress__: {
        name: "In progress",
        description: "Support tickets in progress (not closed)"
      },
      __builtin_pending__: {
        name: "Pending tickets",
        description: "Support tickets pending (not closed)"
      },
      __builtin_critical__: {
        name: "Priority tickets",
        description: "Major incidents or high/urgent priority (open)"
      },
      __builtin_sla_overdue__: {
        name: "Overdue tickets",
        description: "Support tickets with breached client SLA"
      },
      __builtin_to_plan__: {
        name: "Interventions to schedule",
        description: "Open tickets without a planned intervention"
      },
      __builtin_all__: {
        name: "All tickets",
        description: "All active tickets (excluding trash)"
      }
    },
    describe: {
      noAssignment: "No assignment",
      user: "{count} user",
      userPlural: "{count} users",
      profile: "{count} profile ({names})",
      profilePlural: "{count} profiles ({names})",
      team: "{count} team ({names})",
      teamPlural: "{count} teams ({names})",
      noFilter: "No filter (all tickets)",
      emptyGroup: "empty group",
      connectorOr: "OR",
      connectorAnd: "AND"
    }
  },
  de: {
    fields: {
      title: "Betreff",
      description: "Beschreibung",
      type: "ITIL-Typ",
      category: "Kategorie",
      status: "Status",
      priority: "Priorität",
      channel: "Kanal",
      ticket_number: "Ticket-Nr.",
      client_id: "Kunden-ID",
      assigned: "Zugewiesen (Name / E-Mail)",
      assigned_user_id: "Zugewiesen (Agent)",
      pending_validator_user_id: "Ausstehender Validator",
      requester_contact_id: "Anfragender Kontakt-ID",
      tags: "Tags"
    },
    statuses: {
      open: "Offen (ohne gelöst / geschlossen)",
      new: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Wartend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    operators: {
      contains: "enthält",
      not_contains: "enthält nicht",
      equals: "ist gleich",
      not_equals: "ist ungleich",
      starts_with: "beginnt mit",
      ends_with: "endet mit",
      in: "ist in (Liste)",
      not_in: "ist nicht in",
      is_empty: "ist leer",
      is_not_empty: "ist nicht leer"
    },
    matchModes: {
      all: "Alle Kriterien (UND)",
      any: "Mindestens ein Kriterium (ODER)"
    },
    visibility: {
      private: {
        label: "Privat",
        hint: "Nur für Sie sichtbar"
      },
      public: {
        label: "Öffentlich",
        hint: "Für alle sichtbar"
      },
      assigned: {
        label: "Zugewiesen",
        hint: "Benutzer, Profile und/oder Teams"
      }
    },
    formSections: {
      general: {
        label: "Allgemein",
        description: "Name und Beschreibung"
      },
      visibility: {
        label: "Sichtbarkeit",
        description: "Wer die Ansicht sehen kann"
      },
      filters: {
        label: "Filter",
        description: "Ticket-Filterregeln"
      }
    },
    builtinViews: {
      __builtin_mine__: {
        name: "Meine Tickets",
        description: "Ihnen zugewiesene offene Support-Tickets"
      },
      __builtin_new__: {
        name: "Neue Tickets",
        description: "Support-Tickets mit Status neu"
      },
      __builtin_unassigned__: {
        name: "Nicht zugewiesen",
        description: "Offene Support-Tickets ohne Zuweisung"
      },
      __builtin_in_progress__: {
        name: "In Bearbeitung",
        description: "Support-Tickets in Bearbeitung"
      },
      __builtin_pending__: {
        name: "Wartende Tickets",
        description: "Support-Tickets in Wartestellung"
      },
      __builtin_critical__: {
        name: "Prioritäre Tickets",
        description: "Major Incidents oder hohe/dringende Priorität"
      },
      __builtin_sla_overdue__: {
        name: "Überfällige Tickets",
        description: "Support-Tickets mit überschrittenem SLA"
      },
      __builtin_to_plan__: {
        name: "Einsätze zu planen",
        description: "Offene Tickets ohne geplante Intervention"
      },
      __builtin_all__: {
        name: "Alle Tickets",
        description: "Alle aktiven Tickets (ohne Papierkorb)"
      }
    },
    describe: {
      noAssignment: "Keine Zuweisung",
      user: "{count} Benutzer",
      userPlural: "{count} Benutzer",
      profile: "{count} Profil ({names})",
      profilePlural: "{count} Profile ({names})",
      team: "{count} Team ({names})",
      teamPlural: "{count} Teams ({names})",
      noFilter: "Kein Filter (alle Tickets)",
      emptyGroup: "leere Gruppe",
      connectorOr: "ODER",
      connectorAnd: "UND"
    }
  },
  it: {
    fields: {
      title: "Oggetto",
      description: "Descrizione",
      type: "Tipo ITIL",
      category: "Categoria",
      status: "Stato",
      priority: "Priorità",
      channel: "Canale",
      ticket_number: "N° ticket",
      client_id: "ID cliente",
      assigned: "Assegnato (nome / email)",
      assigned_user_id: "Assegnato (agente)",
      pending_validator_user_id: "Validatore in attesa",
      requester_contact_id: "ID contatto richiedente",
      tags: "Tag"
    },
    statuses: {
      open: "Aperti (esclusi risolti / chiusi)",
      new: "Nuovo",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolto",
      closed: "Chiuso"
    },
    operators: {
      contains: "contiene",
      not_contains: "non contiene",
      equals: "è uguale a",
      not_equals: "è diverso da",
      starts_with: "inizia con",
      ends_with: "termina con",
      in: "è tra (lista)",
      not_in: "non è tra",
      is_empty: "è vuoto",
      is_not_empty: "non è vuoto"
    },
    matchModes: {
      all: "Tutti i criteri (E)",
      any: "Almeno un criterio (O)"
    },
    visibility: {
      private: {
        label: "Privata",
        hint: "Visibile solo a te"
      },
      public: {
        label: "Pubblica",
        hint: "Visibile a tutti"
      },
      assigned: {
        label: "Assegnata",
        hint: "Utenti, profili e/o team"
      }
    },
    formSections: {
      general: {
        label: "Generale",
        description: "Nome e descrizione"
      },
      visibility: {
        label: "Visibilità",
        description: "Chi può vedere la vista"
      },
      filters: {
        label: "Filtri",
        description: "Regole di filtraggio ticket"
      }
    },
    builtinViews: {
      __builtin_mine__: {
        name: "I miei ticket",
        description: "Ticket support assegnati a te (non chiusi)"
      },
      __builtin_new__: {
        name: "Nuovi ticket",
        description: "Ticket support con stato nuovo"
      },
      __builtin_unassigned__: {
        name: "Non assegnati",
        description: "Ticket support senza assegnatario (non chiusi)"
      },
      __builtin_in_progress__: {
        name: "In corso",
        description: "Ticket support in corso (non chiusi)"
      },
      __builtin_pending__: {
        name: "In attesa",
        description: "Ticket support in attesa (non chiusi)"
      },
      __builtin_critical__: {
        name: "Ticket prioritari",
        description: "Incidenti maggiori o priorità alta/urgente"
      },
      __builtin_sla_overdue__: {
        name: "Ticket in ritardo",
        description: "Ticket support con SLA cliente superato"
      },
      __builtin_to_plan__: {
        name: "Interventi da pianificare",
        description: "Ticket aperti senza intervento pianificato"
      },
      __builtin_all__: {
        name: "Tutti i ticket",
        description: "Tutti i ticket attivi (escluso cestino)"
      }
    },
    describe: {
      noAssignment: "Nessuna assegnazione",
      user: "{count} utente",
      userPlural: "{count} utenti",
      profile: "{count} profilo ({names})",
      profilePlural: "{count} profili ({names})",
      team: "{count} team ({names})",
      teamPlural: "{count} team ({names})",
      noFilter: "Nessun filtro (tutti i ticket)",
      emptyGroup: "gruppo vuoto",
      connectorOr: "O",
      connectorAnd: "E"
    }
  },
  es: {
    fields: {
      title: "Asunto",
      description: "Descripción",
      type: "Tipo ITIL",
      category: "Categoría",
      status: "Estado",
      priority: "Prioridad",
      channel: "Canal",
      ticket_number: "N° ticket",
      client_id: "ID cliente",
      assigned: "Asignado (nombre / email)",
      assigned_user_id: "Asignado (agente)",
      pending_validator_user_id: "Validador pendiente",
      requester_contact_id: "ID contacto solicitante",
      tags: "Etiquetas"
    },
    statuses: {
      open: "Abiertos (excl. resueltos / cerrados)",
      new: "Nuevo",
      in_progress: "En curso",
      pending: "En espera",
      resolved: "Resuelto",
      closed: "Cerrado"
    },
    operators: {
      contains: "contiene",
      not_contains: "no contiene",
      equals: "es igual a",
      not_equals: "es distinto de",
      starts_with: "empieza por",
      ends_with: "termina en",
      in: "está en (lista)",
      not_in: "no está en",
      is_empty: "está vacío",
      is_not_empty: "no está vacío"
    },
    matchModes: {
      all: "Todos los criterios (Y)",
      any: "Al menos un criterio (O)"
    },
    visibility: {
      private: {
        label: "Privada",
        hint: "Visible solo para ti"
      },
      public: {
        label: "Pública",
        hint: "Visible para todos"
      },
      assigned: {
        label: "Asignada",
        hint: "Usuarios, perfiles y/o equipos"
      }
    },
    formSections: {
      general: {
        label: "General",
        description: "Nombre y descripción"
      },
      visibility: {
        label: "Visibilidad",
        description: "Quién puede ver la vista"
      },
      filters: {
        label: "Filtros",
        description: "Reglas de filtrado de tickets"
      }
    },
    builtinViews: {
      __builtin_mine__: {
        name: "Mis tickets",
        description: "Tickets de soporte asignados a ti (no cerrados)"
      },
      __builtin_new__: {
        name: "Tickets nuevos",
        description: "Tickets de soporte con estado nuevo"
      },
      __builtin_unassigned__: {
        name: "Sin asignar",
        description: "Tickets de soporte sin asignatario (no cerrados)"
      },
      __builtin_in_progress__: {
        name: "En curso",
        description: "Tickets de soporte en curso (no cerrados)"
      },
      __builtin_pending__: {
        name: "En espera",
        description: "Tickets de soporte en espera (no cerrados)"
      },
      __builtin_critical__: {
        name: "Tickets prioritarios",
        description: "Incidentes mayores o prioridad alta/urgente"
      },
      __builtin_sla_overdue__: {
        name: "Tickets en retraso",
        description: "Tickets de soporte con SLA de cliente vencido"
      },
      __builtin_to_plan__: {
        name: "Intervenciones a planificar",
        description: "Tickets abiertos sin intervención planificada"
      },
      __builtin_all__: {
        name: "Todos los tickets",
        description: "Todos los tickets activos (sin papelera)"
      }
    },
    describe: {
      noAssignment: "Sin asignación",
      user: "{count} usuario",
      userPlural: "{count} usuarios",
      profile: "{count} perfil ({names})",
      profilePlural: "{count} perfiles ({names})",
      team: "{count} equipo ({names})",
      teamPlural: "{count} equipos ({names})",
      noFilter: "Sin filtro (todos los tickets)",
      emptyGroup: "grupo vacío",
      connectorOr: "O",
      connectorAnd: "Y"
    }
  }
};
const VISIBILITY_ICONS = {
  private: "mdi:lock-outline",
  public: "mdi:earth",
  assigned: "mdi:account-multiple-check-outline"
};
const FORM_SECTION_ICONS = {
  general: "mdi:information-outline",
  visibility: "mdi:eye-outline",
  filters: "mdi:filter-variant"
};
export function getTicketViewConstantsCopy(locale) {
  const t = pickLocaleMessages(TICKET_VIEW_COPY, locale);
  return {
    ...t,
    fieldOptions: FIELD_KEYS.map(value => ({
      value,
      label: t.fields[value]
    })),
    statusOptions: STATUS_KEYS.map(value => ({
      value,
      label: t.statuses[value]
    })),
    operatorOptions: OPERATOR_KEYS.map(value => ({
      value,
      label: t.operators[value]
    })),
    matchModes: MATCH_MODE_KEYS.map(value => ({
      value,
      label: t.matchModes[value]
    })),
    visibilityOptions: VISIBILITY_KEYS.map(value => ({
      value,
      label: t.visibility[value].label,
      hint: t.visibility[value].hint,
      icon: VISIBILITY_ICONS[value]
    })),
    formSections: FORM_SECTION_IDS.map(id => ({
      id,
      label: t.formSections[id].label,
      description: t.formSections[id].description,
      icon: FORM_SECTION_ICONS[id]
    })),
    getFieldLabel: field => t.fields[field] || field,
    getOperatorLabel: operator => t.operators[operator] || operator,
    getBuiltinViewLabels: id => t.builtinViews[id] || {
      name: id,
      description: ""
    },
    formatUserCount: count => interpolate(count === 1 ? t.describe.user : t.describe.userPlural, {
      count: String(count)
    }),
    formatProfileCount: (count, names) => interpolate(count === 1 ? t.describe.profile : t.describe.profilePlural, {
      count: String(count),
      names
    }),
    formatTeamCount: (count, names) => interpolate(count === 1 ? t.describe.team : t.describe.teamPlural, {
      count: String(count),
      names
    })
  };
}
export { BUILTIN_VIEW_IDS as TICKET_VIEW_BUILTIN_IDS };
