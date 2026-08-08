import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SITES_MODAL_COPY = {
  fr: {
    title: "Lieux & implantations",
    subtitle: "Adresses et position sur la carte.",
    add: "Ajouter",
    emptyState: "Aucun lieu enregistré",
    placeholder: "Sélectionnez un lieu ou créez-en un nouveau pour modifier l'adresse et afficher la carte.",
    newSite: "Nouveau lieu",
    editSite: "Modifier le lieu",
    addSite: "Ajouter le lieu",
    applyChanges: "Appliquer les modifications",
    primary: "Principal",
    editor: {
      nameLabel: "Nom du lieu",
      namePlaceholder: "Siège, entrepôt, agence Paris…",
      addressLabel: "Adresse",
      addressPlaceholder: "12 rue de la République",
      postalCodeLabel: "Code postal",
      postalCodePlaceholder: "75001",
      cityLabel: "Ville",
      cityPlaceholder: "Paris",
      countryLabel: "Pays",
      countryPlaceholder: "France",
      defaultCountry: "France",
      primaryLabel: "Lieu principal",
      mapPreview: "Aperçu carte",
      locating: "Localisation…",
      refreshPosition: "Actualiser la position",
      mapUnavailable: "Carte indisponible",
      locateAddress: "Localiser l'adresse",
      openMap: "Ouvrir la carte",
      enlargeMap: "Agrandir la carte",
      mapFrameTitle: "Carte · {label}",
      closeMap: "Fermer la carte",
      interactiveMapTitle: "Carte interactive · {label}",
      openInOsm: "Ouvrir dans OpenStreetMap"
    },
    drag: {
      reorderAria: "Réordonner {name}",
      finishEditing: "Terminez l'édition en cours",
      dragToReorder: "Glisser pour réordonner"
    },
    limits: {
      warn: "Limite Community : {max} lieux maximum par entreprise. Passez à Veritas Pro pour en ajouter davantage.",
      tooltip: "Limite Community : {max} lieux par entreprise",
      reached: "Limite Community atteinte · {max} lieux par entreprise."
    },
    countOne: "{count} lieu",
    countMany: "{count} lieux",
    countWithMaxOne: "{count} / {max} lieu",
    countWithMaxMany: "{count} / {max} lieux",
    saveBlockedTitle: "Terminez ou annulez la modification du lieu en cours avant d'enregistrer",
    toasts: {
      nameRequired: "Renseignez le nom du lieu.",
      positionUpdated: "Position mise à jour sur la carte.",
      geocodeFailed: "Impossible de localiser cette adresse.",
      finishEditFirst: "Enregistrez ou annulez la modification en cours.",
      saveFailed: "Impossible d'enregistrer les lieux."
    }
  },
  en: {
    title: "Sites & locations",
    subtitle: "Addresses and map position.",
    add: "Add",
    emptyState: "No location saved",
    placeholder: "Select a location or create a new one to edit the address and view the map.",
    newSite: "New location",
    editSite: "Edit location",
    addSite: "Add location",
    applyChanges: "Apply changes",
    primary: "Primary",
    editor: {
      nameLabel: "Location name",
      namePlaceholder: "Head office, warehouse, London branch…",
      addressLabel: "Address",
      addressPlaceholder: "10 Downing Street",
      postalCodeLabel: "Postal code",
      postalCodePlaceholder: "SW1A 2AA",
      cityLabel: "City",
      cityPlaceholder: "London",
      countryLabel: "Country",
      countryPlaceholder: "United Kingdom",
      defaultCountry: "United Kingdom",
      primaryLabel: "Primary location",
      mapPreview: "Map preview",
      locating: "Locating…",
      refreshPosition: "Refresh position",
      mapUnavailable: "Map unavailable",
      locateAddress: "Locate address",
      openMap: "Open map",
      enlargeMap: "Enlarge map",
      mapFrameTitle: "Map · {label}",
      closeMap: "Close map",
      interactiveMapTitle: "Interactive map · {label}",
      openInOsm: "Open in OpenStreetMap"
    },
    drag: {
      reorderAria: "Reorder {name}",
      finishEditing: "Finish the current edit first",
      dragToReorder: "Drag to reorder"
    },
    limits: {
      warn: "Community limit: {max} locations maximum per company. Upgrade to Veritas Pro to add more.",
      tooltip: "Community limit: {max} locations per company",
      reached: "Community limit reached · {max} locations per company."
    },
    countOne: "{count} location",
    countMany: "{count} locations",
    countWithMaxOne: "{count} / {max} location",
    countWithMaxMany: "{count} / {max} locations",
    saveBlockedTitle: "Finish or cancel the current location edit before saving",
    toasts: {
      nameRequired: "Enter the location name.",
      positionUpdated: "Map position updated.",
      geocodeFailed: "Unable to locate this address.",
      finishEditFirst: "Save or cancel the current edit first.",
      saveFailed: "Unable to save locations."
    }
  },
  de: {
    title: "Standorte & Niederlassungen",
    subtitle: "Adressen und Position auf der Karte.",
    add: "Hinzufügen",
    emptyState: "Kein Standort gespeichert",
    placeholder: "Wählen Sie einen Standort oder erstellen Sie einen neuen, um die Adresse zu bearbeiten und die Karte anzuzeigen.",
    newSite: "Neuer Standort",
    editSite: "Standort bearbeiten",
    addSite: "Standort hinzufügen",
    applyChanges: "Änderungen übernehmen",
    primary: "Hauptstandort",
    editor: {
      nameLabel: "Standortname",
      namePlaceholder: "Hauptsitz, Lager, Niederlassung Berlin…",
      addressLabel: "Adresse",
      addressPlaceholder: "Friedrichstraße 12",
      postalCodeLabel: "Postleitzahl",
      postalCodePlaceholder: "10117",
      cityLabel: "Stadt",
      cityPlaceholder: "Berlin",
      countryLabel: "Land",
      countryPlaceholder: "Deutschland",
      defaultCountry: "Deutschland",
      primaryLabel: "Hauptstandort",
      mapPreview: "Kartenvorschau",
      locating: "Lokalisierung…",
      refreshPosition: "Position aktualisieren",
      mapUnavailable: "Karte nicht verfügbar",
      locateAddress: "Adresse lokalisieren",
      openMap: "Karte öffnen",
      enlargeMap: "Karte vergrößern",
      mapFrameTitle: "Karte · {label}",
      closeMap: "Karte schließen",
      interactiveMapTitle: "Interaktive Karte · {label}",
      openInOsm: "In OpenStreetMap öffnen"
    },
    drag: {
      reorderAria: "{name} neu anordnen",
      finishEditing: "Bearbeitung zuerst abschließen",
      dragToReorder: "Zum Neuordnen ziehen"
    },
    limits: {
      warn: "Community-Limit: maximal {max} Standorte pro Unternehmen. Wechseln Sie zu Veritas Pro für mehr.",
      tooltip: "Community-Limit: {max} Standorte pro Unternehmen",
      reached: "Community-Limit erreicht · {max} Standorte pro Unternehmen."
    },
    countOne: "{count} Standort",
    countMany: "{count} Standorte",
    countWithMaxOne: "{count} / {max} Standort",
    countWithMaxMany: "{count} / {max} Standorte",
    saveBlockedTitle: "Schließen Sie die laufende Standortbearbeitung ab oder brechen Sie sie ab, bevor Sie speichern",
    toasts: {
      nameRequired: "Geben Sie den Standortnamen ein.",
      positionUpdated: "Kartenposition aktualisiert.",
      geocodeFailed: "Diese Adresse konnte nicht lokalisiert werden.",
      finishEditFirst: "Speichern oder brechen Sie die laufende Bearbeitung ab.",
      saveFailed: "Standorte konnten nicht gespeichert werden."
    }
  },
  it: {
    title: "Sedi e implantazioni",
    subtitle: "Indirizzi e posizione sulla mappa.",
    add: "Aggiungi",
    emptyState: "Nessuna sede registrata",
    placeholder: "Seleziona una sede o creane una nuova per modificare l'indirizzo e visualizzare la mappa.",
    newSite: "Nuova sede",
    editSite: "Modifica sede",
    addSite: "Aggiungi sede",
    applyChanges: "Applica modifiche",
    primary: "Principale",
    editor: {
      nameLabel: "Nome della sede",
      namePlaceholder: "Sede, magazzino, filiale Roma…",
      addressLabel: "Indirizzo",
      addressPlaceholder: "Via del Corso 12",
      postalCodeLabel: "CAP",
      postalCodePlaceholder: "00186",
      cityLabel: "Città",
      cityPlaceholder: "Roma",
      countryLabel: "Paese",
      countryPlaceholder: "Italia",
      defaultCountry: "Italia",
      primaryLabel: "Sede principale",
      mapPreview: "Anteprima mappa",
      locating: "Localizzazione…",
      refreshPosition: "Aggiorna posizione",
      mapUnavailable: "Mappa non disponibile",
      locateAddress: "Localizza indirizzo",
      openMap: "Apri mappa",
      enlargeMap: "Ingrandisci mappa",
      mapFrameTitle: "Mappa · {label}",
      closeMap: "Chiudi mappa",
      interactiveMapTitle: "Mappa interattiva · {label}",
      openInOsm: "Apri in OpenStreetMap"
    },
    drag: {
      reorderAria: "Riordina {name}",
      finishEditing: "Termina prima la modifica in corso",
      dragToReorder: "Trascina per riordinare"
    },
    limits: {
      warn: "Limite Community: massimo {max} sedi per azienda. Passa a Veritas Pro per aggiungerne altre.",
      tooltip: "Limite Community: {max} sedi per azienda",
      reached: "Limite Community raggiunto · {max} sedi per azienda."
    },
    countOne: "{count} sede",
    countMany: "{count} sedi",
    countWithMaxOne: "{count} / {max} sede",
    countWithMaxMany: "{count} / {max} sedi",
    saveBlockedTitle: "Termina o annulla la modifica della sede in corso prima di salvare",
    toasts: {
      nameRequired: "Inserisci il nome della sede.",
      positionUpdated: "Posizione sulla mappa aggiornata.",
      geocodeFailed: "Impossibile localizzare questo indirizzo.",
      finishEditFirst: "Salva o annulla la modifica in corso.",
      saveFailed: "Impossibile salvare le sedi."
    }
  },
  es: {
    title: "Ubicaciones e implantaciones",
    subtitle: "Direcciones y posición en el mapa.",
    add: "Añadir",
    emptyState: "Ninguna ubicación registrada",
    placeholder: "Seleccione una ubicación o cree una nueva para editar la dirección y ver el mapa.",
    newSite: "Nueva ubicación",
    editSite: "Editar ubicación",
    addSite: "Añadir ubicación",
    applyChanges: "Aplicar cambios",
    primary: "Principal",
    editor: {
      nameLabel: "Nombre de la ubicación",
      namePlaceholder: "Sede, almacén, oficina Madrid…",
      addressLabel: "Dirección",
      addressPlaceholder: "Calle Gran Vía 12",
      postalCodeLabel: "Código postal",
      postalCodePlaceholder: "28013",
      cityLabel: "Ciudad",
      cityPlaceholder: "Madrid",
      countryLabel: "País",
      countryPlaceholder: "España",
      defaultCountry: "España",
      primaryLabel: "Ubicación principal",
      mapPreview: "Vista previa del mapa",
      locating: "Localizando…",
      refreshPosition: "Actualizar posición",
      mapUnavailable: "Mapa no disponible",
      locateAddress: "Localizar dirección",
      openMap: "Abrir mapa",
      enlargeMap: "Ampliar mapa",
      mapFrameTitle: "Mapa · {label}",
      closeMap: "Cerrar mapa",
      interactiveMapTitle: "Mapa interactivo · {label}",
      openInOsm: "Abrir en OpenStreetMap"
    },
    drag: {
      reorderAria: "Reordenar {name}",
      finishEditing: "Termine la edición en curso primero",
      dragToReorder: "Arrastrar para reordenar"
    },
    limits: {
      warn: "Límite Community: {max} ubicaciones máximo por empresa. Pase a Veritas Pro para añadir más.",
      tooltip: "Límite Community: {max} ubicaciones por empresa",
      reached: "Límite Community alcanzado · {max} ubicaciones por empresa."
    },
    countOne: "{count} ubicación",
    countMany: "{count} ubicaciones",
    countWithMaxOne: "{count} / {max} ubicación",
    countWithMaxMany: "{count} / {max} ubicaciones",
    saveBlockedTitle: "Termine o cancele la edición de la ubicación en curso antes de guardar",
    toasts: {
      nameRequired: "Indique el nombre de la ubicación.",
      positionUpdated: "Posición actualizada en el mapa.",
      geocodeFailed: "No se pudo localizar esta dirección.",
      finishEditFirst: "Guarde o cancele la edición en curso.",
      saveFailed: "No se pudieron guardar las ubicaciones."
    }
  }
};
function formatSiteCount(t, count, max = null) {
  const plural = count > 1;
  let template;
  if (max != null) {
    template = plural ? t.countWithMaxMany : t.countWithMaxOne;
    return interpolate(template, {
      count: String(count),
      max: String(max)
    });
  }
  template = plural ? t.countMany : t.countOne;
  return interpolate(template, {
    count: String(count)
  });
}
export function getSitesModalCopy(locale) {
  const t = pickLocaleMessages(SITES_MODAL_COPY, locale);
  return {
    ...t,
    defaultSiteCountry: t.editor.defaultCountry || t.editor.countryPlaceholder,
    formatSiteCount: (count, max) => formatSiteCount(t, count, max),
    formatReorderAria: name => interpolate(t.drag.reorderAria, {
      name
    }),
    formatLimitWarn: max => interpolate(t.limits.warn, {
      max: String(max)
    }),
    formatLimitTooltip: max => interpolate(t.limits.tooltip, {
      max: String(max)
    }),
    formatLimitReached: max => interpolate(t.limits.reached, {
      max: String(max)
    })
  };
}
