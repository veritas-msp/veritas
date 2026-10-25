import { createLocaleGetter } from "../../../i18n/translate";

const FR = {
  title: "Journal d'activité",
  subtitle: "Historique de toutes les actions sur cette fiche.",
  purgeTitle: "Purger les logs",
  purge: "Purger",
  searchPlaceholder: "Rechercher une action, un utilisateur…",
  searchPlaceholderShort: "Rechercher",
  searchAria: "Rechercher dans les logs",
  clearSearch: "Effacer la recherche",
  emptyFiltered: "Aucun log correspondant",
  empty: "Aucun log",
  emptyFilteredHint: "Essayez d'élargir la recherche.",
  emptyHint: "Les créations, modifications et actions apparaîtront ici.",
  colAction: "Action",
  colField: "Champ",
  colUser: "Utilisateur",
  colDate: "Date",
  columnsSettings: "Colonnes",
  table: {
    action: "Action",
    field: "Champ",
    user: "Utilisateur",
    date: "Date"
  },
  columnsModal: {
    title: "Colonnes du journal",
    subtitle: "Cochez les colonnes à afficher et glissez-les pour changer l'ordre.",
    privateTab: "Vue privée",
    publicTab: "Vue publique",
    privateTabMeta: "Pour moi",
    publicTabMeta: "Pour l'équipe",
    privateExplain: "La vue privée est personnelle : tout agent peut l'utiliser, elle ne change les colonnes que pour lui.",
    publicExplain: "La vue publique définit les colonnes par défaut pour toute l'équipe.",
    privateStatusActive: "Active — elle remplace la vue publique pour vous.",
    privateStatusInactive: "Pas encore définie — vous voyez actuellement la vue publique.",
    listHeading: "Colonnes",
    tabsAria: "Type de vue",
    adminOnly: "Vous n'avez pas la permission de modifier la vue publique (Administration → Permissions).",
      publicReadOnlyStatus: "Lecture seule — modification réservée via Administration → Permissions.",
      readOnlyHint: "Lecture seule",
    resetPrivate: "Revenir à la vue publique",
    resetSuccess: "Vue privée réinitialisée",
    savePrivateSuccess: "Vue privée enregistrée",
    savePublicSuccess: "Vue publique enregistrée",
    saveError: "Erreur lors de l’enregistrement des colonnes",
    atLeastOne: "Sélectionnez au moins une colonne.",
    reorderHint: "Glissez pour réordonner",
    dragColumn: "Glisser la colonne {name}",
    save: "Enregistrer"
  },
  toasts: {
    loadColumns: "Erreur lors du chargement des colonnes"
  },
  systemUser: "Système",
  detailTitle: "Voir le détail du log",
  detailModal: {
    eyebrow: "Journal",
    title: "Détail du log",
    subtitle: "Informations de l'entrée sélectionnée.",
    sectionsNavAria: "Sections du log",
    sections: {
      summary: {
        navLabel: "Résumé",
        title: "Résumé",
        desc: "Action, auteur et date de l'entrée."
      },
      description: {
        navLabel: "Description",
        title: "Description",
        desc: "Message associé à cette action."
      },
      details: {
        navLabel: "Détails",
        title: "Détails",
        desc: "Valeurs et métadonnées de l'action."
      }
    },
    actionLabel: "Action",
    userLabel: "Utilisateur",
    dateLabel: "Date et heure",
    descriptionLabel: "Description",
    detailsLabel: "Détails",
    emptyDetails: "Aucun détail supplémentaire.",
    footerHint: "",
    close: "Fermer",
    closeAria: "Fermer"
  },
  perPage: "Par page",
  rangeInfo: "{start}–{end} sur {total}",
  pageInfo: "Page {current} / {total}",
  pagination: "Page {page} sur {pages} ({total} actions)",
  prevPage: "Page précédente",
  nextPage: "Page suivante",
  loading: "Chargement…",
  loadError: "Impossible de charger le journal",
  purgeNone: "Aucun log à supprimer",
  purgeSuccess: "{count} log(s) supprimé(s)",
  purgeError: "Erreur lors de la purge",
  purgeConfirmTitle: "Purger le journal ?",
  purgeConfirmMessage: "Supprimer définitivement {count} entrée(s) du journal ?"
};

const EN = {
  title: "Activity journal",
  subtitle: "History of every action on this record.",
  purgeTitle: "Purge logs",
  purge: "Purge",
  searchPlaceholder: "Search an action, a user…",
  searchPlaceholderShort: "Search",
  searchAria: "Search logs",
  clearSearch: "Clear search",
  emptyFiltered: "No matching logs",
  empty: "No logs",
  emptyFilteredHint: "Try broadening your search.",
  emptyHint: "Creates, edits and actions will appear here.",
  colAction: "Action",
  colField: "Field",
  colUser: "User",
  colDate: "Date",
  columnsSettings: "Columns",
  table: {
    action: "Action",
    field: "Field",
    user: "User",
    date: "Date"
  },
  columnsModal: {
    title: "Journal columns",
    subtitle: "Choose which columns are visible in the activity journal.",
    privateTab: "Private view",
    publicTab: "Public view",
    privateTabMeta: "Just me",
    publicTabMeta: "Whole team",
    privateExplain: "The private view is personal: any agent can use it, and it only changes columns for them.",
    publicExplain: "The public view sets the default columns for the whole team.",
    privateStatusActive: "Active — it overrides the public view for you.",
    privateStatusInactive: "Not set yet — you currently see the public view.",
    listHeading: "Columns",
    tabsAria: "View type",
    adminOnly: "You do not have permission to edit the public view (Administration → Permissions).",
      publicReadOnlyStatus: "Read-only — editing requires Administration → Permissions.",
      readOnlyHint: "Read-only",
    resetPrivate: "Use public view",
    resetSuccess: "Private view reset",
    savePrivateSuccess: "Private view saved",
    savePublicSuccess: "Public view saved",
    saveError: "Error while saving columns",
    atLeastOne: "Select at least one column.",
    reorderHint: "Drag to reorder",
    dragColumn: "Drag column {name}",
    save: "Save"
  },
  toasts: {
    loadColumns: "Error loading columns"
  },
  systemUser: "System",
  detailTitle: "View log details",
  detailModal: {
    eyebrow: "Journal",
    title: "Log details",
    subtitle: "Information for the selected entry.",
    sectionsNavAria: "Log sections",
    sections: {
      summary: {
        navLabel: "Summary",
        title: "Summary",
        desc: "Action, author and entry date."
      },
      description: {
        navLabel: "Description",
        title: "Description",
        desc: "Message linked to this action."
      },
      details: {
        navLabel: "Details",
        title: "Details",
        desc: "Values and metadata for this action."
      }
    },
    actionLabel: "Action",
    userLabel: "User",
    dateLabel: "Date and time",
    descriptionLabel: "Description",
    detailsLabel: "Details",
    emptyDetails: "No additional details.",
    footerHint: "",
    close: "Close",
    closeAria: "Close"
  },
  perPage: "Per page",
  rangeInfo: "{start}–{end} of {total}",
  pageInfo: "Page {current} / {total}",
  pagination: "Page {page} of {pages} ({total} actions)",
  prevPage: "Previous page",
  nextPage: "Next page",
  loading: "Loading…",
  loadError: "Unable to load the journal",
  purgeNone: "No logs to delete",
  purgeSuccess: "{count} log(s) deleted",
  purgeError: "Failed to purge logs",
  purgeConfirmTitle: "Purge journal?",
  purgeConfirmMessage: "Permanently delete {count} journal entr(y/ies)?"
};

const DE = {
  ...EN,
  title: "Aktivitätsjournal",
  subtitle: "Verlauf aller Aktionen zu diesem Datensatz.",
  purge: "Leeren",
  empty: "Keine Logs",
  colAction: "Aktion",
  colField: "Feld",
  colUser: "Benutzer",
  colDate: "Datum",
  table: {
    ...EN.table,
    action: "Aktion",
    field: "Feld",
    user: "Benutzer",
    date: "Datum"
  }
};

const IT = {
  ...EN,
  title: "Registro attività",
  subtitle: "Cronologia di tutte le azioni su questa scheda.",
  purge: "Svuota",
  empty: "Nessun log",
  colAction: "Azione",
  colField: "Campo",
  colUser: "Utente",
  colDate: "Data",
  table: {
    ...EN.table,
    action: "Azione",
    field: "Campo",
    user: "Utente",
    date: "Data"
  }
};

const ES = {
  ...EN,
  title: "Diario de actividad",
  subtitle: "Historial de todas las acciones en esta ficha.",
  purge: "Purgar",
  empty: "Sin registros",
  colAction: "Acción",
  colField: "Campo",
  colUser: "Usuario",
  colDate: "Fecha",
  table: {
    ...EN.table,
    action: "Acción",
    field: "Campo",
    user: "Usuario",
    date: "Fecha"
  }
};

export const getActivityJournalCopy = createLocaleGetter({ fr: FR, en: EN, de: DE, it: IT, es: ES });

export function interpolate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) =>
    values[key] == null ? `{${key}}` : String(values[key])
  );
}
