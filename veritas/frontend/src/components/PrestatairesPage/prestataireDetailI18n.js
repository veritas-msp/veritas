import { createLocaleGetter, interpolate } from "../../i18n/translate";

const DETAIL_COPY = {
  fr: {
    loading: "Chargement de la fiche prestataire…",
    notFound: "Prestataire non trouvé",
    loadError: "Erreur lors du chargement du prestataire",
    defaultName: "Prestataire",
    status: {
      active: "Actif",
      inactive: "Inactif"
    },
    heroMetaAria: "Informations du prestataire",
    actionsMenu: "Actions sur le prestataire",
    quickActions: {
      title: "Actions rapides",
      seeAll: "Voir toutes les actions",
      editPrestataire: "Éditer le prestataire",
      sendEmail: "Envoyer un email",
      openWebsite: "Ouvrir le site web",
      deletePrestataire: "Supprimer le prestataire"
    },
    editPrestataire: "Éditer le prestataire",
    deleting: "Suppression…",
    deletePrestataire: "Supprimer le prestataire",
    confirmDelete: "Supprimer définitivement ce prestataire ?",
    overviewTabsAria: "Sections de la fiche prestataire",
    overviewTabActivity: "Activité",
    overviewTabLogs: "Logs",
    activityTitle: "Activité",
    kpiTicketsTotal: "Tickets mentionnés",
    kpiTicketsOpen: "Tickets ouverts",
    kpiCompanies: "Entreprises",
    kpiContacts: "Contacts",
    mentionedTicketsTitle: "Tickets mentionnés",
    mentionedTicketsHint: "Tickets où ce prestataire apparaît (side conversations).",
    activitySearchPlaceholder: "Rechercher",
    activityClearSearchAria: "Effacer la recherche",
    activityFilterAll: "Tous",
    activityFilterOpen: "Ouverts",
    activityFilterClosed: "Clos",
    activityFilterStatusAria: "Filtrer par statut",
    activityPerPage: "Par page",
    activityPrevPage: "Page précédente",
    activityNextPage: "Page suivante",
    activityPageInfo: "Page {current} / {total}",
    activityRangeInfo: "{start}–{end} sur {total}",
    emptyActivitySearch: "Aucun résultat pour cette recherche.",
    openCount: "{count} ouverts",
    emptyMentionedTickets: "Aucune mention dans un ticket.",
    sideConversationsCount: "{count} side conv.",
    companies: "Entreprises",
    companiesCount: "{count} entreprise(s)",
    noCompanies: "Aucune entreprise rattachée.",
    viewEnterprise: "Voir l'entreprise",
    sidebarInfo: "Informations",
    infoTitle: "Informations",
    noInfo: "Aucune information complémentaire.",
    contactsTitle: "Contacts",
    noContacts: "Aucun contact renseigné.",
    contactFallback: "Contact",
    contactNoCoords: "Aucune coordonnée",
    table: {
      number: "N°",
      title: "Titre",
      status: "Statut",
      company: "Entreprise",
      sideConv: "Side conv.",
      updated: "Mis à jour"
    },
    fields: {
      type: "Type",
      contact: "Contact",
      email: "Email",
      phone: "Téléphone",
      website: "Site web",
      address: "Adresse",
      status: "Statut",
      notes: "Notes"
    },
    attachModal: {
      eyebrow: "Prestataires",
      title: "Rattacher un prestataire",
      subtitleDefault: "Choisissez un prestataire existant à lier à cette entreprise.",
      subtitleWithName: "Lier un prestataire à {name}.",
      search: "Rechercher",
      searchPlaceholder: "Nom, type, contact…",
      loading: "Chargement des prestataires…",
      empty: "Aucun prestataire disponible à rattacher.",
      noResults: "Aucun résultat pour cette recherche.",
      close: "Fermer",
      alreadyLinked: "Déjà rattaché"
    },
    toast: {
      deleted: "Prestataire supprimé",
      deleteError: "Impossible de supprimer le prestataire",
      updated: "Prestataire mis à jour",
      linked: "Prestataire rattaché",
      linkError: "Impossible de rattacher le prestataire"
    }
  },
  en: {
    loading: "Loading provider…",
    notFound: "Provider not found",
    loadError: "Error loading provider",
    defaultName: "Provider",
    status: {
      active: "Active",
      inactive: "Inactive"
    },
    heroMetaAria: "Provider information",
    actionsMenu: "Provider actions",
    quickActions: {
      title: "Quick actions",
      seeAll: "See all actions",
      editPrestataire: "Edit provider",
      sendEmail: "Send an email",
      openWebsite: "Open website",
      deletePrestataire: "Delete provider"
    },
    editPrestataire: "Edit provider",
    deleting: "Deleting…",
    deletePrestataire: "Delete provider",
    confirmDelete: "Permanently delete this provider?",
    overviewTabsAria: "Provider detail sections",
    overviewTabActivity: "Activity",
    overviewTabLogs: "Logs",
    activityTitle: "Activity",
    kpiTicketsTotal: "Mentioned tickets",
    kpiTicketsOpen: "Open tickets",
    kpiCompanies: "Companies",
    kpiContacts: "Contacts",
    mentionedTicketsTitle: "Mentioned tickets",
    mentionedTicketsHint: "Tickets where this provider appears (side conversations).",
    activitySearchPlaceholder: "Search",
    activityClearSearchAria: "Clear search",
    activityFilterAll: "All",
    activityFilterOpen: "Open",
    activityFilterClosed: "Closed",
    activityFilterStatusAria: "Filter by status",
    activityPerPage: "Per page",
    activityPrevPage: "Previous page",
    activityNextPage: "Next page",
    activityPageInfo: "Page {current} / {total}",
    activityRangeInfo: "{start}–{end} of {total}",
    emptyActivitySearch: "No results for this search.",
    openCount: "{count} open",
    emptyMentionedTickets: "No ticket mentions yet.",
    sideConversationsCount: "{count} side conv.",
    companies: "Companies",
    companiesCount: "{count} company(ies)",
    noCompanies: "No linked companies.",
    viewEnterprise: "View company",
    sidebarInfo: "Information",
    infoTitle: "Information",
    noInfo: "No additional information.",
    contactsTitle: "Contacts",
    noContacts: "No contacts yet.",
    contactFallback: "Contact",
    contactNoCoords: "No contact details",
    table: {
      number: "No.",
      title: "Title",
      status: "Status",
      company: "Company",
      sideConv: "Side conv.",
      updated: "Updated"
    },
    fields: {
      type: "Type",
      contact: "Contact",
      email: "Email",
      phone: "Phone",
      website: "Website",
      address: "Address",
      status: "Status",
      notes: "Notes"
    },
    attachModal: {
      eyebrow: "Providers",
      title: "Link a provider",
      subtitleDefault: "Choose an existing provider to link to this company.",
      subtitleWithName: "Link a provider to {name}.",
      search: "Search",
      searchPlaceholder: "Name, type, contact…",
      loading: "Loading providers…",
      empty: "No provider available to link.",
      noResults: "No results for this search.",
      close: "Close",
      alreadyLinked: "Already linked"
    },
    toast: {
      deleted: "Provider deleted",
      deleteError: "Unable to delete provider",
      updated: "Provider updated",
      linked: "Provider linked",
      linkError: "Unable to link provider"
    }
  }
};

const getCopy = createLocaleGetter(DETAIL_COPY);

export function getPrestataireDetailCopy(locale) {
  return getCopy(locale);
}

export function getPrestataireStatusLocalized(statut, locale) {
  const copy = getCopy(locale);
  const raw = String(statut || "").trim().toLowerCase();
  const active = raw === "actif" || raw === "active";
  return {
    status: active ? "active" : "inactive",
    label: active ? copy.status.active : copy.status.inactive
  };
}

export { interpolate };
