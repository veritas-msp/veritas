import { createLocaleGetter, interpolate } from "../../i18n/translate";
const BLOCKER_KEYS = ["equipment_infra", "equipment_cyber", "campaigns", "equipment_services", "azure_tenant", "contacts", "tickets", "events_upcoming", "rmm_agents", "client_files"];
const CLIENTS_COPY = {
  fr: {
    bcp47: "fr-FR",
    page: {
      title: "Gestion des entreprises",
      description: "Liste, recherche et suppression des fiches entreprise.",
      refresh: "Actualiser"
    },
    searchPlaceholder: "Rechercher une entreprise…",
    searchAria: "Rechercher une entreprise",
    enterpriseCount: "{count} entreprise",
    enterpriseCountPlural: "{count} entreprises",
    selectedCount: "{count} sélectionnée",
    selectedCountPlural: "{count} sélectionnées",
    deselectAll: "Tout désélectionner",
    deleteSelection: "Supprimer la sélection",
    columns: {
      enterprise: "Entreprise",
      deletion: "Suppression",
      linked: "Éléments liés"
    },
    status: {
      allowed: "Autorisée",
      blocked: "Bloquée"
    },
    linked: {
      none: "Aucun",
      element: "élément lié",
      elements: "éléments liés",
      detailTitle: "Voir le détail des éléments liés",
      detailAria: "Détail des éléments liés pour {name}"
    },
    clientNumber: "N° {number}",
    selectDeletableAria: "Sélectionner les entreprises supprimables de la page",
    selectEnterprise: "Sélectionner {name}",
    notDeletable: "{name} non supprimable",
    deleteEnterpriseTitle: "Supprimer l'entreprise",
    emptyLoading: "Chargement des entreprises…",
    empty: "Aucune entreprise à afficher",
    pagination: {
      rowsPerPage: "Lignes par page",
      range: "{start}–{end} sur {total}",
      page: "Page {current} / {total}",
      prevAria: "Page précédente",
      nextAria: "Page suivante"
    },
    hint: "La suppression classique est bloquée tant que des éléments liés existent. Vous pouvez forcer la suppression : les éléments liés (tickets, équipements, contacts, etc.) seront alors également supprimés.",
    deleteFallbackName: "cette entreprise",
    forceDeleteEnterpriseTitle: "Forcer la suppression",
    forceBulkTitle: "Forcer la suppression de {count} entreprises",
    forceBulkIntro: "Certaines entreprises ont des éléments liés. La suppression forcée effacera aussi ces éléments de façon définitive.",
    blockerLabels: {
      equipment_infra: "Équipements infrastructure",
      equipment_cyber: "Cybersécurité & sauvegarde",
      campaigns: "Campagnes cybersécurité",
      equipment_services: "Services cloud & IT",
      azure_tenant: "Tenant Microsoft / Azure",
      contacts: "Contacts",
      tickets: "Tickets support",
      events_upcoming: "Événements à venir",
      rmm_agents: "Agents RMM",
      client_files: "Fichiers entreprise"
    },
    blockersModal: {
      title: "Éléments liés",
      subtitleDeletable: "Récapitulatif des ressources rattachées à cette entreprise.",
      subtitleBlocked: "Des éléments actifs empêchent encore la suppression de cette entreprise.",
      totalSingular: "élément lié au total",
      totalPlural: "éléments liés au total",
      intro: "Retirez ou réaffectez les éléments suivants, ou forcez la suppression pour tout effacer :",
      forceTitle: "Suppression forcée",
      forceDesc: "Supprime définitivement l'entreprise et les éléments liés (équipements, contacts, fichiers, etc.). Les tickets sont conservés : le demandeur est vidé.",
      forceAck: "Je comprends que cette action est irréversible et supprimera aussi les éléments liés.",
      forceDelete: "Forcer la suppression",
      forceDeleting: "Suppression…",
      close: "Fermer",
      closeAria: "Fermer"
    },
    toast: {
      loadError: "Impossible de charger les entreprises",
      noneDeletable: "Aucune entreprise sélectionnée ne peut être supprimée.",
      someNotDeletable: "Certaines entreprises sélectionnées ne peuvent pas être supprimées.",
      deletedOne: "Entreprise supprimée.",
      deletedMany: "{count} entreprises supprimées.",
      deletePartialError: "Certaines suppressions ont échoué.",
      deleteError: "Échec de la suppression"
    }
  },
  en: {
    bcp47: "en-GB",
    page: {
      title: "Company management",
      description: "List, search and delete company records.",
      refresh: "Refresh"
    },
    searchPlaceholder: "Search a company…",
    searchAria: "Search a company",
    enterpriseCount: "{count} company",
    enterpriseCountPlural: "{count} companies",
    selectedCount: "{count} selected",
    selectedCountPlural: "{count} selected",
    deselectAll: "Deselect all",
    deleteSelection: "Delete selection",
    columns: {
      enterprise: "Company",
      deletion: "Deletion",
      linked: "Linked items"
    },
    status: {
      allowed: "Allowed",
      blocked: "Blocked"
    },
    linked: {
      none: "None",
      element: "linked item",
      elements: "linked items",
      detailTitle: "View linked items detail",
      detailAria: "Linked items detail for {name}"
    },
    clientNumber: "No. {number}",
    selectDeletableAria: "Select deletable companies on this page",
    selectEnterprise: "Select {name}",
    notDeletable: "{name} cannot be deleted",
    deleteEnterpriseTitle: "Delete company",
    emptyLoading: "Loading companies…",
    empty: "No companies to display",
    pagination: {
      rowsPerPage: "Rows per page",
      range: "{start}–{end} of {total}",
      page: "Page {current} / {total}",
      prevAria: "Previous page",
      nextAria: "Next page"
    },
    hint: "Standard deletion is blocked while linked items exist. You can force deletion: linked items (tickets, equipment, contacts, etc.) will also be permanently removed.",
    deleteFallbackName: "this company",
    forceDeleteEnterpriseTitle: "Force delete",
    forceBulkTitle: "Force delete {count} companies",
    forceBulkIntro: "Some companies have linked items. Forced deletion will also permanently remove those items.",
    blockerLabels: {
      equipment_infra: "Infrastructure equipment",
      equipment_cyber: "Cybersecurity & backup",
      campaigns: "Cybersecurity campaigns",
      equipment_services: "Cloud & IT services",
      azure_tenant: "Microsoft / Azure tenant",
      contacts: "Contacts",
      tickets: "Support tickets",
      events_upcoming: "Upcoming events",
      rmm_agents: "RMM agents",
      client_files: "Company files"
    },
    blockersModal: {
      title: "Linked items",
      subtitleDeletable: "Summary of resources linked to this company.",
      subtitleBlocked: "Active items still prevent deleting this company.",
      totalSingular: "linked item in total",
      totalPlural: "linked items in total",
      intro: "Remove or reassign the following items, or force deletion to erase everything:",
      forceTitle: "Force deletion",
      forceDesc: "Permanently deletes the company and linked items (equipment, contacts, files, etc.). Tickets are kept: the requester field is cleared.",
      forceAck: "I understand this action is irreversible and will also delete linked items.",
      forceDelete: "Force delete",
      forceDeleting: "Deleting…",
      close: "Close",
      closeAria: "Close"
    },
    toast: {
      loadError: "Unable to load companies",
      noneDeletable: "No selected company can be deleted.",
      someNotDeletable: "Some selected companies cannot be deleted.",
      deletedOne: "Company deleted.",
      deletedMany: "{count} companies deleted.",
      deletePartialError: "Some deletions failed.",
      deleteError: "Deletion failed"
    }
  },
  de: {
    bcp47: "de-DE",
    page: {
      title: "Unternehmensverwaltung",
      description: "Unternehmensdatensätze auflisten, suchen und löschen.",
      refresh: "Aktualisieren"
    },
    searchPlaceholder: "Unternehmen suchen…",
    searchAria: "Unternehmen suchen",
    enterpriseCount: "{count} Unternehmen",
    enterpriseCountPlural: "{count} Unternehmen",
    selectedCount: "{count} ausgewählt",
    selectedCountPlural: "{count} ausgewählt",
    deselectAll: "Auswahl aufheben",
    deleteSelection: "Auswahl löschen",
    columns: {
      enterprise: "Unternehmen",
      deletion: "Löschung",
      linked: "Verknüpfte Elemente"
    },
    status: {
      allowed: "Erlaubt",
      blocked: "Blockiert"
    },
    linked: {
      none: "Keine",
      element: "verknüpftes Element",
      elements: "verknüpfte Elemente",
      detailTitle: "Details der verknüpften Elemente anzeigen",
      detailAria: "Verknüpfte Elemente für {name}"
    },
    clientNumber: "Nr. {number}",
    selectDeletableAria: "Löschbare Unternehmen auf dieser Seite auswählen",
    selectEnterprise: "{name} auswählen",
    notDeletable: "{name} kann nicht gelöscht werden",
    deleteEnterpriseTitle: "Unternehmen löschen",
    emptyLoading: "Unternehmen werden geladen…",
    empty: "Keine Unternehmen anzuzeigen",
    pagination: {
      rowsPerPage: "Zeilen pro Seite",
      range: "{start}–{end} von {total}",
      page: "Seite {current} / {total}",
      prevAria: "Vorherige Seite",
      nextAria: "Nächste Seite"
    },
    hint: "Die Standardlöschung ist blockiert, solange verknüpfte Elemente existieren. Sie können die Löschung erzwingen: verknüpfte Elemente (Tickets, Geräte, Kontakte usw.) werden dann ebenfalls dauerhaft entfernt.",
    deleteFallbackName: "dieses Unternehmen",
    forceDeleteEnterpriseTitle: "Löschung erzwingen",
    forceBulkTitle: "Löschung von {count} Unternehmen erzwingen",
    forceBulkIntro: "Einige Unternehmen haben verknüpfte Elemente. Die erzwungene Löschung entfernt diese Elemente ebenfalls dauerhaft.",
    blockerLabels: {
      equipment_infra: "Infrastrukturausrüstung",
      equipment_cyber: "Cybersicherheit & Backup",
      campaigns: "Cybersicherheitskampagnen",
      equipment_services: "Cloud- & IT-Dienste",
      azure_tenant: "Microsoft-/Azure-Mandant",
      contacts: "Kontakte",
      tickets: "Support-Tickets",
      events_upcoming: "Bevorstehende Ereignisse",
      rmm_agents: "RMM-Agenten",
      client_files: "Unternehmensdateien"
    },
    blockersModal: {
      title: "Verknüpfte Elemente",
      subtitleDeletable: "Übersicht der mit diesem Unternehmen verknüpften Ressourcen.",
      subtitleBlocked: "Aktive Elemente verhindern noch das Löschen dieses Unternehmens.",
      totalSingular: "verknüpftes Element insgesamt",
      totalPlural: "verknüpfte Elemente insgesamt",
      intro: "Entfernen oder weisen Sie die folgenden Elemente zu, oder erzwingen Sie die Löschung:",
      forceTitle: "Erzwungene Löschung",
      forceDesc: "Löscht das Unternehmen und verknüpfte Elemente dauerhaft (Geräte, Kontakte, Dateien usw.). Tickets bleiben erhalten: das Anforderer-Feld wird geleert.",
      forceAck: "Ich verstehe, dass diese Aktion unwiderruflich ist und auch verknüpfte Elemente löscht.",
      forceDelete: "Löschung erzwingen",
      forceDeleting: "Löschen…",
      close: "Schließen",
      closeAria: "Schließen"
    },
    toast: {
      loadError: "Unternehmen konnten nicht geladen werden",
      noneDeletable: "Kein ausgewähltes Unternehmen kann gelöscht werden.",
      someNotDeletable: "Einige ausgewählte Unternehmen können nicht gelöscht werden.",
      deletedOne: "Unternehmen gelöscht.",
      deletedMany: "{count} Unternehmen gelöscht.",
      deletePartialError: "Einige Löschvorgänge sind fehlgeschlagen.",
      deleteError: "Löschen fehlgeschlagen"
    }
  },
  it: {
    bcp47: "it-IT",
    page: {
      title: "Gestione aziende",
      description: "Elencare, cercare ed eliminare le schede azienda.",
      refresh: "Aggiorna"
    },
    searchPlaceholder: "Cerca un'azienda…",
    searchAria: "Cerca un'azienda",
    enterpriseCount: "{count} azienda",
    enterpriseCountPlural: "{count} aziende",
    selectedCount: "{count} selezionata",
    selectedCountPlural: "{count} selezionate",
    deselectAll: "Deseleziona tutto",
    deleteSelection: "Elimina selezione",
    columns: {
      enterprise: "Azienda",
      deletion: "Eliminazione",
      linked: "Elementi collegati"
    },
    status: {
      allowed: "Consentita",
      blocked: "Bloccata"
    },
    linked: {
      none: "Nessuno",
      element: "elemento collegato",
      elements: "elementi collegati",
      detailTitle: "Vedi dettaglio elementi collegati",
      detailAria: "Dettaglio elementi collegati per {name}"
    },
    clientNumber: "N. {number}",
    selectDeletableAria: "Seleziona aziende eliminabili in questa pagina",
    selectEnterprise: "Seleziona {name}",
    notDeletable: "{name} non eliminabile",
    deleteEnterpriseTitle: "Elimina azienda",
    emptyLoading: "Caricamento aziende…",
    empty: "Nessuna azienda da visualizzare",
    pagination: {
      rowsPerPage: "Righe per pagina",
      range: "{start}–{end} di {total}",
      page: "Pagina {current} / {total}",
      prevAria: "Pagina precedente",
      nextAria: "Pagina successiva"
    },
    hint: "L'eliminazione standard è bloccata finché esistono elementi collegati. Puoi forzare l'eliminazione: anche gli elementi collegati (ticket, dispositivi, contatti, ecc.) verranno rimossi definitivamente.",
    deleteFallbackName: "questa azienda",
    forceDeleteEnterpriseTitle: "Forza eliminazione",
    forceBulkTitle: "Forza eliminazione di {count} aziende",
    forceBulkIntro: "Alcune aziende hanno elementi collegati. L'eliminazione forzata rimuoverà anche questi elementi in modo definitivo.",
    blockerLabels: {
      equipment_infra: "Equipaggiamento infrastruttura",
      equipment_cyber: "Cybersicurezza e backup",
      campaigns: "Campagne cybersicurezza",
      equipment_services: "Servizi cloud e IT",
      azure_tenant: "Tenant Microsoft / Azure",
      contacts: "Contatti",
      tickets: "Ticket supporto",
      events_upcoming: "Eventi imminenti",
      rmm_agents: "Agenti RMM",
      client_files: "File azienda"
    },
    blockersModal: {
      title: "Elementi collegati",
      subtitleDeletable: "Riepilogo delle risorse collegate a questa azienda.",
      subtitleBlocked: "Elementi attivi impediscono ancora l'eliminazione di questa azienda.",
      totalSingular: "elemento collegato in totale",
      totalPlural: "elementi collegati in totale",
      intro: "Rimuovi o riassegna i seguenti elementi, oppure forza l'eliminazione per cancellare tutto:",
      forceTitle: "Eliminazione forzata",
      forceDesc: "Elimina definitivamente l'azienda e gli elementi collegati (dispositivi, contatti, file, ecc.). I ticket sono conservati: il campo richiedente viene svuotato.",
      forceAck: "Capisco che questa azione è irreversibile e eliminerà anche gli elementi collegati.",
      forceDelete: "Forza eliminazione",
      forceDeleting: "Eliminazione…",
      close: "Chiudi",
      closeAria: "Chiudi"
    },
    toast: {
      loadError: "Impossibile caricare le aziende",
      noneDeletable: "Nessuna azienda selezionata può essere eliminata.",
      someNotDeletable: "Alcune aziende selezionate non possono essere eliminate.",
      deletedOne: "Azienda eliminata.",
      deletedMany: "{count} aziende eliminate.",
      deletePartialError: "Alcune eliminazioni non sono riuscite.",
      deleteError: "Eliminazione fallita"
    }
  },
  es: {
    bcp47: "es-ES",
    page: {
      title: "Gestión de empresas",
      description: "Listar, buscar y eliminar fichas de empresa.",
      refresh: "Actualizar"
    },
    searchPlaceholder: "Buscar una empresa…",
    searchAria: "Buscar una empresa",
    enterpriseCount: "{count} empresa",
    enterpriseCountPlural: "{count} empresas",
    selectedCount: "{count} seleccionada",
    selectedCountPlural: "{count} seleccionadas",
    deselectAll: "Deseleccionar todo",
    deleteSelection: "Eliminar selección",
    columns: {
      enterprise: "Empresa",
      deletion: "Eliminación",
      linked: "Elementos vinculados"
    },
    status: {
      allowed: "Permitida",
      blocked: "Bloqueada"
    },
    linked: {
      none: "Ninguno",
      element: "elemento vinculado",
      elements: "elementos vinculados",
      detailTitle: "Ver detalle de elementos vinculados",
      detailAria: "Detalle de elementos vinculados para {name}"
    },
    clientNumber: "N.º {number}",
    selectDeletableAria: "Seleccionar empresas eliminables en esta página",
    selectEnterprise: "Seleccionar {name}",
    notDeletable: "{name} no se puede eliminar",
    deleteEnterpriseTitle: "Eliminar empresa",
    emptyLoading: "Cargando empresas…",
    empty: "Ninguna empresa que mostrar",
    pagination: {
      rowsPerPage: "Filas por página",
      range: "{start}–{end} de {total}",
      page: "Página {current} / {total}",
      prevAria: "Página anterior",
      nextAria: "Página siguiente"
    },
    hint: "La eliminación estándar está bloqueada mientras existan elementos vinculados. Puede forzar la eliminación: también se eliminarán de forma permanente los elementos vinculados (tickets, equipos, contactos, etc.).",
    deleteFallbackName: "esta empresa",
    forceDeleteEnterpriseTitle: "Forzar eliminación",
    forceBulkTitle: "Forzar eliminación de {count} empresas",
    forceBulkIntro: "Algunas empresas tienen elementos vinculados. La eliminación forzada también borrará esos elementos de forma definitiva.",
    blockerLabels: {
      equipment_infra: "Equipos de infraestructura",
      equipment_cyber: "Ciberseguridad y copias",
      campaigns: "Campañas de ciberseguridad",
      equipment_services: "Servicios cloud e IT",
      azure_tenant: "Tenant Microsoft / Azure",
      contacts: "Contactos",
      tickets: "Tickets de soporte",
      events_upcoming: "Eventos próximos",
      rmm_agents: "Agentes RMM",
      client_files: "Archivos de empresa"
    },
    blockersModal: {
      title: "Elementos vinculados",
      subtitleDeletable: "Resumen de recursos vinculados a esta empresa.",
      subtitleBlocked: "Elementos activos impiden aún eliminar esta empresa.",
      totalSingular: "elemento vinculado en total",
      totalPlural: "elementos vinculados en total",
      intro: "Retire o reasigne los siguientes elementos, o fuerce la eliminación para borrar todo:",
      forceTitle: "Eliminación forzada",
      forceDesc: "Elimina definitivamente la empresa y los elementos vinculados (equipos, contactos, archivos, etc.). Los tickets se conservan: el campo solicitante se vacía.",
      forceAck: "Entiendo que esta acción es irreversible y también eliminará los elementos vinculados.",
      forceDelete: "Forzar eliminación",
      forceDeleting: "Eliminando…",
      close: "Cerrar",
      closeAria: "Cerrar"
    },
    toast: {
      loadError: "No se pueden cargar las empresas",
      noneDeletable: "Ninguna empresa seleccionada puede eliminarse.",
      someNotDeletable: "Algunas empresas seleccionadas no pueden eliminarse.",
      deletedOne: "Empresa eliminada.",
      deletedMany: "{count} empresas eliminadas.",
      deletePartialError: "Algunas eliminaciones fallaron.",
      deleteError: "Error al eliminar"
    }
  }
};
export const getAdminClientsCopy = createLocaleGetter(CLIENTS_COPY);
export function getBlockerLabel(locale, key, fallback = "") {
  const labels = getAdminClientsCopy(locale).blockerLabels || {};
  return labels[key] || fallback || key;
}
export function formatEnterpriseCount(locale, count) {
  const copy = getAdminClientsCopy(locale);
  return interpolate(count === 1 ? copy.enterpriseCount : copy.enterpriseCountPlural, {
    count
  });
}
export function formatSelectedCount(locale, count) {
  const copy = getAdminClientsCopy(locale);
  return interpolate(count === 1 ? copy.selectedCount : copy.selectedCountPlural, {
    count
  });
}
export function formatLinkedElementsLabel(locale, total) {
  const copy = getAdminClientsCopy(locale);
  const label = total > 1 ? copy.linked.elements : copy.linked.element;
  return `${total} ${label}`;
}
export { interpolate, BLOCKER_KEYS };
