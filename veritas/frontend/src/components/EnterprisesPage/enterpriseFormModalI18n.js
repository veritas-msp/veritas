import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SECTION_IDS = ["identity", "location", "contact", "contract"];
const SECTION_ICONS = {
  identity: "mdi:domain",
  location: "mdi:map-marker-radius-outline",
  contact: "mdi:account-tie-outline",
  contract: "mdi:file-document-outline"
};
const COPY = {
  fr: {
    eyebrow: "Fiche entreprise",
    closeAria: "Fermer",
    navAria: "Sections du formulaire",
    titleCreate: "Nouvelle entreprise",
    titleEdit: "Modifier {name}",
    titleEditFallback: "l'entreprise",
    subtitleCreate: "Créez une fiche client complète en quelques étapes.",
    subtitleEdit: "Mettez à jour les informations contractuelles et l'identité du client.",
    cancel: "Annuler",
    save: "Enregistrer",
    create: "Créer l'entreprise",
    saving: "Enregistrement…",
    delete: "Supprimer",
    deleting: "Suppression…",
    checking: "Vérification…",
    checkingLinked: "Vérification des éléments liés…",
    legalIdentifier: "Identifiant légal",
    fields: {
      clientNumber: "Numéro client",
      clientNumberPlaceholder: "31",
      name: "Nom de l'entreprise",
      namePlaceholder: "Société Dupont",
      icon: "Icône",
      iconHint: "Affichée devant le nom dans la liste des entreprises (n'affecte pas la recherche).",
      iconSearchPlaceholder: "Rechercher une icône…",
      iconSearchAria: "Rechercher une icône",
      iconClearSearch: "Effacer la recherche d'icône",
      iconChangeLabel: "Changer l'icône",
      iconPickerAria: "Choisir une icône d'entreprise",
      iconClear: "Retirer l'icône",
      iconColor: "Couleur",
      iconColorAria: "Couleur de l'icône",
      iconColorCustom: "Couleur personnalisée",
      legalIdentifierPlaceholder: "Numéro d'immatriculation",
      sector: "Secteur d'activité",
      address: "Adresse",
      addressPlaceholder: "10 rue du Château",
      postalCode: "Code postal",
      postalPlaceholder: "33000",
      city: "Ville",
      cityPlaceholder: "Bordeaux",
      sitesLabel: "Sites & implantations",
      manageSites: "Gérer les sites ({count})",
      noSites: "Aucun site enregistré.",
      sitePrimary: "Principal",
      primaryContact: "Contact principal",
      contactSearchPlaceholder: "Rechercher un contact (nom, e-mail, téléphone…)",
      contactHint: "Recherchez un contact existant ou créez-en un nouveau. Il sera rattaché à l'entreprise à la validation.",
      editContact: "Modifier les informations",
      createContact: "Créer un contact",
      loadingContacts: "Chargement des contacts…",
      noContactFound: "Aucun contact trouvé",
      contractStart: "Date de début",
      contractEnd: "Date d'expiration",
      commercial: "Référent commercial",
      commercialSearchPlaceholder: "Rechercher un agent…",
      noAgentSelected: "Aucun agent sélectionné",
      noAgentFound: "Aucun agent trouvé",
      loadingAgents: "Chargement des agents…",
      createAgent: "Créer un agent"
    },
    sections: {
      identity: {
        label: "Identité",
        description: "Nom, identifiants, apparence et statut"
      },
      location: {
        label: "Sites",
        description: "Sites et implantations de l'entreprise"
      },
      contact: {
        label: "Contact",
        description: "Interlocuteur principal de l'entreprise"
      },
      contract: {
        label: "Contrat",
        description: "Période, commercial, services MSP et SLA"
      }
    },
    statutActive: "Actif",
    statutInactive: "Inactif",
    statusBlock: {
      subsectionTitle: "Statut",
      subsectionDesc: "Disponibilité de l'entreprise dans le portefeuille"
    },
    modules: {
      subsectionTitle: "Services inclus",
      subsectionDesc: "Options et périmètre du contrat MSP",
      summaryOne: "{count} service sélectionné sur {total} disponibles",
      summaryMany: "{count} services sélectionnés sur {total} disponibles",
      proNewService: "Nouveau service",
      proCustomServices: "Services personnalisés",
      proAria: "Création de services personnalisés · disponible avec Veritas Pro"
    },
    sla: {
      subsectionTitle: "SLA",
      subsectionDesc: "Engagements de réponse et résolution",
      enable: "Activer les SLA pour cette entreprise",
      priority: "Priorité",
      firstResponse: "1ère réponse (h)",
      resolution: "Résolution (h)",
      previewHint: "Aperçu des engagements par défaut.",
      editHint: "Les délais démarrent à la création du ticket (selon le mode SLA défini dans l'administration). La 1ère réponse publique clôt l'engagement de prise en charge.",
      priorities: {
        urgent: "Urgente",
        high: "Haute",
        normal: "Normale",
        low: "Basse"
      }
    },
    footer: {
      requiredHint: "Le nom de l'entreprise et le nom du contact principal sont obligatoires.",
      requiredHintEdit: "Le nom de l'entreprise est obligatoire.",
      contactAttachHint: "Ce contact sera automatiquement rattaché à la fiche créée.",
      proSlaHint: "Disponible avec Veritas Pro.",
      unsavedChanges: "Modifications non enregistrées",
      noChanges: "Aucune modification"
    },
    toasts: {
      invalidEmail: "Adresse email invalide",
      passwordTooShort: "Mot de passe trop court (6 caractères minimum)",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      agentProfilesLoadError: "Impossible de charger les profils agents.",
      agentCreated: "Agent créé et sélectionné comme référent commercial.",
      agentCreateFailed: "Échec de la création de l'agent."
    },
    clientModal: {
      nameRequired: "Veuillez renseigner le nom de l'entreprise.",
      contactNameRequired: "Veuillez renseigner le nom du contact principal.",
      contactEmailInvalid: "L'adresse e-mail du contact principal n'est pas valide.",
      clientNameRequired: "Veuillez renseigner le nom du client.",
      contractTypeRequired: "Veuillez sélectionner un type de contrat.",
      contractDatesRequired: "Veuillez renseigner les dates de début et d'expiration du contrat.",
      moduleRequired: "Veuillez activer au moins un module.",
      contactSaveFailed: "L'entreprise a été créée, mais le contact principal n'a pas pu être enregistré.",
      saveSuccess: "Entreprise enregistrée avec succès",
      saveFailed: "Erreur lors de l'enregistrement du client.",
      stepGeneral: "Informations générales",
      stepContract: "Contrat & options",
      next: "Suivant",
      saveEdit: "Enregistrer"
    }
  },
  en: {
    eyebrow: "Company record",
    closeAria: "Close",
    navAria: "Form sections",
    titleCreate: "New company",
    titleEdit: "Edit {name}",
    titleEditFallback: "the company",
    subtitleCreate: "Create a complete client record in a few steps.",
    subtitleEdit: "Update contract information and client identity.",
    cancel: "Cancel",
    save: "Save",
    create: "Create company",
    saving: "Saving…",
    delete: "Delete",
    deleting: "Deleting…",
    checking: "Checking…",
    checkingLinked: "Checking linked items…",
    legalIdentifier: "Legal identifier",
    fields: {
      clientNumber: "Client number",
      clientNumberPlaceholder: "31",
      name: "Company name",
      namePlaceholder: "Dupont Ltd",
      icon: "Icon",
      iconHint: "Shown before the name in the companies list (does not affect search).",
      iconSearchPlaceholder: "Search for an icon…",
      iconSearchAria: "Search for an icon",
      iconClearSearch: "Clear icon search",
      iconChangeLabel: "Change icon",
      iconPickerAria: "Choose a company icon",
      iconClear: "Remove icon",
      iconColor: "Color",
      iconColorAria: "Icon color",
      iconColorCustom: "Custom color",
      legalIdentifierPlaceholder: "Registration number",
      sector: "Industry sector",
      address: "Address",
      addressPlaceholder: "10 Castle Street",
      postalCode: "Postal code",
      postalPlaceholder: "EC3N 4AB",
      city: "City",
      cityPlaceholder: "London",
      sitesLabel: "Sites & locations",
      manageSites: "Manage locations ({count})",
      noSites: "No location saved.",
      sitePrimary: "Primary",
      primaryContact: "Primary contact",
      contactSearchPlaceholder: "Search a contact (name, email, phone…)",
      contactHint: "Search for an existing contact or create a new one. They will be linked to the company on save.",
      editContact: "Edit details",
      createContact: "Create contact",
      loadingContacts: "Loading contacts…",
      noContactFound: "No contact found",
      contractStart: "Start date",
      contractEnd: "Expiration date",
      commercial: "Account manager",
      commercialSearchPlaceholder: "Search an agent…",
      noAgentSelected: "No agent selected",
      noAgentFound: "No agent found",
      loadingAgents: "Loading agents…",
      createAgent: "Create agent"
    },
    sections: {
      identity: {
        label: "Identity",
        description: "Name, identifiers, appearance and status"
      },
      location: {
        label: "Locations",
        description: "Company sites and premises"
      },
      contact: {
        label: "Contact",
        description: "Main company contact"
      },
      contract: {
        label: "Contract",
        description: "Period, account manager, MSP services and SLA"
      }
    },
    statutActive: "Active",
    statutInactive: "Inactive",
    statusBlock: {
      subsectionTitle: "Status",
      subsectionDesc: "Company availability in the portfolio"
    },
    modules: {
      subsectionTitle: "Included services",
      subsectionDesc: "MSP contract options and scope",
      summaryOne: "{count} service selected of {total} available",
      summaryMany: "{count} services selected of {total} available",
      proNewService: "New service",
      proCustomServices: "Custom services",
      proAria: "Custom service creation · available with Veritas Pro"
    },
    sla: {
      subsectionTitle: "SLA",
      subsectionDesc: "Response and resolution commitments",
      enable: "Enable SLAs for this company",
      priority: "Priority",
      firstResponse: "First response (h)",
      resolution: "Resolution (h)",
      previewHint: "Preview of default commitments.",
      editHint: "Deadlines start when the ticket is created (per SLA mode in administration). The first public reply closes the acknowledgment commitment.",
      priorities: {
        urgent: "Urgent",
        high: "High",
        normal: "Normal",
        low: "Low"
      }
    },
    footer: {
      requiredHint: "Company name and primary contact last name are required.",
      requiredHintEdit: "Company name is required.",
      contactAttachHint: "This contact will be automatically linked to the new record.",
      proSlaHint: "Available with Veritas Pro.",
      unsavedChanges: "Unsaved changes",
      noChanges: "No changes"
    },
    toasts: {
      invalidEmail: "Invalid email address",
      passwordTooShort: "Password too short (minimum 6 characters)",
      passwordMismatch: "Passwords do not match",
      agentProfilesLoadError: "Unable to load agent profiles.",
      agentCreated: "Agent created and selected as account manager.",
      agentCreateFailed: "Failed to create agent."
    },
    clientModal: {
      nameRequired: "Please enter the company name.",
      contactNameRequired: "Please enter the primary contact last name.",
      contactEmailInvalid: "The primary contact email address is not valid.",
      clientNameRequired: "Please enter the client name.",
      contractTypeRequired: "Please select a contract type.",
      contractDatesRequired: "Please enter contract start and expiration dates.",
      moduleRequired: "Please enable at least one module.",
      contactSaveFailed: "The company was created, but the primary contact could not be saved.",
      saveSuccess: "Company saved successfully",
      saveFailed: "Error saving client.",
      stepGeneral: "General information",
      stepContract: "Contract & options",
      next: "Next",
      saveEdit: "Save"
    }
  },
  de: {
    eyebrow: "Unternehmensakte",
    closeAria: "Schließen",
    navAria: "Formularabschnitte",
    titleCreate: "Neues Unternehmen",
    titleEdit: "{name} bearbeiten",
    titleEditFallback: "das Unternehmen",
    subtitleCreate: "Erstellen Sie eine vollständige Kundenakte in wenigen Schritten.",
    subtitleEdit: "Vertragsinformationen und Kundenidentität aktualisieren.",
    cancel: "Abbrechen",
    save: "Speichern",
    create: "Unternehmen anlegen",
    saving: "Speichern…",
    delete: "Löschen",
    deleting: "Löschen…",
    checking: "Prüfen…",
    checkingLinked: "Verknüpfte Elemente werden geprüft…",
    legalIdentifier: "Rechtliche Kennung",
    fields: {
      clientNumber: "Kundennummer",
      clientNumberPlaceholder: "31",
      name: "Unternehmensname",
      namePlaceholder: "Dupont GmbH",
      icon: "Symbol",
      iconHint: "Wird vor dem Namen in der Unternehmensliste angezeigt (beeinflusst die Suche nicht).",
      iconSearchPlaceholder: "Symbol suchen…",
      iconSearchAria: "Symbol suchen",
      iconClearSearch: "Symbolsuche löschen",
      iconChangeLabel: "Symbol ändern",
      iconPickerAria: "Unternehmenssymbol wählen",
      iconClear: "Symbol entfernen",
      iconColor: "Farbe",
      iconColorAria: "Symbolfarbe",
      iconColorCustom: "Benutzerdefinierte Farbe",
      legalIdentifierPlaceholder: "Handelsregisternummer",
      sector: "Branche",
      address: "Adresse",
      addressPlaceholder: "Schlossstraße 10",
      postalCode: "Postleitzahl",
      postalPlaceholder: "10115",
      city: "Stadt",
      cityPlaceholder: "Berlin",
      sitesLabel: "Standorte",
      manageSites: "Standorte verwalten ({count})",
      noSites: "Kein Standort gespeichert.",
      sitePrimary: "Hauptstandort",
      primaryContact: "Hauptkontakt",
      contactSearchPlaceholder: "Kontakt suchen (Name, E-Mail, Telefon…)",
      contactHint: "Bestehenden Kontakt suchen oder neuen anlegen. Er wird beim Speichern mit dem Unternehmen verknüpft.",
      editContact: "Angaben bearbeiten",
      createContact: "Kontakt anlegen",
      loadingContacts: "Kontakte werden geladen…",
      noContactFound: "Kein Kontakt gefunden",
      contractStart: "Startdatum",
      contractEnd: "Ablaufdatum",
      commercial: "Vertriebsreferent",
      commercialSearchPlaceholder: "Agent suchen…",
      noAgentSelected: "Kein Agent ausgewählt",
      noAgentFound: "Kein Agent gefunden",
      loadingAgents: "Agenten werden geladen…",
      createAgent: "Agent anlegen"
    },
    sections: {
      identity: {
        label: "Identität",
        description: "Name, Kennungen, Erscheinungsbild und Status"
      },
      location: {
        label: "Standorte",
        description: "Standorte und Niederlassungen des Unternehmens"
      },
      contact: {
        label: "Kontakt",
        description: "Hauptansprechpartner des Unternehmens"
      },
      contract: {
        label: "Vertrag",
        description: "Zeitraum, Vertriebsreferent, MSP-Services und SLA"
      }
    },
    statutActive: "Aktiv",
    statutInactive: "Inaktiv",
    statusBlock: {
      subsectionTitle: "Status",
      subsectionDesc: "Verfügbarkeit des Unternehmens im Portfolio"
    },
    modules: {
      subsectionTitle: "Enthaltene Services",
      subsectionDesc: "MSP-Vertragsoptionen und Umfang",
      summaryOne: "{count} Service ausgewählt von {total} verfügbar",
      summaryMany: "{count} Services ausgewählt von {total} verfügbar",
      proNewService: "Neuer Service",
      proCustomServices: "Individuelle Services",
      proAria: "Individuelle Services · verfügbar mit Veritas Pro"
    },
    sla: {
      subsectionTitle: "SLA",
      subsectionDesc: "Reaktions- und Lösungsverpflichtungen",
      enable: "SLAs für dieses Unternehmen aktivieren",
      priority: "Priorität",
      firstResponse: "Erste Antwort (h)",
      resolution: "Lösung (h)",
      previewHint: "Vorschau der Standardverpflichtungen.",
      editHint: "Fristen beginnen mit der Ticketerstellung (gemäß SLA-Modus in der Administration). Die erste öffentliche Antwort schließt die Annahmeverpflichtung ab.",
      priorities: {
        urgent: "Dringend",
        high: "Hoch",
        normal: "Normal",
        low: "Niedrig"
      }
    },
    footer: {
      requiredHint: "Unternehmensname und Nachname des Hauptkontakts sind Pflichtfelder.",
      requiredHintEdit: "Unternehmensname ist ein Pflichtfeld.",
      contactAttachHint: "Dieser Kontakt wird automatisch mit der neuen Akte verknüpft.",
      proSlaHint: "Verfügbar mit Veritas Pro.",
      unsavedChanges: "Nicht gespeicherte Änderungen",
      noChanges: "Keine Änderungen"
    },
    toasts: {
      invalidEmail: "Ungültige E-Mail-Adresse",
      passwordTooShort: "Passwort zu kurz (mindestens 6 Zeichen)",
      passwordMismatch: "Passwörter stimmen nicht überein",
      agentProfilesLoadError: "Agentenprofile konnten nicht geladen werden.",
      agentCreated: "Agent erstellt und als Vertriebsreferent ausgewählt.",
      agentCreateFailed: "Agent konnte nicht erstellt werden."
    },
    clientModal: {
      nameRequired: "Bitte geben Sie den Unternehmensnamen ein.",
      contactNameRequired: "Bitte geben Sie den Nachnamen des Hauptkontakts ein.",
      contactEmailInvalid: "Die E-Mail-Adresse des Hauptkontakts ist ungültig.",
      clientNameRequired: "Bitte geben Sie den Kundennamen ein.",
      contractTypeRequired: "Bitte wählen Sie einen Vertragstyp.",
      contractDatesRequired: "Bitte geben Sie Start- und Ablaufdatum des Vertrags ein.",
      moduleRequired: "Bitte aktivieren Sie mindestens ein Modul.",
      contactSaveFailed: "Das Unternehmen wurde erstellt, der Hauptkontakt konnte jedoch nicht gespeichert werden.",
      saveSuccess: "Unternehmen erfolgreich gespeichert",
      saveFailed: "Fehler beim Speichern des Kunden.",
      stepGeneral: "Allgemeine Informationen",
      stepContract: "Vertrag & Optionen",
      next: "Weiter",
      saveEdit: "Speichern"
    }
  },
  it: {
    eyebrow: "Scheda azienda",
    closeAria: "Chiudi",
    navAria: "Sezioni del modulo",
    titleCreate: "Nuova azienda",
    titleEdit: "Modifica {name}",
    titleEditFallback: "l'azienda",
    subtitleCreate: "Crea una scheda cliente completa in pochi passaggi.",
    subtitleEdit: "Aggiorna informazioni contrattuali e identità del cliente.",
    cancel: "Annulla",
    save: "Salva",
    create: "Crea azienda",
    saving: "Salvataggio…",
    delete: "Elimina",
    deleting: "Eliminazione…",
    checking: "Verifica…",
    checkingLinked: "Verifica elementi collegati…",
    legalIdentifier: "Identificativo legale",
    fields: {
      clientNumber: "N° cliente",
      clientNumberPlaceholder: "31",
      name: "Nome azienda",
      namePlaceholder: "Dupont Srl",
      icon: "Icona",
      iconHint: "Mostrata davanti al nome nell'elenco aziende (non influisce sulla ricerca).",
      iconSearchPlaceholder: "Cerca un'icona…",
      iconSearchAria: "Cerca un'icona",
      iconClearSearch: "Cancella ricerca icona",
      iconChangeLabel: "Cambia icona",
      iconPickerAria: "Scegli un'icona azienda",
      iconClear: "Rimuovi icona",
      iconColor: "Colore",
      iconColorAria: "Colore icona",
      iconColorCustom: "Colore personalizzato",
      legalIdentifierPlaceholder: "Numero di registrazione",
      sector: "Settore di attività",
      address: "Indirizzo",
      addressPlaceholder: "Via del Castello 10",
      postalCode: "CAP",
      postalPlaceholder: "20121",
      city: "Città",
      cityPlaceholder: "Milano",
      sitesLabel: "Sedi e siti",
      manageSites: "Gestisci sedi ({count})",
      noSites: "Nessuna sede registrata.",
      sitePrimary: "Principale",
      primaryContact: "Contatto principale",
      contactSearchPlaceholder: "Cerca un contatto (nome, e-mail, telefono…)",
      contactHint: "Cerca un contatto esistente o creane uno nuovo. Sarà collegato all'azienda alla convalida.",
      editContact: "Modifica informazioni",
      createContact: "Crea contatto",
      loadingContacts: "Caricamento contatti…",
      noContactFound: "Nessun contatto trovato",
      contractStart: "Data inizio",
      contractEnd: "Data scadenza",
      commercial: "Referente commerciale",
      commercialSearchPlaceholder: "Cerca un agente…",
      noAgentSelected: "Nessun agente selezionato",
      noAgentFound: "Nessun agente trovato",
      loadingAgents: "Caricamento agenti…",
      createAgent: "Crea agente"
    },
    sections: {
      identity: {
        label: "Identità",
        description: "Nome, identificativi, aspetto e stato"
      },
      location: {
        label: "Sedi",
        description: "Siti e sedi dell'azienda"
      },
      contact: {
        label: "Contatto",
        description: "Referente principale dell'azienda"
      },
      contract: {
        label: "Contratto",
        description: "Periodo, referente commerciale, servizi MSP e SLA"
      }
    },
    statutActive: "Attiva",
    statutInactive: "Inattiva",
    statusBlock: {
      subsectionTitle: "Stato",
      subsectionDesc: "Disponibilità dell'azienda nel portafoglio"
    },
    modules: {
      subsectionTitle: "Servizi inclusi",
      subsectionDesc: "Opzioni e perimetro contratto MSP",
      summaryOne: "{count} servizio selezionato su {total} disponibili",
      summaryMany: "{count} servizi selezionati su {total} disponibili",
      proNewService: "Nuovo servizio",
      proCustomServices: "Servizi personalizzati",
      proAria: "Creazione servizi personalizzati · disponibile con Veritas Pro"
    },
    sla: {
      subsectionTitle: "SLA",
      subsectionDesc: "Impegni di risposta e risoluzione",
      enable: "Attiva gli SLA per questa azienda",
      priority: "Priorità",
      firstResponse: "Prima risposta (h)",
      resolution: "Risoluzione (h)",
      previewHint: "Anteprima degli impegni predefiniti.",
      editHint: "I termini partono dalla creazione del ticket (secondo la modalità SLA in amministrazione). La prima risposta pubblica chiude l'impegno di presa in carico.",
      priorities: {
        urgent: "Urgente",
        high: "Alta",
        normal: "Normale",
        low: "Bassa"
      }
    },
    footer: {
      requiredHint: "Nome azienda e cognome del contatto principale sono obbligatori.",
      requiredHintEdit: "Il nome dell'azienda è obbligatorio.",
      contactAttachHint: "Questo contatto sarà collegato automaticamente alla scheda creata.",
      proSlaHint: "Disponibile con Veritas Pro.",
      unsavedChanges: "Modifiche non salvate",
      noChanges: "Nessuna modifica"
    },
    toasts: {
      invalidEmail: "Indirizzo e-mail non valido",
      passwordTooShort: "Password troppo corta (minimo 6 caratteri)",
      passwordMismatch: "Le password non corrispondono",
      agentProfilesLoadError: "Impossibile caricare i profili agente.",
      agentCreated: "Agente creato e selezionato come referente commerciale.",
      agentCreateFailed: "Creazione agente non riuscita."
    },
    clientModal: {
      nameRequired: "Inserire il nome dell'azienda.",
      contactNameRequired: "Inserire il cognome del contatto principale.",
      contactEmailInvalid: "L'e-mail del contatto principale non è valida.",
      clientNameRequired: "Inserire il nome del cliente.",
      contractTypeRequired: "Selezionare un tipo di contratto.",
      contractDatesRequired: "Inserire date di inizio e scadenza del contratto.",
      moduleRequired: "Attivare almeno un modulo.",
      contactSaveFailed: "L'azienda è stata creata, ma il contatto principale non è stato salvato.",
      saveSuccess: "Azienda salvata con successo",
      saveFailed: "Errore durante il salvataggio del cliente.",
      stepGeneral: "Informazioni generali",
      stepContract: "Contratto e opzioni",
      next: "Avanti",
      saveEdit: "Salva"
    }
  },
  es: {
    eyebrow: "Ficha empresa",
    closeAria: "Cerrar",
    navAria: "Secciones del formulario",
    titleCreate: "Nueva empresa",
    titleEdit: "Modificar {name}",
    titleEditFallback: "la empresa",
    subtitleCreate: "Cree una ficha de cliente completa en pocos pasos.",
    subtitleEdit: "Actualice la información contractual e identidad del cliente.",
    cancel: "Cancelar",
    save: "Guardar",
    create: "Crear empresa",
    saving: "Guardando…",
    delete: "Eliminar",
    deleting: "Eliminando…",
    checking: "Comprobando…",
    checkingLinked: "Comprobando elementos vinculados…",
    legalIdentifier: "Identificador legal",
    fields: {
      clientNumber: "N° cliente",
      clientNumberPlaceholder: "31",
      name: "Nombre de la empresa",
      namePlaceholder: "Dupont S.L.",
      icon: "Icono",
      iconHint: "Se muestra delante del nombre en la lista de empresas (no afecta a la búsqueda).",
      iconSearchPlaceholder: "Buscar un icono…",
      iconSearchAria: "Buscar un icono",
      iconClearSearch: "Borrar búsqueda de icono",
      iconChangeLabel: "Cambiar icono",
      iconPickerAria: "Elegir un icono de empresa",
      iconClear: "Quitar icono",
      iconColor: "Color",
      iconColorAria: "Color del icono",
      iconColorCustom: "Color personalizado",
      legalIdentifierPlaceholder: "Número de registro",
      sector: "Sector de actividad",
      address: "Dirección",
      addressPlaceholder: "Calle Mayor 10",
      postalCode: "Código postal",
      postalPlaceholder: "28013",
      city: "Ciudad",
      cityPlaceholder: "Madrid",
      sitesLabel: "Sedes e implantaciones",
      manageSites: "Gestionar sedes ({count})",
      noSites: "Ninguna sede registrada.",
      sitePrimary: "Principal",
      primaryContact: "Contacto principal",
      contactSearchPlaceholder: "Buscar contacto (nombre, e-mail, teléfono…)",
      contactHint: "Busque un contacto existente o cree uno nuevo. Se vinculará a la empresa al guardar.",
      editContact: "Modificar información",
      createContact: "Crear contacto",
      loadingContacts: "Cargando contactos…",
      noContactFound: "Ningún contacto encontrado",
      contractStart: "Fecha de inicio",
      contractEnd: "Fecha de vencimiento",
      commercial: "Referente comercial",
      commercialSearchPlaceholder: "Buscar un agente…",
      noAgentSelected: "Ningún agente seleccionado",
      noAgentFound: "Ningún agente encontrado",
      loadingAgents: "Cargando agentes…",
      createAgent: "Crear agente"
    },
    sections: {
      identity: {
        label: "Identidad",
        description: "Nombre, identificadores, apariencia y estado"
      },
      location: {
        label: "Ubicaciones",
        description: "Sedes e implantaciones de la empresa"
      },
      contact: {
        label: "Contacto",
        description: "Interlocutor principal de la empresa"
      },
      contract: {
        label: "Contrato",
        description: "Periodo, referente comercial, servicios MSP y SLA"
      }
    },
    statutActive: "Activa",
    statutInactive: "Inactiva",
    statusBlock: {
      subsectionTitle: "Estado",
      subsectionDesc: "Disponibilidad de la empresa en la cartera"
    },
    modules: {
      subsectionTitle: "Servicios incluidos",
      subsectionDesc: "Opciones y alcance del contrato MSP",
      summaryOne: "{count} servicio seleccionado de {total} disponibles",
      summaryMany: "{count} servicios seleccionados de {total} disponibles",
      proNewService: "Nuevo servicio",
      proCustomServices: "Servicios personalizados",
      proAria: "Creación de servicios personalizados · disponible con Veritas Pro"
    },
    sla: {
      subsectionTitle: "SLA",
      subsectionDesc: "Compromisos de respuesta y resolución",
      enable: "Activar los SLA para esta empresa",
      priority: "Prioridad",
      firstResponse: "Primera respuesta (h)",
      resolution: "Resolución (h)",
      previewHint: "Vista previa de los compromisos predeterminados.",
      editHint: "Los plazos comienzan al crear el ticket (según el modo SLA en administración). La primera respuesta pública cierra el compromiso de toma en charge.",
      priorities: {
        urgent: "Urgente",
        high: "Alta",
        normal: "Normal",
        low: "Baja"
      }
    },
    footer: {
      requiredHint: "El nombre de la empresa y el apellido del contacto principal son obligatorios.",
      requiredHintEdit: "El nombre de la empresa es obligatorio.",
      contactAttachHint: "Este contacto se vinculará automáticamente a la ficha creada.",
      proSlaHint: "Disponible con Veritas Pro.",
      unsavedChanges: "Cambios sin guardar",
      noChanges: "Sin cambios"
    },
    toasts: {
      invalidEmail: "Dirección de e-mail no válida",
      passwordTooShort: "Contraseña demasiado corta (mínimo 6 caracteres)",
      passwordMismatch: "Las contraseñas no coinciden",
      agentProfilesLoadError: "No se pudieron cargar los perfiles de agente.",
      agentCreated: "Agente creado y seleccionado como referente comercial.",
      agentCreateFailed: "Error al crear el agente."
    },
    clientModal: {
      nameRequired: "Indique el nombre de la empresa.",
      contactNameRequired: "Indique el apellido del contacto principal.",
      contactEmailInvalid: "La dirección e-mail del contacto principal no es válida.",
      clientNameRequired: "Indique el nombre del cliente.",
      contractTypeRequired: "Seleccione un tipo de contrato.",
      contractDatesRequired: "Indique las fechas de inicio y vencimiento del contrato.",
      moduleRequired: "Active al menos un módulo.",
      contactSaveFailed: "La empresa se creó, pero no se pudo guardar el contacto principal.",
      saveSuccess: "Empresa guardada correctamente",
      saveFailed: "Error al guardar el cliente.",
      stepGeneral: "Información general",
      stepContract: "Contrato y opciones",
      next: "Siguiente",
      saveEdit: "Guardar"
    }
  }
};
const SLA_PRIORITY_KEYS = ["urgent", "high", "normal", "low"];
export function getEnterpriseFormModalCopy(locale) {
  const t = pickLocaleMessages(COPY, locale);
  return {
    ...t,
    sections: SECTION_IDS.map(id => ({
      id,
      icon: SECTION_ICONS[id],
      label: t.sections[id].label,
      description: t.sections[id].description
    })),
    formatTitle: (isCreate, name) => isCreate ? t.titleCreate : interpolate(t.titleEdit, {
      name: name?.trim() || t.titleEditFallback
    }),
    formatManageSites: count => interpolate(t.fields.manageSites, {
      count: String(count)
    }),
    formatModulesSummary: (count, total) => {
      const template = count > 1 ? t.modules.summaryMany : t.modules.summaryOne;
      return interpolate(template, {
        count: String(count),
        total: String(total)
      });
    },
    getSlaPriorityLabel: key => t.sla.priorities[key] || key,
    slaPriorityEntries: SLA_PRIORITY_KEYS.map(key => [key, t.sla.priorities[key]])
  };
}
