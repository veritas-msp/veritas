import { createLocaleGetter } from "../../i18n/translate";

const PATCH_NOTES_COPY = {
  fr: {
    eyebrow: "Compte",
    title: "Patch notes",
    subtitle: "Historique des évolutions de Veritas, version par version.",
    currentVersion: "Version installée",
    empty: "Aucune note de version pour le moment.",
    itemsLabel: "Changements"
  },
  en: {
    eyebrow: "Account",
    title: "Patch notes",
    subtitle: "Veritas release history, version by version.",
    currentVersion: "Installed version",
    empty: "No release notes yet.",
    itemsLabel: "Changes"
  },
  de: {
    eyebrow: "Konto",
    title: "Patch notes",
    subtitle: "Versionshistorie von Veritas, Version für Version.",
    currentVersion: "Installierte Version",
    empty: "Noch keine Versionshinweise.",
    itemsLabel: "Änderungen"
  },
  it: {
    eyebrow: "Account",
    title: "Patch notes",
    subtitle: "Cronologia delle versioni di Veritas.",
    currentVersion: "Versione installata",
    empty: "Nessuna nota di versione per ora.",
    itemsLabel: "Modifiche"
  },
  es: {
    eyebrow: "Cuenta",
    title: "Patch notes",
    subtitle: "Historial de versiones de Veritas.",
    currentVersion: "Versión instalada",
    empty: "Todavía no hay notas de versión.",
    itemsLabel: "Cambios"
  }
};

export const getPatchNotesPageCopy = createLocaleGetter(PATCH_NOTES_COPY);
