import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const STATUS_FILTER_KEYS = ["active", "expiring", "expired", "suspended"];
const STATUS_FILTER_META = {
  active: {
    icon: "mdi:check-circle",
    color: "#2b5fab",
    kpiTone: "blue"
  },
  expiring: {
    icon: "mdi:clock-alert",
    color: "#d97706",
    kpiTone: "amber"
  },
  expired: {
    icon: "mdi:alert-circle",
    color: "#dc2626",
    kpiTone: "red"
  },
  suspended: {
    icon: "mdi:pause-circle",
    color: "#f59e0b",
    kpiTone: "orange"
  }
};
const SORT_OPTION_VALUES = ["name:asc", "name:desc", "expiration:asc", "expiration:desc", "commercial:asc", "status:asc"];
const ENTERPRISES_COPY = {
  fr: {
    eyebrow: "Portefeuille clients",
    pageTitle: "Entreprises",
    loadingPortfolio: "Chargement du portefeuille…",
    subtitle: "{filtered} client affiché sur {total}",
    subtitlePlural: "{filtered} clients affichés sur {total}",
    exportCsv: "Exporter en CSV",
    exportCsvAria: "Exporter CSV",
    columnsSettings: "Paramétrer les colonnes",
    columnsSettingsAria: "Paramétrer les colonnes du tableau",
    newEnterprise: "Nouvelle entreprise",
    searchPlaceholder: "Entreprise, contact, commercial, étiquette…",
    searchAria: "Rechercher une entreprise",
    clearSearch: "Effacer la recherche",
    filterByContract: "Filtrer par option contrat",
    clearFilters: "Effacer les filtres",
    sortAria: "Ordre d'affichage des entreprises",
    loading: "Chargement des entreprises…",
    loadError: "Erreur lors du chargement des clients",
    loadErrorStatus: "Erreur lors du chargement des entreprises ({status})",
    emptyTitle: "Aucune entreprise trouvée",
    emptyHint: "Ajustez vos filtres ou créez une nouvelle entreprise.",
    tagsAria: "Étiquettes",
    primaryContact: "Contact principal",
    commercial: "Commercial",
    expiration: "Expiration",
    noModuleOptions: "Aucune option",
    perPage: "Par page",
    prevPage: "Page précédente",
    nextPage: "Page suivante",
    pageInfo: "Page {current} / {total}",
    table: {
      company: "Entreprise",
      clientNumber: "N° client",
      primaryContact: "Contact principal",
      commercial: "Commercial",
      modules: "Modules",
      expiration: "Expiration",
      equipment: "Équipements",
      tags: "Étiquettes"
    },
    statusFilters: {
      active: "Actifs",
      expiring: "Expire bientôt",
      expired: "Expirés",
      suspended: "Suspendus"
    },
    contractStatus: {
      suspended: "Suspendu",
      unknown: "Non renseigné",
      expired: "Expiré",
      expiring: "Expire bientôt",
      active: "Actif"
    },
    sortOptions: {
      "name:asc": "Ordre alphabétique croissant",
      "name:desc": "Ordre alphabétique décroissant",
      "expiration:asc": "Expiration · plus proche",
      "expiration:desc": "Expiration · plus lointaine",
      "commercial:asc": "Commercial · ordre croissant",
      "status:asc": "Statut du contrat"
    },
    export: {
      filename: "entreprises.csv",
      headers: {
        name: "Nom",
        contractOptions: "Options du contrat",
        expiration: "Date d'expiration",
        commercial: "Commercial"
      }
    },
    columnsModal: {
      title: "Colonnes du tableau",
      subtitle: "Choisissez les colonnes visibles dans la liste des entreprises.",
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
    }
  },
  en: {
    eyebrow: "Client portfolio",
    pageTitle: "Companies",
    loadingPortfolio: "Loading portfolio…",
    subtitle: "{filtered} company shown of {total}",
    subtitlePlural: "{filtered} companies shown of {total}",
    exportCsv: "Export as CSV",
    exportCsvAria: "Export CSV",
    columnsSettings: "Configure columns",
    columnsSettingsAria: "Configure table columns",
    newEnterprise: "New company",
    searchPlaceholder: "Company, contact, account manager, tag…",
    searchAria: "Search for a company",
    clearSearch: "Clear search",
    filterByContract: "Filter by contract option",
    clearFilters: "Clear filters",
    sortAria: "Company display order",
    loading: "Loading companies…",
    loadError: "Error loading clients",
    loadErrorStatus: "Error loading companies ({status})",
    emptyTitle: "No companies found",
    emptyHint: "Adjust your filters or create a new company.",
    tagsAria: "Tags",
    primaryContact: "Primary contact",
    commercial: "Account manager",
    expiration: "Expiration",
    noModuleOptions: "No options",
    perPage: "Per page",
    prevPage: "Previous page",
    nextPage: "Next page",
    pageInfo: "Page {current} / {total}",
    table: {
      company: "Company",
      clientNumber: "Client no.",
      primaryContact: "Primary contact",
      commercial: "Account manager",
      modules: "Modules",
      expiration: "Expiration",
      equipment: "Equipment",
      tags: "Tags"
    },
    statusFilters: {
      active: "Active",
      expiring: "Expiring soon",
      expired: "Expired",
      suspended: "Suspended"
    },
    contractStatus: {
      suspended: "Suspended",
      unknown: "Not specified",
      expired: "Expired",
      expiring: "Expiring soon",
      active: "Active"
    },
    sortOptions: {
      "name:asc": "Alphabetical A → Z",
      "name:desc": "Alphabetical Z → A",
      "expiration:asc": "Expiration · soonest",
      "expiration:desc": "Expiration · latest",
      "commercial:asc": "Account manager · A → Z",
      "status:asc": "Contract status"
    },
    export: {
      filename: "companies.csv",
      headers: {
        name: "Name",
        contractOptions: "Contract options",
        expiration: "Expiration date",
        commercial: "Account manager"
      }
    },
    columnsModal: {
      title: "Table columns",
      subtitle: "Choose which columns are visible in the companies list.",
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
    }
  },
  de: {
    eyebrow: "Kundenportfolio",
    pageTitle: "Unternehmen",
    loadingPortfolio: "Portfolio wird geladen…",
    subtitle: "{filtered} Unternehmen angezeigt von {total}",
    subtitlePlural: "{filtered} Unternehmen angezeigt von {total}",
    exportCsv: "Als CSV exportieren",
    exportCsvAria: "CSV exportieren",
    columnsSettings: "Spalten konfigurieren",
    columnsSettingsAria: "Tabellenspalten konfigurieren",
    newEnterprise: "Neues Unternehmen",
    searchPlaceholder: "Unternehmen, Kontakt, Vertrieb, Tag…",
    searchAria: "Unternehmen suchen",
    clearSearch: "Suche löschen",
    filterByContract: "Nach Vertragsoption filtern",
    clearFilters: "Filter zurücksetzen",
    sortAria: "Sortierung der Unternehmen",
    loading: "Unternehmen werden geladen…",
    loadError: "Fehler beim Laden der Kunden",
    loadErrorStatus: "Fehler beim Laden der Unternehmen ({status})",
    emptyTitle: "Keine Unternehmen gefunden",
    emptyHint: "Filter anpassen oder ein neues Unternehmen anlegen.",
    tagsAria: "Tags",
    primaryContact: "Hauptkontakt",
    commercial: "Vertrieb",
    expiration: "Ablauf",
    noModuleOptions: "Keine Optionen",
    perPage: "Pro Seite",
    prevPage: "Vorherige Seite",
    nextPage: "Nächste Seite",
    pageInfo: "Seite {current} / {total}",
    table: {
      company: "Unternehmen",
      clientNumber: "Kundennr.",
      primaryContact: "Hauptkontakt",
      commercial: "Vertrieb",
      modules: "Module",
      expiration: "Ablauf",
      equipment: "Geräte",
      tags: "Tags"
    },
    statusFilters: {
      active: "Aktiv",
      expiring: "Läuft bald ab",
      expired: "Abgelaufen",
      suspended: "Ausgesetzt"
    },
    contractStatus: {
      suspended: "Ausgesetzt",
      unknown: "Nicht angegeben",
      expired: "Abgelaufen",
      expiring: "Läuft bald ab",
      active: "Aktiv"
    },
    sortOptions: {
      "name:asc": "Alphabetisch A → Z",
      "name:desc": "Alphabetisch Z → A",
      "expiration:asc": "Ablauf · nächster",
      "expiration:desc": "Ablauf · spätester",
      "commercial:asc": "Vertrieb · A → Z",
      "status:asc": "Vertragsstatus"
    },
    export: {
      filename: "unternehmen.csv",
      headers: {
        name: "Name",
        contractOptions: "Vertragsoptionen",
        expiration: "Ablaufdatum",
        commercial: "Vertrieb"
      }
    },
    columnsModal: {
      title: "Tabellenspalten",
      subtitle: "Wählen Sie die sichtbaren Spalten in der Unternehmenliste.",
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
    }
  },
  it: {
    eyebrow: "Portafoglio clienti",
    pageTitle: "Aziende",
    loadingPortfolio: "Caricamento portafoglio…",
    subtitle: "{filtered} azienda visualizzata su {total}",
    subtitlePlural: "{filtered} aziende visualizzate su {total}",
    exportCsv: "Esporta in CSV",
    exportCsvAria: "Esporta CSV",
    columnsSettings: "Configura colonne",
    columnsSettingsAria: "Configura le colonne della tabella",
    newEnterprise: "Nuova azienda",
    searchPlaceholder: "Azienda, contatto, commerciale, etichetta…",
    searchAria: "Cerca un'azienda",
    clearSearch: "Cancella ricerca",
    filterByContract: "Filtra per opzione contratto",
    clearFilters: "Cancella filtri",
    sortAria: "Ordine di visualizzazione aziende",
    loading: "Caricamento aziende…",
    loadError: "Errore nel caricamento clienti",
    loadErrorStatus: "Errore nel caricamento aziende ({status})",
    emptyTitle: "Nessuna azienda trovata",
    emptyHint: "Modifica i filtri o crea una nuova azienda.",
    tagsAria: "Etichette",
    primaryContact: "Contatto principale",
    commercial: "Commerciale",
    expiration: "Scadenza",
    noModuleOptions: "Nessuna opzione",
    perPage: "Per pagina",
    prevPage: "Pagina precedente",
    nextPage: "Pagina successiva",
    pageInfo: "Pagina {current} / {total}",
    table: {
      company: "Azienda",
      clientNumber: "N° cliente",
      primaryContact: "Contatto principale",
      commercial: "Commerciale",
      modules: "Moduli",
      expiration: "Scadenza",
      equipment: "Attrezzature",
      tags: "Etichette"
    },
    statusFilters: {
      active: "Attive",
      expiring: "In scadenza",
      expired: "Scadute",
      suspended: "Sospese"
    },
    contractStatus: {
      suspended: "Sospeso",
      unknown: "Non indicato",
      expired: "Scaduto",
      expiring: "In scadenza",
      active: "Attivo"
    },
    sortOptions: {
      "name:asc": "Ordine alfabetico crescente",
      "name:desc": "Ordine alfabetico decrescente",
      "expiration:asc": "Scadenza · più vicina",
      "expiration:desc": "Scadenza · più lontana",
      "commercial:asc": "Commerciale · ordine crescente",
      "status:asc": "Stato contratto"
    },
    export: {
      filename: "aziende.csv",
      headers: {
        name: "Nome",
        contractOptions: "Opzioni contratto",
        expiration: "Data scadenza",
        commercial: "Commerciale"
      }
    },
    columnsModal: {
      title: "Colonne della tabella",
      subtitle: "Scegli le colonne visibili nell'elenco aziende.",
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
    }
  },
  es: {
    eyebrow: "Cartera de clientes",
    pageTitle: "Empresas",
    loadingPortfolio: "Cargando cartera…",
    subtitle: "{filtered} empresa mostrada de {total}",
    subtitlePlural: "{filtered} empresas mostradas de {total}",
    exportCsv: "Exportar a CSV",
    exportCsvAria: "Exportar CSV",
    columnsSettings: "Configurar columnas",
    columnsSettingsAria: "Configurar columnas de la tabla",
    newEnterprise: "Nueva empresa",
    searchPlaceholder: "Empresa, contacto, comercial, etiqueta…",
    searchAria: "Buscar una empresa",
    clearSearch: "Borrar búsqueda",
    filterByContract: "Filtrar por opción de contrato",
    clearFilters: "Borrar filtros",
    sortAria: "Orden de visualización de empresas",
    loading: "Cargando empresas…",
    loadError: "Error al cargar clientes",
    loadErrorStatus: "Error al cargar empresas ({status})",
    emptyTitle: "Ninguna empresa encontrada",
    emptyHint: "Ajuste los filtros o cree una nueva empresa.",
    tagsAria: "Etiquetas",
    primaryContact: "Contacto principal",
    commercial: "Comercial",
    expiration: "Vencimiento",
    noModuleOptions: "Sin opciones",
    perPage: "Por página",
    prevPage: "Página anterior",
    nextPage: "Página siguiente",
    pageInfo: "Página {current} / {total}",
    table: {
      company: "Empresa",
      clientNumber: "N° cliente",
      primaryContact: "Contacto principal",
      commercial: "Comercial",
      modules: "Módulos",
      expiration: "Vencimiento",
      equipment: "Equipos",
      tags: "Etiquetas"
    },
    statusFilters: {
      active: "Activas",
      expiring: "Por vencer",
      expired: "Vencidas",
      suspended: "Suspendidas"
    },
    contractStatus: {
      suspended: "Suspendido",
      unknown: "No indicado",
      expired: "Vencido",
      expiring: "Por vencer",
      active: "Activo"
    },
    sortOptions: {
      "name:asc": "Orden alfabético ascendente",
      "name:desc": "Orden alfabético descendente",
      "expiration:asc": "Vencimiento · más próximo",
      "expiration:desc": "Vencimiento · más lejano",
      "commercial:asc": "Comercial · orden ascendente",
      "status:asc": "Estado del contrato"
    },
    export: {
      filename: "empresas.csv",
      headers: {
        name: "Nombre",
        contractOptions: "Opciones de contrato",
        expiration: "Fecha de vencimiento",
        commercial: "Comercial"
      }
    },
    columnsModal: {
      title: "Columnas de la tabla",
      subtitle: "Elija las columnas visibles en la lista de empresas.",
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
    }
  }
};
const CONTRACT_STATUS_COLORS = {
  suspended: "#d97706",
  unknown: "#6b7280",
  expired: "#dc2626",
  expiring: "#ea580c",
  active: "#2563eb"
};
export function getEnterprisesPageCopy(locale) {
  const t = pickLocaleMessages(ENTERPRISES_COPY, locale);
  return {
    ...t,
    statusFilterItems: STATUS_FILTER_KEYS.map(key => ({
      key,
      label: t.statusFilters[key],
      ...STATUS_FILTER_META[key]
    })),
    sortOptions: SORT_OPTION_VALUES.map(value => ({
      value,
      label: t.sortOptions[value]
    })),
    formatSubtitle: (filteredCount, total) => {
      const filtered = String(filteredCount);
      const totalStr = String(total);
      const template = filteredCount > 1 ? t.subtitlePlural : t.subtitle;
      return interpolate(template, {
        filtered,
        total: totalStr
      });
    },
    formatPageInfo: (current, total) => interpolate(t.pageInfo, {
      current: String(current),
      total: String(total)
    }),
    formatLoadErrorStatus: status => interpolate(t.loadErrorStatus, {
      status: String(status)
    }),
    getContractStatus: (expirationDate, isSuspended = false) => {
      if (isSuspended) {
        return {
          status: "suspended",
          label: t.contractStatus.suspended,
          color: CONTRACT_STATUS_COLORS.suspended
        };
      }
      if (!expirationDate) {
        return {
          status: "unknown",
          label: t.contractStatus.unknown,
          color: CONTRACT_STATUS_COLORS.unknown
        };
      }
      const expiration = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expiration - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return {
          status: "expired",
          label: t.contractStatus.expired,
          color: CONTRACT_STATUS_COLORS.expired
        };
      }
      if (diffDays <= 30) {
        return {
          status: "expiring",
          label: t.contractStatus.expiring,
          color: CONTRACT_STATUS_COLORS.expiring
        };
      }
      return {
        status: "active",
        label: t.contractStatus.active,
        color: CONTRACT_STATUS_COLORS.active
      };
    },
    getCsvHeaders: equipmentColumns => [t.export.headers.name, t.export.headers.contractOptions, t.export.headers.expiration, t.export.headers.commercial, ...equipmentColumns.map(col => col.label)]
  };
}
