import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const STATUS_FILTER_KEYS = ["active", "inactive", "unknown"];
const STATUS_FILTER_META = {
  active: {
    icon: "mdi:check-circle",
    kpiTone: "green"
  },
  inactive: {
    icon: "mdi:pause-circle",
    kpiTone: "gray"
  },
  unknown: {
    icon: "mdi:help-circle",
    kpiTone: "amber"
  }
};
const SORT_OPTION_VALUES = ["nom:asc", "nom:desc", "prenom:asc", "client:asc", "email:asc", "poste:asc"];
const CONTACTS_COPY = {
  fr: {
    eyebrow: "Répertoire",
    pageTitle: "Contacts",
    loadingPortfolio: "Chargement des contacts…",
    subtitle: "{filtered} contact affiché sur {total}",
    subtitlePlural: "{filtered} contacts affichés sur {total}",
    exportCsv: "Exporter en CSV",
    exportCsvAria: "Exporter CSV",
    columnsSettings: "Paramétrer les colonnes",
    columnsSettingsAria: "Paramétrer les colonnes du tableau",
    newContact: "Nouveau contact",
    searchPlaceholder: "Contact, entreprise, étiquette…",
    searchAria: "Rechercher un contact",
    clearSearch: "Effacer la recherche",
    sortAria: "Trier les contacts",
    loading: "Chargement des contacts…",
    emptyTitle: "Aucun contact trouvé",
    emptyHint: "Ajustez vos filtres ou créez un nouveau contact.",
    tagsAria: "Étiquettes",
    enterprise: "Entreprise",
    civility: "Civilité",
    table: {
      contact: "Nom / Prénom",
      gender: "Genre",
      status: "Statut",
      enterprise: "Entreprise",
      role: "Poste",
      email: "Email",
      phone: "Téléphone",
      portal: "Portail",
      actions: "Actions"
    },
    statusFilters: {
      active: "Actifs",
      inactive: "Inactifs",
      unknown: "Non renseigné"
    },
    portalFilter: "Portail",
    contactStatus: {
      active: "Actif",
      inactive: "Inactif",
      unknown: "Non renseigné"
    },
    sortOptions: {
      "nom:asc": "Nom (A → Z)",
      "nom:desc": "Nom (Z → A)",
      "prenom:asc": "Prénom (A → Z)",
      "client:asc": "Entreprise (A → Z)",
      "email:asc": "Email (A → Z)",
      "poste:asc": "Poste (A → Z)"
    },
    portal: {
      active: "Portail actif",
      inactive: "Portail désactivé",
      none: "Aucun accès portail",
      label: "Portail"
    },
    clipboard: {
      unavailable: "{label} indisponible",
      copied: "{label} copié",
      copyFailed: "Impossible de copier {label}"
    },
    share: {
      unavailable: "Partage non disponible sur ce navigateur",
      cancelled: "Partage annulé",
      title: "Fiche contact · {name}",
      lines: {
        contact: "Contact",
        enterprise: "Entreprise",
        role: "Poste",
        phone: "Téléphone",
        email: "Email"
      }
    },
    clipboardLabels: {
      email: "Email",
      phone: "Téléphone"
    },
    actions: {
      copyEmail: "Copier l'email",
      copyPhone: "Copier le numéro",
      copyCard: "Copier la fiche",
      copyCardAria: "Copier la fiche contact",
      shareCard: "Fiche contact",
      share: "Partager",
      shareAria: "Partager la fiche contact"
    },
    export: {
      filename: "contacts.csv",
      headers: ["Nom", "Prénom", "Statut", "Entreprise", "Poste", "Email", "Téléphone"]
    },
    columnsModal: {
      title: "Colonnes du tableau",
      subtitle: "Choisissez les colonnes visibles dans la liste des contacts.",
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
    clientPrefix: "Client #",
    unnamed: "Sans nom"
  },
  en: {
    eyebrow: "Directory",
    pageTitle: "Contacts",
    loadingPortfolio: "Loading contacts…",
    subtitle: "{filtered} contact shown of {total}",
    subtitlePlural: "{filtered} contacts shown of {total}",
    exportCsv: "Export as CSV",
    exportCsvAria: "Export CSV",
    columnsSettings: "Configure columns",
    columnsSettingsAria: "Configure table columns",
    newContact: "New contact",
    searchPlaceholder: "Contact, company, tag…",
    searchAria: "Search for a contact",
    clearSearch: "Clear search",
    sortAria: "Sort contacts",
    loading: "Loading contacts…",
    emptyTitle: "No contacts found",
    emptyHint: "Adjust your filters or create a new contact.",
    tagsAria: "Tags",
    enterprise: "Company",
    civility: "Title",
    table: {
      contact: "Last name / First name",
      gender: "Gender",
      status: "Status",
      enterprise: "Company",
      role: "Job title",
      email: "Email",
      phone: "Phone",
      portal: "Portal",
      actions: "Actions"
    },
    statusFilters: {
      active: "Active",
      inactive: "Inactive",
      unknown: "Not specified"
    },
    portalFilter: "Portal",
    contactStatus: {
      active: "Active",
      inactive: "Inactive",
      unknown: "Not specified"
    },
    sortOptions: {
      "nom:asc": "Last name (A → Z)",
      "nom:desc": "Last name (Z → A)",
      "prenom:asc": "First name (A → Z)",
      "client:asc": "Company (A → Z)",
      "email:asc": "Email (A → Z)",
      "poste:asc": "Job title (A → Z)"
    },
    portal: {
      active: "Portal active",
      inactive: "Portal disabled",
      none: "No portal access",
      label: "Portal"
    },
    clipboard: {
      unavailable: "{label} unavailable",
      copied: "{label} copied",
      copyFailed: "Unable to copy {label}"
    },
    share: {
      unavailable: "Sharing not available in this browser",
      cancelled: "Share cancelled",
      title: "Contact card · {name}",
      lines: {
        contact: "Contact",
        enterprise: "Company",
        role: "Job title",
        phone: "Phone",
        email: "Email"
      }
    },
    clipboardLabels: {
      email: "Email",
      phone: "Phone"
    },
    actions: {
      copyEmail: "Copy email",
      copyPhone: "Copy phone number",
      copyCard: "Copy card",
      copyCardAria: "Copy contact card",
      shareCard: "Contact card",
      share: "Share",
      shareAria: "Share contact card"
    },
    export: {
      filename: "contacts.csv",
      headers: ["Last name", "First name", "Status", "Company", "Job title", "Email", "Phone"]
    },
    columnsModal: {
      title: "Table columns",
      subtitle: "Choose which columns are visible in the contacts list.",
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
    clientPrefix: "Client #",
    unnamed: "Unnamed"
  },
  de: {
    eyebrow: "Verzeichnis",
    pageTitle: "Kontakte",
    loadingPortfolio: "Kontakte werden geladen…",
    subtitle: "{filtered} Kontakt angezeigt von {total}",
    subtitlePlural: "{filtered} Kontakte angezeigt von {total}",
    exportCsv: "Als CSV exportieren",
    exportCsvAria: "CSV exportieren",
    columnsSettings: "Spalten konfigurieren",
    columnsSettingsAria: "Tabellenspalten konfigurieren",
    newContact: "Neuer Kontakt",
    searchPlaceholder: "Kontakt, Unternehmen, Tag…",
    searchAria: "Kontakt suchen",
    clearSearch: "Suche löschen",
    sortAria: "Kontakte sortieren",
    loading: "Kontakte werden geladen…",
    emptyTitle: "Keine Kontakte gefunden",
    emptyHint: "Filter anpassen oder neuen Kontakt anlegen.",
    tagsAria: "Tags",
    enterprise: "Unternehmen",
    civility: "Anrede",
    table: {
      contact: "Nachname / Vorname",
      gender: "Geschlecht",
      status: "Status",
      enterprise: "Unternehmen",
      role: "Position",
      email: "E-Mail",
      phone: "Telefon",
      portal: "Portal",
      actions: "Aktionen"
    },
    statusFilters: {
      active: "Aktiv",
      inactive: "Inaktiv",
      unknown: "Nicht angegeben"
    },
    portalFilter: "Portal",
    contactStatus: {
      active: "Aktiv",
      inactive: "Inaktiv",
      unknown: "Nicht angegeben"
    },
    sortOptions: {
      "nom:asc": "Nachname (A → Z)",
      "nom:desc": "Nachname (Z → A)",
      "prenom:asc": "Vorname (A → Z)",
      "client:asc": "Unternehmen (A → Z)",
      "email:asc": "E-Mail (A → Z)",
      "poste:asc": "Position (A → Z)"
    },
    portal: {
      active: "Portal aktiv",
      inactive: "Portal deaktiviert",
      none: "Kein Portalzugang",
      label: "Portal"
    },
    clipboard: {
      unavailable: "{label} nicht verfügbar",
      copied: "{label} kopiert",
      copyFailed: "{label} konnte nicht kopiert werden"
    },
    share: {
      unavailable: "Teilen in diesem Browser nicht verfügbar",
      cancelled: "Teilen abgebrochen",
      title: "Kontaktkarte · {name}",
      lines: {
        contact: "Kontakt",
        enterprise: "Unternehmen",
        role: "Position",
        phone: "Telefon",
        email: "E-Mail"
      }
    },
    clipboardLabels: {
      email: "E-Mail",
      phone: "Telefon"
    },
    actions: {
      copyEmail: "E-Mail kopieren",
      copyPhone: "Telefonnummer kopieren",
      copyCard: "Karte kopieren",
      copyCardAria: "Kontaktkarte kopieren",
      shareCard: "Kontaktkarte",
      share: "Teilen",
      shareAria: "Kontaktkarte teilen"
    },
    export: {
      filename: "contacts.csv",
      headers: ["Nachname", "Vorname", "Status", "Unternehmen", "Position", "E-Mail", "Telefon"]
    },
    columnsModal: {
      title: "Tabellenspalten",
      subtitle: "Wählen Sie die sichtbaren Spalten in der Kontaktliste.",
      privateTab: "Private Ansicht",
      publicTab: "Öffentliche Ansicht",
      privateHintInactive: "Noch keine private Ansicht — die öffentliche Ansicht wird verwendet. Spalten umschalten, um Ihre zu erstellen.",
      privateHintActive: "Ihre private Ansicht überschreibt die öffentliche.",
      publicHint: "Standardspalten für alle Benutzer ohne private Ansicht.",
      adminOnly: "Nur Administratoren können die öffentliche Ansicht bearbeiten.",
      resetPrivate: "Öffentliche Ansicht verwenden",
      resetSuccess: "Private Ansicht zurückgesetzt",
      savePrivateSuccess: "Private Ansicht gespeichert",
      savePublicSuccess: "Öffentliche Ansicht gespeichert",
      saveError: "Fehler beim Speichern der Spalten",
      atLeastOne: "Wählen Sie mindestens eine Spalte.",
      reorderHint: "Zeilen ziehen, um die Spaltenreihenfolge in der Tabelle zu ändern.",
      dragColumn: "Spalte {name} ziehen",
      save: "Speichern"
    },
    toasts: {
      loadColumns: "Fehler beim Laden der Spalten"
    },
    clientPrefix: "Kunde #",
    unnamed: "Ohne Name"
  },
  it: {
    eyebrow: "Rubrica",
    pageTitle: "Contatti",
    loadingPortfolio: "Caricamento contatti…",
    subtitle: "{filtered} contatto visualizzato su {total}",
    subtitlePlural: "{filtered} contatti visualizzati su {total}",
    exportCsv: "Esporta in CSV",
    exportCsvAria: "Esporta CSV",
    columnsSettings: "Configura colonne",
    columnsSettingsAria: "Configura le colonne della tabella",
    newContact: "Nuovo contatto",
    searchPlaceholder: "Contatto, azienda, etichetta…",
    searchAria: "Cerca un contatto",
    clearSearch: "Cancella ricerca",
    sortAria: "Ordina contatti",
    loading: "Caricamento contatti…",
    emptyTitle: "Nessun contatto trovato",
    emptyHint: "Modifica i filtri o crea un nuovo contatto.",
    tagsAria: "Etichette",
    enterprise: "Azienda",
    civility: "Titolo",
    table: {
      contact: "Cognome / Nome",
      gender: "Genere",
      status: "Stato",
      enterprise: "Azienda",
      role: "Ruolo",
      email: "Email",
      phone: "Telefono",
      portal: "Portale",
      actions: "Azioni"
    },
    statusFilters: {
      active: "Attivi",
      inactive: "Inattivi",
      unknown: "Non indicato"
    },
    portalFilter: "Portale",
    contactStatus: {
      active: "Attivo",
      inactive: "Inattivo",
      unknown: "Non indicato"
    },
    sortOptions: {
      "nom:asc": "Cognome (A → Z)",
      "nom:desc": "Cognome (Z → A)",
      "prenom:asc": "Nome (A → Z)",
      "client:asc": "Azienda (A → Z)",
      "email:asc": "Email (A → Z)",
      "poste:asc": "Ruolo (A → Z)"
    },
    portal: {
      active: "Portale attivo",
      inactive: "Portale disattivato",
      none: "Nessun accesso al portale",
      label: "Portale"
    },
    clipboard: {
      unavailable: "{label} non disponibile",
      copied: "{label} copiato",
      copyFailed: "Impossibile copiare {label}"
    },
    share: {
      unavailable: "Condivisione non disponibile in questo browser",
      cancelled: "Condivisione annullata",
      title: "Scheda contatto · {name}",
      lines: {
        contact: "Contatto",
        enterprise: "Azienda",
        role: "Ruolo",
        phone: "Telefono",
        email: "Email"
      }
    },
    clipboardLabels: {
      email: "Email",
      phone: "Telefono"
    },
    actions: {
      copyEmail: "Copia email",
      copyPhone: "Copia numero",
      copyCard: "Copia scheda",
      copyCardAria: "Copia scheda contatto",
      shareCard: "Scheda contatto",
      share: "Condividi",
      shareAria: "Condividi scheda contatto"
    },
    export: {
      filename: "contacts.csv",
      headers: ["Cognome", "Nome", "Stato", "Azienda", "Ruolo", "Email", "Telefono"]
    },
    columnsModal: {
      title: "Colonne della tabella",
      subtitle: "Scegli le colonne visibili nell'elenco contatti.",
      privateTab: "Vista privata",
      publicTab: "Vista pubblica",
      privateHintInactive: "Nessuna vista privata: viene usata la vista pubblica. Seleziona colonne per crearne una.",
      privateHintActive: "La tua vista privata sostituisce quella pubblica.",
      publicHint: "Colonne predefinite per tutti gli utenti senza vista privata.",
      adminOnly: "Solo gli amministratori possono modificare la vista pubblica.",
      resetPrivate: "Usa la vista pubblica",
      resetSuccess: "Vista privata reimpostata",
      savePrivateSuccess: "Vista privata salvata",
      savePublicSuccess: "Vista pubblica salvata",
      saveError: "Errore durante il salvataggio delle colonne",
      atLeastOne: "Seleziona almeno una colonna.",
      reorderHint: "Trascina le righe per cambiare l’ordine delle colonne nella tabella.",
      dragColumn: "Trascina la colonna {name}",
      save: "Salva"
    },
    toasts: {
      loadColumns: "Errore durante il caricamento delle colonne"
    },
    clientPrefix: "Cliente #",
    unnamed: "Senza nome"
  },
  es: {
    eyebrow: "Directorio",
    pageTitle: "Contactos",
    loadingPortfolio: "Cargando contactos…",
    subtitle: "{filtered} contacto mostrado de {total}",
    subtitlePlural: "{filtered} contactos mostrados de {total}",
    exportCsv: "Exportar a CSV",
    exportCsvAria: "Exportar CSV",
    columnsSettings: "Configurar columnas",
    columnsSettingsAria: "Configurar columnas de la tabla",
    newContact: "Nuevo contacto",
    searchPlaceholder: "Contacto, empresa, etiqueta…",
    searchAria: "Buscar un contacto",
    clearSearch: "Borrar búsqueda",
    sortAria: "Ordenar contactos",
    loading: "Cargando contactos…",
    emptyTitle: "Ningún contacto encontrado",
    emptyHint: "Ajuste los filtros o cree un nuevo contacto.",
    tagsAria: "Etiquetas",
    enterprise: "Empresa",
    civility: "Tratamiento",
    table: {
      contact: "Apellido / Nombre",
      gender: "Género",
      status: "Estado",
      enterprise: "Empresa",
      role: "Puesto",
      email: "Email",
      phone: "Teléfono",
      portal: "Portal",
      actions: "Acciones"
    },
    statusFilters: {
      active: "Activos",
      inactive: "Inactivos",
      unknown: "No indicado"
    },
    portalFilter: "Portal",
    contactStatus: {
      active: "Activo",
      inactive: "Inactivo",
      unknown: "No indicado"
    },
    sortOptions: {
      "nom:asc": "Apellido (A → Z)",
      "nom:desc": "Apellido (Z → A)",
      "prenom:asc": "Nombre (A → Z)",
      "client:asc": "Empresa (A → Z)",
      "email:asc": "Email (A → Z)",
      "poste:asc": "Puesto (A → Z)"
    },
    portal: {
      active: "Portal activo",
      inactive: "Portal desactivado",
      none: "Sin acceso al portal",
      label: "Portal"
    },
    clipboard: {
      unavailable: "{label} no disponible",
      copied: "{label} copiado",
      copyFailed: "No se pudo copiar {label}"
    },
    share: {
      unavailable: "Compartir no disponible en este navegador",
      cancelled: "Compartir cancelado",
      title: "Ficha contacto · {name}",
      lines: {
        contact: "Contacto",
        enterprise: "Empresa",
        role: "Puesto",
        phone: "Teléfono",
        email: "Email"
      }
    },
    clipboardLabels: {
      email: "Email",
      phone: "Teléfono"
    },
    actions: {
      copyEmail: "Copiar email",
      copyPhone: "Copiar teléfono",
      copyCard: "Copiar ficha",
      copyCardAria: "Copiar ficha de contacto",
      shareCard: "Ficha contacto",
      share: "Compartir",
      shareAria: "Compartir ficha de contacto"
    },
    export: {
      filename: "contactos.csv",
      headers: ["Apellido", "Nombre", "Estado", "Empresa", "Puesto", "Email", "Teléfono"]
    },
    columnsModal: {
      title: "Columnas de la tabla",
      subtitle: "Elija las columnas visibles en la lista de contactos.",
      privateTab: "Vista privada",
      publicTab: "Vista pública",
      privateHintInactive: "Aún no hay vista privada: se usa la pública. Active columnas para crear la suya.",
      privateHintActive: "Su vista privada sustituye a la pública.",
      publicHint: "Columnas por defecto para todos los usuarios sin vista privada.",
      adminOnly: "Solo los administradores pueden editar la vista pública.",
      resetPrivate: "Usar la vista pública",
      resetSuccess: "Vista privada restablecida",
      savePrivateSuccess: "Vista privada guardada",
      savePublicSuccess: "Vista pública guardada",
      saveError: "Error al guardar las columnas",
      atLeastOne: "Seleccione al menos una columna.",
      reorderHint: "Arrastre las filas para cambiar el orden de las columnas en la tabla.",
      dragColumn: "Arrastrar la columna {name}",
      save: "Guardar"
    },
    toasts: {
      loadColumns: "Error al cargar las columnas"
    },
    clientPrefix: "Cliente #",
    unnamed: "Sin nombre"
  }
};
const STATUS_COLORS = {
  active: "#16a34a",
  inactive: "#6b7280",
  unknown: "#6b7280"
};
export function getContactPageCopy(locale) {
  const t = pickLocaleMessages(CONTACTS_COPY, locale);
  return {
    ...t,
    statusFilters: STATUS_FILTER_KEYS.map(key => ({
      key,
      label: t.statusFilters[key],
      ...STATUS_FILTER_META[key]
    })),
    sortOptions: SORT_OPTION_VALUES.map(value => ({
      value,
      label: t.sortOptions[value]
    })),
    formatSubtitle: (filtered, total) => {
      const template = filtered === 1 ? t.subtitle : t.subtitlePlural;
      return interpolate(template, {
        filtered: String(filtered),
        total: String(total)
      });
    },
    getContactStatus: statut => {
      const key = normalizeStatusKey(statut);
      return {
        key,
        label: t.contactStatus[key] || t.contactStatus.unknown,
        color: STATUS_COLORS[key] || STATUS_COLORS.unknown
      };
    },
    getClientLabel: (clientId, clientName) => {
      if (clientName) return clientName;
      return clientId ? `${t.clientPrefix}${clientId}` : "";
    }
  };
}
function normalizeStatusKey(value) {
  if (!value) return "unknown";
  const v = String(value).toLowerCase();
  if (v.includes("inact")) return "inactive";
  if (v.includes("act")) return "active";
  return "unknown";
}
export { normalizeStatusKey as normalizeContactStatusKey };
