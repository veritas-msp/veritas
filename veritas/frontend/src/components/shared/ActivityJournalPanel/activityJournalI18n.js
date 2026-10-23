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
  colUser: "Utilisateur",
  colDate: "Date",
  columnsSettings: "Colonnes",
  table: {
    action: "Action",
    user: "Utilisateur",
    date: "Date"
  },
  columnsModal: {
    title: "Colonnes du journal",
    subtitle: "Choisissez les colonnes visibles dans le journal d’activité.",
    privateTab: "Vue privée",
    publicTab: "Vue publique",
    privateHintInactive: "Pas encore de vue privée : la vue publique s’affiche. Cochez des colonnes pour créer la vôtre.",
    privateHintActive: "Votre vue privée remplace la vue publique.",
    publicHint: "Colonnes visibles par défaut pour tous les utilisateurs sans vue privée.",
    adminOnly: "Seuls les administrateurs peuvent modifier la vue publique.",
    resetPrivate: "Revenir à la vue publique",
    resetSuccess: "Vue privée réinitialisée",
    savePrivateSuccess: "Vue privée enregistrée",
    savePublicSuccess: "Vue publique enregistrée",
    saveError: "Erreur lors de l’enregistrement des colonnes",
    atLeastOne: "Sélectionnez au moins une colonne.",
    reorderHint: "Glissez les lignes pour changer l’ordre des colonnes dans le tableau.",
    dragColumn: "Glisser la colonne {name}",
    save: "Enregistrer"
  },
  toasts: {
    loadColumns: "Erreur lors du chargement des colonnes"
  },
  systemUser: "Système",
  detailTitle: "Voir le détail du log",
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
  colUser: "User",
  colDate: "Date",
  columnsSettings: "Columns",
  table: {
    action: "Action",
    user: "User",
    date: "Date"
  },
  columnsModal: {
    title: "Journal columns",
    subtitle: "Choose which columns are visible in the activity journal.",
    privateTab: "Private view",
    publicTab: "Public view",
    privateHintInactive: "No private view yet — the public view is used. Toggle columns to create yours.",
    privateHintActive: "Your private columns override the public view.",
    publicHint: "Default columns for all users without a private view.",
    adminOnly: "Only administrators can edit the public view.",
    resetPrivate: "Use public view",
    resetSuccess: "Private view reset",
    savePrivateSuccess: "Private view saved",
    savePublicSuccess: "Public view saved",
    saveError: "Error while saving columns",
    atLeastOne: "Select at least one column.",
    reorderHint: "Drag rows to change the column order in the table.",
    dragColumn: "Drag column {name}",
    save: "Save"
  },
  toasts: {
    loadColumns: "Error loading columns"
  },
  systemUser: "System",
  detailTitle: "View log details",
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
  colUser: "Benutzer",
  colDate: "Datum"
};

const IT = {
  ...EN,
  title: "Registro attività",
  subtitle: "Cronologia di tutte le azioni su questa scheda.",
  purge: "Svuota",
  empty: "Nessun log",
  colAction: "Azione",
  colUser: "Utente",
  colDate: "Data"
};

const ES = {
  ...EN,
  title: "Diario de actividad",
  subtitle: "Historial de todas las acciones en esta ficha.",
  purge: "Purgar",
  empty: "Sin registros",
  colAction: "Acción",
  colUser: "Usuario",
  colDate: "Fecha"
};

export const getActivityJournalCopy = createLocaleGetter({ fr: FR, en: EN, de: DE, it: IT, es: ES });

export function interpolate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) =>
    values[key] == null ? `{${key}}` : String(values[key])
  );
}
