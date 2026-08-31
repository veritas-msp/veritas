import { interpolate, pickLocaleMessages, normalizeLocale } from "../../i18n/translate";

const CATEGORY_KEYS = ["Facture", "Notice / Guide", "Rapport", "Contrat", "Procédure", "Autre"];

const COPY = {
  fr: {
    enable: "Ajouter aussi au coffre-fort de l'entreprise",
    enableHint: "Les fichiers cochés sont classés dans le coffre documentaire de l'entreprise.",
    noClient: "Associez une entreprise au ticket pour archiver dans le coffre-fort.",
    panelTitle: "Coffre-fort entreprise",
    bulkEnable: "Tout mettre au coffre-fort",
    enabledCount: "{enabled}/{total} dans le coffre",
    mixedCategories: "Catégories mixtes",
    bulkCategoryAria: "Catégorie pour tous les fichiers archivés",
    vaultToggleAria: "Archiver {name} dans le coffre-fort",
    descriptionToggleAria: "Ajouter une description",
    categoryLabel: "Catégorie",
    descriptionLabel: "Description (optionnel)",
    descriptionPlaceholder: "Ex. compte-rendu, facture, procédure…",
    categories: {
      Facture: "Facture",
      "Notice / Guide": "Notice / Guide",
      Rapport: "Rapport",
      Contrat: "Contrat",
      Procédure: "Procédure",
      Autre: "Autre"
    },
    toast: {
      archived: "Document(s) ajouté(s) au coffre-fort.",
      archivedVisible: "Document(s) ajouté(s) au coffre-fort (visibles sur le portail).",
      archivedInternal: "Document(s) ajouté(s) au coffre-fort (agents uniquement).",
      partial: "{ok} document(s) archivé(s), {failed} échec(s).",
      skippedIncompatible: "{count} fichier(s) non compatibles avec le coffre-fort (ignorés).",
      error: "Impossible d'archiver dans le coffre-fort."
    }
  },
  en: {
    enable: "Also add to the company vault",
    enableHint: "Checked files are filed in the company document vault.",
    noClient: "Link a company to the ticket to archive in the vault.",
    panelTitle: "Company vault",
    bulkEnable: "Add all to the vault",
    enabledCount: "{enabled}/{total} in the vault",
    mixedCategories: "Mixed categories",
    bulkCategoryAria: "Category for all archived files",
    vaultToggleAria: "Archive {name} in the vault",
    descriptionToggleAria: "Add a description",
    categoryLabel: "Category",
    descriptionLabel: "Description (optional)",
    descriptionPlaceholder: "E.g. report, invoice, procedure…",
    categories: {
      Facture: "Invoice",
      "Notice / Guide": "Manual / Guide",
      Rapport: "Report",
      Contrat: "Contract",
      Procédure: "Procedure",
      Autre: "Other"
    },
    toast: {
      archived: "Document(s) added to the vault.",
      archivedVisible: "Document(s) added to the vault (visible on the portal).",
      archivedInternal: "Document(s) added to the vault (agents only).",
      partial: "{ok} document(s) archived, {failed} failed.",
      skippedIncompatible: "{count} file(s) incompatible with the vault (skipped).",
      error: "Unable to archive to the vault."
    }
  },
  de: {
    enable: "Auch im Unternehmens-Tresor ablegen",
    enableHint: "Aktivierte Dateien werden im Dokumententresor des Unternehmens abgelegt.",
    noClient: "Verknüpfen Sie ein Unternehmen mit dem Ticket, um im Tresor zu archivieren.",
    panelTitle: "Unternehmens-Tresor",
    bulkEnable: "Alle in den Tresor legen",
    enabledCount: "{enabled}/{total} im Tresor",
    mixedCategories: "Gemischte Kategorien",
    bulkCategoryAria: "Kategorie für alle archivierten Dateien",
    vaultToggleAria: "{name} im Tresor ablegen",
    descriptionToggleAria: "Beschreibung hinzufügen",
    categoryLabel: "Kategorie",
    descriptionLabel: "Beschreibung (optional)",
    descriptionPlaceholder: "z. B. Bericht, Rechnung, Verfahren…",
    categories: {
      Facture: "Rechnung",
      "Notice / Guide": "Anleitung / Guide",
      Rapport: "Bericht",
      Contrat: "Vertrag",
      Procédure: "Verfahren",
      Autre: "Sonstiges"
    },
    toast: {
      archived: "Dokument(e) im Tresor abgelegt.",
      archivedVisible: "Dokument(e) im Tresor abgelegt (im Portal sichtbar).",
      archivedInternal: "Dokument(e) im Tresor abgelegt (nur Agenten).",
      partial: "{ok} Dokument(e) archiviert, {failed} Fehler.",
      skippedIncompatible: "{count} Datei(en) nicht mit dem Tresor kompatibel (übersprungen).",
      error: "Archivierung im Tresor fehlgeschlagen."
    }
  },
  it: {
    enable: "Aggiungi anche alla cassaforte aziendale",
    enableHint: "I file selezionati vengono archiviati nella cassaforte documentale dell'azienda.",
    noClient: "Collega un'azienda al ticket per archiviare nella cassaforte.",
    panelTitle: "Cassaforte aziendale",
    bulkEnable: "Metti tutti in cassaforte",
    enabledCount: "{enabled}/{total} in cassaforte",
    mixedCategories: "Categorie miste",
    bulkCategoryAria: "Categoria per tutti i file archiviati",
    vaultToggleAria: "Archivia {name} nella cassaforte",
    descriptionToggleAria: "Aggiungi una descrizione",
    categoryLabel: "Categoria",
    descriptionLabel: "Descrizione (opzionale)",
    descriptionPlaceholder: "Es. verbale, fattura, procedura…",
    categories: {
      Facture: "Fattura",
      "Notice / Guide": "Manuale / Guida",
      Rapport: "Report",
      Contrat: "Contratto",
      Procédure: "Procedura",
      Autre: "Altro"
    },
    toast: {
      archived: "Documento/i aggiunto/i alla cassaforte.",
      archivedVisible: "Documento/i aggiunto/i alla cassaforte (visibili sul portale).",
      archivedInternal: "Documento/i aggiunto/i alla cassaforte (solo agenti).",
      partial: "{ok} documento/i archiviati, {failed} errore/i.",
      skippedIncompatible: "{count} file non compatibili con la cassaforte (ignorati).",
      error: "Impossibile archiviare nella cassaforte."
    }
  },
  es: {
    enable: "Añadir también a la caja fuerte de la empresa",
    enableHint: "Los archivos marcados se archivan en la caja fuerte documental de la empresa.",
    noClient: "Asocie una empresa al ticket para archivar en la caja fuerte.",
    panelTitle: "Caja fuerte de la empresa",
    bulkEnable: "Poner todos en la caja fuerte",
    enabledCount: "{enabled}/{total} en la caja fuerte",
    mixedCategories: "Categorías mixtas",
    bulkCategoryAria: "Categoría para todos los archivos archivados",
    vaultToggleAria: "Archivar {name} en la caja fuerte",
    descriptionToggleAria: "Añadir una descripción",
    categoryLabel: "Categoría",
    descriptionLabel: "Descripción (opcional)",
    descriptionPlaceholder: "Ej. informe, factura, procedimiento…",
    categories: {
      Facture: "Factura",
      "Notice / Guide": "Manual / Guía",
      Rapport: "Informe",
      Contrat: "Contrato",
      Procédure: "Procedimiento",
      Autre: "Otro"
    },
    toast: {
      archived: "Documento(s) añadido(s) a la caja fuerte.",
      archivedVisible: "Documento(s) añadido(s) a la caja fuerte (visibles en el portal).",
      archivedInternal: "Documento(s) añadido(s) a la caja fuerte (solo agentes).",
      partial: "{ok} documento(s) archivado(s), {failed} error(es).",
      skippedIncompatible: "{count} archivo(s) no compatibles con la caja fuerte (omitidos).",
      error: "No se pudo archivar en la caja fuerte."
    }
  }
};

export const TICKET_VAULT_CATEGORY_KEYS = CATEGORY_KEYS;
export const TICKET_VAULT_DEFAULT_CATEGORY = "Autre";

export function getTicketVaultArchiveCopy(locale) {
  const code = normalizeLocale(locale);
  const t = pickLocaleMessages(COPY, code);
  return {
    ...t,
    categoryKeys: CATEGORY_KEYS,
    getCategoryLabel: category => t.categories[category] || category,
    formatEnabledCount: (enabled, total) =>
      interpolate(t.enabledCount, {
        enabled: String(enabled),
        total: String(total)
      }),
    formatVaultToggleAria: name =>
      interpolate(t.vaultToggleAria, {
        name: String(name || "")
      }),
    formatPartial: (ok, failed) =>
      interpolate(t.toast.partial, {
        ok: String(ok),
        failed: String(failed)
      }),
    formatSkipped: count =>
      interpolate(t.toast.skippedIncompatible, {
        count: String(count)
      })
  };
}
