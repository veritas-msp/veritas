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
    editPrestataire: "Éditer le prestataire",
    deleting: "Suppression…",
    deletePrestataire: "Supprimer le prestataire",
    confirmDelete: "Supprimer définitivement ce prestataire ?",
    companies: "Entreprises rattachées",
    noCompanies: "Aucune entreprise rattachée.",
    viewEnterprise: "Voir l'entreprise",
    infoTitle: "Informations",
    noInfo: "Aucune information complémentaire.",
    contactsTitle: "Contacts",
    noContacts: "Aucun contact renseigné.",
    contactFallback: "Contact",
    contactNoCoords: "Aucune coordonnée",
    fields: {
      type: "Type",
      contact: "Contact",
      email: "Email",
      phone: "Téléphone",
      website: "Site web",
      address: "Adresse",
      status: "Statut"
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
    editPrestataire: "Edit provider",
    deleting: "Deleting…",
    deletePrestataire: "Delete provider",
    confirmDelete: "Permanently delete this provider?",
    companies: "Linked companies",
    noCompanies: "No linked companies.",
    viewEnterprise: "View company",
    infoTitle: "Information",
    noInfo: "No additional information.",
    contactsTitle: "Contacts",
    noContacts: "No contacts yet.",
    contactFallback: "Contact",
    contactNoCoords: "No contact details",
    fields: {
      type: "Type",
      contact: "Contact",
      email: "Email",
      phone: "Phone",
      website: "Website",
      address: "Address",
      status: "Status"
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
