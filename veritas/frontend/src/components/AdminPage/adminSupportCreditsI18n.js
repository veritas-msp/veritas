import { createLocaleGetter, interpolate } from "../../i18n/translate";
const SECTION_ICONS = {
  client: "mdi:office-building-outline",
  pack: "mdi:ticket-confirmation-outline",
  details: "mdi:calendar-range-outline"
};
const SUPPORT_CREDITS_COPY = {
  fr: {
    bcp47: "fr-FR",
    statusLabels: {
      active: "Actif",
      upcoming: "À venir",
      expired: "Expiré",
      depleted: "Épuisé"
    },
    statusFilters: {
      all: "Tous les statuts",
      active: "Actifs",
      upcoming: "À venir",
      expired: "Expirés",
      depleted: "Épuisés"
    },
    summary: {
      enterprises: "Entreprises",
      packs: "Carnets",
      availableCredits: "Crédits disponibles"
    },
    page: {
      title: "Carnets tickets",
      description: "Vue globale des carnets prépayés par entreprise, avec dates de validité et solde restant.",
      newPack: "Nouveau carnet"
    },
    searchPlaceholder: "Rechercher une entreprise, un libellé, une note…",
    packMeta: "{count} carnet · {credits} crédit disponible",
    packMetaPlural: "{count} carnets · {credits} crédits disponibles",
    columns: {
      enterprise: "Entreprise",
      pack: "Carnet",
      remaining: "Restants",
      initial: "Initial",
      validFrom: "Valide du",
      validUntil: "Expire le",
      status: "Statut",
      createdAt: "Créé le"
    },
    editTitle: "Modifier",
    deleteTitle: "Supprimer",
    emptyLoading: "Chargement…",
    empty: "Aucun carnet trouvé.",
    range: "{start}–{end} sur {total}",
    sections: {
      client: {
        label: "Entreprise",
        description: "Client MSP bénéficiaire du carnet"
      },
      pack: {
        label: "Carnet",
        description: "Volume de tickets et libellé commercial"
      },
      details: {
        label: "Validité",
        description: "Période d'utilisation et référence interne"
      }
    },
    modal: {
      eyebrow: "Carnets tickets",
      createTitle: "Nouveau carnet prépayé",
      editTitle: "Modifier le carnet",
      createSubtitle: "Créditez une entreprise avec un carnet de tickets support prépayés.",
      editSubtitle: "Ajustez le solde, la validité et les références internes du carnet.",
      sectionsAria: "Sections du carnet",
      closeAria: "Fermer",
      footerCreateHint: "Les champs marqués * sont obligatoires",
      footerEditHint: "Modifications du carnet prépayé",
      cancel: "Annuler",
      saving: "Enregistrement…",
      createBtn: "Créer le carnet",
      saveBtn: "Enregistrer",
      editLockedHint: "L'entreprise rattachée au carnet ne peut pas être modifiée après création.",
      createLockedHint: "Le carnet sera crédité pour l'entreprise affichée ci-dessous.",
      searchHint: "Recherchez l'entreprise qui recevra les crédits support.",
      enterpriseLabel: "Entreprise",
      searchPlaceholder: "Rechercher par numéro ou nom…",
      enterprisesAria: "Entreprises",
      noEnterpriseFound: "Aucune entreprise trouvée",
      beneficiaryHint: "Entreprise bénéficiaire du carnet",
      selectedHint: "Entreprise sélectionnée",
      initialTickets: "Tickets initiaux",
      remainingTickets: "Tickets restants",
      ticketCount: "Nombre de tickets",
      ticketCountPlaceholder: "Ex. 10",
      ticketsIncrease: "Augmenter le nombre de tickets",
      ticketsDecrease: "Diminuer le nombre de tickets",
      label: "Libellé",
      labelPlaceholder: "Ex. Carnet annuel 2026",
      createInfo: "Le carnet sera crédité immédiatement. Les tickets seront décomptés à la résolution des tickets support, pas à la création.",
      validFrom: "Valide du",
      validUntil: "Valide jusqu'au",
      internalNote: "Note interne",
      notePlaceholder: "Référence commande, facture, commentaire commercial…"
    },
    toast: {
      loadError: "Erreur lors du chargement des carnets",
      deleted: "Carnet supprimé",
      deleteError: "Erreur lors de la suppression",
      selectEnterprise: "Sélectionnez une entreprise",
      initialInvalid: "Le nombre initial doit être un entier positif",
      remainingInvalid: "Le solde restant doit être un entier positif ou nul",
      amountInvalid: "Indiquez un nombre entier positif de tickets",
      updated: "Carnet mis à jour",
      created: "Carnet de {amount} ticket(s) créé",
      saveError: "Erreur lors de l'enregistrement"
    }
  },
  en: {
    bcp47: "en-GB",
    statusLabels: {
      active: "Active",
      upcoming: "Upcoming",
      expired: "Expired",
      depleted: "Depleted"
    },
    statusFilters: {
      all: "All statuses",
      active: "Active",
      upcoming: "Upcoming",
      expired: "Expired",
      depleted: "Depleted"
    },
    summary: {
      enterprises: "Companies",
      packs: "Notebooks",
      availableCredits: "Available credits"
    },
    page: {
      title: "Ticket packs",
      description: "Global view of prepaid ticket packs per company, with validity dates and remaining balance.",
      newPack: "New pack"
    },
    searchPlaceholder: "Search a company, label or note…",
    packMeta: "{count} pack · {credits} credit available",
    packMetaPlural: "{count} packs · {credits} credits available",
    columns: {
      enterprise: "Company",
      pack: "Pack",
      remaining: "Remaining",
      initial: "Initial",
      validFrom: "Valid from",
      validUntil: "Expires on",
      status: "Status",
      createdAt: "Created"
    },
    editTitle: "Edit",
    deleteTitle: "Delete",
    emptyLoading: "Loading…",
    empty: "No packs found.",
    range: "{start}–{end} of {total}",
    sections: {
      client: {
        label: "Company",
        description: "MSP client receiving the pack"
      },
      pack: {
        label: "Pack",
        description: "Ticket volume and commercial label"
      },
      details: {
        label: "Validity",
        description: "Usage period and internal reference"
      }
    },
    modal: {
      eyebrow: "Ticket packs",
      createTitle: "New prepaid pack",
      editTitle: "Edit pack",
      createSubtitle: "Credit a company with a prepaid support ticket pack.",
      editSubtitle: "Adjust balance, validity and internal references for the pack.",
      sectionsAria: "Pack sections",
      closeAria: "Close",
      footerCreateHint: "Fields marked * are required",
      footerEditHint: "Prepaid pack changes",
      cancel: "Cancel",
      saving: "Saving…",
      createBtn: "Create pack",
      saveBtn: "Save",
      editLockedHint: "The company linked to the pack cannot be changed after creation.",
      createLockedHint: "The pack will be credited to the company shown below.",
      searchHint: "Search for the company that will receive support credits.",
      enterpriseLabel: "Company",
      searchPlaceholder: "Search by number or name…",
      enterprisesAria: "Companies",
      noEnterpriseFound: "No company found",
      beneficiaryHint: "Pack beneficiary company",
      selectedHint: "Selected company",
      initialTickets: "Initial tickets",
      remainingTickets: "Remaining tickets",
      ticketCount: "Number of tickets",
      ticketCountPlaceholder: "e.g. 10",
      ticketsIncrease: "Increase number of tickets",
      ticketsDecrease: "Decrease number of tickets",
      label: "Label",
      labelPlaceholder: "e.g. Annual pack 2026",
      createInfo: "The pack will be credited immediately. Tickets are deducted when support tickets are resolved, not when created.",
      validFrom: "Valid from",
      validUntil: "Valid until",
      internalNote: "Internal note",
      notePlaceholder: "Order reference, invoice, sales comment…"
    },
    toast: {
      loadError: "Error loading packs",
      deleted: "Pack deleted",
      deleteError: "Error while deleting",
      selectEnterprise: "Select a company",
      initialInvalid: "Initial amount must be a positive integer",
      remainingInvalid: "Remaining balance must be a non-negative integer",
      amountInvalid: "Enter a positive integer number of tickets",
      updated: "Pack updated",
      created: "Pack of {amount} ticket(s) created",
      saveError: "Error while saving"
    }
  },
  de: {
    bcp47: "de-DE",
    statusLabels: {
      active: "Aktiv",
      upcoming: "Bevorstehend",
      expired: "Abgelaufen",
      depleted: "Aufgebraucht"
    },
    statusFilters: {
      all: "Alle Status",
      active: "Aktiv",
      upcoming: "Bevorstehend",
      expired: "Abgelaufen",
      depleted: "Aufgebraucht"
    },
    summary: {
      enterprises: "Unternehmen",
      packs: "Hefte",
      availableCredits: "Verfügbare Credits"
    },
    page: {
      title: "Ticket-Hefte",
      description: "Globale Übersicht der Prepaid-Ticket-Hefte pro Unternehmen mit Gültigkeit und Restsaldo.",
      newPack: "Neues Heft"
    },
    searchPlaceholder: "Unternehmen, Bezeichnung oder Notiz suchen…",
    packMeta: "{count} Heft · {credits} Credit verfügbar",
    packMetaPlural: "{count} Hefte · {credits} Credits verfügbar",
    columns: {
      enterprise: "Unternehmen",
      pack: "Heft",
      remaining: "Rest",
      initial: "Initial",
      validFrom: "Gültig ab",
      validUntil: "Läuft ab am",
      status: "Status",
      createdAt: "Erstellt"
    },
    editTitle: "Bearbeiten",
    deleteTitle: "Löschen",
    emptyLoading: "Laden…",
    empty: "Keine Hefte gefunden.",
    range: "{start}–{end} von {total}",
    sections: {
      client: {
        label: "Unternehmen",
        description: "MSP-Kunde für das Heft"
      },
      pack: {
        label: "Heft",
        description: "Ticketmenge und Bezeichnung"
      },
      details: {
        label: "Gültigkeit",
        description: "Nutzungszeitraum und interne Referenz"
      }
    },
    modal: {
      eyebrow: "Ticket-Hefte",
      createTitle: "Neues Prepaid-Heft",
      editTitle: "Heft bearbeiten",
      createSubtitle: "Unternehmen mit einem Prepaid-Support-Ticket-Heft gutschreiben.",
      editSubtitle: "Saldo, Gültigkeit und interne Referenzen anpassen.",
      sectionsAria: "Heft-Abschnitte",
      closeAria: "Schließen",
      footerCreateHint: "Mit * markierte Felder sind Pflicht",
      footerEditHint: "Änderungen am Prepaid-Heft",
      cancel: "Abbrechen",
      saving: "Speichern…",
      createBtn: "Heft erstellen",
      saveBtn: "Speichern",
      editLockedHint: "Das verknüpfte Unternehmen kann nach Erstellung nicht geändert werden.",
      createLockedHint: "Das Heft wird dem unten angezeigten Unternehmen gutgeschrieben.",
      searchHint: "Unternehmen suchen, das Support-Credits erhält.",
      enterpriseLabel: "Unternehmen",
      searchPlaceholder: "Nach Nummer oder Name suchen…",
      enterprisesAria: "Unternehmen",
      noEnterpriseFound: "Kein Unternehmen gefunden",
      beneficiaryHint: "Begünstigtes Unternehmen",
      selectedHint: "Ausgewähltes Unternehmen",
      initialTickets: "Anfängliche Tickets",
      remainingTickets: "Verbleibende Tickets",
      ticketCount: "Anzahl Tickets",
      ticketCountPlaceholder: "z. B. 10",
      ticketsIncrease: "Anzahl Tickets erhöhen",
      ticketsDecrease: "Anzahl Tickets verringern",
      label: "Bezeichnung",
      labelPlaceholder: "z. B. Jahresheft 2026",
      createInfo: "Das Heft wird sofort gutgeschrieben. Tickets werden bei Ticket-Lösung abgezogen, nicht bei Erstellung.",
      validFrom: "Gültig ab",
      validUntil: "Gültig bis",
      internalNote: "Interne Notiz",
      notePlaceholder: "Auftragsreferenz, Rechnung, Vertriebskommentar…"
    },
    toast: {
      loadError: "Fehler beim Laden der Hefte",
      deleted: "Heft gelöscht",
      deleteError: "Fehler beim Löschen",
      selectEnterprise: "Unternehmen auswählen",
      initialInvalid: "Anfangswert muss eine positive Ganzzahl sein",
      remainingInvalid: "Restsaldo muss eine nicht negative Ganzzahl sein",
      amountInvalid: "Positive Ganzzahl an Tickets angeben",
      updated: "Heft aktualisiert",
      created: "Heft mit {amount} Ticket(s) erstellt",
      saveError: "Fehler beim Speichern"
    }
  },
  it: {
    bcp47: "it-IT",
    statusLabels: {
      active: "Attivo",
      upcoming: "In arrivo",
      expired: "Scaduto",
      depleted: "Esaurito"
    },
    statusFilters: {
      all: "Tutti gli stati",
      active: "Attivi",
      upcoming: "In arrivo",
      expired: "Scaduti",
      depleted: "Esauriti"
    },
    summary: {
      enterprises: "Aziende",
      packs: "Carnet",
      availableCredits: "Crediti disponibili"
    },
    page: {
      title: "Carnet ticket",
      description: "Vista globale dei carnet prepagati per azienda, con date di validità e saldo residuo.",
      newPack: "Nuovo carnet"
    },
    searchPlaceholder: "Cerca azienda, etichetta o nota…",
    packMeta: "{count} carnet · {credits} credito disponibile",
    packMetaPlural: "{count} carnet · {credits} crediti disponibili",
    columns: {
      enterprise: "Azienda",
      pack: "Carnet",
      remaining: "Restanti",
      initial: "Iniziale",
      validFrom: "Valido dal",
      validUntil: "Scade il",
      status: "Stato",
      createdAt: "Creato il"
    },
    editTitle: "Modifica",
    deleteTitle: "Elimina",
    emptyLoading: "Caricamento…",
    empty: "Nessun carnet trovato.",
    range: "{start}–{end} di {total}",
    sections: {
      client: {
        label: "Azienda",
        description: "Cliente MSP beneficiario del carnet"
      },
      pack: {
        label: "Carnet",
        description: "Volume ticket ed etichetta commerciale"
      },
      details: {
        label: "Validità",
        description: "Periodo di utilizzo e riferimento interno"
      }
    },
    modal: {
      eyebrow: "Carnet ticket",
      createTitle: "Nuovo carnet prepagato",
      editTitle: "Modifica carnet",
      createSubtitle: "Accredita un'azienda con un carnet ticket support prepagato.",
      editSubtitle: "Regola saldo, validità e riferimenti interni del carnet.",
      sectionsAria: "Sezioni del carnet",
      closeAria: "Chiudi",
      footerCreateHint: "I campi contrassegnati * sono obbligatori",
      footerEditHint: "Modifiche al carnet prepagato",
      cancel: "Annulla",
      saving: "Salvataggio…",
      createBtn: "Crea carnet",
      saveBtn: "Salva",
      editLockedHint: "L'azienda collegata al carnet non può essere modificata dopo la creazione.",
      createLockedHint: "Il carnet sarà accreditato all'azienda mostrata sotto.",
      searchHint: "Cerca l'azienda che riceverà i crediti supporto.",
      enterpriseLabel: "Azienda",
      searchPlaceholder: "Cerca per numero o nome…",
      enterprisesAria: "Aziende",
      noEnterpriseFound: "Nessuna azienda trovata",
      beneficiaryHint: "Azienda beneficiaria del carnet",
      selectedHint: "Azienda selezionata",
      initialTickets: "Ticket iniziali",
      remainingTickets: "Ticket restanti",
      ticketCount: "Numero di ticket",
      ticketCountPlaceholder: "Es. 10",
      ticketsIncrease: "Aumenta il numero di ticket",
      ticketsDecrease: "Diminuisci il numero di ticket",
      label: "Etichetta",
      labelPlaceholder: "Es. Carnet annuale 2026",
      createInfo: "Il carnet sarà accreditato immediatamente. I ticket sono scalati alla risoluzione, non alla creazione.",
      validFrom: "Valido dal",
      validUntil: "Valido fino al",
      internalNote: "Nota interna",
      notePlaceholder: "Riferimento ordine, fattura, commento commerciale…"
    },
    toast: {
      loadError: "Errore caricamento carnet",
      deleted: "Carnet eliminato",
      deleteError: "Errore durante l'eliminazione",
      selectEnterprise: "Seleziona un'azienda",
      initialInvalid: "L'importo iniziale deve essere un intero positivo",
      remainingInvalid: "Il saldo restante deve essere un intero positivo o zero",
      amountInvalid: "Indica un numero intero positivo di ticket",
      updated: "Carnet aggiornato",
      created: "Carnet di {amount} ticket creato",
      saveError: "Errore durante il salvataggio"
    }
  },
  es: {
    bcp47: "es-ES",
    statusLabels: {
      active: "Activo",
      upcoming: "Próximo",
      expired: "Caducado",
      depleted: "Agotado"
    },
    statusFilters: {
      all: "Todos los estados",
      active: "Activos",
      upcoming: "Próximos",
      expired: "Caducados",
      depleted: "Agotados"
    },
    summary: {
      enterprises: "Empresas",
      packs: "Carnets",
      availableCredits: "Créditos disponibles"
    },
    page: {
      title: "Carnets de tickets",
      description: "Vista global de carnets prepago por empresa, con fechas de validez y saldo restante.",
      newPack: "Nuevo carnet"
    },
    searchPlaceholder: "Buscar empresa, etiqueta o nota…",
    packMeta: "{count} carnet · {credits} crédito disponible",
    packMetaPlural: "{count} carnets · {credits} créditos disponibles",
    columns: {
      enterprise: "Empresa",
      pack: "Carnet",
      remaining: "Restantes",
      initial: "Inicial",
      validFrom: "Válido desde",
      validUntil: "Caduca el",
      status: "Estado",
      createdAt: "Creado"
    },
    editTitle: "Modificar",
    deleteTitle: "Eliminar",
    emptyLoading: "Cargando…",
    empty: "Ningún carnet encontrado.",
    range: "{start}–{end} de {total}",
    sections: {
      client: {
        label: "Empresa",
        description: "Cliente MSP beneficiario del carnet"
      },
      pack: {
        label: "Carnet",
        description: "Volumen de tickets y etiqueta comercial"
      },
      details: {
        label: "Validez",
        description: "Periodo de uso y referencia interna"
      }
    },
    modal: {
      eyebrow: "Carnets de tickets",
      createTitle: "Nuevo carnet prepago",
      editTitle: "Modificar carnet",
      createSubtitle: "Acredite una empresa con un carnet de tickets de soporte prepago.",
      editSubtitle: "Ajuste saldo, validez y referencias internas del carnet.",
      sectionsAria: "Secciones del carnet",
      closeAria: "Cerrar",
      footerCreateHint: "Los campos marcados * son obligatorios",
      footerEditHint: "Cambios del carnet prepago",
      cancel: "Cancelar",
      saving: "Guardando…",
      createBtn: "Crear carnet",
      saveBtn: "Guardar",
      editLockedHint: "La empresa vinculada al carnet no puede modificarse tras la creación.",
      createLockedHint: "El carnet se acreditará a la empresa mostrada abajo.",
      searchHint: "Busque la empresa que recibirá los créditos de soporte.",
      enterpriseLabel: "Empresa",
      searchPlaceholder: "Buscar por número o nombre…",
      enterprisesAria: "Empresas",
      noEnterpriseFound: "Ninguna empresa encontrada",
      beneficiaryHint: "Empresa beneficiaria del carnet",
      selectedHint: "Empresa seleccionada",
      initialTickets: "Tickets iniciales",
      remainingTickets: "Tickets restantes",
      ticketCount: "Número de tickets",
      ticketCountPlaceholder: "Ej. 10",
      ticketsIncrease: "Aumentar número de tickets",
      ticketsDecrease: "Disminuir número de tickets",
      label: "Etiqueta",
      labelPlaceholder: "Ej. Carnet anual 2026",
      createInfo: "El carnet se acreditará de inmediato. Los tickets se descuentan al resolver tickets, no al crearlos.",
      validFrom: "Válido desde",
      validUntil: "Válido hasta",
      internalNote: "Nota interna",
      notePlaceholder: "Referencia pedido, factura, comentario comercial…"
    },
    toast: {
      loadError: "Error al cargar los carnets",
      deleted: "Carnet eliminado",
      deleteError: "Error al eliminar",
      selectEnterprise: "Seleccione una empresa",
      initialInvalid: "El importe inicial debe ser un entero positivo",
      remainingInvalid: "El saldo restante debe ser un entero positivo o cero",
      amountInvalid: "Indique un número entero positivo de tickets",
      updated: "Carnet actualizado",
      created: "Carnet de {amount} ticket(s) creado",
      saveError: "Error al guardar"
    }
  }
};
const STATUS_FILTER_VALUES = ["", "active", "upcoming", "expired", "depleted"];
export const getAdminSupportCreditsCopy = createLocaleGetter(SUPPORT_CREDITS_COPY);
export function getPackStatusLabel(locale, status) {
  const labels = getAdminSupportCreditsCopy(locale).statusLabels;
  return labels[status] || status || "-";
}
export function getStatusFilterOptions(locale) {
  const filters = getAdminSupportCreditsCopy(locale).statusFilters;
  return STATUS_FILTER_VALUES.map(value => ({
    value,
    label: value ? filters[value] : filters.all
  }));
}
export function getSupportCreditFormSections(locale) {
  const sections = getAdminSupportCreditsCopy(locale).sections;
  return ["client", "pack", "details"].map(id => ({
    id,
    icon: SECTION_ICONS[id],
    label: sections[id].label,
    description: sections[id].description
  }));
}
export function formatPackMeta(locale, count, credits) {
  const copy = getAdminSupportCreditsCopy(locale);
  const template = count === 1 ? copy.packMeta : copy.packMetaPlural;
  return interpolate(template, {
    count,
    credits
  });
}
export { interpolate };
