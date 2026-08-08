import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const BACKUP_MSP_PANEL_COPY = {
  fr: {
    panelTitle: "Sauvegardes",
    jobsTitle: "Jobs",
    jobsSearchPlaceholder: "Rechercher dans les jobs…",
    jobsSearchAria: "Rechercher dans les jobs",
    clearSearchAria: "Effacer la recherche",
    addJobTitle: "Ajouter un job",
    addJobAria: "Ajouter un job",
    alertBar: {
      label: "Jobs sauvegarde",
      alerts: "Alertes ({count})",
      critical: "En erreur ({count})",
      warning: "Retard ({count})",
      ok: "OK ({count})",
      showAll: "Tout afficher",
      syncTooltip: "Synchroniser durée et date de dernière sauvegarde depuis CheckMK",
      syncLoading: "Sync…",
      sync: "Synchroniser",
      syncPrefix: "Sync",
      jobsToTreat: "{count} job à traiter",
      jobsToTreatPlural: "{count} jobs à traiter",
      alertsTitle: "Jobs en erreur ou en retard",
      criticalTitle: "Dernière sauvegarde > 48 h ou inconnue",
      warningTitle: "Dernière sauvegarde > 24 h",
      okTitle: "Dernière sauvegarde < 24 h"
    },
    empty: {
      noJobsTitle: "Aucun job",
      noJobsText: "Configurez les jobs de sauvegarde dans les fiches clients.",
      noResultsTitle: "Aucun résultat",
      noResultsText: "Aucun job ne correspond aux filtres actifs."
    },
    loading: {
      jobs: "Chargement des jobs…",
      hycu: "Chargement des instances HYCU…",
      veeam: "Chargement des instances Veeam…",
      activeBackup: "Chargement des réplicats Active Backup…",
      hyperBackup: "Chargement des réplicats HyperBackup…"
    },
    instances: {
      toggle: "Instances de sauvegarde ({count})",
      noHycuTitle: "Aucune instance HYCU",
      noHycuText: "Configurez les instances HYCU Backup dans les fiches clients.",
      noVeeamTitle: "Aucune instance Veeam",
      noVeeamText: "Configurez les instances Veeam dans les fiches clients.",
      noActiveBackupTitle: "Aucun réplicat Active Backup",
      noActiveBackupText: "Configurez les réplicats Active Backup dans les fiches clients.",
      noHyperBackupTitle: "Aucun réplicat HyperBackup",
      noHyperBackupText: "Configurez les réplicats HyperBackup dans les fiches clients.",
      addHycu: "Ajouter une instance HYCU",
      addVeeam: "Ajouter une instance Veeam",
      addActiveBackup: "Ajouter une instance Active Backup",
      addHyperBackup: "Ajouter une instance HyperBackup",
      licenseExpired: "Licence expirée",
      licenseExpiring: "Licence expire dans les 30 jours",
      moduleActive: "{label} : activé",
      moduleInactive: "{label} : inactif"
    },
    table: {
      status: "Statut",
      client: "Client",
      name: "Nom",
      type: "Type",
      server: "Serveur",
      destination: "Destination",
      lastBackup: "Dernière sauvegarde",
      duration: "Durée",
      mapping: "Mapping",
      action: "Action",
      expiration: "Expiration",
      modules: "Modules activés",
      storage: "Stockage de destination",
      sourceNas: "Nas d'origine",
      destNas: "Nas de destination",
      viewClient: "Voir la fiche client",
      deleteJob: "Supprimer le job",
      mapCheckmk: "Cliquer pour mapper avec CheckMK",
      hycuNoSync: "Job HYCU non synchronisable avec CheckMK"
    },
    toasts: {
      syncError: "Erreur lors de la synchronisation des jobs",
      syncDone: "Synchronisation terminée",
      jobDeleted: "Job supprimé",
      deleteError: "Erreur lors de la suppression du job"
    },
    unknownClient: "Client inconnu"
  },
  en: {
    panelTitle: "Backups",
    jobsTitle: "Jobs",
    jobsSearchPlaceholder: "Search jobs…",
    jobsSearchAria: "Search jobs",
    clearSearchAria: "Clear search",
    addJobTitle: "Add job",
    addJobAria: "Add job",
    alertBar: {
      label: "Backup jobs",
      alerts: "Alerts ({count})",
      critical: "Failed ({count})",
      warning: "Delayed ({count})",
      ok: "OK ({count})",
      showAll: "Show all",
      syncTooltip: "Sync duration and last backup date from CheckMK",
      syncLoading: "Sync…",
      sync: "Sync",
      syncPrefix: "Sync",
      jobsToTreat: "{count} job to review",
      jobsToTreatPlural: "{count} jobs to review",
      alertsTitle: "Jobs in error or delayed",
      criticalTitle: "Last backup > 48 h or unknown",
      warningTitle: "Last backup > 24 h",
      okTitle: "Last backup < 24 h"
    },
    empty: {
      noJobsTitle: "No jobs",
      noJobsText: "Configure backup jobs in client records.",
      noResultsTitle: "No results",
      noResultsText: "No jobs match the active filters."
    },
    loading: {
      jobs: "Loading jobs…",
      hycu: "Loading HYCU instances…",
      veeam: "Loading Veeam instances…",
      activeBackup: "Loading Active Backup replicas…",
      hyperBackup: "Loading HyperBackup replicas…"
    },
    instances: {
      toggle: "Backup instances ({count})",
      noHycuTitle: "No HYCU instances",
      noHycuText: "Configure HYCU Backup instances in client records.",
      noVeeamTitle: "No Veeam instances",
      noVeeamText: "Configure Veeam instances in client records.",
      noActiveBackupTitle: "No Active Backup replicas",
      noActiveBackupText: "Configure Active Backup replicas in client records.",
      noHyperBackupTitle: "No HyperBackup replicas",
      noHyperBackupText: "Configure HyperBackup replicas in client records.",
      addHycu: "Add HYCU instance",
      addVeeam: "Add Veeam instance",
      addActiveBackup: "Add Active Backup instance",
      addHyperBackup: "Add HyperBackup instance",
      licenseExpired: "License expired",
      licenseExpiring: "License expires within 30 days",
      moduleActive: "{label}: enabled",
      moduleInactive: "{label}: disabled"
    },
    table: {
      status: "Status",
      client: "Client",
      name: "Name",
      type: "Type",
      server: "Server",
      destination: "Destination",
      lastBackup: "Last backup",
      duration: "Duration",
      mapping: "Mapping",
      action: "Action",
      expiration: "Expiration",
      modules: "Enabled modules",
      storage: "Destination storage",
      sourceNas: "Source NAS",
      destNas: "Destination NAS",
      viewClient: "View client record",
      deleteJob: "Delete job",
      mapCheckmk: "Click to map with CheckMK",
      hycuNoSync: "HYCU job cannot sync with CheckMK"
    },
    toasts: {
      syncError: "Error syncing jobs",
      syncDone: "Sync completed",
      jobDeleted: "Job deleted",
      deleteError: "Error deleting job"
    },
    unknownClient: "Unknown client"
  },
  de: {
    panelTitle: "Backups",
    jobsTitle: "Jobs",
    jobsSearchPlaceholder: "Jobs suchen…",
    jobsSearchAria: "Jobs suchen",
    clearSearchAria: "Suche löschen",
    addJobTitle: "Job hinzufügen",
    addJobAria: "Job hinzufügen",
    alertBar: {
      label: "Backup-Jobs",
      alerts: "Alarme ({count})",
      critical: "Fehler ({count})",
      warning: "Verzögert ({count})",
      ok: "OK ({count})",
      showAll: "Alle anzeigen",
      syncTooltip: "Dauer und letztes Backup-Datum von CheckMK synchronisieren",
      syncLoading: "Sync…",
      sync: "Synchronisieren",
      syncPrefix: "Sync",
      jobsToTreat: "{count} Job zu bearbeiten",
      jobsToTreatPlural: "{count} Jobs zu bearbeiten",
      alertsTitle: "Jobs mit Fehler oder Verzögerung",
      criticalTitle: "Letztes Backup > 48 h oder unbekannt",
      warningTitle: "Letztes Backup > 24 h",
      okTitle: "Letztes Backup < 24 h"
    },
    empty: {
      noJobsTitle: "Keine Jobs",
      noJobsText: "Backup-Jobs in den Kundenakten konfigurieren.",
      noResultsTitle: "Keine Ergebnisse",
      noResultsText: "Kein Job entspricht den aktiven Filtern."
    },
    loading: {
      jobs: "Jobs werden geladen…",
      hycu: "HYCU-Instanzen werden geladen…",
      veeam: "Veeam-Instanzen werden geladen…",
      activeBackup: "Active-Backup-Replikate werden geladen…",
      hyperBackup: "HyperBackup-Replikate werden geladen…"
    },
    instances: {
      toggle: "Backup-Instanzen ({count})",
      noHycuTitle: "Keine HYCU-Instanz",
      noHycuText: "HYCU-Backup-Instanzen in den Kundenakten konfigurieren.",
      noVeeamTitle: "Keine Veeam-Instanz",
      noVeeamText: "Veeam-Instanzen in den Kundenakten konfigurieren.",
      noActiveBackupTitle: "Keine Active-Backup-Replikate",
      noActiveBackupText: "Active-Backup-Replikate in den Kundenakten konfigurieren.",
      noHyperBackupTitle: "Keine HyperBackup-Replikate",
      noHyperBackupText: "HyperBackup-Replikate in den Kundenakten konfigurieren.",
      addHycu: "HYCU-Instanz hinzufügen",
      addVeeam: "Veeam-Instanz hinzufügen",
      addActiveBackup: "Active-Backup-Instanz hinzufügen",
      addHyperBackup: "HyperBackup-Instanz hinzufügen",
      licenseExpired: "Lizenz abgelaufen",
      licenseExpiring: "Lizenz läuft in 30 Tagen ab",
      moduleActive: "{label}: aktiv",
      moduleInactive: "{label}: inaktiv"
    },
    table: {
      status: "Status",
      client: "Kunde",
      name: "Name",
      type: "Typ",
      server: "Server",
      destination: "Ziel",
      lastBackup: "Letztes Backup",
      duration: "Dauer",
      mapping: "Mapping",
      action: "Aktion",
      expiration: "Ablauf",
      modules: "Aktive Module",
      storage: "Zielspeicher",
      sourceNas: "Quell-NAS",
      destNas: "Ziel-NAS",
      viewClient: "Kundenakte anzeigen",
      deleteJob: "Job löschen",
      mapCheckmk: "Klicken zum Zuordnen mit CheckMK",
      hycuNoSync: "HYCU-Job nicht mit CheckMK synchronisierbar"
    },
    toasts: {
      syncError: "Fehler beim Synchronisieren der Jobs",
      syncDone: "Synchronisation abgeschlossen",
      jobDeleted: "Job gelöscht",
      deleteError: "Fehler beim Löschen des Jobs"
    },
    unknownClient: "Unbekannter Kunde"
  },
  it: {
    panelTitle: "Backup",
    jobsTitle: "Job",
    jobsSearchPlaceholder: "Cerca nei job…",
    jobsSearchAria: "Cerca nei job",
    clearSearchAria: "Cancella ricerca",
    addJobTitle: "Aggiungi job",
    addJobAria: "Aggiungi job",
    alertBar: {
      label: "Job di backup",
      alerts: "Avvisi ({count})",
      critical: "Errore ({count})",
      warning: "Ritardo ({count})",
      ok: "OK ({count})",
      showAll: "Mostra tutto",
      syncTooltip: "Sincronizza durata e data ultimo backup da CheckMK",
      syncLoading: "Sync…",
      sync: "Sincronizza",
      syncPrefix: "Sync",
      jobsToTreat: "{count} job da trattare",
      jobsToTreatPlural: "{count} job da trattare",
      alertsTitle: "Job in errore o in ritardo",
      criticalTitle: "Ultimo backup > 48 h o sconosciuto",
      warningTitle: "Ultimo backup > 24 h",
      okTitle: "Ultimo backup < 24 h"
    },
    empty: {
      noJobsTitle: "Nessun job",
      noJobsText: "Configura i job di backup nelle schede clienti.",
      noResultsTitle: "Nessun risultato",
      noResultsText: "Nessun job corrisponde ai filtri attivi."
    },
    loading: {
      jobs: "Caricamento job…",
      hycu: "Caricamento istanze HYCU…",
      veeam: "Caricamento istanze Veeam…",
      activeBackup: "Caricamento repliche Active Backup…",
      hyperBackup: "Caricamento repliche HyperBackup…"
    },
    instances: {
      toggle: "Istanze di backup ({count})",
      noHycuTitle: "Nessuna istanza HYCU",
      noHycuText: "Configura le istanze HYCU Backup nelle schede clienti.",
      noVeeamTitle: "Nessuna istanza Veeam",
      noVeeamText: "Configura le istanze Veeam nelle schede clienti.",
      noActiveBackupTitle: "Nessuna replica Active Backup",
      noActiveBackupText: "Configura le repliche Active Backup nelle schede clienti.",
      noHyperBackupTitle: "Nessuna replica HyperBackup",
      noHyperBackupText: "Configura le repliche HyperBackup nelle schede clienti.",
      addHycu: "Aggiungi istanza HYCU",
      addVeeam: "Aggiungi istanza Veeam",
      addActiveBackup: "Aggiungi istanza Active Backup",
      addHyperBackup: "Aggiungi istanza HyperBackup",
      licenseExpired: "Licenza scaduta",
      licenseExpiring: "Licenza in scadenza entro 30 giorni",
      moduleActive: "{label}: attivo",
      moduleInactive: "{label}: inattivo"
    },
    table: {
      status: "Stato",
      client: "Cliente",
      name: "Nome",
      type: "Tipo",
      server: "Server",
      destination: "Destinazione",
      lastBackup: "Ultimo backup",
      duration: "Durata",
      mapping: "Mapping",
      action: "Azione",
      expiration: "Scadenza",
      modules: "Moduli attivi",
      storage: "Storage di destinazione",
      sourceNas: "NAS origine",
      destNas: "NAS destinazione",
      viewClient: "Vedi scheda cliente",
      deleteJob: "Elimina job",
      mapCheckmk: "Clicca per associare a CheckMK",
      hycuNoSync: "Job HYCU non sincronizzabile con CheckMK"
    },
    toasts: {
      syncError: "Errore durante la sincronizzazione dei job",
      syncDone: "Sincronizzazione completata",
      jobDeleted: "Job eliminato",
      deleteError: "Errore durante l'eliminazione del job"
    },
    unknownClient: "Cliente sconosciuto"
  },
  es: {
    panelTitle: "Copias de seguridad",
    jobsTitle: "Jobs",
    jobsSearchPlaceholder: "Buscar en jobs…",
    jobsSearchAria: "Buscar en jobs",
    clearSearchAria: "Borrar búsqueda",
    addJobTitle: "Añadir job",
    addJobAria: "Añadir job",
    alertBar: {
      label: "Jobs de backup",
      alerts: "Alertas ({count})",
      critical: "Error ({count})",
      warning: "Retraso ({count})",
      ok: "OK ({count})",
      showAll: "Mostrar todo",
      syncTooltip: "Sincronizar duración y fecha del último backup desde CheckMK",
      syncLoading: "Sync…",
      sync: "Sincronizar",
      syncPrefix: "Sync",
      jobsToTreat: "{count} job por tratar",
      jobsToTreatPlural: "{count} jobs por tratar",
      alertsTitle: "Jobs con error o retraso",
      criticalTitle: "Último backup > 48 h o desconocido",
      warningTitle: "Último backup > 24 h",
      okTitle: "Último backup < 24 h"
    },
    empty: {
      noJobsTitle: "Ningún job",
      noJobsText: "Configure los jobs de backup en las fichas de clientes.",
      noResultsTitle: "Sin resultados",
      noResultsText: "Ningún job coincide con los filtros activos."
    },
    loading: {
      jobs: "Cargando jobs…",
      hycu: "Cargando instancias HYCU…",
      veeam: "Cargando instancias Veeam…",
      activeBackup: "Cargando réplicas Active Backup…",
      hyperBackup: "Cargando réplicas HyperBackup…"
    },
    instances: {
      toggle: "Instancias de backup ({count})",
      noHycuTitle: "Ninguna instancia HYCU",
      noHycuText: "Configure instancias HYCU Backup en las fichas de clientes.",
      noVeeamTitle: "Ninguna instancia Veeam",
      noVeeamText: "Configure instancias Veeam en las fichas de clientes.",
      noActiveBackupTitle: "Ninguna réplica Active Backup",
      noActiveBackupText: "Configure réplicas Active Backup en las fichas de clientes.",
      noHyperBackupTitle: "Ninguna réplica HyperBackup",
      noHyperBackupText: "Configure réplicas HyperBackup en las fichas de clientes.",
      addHycu: "Añadir instancia HYCU",
      addVeeam: "Añadir instancia Veeam",
      addActiveBackup: "Añadir instancia Active Backup",
      addHyperBackup: "Añadir instancia HyperBackup",
      licenseExpired: "Licencia expirada",
      licenseExpiring: "Licencia expira en 30 días",
      moduleActive: "{label}: activo",
      moduleInactive: "{label}: inactivo"
    },
    table: {
      status: "Estado",
      client: "Cliente",
      name: "Nombre",
      type: "Tipo",
      server: "Servidor",
      destination: "Destino",
      lastBackup: "Último backup",
      duration: "Duración",
      mapping: "Mapping",
      action: "Acción",
      expiration: "Expiración",
      modules: "Módulos activos",
      storage: "Almacenamiento destino",
      sourceNas: "NAS origen",
      destNas: "NAS destino",
      viewClient: "Ver ficha cliente",
      deleteJob: "Eliminar job",
      mapCheckmk: "Clic para mapear con CheckMK",
      hycuNoSync: "Job HYCU no sincronizable con CheckMK"
    },
    toasts: {
      syncError: "Error al sincronizar jobs",
      syncDone: "Sincronización completada",
      jobDeleted: "Job eliminado",
      deleteError: "Error al eliminar el job"
    },
    unknownClient: "Cliente desconocido"
  }
};
export function getBackupMspPanelCopy(locale) {
  const t = pickLocaleMessages(BACKUP_MSP_PANEL_COPY, locale);
  return {
    ...t,
    formatAlertCount: count => interpolate(t.alertBar.alerts, {
      count: String(count)
    }),
    formatCriticalCount: count => interpolate(t.alertBar.critical, {
      count: String(count)
    }),
    formatWarningCount: count => interpolate(t.alertBar.warning, {
      count: String(count)
    }),
    formatOkCount: count => interpolate(t.alertBar.ok, {
      count: String(count)
    }),
    formatJobsToTreat: count => interpolate(count === 1 ? t.alertBar.jobsToTreat : t.alertBar.jobsToTreatPlural, {
      count: String(count)
    }),
    formatInstancesToggle: count => interpolate(t.instances.toggle, {
      count: String(count)
    }),
    formatModuleActive: label => interpolate(t.instances.moduleActive, {
      label
    }),
    formatModuleInactive: label => interpolate(t.instances.moduleInactive, {
      label
    })
  };
}
