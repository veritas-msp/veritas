import { interpolate, pickLocaleMessages } from "../../i18n/translate";

const STATUS_FILTER_KEYS = ["active", "inactive"];
const STATUS_FILTER_META = {
  active: {
    icon: "mdi:check-circle",
    kpiTone: "green"
  },
  inactive: {
    icon: "mdi:close-circle",
    kpiTone: "gray"
  }
};

function normalizeStatusKey(statut) {
  const raw = String(statut || "").trim().toLowerCase();
  if (raw === "actif" || raw === "active") return "active";
  if (raw === "inactif" || raw === "inactive") return "inactive";
  return "inactive";
}

const PRESTATAIRES_COPY = {
  fr: {
    eyebrow: "Répertoire",
    pageTitle: "Prestataires",
    loadingPortfolio: "Chargement des prestataires…",
    subtitle: "{filtered} prestataire affiché sur {total}",
    subtitlePlural: "{filtered} prestataires affichés sur {total}",
    exportCsv: "Exporter en CSV",
    exportCsvAria: "Exporter CSV",
    columnsSettings: "Paramétrer les colonnes",
    columnsSettingsAria: "Paramétrer les colonnes du tableau",
    moreActions: "Plus d'actions",
    newPrestataire: "Nouveau prestataire",
    searchPlaceholder: "Prestataire, type, contact, statut…",
    searchAria: "Rechercher un prestataire",
    clearSearch: "Effacer la recherche",
    loading: "Chargement des prestataires…",
    emptyTitle: "Aucun prestataire trouvé",
    emptyHint: "Ajustez vos filtres ou créez un nouveau prestataire.",
    table: {
      name: "Nom",
      type: "Type",
      contact: "Contact",
      email: "Email",
      phone: "Téléphone",
      status: "Statut",
      enterprises: "Entreprises",
      actions: "Actions"
    },
    export: {
      filename: "prestataires.csv"
    },
    columnsModal: {
      title: "Colonnes du tableau",
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
    statusFilters: {
      active: "Actifs",
      inactive: "Inactifs"
    },
    prestataireStatus: {
      active: "Actif",
      inactive: "Inactif"
    },
    clipboard: {
      unavailable: "{label} indisponible",
      copied: "{label} copié",
      copyFailed: "Impossible de copier {label}"
    },
    clipboardLabels: {
      email: "Email",
      phone: "Téléphone"
    },
    share: {
      title: "Prestataire — {name}",
      unavailable: "Le partage n'est pas disponible sur cet appareil.",
      cancelled: "Partage annulé.",
      lines: {
        provider: "Prestataire",
        type: "Type",
        contact: "Contact",
        phone: "Téléphone",
        email: "Email",
        enterprises: "Entreprises",
        status: "Statut"
      }
    },
    actions: {
      copyEmail: "Copier l'email",
      copyPhone: "Copier le numéro",
      callPhone: "Appeler",
      callPhoneAria: "Appeler {phone}",
      sendEmail: "Envoyer un email",
      sendEmailAria: "Envoyer un email à {email}",
      copyCard: "Copier la fiche",
      copyCardAria: "Copier la fiche prestataire",
      shareCard: "Fiche prestataire",
      share: "Partager",
      shareAria: "Partager la fiche prestataire"
    },
    favorites: {
      add: "Ajouter aux favoris",
      remove: "Retirer des favoris",
      columnLabel: "Favoris",
      columnAria: "Favoris"
    },
    toasts: {
      bulkDeleteSuccess: "{count} prestataire supprimé",
      bulkDeleteSuccessPlural: "{count} prestataires supprimés",
      bulkPartial: "{updated} traités - {failed} échec(s)",
      bulkError: "Erreur lors de la suppression en masse",
      loadColumns: "Erreur lors du chargement des colonnes"
    },
    bulk: {
      selected: "prestataire sélectionné",
      selectedPlural: "prestataires sélectionnés",
      delete: "Supprimer",
      clearSelection: "Effacer la sélection",
      selectAll: "Tout sélectionner sur la page",
      selectRow: "Sélectionner {name}"
    },
    bulkDeleteModal: {
      title: "Supprimer les prestataires",
      subtitleOne: "1 prestataire sera définitivement supprimé.",
      subtitleMany: "{count} prestataires seront définitivement supprimés.",
      countOne: "1 prestataire",
      countMany: "{count} prestataires",
      consequences: "Conséquences",
      bullets: [
        "Les fiches prestataires seront supprimées",
        "Les liens avec les entreprises seront retirés",
        "Cette action est irréversible"
      ],
      cancel: "Annuler",
      confirm: "Supprimer",
      deleting: "Suppression...",
      close: "Fermer",
      submitError: "Impossible de supprimer les prestataires"
    },
    clientPrefix: "Client #",
    unnamed: "Sans nom"
  },
  en: {
    eyebrow: "Directory",
    pageTitle: "Providers",
    loadingPortfolio: "Loading providers…",
    subtitle: "{filtered} provider shown of {total}",
    subtitlePlural: "{filtered} providers shown of {total}",
    exportCsv: "Export as CSV",
    exportCsvAria: "Export CSV",
    columnsSettings: "Configure columns",
    columnsSettingsAria: "Configure table columns",
    moreActions: "More actions",
    newPrestataire: "New provider",
    searchPlaceholder: "Provider, type, contact, status…",
    searchAria: "Search for a provider",
    clearSearch: "Clear search",
    loading: "Loading providers…",
    emptyTitle: "No providers found",
    emptyHint: "Adjust your filters or create a new provider.",
    table: {
      name: "Name",
      type: "Type",
      contact: "Contact",
      email: "Email",
      phone: "Phone",
      status: "Status",
      enterprises: "Companies",
      actions: "Actions"
    },
    export: {
      filename: "providers.csv"
    },
    columnsModal: {
      title: "Table columns",
      subtitle: "Choose the columns visible in the providers list.",
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
      resetPrivate: "Revert to public view",
      resetSuccess: "Private view reset",
      savePrivateSuccess: "Private view saved",
      savePublicSuccess: "Public view saved",
      saveError: "Error saving columns",
      atLeastOne: "Select at least one column.",
      reorderHint: "Drag to reorder",
      dragColumn: "Drag column {name}",
      save: "Save"
    },
    statusFilters: {
      active: "Active",
      inactive: "Inactive"
    },
    prestataireStatus: {
      active: "Active",
      inactive: "Inactive"
    },
    clipboard: {
      unavailable: "{label} unavailable",
      copied: "{label} copied",
      copyFailed: "Unable to copy {label}"
    },
    clipboardLabels: {
      email: "Email",
      phone: "Phone"
    },
    share: {
      title: "Provider — {name}",
      unavailable: "Sharing is not available on this device.",
      cancelled: "Share cancelled.",
      lines: {
        provider: "Provider",
        type: "Type",
        contact: "Contact",
        phone: "Phone",
        email: "Email",
        enterprises: "Companies",
        status: "Status"
      }
    },
    actions: {
      copyEmail: "Copy email",
      copyPhone: "Copy phone number",
      callPhone: "Call",
      callPhoneAria: "Call {phone}",
      sendEmail: "Send email",
      sendEmailAria: "Send email to {email}",
      copyCard: "Copy card",
      copyCardAria: "Copy provider card",
      shareCard: "Provider card",
      share: "Share",
      shareAria: "Share provider card"
    },
    favorites: {
      add: "Add to favorites",
      remove: "Remove from favorites",
      columnLabel: "Favorites",
      columnAria: "Favorites"
    },
    toasts: {
      bulkDeleteSuccess: "{count} provider deleted",
      bulkDeleteSuccessPlural: "{count} providers deleted",
      bulkPartial: "{updated} processed - {failed} failed",
      bulkError: "Error during bulk deletion",
      loadColumns: "Error loading columns"
    },
    bulk: {
      selected: "provider selected",
      selectedPlural: "providers selected",
      delete: "Delete",
      clearSelection: "Clear selection",
      selectAll: "Select all on page",
      selectRow: "Select {name}"
    },
    bulkDeleteModal: {
      title: "Delete providers",
      subtitleOne: "1 provider will be permanently deleted.",
      subtitleMany: "{count} providers will be permanently deleted.",
      countOne: "1 provider",
      countMany: "{count} providers",
      consequences: "Consequences",
      bullets: [
        "Provider records will be deleted",
        "Links with companies will be removed",
        "This action cannot be undone"
      ],
      cancel: "Cancel",
      confirm: "Delete",
      deleting: "Deleting...",
      close: "Close",
      submitError: "Unable to delete providers"
    },
    clientPrefix: "Client #",
    unnamed: "Unnamed"
  }
};

export function getPrestatairePageCopy(locale) {
  const t = pickLocaleMessages(PRESTATAIRES_COPY, locale);
  return {
    ...t,
    statusFilters: STATUS_FILTER_KEYS.map(key => ({
      key,
      label: t.statusFilters[key],
      ...STATUS_FILTER_META[key]
    })),
    formatSubtitle: (filtered, total) => {
      const template = filtered === 1 ? t.subtitle : t.subtitlePlural;
      return interpolate(template, {
        filtered: String(filtered),
        total: String(total)
      });
    },
    getPrestataireStatus: statut => {
      const key = normalizeStatusKey(statut);
      return {
        key,
        label: t.prestataireStatus[key] || t.prestataireStatus.inactive
      };
    },
    getClientLabel: (clientId, clientName) => {
      if (clientName) return clientName;
      return clientId ? `${t.clientPrefix}${clientId}` : "";
    },
    formatBulkSelectRow: name => interpolate(t.bulk.selectRow, {
      name: String(name || "")
    }),
    formatBulkDeleteSuccess: count => interpolate(
      count > 1 ? t.toasts.bulkDeleteSuccessPlural : t.toasts.bulkDeleteSuccess,
      { count: String(count) }
    ),
    formatBulkPartial: (updated, failed) => interpolate(t.toasts.bulkPartial, {
      updated: String(updated),
      failed: String(failed)
    }),
    formatBulkDeleteSubtitle: count => {
      if (count === 1) return t.bulkDeleteModal.subtitleOne;
      return interpolate(t.bulkDeleteModal.subtitleMany, {
        count: String(count)
      });
    },
    formatBulkDeleteCount: count => {
      if (count === 1) return t.bulkDeleteModal.countOne;
      return interpolate(t.bulkDeleteModal.countMany, {
        count: String(count)
      });
    }
  };
}

export { normalizeStatusKey as normalizePrestataireStatusKey };
