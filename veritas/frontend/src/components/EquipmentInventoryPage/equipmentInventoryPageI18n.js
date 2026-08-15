import { createLocaleGetter, interpolate } from "../../i18n/translate";

const COPY = {
  fr: {
    eyebrow: "Services managés",
    pageTitle: "Inventaire périphériques",
    loadingPortfolio: "Chargement de l’inventaire…",
    subtitle: "{filtered} périphérique affiché sur {total}",
    subtitlePlural: "{filtered} périphériques affichés sur {total}",
    searchPlaceholder: "Nom, IP, série, entreprise, type…",
    searchAria: "Rechercher des périphériques",
    clearSearch: "Effacer la recherche",
    filterClientAll: "Toutes les entreprises",
    filterTypeAll: "Tous les types",
    filterTypeAria: "Filtrer par type de périphérique",
    refresh: "Actualiser",
    loading: "Chargement de l’inventaire…",
    emptyTitle: "Aucun périphérique trouvé",
    emptyHint: "Ajustez vos filtres ou actualisez l’inventaire.",
    empty: "Aucun périphérique trouvé.",
    emptyFiltered: "Aucun périphérique ne correspond à la recherche.",
    perPage: "Par page",
    prevPage: "Page précédente",
    nextPage: "Page suivante",
    pageInfo: "Page {current} / {total}",
    statusFilters: {
      all: "Tous",
      active: "Actifs",
      inactive: "Inactifs"
    },
    columns: {
      company: "Entreprise",
      name: "Nom",
      type: "Type",
      ip: "IP",
      serial: "N° série",
      site: "Site",
      status: "Statut",
      actions: "Actions"
    },
    status: {
      active: "Actif",
      inactive: "Inactif"
    },
    toastLoadError: "Impossible de charger l’inventaire."
  },
  en: {
    eyebrow: "Managed services",
    pageTitle: "Device inventory",
    loadingPortfolio: "Loading inventory…",
    subtitle: "{filtered} device shown of {total}",
    subtitlePlural: "{filtered} devices shown of {total}",
    searchPlaceholder: "Name, IP, serial, company, type…",
    searchAria: "Search devices",
    clearSearch: "Clear search",
    filterClientAll: "All companies",
    filterTypeAll: "All types",
    filterTypeAria: "Filter by device type",
    refresh: "Refresh",
    loading: "Loading inventory…",
    emptyTitle: "No devices found",
    emptyHint: "Adjust your filters or refresh the inventory.",
    empty: "No devices found.",
    emptyFiltered: "No devices match the search.",
    perPage: "Per page",
    prevPage: "Previous page",
    nextPage: "Next page",
    pageInfo: "Page {current} / {total}",
    statusFilters: {
      all: "All",
      active: "Active",
      inactive: "Inactive"
    },
    columns: {
      company: "Company",
      name: "Name",
      type: "Type",
      ip: "IP",
      serial: "Serial",
      site: "Site",
      status: "Status",
      actions: "Actions"
    },
    status: {
      active: "Active",
      inactive: "Inactive"
    },
    toastLoadError: "Unable to load the inventory."
  },
  de: {
    eyebrow: "Managed Services",
    pageTitle: "Geräteinventar",
    loadingPortfolio: "Inventar wird geladen…",
    subtitle: "{filtered} Gerät von {total} angezeigt",
    subtitlePlural: "{filtered} Geräte von {total} angezeigt",
    searchPlaceholder: "Name, IP, Serie, Unternehmen, Typ…",
    searchAria: "Geräte suchen",
    clearSearch: "Suche löschen",
    filterClientAll: "Alle Unternehmen",
    filterTypeAll: "Alle Typen",
    filterTypeAria: "Nach Gerätetyp filtern",
    refresh: "Aktualisieren",
    loading: "Inventar wird geladen…",
    emptyTitle: "Keine Geräte gefunden",
    emptyHint: "Passen Sie die Filter an oder aktualisieren Sie das Inventar.",
    empty: "Keine Geräte gefunden.",
    emptyFiltered: "Keine Geräte entsprechen der Suche.",
    perPage: "Pro Seite",
    prevPage: "Vorherige Seite",
    nextPage: "Nächste Seite",
    pageInfo: "Seite {current} / {total}",
    statusFilters: {
      all: "Alle",
      active: "Aktiv",
      inactive: "Inaktiv"
    },
    columns: {
      company: "Unternehmen",
      name: "Name",
      type: "Typ",
      ip: "IP",
      serial: "Seriennr.",
      site: "Standort",
      status: "Status",
      actions: "Aktionen"
    },
    status: {
      active: "Aktiv",
      inactive: "Inaktiv"
    },
    toastLoadError: "Inventar konnte nicht geladen werden."
  },
  it: {
    eyebrow: "Servizi gestiti",
    pageTitle: "Inventario periferiche",
    loadingPortfolio: "Caricamento inventario…",
    subtitle: "{filtered} periferica visualizzata su {total}",
    subtitlePlural: "{filtered} periferiche visualizzate su {total}",
    searchPlaceholder: "Nome, IP, serie, azienda, tipo…",
    searchAria: "Cerca periferiche",
    clearSearch: "Cancella ricerca",
    filterClientAll: "Tutte le aziende",
    filterTypeAll: "Tutti i tipi",
    filterTypeAria: "Filtra per tipo di periferica",
    refresh: "Aggiorna",
    loading: "Caricamento inventario…",
    emptyTitle: "Nessuna periferica trovata",
    emptyHint: "Modifica i filtri o aggiorna l’inventario.",
    empty: "Nessuna periferica trovata.",
    emptyFiltered: "Nessuna periferica corrisponde alla ricerca.",
    perPage: "Per pagina",
    prevPage: "Pagina precedente",
    nextPage: "Pagina successiva",
    pageInfo: "Pagina {current} / {total}",
    statusFilters: {
      all: "Tutte",
      active: "Attive",
      inactive: "Inattive"
    },
    columns: {
      company: "Azienda",
      name: "Nome",
      type: "Tipo",
      ip: "IP",
      serial: "N. serie",
      site: "Sede",
      status: "Stato",
      actions: "Azioni"
    },
    status: {
      active: "Attivo",
      inactive: "Inattivo"
    },
    toastLoadError: "Impossibile caricare l’inventario."
  },
  es: {
    eyebrow: "Servicios gestionados",
    pageTitle: "Inventario de periféricos",
    loadingPortfolio: "Cargando inventario…",
    subtitle: "{filtered} periférico mostrado de {total}",
    subtitlePlural: "{filtered} periféricos mostrados de {total}",
    searchPlaceholder: "Nombre, IP, serie, empresa, tipo…",
    searchAria: "Buscar periféricos",
    clearSearch: "Borrar búsqueda",
    filterClientAll: "Todas las empresas",
    filterTypeAll: "Todos los tipos",
    filterTypeAria: "Filtrar por tipo de periférico",
    refresh: "Actualizar",
    loading: "Cargando inventario…",
    emptyTitle: "No se encontraron periféricos",
    emptyHint: "Ajuste los filtros o actualice el inventario.",
    empty: "No se encontraron periféricos.",
    emptyFiltered: "Ningún periférico coincide con la búsqueda.",
    perPage: "Por página",
    prevPage: "Página anterior",
    nextPage: "Página siguiente",
    pageInfo: "Página {current} / {total}",
    statusFilters: {
      all: "Todos",
      active: "Activos",
      inactive: "Inactivos"
    },
    columns: {
      company: "Empresa",
      name: "Nombre",
      type: "Tipo",
      ip: "IP",
      serial: "N.º serie",
      site: "Sitio",
      status: "Estado",
      actions: "Acciones"
    },
    status: {
      active: "Activo",
      inactive: "Inactivo"
    },
    toastLoadError: "No se pudo cargar el inventario."
  }
};

const STATUS_FILTER_ITEMS = [{
  key: "all",
  icon: "mdi:devices",
  kpiTone: "blue"
}, {
  key: "active",
  icon: "mdi:check-circle",
  kpiTone: "green"
}, {
  key: "inactive",
  icon: "mdi:close-circle",
  kpiTone: "red"
}];

const getBaseCopy = createLocaleGetter(COPY);

export function getEquipmentInventoryPageCopy(locale) {
  const t = getBaseCopy(locale);
  return {
    ...t,
    statusFilterItems: STATUS_FILTER_ITEMS.map(item => ({
      ...item,
      label: t.statusFilters[item.key]
    })),
    formatSubtitle: (filteredCount, total) => interpolate(filteredCount > 1 ? t.subtitlePlural : t.subtitle, {
      filtered: String(filteredCount),
      total: String(total)
    }),
    formatPageInfo: (current, total) => interpolate(t.pageInfo, {
      current: String(current),
      total: String(total)
    })
  };
}
