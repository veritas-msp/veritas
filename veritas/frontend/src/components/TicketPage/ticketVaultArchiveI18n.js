import { interpolate, pickLocaleMessages, normalizeLocale } from "../../i18n/translate";

const CATEGORY_KEYS = ["Facture", "Notice / Guide", "Rapport", "Contrat", "Procédure", "Autre"];

const COPY = {
  fr: {
    enable: "Ajouter aussi au coffre-fort de l'entreprise",
    enableHint: "Une copie de ce fichier compatible est classée dans le coffre documentaire.",
    noClient: "Associez une entreprise au ticket pour archiver dans le coffre-fort.",
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
    enableHint: "A copy of this compatible file is filed in the document vault.",
    noClient: "Link a company to the ticket to archive in the vault.",
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
    enableHint: "Eine Kopie dieser kompatiblen Datei wird im Dokumententresor abgelegt.",
    noClient: "Verknüpfen Sie ein Unternehmen mit dem Ticket, um im Tresor zu archivieren.",
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
    enableHint: "Una copia di questo file compatibile viene archiviata nella cassaforte documenti.",
    noClient: "Collega un'azienda al ticket per archiviare nella cassaforte.",
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
    enableHint: "Una copia de este archivo compatible se archiva en la caja fuerte documental.",
    noClient: "Asocie una empresa al ticket para archivar en la caja fuerte.",
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
