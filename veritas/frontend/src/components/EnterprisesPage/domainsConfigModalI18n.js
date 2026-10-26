import { getDnsProvider } from "./dnsFormConfig";
import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const DOMAINS_MODAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Services · Domaines",
    title: "Noms de domaine",
    defaultClientName: "Entreprise",
    closeAria: "Fermer",
    navAria: "Sections configuration NDD",
    loading: "Chargement…",
    sections: {
      inventory: {
        label: "Domaines",
        description: "Liste surveillée"
      },
      overview: {
        label: "Domaines",
        description: "Pour ce client"
      },
      provider: {
        label: "Intégration",
        description: "Fournisseurs"
      },
      import: {
        label: "Importer depuis OVH",
        description: "Sélectionner les domaines à rattacher"
      },
      guide: {
        label: "Guide",
        description: "Obtenir les clés API"
      },
      manual: {
        label: "Saisie manuelle",
        description: "Nom de domaine et expiration"
      }
    },
    addChoice: {
      title: "Ajouter un nom de domaine",
      description: "Choisissez comment rattacher le domaine à cette entreprise.",
      manualTitle: "Ajout manuel",
      manualDesc: "Saisir le nom, le registrar et la date d'expiration.",
      manualAction: "Continuer",
      integrationTitle: "Via une intégration",
      integrationDesc: "Importer depuis un registrar connecté (OVH…).",
      integrationAction: "Continuer"
    },
    inventory: {
      title: "Domaines surveillés",
      description: "Noms de domaine rattachés à cette entreprise."
    },
    empty: {
      addBtn: "Ajouter un domaine",
      noneHint: "Ajoutez un domaine manuellement ou via une intégration."
    },
    meta: {
      registrar: "Registrar"
    },
    provider: {
      title: "Choisir une intégration",
      description: "Sélectionnez le registrar pour importer des domaines.",
      connectionTitle: "Connexion {provider}",
      globalDetected: "Compte registrar global détecté en administration. Importez les domaines à rattacher à ce client.",
      globalNotActive: "Le paramétrage global OVH n'est pas actif. Activez l'intégration en administration ou consultez le guide.",
      globalAccountTitle: "Compte registrar global",
      globalAccountDescActive: "Importer les domaines depuis le compte OVH configuré en administration.",
      globalAccountDescInactive: "Activez OVH en administration pour utiliser le compte registrar global.",
      importAction: "Importer",
      activateInAdmin: "À activer en administration",
      guideTitle: "Guide API OVH",
      guideDesc: "Étapes pour créer les clés API et activer l'intégration en administration.",
      consult: "Consulter"
    },
    badges: {
      soon: "Bientôt",
      pro: "Pro",
      global: "Global",
      alreadyLinked: "Déjà lié",
      selected: "Sélectionné",
      dnsZone: "Zone DNS",
      available: "Disponible",
      manual: "Manuel"
    },
    overview: {
      title: "Domaines surveillés",
      description: "Noms de domaine rattachés à cette entreprise.",
      empty: "Aucun domaine configuré pour le moment.",
      emptyHintPrefix: "Utilisez",
      emptyHintTab: "Ajouter",
      emptyHintSuffix: "pour rattacher des domaines à cette entreprise.",
      modeLabel: "Mode : {mode}",
      deleteAtExpiration: " · Suppression à expiration",
      removeAria: "Retirer {label}",
      removeTitle: "Retirer",
      editTitle: "Éditer",
      editAria: "Éditer {label}",
      addHostBtn: "Ajouter un domaine",
      syncBtn: "Synchroniser les domaines OVH",
      syncBusy: "Synchronisation…",
      syncEmpty: "Aucun domaine OVH à synchroniser"
    },
    manual: {
      title: "Ajout manuel",
      titleEdit: "Modifier le domaine",
      description: "Enregistrez un nom de domaine sans connecteur API.",
      descriptionEdit: "Mettez à jour le nom, le registrar ou la date d'expiration.",
      domainName: "Nom de domaine",
      domainNamePlaceholder: "exemple.fr",
      registrar: "Registrar (optionnel)",
      registrarPlaceholder: "Ex. Gandi, Ionos…",
      expiration: "Date d'expiration"
    },
    manualProvider: {
      label: "Autre registrar",
      description: "Enregistrement manuel sans synchronisation API."
    },
    import: {
      title: "Importer depuis OVH",
      description: "Sélectionnez les domaines du compte OVH à rattacher à cette entreprise.",
      hint: "Chargement optimisé (expiration et renouvellement uniquement). Utilisez « Actualiser » pour forcer une nouvelle synchronisation avec OVH.",
      searchPlaceholder: "Rechercher un domaine…",
      refresh: "Actualiser",
      selectAll: "Tout sélectionner",
      clear: "Effacer",
      loading: "Chargement des domaines OVH…",
      empty: "Aucun domaine disponible dans le compte OVH.",
      selectAria: "Sélectionner {domain}"
    },
    table: {
      selectionAria: "Sélection",
      domain: "Domaine",
      expiration: "Expiration",
      renewal: "Renouvellement",
      state: "État"
    },
    renewal: {
      automatic: "Automatique",
      manual: "Manuel"
    },
    renewalMode: {
      automatic: "Automatique",
      manual: "Manuel",
      unknown: "Inconnu"
    },
    domainSummary: {
      fallbackLabel: "Domaine",
      expireOn: "Expire le {date}",
      autoRenew: "Renouvellement auto",
      manualRenew: "Renouvellement manuel",
      dnsZone: "Zone DNS OVH"
    },
    counts: {
      domainOne: "{count} domaine",
      domainMany: "{count} domaines",
      ovhOne: "{count} domaine OVH",
      ovhMany: "{count} domaines OVH",
      monitoredOne: "{count} domaine surveillé",
      monitoredMany: "{count} domaines surveillés",
      selectedOne: "{count} sélectionné",
      selectedMany: "{count} sélectionnés"
    },
    footer: {
      registrar: "Registrar : {provider}",
      hostRequired: "Le nom de domaine est obligatoire"
    },
    actions: {
      back: "Retour",
      attach: "Rattacher ({count})",
      attaching: "Import…",
      saveManual: "Enregistrer le domaine",
      updateManual: "Mettre à jour"
    },
    proFallback: "Cette intégration",
    comingSoon: "{provider} sera bientôt disponible dans Veritas.",
    emDash: "-",
    toasts: {
      loadError: "Erreur lors du chargement des noms de domaine.",
      ovhLoadError: "Impossible de charger les domaines OVH.",
      importSuccess: "{count} domaine(s) rattaché(s) à l'entreprise.",
      importError: "Erreur lors de l'import des domaines.",
      removed: "Domaine retiré.",
      manualSaved: "Nom de domaine enregistré.",
      deleteError: "Erreur lors de la suppression.",
      domainNotFound: "Domaine introuvable.",
      domainNameRequired: "Indiquez un nom de domaine.",
      domainDuplicate: "Ce nom de domaine est déjà enregistré pour ce client.",
      synced: "Noms de domaine synchronisés.",
      syncError: "Échec de la synchronisation des domaines."
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Services · Domains",
    title: "Domain names",
    defaultClientName: "Company",
    closeAria: "Close",
    navAria: "Domain configuration sections",
    loading: "Loading…",
    sections: {
      inventory: {
        label: "Domains",
        description: "Monitored list"
      },
      overview: {
        label: "Domains",
        description: "For this client"
      },
      provider: {
        label: "Integration",
        description: "Providers"
      },
      import: {
        label: "Import from OVH",
        description: "Select domains to link"
      },
      guide: {
        label: "Guide",
        description: "Get API keys"
      },
      manual: {
        label: "Manual entry",
        description: "Domain name and expiration"
      }
    },
    addChoice: {
      title: "Add a domain name",
      description: "Choose how to link the domain to this company.",
      manualTitle: "Manual entry",
      manualDesc: "Enter the name, registrar and expiration date.",
      manualAction: "Continue",
      integrationTitle: "Via an integration",
      integrationDesc: "Import from a connected registrar (OVH…).",
      integrationAction: "Continue"
    },
    inventory: {
      title: "Monitored domains",
      description: "Domain names linked to this company."
    },
    empty: {
      addBtn: "Add a domain",
      noneHint: "Add a domain manually or via an integration."
    },
    meta: {
      registrar: "Registrar"
    },
    provider: {
      title: "Choose an integration",
      description: "Select the registrar to import domains from.",
      connectionTitle: "Connect {provider}",
      globalDetected: "Global registrar account detected in administration. Import domains to link to this client.",
      globalNotActive: "Global OVH setup is not active. Enable the integration in administration or read the guide.",
      globalAccountTitle: "Global registrar account",
      globalAccountDescActive: "Import domains from the OVH account configured in administration.",
      globalAccountDescInactive: "Enable OVH in administration to use the global registrar account.",
      importAction: "Import",
      activateInAdmin: "Enable in administration",
      guideTitle: "OVH API guide",
      guideDesc: "Steps to create API keys and enable the integration in administration.",
      consult: "View guide"
    },
    badges: {
      soon: "Soon",
      pro: "Pro",
      global: "Global",
      alreadyLinked: "Already linked",
      selected: "Selected",
      dnsZone: "DNS zone",
      available: "Available",
      manual: "Manual"
    },
    overview: {
      title: "Monitored domains",
      description: "Domain names linked to this company.",
      empty: "No domain configured yet.",
      emptyHintPrefix: "Use",
      emptyHintTab: "Add",
      emptyHintSuffix: "to link domains to this company.",
      modeLabel: "Mode: {mode}",
      deleteAtExpiration: " · Delete on expiration",
      removeAria: "Remove {label}",
      removeTitle: "Remove",
      editTitle: "Edit",
      editAria: "Edit {label}",
      addHostBtn: "Add a domain",
      syncBtn: "Sync OVH domains",
      syncBusy: "Syncing…",
      syncEmpty: "No OVH domains to sync"
    },
    manual: {
      title: "Manual entry",
      titleEdit: "Edit domain",
      description: "Record a domain name without an API connector.",
      descriptionEdit: "Update the name, registrar or expiration date.",
      domainName: "Domain name",
      domainNamePlaceholder: "example.com",
      registrar: "Registrar (optional)",
      registrarPlaceholder: "e.g. Gandi, Ionos…",
      expiration: "Expiration date"
    },
    manualProvider: {
      label: "Other registrar",
      description: "Manual entry without API sync."
    },
    import: {
      title: "Import from OVH",
      description: "Select OVH account domains to link to this company.",
      hint: "Optimised loading (expiration and renewal only). Use « Refresh » to force a new sync with OVH.",
      searchPlaceholder: "Search a domain…",
      refresh: "Refresh",
      selectAll: "Select all",
      clear: "Clear",
      loading: "Loading OVH domains…",
      empty: "No domain available in the OVH account.",
      selectAria: "Select {domain}"
    },
    table: {
      selectionAria: "Selection",
      domain: "Domain",
      expiration: "Expiration",
      renewal: "Renewal",
      state: "Status"
    },
    renewal: {
      automatic: "Automatic",
      manual: "Manual"
    },
    renewalMode: {
      automatic: "Automatic",
      manual: "Manual",
      unknown: "Unknown"
    },
    domainSummary: {
      fallbackLabel: "Domain",
      expireOn: "Expires on {date}",
      autoRenew: "Auto renewal",
      manualRenew: "Manual renewal",
      dnsZone: "OVH DNS zone"
    },
    counts: {
      domainOne: "{count} domain",
      domainMany: "{count} domains",
      ovhOne: "{count} OVH domain",
      ovhMany: "{count} OVH domains",
      monitoredOne: "{count} monitored domain",
      monitoredMany: "{count} monitored domains",
      selectedOne: "{count} selected",
      selectedMany: "{count} selected"
    },
    footer: {
      registrar: "Registrar: {provider}",
      hostRequired: "Domain name is required"
    },
    actions: {
      back: "Back",
      attach: "Link ({count})",
      attaching: "Importing…",
      saveManual: "Save domain",
      updateManual: "Update"
    },
    proFallback: "This integration",
    comingSoon: "{provider} will be available in Veritas soon.",
    emDash: "-",
    toasts: {
      loadError: "Error while loading domain names.",
      ovhLoadError: "Unable to load OVH domains.",
      importSuccess: "{count} domain(s) linked to the company.",
      importError: "Error while importing domains.",
      removed: "Domain removed.",
      manualSaved: "Domain name saved.",
      deleteError: "Error while deleting.",
      domainNotFound: "Domain not found.",
      synced: "Domain names synchronized.",
      syncError: "Domain synchronization failed."
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Lizenzen & Abonnements",
    title: "Domainnamen",
    defaultClientName: "Unternehmen",
    closeAria: "Schließen",
    navAria: "Domain-Konfigurationsbereiche",
    loading: "Laden…",
    sections: {
      overview: {
        label: "Gespeicherte Lösung",
        description: "Für diesen Kunden"
      },
      provider: {
        label: "Konfigurierbare Lösung",
        description: "Anbieter"
      },
      import: {
        label: "Import aus OVH",
        description: "Zu verknüpfende Domains auswählen"
      },
      guide: {
        label: "Anleitung",
        description: "API-Schlüssel erhalten"
      },
      manual: {
        label: "Manuelle Eingabe",
        description: "Domainname und Ablauf"
      },
      inventory: {
        label: "Domains",
        description: "Überwachte Liste"
      }
    },
    addChoice: {
      title: "Domain hinzufügen",
      description: "Wählen Sie, wie die Domain verknüpft werden soll.",
      manualTitle: "Manuelle Eingabe",
      manualDesc: "Name, Registrar und Ablaufdatum eingeben.",
      manualAction: "Weiter",
      integrationTitle: "Über eine Integration",
      integrationDesc: "Aus einem verbundenen Registrar importieren (OVH…).",
      integrationAction: "Weiter"
    },
    inventory: {
      title: "Überwachte Domains",
      description: "Mit diesem Unternehmen verknüpfte Domains."
    },
    empty: {
      addBtn: "Domain hinzufügen",
      noneHint: "Domain manuell oder über eine Integration hinzufügen."
    },
    meta: {
      registrar: "Registrar"
    },
    provider: {
      title: "Integration wählen",
      description: "Registrar zum Importieren von Domains auswählen.",
      connectionTitle: "Verbindung {provider}",
      globalDetected: "Globales Registrar-Konto in der Administration erkannt. Importieren Sie Domains zur Verknüpfung mit diesem Kunden.",
      globalNotActive: "Die globale OVH-Konfiguration ist nicht aktiv. Aktivieren Sie die Integration in der Administration oder lesen Sie die Anleitung.",
      globalAccountTitle: "Globales Registrar-Konto",
      globalAccountDescActive: "Domains aus dem in der Administration konfigurierten OVH-Konto importieren.",
      globalAccountDescInactive: "Aktivieren Sie OVH in der Administration, um das globale Registrar-Konto zu nutzen.",
      importAction: "Importieren",
      activateInAdmin: "In Administration aktivieren",
      guideTitle: "OVH-API-Anleitung",
      guideDesc: "Schritte zum Erstellen von API-Schlüsseln und Aktivieren der Integration in der Administration.",
      consult: "Anleitung ansehen"
    },
    badges: {
      soon: "Demnächst",
      pro: "Pro",
      global: "Global",
      alreadyLinked: "Bereits verknüpft",
      selected: "Ausgewählt",
      dnsZone: "DNS-Zone",
      available: "Verfügbar",
      manual: "Manuell"
    },
    overview: {
      title: "Gespeicherte Lösung",
      description: "Mit diesem Unternehmen verknüpfte Domainnamen.",
      empty: "Noch keine Domain konfiguriert.",
      emptyHintPrefix: "Verwenden Sie den Tab",
      emptyHintTab: "Import aus OVH",
      emptyHintSuffix: "oder die manuelle Eingabe, um Domains zu verknüpfen.",
      modeLabel: "Modus: {mode}",
      deleteAtExpiration: " · Löschung bei Ablauf",
      removeAria: "{label} entfernen",
      removeTitle: "Entfernen",
      editTitle: "Bearbeiten",
      editAria: "{label} bearbeiten"
    },
    manual: {
      title: "Manuelle Eingabe",
      titleEdit: "Domain bearbeiten",
      description: "Domainname ohne API-Connector erfassen.",
      descriptionEdit: "Name, Registrar oder Ablaufdatum aktualisieren.",
      domainName: "Domainname",
      domainNamePlaceholder: "beispiel.de",
      registrar: "Registrar (optional)",
      registrarPlaceholder: "z. B. Gandi, Ionos…",
      expiration: "Ablaufdatum"
    },
    manualProvider: {
      label: "Anderer Registrar",
      description: "Manuelle Erfassung ohne API-Synchronisation."
    },
    import: {
      title: "Import aus OVH",
      description: "Wählen Sie OVH-Domains aus, die mit diesem Unternehmen verknüpft werden sollen.",
      hint: "Optimiertes Laden (nur Ablauf und Verlängerung). « Aktualisieren » erzwingt eine neue Synchronisation mit OVH.",
      searchPlaceholder: "Domain suchen…",
      refresh: "Aktualisieren",
      selectAll: "Alle auswählen",
      clear: "Leeren",
      loading: "OVH-Domains werden geladen…",
      empty: "Keine Domain im OVH-Konto verfügbar.",
      selectAria: "{domain} auswählen"
    },
    table: {
      selectionAria: "Auswahl",
      domain: "Domain",
      expiration: "Ablauf",
      renewal: "Verlängerung",
      state: "Status"
    },
    renewal: {
      automatic: "Automatisch",
      manual: "Manuell"
    },
    renewalMode: {
      automatic: "Automatisch",
      manual: "Manuell",
      unknown: "Unbekannt"
    },
    domainSummary: {
      fallbackLabel: "Domain",
      expireOn: "Läuft ab am {date}",
      autoRenew: "Auto-Verlängerung",
      manualRenew: "Manuelle Verlängerung",
      dnsZone: "OVH-DNS-Zone"
    },
    counts: {
      domainOne: "{count} Domain",
      domainMany: "{count} Domains",
      ovhOne: "{count} OVH-Domain",
      ovhMany: "{count} OVH-Domains",
      monitoredOne: "{count} überwachte Domain",
      monitoredMany: "{count} überwachte Domains",
      selectedOne: "{count} ausgewählt",
      selectedMany: "{count} ausgewählt"
    },
    footer: {
      registrar: "Registrar: {provider}"
    },
    actions: {
      back: "Zurück",
      attach: "Verknüpfen ({count})",
      attaching: "Import…",
      saveManual: "Domain speichern",
      updateManual: "Aktualisieren"
    },
    proFallback: "Diese Integration",
    comingSoon: "{provider} wird bald in Veritas verfügbar sein.",
    emDash: "-",
    toasts: {
      loadError: "Fehler beim Laden der Domainnamen.",
      ovhLoadError: "OVH-Domains konnten nicht geladen werden.",
      importSuccess: "{count} Domain(s) mit dem Unternehmen verknüpft.",
      importError: "Fehler beim Import der Domains.",
      removed: "Domain entfernt.",
      manualSaved: "Domainname gespeichert.",
      deleteError: "Fehler beim Löschen.",
      domainNotFound: "Domain nicht gefunden."
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Licenze e abbonamenti",
    title: "Nomi di dominio",
    defaultClientName: "Azienda",
    closeAria: "Chiudi",
    navAria: "Sezioni configurazione domini",
    loading: "Caricamento…",
    sections: {
      overview: {
        label: "Soluzione registrata",
        description: "Per questo cliente"
      },
      provider: {
        label: "Soluzione configurabile",
        description: "Fornitori"
      },
      import: {
        label: "Importa da OVH",
        description: "Seleziona i domini da collegare"
      },
      guide: {
        label: "Guida",
        description: "Ottieni le chiavi API"
      },
      manual: {
        label: "Inserimento manuale",
        description: "Nome di dominio e scadenza"
      },
      inventory: {
        label: "Domini",
        description: "Elenco monitorato"
      }
    },
    addChoice: {
      title: "Aggiungi un dominio",
      description: "Scegli come collegare il dominio a questa azienda.",
      manualTitle: "Inserimento manuale",
      manualDesc: "Inserisci nome, registrar e data di scadenza.",
      manualAction: "Continua",
      integrationTitle: "Tramite integrazione",
      integrationDesc: "Importa da un registrar collegato (OVH…).",
      integrationAction: "Continua"
    },
    inventory: {
      title: "Domini monitorati",
      description: "Nomi di dominio collegati a questa azienda."
    },
    empty: {
      addBtn: "Aggiungi dominio",
      noneHint: "Aggiungi un dominio manualmente o tramite integrazione."
    },
    meta: {
      registrar: "Registrar"
    },
    provider: {
      title: "Scegli un'integrazione",
      description: "Seleziona il registrar da cui importare i domini.",
      connectionTitle: "Connessione {provider}",
      globalDetected: "Account registrar globale rilevato in amministrazione. Importa i domini da collegare a questo cliente.",
      globalNotActive: "La configurazione globale OVH non è attiva. Attiva l'integrazione in amministrazione o consulta la guida.",
      globalAccountTitle: "Account registrar globale",
      globalAccountDescActive: "Importa i domini dall'account OVH configurato in amministrazione.",
      globalAccountDescInactive: "Attiva OVH in amministrazione per usare l'account registrar globale.",
      importAction: "Importa",
      activateInAdmin: "Da attivare in amministrazione",
      guideTitle: "Guida API OVH",
      guideDesc: "Passaggi per creare le chiavi API e attivare l'integrazione in amministrazione.",
      consult: "Consulta"
    },
    badges: {
      soon: "Presto",
      pro: "Pro",
      global: "Globale",
      alreadyLinked: "Già collegato",
      selected: "Selezionato",
      dnsZone: "Zona DNS",
      available: "Disponibile",
      manual: "Manuale"
    },
    overview: {
      title: "Soluzione registrata",
      description: "Nomi di dominio collegati a questa azienda.",
      empty: "Nessun dominio configurato al momento.",
      emptyHintPrefix: "Usa la scheda",
      emptyHintTab: "Importa da OVH",
      emptyHintSuffix: "o l'inserimento manuale per collegare domini a questa azienda.",
      modeLabel: "Modalità: {mode}",
      deleteAtExpiration: " · Eliminazione alla scadenza",
      removeAria: "Rimuovi {label}",
      removeTitle: "Rimuovi",
      editTitle: "Modifica",
      editAria: "Modifica {label}"
    },
    manual: {
      title: "Inserimento manuale",
      titleEdit: "Modifica dominio",
      description: "Registra un nome di dominio senza connettore API.",
      descriptionEdit: "Aggiorna nome, registrar o data di scadenza.",
      domainName: "Nome di dominio",
      domainNamePlaceholder: "esempio.it",
      registrar: "Registrar (opzionale)",
      registrarPlaceholder: "Es. Gandi, Ionos…",
      expiration: "Data di scadenza"
    },
    manualProvider: {
      label: "Altro registrar",
      description: "Registrazione manuale senza sincronizzazione API."
    },
    import: {
      title: "Importa da OVH",
      description: "Seleziona i domini dell'account OVH da collegare a questa azienda.",
      hint: "Caricamento ottimizzato (solo scadenza e rinnovo). Usa « Aggiorna » per forzare una nuova sincronizzazione con OVH.",
      searchPlaceholder: "Cerca un dominio…",
      refresh: "Aggiorna",
      selectAll: "Seleziona tutto",
      clear: "Cancella",
      loading: "Caricamento domini OVH…",
      empty: "Nessun dominio disponibile nell'account OVH.",
      selectAria: "Seleziona {domain}"
    },
    table: {
      selectionAria: "Selezione",
      domain: "Dominio",
      expiration: "Scadenza",
      renewal: "Rinnovo",
      state: "Stato"
    },
    renewal: {
      automatic: "Automatico",
      manual: "Manuale"
    },
    renewalMode: {
      automatic: "Automatico",
      manual: "Manuale",
      unknown: "Sconosciuto"
    },
    domainSummary: {
      fallbackLabel: "Dominio",
      expireOn: "Scade il {date}",
      autoRenew: "Rinnovo automatico",
      manualRenew: "Rinnovo manuale",
      dnsZone: "Zona DNS OVH"
    },
    counts: {
      domainOne: "{count} dominio",
      domainMany: "{count} domini",
      ovhOne: "{count} dominio OVH",
      ovhMany: "{count} domini OVH",
      monitoredOne: "{count} dominio monitorato",
      monitoredMany: "{count} domini monitorati",
      selectedOne: "{count} selezionato",
      selectedMany: "{count} selezionati"
    },
    footer: {
      registrar: "Registrar: {provider}"
    },
    actions: {
      back: "Indietro",
      attach: "Collega ({count})",
      attaching: "Importazione…",
      saveManual: "Salva dominio",
      updateManual: "Aggiorna"
    },
    proFallback: "Questa integrazione",
    comingSoon: "{provider} sarà presto disponibile in Veritas.",
    emDash: "-",
    toasts: {
      loadError: "Errore durante il caricamento dei nomi di dominio.",
      ovhLoadError: "Impossibile caricare i domini OVH.",
      importSuccess: "{count} dominio/i collegato/i all'azienda.",
      importError: "Errore durante l'importazione dei domini.",
      removed: "Dominio rimosso.",
      manualSaved: "Nome di dominio salvato.",
      deleteError: "Errore durante l'eliminazione.",
      domainNotFound: "Dominio non trovato."
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Licencias y suscripciones",
    title: "Nombres de dominio",
    defaultClientName: "Empresa",
    closeAria: "Cerrar",
    navAria: "Secciones de configuración de dominios",
    loading: "Cargando…",
    sections: {
      overview: {
        label: "Solución registrada",
        description: "Para este cliente"
      },
      provider: {
        label: "Solución configurable",
        description: "Proveedores"
      },
      import: {
        label: "Importar desde OVH",
        description: "Seleccionar dominios para vincular"
      },
      guide: {
        label: "Guía",
        description: "Obtener claves API"
      },
      manual: {
        label: "Entrada manual",
        description: "Nombre de dominio y vencimiento"
      },
      inventory: {
        label: "Dominios",
        description: "Lista supervisada"
      }
    },
    addChoice: {
      title: "Añadir un dominio",
      description: "Elija cómo vincular el dominio a esta empresa.",
      manualTitle: "Entrada manual",
      manualDesc: "Introduzca el nombre, el registrador y la fecha de vencimiento.",
      manualAction: "Continuar",
      integrationTitle: "Mediante una integración",
      integrationDesc: "Importar desde un registrador conectado (OVH…).",
      integrationAction: "Continuar"
    },
    inventory: {
      title: "Dominios supervisados",
      description: "Nombres de dominio vinculados a esta empresa."
    },
    empty: {
      addBtn: "Añadir dominio",
      noneHint: "Añada un dominio manualmente o mediante una integración."
    },
    meta: {
      registrar: "Registrador"
    },
    provider: {
      title: "Elegir una integración",
      description: "Seleccione el registrador para importar dominios.",
      connectionTitle: "Conexión {provider}",
      globalDetected: "Cuenta registrar global detectada en administración. Importe dominios para vincularlos a este cliente.",
      globalNotActive: "La configuración global de OVH no está activa. Active la integración en administración o consulte la guía.",
      globalAccountTitle: "Cuenta registrar global",
      globalAccountDescActive: "Importar dominios desde la cuenta OVH configurada en administración.",
      globalAccountDescInactive: "Active OVH en administración para usar la cuenta registrar global.",
      importAction: "Importar",
      activateInAdmin: "Activar en administración",
      guideTitle: "Guía API OVH",
      guideDesc: "Pasos para crear claves API y activar la integración en administración.",
      consult: "Consultar"
    },
    badges: {
      soon: "Pronto",
      pro: "Pro",
      global: "Global",
      alreadyLinked: "Ya vinculado",
      selected: "Seleccionado",
      dnsZone: "Zona DNS",
      available: "Disponible",
      manual: "Manual"
    },
    overview: {
      title: "Solución registrada",
      description: "Nombres de dominio vinculados a esta empresa.",
      empty: "Ningún dominio configurado por el momento.",
      emptyHintPrefix: "Use la pestaña",
      emptyHintTab: "Importar desde OVH",
      emptyHintSuffix: "o la entrada manual para vincular dominios a esta empresa.",
      modeLabel: "Modo: {mode}",
      deleteAtExpiration: " · Eliminación al vencimiento",
      removeAria: "Retirar {label}",
      removeTitle: "Retirar",
      editTitle: "Editar",
      editAria: "Editar {label}"
    },
    manual: {
      title: "Entrada manual",
      titleEdit: "Editar dominio",
      description: "Registre un nombre de dominio sin conector API.",
      descriptionEdit: "Actualice el nombre, el registrador o la fecha de vencimiento.",
      domainName: "Nombre de dominio",
      domainNamePlaceholder: "ejemplo.es",
      registrar: "Registrar (opcional)",
      registrarPlaceholder: "Ej. Gandi, Ionos…",
      expiration: "Fecha de vencimiento"
    },
    manualProvider: {
      label: "Otro registrar",
      description: "Registro manual sin sincronización API."
    },
    import: {
      title: "Importar desde OVH",
      description: "Seleccione dominios de la cuenta OVH para vincular a esta empresa.",
      hint: "Carga optimizada (solo vencimiento y renovación). Use « Actualizar » para forzar una nueva sincronización con OVH.",
      searchPlaceholder: "Buscar un dominio…",
      refresh: "Actualizar",
      selectAll: "Seleccionar todo",
      clear: "Borrar",
      loading: "Cargando dominios OVH…",
      empty: "Ningún dominio disponible en la cuenta OVH.",
      selectAria: "Seleccionar {domain}"
    },
    table: {
      selectionAria: "Selección",
      domain: "Dominio",
      expiration: "Vencimiento",
      renewal: "Renovación",
      state: "Estado"
    },
    renewal: {
      automatic: "Automático",
      manual: "Manual"
    },
    renewalMode: {
      automatic: "Automático",
      manual: "Manual",
      unknown: "Desconocido"
    },
    domainSummary: {
      fallbackLabel: "Dominio",
      expireOn: "Vence el {date}",
      autoRenew: "Renovación automática",
      manualRenew: "Renovación manual",
      dnsZone: "Zona DNS OVH"
    },
    counts: {
      domainOne: "{count} dominio",
      domainMany: "{count} dominios",
      ovhOne: "{count} dominio OVH",
      ovhMany: "{count} dominios OVH",
      monitoredOne: "{count} dominio supervisado",
      monitoredMany: "{count} dominios supervisados",
      selectedOne: "{count} seleccionado",
      selectedMany: "{count} seleccionados"
    },
    footer: {
      registrar: "Registrar: {provider}"
    },
    actions: {
      back: "Volver",
      attach: "Vincular ({count})",
      attaching: "Importando…",
      saveManual: "Guardar dominio",
      updateManual: "Actualizar"
    },
    proFallback: "Esta integración",
    comingSoon: "{provider} estará disponible pronto en Veritas.",
    emDash: "-",
    toasts: {
      loadError: "Error al cargar los nombres de dominio.",
      ovhLoadError: "No se pudieron cargar los dominios OVH.",
      importSuccess: "{count} dominio(s) vinculado(s) a la empresa.",
      importError: "Error al importar los dominios.",
      removed: "Dominio retirado.",
      manualSaved: "Nombre de dominio guardado.",
      deleteError: "Error al eliminar.",
      domainNotFound: "Dominio no encontrado."
    }
  }
};
const NAV_ICONS = {
  overview: "mdi:view-list-outline",
  provider: "mdi:web",
  import: "mdi:cloud-download-outline",
  guide: "mdi:book-open-outline",
  manual: "mdi:form-textbox"
};
function buildNavSections(t, {
  selectedProviderId,
  globalConfigured = false,
  showProviderGuide = false
}) {
  const sections = [{
    id: "overview",
    label: t.sections.overview.label,
    description: t.sections.overview.description,
    icon: NAV_ICONS.overview
  }, {
    id: "provider",
    label: t.sections.provider.label,
    description: t.sections.provider.description,
    icon: NAV_ICONS.provider
  }];
  const provider = getDnsProvider(selectedProviderId);
  if (selectedProviderId === "ovh" && provider?.supportsGlobal && globalConfigured) {
    sections.push({
      id: "import",
      label: t.sections.import.label,
      description: t.sections.import.description,
      icon: NAV_ICONS.import
    });
  }
  if (showProviderGuide && selectedProviderId === "ovh") {
    sections.push({
      id: "guide",
      label: t.sections.guide.label,
      description: t.sections.guide.description,
      icon: NAV_ICONS.guide
    });
  }
  if (selectedProviderId === "manual") {
    sections.push({
      id: "manual",
      label: t.sections.manual.label,
      description: t.sections.manual.description,
      icon: NAV_ICONS.manual
    });
  }
  return sections;
}
function formatDomainCount(t, count, variant = "plain") {
  const plural = count > 1;
  let template;
  if (variant === "ovh") {
    template = plural ? t.counts.ovhMany : t.counts.ovhOne;
  } else if (variant === "monitored") {
    template = plural ? t.counts.monitoredMany : t.counts.monitoredOne;
  } else {
    template = plural ? t.counts.domainMany : t.counts.domainOne;
  }
  return interpolate(template, {
    count: String(count)
  });
}
function formatSelectedCount(t, count) {
  const template = count > 1 ? t.counts.selectedMany : t.counts.selectedOne;
  return interpolate(template, {
    count: String(count)
  });
}
export function getDomainsModalCopy(locale) {
  const t = pickLocaleMessages(DOMAINS_MODAL_COPY, locale);
  return {
    ...t,
    navSections: params => buildNavSections(t, params),
    renewalModeLabels: t.renewalMode,
    formatRenewalModeLabel: mode => {
      if (mode === "automatic") return t.renewalMode.automatic;
      if (mode === "manual") return t.renewalMode.manual;
      return t.renewalMode.unknown;
    },
    formatDomainCount: (count, variant) => formatDomainCount(t, count, variant),
    formatSelectedCount: count => formatSelectedCount(t, count),
    formatImportSummary: (total, selected) => {
      let summary = formatDomainCount(t, total, "ovh");
      if (selected > 0) {
        summary += ` · ${formatSelectedCount(t, selected)}`;
      }
      return summary;
    },
    formatMonitoredCount: count => formatDomainCount(t, count, "monitored"),
    formatExpireOn: date => interpolate(t.domainSummary.expireOn, {
      date: new Date(date).toLocaleDateString(t.bcp47)
    }),
    formatConnectionTitle: provider => interpolate(t.provider.connectionTitle, {
      provider
    }),
    formatRegistrarFooter: provider => interpolate(t.footer.registrar, {
      provider
    }),
    formatComingSoon: provider => interpolate(t.comingSoon, {
      provider
    }),
    formatImportSuccess: count => interpolate(t.toasts.importSuccess, {
      count: String(count)
    }),
    formatRemoveAria: label => interpolate(t.overview.removeAria, {
      label
    }),
    formatEditAria: label => interpolate(t.overview.editAria, {
      label
    }),
    formatSelectAria: domain => interpolate(t.import.selectAria, {
      domain
    }),
    formatModeLabel: mode => interpolate(t.overview.modeLabel, {
      mode: mode === "automatic" ? t.renewalMode.automatic : mode === "manual" ? t.renewalMode.manual : t.renewalMode.unknown
    }),
    formatAttachAction: count => interpolate(t.actions.attach, {
      count: String(count)
    })
  };
}
