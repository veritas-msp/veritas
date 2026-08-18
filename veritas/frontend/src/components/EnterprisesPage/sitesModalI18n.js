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
    csvImport: {
      title: "Importer des lieux",
      subtitle: "Téléchargez un modèle, importez un CSV, puis validez la liste.",
      downloadTemplate: "Télécharger l'exemple CSV",
      templateHint: "Colonnes : nom (obligatoire), adresse, code_postal, ville, pays, principal, notes. Séparateur ; ou ,.",
      dropTitle: "Déposez votre fichier CSV",
      dropHint: "ou cliquez pour le sélectionner",
      pickFile: "Choisir un CSV",
      emptyFile: "Le CSV ne contient aucune ligne.",
      parseError: "Impossible de lire ce CSV.",
      missingNameColumn: "Colonne « nom » introuvable. Utilisez le modèle fourni.",
      noneSelected: "Sélectionnez au moins un lieu à créer.",
      confirm: "Créer {count} lieu(x)",
      summaryReady: "{count} à créer",
      summaryDuplicate: "{count} doublon(s)",
      summaryInvalid: "{count} invalide(s)",
      summaryLimit: "{count} hors limite",
      columns: {
        name: "Nom",
        address: "Adresse",
        status: "Statut"
      },
      status: {
        ready: "À créer",
        duplicate: "Déjà existant",
        invalid: "Nom manquant",
        limit: "Limite atteinte"
      }
    },
    toasts: {
      nameRequired: "Renseignez le nom du lieu.",
      positionUpdated: "Position mise à jour sur la carte.",
      geocodeFailed: "Impossible de localiser cette adresse.",
      finishEditFirst: "Enregistrez ou annulez la modification en cours.",
      saveFailed: "Impossible d'enregistrer les lieux.",
      imported: "{count} lieu(x) ajouté(s)."
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
    csvImport: {
      title: "Import locations",
      subtitle: "Download a template, import a CSV, then confirm the list.",
      downloadTemplate: "Download CSV sample",
      templateHint: "Columns: name (required), address, postal_code, city, country, primary, notes. Separator ; or ,.",
      dropTitle: "Drop your CSV file",
      dropHint: "or click to choose one",
      pickFile: "Choose a CSV",
      emptyFile: "The CSV has no data rows.",
      parseError: "Unable to read this CSV.",
      missingNameColumn: "Column “name” not found. Use the provided template.",
      noneSelected: "Select at least one location to create.",
      confirm: "Create {count} location(s)",
      summaryReady: "{count} to create",
      summaryDuplicate: "{count} duplicate(s)",
      summaryInvalid: "{count} invalid",
      summaryLimit: "{count} over limit",
      columns: {
        name: "Name",
        address: "Address",
        status: "Status"
      },
      status: {
        ready: "Ready",
        duplicate: "Already exists",
        invalid: "Name missing",
        limit: "Limit reached"
      }
    },
    toasts: {
      nameRequired: "Enter the location name.",
      positionUpdated: "Map position updated.",
      geocodeFailed: "Unable to locate this address.",
      finishEditFirst: "Save or cancel the current edit first.",
      saveFailed: "Unable to save locations.",
      imported: "{count} location(s) added."
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
    csvImport: {
      title: "Standorte importieren",
      subtitle: "Vorlage herunterladen, CSV importieren, dann die Liste bestätigen.",
      downloadTemplate: "CSV-Beispiel herunterladen",
      templateHint: "Spalten: name (pflicht), address, postal_code, city, country, primary, notes. Trennzeichen ; oder ,.",
      dropTitle: "CSV-Datei hier ablegen",
      dropHint: "oder klicken zum Auswählen",
      pickFile: "CSV wählen",
      emptyFile: "Die CSV enthält keine Datenzeilen.",
      parseError: "Diese CSV konnte nicht gelesen werden.",
      missingNameColumn: "Spalte „name“ nicht gefunden. Nutzen Sie die Vorlage.",
      noneSelected: "Wählen Sie mindestens einen Standort zum Erstellen.",
      confirm: "{count} Standort(e) erstellen",
      summaryReady: "{count} zu erstellen",
      summaryDuplicate: "{count} Duplikat(e)",
      summaryInvalid: "{count} ungültig",
      summaryLimit: "{count} über Limit",
      columns: {
        name: "Name",
        address: "Adresse",
        status: "Status"
      },
      status: {
        ready: "Bereit",
        duplicate: "Bereits vorhanden",
        invalid: "Name fehlt",
        limit: "Limit erreicht"
      }
    },
    toasts: {
      nameRequired: "Geben Sie den Standortnamen ein.",
      positionUpdated: "Kartenposition aktualisiert.",
      geocodeFailed: "Diese Adresse konnte nicht lokalisiert werden.",
      finishEditFirst: "Speichern oder brechen Sie die laufende Bearbeitung ab.",
      saveFailed: "Standorte konnten nicht gespeichert werden.",
      imported: "{count} Standort(e) hinzugefügt."
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
    csvImport: {
      title: "Importa sedi",
      subtitle: "Scarica un modello, importa un CSV, poi conferma l'elenco.",
      downloadTemplate: "Scarica esempio CSV",
      templateHint: "Colonne: nome (obbligatorio), indirizzo, codice_postale, città, paese, principale, note. Separatore ; o ,.",
      dropTitle: "Trascina il file CSV",
      dropHint: "oppure clicca per selezionarlo",
      pickFile: "Scegli un CSV",
      emptyFile: "Il CSV non contiene righe di dati.",
      parseError: "Impossibile leggere questo CSV.",
      missingNameColumn: "Colonna « nome » non trovata. Usa il modello fornito.",
      noneSelected: "Seleziona almeno una sede da creare.",
      confirm: "Crea {count} sede/i",
      summaryReady: "{count} da creare",
      summaryDuplicate: "{count} duplicato/i",
      summaryInvalid: "{count} non valido/i",
      summaryLimit: "{count} oltre il limite",
      columns: {
        name: "Nome",
        address: "Indirizzo",
        status: "Stato"
      },
      status: {
        ready: "Da creare",
        duplicate: "Già esistente",
        invalid: "Nome mancante",
        limit: "Limite raggiunto"
      }
    },
    toasts: {
      nameRequired: "Inserisci il nome della sede.",
      positionUpdated: "Posizione sulla mappa aggiornata.",
      geocodeFailed: "Impossibile localizzare questo indirizzo.",
      finishEditFirst: "Salva o annulla la modifica in corso.",
      saveFailed: "Impossibile salvare le sedi.",
      imported: "{count} sede/i aggiunta/e."
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
    csvImport: {
      title: "Importar ubicaciones",
      subtitle: "Descargue un modelo, importe un CSV y confirme la lista.",
      downloadTemplate: "Descargar ejemplo CSV",
      templateHint: "Columnas: nombre (obligatorio), dirección, código_postal, ciudad, país, principal, notas. Separador ; o ,.",
      dropTitle: "Suelte su archivo CSV",
      dropHint: "o haga clic para seleccionarlo",
      pickFile: "Elegir un CSV",
      emptyFile: "El CSV no contiene filas de datos.",
      parseError: "No se pudo leer este CSV.",
      missingNameColumn: "No se encontró la columna « nombre ». Use la plantilla.",
      noneSelected: "Seleccione al menos una ubicación para crear.",
      confirm: "Crear {count} ubicación(es)",
      summaryReady: "{count} por crear",
      summaryDuplicate: "{count} duplicado(s)",
      summaryInvalid: "{count} no válido(s)",
      summaryLimit: "{count} fuera de límite",
      columns: {
        name: "Nombre",
        address: "Dirección",
        status: "Estado"
      },
      status: {
        ready: "Por crear",
        duplicate: "Ya existe",
        invalid: "Nombre faltante",
        limit: "Límite alcanzado"
      }
    },
    toasts: {
      nameRequired: "Indique el nombre de la ubicación.",
      positionUpdated: "Posición actualizada en el mapa.",
      geocodeFailed: "No se pudo localizar esta dirección.",
      finishEditFirst: "Guarde o cancele la edición en curso.",
      saveFailed: "No se pudieron guardar las ubicaciones.",
      imported: "{count} ubicación(es) añadida(s)."
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
