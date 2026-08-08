import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SALES_VIEW_DEFS = [{
  id: "all",
  kind: "",
  icon: "mdi:view-list"
}, {
  id: "prestation",
  kind: "prestation",
  icon: "mdi:briefcase-edit-outline"
}, {
  id: "installation",
  kind: "installation",
  icon: "mdi:tools"
}];
const STATUS_FILTER_KEYS = ["new", "in_progress", "pending", "resolved", "closed"];
const STATUS_FILTER_META = {
  new: {
    icon: "mdi:inbox-arrow-down",
    kpiTone: "blue"
  },
  in_progress: {
    icon: "mdi:progress-clock",
    kpiTone: "amber"
  },
  pending: {
    icon: "mdi:pause-circle-outline",
    kpiTone: "violet"
  },
  resolved: {
    icon: "mdi:check-circle-outline",
    kpiTone: "blue"
  },
  closed: {
    icon: "mdi:archive-outline",
    kpiTone: "orange"
  }
};
const PRIORITY_KEYS = ["low", "normal", "high", "urgent"];
const CHANNEL_KEYS = ["web", "phone", "email", "chat", "api", "whatsapp"];
const CHANNEL_ICONS = {
  web: "mdi:web",
  phone: "mdi:phone",
  email: "mdi:email-outline",
  chat: "mdi:message-outline",
  api: "mdi:api",
  whatsapp: "mdi:whatsapp"
};
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const TICKET_SALES_PAGE = {
  fr: {
    eyebrow: "Exploitation",
    pageTitle: "Prestations et installations",
    loading: "Chargement des demandes…",
    subtitleActive: "Vue « {view} » · {count} demande",
    subtitleActivePlural: "Vue « {view} » · {count} demandes",
    subtitleTrash: "Corbeille · {count} demande",
    subtitleTrashPlural: "Corbeille · {count} demandes",
    trashSwitchTitle: "Afficher les demandes supprimées",
    trashSwitchLabel: "Corbeille",
    trashSwitchAria: "Afficher la corbeille",
    exportCsv: "Exporter en CSV",
    exportCsvAria: "Exporter CSV",
    columnsSettings: "Paramétrer les colonnes",
    columnsSettingsAria: "Paramétrer les colonnes du tableau",
    newRequest: "Nouvelle demande",
    newRequestAria: "Nouvelle demande",
    views: {
      paneAria: "Vues prestations et installations",
      title: "Vues",
      typesGroup: "Types",
      all: {
        name: "Toutes",
        hint: "Prestations et installations"
      },
      prestation: {
        name: "Prestations",
        hint: "Demandes de prestation"
      },
      installation: {
        name: "Installations",
        hint: "Demandes d'installation"
      },
      requestCountAria: "{count} demande",
      requestCountAriaPlural: "{count} demandes"
    },
    trashBanner: {
      title: "Corbeille",
      hint: "Demandes supprimées · restauration ou suppression définitive"
    },
    statusFilters: {
      new: "Nouveaux",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolus",
      closed: "Clos"
    },
    statusBadge: {
      new: "Nouveau",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolu",
      closed: "Clos"
    },
    priority: {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente"
    },
    channels: {
      web: "Web",
      phone: "Téléphone",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    kind: {
      prestation: "Prestation",
      installation: "Installation"
    },
    allTypes: "Tous types",
    allCategories: "Toutes catégories",
    search: {
      placeholder: "Demande, client, demandeur, sujet…",
      aria: "Rechercher une demande",
      clear: "Effacer",
      filterType: "Filtrer par type",
      filterCategory: "Filtrer par catégorie"
    },
    empty: {
      trashTitle: "Corbeille vide",
      noRequestsTitle: "Aucune demande trouvée",
      trashHint: "Les demandes supprimées apparaîtront ici.",
      activeHint: "Ajustez vos filtres ou créez une nouvelle demande de prestation ou d'installation.",
      newRequest: "Nouvelle demande"
    },
    bulk: {
      selected: "sélectionnée",
      selectedPlural: "sélectionnées",
      restore: "Restaurer",
      purge: "Supprimer définitivement",
      purgeLoading: "Suppression…",
      edit: "Modifier",
      delete: "Supprimer",
      deleteLoading: "Suppression…",
      clearSelection: "Annuler la sélection",
      purgeOneTitle: "Supprimer définitivement cette demande ?",
      purgeTitle: "Supprimer définitivement {label} ?",
      purgeMessage: "Cette action est irréversible.",
      deleteTitle: "Supprimer {label} ?",
      deleteMessage: "Les demandes seront déplacées vers la corbeille.",
      confirmPurge: "Supprimer définitivement",
      confirmDelete: "Supprimer",
      requestLabel: "{count} demande",
      requestLabelPlural: "{count} demandes",
      adminOnlyPurge: "Seuls les administrateurs peuvent supprimer définitivement une demande",
      toastPurgedOne: "Demande supprimée définitivement",
      toastPurgeError: "Erreur lors de la suppression définitive"
    },
    table: {
      selectAll: "Sélectionner toutes les demandes de la page",
      selectOne: "Sélectionner la demande #{id}",
      id: "ID",
      subject: "Sujet",
      type: "Type",
      category: "Catégorie",
      requester: "Demandeur",
      client: "Client",
      assigned: "Assigné",
      status: "Statut",
      tasks: "Tâches",
      progress: "Avancement",
      noTasks: "Aucune tâche",
      tasksRecap: "{done}/{total}",
      created: "Création",
      updated: "Modification",
      actions: "Actions",
      restore: "Restaurer",
      restoreTitle: "Restaurer la demande",
      purgeTitle: "Supprimer définitivement",
      purge: "Supprimer"
    },
    tooltip: {
      comment: "{count} commentaire",
      commentPlural: "{count} commentaires"
    },
    pagination: {
      perPage: "Par page",
      page: "Page {current} / {total}",
      prev: "Page précédente",
      next: "Page suivante"
    },
    followersCount: "{count} followers",
    columnsModal: {
      title: "Colonnes du tableau",
      subtitle: "Choisissez les colonnes visibles dans la liste des demandes services.",
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
      loadError: "Erreur lors du chargement des demandes",
      loadColumns: "Erreur lors du chargement des colonnes",
      restored: "Demande restaurée",
      restoreError: "Erreur lors de la restauration",
      bulkRestorePartial: "{success} restaurée(s), {failure} échec(s)",
      bulkRestoreOk: "{count} demande restaurée",
      bulkRestoreOkPlural: "{count} demandes restaurées",
      bulkRestoreError: "Erreur lors de la restauration groupée",
      bulkPurgePartial: "{success} supprimée(s), {failure} échec(s)",
      bulkPurgeOk: "{count} demande supprimée définitivement",
      bulkPurgeOkPlural: "{count} demandes supprimées définitivement",
      bulkDeletePartial: "{success} supprimée(s), {failure} échec(s)",
      bulkDeleteOk: "{count} demande supprimée",
      bulkDeleteOkPlural: "{count} demandes supprimées",
      bulkDeleteError: "Erreur lors de la suppression groupée",
      bulkUpdatePartial: "{success} mise(s) à jour, {failure} échec(s)",
      bulkUpdateOk: "{count} demande mise à jour",
      bulkUpdateOkPlural: "{count} demandes mises à jour"
    },
    csv: {
      filenamePrefix: "prestations-installations",
      headers: {
        id: "ID",
        subject: "Sujet",
        type: "Type",
        category: "Catégorie",
        client: "Client",
        requester: "Demandeur",
        assigned: "Assignés",
        status: "Statut",
        tasks: "Tâches",
        progress: "Avancement",
        created: "Création"
      }
    }
  },
  en: {
    eyebrow: "Operations",
    pageTitle: "Services & installations",
    loading: "Loading requests…",
    subtitleActive: "View « {view} » · {count} request",
    subtitleActivePlural: "View « {view} » · {count} requests",
    subtitleTrash: "Trash · {count} request",
    subtitleTrashPlural: "Trash · {count} requests",
    trashSwitchTitle: "Show deleted requests",
    trashSwitchLabel: "Trash",
    trashSwitchAria: "Show trash",
    exportCsv: "Export to CSV",
    exportCsvAria: "Export CSV",
    columnsSettings: "Configure columns",
    columnsSettingsAria: "Configure table columns",
    newRequest: "New request",
    newRequestAria: "New request",
    views: {
      paneAria: "Services & installations views",
      title: "Views",
      typesGroup: "Types",
      all: {
        name: "All",
        hint: "Services and installations"
      },
      prestation: {
        name: "Services",
        hint: "Service requests"
      },
      installation: {
        name: "Installations",
        hint: "Installation requests"
      },
      requestCountAria: "{count} request",
      requestCountAriaPlural: "{count} requests"
    },
    trashBanner: {
      title: "Trash",
      hint: "Deleted requests · restore or permanently delete"
    },
    statusFilters: {
      new: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    statusBadge: {
      new: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    priority: {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "Urgent"
    },
    channels: {
      web: "Web",
      phone: "Phone",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    kind: {
      prestation: "Service",
      installation: "Installation"
    },
    allTypes: "All types",
    allCategories: "All categories",
    search: {
      placeholder: "Request, client, requester, subject…",
      aria: "Search for a request",
      clear: "Clear",
      filterType: "Filter by type",
      filterCategory: "Filter by category"
    },
    empty: {
      trashTitle: "Trash is empty",
      noRequestsTitle: "No requests found",
      trashHint: "Deleted requests will appear here.",
      activeHint: "Adjust your filters or create a new service or installation request.",
      newRequest: "New request"
    },
    bulk: {
      selected: "selected",
      selectedPlural: "selected",
      restore: "Restore",
      purge: "Delete permanently",
      purgeLoading: "Deleting…",
      edit: "Edit",
      delete: "Delete",
      deleteLoading: "Deleting…",
      clearSelection: "Clear selection",
      purgeOneTitle: "Permanently delete this request?",
      purgeTitle: "Permanently delete {label}?",
      purgeMessage: "This action is irreversible.",
      deleteTitle: "Delete {label}?",
      deleteMessage: "Requests will be moved to the trash.",
      confirmPurge: "Delete permanently",
      confirmDelete: "Delete",
      requestLabel: "{count} request",
      requestLabelPlural: "{count} requests",
      adminOnlyPurge: "Only administrators can permanently delete a request",
      toastPurgedOne: "Request permanently deleted",
      toastPurgeError: "Error permanently deleting request"
    },
    table: {
      selectAll: "Select all requests on this page",
      selectOne: "Select request #{id}",
      id: "ID",
      subject: "Subject",
      type: "Type",
      category: "Category",
      requester: "Requester",
      client: "Client",
      assigned: "Assigned",
      status: "Status",
      tasks: "Tasks",
      progress: "Progress",
      noTasks: "No tasks",
      tasksRecap: "{done}/{total}",
      created: "Created",
      updated: "Updated",
      actions: "Actions",
      restore: "Restore",
      restoreTitle: "Restore request",
      purgeTitle: "Delete permanently",
      purge: "Delete"
    },
    tooltip: {
      comment: "{count} comment",
      commentPlural: "{count} comments"
    },
    pagination: {
      perPage: "Per page",
      page: "Page {current} / {total}",
      prev: "Previous page",
      next: "Next page"
    },
    followersCount: "{count} followers",
    columnsModal: {
      title: "Table columns",
      subtitle: "Choose which columns are visible in the services request list.",
      privateTab: "Private view",
      publicTab: "Public view",
      privateHintInactive: "No private view yet: the public view is shown. Check columns to create yours.",
      privateHintActive: "Your private view overrides the public view.",
      publicHint: "Default columns for all users without a private view.",
      adminOnly: "Only administrators can edit the public view.",
      resetPrivate: "Revert to public view",
      resetSuccess: "Private view reset",
      savePrivateSuccess: "Private view saved",
      savePublicSuccess: "Public view saved",
      saveError: "Error saving columns",
      atLeastOne: "Select at least one column.",
      reorderHint: "Drag rows to change the column order in the table.",
      dragColumn: "Drag column {name}",
      save: "Save"
    },
    toasts: {
      loadError: "Error loading requests",
      loadColumns: "Error loading columns",
      restored: "Request restored",
      restoreError: "Error restoring request",
      bulkRestorePartial: "{success} restored, {failure} failed",
      bulkRestoreOk: "{count} request restored",
      bulkRestoreOkPlural: "{count} requests restored",
      bulkRestoreError: "Error during bulk restore",
      bulkPurgePartial: "{success} deleted, {failure} failed",
      bulkPurgeOk: "{count} request permanently deleted",
      bulkPurgeOkPlural: "{count} requests permanently deleted",
      bulkDeletePartial: "{success} deleted, {failure} failed",
      bulkDeleteOk: "{count} request deleted",
      bulkDeleteOkPlural: "{count} requests deleted",
      bulkDeleteError: "Error during bulk delete",
      bulkUpdatePartial: "{success} updated, {failure} failed",
      bulkUpdateOk: "{count} request updated",
      bulkUpdateOkPlural: "{count} requests updated"
    },
    csv: {
      filenamePrefix: "services-installations",
      headers: {
        id: "ID",
        subject: "Subject",
        type: "Type",
        category: "Category",
        client: "Client",
        requester: "Requester",
        assigned: "Assignees",
        status: "Status",
        tasks: "Tasks",
        progress: "Progress",
        created: "Created"
      }
    }
  },
  de: {
    eyebrow: "Betrieb",
    pageTitle: "Leistungen & Installationen",
    loading: "Anfragen werden geladen…",
    subtitleActive: "Ansicht « {view} » · {count} Anfrage",
    subtitleActivePlural: "Ansicht « {view} » · {count} Anfragen",
    subtitleTrash: "Papierkorb · {count} Anfrage",
    subtitleTrashPlural: "Papierkorb · {count} Anfragen",
    trashSwitchTitle: "Gelöschte Anfragen anzeigen",
    trashSwitchLabel: "Papierkorb",
    trashSwitchAria: "Papierkorb anzeigen",
    exportCsv: "Als CSV exportieren",
    exportCsvAria: "CSV exportieren",
    columnsSettings: "Spalten konfigurieren",
    columnsSettingsAria: "Tabellenspalten konfigurieren",
    newRequest: "Neue Anfrage",
    newRequestAria: "Neue Anfrage",
    views: {
      paneAria: "Ansichten Leistungen & Installationen",
      title: "Ansichten",
      typesGroup: "Typen",
      all: {
        name: "Alle",
        hint: "Leistungen und Installationen"
      },
      prestation: {
        name: "Leistungen",
        hint: "Leistungsanfragen"
      },
      installation: {
        name: "Installationen",
        hint: "Installationsanfragen"
      },
      requestCountAria: "{count} Anfrage",
      requestCountAriaPlural: "{count} Anfragen"
    },
    trashBanner: {
      title: "Papierkorb",
      hint: "Gelöschte Anfragen · wiederherstellen oder endgültig löschen"
    },
    statusFilters: {
      new: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Wartend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    statusBadge: {
      new: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Wartend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    priority: {
      low: "Niedrig",
      normal: "Normal",
      high: "Hoch",
      urgent: "Dringend"
    },
    channels: {
      web: "Web",
      phone: "Telefon",
      email: "E-Mail",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    kind: {
      prestation: "Leistung",
      installation: "Installation"
    },
    allTypes: "Alle Typen",
    allCategories: "Alle Kategorien",
    search: {
      placeholder: "Anfrage, Kunde, Anfragender, Betreff…",
      aria: "Anfrage suchen",
      clear: "Löschen",
      filterType: "Nach Typ filtern",
      filterCategory: "Nach Kategorie filtern"
    },
    empty: {
      trashTitle: "Papierkorb leer",
      noRequestsTitle: "Keine Anfragen gefunden",
      trashHint: "Gelöschte Anfragen erscheinen hier.",
      activeHint: "Filter anpassen oder neue Leistungs- oder Installationsanfrage erstellen.",
      newRequest: "Neue Anfrage"
    },
    bulk: {
      selected: "ausgewählt",
      selectedPlural: "ausgewählt",
      restore: "Wiederherstellen",
      purge: "Endgültig löschen",
      purgeLoading: "Löschen…",
      edit: "Bearbeiten",
      delete: "Löschen",
      deleteLoading: "Löschen…",
      clearSelection: "Auswahl aufheben",
      purgeOneTitle: "Diese Anfrage endgültig löschen?",
      purgeTitle: "{label} endgültig löschen?",
      purgeMessage: "Diese Aktion ist endgültig.",
      deleteTitle: "{label} löschen?",
      deleteMessage: "Anfragen werden in den Papierkorb verschoben.",
      confirmPurge: "Endgültig löschen",
      confirmDelete: "Löschen",
      requestLabel: "{count} Anfrage",
      requestLabelPlural: "{count} Anfragen",
      adminOnlyPurge: "Nur Administratoren können Anfragen endgültig löschen",
      toastPurgedOne: "Anfrage endgültig gelöscht",
      toastPurgeError: "Fehler beim endgültigen Löschen"
    },
    table: {
      selectAll: "Alle Anfragen auf dieser Seite auswählen",
      selectOne: "Anfrage #{id} auswählen",
      id: "ID",
      subject: "Betreff",
      type: "Typ",
      category: "Kategorie",
      requester: "Anfragender",
      client: "Kunde",
      assigned: "Zugewiesen",
      status: "Status",
      tasks: "Aufgaben",
      progress: "Fortschritt",
      noTasks: "Keine Aufgaben",
      tasksRecap: "{done}/{total}",
      created: "Erstellt",
      updated: "Aktualisiert",
      actions: "Aktionen",
      restore: "Wiederherstellen",
      restoreTitle: "Anfrage wiederherstellen",
      purgeTitle: "Endgültig löschen",
      purge: "Löschen"
    },
    tooltip: {
      comment: "{count} Kommentar",
      commentPlural: "{count} Kommentare"
    },
    pagination: {
      perPage: "Pro Seite",
      page: "Seite {current} / {total}",
      prev: "Vorherige Seite",
      next: "Nächste Seite"
    },
    followersCount: "{count} Follower",
    columnsModal: {
      title: "Tabellenspalten",
      subtitle: "Wählen Sie die sichtbaren Spalten in der Service-Liste.",
      privateTab: "Private view",
      publicTab: "Public view",
      privateHintInactive: "No private view yet: the public view is shown. Check columns to create yours.",
      privateHintActive: "Your private view overrides the public view.",
      publicHint: "Default columns for all users without a private view.",
      adminOnly: "Only administrators can edit the public view.",
      resetPrivate: "Revert to public view",
      resetSuccess: "Private view reset",
      savePrivateSuccess: "Private view saved",
      savePublicSuccess: "Public view saved",
      saveError: "Error saving columns",
      atLeastOne: "Select at least one column.",
      reorderHint: "Drag rows to change the column order in the table.",
      dragColumn: "Drag column {name}",
      save: "Save"
    },
    toasts: {
      loadError: "Fehler beim Laden der Anfragen",
      loadColumns: "Fehler beim Laden der Spalten",
      restored: "Anfrage wiederhergestellt",
      restoreError: "Fehler bei der Wiederherstellung",
      bulkRestorePartial: "{success} wiederhergestellt, {failure} fehlgeschlagen",
      bulkRestoreOk: "{count} Anfrage wiederhergestellt",
      bulkRestoreOkPlural: "{count} Anfragen wiederhergestellt",
      bulkRestoreError: "Fehler bei der Massenwiederherstellung",
      bulkPurgePartial: "{success} gelöscht, {failure} fehlgeschlagen",
      bulkPurgeOk: "{count} Anfrage endgültig gelöscht",
      bulkPurgeOkPlural: "{count} Anfragen endgültig gelöscht",
      bulkDeletePartial: "{success} gelöscht, {failure} fehlgeschlagen",
      bulkDeleteOk: "{count} Anfrage gelöscht",
      bulkDeleteOkPlural: "{count} Anfragen gelöscht",
      bulkDeleteError: "Fehler bei der Massenlöschung",
      bulkUpdatePartial: "{success} aktualisiert, {failure} fehlgeschlagen",
      bulkUpdateOk: "{count} Anfrage aktualisiert",
      bulkUpdateOkPlural: "{count} Anfragen aktualisiert"
    },
    csv: {
      filenamePrefix: "leistungen-installationen",
      headers: {
        id: "ID",
        subject: "Betreff",
        type: "Typ",
        category: "Kategorie",
        client: "Kunde",
        requester: "Anfragender",
        assigned: "Zugewiesene",
        status: "Status",
        tasks: "Aufgaben",
        progress: "Fortschritt",
        created: "Erstellt"
      }
    }
  },
  it: {
    eyebrow: "Operazioni",
    pageTitle: "Prestazioni e installazioni",
    loading: "Caricamento richieste…",
    subtitleActive: "Vista « {view} » · {count} richiesta",
    subtitleActivePlural: "Vista « {view} » · {count} richieste",
    subtitleTrash: "Cestino · {count} richiesta",
    subtitleTrashPlural: "Cestino · {count} richieste",
    trashSwitchTitle: "Mostra richieste eliminate",
    trashSwitchLabel: "Cestino",
    trashSwitchAria: "Mostra cestino",
    exportCsv: "Esporta in CSV",
    exportCsvAria: "Esporta CSV",
    columnsSettings: "Configura colonne",
    columnsSettingsAria: "Configura le colonne della tabella",
    newRequest: "Nuova richiesta",
    newRequestAria: "Nuova richiesta",
    views: {
      paneAria: "Viste prestazioni e installazioni",
      title: "Viste",
      typesGroup: "Tipi",
      all: {
        name: "Tutte",
        hint: "Prestazioni e installazioni"
      },
      prestation: {
        name: "Prestazioni",
        hint: "Richieste di prestazione"
      },
      installation: {
        name: "Installazioni",
        hint: "Richieste di installazione"
      },
      requestCountAria: "{count} richiesta",
      requestCountAriaPlural: "{count} richieste"
    },
    trashBanner: {
      title: "Cestino",
      hint: "Richieste eliminate · ripristino o eliminazione definitiva"
    },
    statusFilters: {
      new: "Nuovi",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolti",
      closed: "Chiusi"
    },
    statusBadge: {
      new: "Nuovo",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolto",
      closed: "Chiuso"
    },
    priority: {
      low: "Bassa",
      normal: "Normale",
      high: "Alta",
      urgent: "Urgente"
    },
    channels: {
      web: "Web",
      phone: "Telefono",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    kind: {
      prestation: "Prestazione",
      installation: "Installazione"
    },
    allTypes: "Tutti i tipi",
    allCategories: "Tutte le categorie",
    search: {
      placeholder: "Richiesta, cliente, richiedente, oggetto…",
      aria: "Cerca una richiesta",
      clear: "Cancella",
      filterType: "Filtra per tipo",
      filterCategory: "Filtra per categoria"
    },
    empty: {
      trashTitle: "Cestino vuoto",
      noRequestsTitle: "Nessuna richiesta trovata",
      trashHint: "Le richieste eliminate appariranno qui.",
      activeHint: "Modifica i filtri o crea una nuova richiesta di prestazione o installazione.",
      newRequest: "Nuova richiesta"
    },
    bulk: {
      selected: "selezionata",
      selectedPlural: "selezionate",
      restore: "Ripristina",
      purge: "Elimina definitivamente",
      purgeLoading: "Eliminazione…",
      edit: "Modifica",
      delete: "Elimina",
      deleteLoading: "Eliminazione…",
      clearSelection: "Annulla selezione",
      purgeOneTitle: "Eliminare definitivamente questa richiesta?",
      purgeTitle: "Eliminare definitivamente {label}?",
      purgeMessage: "Azione irreversibile.",
      deleteTitle: "Eliminare {label}?",
      deleteMessage: "Le richieste saranno spostate nel cestino.",
      confirmPurge: "Elimina definitivamente",
      confirmDelete: "Elimina",
      requestLabel: "{count} richiesta",
      requestLabelPlural: "{count} richieste",
      adminOnlyPurge: "Solo gli amministratori possono eliminare definitivamente una richiesta",
      toastPurgedOne: "Richiesta eliminata definitivamente",
      toastPurgeError: "Errore durante l'eliminazione definitiva"
    },
    table: {
      selectAll: "Seleziona tutte le richieste della pagina",
      selectOne: "Seleziona richiesta #{id}",
      id: "ID",
      subject: "Oggetto",
      type: "Tipo",
      category: "Categoria",
      requester: "Richiedente",
      client: "Cliente",
      assigned: "Assegnato",
      status: "Stato",
      tasks: "Attività",
      progress: "Avanzamento",
      noTasks: "Nessuna attività",
      tasksRecap: "{done}/{total}",
      created: "Creazione",
      updated: "Modifica",
      actions: "Azioni",
      restore: "Ripristina",
      restoreTitle: "Ripristina richiesta",
      purgeTitle: "Elimina definitivamente",
      purge: "Elimina"
    },
    tooltip: {
      comment: "{count} commento",
      commentPlural: "{count} commenti"
    },
    pagination: {
      perPage: "Per pagina",
      page: "Pagina {current} / {total}",
      prev: "Pagina precedente",
      next: "Pagina successiva"
    },
    followersCount: "{count} follower",
    columnsModal: {
      title: "Colonne tabella",
      subtitle: "Scegli le colonne visibili nell'elenco richieste servizi.",
      privateTab: "Private view",
      publicTab: "Public view",
      privateHintInactive: "No private view yet: the public view is shown. Check columns to create yours.",
      privateHintActive: "Your private view overrides the public view.",
      publicHint: "Default columns for all users without a private view.",
      adminOnly: "Only administrators can edit the public view.",
      resetPrivate: "Revert to public view",
      resetSuccess: "Private view reset",
      savePrivateSuccess: "Private view saved",
      savePublicSuccess: "Public view saved",
      saveError: "Error saving columns",
      atLeastOne: "Select at least one column.",
      reorderHint: "Drag rows to change the column order in the table.",
      dragColumn: "Drag column {name}",
      save: "Save"
    },
    toasts: {
      loadError: "Errore durante il caricamento delle richieste",
      loadColumns: "Errore durante il caricamento delle colonne",
      restored: "Richiesta ripristinata",
      restoreError: "Errore durante il ripristino",
      bulkRestorePartial: "{success} ripristinata/e, {failure} errore/i",
      bulkRestoreOk: "{count} richiesta ripristinata",
      bulkRestoreOkPlural: "{count} richieste ripristinate",
      bulkRestoreError: "Errore durante il ripristino di massa",
      bulkPurgePartial: "{success} eliminata/e, {failure} errore/i",
      bulkPurgeOk: "{count} richiesta eliminata definitivamente",
      bulkPurgeOkPlural: "{count} richieste eliminate definitivamente",
      bulkDeletePartial: "{success} eliminata/e, {failure} errore/i",
      bulkDeleteOk: "{count} richiesta eliminata",
      bulkDeleteOkPlural: "{count} richieste eliminate",
      bulkDeleteError: "Errore durante l'eliminazione di massa",
      bulkUpdatePartial: "{success} aggiornata/e, {failure} errore/i",
      bulkUpdateOk: "{count} richiesta aggiornata",
      bulkUpdateOkPlural: "{count} richieste aggiornate"
    },
    csv: {
      filenamePrefix: "prestazioni-installazioni",
      headers: {
        id: "ID",
        subject: "Oggetto",
        type: "Tipo",
        category: "Categoria",
        client: "Cliente",
        requester: "Richiedente",
        assigned: "Assegnati",
        status: "Stato",
        tasks: "Attività",
        progress: "Avanzamento",
        created: "Creazione"
      }
    }
  },
  es: {
    eyebrow: "Operaciones",
    pageTitle: "Prestaciones e instalaciones",
    loading: "Cargando solicitudes…",
    subtitleActive: "Vista « {view} » · {count} solicitud",
    subtitleActivePlural: "Vista « {view} » · {count} solicitudes",
    subtitleTrash: "Papelera · {count} solicitud",
    subtitleTrashPlural: "Papelera · {count} solicitudes",
    trashSwitchTitle: "Mostrar solicitudes eliminadas",
    trashSwitchLabel: "Papelera",
    trashSwitchAria: "Mostrar papelera",
    exportCsv: "Exportar a CSV",
    exportCsvAria: "Exportar CSV",
    columnsSettings: "Configurar columnas",
    columnsSettingsAria: "Configurar columnas de la tabla",
    newRequest: "Nueva solicitud",
    newRequestAria: "Nueva solicitud",
    views: {
      paneAria: "Vistas prestaciones e instalaciones",
      title: "Vistas",
      typesGroup: "Tipos",
      all: {
        name: "Todas",
        hint: "Prestaciones e instalaciones"
      },
      prestation: {
        name: "Prestaciones",
        hint: "Solicitudes de prestación"
      },
      installation: {
        name: "Instalaciones",
        hint: "Solicitudes de instalación"
      },
      requestCountAria: "{count} solicitud",
      requestCountAriaPlural: "{count} solicitudes"
    },
    trashBanner: {
      title: "Papelera",
      hint: "Solicitudes eliminadas · restaurar o eliminar definitivamente"
    },
    statusFilters: {
      new: "Nuevos",
      in_progress: "En curso",
      pending: "En espera",
      resolved: "Resueltos",
      closed: "Cerrados"
    },
    statusBadge: {
      new: "Nuevo",
      in_progress: "En curso",
      pending: "En espera",
      resolved: "Resuelto",
      closed: "Cerrado"
    },
    priority: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente"
    },
    channels: {
      web: "Web",
      phone: "Teléfono",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    kind: {
      prestation: "Prestación",
      installation: "Instalación"
    },
    allTypes: "Todos los tipos",
    allCategories: "Todas las categorías",
    search: {
      placeholder: "Solicitud, cliente, solicitante, asunto…",
      aria: "Buscar una solicitud",
      clear: "Borrar",
      filterType: "Filtrar por tipo",
      filterCategory: "Filtrar por categoría"
    },
    empty: {
      trashTitle: "Papelera vacía",
      noRequestsTitle: "Ninguna solicitud encontrada",
      trashHint: "Las solicitudes eliminadas aparecerán aquí.",
      activeHint: "Ajuste los filtros o cree una nueva solicitud de prestación o instalación.",
      newRequest: "Nueva solicitud"
    },
    bulk: {
      selected: "seleccionada",
      selectedPlural: "seleccionadas",
      restore: "Restaurar",
      purge: "Eliminar definitivamente",
      purgeLoading: "Eliminando…",
      edit: "Modificar",
      delete: "Eliminar",
      deleteLoading: "Eliminando…",
      clearSelection: "Cancelar selección",
      purgeOneTitle: "¿Eliminar definitivamente esta solicitud?",
      purgeTitle: "¿Eliminar definitivamente {label}?",
      purgeMessage: "Acción irreversible.",
      deleteTitle: "¿Eliminar {label}?",
      deleteMessage: "Las solicitudes se moverán a la papelera.",
      confirmPurge: "Eliminar definitivamente",
      confirmDelete: "Eliminar",
      requestLabel: "{count} solicitud",
      requestLabelPlural: "{count} solicitudes",
      adminOnlyPurge: "Solo los administradores pueden eliminar definitivamente una solicitud",
      toastPurgedOne: "Solicitud eliminada definitivamente",
      toastPurgeError: "Error al eliminar definitivamente"
    },
    table: {
      selectAll: "Seleccionar todas las solicitudes de la página",
      selectOne: "Seleccionar solicitud #{id}",
      id: "ID",
      subject: "Asunto",
      type: "Tipo",
      category: "Categoría",
      requester: "Solicitante",
      client: "Cliente",
      assigned: "Asignado",
      status: "Estado",
      tasks: "Tareas",
      progress: "Progreso",
      noTasks: "Sin tareas",
      tasksRecap: "{done}/{total}",
      created: "Creación",
      updated: "Actualización",
      actions: "Acciones",
      restore: "Restaurar",
      restoreTitle: "Restaurar solicitud",
      purgeTitle: "Eliminar definitivamente",
      purge: "Eliminar"
    },
    tooltip: {
      comment: "{count} comentario",
      commentPlural: "{count} comentarios"
    },
    pagination: {
      perPage: "Por página",
      page: "Página {current} / {total}",
      prev: "Página anterior",
      next: "Página siguiente"
    },
    followersCount: "{count} followers",
    columnsModal: {
      title: "Columnas de la tabla",
      subtitle: "Elige las columnas visibles en la lista de solicitudes de servicios.",
      privateTab: "Private view",
      publicTab: "Public view",
      privateHintInactive: "No private view yet: the public view is shown. Check columns to create yours.",
      privateHintActive: "Your private view overrides the public view.",
      publicHint: "Default columns for all users without a private view.",
      adminOnly: "Only administrators can edit the public view.",
      resetPrivate: "Revert to public view",
      resetSuccess: "Private view reset",
      savePrivateSuccess: "Private view saved",
      savePublicSuccess: "Public view saved",
      saveError: "Error saving columns",
      atLeastOne: "Select at least one column.",
      reorderHint: "Drag rows to change the column order in the table.",
      dragColumn: "Drag column {name}",
      save: "Save"
    },
    toasts: {
      loadError: "Error al cargar las solicitudes",
      loadColumns: "Error al cargar las columnas",
      restored: "Solicitud restaurada",
      restoreError: "Error al restaurar",
      bulkRestorePartial: "{success} restaurada(s), {failure} error(es)",
      bulkRestoreOk: "{count} solicitud restaurada",
      bulkRestoreOkPlural: "{count} solicitudes restauradas",
      bulkRestoreError: "Error durante la restauración masiva",
      bulkPurgePartial: "{success} eliminada(s), {failure} error(es)",
      bulkPurgeOk: "{count} solicitud eliminada definitivamente",
      bulkPurgeOkPlural: "{count} solicitudes eliminadas definitivamente",
      bulkDeletePartial: "{success} eliminada(s), {failure} error(es)",
      bulkDeleteOk: "{count} solicitud eliminada",
      bulkDeleteOkPlural: "{count} solicitudes eliminadas",
      bulkDeleteError: "Error durante la eliminación masiva",
      bulkUpdatePartial: "{success} actualizada(s), {failure} error(es)",
      bulkUpdateOk: "{count} solicitud actualizada",
      bulkUpdateOkPlural: "{count} solicitudes actualizadas"
    },
    csv: {
      filenamePrefix: "prestaciones-instalaciones",
      headers: {
        id: "ID",
        subject: "Asunto",
        type: "Tipo",
        category: "Categoría",
        client: "Cliente",
        requester: "Solicitante",
        assigned: "Asignados",
        status: "Estado",
        tasks: "Tareas",
        progress: "Progreso",
        created: "Creación"
      }
    }
  }
};
export function getTicketSalesPageCopy(locale) {
  const t = pickLocaleMessages(TICKET_SALES_PAGE, locale);
  const localeTag = LOCALE_BCP47[locale] || "fr-FR";
  return {
    ...t,
    locale,
    localeTag,
    salesViews: SALES_VIEW_DEFS.map(view => ({
      ...view,
      name: t.views[view.id].name,
      hint: t.views[view.id].hint
    })),
    typeFilterOptions: [{
      value: "",
      label: t.allTypes
    }, {
      value: "prestation",
      label: t.kind.prestation
    }, {
      value: "installation",
      label: t.kind.installation
    }],
    statusFilters: STATUS_FILTER_KEYS.map(key => ({
      key,
      label: t.statusFilters[key],
      icon: STATUS_FILTER_META[key].icon,
      kpiTone: STATUS_FILTER_META[key].kpiTone
    })),
    priorityLabels: PRIORITY_KEYS.reduce((acc, key) => {
      acc[key] = t.priority[key];
      return acc;
    }, {}),
    channelMeta: CHANNEL_KEYS.reduce((acc, key) => {
      acc[key] = {
        label: t.channels[key],
        icon: CHANNEL_ICONS[key]
      };
      return acc;
    }, {}),
    formatSubtitle: (loading, viewMode, viewName, count) => {
      if (loading) return t.loading;
      if (viewMode === "trash") {
        return interpolate(count === 1 ? t.subtitleTrash : t.subtitleTrashPlural, {
          count: String(count)
        });
      }
      return interpolate(count === 1 ? t.subtitleActive : t.subtitleActivePlural, {
        view: viewName,
        count: String(count)
      });
    },
    formatViewCountAria: count => interpolate(count === 1 ? t.views.requestCountAria : t.views.requestCountAriaPlural, {
      count: String(count)
    }),
    formatBulkLabel: count => interpolate(count > 1 ? t.bulk.requestLabelPlural : t.bulk.requestLabel, {
      count: String(count)
    }),
    formatCommentCount: count => interpolate(count === 1 ? t.tooltip.comment : t.tooltip.commentPlural, {
      count: String(count)
    }),
    formatFollowersCount: count => interpolate(t.followersCount, {
      count: String(count)
    }),
    formatBulkSelected: count => interpolate(count > 1 ? t.bulk.selectedPlural : t.bulk.selected, {}),
    formatPagination: (current, total) => interpolate(t.pagination.page, {
      current: String(current),
      total: String(total)
    }),
    formatSelectOne: id => interpolate(t.table.selectOne, {
      id: String(id)
    }),
    formatTasksRecap: (done, total) => interpolate(t.table.tasksRecap, {
      done: String(done),
      total: String(total)
    }),
    formatDateTime: value => {
      if (!value) return "-";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleString(localeTag, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    },
    getKindLabel: ticket => {
      const type = String(ticket?.type || "").toLowerCase();
      if (type === "installation" || String(ticket?.category || "").startsWith("installation-") && (type === "demande" || type === "request")) {
        return t.kind.installation;
      }
      if (type === "prestation" || String(ticket?.category || "").startsWith("prestation-") && (type === "demande" || type === "request")) {
        return t.kind.prestation;
      }
      return "-";
    },
    getPriorityVisual: priority => {
      if (priority === "urgent") {
        return {
          icon: "mdi:alert-octagon",
          label: t.priority.urgent
        };
      }
      if (priority === "low") {
        return {
          icon: "mdi:arrow-down",
          label: t.priority.low
        };
      }
      if (priority === "normal") {
        return {
          icon: "mdi:minus",
          label: t.priority.normal
        };
      }
      return {
        icon: "mdi:arrow-up",
        label: t.priority[priority] || priority || "-"
      };
    },
    getStatusBadge: status => {
      const normalized = status === "open" ? "new" : status;
      return t.statusBadge[normalized] || status || "-";
    },
    getCsvHeaders: () => [t.csv.headers.id, t.csv.headers.subject, t.csv.headers.type, t.csv.headers.category, t.csv.headers.client, t.csv.headers.requester, t.csv.headers.assigned, t.csv.headers.status, t.csv.headers.tasks, t.csv.headers.progress, t.csv.headers.created]
  };
}
export function formatSalesBulkLabel(locale, count) {
  return getTicketSalesPageCopy(locale).formatBulkLabel(count);
}
export { interpolate };
