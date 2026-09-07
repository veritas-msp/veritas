import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { PRESTATAIRE_FORM_SECTIONS } from "./prestataireFormConfig";

const FORM_COPY = {
  fr: {
    eyebrow: "Prestataires",
    close: "Fermer",
    navAria: "Sections du formulaire",
    createTitle: "Nouveau prestataire",
    editTitle: "Modifier le prestataire",
    createSubtitle: "Renseignez les informations du prestataire.",
    editSubtitle: "Mettez à jour la fiche prestataire.",
    nameLabel: "Nom",
    namePlaceholder: "Nom du prestataire",
    typeLabel: "Type",
    typePlaceholder: "Ex. hébergeur, opérateur…",
    contactLastName: "Nom",
    contactFirstName: "Prénom",
    contactLastNamePlaceholder: "Nom",
    contactFirstNamePlaceholder: "Prénom",
    emailLabel: "Email",
    emailPlaceholder: "contact@exemple.com",
    phoneLabel: "Téléphone",
    phonePlaceholder: "+33…",
    websiteLabel: "Site web",
    websitePlaceholder: "https://…",
    addressLabel: "Adresse",
    addressPlaceholder: "Adresse postale",
    contactsHint: "Ajoutez une ou plusieurs personnes à contacter chez ce prestataire.",
    addContact: "Ajouter un contact",
    removeContactAria: "Retirer le contact",
    contactCardTitle: "Contact {index}",
    emptyContacts: "Aucun contact pour le moment.",
    companiesLabel: "Entreprises rattachées",
    addCompany: "Ajouter une entreprise",
    searchEnterprise: "Rechercher une entreprise…",
    noEnterprise: "Aucune entreprise disponible",
    enterpriseHint: "Rattachez une ou plusieurs entreprises à ce prestataire.",
    enterpriseLockedHint: "Le prestataire sera rattaché à cette entreprise.",
    currentClient: "Entreprise actuelle",
    removeCompanyAria: "Retirer {name}",
    statutActive: "Actif",
    statutInactive: "Inactif",
    statusInactiveHint: "Un prestataire inactif reste visible mais n'apparaît plus dans les filtres actifs.",
    footerUnsaved: "Modifications non enregistrées",
    footerNoChanges: "Aucune modification",
    createPrestataire: "Créer le prestataire",
    validation: {
      nameRequired: "Le nom du prestataire est obligatoire."
    },
    successCreate: "Prestataire créé",
    successUpdate: "Prestataire mis à jour",
    errorSave: "Impossible d'enregistrer le prestataire",
    getClientLabel: id => (id != null ? `Client #${id}` : ""),
    sections: {
      identity: {
        label: "Identité",
        description: "Nom et type du prestataire"
      },
      contacts: {
        label: "Contacts",
        description: "Personnes à contacter chez le prestataire"
      },
      coordinates: {
        label: "Coordonnées",
        description: "Site web et adresse"
      },
      enterprise: {
        label: "Entreprises",
        description: "Entreprises rattachées"
      },
      status: {
        label: "Statut",
        description: "Actif ou inactif"
      }
    }
  },
  en: {
    eyebrow: "Providers",
    close: "Close",
    navAria: "Form sections",
    createTitle: "New provider",
    editTitle: "Edit provider",
    createSubtitle: "Fill in the provider details.",
    editSubtitle: "Update the provider record.",
    nameLabel: "Name",
    namePlaceholder: "Provider name",
    typeLabel: "Type",
    typePlaceholder: "e.g. hoster, carrier…",
    contactLastName: "Last name",
    contactFirstName: "First name",
    contactLastNamePlaceholder: "Last name",
    contactFirstNamePlaceholder: "First name",
    emailLabel: "Email",
    emailPlaceholder: "contact@example.com",
    phoneLabel: "Phone",
    phonePlaceholder: "+1…",
    websiteLabel: "Website",
    websitePlaceholder: "https://…",
    addressLabel: "Address",
    addressPlaceholder: "Postal address",
    contactsHint: "Add one or more people to contact at this provider.",
    addContact: "Add a contact",
    removeContactAria: "Remove contact",
    contactCardTitle: "Contact {index}",
    emptyContacts: "No contacts yet.",
    companiesLabel: "Linked companies",
    addCompany: "Add a company",
    searchEnterprise: "Search for a company…",
    noEnterprise: "No company available",
    enterpriseHint: "Link one or more companies to this provider.",
    enterpriseLockedHint: "The provider will be linked to this company.",
    currentClient: "Current company",
    removeCompanyAria: "Remove {name}",
    statutActive: "Active",
    statutInactive: "Inactive",
    statusInactiveHint: "An inactive provider remains visible but is filtered out of active views.",
    footerUnsaved: "Unsaved changes",
    footerNoChanges: "No changes",
    createPrestataire: "Create provider",
    validation: {
      nameRequired: "Provider name is required."
    },
    successCreate: "Provider created",
    successUpdate: "Provider updated",
    errorSave: "Unable to save provider",
    getClientLabel: id => (id != null ? `Client #${id}` : ""),
    sections: {
      identity: {
        label: "Identity",
        description: "Provider name and type"
      },
      contacts: {
        label: "Contacts",
        description: "People to contact at this provider"
      },
      coordinates: {
        label: "Details",
        description: "Website and address"
      },
      enterprise: {
        label: "Companies",
        description: "Linked companies"
      },
      status: {
        label: "Status",
        description: "Active or inactive"
      }
    }
  }
};

export function getPrestataireFormModalCopy(locale) {
  const t = pickLocaleMessages(FORM_COPY, locale);
  return {
    ...t,
    modalTitle: isEditing => (isEditing ? t.editTitle : t.createTitle),
    modalSubtitle: isEditing => (isEditing ? t.editSubtitle : t.createSubtitle),
    successMessage: isEditing => (isEditing ? t.successUpdate : t.successCreate)
  };
}

export function getPrestataireFormSections(locale) {
  const t = pickLocaleMessages(FORM_COPY, locale);
  return PRESTATAIRE_FORM_SECTIONS.map(section => ({
    ...section,
    label: t.sections?.[section.id]?.label || section.label,
    description: t.sections?.[section.id]?.description || section.description
  }));
}

export { interpolate };
