import { createLocaleGetter } from "../../i18n/translate";
const FR = {
  entityKind: {
    client: "Étiquette client",
    contact: "Étiquette contact",
    equipment: "Étiquette matériel"
  },
  sections: {
    catalog: {
      label: "Catalogue",
      description: "Étiquettes déjà utilisées"
    },
    create: {
      label: "Nouvelle étiquette",
      description: "Libellé et couleur"
    }
  },
  title: "Ajouter une étiquette",
  subtitleWithName: "Associez une étiquette à {name}.",
  subtitleDefault: "Associez une étiquette à cette fiche.",
  close: "Fermer",
  navAria: "Sections du formulaire",
  catalog: {
    title: "Étiquettes existantes",
    description: "Réutilisez une étiquette déjà utilisée sur une entreprise, un contact ou un périphérique pour garder des couleurs cohérentes.",
    search: "Rechercher",
    searchPlaceholder: "Filtrer le catalogue…",
    loading: "Chargement du catalogue…",
    empty: "Aucune étiquette disponible pour cette fiche.",
    createBtn: "Créer une étiquette"
  },
  create: {
    title: "Créer une étiquette",
    description: "Définissez le libellé et la couleur affichés sur la fiche.",
    label: "Libellé",
    labelPlaceholder: "Ex. prioritaire, vip, attention…",
    color: "Couleur",
    colorAria: "Couleur de l'étiquette",
    customColorTitle: "Couleur personnalisée",
    pickCustomColorAria: "Choisir une couleur personnalisée",
    hexAria: "Code couleur hexadécimal",
    hexFormatError: "Format attendu : #RRGGBB",
    preview: "Aperçu",
    previewDefault: "aperçu"
  },
  colors: {
    "#2b5fab": "Bleu",
    "#16a34a": "Vert",
    "#d97706": "Orange",
    "#7c3aed": "Violet",
    "#dc2626": "Rouge",
    "#0891b2": "Cyan"
  },
  footer: {
    pickTag: "Cliquez sur une étiquette pour l'ajouter à la fiche.",
    noTags: "Aucune étiquette disponible · créez-en une nouvelle.",
    requiredFields: "Les champs marqués * sont obligatoires."
  },
  cancel: "Annuler",
  adding: "Ajout…",
  addTag: "Ajouter l'étiquette"
};
const EN = {
  entityKind: {
    client: "Client tag",
    contact: "Contact tag",
    equipment: "Hardware tag"
  },
  sections: {
    catalog: {
      label: "Catalog",
      description: "Already used tags"
    },
    create: {
      label: "New tag",
      description: "Label and color"
    }
  },
  title: "Add tag",
  subtitleWithName: "Associate a tag with {name}.",
  subtitleDefault: "Associate a tag with this record.",
  close: "Close",
  navAria: "Form sections",
  catalog: {
    title: "Existing tags",
    description: "Reuse a tag already used on a company, contact, or device to keep colors consistent.",
    search: "Search",
    searchPlaceholder: "Filter catalog…",
    loading: "Loading catalog…",
    empty: "No tags available for this record.",
    createBtn: "Create a tag"
  },
  create: {
    title: "Create a tag",
    description: "Set the label and color shown on the record.",
    label: "Label",
    labelPlaceholder: "e.g. priority, vip, attention…",
    color: "Color",
    colorAria: "Tag color",
    customColorTitle: "Custom color",
    pickCustomColorAria: "Pick a custom color",
    hexAria: "Hex color code",
    hexFormatError: "Expected format: #RRGGBB",
    preview: "Preview",
    previewDefault: "preview"
  },
  colors: {
    "#2b5fab": "Blue",
    "#16a34a": "Green",
    "#d97706": "Orange",
    "#7c3aed": "Purple",
    "#dc2626": "Red",
    "#0891b2": "Cyan"
  },
  footer: {
    pickTag: "Click a tag to add it to the record.",
    noTags: "No tags available · create a new one.",
    requiredFields: "Fields marked * are required."
  },
  cancel: "Cancel",
  adding: "Adding…",
  addTag: "Add tag"
};
const DE = {
  ...EN,
  entityKind: {
    client: "Kunden-Tag",
    contact: "Kontakt-Tag",
    equipment: "Geräte-Tag"
  },
  sections: {
    catalog: {
      label: "Katalog",
      description: "Bereits verwendete Tags"
    },
    create: {
      label: "Neuer Tag",
      description: "Bezeichnung und Farbe"
    }
  },
  title: "Tag hinzufügen",
  subtitleWithName: "Ordnen Sie {name} einen Tag zu.",
  subtitleDefault: "Ordnen Sie diesem Datensatz einen Tag zu.",
  close: "Schließen",
  navAria: "Formularabschnitte",
  catalog: {
    ...EN.catalog,
    title: "Vorhandene Tags",
    description: "Verwenden Sie einen Tag, der bereits für ein Unternehmen, einen Kontakt oder ein Gerät genutzt wird, um Farben konsistent zu halten.",
    search: "Suchen",
    searchPlaceholder: "Katalog filtern…",
    loading: "Katalog wird geladen…",
    empty: "Keine Tags für diesen Datensatz verfügbar.",
    createBtn: "Tag erstellen"
  },
  create: {
    ...EN.create,
    title: "Tag erstellen",
    description: "Legen Sie die Bezeichnung und Farbe für den Datensatz fest.",
    label: "Bezeichnung",
    labelPlaceholder: "z. B. prioritär, vip, wichtig…",
    color: "Farbe",
    colorAria: "Tag-Farbe",
    customColorTitle: "Benutzerdefinierte Farbe",
    pickCustomColorAria: "Benutzerdefinierte Farbe wählen",
    hexAria: "Hex-Farbcode",
    hexFormatError: "Erwartetes Format: #RRGGBB",
    preview: "Vorschau",
    previewDefault: "Vorschau"
  },
  colors: {
    "#2b5fab": "Blau",
    "#16a34a": "Grün",
    "#d97706": "Orange",
    "#7c3aed": "Violett",
    "#dc2626": "Rot",
    "#0891b2": "Cyan"
  },
  footer: {
    pickTag: "Klicken Sie auf einen Tag, um ihn dem Datensatz hinzuzufügen.",
    noTags: "Keine Tags verfügbar · erstellen Sie einen neuen.",
    requiredFields: "Mit * markierte Felder sind Pflichtfelder."
  },
  cancel: "Abbrechen",
  adding: "Hinzufügen…",
  addTag: "Tag hinzufügen"
};
const IT = {
  ...EN,
  entityKind: {
    client: "Etichetta cliente",
    contact: "Etichetta contatto",
    equipment: "Etichetta dispositivo"
  },
  sections: {
    catalog: {
      label: "Catalogo",
      description: "Etichette già usate"
    },
    create: {
      label: "Nuova etichetta",
      description: "Etichetta e colore"
    }
  },
  title: "Aggiungi etichetta",
  subtitleWithName: "Associa un'etichetta a {name}.",
  subtitleDefault: "Associa un'etichetta a questa scheda.",
  close: "Chiudi",
  navAria: "Sezioni del modulo",
  catalog: {
    ...EN.catalog,
    title: "Etichette esistenti",
    description: "Riutilizza un'etichetta già usata su un'azienda, un contatto o un dispositivo per mantenere colori coerenti.",
    search: "Cerca",
    searchPlaceholder: "Filtra catalogo…",
    loading: "Caricamento catalogo…",
    empty: "Nessuna etichetta disponibile per questa scheda.",
    createBtn: "Crea un'etichetta"
  },
  create: {
    ...EN.create,
    title: "Crea un'etichetta",
    description: "Definisci l'etichetta e il colore mostrati sulla scheda.",
    label: "Etichetta",
    labelPlaceholder: "es. prioritario, vip, attenzione…",
    color: "Colore",
    colorAria: "Colore dell'etichetta",
    customColorTitle: "Colore personalizzato",
    pickCustomColorAria: "Scegli un colore personalizzato",
    hexAria: "Codice colore esadecimale",
    hexFormatError: "Formato previsto: #RRGGBB",
    preview: "Anteprima",
    previewDefault: "anteprima"
  },
  colors: {
    "#2b5fab": "Blu",
    "#16a34a": "Verde",
    "#d97706": "Arancione",
    "#7c3aed": "Viola",
    "#dc2626": "Rosso",
    "#0891b2": "Ciano"
  },
  footer: {
    pickTag: "Fai clic su un'etichetta per aggiungerla alla scheda.",
    noTags: "Nessuna etichetta disponibile · creane una nuova.",
    requiredFields: "I campi contrassegnati con * sono obbligatori."
  },
  cancel: "Annulla",
  adding: "Aggiunta…",
  addTag: "Aggiungi etichetta"
};
const ES = {
  ...EN,
  entityKind: {
    client: "Etiqueta de cliente",
    contact: "Etiqueta de contacto",
    equipment: "Etiqueta de equipo"
  },
  sections: {
    catalog: {
      label: "Catálogo",
      description: "Etiquetas ya usadas"
    },
    create: {
      label: "Nueva etiqueta",
      description: "Etiqueta y color"
    }
  },
  title: "Añadir etiqueta",
  subtitleWithName: "Asocie una etiqueta a {name}.",
  subtitleDefault: "Asocie una etiqueta a esta ficha.",
  close: "Cerrar",
  navAria: "Secciones del formulario",
  catalog: {
    ...EN.catalog,
    title: "Etiquetas existentes",
    description: "Reutilice una etiqueta ya usada en una empresa, un contacto o un dispositivo para mantener colores coherentes.",
    search: "Buscar",
    searchPlaceholder: "Filtrar catálogo…",
    loading: "Cargando catálogo…",
    empty: "No hay etiquetas disponibles para esta ficha.",
    createBtn: "Crear una etiqueta"
  },
  create: {
    ...EN.create,
    title: "Crear una etiqueta",
    description: "Defina la etiqueta y el color mostrados en la ficha.",
    label: "Etiqueta",
    labelPlaceholder: "p. ej. prioritario, vip, atención…",
    color: "Color",
    colorAria: "Color de la etiqueta",
    customColorTitle: "Color personalizado",
    pickCustomColorAria: "Elegir un color personalizado",
    hexAria: "Código de color hexadecimal",
    hexFormatError: "Formato esperado: #RRGGBB",
    preview: "Vista previa",
    previewDefault: "vista previa"
  },
  colors: {
    "#2b5fab": "Azul",
    "#16a34a": "Verde",
    "#d97706": "Naranja",
    "#7c3aed": "Violeta",
    "#dc2626": "Rojo",
    "#0891b2": "Cian"
  },
  footer: {
    pickTag: "Haga clic en una etiqueta para añadirla a la ficha.",
    noTags: "No hay etiquetas disponibles · cree una nueva.",
    requiredFields: "Los campos marcados con * son obligatorios."
  },
  cancel: "Cancelar",
  adding: "Añadiendo…",
  addTag: "Añadir etiqueta"
};
const PAGE_COPY = {
  fr: FR,
  en: EN,
  de: DE,
  it: IT,
  es: ES
};
export const getClientTagModalCopy = createLocaleGetter(PAGE_COPY);
export function getClientTagColorLabel(locale, colorValue) {
  const colors = getClientTagModalCopy(locale).colors;
  const normalized = String(colorValue || "").toLowerCase();
  return colors[normalized] || colorValue;
}
