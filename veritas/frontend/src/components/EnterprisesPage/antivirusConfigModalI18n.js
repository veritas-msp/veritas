import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { getAntivirusProvider } from "./antivirusFormConfig";
const ANTIVIRUS_MODAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Cybersécurité",
    title: "Configuration antivirus",
    closeAria: "Fermer",
    navAria: "Sections de configuration antivirus",
    loading: "Chargement de la configuration antivirus…",
    nav: {
      overview: {
        label: "Solution enregistrée",
        description: "Pour ce client"
      },
      solution: {
        label: "Solution paramétrable",
        description: "Fournisseurs"
      },
      reseller: {
        label: "Tenant global",
        descriptionConfigured: "Intégration configurée en administration",
        descriptionNotConfigured: "Non configuré en administration"
      },
      dedicated: {
        label: "Tenant dédié",
        description: "Credentials API propres au client"
      },
      guide: {
        label: "Guide",
        description: "Obtenir une clé API"
      },
      manual: {
        label: "Saisie manuelle",
        description: "Licences et expiration"
      },
      disabledTitle: "Configurez GravityZone en administration"
    },
    navIcons: {
      overview: "mdi:view-list-outline",
      solution: "mdi:shield-check-outline",
      reseller: "mdi:store-cog-outline",
      dedicated: "mdi:shield-key-outline",
      guide: "mdi:book-open-outline",
      manual: "mdi:form-textbox"
    },
    overview: {
      title: "Solution enregistrée",
      description: "Solutions enregistrées pour ce client.",
      empty: "Aucune solution configurée pour le moment.",
      viewData: "Voir les données",
      viewDataAria: "Voir les données de {label}",
      edit: "Éditer",
      editAria: "Éditer {label}",
      delete: "Supprimer",
      deleteAria: "Supprimer {label}"
    },
    solutionPicker: {
      title: "Solution paramétrable",
      description: "Fournisseurs disponibles.",
      connectionTitle: "Connexion {provider}",
      globalIntegrationDetected: "Intégration globale détectée en administration. Choisissez le tenant global ou un tenant dédié pour ce client.",
      noGlobalIntegration: "Aucune intégration globale en administration · configurez uniquement un tenant dédié avec les credentials du client.",
      modeGlobal: {
        title: "Tenant global",
        descConfigured: "Utilise l'intégration configurée en administration.",
        descNotConfigured: "Activez l'intégration en administration pour utiliser le tenant global.",
        actionConfigured: "Configurer",
        actionNotConfigured: "À activer en administration"
      },
      modeDedicated: {
        title: "Tenant dédié",
        description: "Credentials API propres à ce client, indépendants du tenant global.",
        action: "Configurer"
      }
    },
    manual: {
      title: "Autre solution · saisie manuelle",
      description: "Enregistrez une solution sans connecteur API (licences, expiration).",
      solutionName: "Nom de l'antivirus",
      solutionNamePlaceholder: "Ex. Kaspersky, ESET…",
      licencesTotales: "Licences totales",
      licencesUtilisees: "Licences utilisées",
      expiration: "Date d'expiration"
    },
    manualProvider: {
      label: "Autre solution",
      description: "Enregistrement manuel sans synchronisation API (licences, expiration)."
    },
    reseller: {
      title: "Bitdefender · tenant global",
      description: "Associez cette entreprise Veritas à une société cliente de votre tenant GravityZone global.",
      notConfigured: "Le tenant global {provider} n'est pas configuré. Rendez-vous en administration pour renseigner l'URL API et la clé API, ou utilisez un tenant dédié.",
      fallbackProvider: "Bitdefender"
    },
    dedicated: {
      title: "Bitdefender · tenant dédié",
      description: "Credentials API propres à ce client, puis association d'une entreprise GravityZone au sein de ce tenant.",
      existingTenant: "Tenant existant",
      selectPlaceholder: "Sélectionner",
      newTenant: "+ Nouveau tenant",
      tenantLabel: "Tenant #{id}",
      apiUrl: "URL API GravityZone",
      apiUrlPlaceholder: "https://cloud.gravityzone.bitdefender.com/api",
      apiKey: "Clé API",
      apiKeyPlaceholder: "Clé API Bitdefender",
      apiGuideLink: "Comment obtenir l'URL et la clé API ?"
    },
    companyPicker: {
      label: "Entreprise GravityZone",
      loadingTitle: "Chargement des entreprises GravityZone…",
      loadingDesc: "Récupération de la liste depuis votre tenant Bitdefender.",
      placeholder: "Rechercher ou choisir une société…",
      emptySearch: "Aucune entreprise trouvée",
      emptyList: "Aucune entreprise disponible",
      selectedPrefix: "Société sélectionnée :",
      hint: "Cliquez sur le champ pour voir les suggestions ou tapez pour filtrer.",
      refreshing: "Actualisation de la liste des entreprises…"
    },
    comingSoon: {
      configMessage: "La configuration client pour {provider} sera disponible prochainement. Utilisez Bitdefender GravityZone ou la saisie manuelle.",
      fallbackProvider: "cette solution"
    },
    badges: {
      soon: "Bientôt",
      pro: "Pro",
      global: "Global"
    },
    modeLabels: {
      dedicated: "Tenant dédié",
      manual: "Saisie manuelle",
      reseller: "Tenant global"
    },
    solutionFallbackLabels: {
      defaultSolution: "Solution antivirus",
      defaultProductName: "GravityZone BitDefender",
      bitdefenderProvider: "Bitdefender GravityZone",
      manualProvider: "Autre solution",
      unnamedCompany: "Entreprise sans nom",
      unnamedEndpoint: "Sans nom"
    },
    footer: {
      solution: "Solution : {label}",
      selection: "Sélection : {name}",
      configuredOne: "{count} solution configurée",
      configuredMany: "{count} solutions configurées",
      connected: "Connecté",
      connectionError: "Erreur"
    },
    actions: {
      testConnection: "Tester la connexion",
      saveTenant: "Enregistrer le tenant",
      saveManual: "Enregistrer la solution",
      savingManual: "Enregistrement…",
      linkAndSync: "Associer et synchroniser",
      syncing: "Synchronisation…"
    },
    toasts: {
      loadError: "Erreur lors du chargement de la configuration antivirus.",
      loadCompaniesError: "Impossible de charger les entreprises GravityZone.",
      testConnectionSuccess: "Connexion GravityZone réussie.",
      testConnectionError: "Échec du test de connexion.",
      apiCredentialsRequired: "URL API et clé API sont requises.",
      tenantSaved: "Tenant dédié enregistré.",
      tenantCreateError: "Erreur lors de la création du tenant.",
      selectCompany: "Sélectionnez une entreprise GravityZone.",
      selectOrCreateTenant: "Sélectionnez ou créez un tenant dédié.",
      syncFailed: "Synchronisation échouée",
      configUpdated: "Configuration antivirus mise à jour.",
      solutionLinked: "Solution antivirus liée et synchronisée.",
      saveError: "Erreur lors de l'enregistrement.",
      associationDeleted: "Association antivirus supprimée.",
      deleteError: "Erreur lors de la suppression.",
      providerComingSoon: "{label} sera bientôt disponible dans Veritas.",
      proFeatureFallback: "Cette intégration",
      manualSaved: "Solution antivirus enregistrée.",
      solutionNameRequired: "Indiquez le nom de l'antivirus."
    },
    errors: {
      associationNotFound: "Association antivirus introuvable.",
      clientNotFound: "Client introuvable.",
      gravityZoneNotFound: "Solution GravityZone introuvable."
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Cybersecurity",
    title: "Antivirus configuration",
    closeAria: "Close",
    navAria: "Antivirus configuration sections",
    loading: "Loading antivirus configuration…",
    nav: {
      overview: {
        label: "Registered solution",
        description: "For this client"
      },
      solution: {
        label: "Configurable solution",
        description: "Providers"
      },
      reseller: {
        label: "Global tenant",
        descriptionConfigured: "Integration configured in administration",
        descriptionNotConfigured: "Not configured in administration"
      },
      dedicated: {
        label: "Dedicated tenant",
        description: "Client-specific API credentials"
      },
      guide: {
        label: "Guide",
        description: "Obtain an API key"
      },
      manual: {
        label: "Manual entry",
        description: "Licenses and expiration"
      },
      disabledTitle: "Configure GravityZone in administration"
    },
    navIcons: {
      overview: "mdi:view-list-outline",
      solution: "mdi:shield-check-outline",
      reseller: "mdi:store-cog-outline",
      dedicated: "mdi:shield-key-outline",
      guide: "mdi:book-open-outline",
      manual: "mdi:form-textbox"
    },
    overview: {
      title: "Registered solution",
      description: "Solutions registered for this client.",
      empty: "No solution configured yet.",
      viewData: "View data",
      viewDataAria: "View data for {label}",
      edit: "Edit",
      editAria: "Edit {label}",
      delete: "Delete",
      deleteAria: "Delete {label}"
    },
    solutionPicker: {
      title: "Configurable solution",
      description: "Available providers.",
      connectionTitle: "Connect {provider}",
      globalIntegrationDetected: "Global integration detected in administration. Choose the global tenant or a dedicated tenant for this client.",
      noGlobalIntegration: "No global integration in administration · configure only a dedicated tenant with the client's credentials.",
      modeGlobal: {
        title: "Global tenant",
        descConfigured: "Uses the integration configured in administration.",
        descNotConfigured: "Enable the integration in administration to use the global tenant.",
        actionConfigured: "Configure",
        actionNotConfigured: "Enable in administration"
      },
      modeDedicated: {
        title: "Dedicated tenant",
        description: "Client-specific API credentials, independent of the global tenant.",
        action: "Configure"
      }
    },
    manual: {
      title: "Other solution · manual entry",
      description: "Record a solution without an API connector (licenses, expiration).",
      solutionName: "Antivirus name",
      solutionNamePlaceholder: "E.g. Kaspersky, ESET…",
      licencesTotales: "Total licenses",
      licencesUtilisees: "Used licenses",
      expiration: "Expiration date"
    },
    manualProvider: {
      label: "Other solution",
      description: "Manual entry without API sync (licenses, expiration)."
    },
    reseller: {
      title: "Bitdefender · global tenant",
      description: "Link this Veritas company to a client company in your global GravityZone tenant.",
      notConfigured: "The global {provider} tenant is not configured. Go to administration to enter the API URL and API key, or use a dedicated tenant.",
      fallbackProvider: "Bitdefender"
    },
    dedicated: {
      title: "Bitdefender · dedicated tenant",
      description: "Client-specific API credentials, then link a GravityZone company within this tenant.",
      existingTenant: "Existing tenant",
      selectPlaceholder: "Select",
      newTenant: "+ New tenant",
      tenantLabel: "Tenant #{id}",
      apiUrl: "GravityZone API URL",
      apiUrlPlaceholder: "https://cloud.gravityzone.bitdefender.com/api",
      apiKey: "API key",
      apiKeyPlaceholder: "Bitdefender API key",
      apiGuideLink: "How to obtain the URL and API key?"
    },
    companyPicker: {
      label: "GravityZone company",
      loadingTitle: "Loading GravityZone companies…",
      loadingDesc: "Fetching the list from your Bitdefender tenant.",
      placeholder: "Search or choose a company…",
      emptySearch: "No company found",
      emptyList: "No company available",
      selectedPrefix: "Selected company:",
      hint: "Click the field to see suggestions or type to filter.",
      refreshing: "Refreshing company list…"
    },
    comingSoon: {
      configMessage: "Client configuration for {provider} will be available soon. Use Bitdefender GravityZone or manual entry.",
      fallbackProvider: "this solution"
    },
    badges: {
      soon: "Soon",
      pro: "Pro",
      global: "Global"
    },
    modeLabels: {
      dedicated: "Dedicated tenant",
      manual: "Manual entry",
      reseller: "Global tenant"
    },
    solutionFallbackLabels: {
      defaultSolution: "Antivirus solution",
      defaultProductName: "GravityZone BitDefender",
      bitdefenderProvider: "Bitdefender GravityZone",
      manualProvider: "Other solution",
      unnamedCompany: "Unnamed company",
      unnamedEndpoint: "Unnamed"
    },
    footer: {
      solution: "Solution: {label}",
      selection: "Selection: {name}",
      configuredOne: "{count} configured solution",
      configuredMany: "{count} configured solutions",
      connected: "Connected",
      connectionError: "Error"
    },
    actions: {
      testConnection: "Test connection",
      saveTenant: "Save tenant",
      saveManual: "Save solution",
      savingManual: "Saving…",
      linkAndSync: "Link and sync",
      syncing: "Syncing…"
    },
    toasts: {
      loadError: "Error loading antivirus configuration.",
      loadCompaniesError: "Unable to load GravityZone companies.",
      testConnectionSuccess: "GravityZone connection successful.",
      testConnectionError: "Connection test failed.",
      apiCredentialsRequired: "API URL and API key are required.",
      tenantSaved: "Dedicated tenant saved.",
      tenantCreateError: "Error creating tenant.",
      selectCompany: "Select a GravityZone company.",
      selectOrCreateTenant: "Select or create a dedicated tenant.",
      syncFailed: "Synchronization failed",
      configUpdated: "Antivirus configuration updated.",
      solutionLinked: "Antivirus solution linked and synchronized.",
      saveError: "Error while saving.",
      associationDeleted: "Antivirus association removed.",
      deleteError: "Error while deleting.",
      providerComingSoon: "{label} will be available in Veritas soon.",
      proFeatureFallback: "This integration",
      manualSaved: "Antivirus solution saved.",
      solutionNameRequired: "Enter the antivirus name."
    },
    errors: {
      associationNotFound: "Antivirus association not found.",
      clientNotFound: "Client not found.",
      gravityZoneNotFound: "GravityZone solution not found."
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Cybersicherheit",
    title: "Antivirus-Konfiguration",
    closeAria: "Schließen",
    navAria: "Antivirus-Konfigurationsbereiche",
    loading: "Antivirus-Konfiguration wird geladen…",
    nav: {
      overview: {
        label: "Erfasste Lösung",
        description: "Für diesen Kunden"
      },
      solution: {
        label: "Konfigurierbare Lösung",
        description: "Anbieter"
      },
      reseller: {
        label: "Globaler Tenant",
        descriptionConfigured: "Integration in der Administration konfiguriert",
        descriptionNotConfigured: "In der Administration nicht konfiguriert"
      },
      dedicated: {
        label: "Dedizierter Tenant",
        description: "Kundenspezifische API-Anmeldedaten"
      },
      guide: {
        label: "Anleitung",
        description: "API-Schlüssel erhalten"
      },
      manual: {
        label: "Manuelle Eingabe",
        description: "Lizenzen und Ablauf"
      },
      disabledTitle: "GravityZone in der Administration konfigurieren"
    },
    navIcons: {
      overview: "mdi:view-list-outline",
      solution: "mdi:shield-check-outline",
      reseller: "mdi:store-cog-outline",
      dedicated: "mdi:shield-key-outline",
      guide: "mdi:book-open-outline",
      manual: "mdi:form-textbox"
    },
    overview: {
      title: "Erfasste Lösung",
      description: "Für diesen Kunden erfasste Lösungen.",
      empty: "Derzeit keine Lösung konfiguriert.",
      viewData: "Daten anzeigen",
      viewDataAria: "Daten von {label} anzeigen",
      edit: "Bearbeiten",
      editAria: "{label} bearbeiten",
      delete: "Löschen",
      deleteAria: "{label} löschen"
    },
    solutionPicker: {
      title: "Konfigurierbare Lösung",
      description: "Verfügbare Anbieter.",
      connectionTitle: "Verbindung {provider}",
      globalIntegrationDetected: "Globale Integration in der Administration erkannt. Wählen Sie den globalen Tenant oder einen dedizierten Tenant für diesen Kunden.",
      noGlobalIntegration: "Keine globale Integration in der Administration · konfigurieren Sie nur einen dedizierten Tenant mit den Kunden-Anmeldedaten.",
      modeGlobal: {
        title: "Globaler Tenant",
        descConfigured: "Nutzt die in der Administration konfigurierte Integration.",
        descNotConfigured: "Aktivieren Sie die Integration in der Administration, um den globalen Tenant zu nutzen.",
        actionConfigured: "Konfigurieren",
        actionNotConfigured: "In der Administration aktivieren"
      },
      modeDedicated: {
        title: "Dedizierter Tenant",
        description: "Kundenspezifische API-Anmeldedaten, unabhängig vom globalen Tenant.",
        action: "Konfigurieren"
      }
    },
    manual: {
      title: "Andere Lösung · manuelle Eingabe",
      description: "Erfassen Sie eine Lösung ohne API-Connector (Lizenzen, Ablauf).",
      solutionName: "Name der Antivirus-Lösung",
      solutionNamePlaceholder: "z. B. Kaspersky, ESET…",
      licencesTotales: "Lizenzen gesamt",
      licencesUtilisees: "Genutzte Lizenzen",
      expiration: "Ablaufdatum"
    },
    manualProvider: {
      label: "Andere Lösung",
      description: "Manuelle Erfassung ohne API-Synchronisation (Lizenzen, Ablauf)."
    },
    reseller: {
      title: "Bitdefender · globaler Tenant",
      description: "Verknüpfen Sie dieses Veritas-Unternehmen mit einem Kundenunternehmen in Ihrem globalen GravityZone-Tenant.",
      notConfigured: "Der globale {provider}-Tenant ist nicht konfiguriert. Gehen Sie zur Administration, um API-URL und API-Schlüssel einzutragen, oder nutzen Sie einen dedizierten Tenant.",
      fallbackProvider: "Bitdefender"
    },
    dedicated: {
      title: "Bitdefender · dedizierter Tenant",
      description: "Kundenspezifische API-Anmeldedaten, dann Verknüpfung eines GravityZone-Unternehmens innerhalb dieses Tenants.",
      existingTenant: "Vorhandener Tenant",
      selectPlaceholder: "Auswählen",
      newTenant: "+ Neuer Tenant",
      tenantLabel: "Tenant #{id}",
      apiUrl: "GravityZone API-URL",
      apiUrlPlaceholder: "https://cloud.gravityzone.bitdefender.com/api",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "Bitdefender API-Schlüssel",
      apiGuideLink: "Wie erhält man URL und API-Schlüssel?"
    },
    companyPicker: {
      label: "GravityZone-Unternehmen",
      loadingTitle: "GravityZone-Unternehmen werden geladen…",
      loadingDesc: "Liste wird aus Ihrem Bitdefender-Tenant abgerufen.",
      placeholder: "Unternehmen suchen oder auswählen…",
      emptySearch: "Kein Unternehmen gefunden",
      emptyList: "Kein Unternehmen verfügbar",
      selectedPrefix: "Ausgewähltes Unternehmen:",
      hint: "Klicken Sie auf das Feld für Vorschläge oder tippen Sie zum Filtern.",
      refreshing: "Unternehmensliste wird aktualisiert…"
    },
    comingSoon: {
      configMessage: "Die Kundenkonfiguration für {provider} wird demnächst verfügbar sein. Nutzen Sie Bitdefender GravityZone oder die manuelle Eingabe.",
      fallbackProvider: "diese Lösung"
    },
    badges: {
      soon: "Demnächst",
      pro: "Pro",
      global: "Global"
    },
    modeLabels: {
      dedicated: "Dedizierter Tenant",
      manual: "Manuelle Eingabe",
      reseller: "Globaler Tenant"
    },
    solutionFallbackLabels: {
      defaultSolution: "Antivirus-Lösung",
      defaultProductName: "GravityZone BitDefender",
      bitdefenderProvider: "Bitdefender GravityZone",
      manualProvider: "Andere Lösung",
      unnamedCompany: "Unbenanntes Unternehmen",
      unnamedEndpoint: "Ohne Name"
    },
    footer: {
      solution: "Lösung: {label}",
      selection: "Auswahl: {name}",
      configuredOne: "{count} konfigurierte Lösung",
      configuredMany: "{count} konfigurierte Lösungen",
      connected: "Verbunden",
      connectionError: "Fehler"
    },
    actions: {
      testConnection: "Verbindung testen",
      saveTenant: "Tenant speichern",
      saveManual: "Lösung speichern",
      savingManual: "Speichern…",
      linkAndSync: "Verknüpfen und synchronisieren",
      syncing: "Synchronisierung…"
    },
    toasts: {
      loadError: "Fehler beim Laden der Antivirus-Konfiguration.",
      loadCompaniesError: "GravityZone-Unternehmen konnten nicht geladen werden.",
      testConnectionSuccess: "GravityZone-Verbindung erfolgreich.",
      testConnectionError: "Verbindungstest fehlgeschlagen.",
      apiCredentialsRequired: "API-URL und API-Schlüssel sind erforderlich.",
      tenantSaved: "Dedizierter Tenant gespeichert.",
      tenantCreateError: "Fehler beim Erstellen des Tenants.",
      selectCompany: "Wählen Sie ein GravityZone-Unternehmen.",
      selectOrCreateTenant: "Wählen oder erstellen Sie einen dedizierten Tenant.",
      syncFailed: "Synchronisierung fehlgeschlagen",
      configUpdated: "Antivirus-Konfiguration aktualisiert.",
      solutionLinked: "Antivirus-Lösung verknüpft und synchronisiert.",
      saveError: "Fehler beim Speichern.",
      associationDeleted: "Antivirus-Verknüpfung entfernt.",
      deleteError: "Fehler beim Löschen.",
      providerComingSoon: "{label} wird demnächst in Veritas verfügbar sein.",
      proFeatureFallback: "Diese Integration",
      manualSaved: "Antivirus-Lösung gespeichert.",
      solutionNameRequired: "Geben Sie den Namen der Antivirus-Lösung an."
    },
    errors: {
      associationNotFound: "Antivirus-Verknüpfung nicht gefunden.",
      clientNotFound: "Kunde nicht gefunden.",
      gravityZoneNotFound: "GravityZone-Lösung nicht gefunden."
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Cybersicurezza",
    title: "Configurazione antivirus",
    closeAria: "Chiudi",
    navAria: "Sezioni configurazione antivirus",
    loading: "Caricamento configurazione antivirus…",
    nav: {
      overview: {
        label: "Soluzione registrata",
        description: "Per questo cliente"
      },
      solution: {
        label: "Soluzione configurabile",
        description: "Fornitori"
      },
      reseller: {
        label: "Tenant globale",
        descriptionConfigured: "Integrazione configurata in amministrazione",
        descriptionNotConfigured: "Non configurato in amministrazione"
      },
      dedicated: {
        label: "Tenant dedicato",
        description: "Credenziali API specifiche del cliente"
      },
      guide: {
        label: "Guida",
        description: "Ottenere una chiave API"
      },
      manual: {
        label: "Inserimento manuale",
        description: "Licenze e scadenza"
      },
      disabledTitle: "Configura GravityZone in amministrazione"
    },
    navIcons: {
      overview: "mdi:view-list-outline",
      solution: "mdi:shield-check-outline",
      reseller: "mdi:store-cog-outline",
      dedicated: "mdi:shield-key-outline",
      guide: "mdi:book-open-outline",
      manual: "mdi:form-textbox"
    },
    overview: {
      title: "Soluzione registrata",
      description: "Soluzioni registrate per questo cliente.",
      empty: "Nessuna soluzione configurata al momento.",
      viewData: "Vedi dati",
      viewDataAria: "Vedi dati di {label}",
      edit: "Modifica",
      editAria: "Modifica {label}",
      delete: "Elimina",
      deleteAria: "Elimina {label}"
    },
    solutionPicker: {
      title: "Soluzione configurabile",
      description: "Fornitori disponibili.",
      connectionTitle: "Connessione {provider}",
      globalIntegrationDetected: "Integrazione globale rilevata in amministrazione. Scegli il tenant globale o un tenant dedicato per questo cliente.",
      noGlobalIntegration: "Nessuna integrazione globale in amministrazione · configura solo un tenant dedicato con le credenziali del cliente.",
      modeGlobal: {
        title: "Tenant globale",
        descConfigured: "Utilizza l'integrazione configurata in amministrazione.",
        descNotConfigured: "Attiva l'integrazione in amministrazione per usare il tenant globale.",
        actionConfigured: "Configura",
        actionNotConfigured: "Da attivare in amministrazione"
      },
      modeDedicated: {
        title: "Tenant dedicato",
        description: "Credenziali API specifiche del cliente, indipendenti dal tenant globale.",
        action: "Configura"
      }
    },
    manual: {
      title: "Altra soluzione · inserimento manuale",
      description: "Registra una soluzione senza connettore API (licenze, scadenza).",
      solutionName: "Nome antivirus",
      solutionNamePlaceholder: "Es. Kaspersky, ESET…",
      licencesTotales: "Licenze totali",
      licencesUtilisees: "Licenze utilizzate",
      expiration: "Data di scadenza"
    },
    manualProvider: {
      label: "Altra soluzione",
      description: "Registrazione manuale senza sincronizzazione API (licenze, scadenza)."
    },
    reseller: {
      title: "Bitdefender · tenant globale",
      description: "Associa questa azienda Veritas a un'azienda cliente del tuo tenant GravityZone globale.",
      notConfigured: "Il tenant globale {provider} non è configurato. Vai in amministrazione per inserire URL API e chiave API, oppure usa un tenant dedicato.",
      fallbackProvider: "Bitdefender"
    },
    dedicated: {
      title: "Bitdefender · tenant dedicato",
      description: "Credenziali API specifiche del cliente, poi associazione di un'azienda GravityZone all'interno di questo tenant.",
      existingTenant: "Tenant esistente",
      selectPlaceholder: "Seleziona",
      newTenant: "+ Nuovo tenant",
      tenantLabel: "Tenant #{id}",
      apiUrl: "URL API GravityZone",
      apiUrlPlaceholder: "https://cloud.gravityzone.bitdefender.com/api",
      apiKey: "Chiave API",
      apiKeyPlaceholder: "Chiave API Bitdefender",
      apiGuideLink: "Come ottenere URL e chiave API?"
    },
    companyPicker: {
      label: "Azienda GravityZone",
      loadingTitle: "Caricamento aziende GravityZone…",
      loadingDesc: "Recupero dell'elenco dal tuo tenant Bitdefender.",
      placeholder: "Cerca o scegli un'azienda…",
      emptySearch: "Nessuna azienda trovata",
      emptyList: "Nessuna azienda disponibile",
      selectedPrefix: "Azienda selezionata:",
      hint: "Clicca sul campo per vedere i suggerimenti o digita per filtrare.",
      refreshing: "Aggiornamento elenco aziende…"
    },
    comingSoon: {
      configMessage: "La configurazione cliente per {provider} sarà disponibile a breve. Usa Bitdefender GravityZone o l'inserimento manuale.",
      fallbackProvider: "questa soluzione"
    },
    badges: {
      soon: "Presto",
      pro: "Pro",
      global: "Globale"
    },
    modeLabels: {
      dedicated: "Tenant dedicato",
      manual: "Inserimento manuale",
      reseller: "Tenant globale"
    },
    solutionFallbackLabels: {
      defaultSolution: "Soluzione antivirus",
      defaultProductName: "GravityZone BitDefender",
      bitdefenderProvider: "Bitdefender GravityZone",
      manualProvider: "Altra soluzione",
      unnamedCompany: "Azienda senza nome",
      unnamedEndpoint: "Senza nome"
    },
    footer: {
      solution: "Soluzione: {label}",
      selection: "Selezione: {name}",
      configuredOne: "{count} soluzione configurata",
      configuredMany: "{count} soluzioni configurate",
      connected: "Connesso",
      connectionError: "Errore"
    },
    actions: {
      testConnection: "Testa connessione",
      saveTenant: "Salva tenant",
      saveManual: "Salva soluzione",
      savingManual: "Salvataggio…",
      linkAndSync: "Associa e sincronizza",
      syncing: "Sincronizzazione…"
    },
    toasts: {
      loadError: "Errore durante il caricamento della configurazione antivirus.",
      loadCompaniesError: "Impossibile caricare le aziende GravityZone.",
      testConnectionSuccess: "Connessione GravityZone riuscita.",
      testConnectionError: "Test di connessione fallito.",
      apiCredentialsRequired: "URL API e chiave API sono obbligatori.",
      tenantSaved: "Tenant dedicato salvato.",
      tenantCreateError: "Errore durante la creazione del tenant.",
      selectCompany: "Seleziona un'azienda GravityZone.",
      selectOrCreateTenant: "Seleziona o crea un tenant dedicato.",
      syncFailed: "Sincronizzazione fallita",
      configUpdated: "Configurazione antivirus aggiornata.",
      solutionLinked: "Soluzione antivirus associata e sincronizzata.",
      saveError: "Errore durante il salvataggio.",
      associationDeleted: "Associazione antivirus rimossa.",
      deleteError: "Errore durante l'eliminazione.",
      providerComingSoon: "{label} sarà presto disponibile in Veritas.",
      proFeatureFallback: "Questa integrazione",
      manualSaved: "Soluzione antivirus salvata.",
      solutionNameRequired: "Indicare il nome dell'antivirus."
    },
    errors: {
      associationNotFound: "Associazione antivirus non trovata.",
      clientNotFound: "Cliente non trovato.",
      gravityZoneNotFound: "Soluzione GravityZone non trovata."
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Ciberseguridad",
    title: "Configuración antivirus",
    closeAria: "Cerrar",
    navAria: "Secciones de configuración antivirus",
    loading: "Cargando configuración antivirus…",
    nav: {
      overview: {
        label: "Solución registrada",
        description: "Para este cliente"
      },
      solution: {
        label: "Solución configurable",
        description: "Proveedores"
      },
      reseller: {
        label: "Tenant global",
        descriptionConfigured: "Integración configurada en administración",
        descriptionNotConfigured: "No configurado en administración"
      },
      dedicated: {
        label: "Tenant dedicado",
        description: "Credenciales API propias del cliente"
      },
      guide: {
        label: "Guía",
        description: "Obtener una clave API"
      },
      manual: {
        label: "Entrada manual",
        description: "Licencias y vencimiento"
      },
      disabledTitle: "Configure GravityZone en administración"
    },
    navIcons: {
      overview: "mdi:view-list-outline",
      solution: "mdi:shield-check-outline",
      reseller: "mdi:store-cog-outline",
      dedicated: "mdi:shield-key-outline",
      guide: "mdi:book-open-outline",
      manual: "mdi:form-textbox"
    },
    overview: {
      title: "Solución registrada",
      description: "Soluciones registradas para este cliente.",
      empty: "Ninguna solución configurada por el momento.",
      viewData: "Ver datos",
      viewDataAria: "Ver datos de {label}",
      edit: "Editar",
      editAria: "Editar {label}",
      delete: "Eliminar",
      deleteAria: "Eliminar {label}"
    },
    solutionPicker: {
      title: "Solución configurable",
      description: "Proveedores disponibles.",
      connectionTitle: "Conexión {provider}",
      globalIntegrationDetected: "Integración global detectada en administración. Elija el tenant global o un tenant dedicado para este cliente.",
      noGlobalIntegration: "Sin integración global en administración · configure solo un tenant dedicado con las credenciales del cliente.",
      modeGlobal: {
        title: "Tenant global",
        descConfigured: "Utiliza la integración configurada en administración.",
        descNotConfigured: "Active la integración en administración para usar el tenant global.",
        actionConfigured: "Configurar",
        actionNotConfigured: "Activar en administración"
      },
      modeDedicated: {
        title: "Tenant dedicado",
        description: "Credenciales API propias del cliente, independientes del tenant global.",
        action: "Configurar"
      }
    },
    manual: {
      title: "Otra solución · entrada manual",
      description: "Registre una solución sin conector API (licencias, vencimiento).",
      solutionName: "Nombre del antivirus",
      solutionNamePlaceholder: "Ej. Kaspersky, ESET…",
      licencesTotales: "Licencias totales",
      licencesUtilisees: "Licencias utilizadas",
      expiration: "Fecha de vencimiento"
    },
    manualProvider: {
      label: "Otra solución",
      description: "Registro manual sin sincronización API (licencias, vencimiento)."
    },
    reseller: {
      title: "Bitdefender · tenant global",
      description: "Asocie esta empresa Veritas a una empresa cliente de su tenant GravityZone global.",
      notConfigured: "El tenant global {provider} no está configurado. Vaya a administración para indicar la URL API y la clave API, o use un tenant dedicado.",
      fallbackProvider: "Bitdefender"
    },
    dedicated: {
      title: "Bitdefender · tenant dedicado",
      description: "Credenciales API propias del cliente, luego asociación de una empresa GravityZone dentro de este tenant.",
      existingTenant: "Tenant existente",
      selectPlaceholder: "Seleccionar",
      newTenant: "+ Nuevo tenant",
      tenantLabel: "Tenant #{id}",
      apiUrl: "URL API GravityZone",
      apiUrlPlaceholder: "https://cloud.gravityzone.bitdefender.com/api",
      apiKey: "Clave API",
      apiKeyPlaceholder: "Clave API Bitdefender",
      apiGuideLink: "¿Cómo obtener la URL y la clave API?"
    },
    companyPicker: {
      label: "Empresa GravityZone",
      loadingTitle: "Cargando empresas GravityZone…",
      loadingDesc: "Recuperando la lista desde su tenant Bitdefender.",
      placeholder: "Buscar o elegir una empresa…",
      emptySearch: "Ninguna empresa encontrada",
      emptyList: "Ninguna empresa disponible",
      selectedPrefix: "Empresa seleccionada:",
      hint: "Haga clic en el campo para ver sugerencias o escriba para filtrar.",
      refreshing: "Actualizando lista de empresas…"
    },
    comingSoon: {
      configMessage: "La configuración de cliente para {provider} estará disponible próximamente. Use Bitdefender GravityZone o la entrada manual.",
      fallbackProvider: "esta solución"
    },
    badges: {
      soon: "Pronto",
      pro: "Pro",
      global: "Global"
    },
    modeLabels: {
      dedicated: "Tenant dedicado",
      manual: "Entrada manual",
      reseller: "Tenant global"
    },
    solutionFallbackLabels: {
      defaultSolution: "Solución antivirus",
      defaultProductName: "GravityZone BitDefender",
      bitdefenderProvider: "Bitdefender GravityZone",
      manualProvider: "Otra solución",
      unnamedCompany: "Empresa sin nombre",
      unnamedEndpoint: "Sin nombre"
    },
    footer: {
      solution: "Solución: {label}",
      selection: "Selección: {name}",
      configuredOne: "{count} solución configurada",
      configuredMany: "{count} soluciones configuradas",
      connected: "Conectado",
      connectionError: "Error"
    },
    actions: {
      testConnection: "Probar conexión",
      saveTenant: "Guardar tenant",
      saveManual: "Guardar solución",
      savingManual: "Guardando…",
      linkAndSync: "Asociar y sincronizar",
      syncing: "Sincronizando…"
    },
    toasts: {
      loadError: "Error al cargar la configuración antivirus.",
      loadCompaniesError: "No se pudieron cargar las empresas GravityZone.",
      testConnectionSuccess: "Conexión GravityZone correcta.",
      testConnectionError: "Error en la prueba de conexión.",
      apiCredentialsRequired: "La URL API y la clave API son obligatorias.",
      tenantSaved: "Tenant dedicado guardado.",
      tenantCreateError: "Error al crear el tenant.",
      selectCompany: "Seleccione una empresa GravityZone.",
      selectOrCreateTenant: "Seleccione o cree un tenant dedicado.",
      syncFailed: "Sincronización fallida",
      configUpdated: "Configuración antivirus actualizada.",
      solutionLinked: "Solución antivirus asociada y sincronizada.",
      saveError: "Error al guardar.",
      associationDeleted: "Asociación antivirus eliminada.",
      deleteError: "Error al eliminar.",
      providerComingSoon: "{label} estará disponible en Veritas próximamente.",
      proFeatureFallback: "Esta integración",
      manualSaved: "Solución antivirus guardada.",
      solutionNameRequired: "Indique el nombre del antivirus."
    },
    errors: {
      associationNotFound: "Asociación antivirus no encontrada.",
      clientNotFound: "Cliente no encontrado.",
      gravityZoneNotFound: "Solución GravityZone no encontrada."
    }
  }
};
function buildLocalizedNavSections(t, {
  selectedProviderId,
  globalConfigured,
  visibleTenantMode
}) {
  const icons = t.navIcons;
  const sections = [{
    id: "overview",
    label: t.nav.overview.label,
    description: t.nav.overview.description,
    icon: icons.overview
  }, {
    id: "solution",
    label: t.nav.solution.label,
    description: t.nav.solution.description,
    icon: icons.solution
  }];
  const provider = getAntivirusProvider(selectedProviderId);
  if (selectedProviderId && selectedProviderId !== "manual" && provider?.supportsDedicated) {
    if (visibleTenantMode === "reseller") {
      sections.push({
        id: "reseller",
        label: t.nav.reseller.label,
        description: globalConfigured ? t.nav.reseller.descriptionConfigured : t.nav.reseller.descriptionNotConfigured,
        icon: icons.reseller,
        disabled: !globalConfigured
      });
    } else if (visibleTenantMode === "dedicated") {
      sections.push({
        id: "dedicated",
        label: t.nav.dedicated.label,
        description: t.nav.dedicated.description,
        icon: icons.dedicated
      });
      if (selectedProviderId === "bitdefender") {
        sections.push({
          id: "guide",
          label: t.nav.guide.label,
          description: t.nav.guide.description,
          icon: icons.guide
        });
      }
    }
  } else if (selectedProviderId === "manual") {
    sections.push({
      id: "manual",
      label: t.nav.manual.label,
      description: t.nav.manual.description,
      icon: icons.manual
    });
  }
  return sections;
}
export function getAntivirusModalCopy(locale) {
  const t = pickLocaleMessages(ANTIVIRUS_MODAL_COPY, locale);
  return {
    ...t,
    badges: t.badges,
    modeLabels: t.modeLabels,
    solutionFallbackLabels: t.solutionFallbackLabels,
    navSections: params => buildLocalizedNavSections(t, params),
    formatConnectionTitle: provider => interpolate(t.solutionPicker.connectionTitle, {
      provider
    }),
    formatResellerNotConfigured: provider => interpolate(t.reseller.notConfigured, {
      provider: provider || t.reseller.fallbackProvider
    }),
    formatComingSoonConfig: provider => interpolate(t.comingSoon.configMessage, {
      provider: provider || t.comingSoon.fallbackProvider
    }),
    formatProviderComingSoonToast: label => interpolate(t.toasts.providerComingSoon, {
      label
    }),
    formatDedicatedTenantLabel: id => interpolate(t.dedicated.tenantLabel, {
      id: String(id)
    }),
    formatViewDataAria: label => interpolate(t.overview.viewDataAria, {
      label
    }),
    formatEditAria: label => interpolate(t.overview.editAria, {
      label
    }),
    formatDeleteAria: label => interpolate(t.overview.deleteAria, {
      label
    }),
    formatFooterSolution: label => interpolate(t.footer.solution, {
      label
    }),
    formatFooterSelection: name => interpolate(t.footer.selection, {
      name
    }),
    formatFooterConfiguredCount: count => {
      const template = count > 1 ? t.footer.configuredMany : t.footer.configuredOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    getAntivirusSolutionModeLabel: solution => {
      const mode = solution?.mappingMode || "reseller";
      if (mode === "dedicated") return t.modeLabels.dedicated;
      if (mode === "manual" || solution?.isManual || solution?.providerId === "manual") {
        return t.modeLabels.manual;
      }
      return t.modeLabels.reseller;
    }
  };
}
