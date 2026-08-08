import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const LICENCES_MODAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Services · Abonnements",
    title: "Licences & abonnements",
    subtitle: "Suivi générique des renouvellements et expirations",
    navAria: "Sections licences",
    sections: {
      overview: {
        label: "Vue d'ensemble",
        description: "Synthèse et actions"
      },
      add: {
        label: "Nouvelle entrée",
        description: "Licence ou abonnement"
      },
      edit: {
        label: "Éditer",
        description: "Modifier l'entrée"
      },
      inventory: {
        label: "Inventaire",
        description: "Toutes les entrées"
      }
    },
    overview: {
      title: "Vue d'ensemble",
      description: "Suivi générique des licences logicielles, abonnements SaaS et renouvellements récurrents. Les alertes remontent dans la supervision.",
      addBtn: "Ajouter une licence",
      viewInventory: "Voir l'inventaire"
    },
    add: {
      title: "Nouvelle licence / abonnement",
      description: "Enregistrez n'importe quel type de licence ou d'abonnement (Microsoft, Adobe, hébergement…)."
    },
    edit: {
      title: "Modifier l'entrée",
      description: "Mettez à jour les informations de cette licence ou abonnement."
    },
    inventory: {
      title: "Inventaire",
      description: "Licences et abonnements enregistrés pour cette entreprise.",
      filteredSuffix: " (filtré)",
      countOne: "{count} entrée",
      countMany: "{count} entrées"
    },
    kpi: {
      all: "Total",
      active: "Valides",
      warning: "À surveiller",
      expired: "Expirées"
    },
    filters: {
      all: "Tous",
      active: "Valides",
      warning: "À surveiller",
      expired: "Expirées",
      neutral: "Sans date"
    },
    status: {
      active: "Valide",
      warning: "Expire bientôt",
      expired: "Expiré",
      neutral: "Sans date",
      invalidDate: "Date invalide"
    },
    meta: {
      expiration: "Expiration",
      supplier: "Fournisseur",
      daysRemaining: "Jours restants"
    },
    form: {
      name: "Nom",
      namePlaceholder: "Ex. Microsoft 365 Business",
      expiration: "Date d'expiration",
      supplier: "Fournisseur",
      supplierPlaceholder: "Ex. Microsoft, Adobe…",
      notes: "Notes",
      notesPlaceholder: "Optionnel · numéro de contrat, quantité…",
      cancel: "Annuler"
    },
    empty: {
      none: "Aucune licence enregistrée",
      noFilterMatch: "Aucune entrée pour ce filtre",
      addBtn: "Ajouter une licence"
    },
    footer: {
      nameRequired: "Le nom est obligatoire"
    },
    primary: {
      update: "Mettre à jour",
      add: "Ajouter"
    },
    actions: {
      edit: "Modifier",
      delete: "Supprimer"
    },
    deleteFallback: "cette entrée",
    toasts: {
      nameRequired: "Le nom est obligatoire",
      updated: "Licence mise à jour",
      added: "Licence ajoutée",
      deleted: "Licence supprimée",
      saveError: "Erreur lors de l'enregistrement",
      deleteError: "Erreur lors de la suppression"
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Services · Subscriptions",
    title: "Licenses & subscriptions",
    subtitle: "Generic tracking of renewals and expirations",
    navAria: "License sections",
    sections: {
      overview: {
        label: "Overview",
        description: "Summary and actions"
      },
      add: {
        label: "New entry",
        description: "License or subscription"
      },
      edit: {
        label: "Edit",
        description: "Modify entry"
      },
      inventory: {
        label: "Inventory",
        description: "All entries"
      }
    },
    overview: {
      title: "Overview",
      description: "Generic tracking of software licenses, SaaS subscriptions and recurring renewals. Alerts appear in supervision.",
      addBtn: "Add a license",
      viewInventory: "View inventory"
    },
    add: {
      title: "New license / subscription",
      description: "Record any type of license or subscription (Microsoft, Adobe, hosting…)."
    },
    edit: {
      title: "Edit entry",
      description: "Update this license or subscription information."
    },
    inventory: {
      title: "Inventory",
      description: "Licenses and subscriptions registered for this company.",
      filteredSuffix: " (filtered)",
      countOne: "{count} entry",
      countMany: "{count} entries"
    },
    kpi: {
      all: "Total",
      active: "Valid",
      warning: "To monitor",
      expired: "Expired"
    },
    filters: {
      all: "All",
      active: "Valid",
      warning: "To monitor",
      expired: "Expired",
      neutral: "No date"
    },
    status: {
      active: "Valid",
      warning: "Expiring soon",
      expired: "Expired",
      neutral: "No date",
      invalidDate: "Invalid date"
    },
    meta: {
      expiration: "Expiration",
      supplier: "Vendor",
      daysRemaining: "Days remaining"
    },
    form: {
      name: "Name",
      namePlaceholder: "e.g. Microsoft 365 Business",
      expiration: "Expiration date",
      supplier: "Vendor",
      supplierPlaceholder: "e.g. Microsoft, Adobe…",
      notes: "Notes",
      notesPlaceholder: "Optional · contract number, quantity…",
      cancel: "Cancel"
    },
    empty: {
      none: "No licenses recorded",
      noFilterMatch: "No entries for this filter",
      addBtn: "Add a license"
    },
    footer: {
      nameRequired: "Name is required"
    },
    primary: {
      update: "Update",
      add: "Add"
    },
    actions: {
      edit: "Edit",
      delete: "Delete"
    },
    deleteFallback: "this entry",
    toasts: {
      nameRequired: "Name is required",
      updated: "License updated",
      added: "License added",
      deleted: "License deleted",
      saveError: "Error while saving",
      deleteError: "Error while deleting"
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Services · Abonnements",
    title: "Lizenzen & Abonnements",
    subtitle: "Generische Verfolgung von Verlängerungen und Abläufen",
    navAria: "Lizenz-Bereiche",
    sections: {
      overview: {
        label: "Übersicht",
        description: "Zusammenfassung und Aktionen"
      },
      add: {
        label: "Neuer Eintrag",
        description: "Lizenz oder Abonnement"
      },
      edit: {
        label: "Bearbeiten",
        description: "Eintrag ändern"
      },
      inventory: {
        label: "Inventar",
        description: "Alle Einträge"
      }
    },
    overview: {
      title: "Übersicht",
      description: "Generische Verfolgung von Softwarelizenzen, SaaS-Abonnements und wiederkehrenden Verlängerungen. Warnungen erscheinen in der Überwachung.",
      addBtn: "Lizenz hinzufügen",
      viewInventory: "Inventar anzeigen"
    },
    add: {
      title: "Neue Lizenz / Abonnement",
      description: "Erfassen Sie jede Art von Lizenz oder Abonnement (Microsoft, Adobe, Hosting…)."
    },
    edit: {
      title: "Eintrag bearbeiten",
      description: "Aktualisieren Sie die Informationen dieser Lizenz oder dieses Abonnements."
    },
    inventory: {
      title: "Inventar",
      description: "Für dieses Unternehmen erfasste Lizenzen und Abonnements.",
      filteredSuffix: " (gefiltert)",
      countOne: "{count} Eintrag",
      countMany: "{count} Einträge"
    },
    kpi: {
      all: "Gesamt",
      active: "Gültig",
      warning: "Zu überwachen",
      expired: "Abgelaufen"
    },
    filters: {
      all: "Alle",
      active: "Gültig",
      warning: "Zu überwachen",
      expired: "Abgelaufen",
      neutral: "Ohne Datum"
    },
    status: {
      active: "Gültig",
      warning: "Läuft bald ab",
      expired: "Abgelaufen",
      neutral: "Ohne Datum",
      invalidDate: "Ungültiges Datum"
    },
    meta: {
      expiration: "Ablauf",
      supplier: "Anbieter",
      daysRemaining: "Verbleibende Tage"
    },
    form: {
      name: "Name",
      namePlaceholder: "z. B. Microsoft 365 Business",
      expiration: "Ablaufdatum",
      supplier: "Anbieter",
      supplierPlaceholder: "z. B. Microsoft, Adobe…",
      notes: "Notizen",
      notesPlaceholder: "Optional · Vertragsnummer, Menge…",
      cancel: "Abbrechen"
    },
    empty: {
      none: "Keine Lizenzen erfasst",
      noFilterMatch: "Keine Einträge für diesen Filter",
      addBtn: "Lizenz hinzufügen"
    },
    footer: {
      nameRequired: "Name ist Pflicht"
    },
    primary: {
      update: "Aktualisieren",
      add: "Hinzufügen"
    },
    actions: {
      edit: "Bearbeiten",
      delete: "Löschen"
    },
    deleteFallback: "diesen Eintrag",
    toasts: {
      nameRequired: "Name ist Pflicht",
      updated: "Lizenz aktualisiert",
      added: "Lizenz hinzugefügt",
      deleted: "Lizenz gelöscht",
      saveError: "Fehler beim Speichern",
      deleteError: "Fehler beim Löschen"
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Servizi · Abbonamenti",
    title: "Licenze e abbonamenti",
    subtitle: "Monitoraggio generico di rinnovi e scadenze",
    navAria: "Sezioni licenze",
    sections: {
      overview: {
        label: "Panoramica",
        description: "Sintesi e azioni"
      },
      add: {
        label: "Nuova voce",
        description: "Licenza o abbonamento"
      },
      edit: {
        label: "Modifica",
        description: "Modifica voce"
      },
      inventory: {
        label: "Inventario",
        description: "Tutte le voci"
      }
    },
    overview: {
      title: "Panoramica",
      description: "Monitoraggio generico di licenze software, abbonamenti SaaS e rinnovi ricorrenti. Gli avvisi compaiono nella supervisione.",
      addBtn: "Aggiungi licenza",
      viewInventory: "Vedi inventario"
    },
    add: {
      title: "Nuova licenza / abbonamento",
      description: "Registra qualsiasi tipo di licenza o abbonamento (Microsoft, Adobe, hosting…)."
    },
    edit: {
      title: "Modifica voce",
      description: "Aggiorna le informazioni di questa licenza o abbonamento."
    },
    inventory: {
      title: "Inventario",
      description: "Licenze e abbonamenti registrati per questa azienda.",
      filteredSuffix: " (filtrato)",
      countOne: "{count} voce",
      countMany: "{count} voci"
    },
    kpi: {
      all: "Totale",
      active: "Valide",
      warning: "Da monitorare",
      expired: "Scadute"
    },
    filters: {
      all: "Tutti",
      active: "Valide",
      warning: "Da monitorare",
      expired: "Scadute",
      neutral: "Senza data"
    },
    status: {
      active: "Valida",
      warning: "In scadenza",
      expired: "Scaduta",
      neutral: "Senza data",
      invalidDate: "Data non valida"
    },
    meta: {
      expiration: "Scadenza",
      supplier: "Fornitore",
      daysRemaining: "Giorni rimanenti"
    },
    form: {
      name: "Nome",
      namePlaceholder: "Es. Microsoft 365 Business",
      expiration: "Data di scadenza",
      supplier: "Fornitore",
      supplierPlaceholder: "Es. Microsoft, Adobe…",
      notes: "Note",
      notesPlaceholder: "Opzionale · numero contratto, quantità…",
      cancel: "Annulla"
    },
    empty: {
      none: "Nessuna licenza registrata",
      noFilterMatch: "Nessuna voce per questo filtro",
      addBtn: "Aggiungi licenza"
    },
    footer: {
      nameRequired: "Il nome è obbligatorio"
    },
    primary: {
      update: "Aggiorna",
      add: "Aggiungi"
    },
    actions: {
      edit: "Modifica",
      delete: "Elimina"
    },
    deleteFallback: "questa voce",
    toasts: {
      nameRequired: "Il nome è obbligatorio",
      updated: "Licenza aggiornata",
      added: "Licenza aggiunta",
      deleted: "Licenza eliminata",
      saveError: "Errore durante il salvataggio",
      deleteError: "Errore durante l'eliminazione"
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Servicios · Suscripciones",
    title: "Licencias y suscripciones",
    subtitle: "Seguimiento genérico de renovaciones y vencimientos",
    navAria: "Secciones de licencias",
    sections: {
      overview: {
        label: "Resumen",
        description: "Síntesis y acciones"
      },
      add: {
        label: "Nueva entrada",
        description: "Licencia o suscripción"
      },
      edit: {
        label: "Editar",
        description: "Modificar entrada"
      },
      inventory: {
        label: "Inventario",
        description: "Todas las entradas"
      }
    },
    overview: {
      title: "Resumen",
      description: "Seguimiento genérico de licencias de software, suscripciones SaaS y renovaciones recurrentes. Las alertas aparecen en la supervisión.",
      addBtn: "Añadir licencia",
      viewInventory: "Ver inventario"
    },
    add: {
      title: "Nueva licencia / suscripción",
      description: "Registre cualquier tipo de licencia o suscripción (Microsoft, Adobe, hosting…)."
    },
    edit: {
      title: "Editar entrada",
      description: "Actualice la información de esta licencia o suscripción."
    },
    inventory: {
      title: "Inventario",
      description: "Licencias y suscripciones registradas para esta empresa.",
      filteredSuffix: " (filtrado)",
      countOne: "{count} entrada",
      countMany: "{count} entradas"
    },
    kpi: {
      all: "Total",
      active: "Válidas",
      warning: "A vigilar",
      expired: "Vencidas"
    },
    filters: {
      all: "Todas",
      active: "Válidas",
      warning: "A vigilar",
      expired: "Vencidas",
      neutral: "Sin fecha"
    },
    status: {
      active: "Válida",
      warning: "Vence pronto",
      expired: "Vencida",
      neutral: "Sin fecha",
      invalidDate: "Fecha no válida"
    },
    meta: {
      expiration: "Vencimiento",
      supplier: "Proveedor",
      daysRemaining: "Días restantes"
    },
    form: {
      name: "Nombre",
      namePlaceholder: "Ej. Microsoft 365 Business",
      expiration: "Fecha de vencimiento",
      supplier: "Proveedor",
      supplierPlaceholder: "Ej. Microsoft, Adobe…",
      notes: "Notas",
      notesPlaceholder: "Opcional · nº de contrato, cantidad…",
      cancel: "Cancelar"
    },
    empty: {
      none: "Ninguna licencia registrada",
      noFilterMatch: "Ninguna entrada para este filtro",
      addBtn: "Añadir licencia"
    },
    footer: {
      nameRequired: "El nombre es obligatorio"
    },
    primary: {
      update: "Actualizar",
      add: "Añadir"
    },
    actions: {
      edit: "Editar",
      delete: "Eliminar"
    },
    deleteFallback: "esta entrada",
    toasts: {
      nameRequired: "El nombre es obligatorio",
      updated: "Licencia actualizada",
      added: "Licencia añadida",
      deleted: "Licencia eliminada",
      saveError: "Error al guardar",
      deleteError: "Error al eliminar"
    }
  }
};
const KPI_CONFIG = [{
  key: "all",
  filter: "all",
  tone: "blue",
  icon: "mdi:license",
  labelKey: "all"
}, {
  key: "active",
  filter: "active",
  tone: "green",
  icon: "mdi:check-circle-outline",
  labelKey: "active"
}, {
  key: "warning",
  filter: "warning",
  tone: "amber",
  icon: "mdi:clock-alert-outline",
  labelKey: "warning"
}, {
  key: "expired",
  filter: "expired",
  tone: "red",
  icon: "mdi:alert-circle-outline",
  labelKey: "expired"
}];
const FILTER_CONFIG = [{
  value: "all",
  labelKey: "all"
}, {
  value: "active",
  labelKey: "active"
}, {
  value: "warning",
  labelKey: "warning"
}, {
  value: "expired",
  labelKey: "expired"
}, {
  value: "neutral",
  labelKey: "neutral"
}];
const NAV_SECTION_IDS = ["overview", "add", "edit", "inventory"];
const NAV_ICONS = {
  overview: "mdi:view-dashboard-outline",
  add: "mdi:plus-circle-outline",
  edit: "mdi:pencil-outline",
  inventory: "mdi:format-list-bulleted"
};
export function getLicencesModalCopy(locale) {
  const t = pickLocaleMessages(LICENCES_MODAL_COPY, locale);
  return {
    ...t,
    kpiItems: KPI_CONFIG.map(item => ({
      ...item,
      label: t.kpi[item.labelKey]
    })),
    filterOptions: FILTER_CONFIG.map(item => ({
      value: item.value,
      label: t.filters[item.labelKey]
    })),
    navSections: editing => NAV_SECTION_IDS.filter(id => editing ? id !== "add" : id !== "edit").map(id => {
      const sectionId = id === "add" && editing ? "edit" : id;
      return {
        id: sectionId,
        icon: NAV_ICONS[sectionId],
        label: t.sections[sectionId].label,
        description: t.sections[sectionId].description
      };
    }),
    formatInventoryCount: count => {
      const template = count > 1 ? t.inventory.countMany : t.inventory.countOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    statusLabels: t.status
  };
}
