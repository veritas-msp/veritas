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
    filters: {
      aria: "Filtres inventaire",
      search: "Recherche",
      status: "Statut",
      companies: "Entreprises",
      types: "Types",
      searchCompany: "Rechercher une entreprise…",
      noCompanyFound: "Aucune entreprise trouvée",
      clear: "Effacer",
      clearAll: "Réinitialiser les filtres",
      none: "Aucun"
    },
    refresh: "Actualiser",
    exportCsv: "Exporter la vue filtrée",
    exportCsvAria: "Exporter le tableau filtré en CSV",
    exportFilenamePrefix: "inventaire-peripheriques",
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
      alerts: "Alertes",
      supervision: "Supervision",
      alertsMonth: "30 jours",
      actions: "Actions"
    },
    status: {
      active: "Actif",
      inactive: "Inactif"
    },
    alertStatus: {
      active: "Alertes natives actives",
      disabled: "Alertes natives désactivées",
      suspended: "Alertes natives suspendues"
    },
    supervisionStatus: {
      ok: "Supervision active (intégration)",
      inactive: "Supervision inactive",
      warning: "Supervision : avertissement",
      critical: "Supervision : critique"
    },
    alertsMonthBreakdown: "{native} alerte(s) native(s) · {supervision} événement(s)/notification(s) intégration",

    bulk: {
      selected: "périphérique sélectionné",
      selectedPlural: "périphériques sélectionnés",
      edit: "Modifier",
      clearSelection: "Effacer la sélection",
      selectAll: "Tout sélectionner sur la page",
      selectAllFiltered: "Tout sélectionner ({count})",
      selectRow: "Sélectionner {name}"
    },
    bulkModal: {
      title: "Modifier les périphériques",
      selectedOne: "1 périphérique sélectionné",
      selectedMany: "{count} périphériques sélectionnés",
      editStatus: "Statut du périphérique",
      editLocation: "Site",
      locationPlaceholder: "Site / emplacement",
      editAlerts: "Alertes natives Veritas",
      alertsHint: "Mode des alertes natives Veritas (actives, désactivées ou suspendues) — distinct de la supervision via intégration.",
      apply: "Appliquer",
      saving: "Application…",
      submitError: "Impossible d’appliquer les modifications",
      validation: {
        noField: "Activez au moins un champ à modifier."
      }
    },
    toastLoadError: "Impossible de charger l’inventaire.",
    alertsMonthHint: "Alertes natives Veritas + événements/notifications de supervision (intégration) sur 30 jours",
    toasts: {
      bulkSuccess: "{count} périphérique mis à jour",
      bulkSuccessPlural: "{count} périphériques mis à jour",
      bulkPartial: "{updated} mis à jour, {failed} en échec",
      bulkError: "Aucune modification appliquée",
      exportSuccess: "{count} périphérique exporté",
      exportSuccessPlural: "{count} périphériques exportés",
      exportEmpty: "Aucun périphérique à exporter.",
      exportError: "Impossible d’exporter l’inventaire."
    }
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
    filters: {
      aria: "Inventory filters",
      search: "Search",
      status: "Status",
      companies: "Companies",
      types: "Types",
      searchCompany: "Search a company…",
      noCompanyFound: "No company found",
      clear: "Clear",
      clearAll: "Reset filters",
      none: "None"
    },
    refresh: "Refresh",
    exportCsv: "Export filtered view",
    exportCsvAria: "Export the filtered table as CSV",
    exportFilenamePrefix: "device-inventory",
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
      alerts: "Alerts",
      supervision: "Supervision",
      alertsMonth: "30 days",
      actions: "Actions"
    },
    status: {
      active: "Active",
      inactive: "Inactive"
    },
    alertStatus: {
      active: "Native alerts active",
      disabled: "Native alerts disabled",
      suspended: "Native alerts suspended"
    },
    supervisionStatus: {
      ok: "Supervision active (integration)",
      inactive: "Supervision inactive",
      warning: "Supervision: warning",
      critical: "Supervision: critical"
    },
    alertsMonthBreakdown: "{native} native alert(s) · {supervision} integration event(s)/notification(s)",
    bulk: {
      selected: "device selected",
      selectedPlural: "devices selected",
      edit: "Edit",
      clearSelection: "Clear selection",
      selectAll: "Select all on this page",
      selectAllFiltered: "Select all ({count})",
      selectRow: "Select {name}"
    },
    bulkModal: {
      title: "Edit devices",
      selectedOne: "1 device selected",
      selectedMany: "{count} devices selected",
      editStatus: "Device status",
      editLocation: "Site",
      locationPlaceholder: "Site / location",
      editAlerts: "Monitoring alerts",
      alertsHint: "Applies the same alert mode as the device sheet (active, disabled or suspended).",
      apply: "Apply",
      saving: "Applying…",
      submitError: "Unable to apply the changes",
      validation: {
        noField: "Enable at least one field to update."
      }
    },
    toastLoadError: "Unable to load the inventory.",
    alertsMonthHint: "Native Veritas alerts + supervision events/notifications (integration) over 30 days",
    toasts: {
      bulkSuccess: "{count} device updated",
      bulkSuccessPlural: "{count} devices updated",
      bulkPartial: "{updated} updated, {failed} failed",
      bulkError: "No changes applied",
      exportSuccess: "{count} device exported",
      exportSuccessPlural: "{count} devices exported",
      exportEmpty: "No devices to export.",
      exportError: "Unable to export the inventory."
    }
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
    filters: {
      aria: "Inventarfilter",
      search: "Suche",
      status: "Status",
      companies: "Unternehmen",
      types: "Typen",
      searchCompany: "Unternehmen suchen…",
      noCompanyFound: "Kein Unternehmen gefunden",
      clear: "Löschen",
      clearAll: "Filter zurücksetzen",
      none: "Keine"
    },
    refresh: "Aktualisieren",
    exportCsv: "Gefilterte Ansicht exportieren",
    exportCsvAria: "Gefilterte Tabelle als CSV exportieren",
    exportFilenamePrefix: "geraeteinventar",
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
      alerts: "Alarme",
      supervision: "Supervision",
      alertsMonth: "30 Tage",
      actions: "Aktionen"
    },
    status: {
      active: "Aktiv",
      inactive: "Inaktiv"
    },
    alertStatus: {
      active: "Native Alarme aktiv",
      disabled: "Native Alarme deaktiviert",
      suspended: "Native Alarme ausgesetzt"
    },
    supervisionStatus: {
      ok: "Supervision aktiv (Integration)",
      inactive: "Supervision inaktiv",
      warning: "Supervision: Warnung",
      critical: "Supervision: kritisch"
    },
    alertsMonthBreakdown: "{native} native Alarm(e) · {supervision} Integrations-Ereignis(se)/Benachrichtigung(en)",
    bulk: {
      selected: "Gerät ausgewählt",
      selectedPlural: "Geräte ausgewählt",
      edit: "Bearbeiten",
      clearSelection: "Auswahl aufheben",
      selectAll: "Alle auf der Seite auswählen",
      selectAllFiltered: "Alle auswählen ({count})",
      selectRow: "{name} auswählen"
    },
    bulkModal: {
      title: "Geräte bearbeiten",
      selectedOne: "1 Gerät ausgewählt",
      selectedMany: "{count} Geräte ausgewählt",
      editStatus: "Gerätestatus",
      editLocation: "Standort",
      locationPlaceholder: "Standort / Platzierung",
      editAlerts: "Überwachungsalarme",
      alertsHint: "Wendet denselben Alarmmodus wie in der Gerätekarte an (aktiv, deaktiviert oder ausgesetzt).",
      apply: "Übernehmen",
      saving: "Wird übernommen…",
      submitError: "Änderungen konnten nicht übernommen werden",
      validation: {
        noField: "Aktivieren Sie mindestens ein Feld."
      }
    },
    toastLoadError: "Inventar konnte nicht geladen werden.",
    alertsMonthHint: "Native Veritas-Alarme + Supervisions-Ereignisse/Benachrichtigungen (Integration) der letzten 30 Tage",
    toasts: {
      bulkSuccess: "{count} Gerät aktualisiert",
      bulkSuccessPlural: "{count} Geräte aktualisiert",
      bulkPartial: "{updated} aktualisiert, {failed} fehlgeschlagen",
      bulkError: "Keine Änderungen übernommen",
      exportSuccess: "{count} Gerät exportiert",
      exportSuccessPlural: "{count} Geräte exportiert",
      exportEmpty: "Keine Geräte zum Exportieren.",
      exportError: "Inventar konnte nicht exportiert werden."
    }
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
    filters: {
      aria: "Filtri inventario",
      search: "Ricerca",
      status: "Stato",
      companies: "Aziende",
      types: "Tipi",
      searchCompany: "Cerca un'azienda…",
      noCompanyFound: "Nessuna azienda trovata",
      clear: "Cancella",
      clearAll: "Reimposta filtri",
      none: "Nessuno"
    },
    refresh: "Aggiorna",
    exportCsv: "Esporta la vista filtrata",
    exportCsvAria: "Esporta la tabella filtrata in CSV",
    exportFilenamePrefix: "inventario-periferiche",
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
      alerts: "Avvisi",
      supervision: "Supervisione",
      alertsMonth: "30 giorni",
      actions: "Azioni"
    },
    status: {
      active: "Attivo",
      inactive: "Inattivo"
    },
    alertStatus: {
      active: "Avvisi nativi attivi",
      disabled: "Avvisi nativi disattivati",
      suspended: "Avvisi nativi sospesi"
    },
    supervisionStatus: {
      ok: "Supervisione attiva (integrazione)",
      inactive: "Supervisione inattiva",
      warning: "Supervisione: avviso",
      critical: "Supervisione: critica"
    },
    alertsMonthBreakdown: "{native} avviso/i nativo/i · {supervision} evento/i/notifica/e integrazione",
    bulk: {
      selected: "periferica selezionata",
      selectedPlural: "periferiche selezionate",
      edit: "Modifica",
      clearSelection: "Cancella selezione",
      selectAll: "Seleziona tutto nella pagina",
      selectAllFiltered: "Seleziona tutto ({count})",
      selectRow: "Seleziona {name}"
    },
    bulkModal: {
      title: "Modifica periferiche",
      selectedOne: "1 periferica selezionata",
      selectedMany: "{count} periferiche selezionate",
      editStatus: "Stato periferica",
      editLocation: "Sede",
      locationPlaceholder: "Sede / ubicazione",
      editAlerts: "Avvisi di supervisione",
      alertsHint: "Applica la stessa modalità avvisi della scheda periferica (attivi, disattivati o sospesi).",
      apply: "Applica",
      saving: "Applicazione…",
      submitError: "Impossibile applicare le modifiche",
      validation: {
        noField: "Attiva almeno un campo da modificare."
      }
    },
    toastLoadError: "Impossibile caricare l’inventario.",
    alertsMonthHint: "Avvisi nativi Veritas + eventi/notifiche di supervisione (integrazione) degli ultimi 30 giorni",
    toasts: {
      bulkSuccess: "{count} periferica aggiornata",
      bulkSuccessPlural: "{count} periferiche aggiornate",
      bulkPartial: "{updated} aggiornate, {failed} in errore",
      bulkError: "Nessuna modifica applicata",
      exportSuccess: "{count} periferica esportata",
      exportSuccessPlural: "{count} periferiche esportate",
      exportEmpty: "Nessuna periferica da esportare.",
      exportError: "Impossibile esportare l’inventario."
    }
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
    filters: {
      aria: "Filtros de inventario",
      search: "Búsqueda",
      status: "Estado",
      companies: "Empresas",
      types: "Tipos",
      searchCompany: "Buscar una empresa…",
      noCompanyFound: "Ninguna empresa encontrada",
      clear: "Borrar",
      clearAll: "Restablecer filtros",
      none: "Ninguno"
    },
    refresh: "Actualizar",
    exportCsv: "Exportar la vista filtrada",
    exportCsvAria: "Exportar la tabla filtrada a CSV",
    exportFilenamePrefix: "inventario-perifericos",
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
      alerts: "Alertas",
      supervision: "Supervisión",
      alertsMonth: "30 días",
      actions: "Acciones"
    },
    status: {
      active: "Activo",
      inactive: "Inactivo"
    },
    alertStatus: {
      active: "Alertas nativas activas",
      disabled: "Alertas nativas desactivadas",
      suspended: "Alertas nativas suspendidas"
    },
    supervisionStatus: {
      ok: "Supervisión activa (integración)",
      inactive: "Supervisión inactiva",
      warning: "Supervisión: advertencia",
      critical: "Supervisión: crítica"
    },
    alertsMonthBreakdown: "{native} alerta(s) nativa(s) · {supervision} evento(s)/notificación(es) de integración",
    bulk: {
      selected: "periférico seleccionado",
      selectedPlural: "periféricos seleccionados",
      edit: "Editar",
      clearSelection: "Borrar selección",
      selectAll: "Seleccionar todo en la página",
      selectAllFiltered: "Seleccionar todo ({count})",
      selectRow: "Seleccionar {name}"
    },
    bulkModal: {
      title: "Editar periféricos",
      selectedOne: "1 periférico seleccionado",
      selectedMany: "{count} periféricos seleccionados",
      editStatus: "Estado del periférico",
      editLocation: "Sitio",
      locationPlaceholder: "Sitio / ubicación",
      editAlerts: "Alertas de supervisión",
      alertsHint: "Aplica el mismo modo de alertas que en la ficha (activas, desactivadas o suspendidas).",
      apply: "Aplicar",
      saving: "Aplicando…",
      submitError: "No se pudieron aplicar los cambios",
      validation: {
        noField: "Active al menos un campo para modificar."
      }
    },
    toastLoadError: "No se pudo cargar el inventario.",
    alertsMonthHint: "Alertas nativas Veritas + eventos/notificaciones de supervisión (integración) de los últimos 30 días",
    toasts: {
      bulkSuccess: "{count} periférico actualizado",
      bulkSuccessPlural: "{count} periféricos actualizados",
      bulkPartial: "{updated} actualizados, {failed} con error",
      bulkError: "No se aplicaron cambios",
      exportSuccess: "{count} periférico exportado",
      exportSuccessPlural: "{count} periféricos exportados",
      exportEmpty: "No hay periféricos para exportar.",
      exportError: "No se pudo exportar el inventario."
    }
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
    }),
    formatBulkModalSelected: count => interpolate(count === 1 ? t.bulkModal.selectedOne : t.bulkModal.selectedMany, {
      count: String(count)
    }),
    formatBulkSelectRow: name => interpolate(t.bulk.selectRow, {
      name: name || "—"
    }),
    formatSelectAllFiltered: count => interpolate(t.bulk.selectAllFiltered, {
      count: String(count)
    }),
    formatBulkSuccess: count => interpolate(count > 1 ? t.toasts.bulkSuccessPlural : t.toasts.bulkSuccess, {
      count: String(count)
    }),
    formatBulkPartial: (updated, failed) => interpolate(t.toasts.bulkPartial, {
      updated: String(updated),
      failed: String(failed)
    }),
    formatAlertsMonthBreakdown: (native, supervision) => interpolate(t.alertsMonthBreakdown, {
      native: String(native ?? 0),
      supervision: String(supervision ?? 0)
    }),
    formatExportSuccess: count => interpolate(count > 1 ? t.toasts.exportSuccessPlural : t.toasts.exportSuccess, {
      count: String(count)
    })
  };
}
