import { createLocaleGetter } from "../../../i18n/translate";

const FR = {
  title: "Journal d'activité",
  subtitle: "Historique de toutes les actions sur cette fiche.",
  purgeTitle: "Purger les logs",
  purge: "Purger",
  searchPlaceholder: "Rechercher une action, un utilisateur…",
  searchAria: "Rechercher dans les logs",
  clearSearch: "Effacer la recherche",
  emptyFiltered: "Aucun log correspondant",
  empty: "Aucun log",
  emptyFilteredHint: "Essayez d'élargir la recherche.",
  emptyHint: "Les créations, modifications et actions apparaîtront ici.",
  colAction: "Action",
  colUser: "Utilisateur",
  colDate: "Date",
  systemUser: "Système",
  detailTitle: "Voir le détail du log",
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
  searchAria: "Search logs",
  clearSearch: "Clear search",
  emptyFiltered: "No matching logs",
  empty: "No logs",
  emptyFilteredHint: "Try broadening your search.",
  emptyHint: "Creates, edits and actions will appear here.",
  colAction: "Action",
  colUser: "User",
  colDate: "Date",
  systemUser: "System",
  detailTitle: "View log details",
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
