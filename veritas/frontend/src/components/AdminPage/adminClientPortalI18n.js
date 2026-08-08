import { createLocaleGetter, interpolate } from "../../i18n/translate";
const CLIENT_PORTAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    page: {
      title: "Accès clients",
      description: "Liste et gestion des comptes portail client."
    },
    searchPlaceholder: "Rechercher un contact…",
    searchAria: "Rechercher un contact",
    accountCount: "{count} compte",
    accountCountPlural: "{count} comptes",
    limitReached: "Limite atteinte ({current}/{max} accès actifs).",
    quota: "Quota : {current}/{max} accès portail actifs.",
    limitWarn: "Limite Community : {max} comptes portail client maximum. Passez à Veritas Pro pour en ajouter davantage.",
    limitTitle: "Limite Community : {max} accès actifs maximum",
    columns: {
      contact: "Contact",
      enterprise: "Entreprise",
      email: "Email",
      status: "Statut",
      lastLogin: "Dernière connexion"
    },
    contactRef: "Contact #{id}",
    statusActive: "Actif",
    statusInactive: "Inactif",
    actions: {
      disable: "Désactiver",
      enable: "Activer",
      resetPassword: "Réinitialiser le mot de passe",
      deleteAccount: "Supprimer le compte"
    },
    emptyLoading: "Chargement…",
    empty: "Aucun utilisateur portail client",
    emptySearch: "Aucun résultat pour cette recherche",
    pager: {
      perPage: "Par page",
      prevTitle: "Précédent",
      nextTitle: "Suivant",
      page: "Page {current} / {total}",
      range: "{start}–{end} sur {total}"
    },
    resetModal: {
      title: "Réinitialiser le mot de passe",
      sectionTitle: "Nouveau mot de passe",
      passwordLabel: "Mot de passe",
      passwordPlaceholder: "Minimum 6 caractères",
      confirmLabel: "Confirmation",
      confirmPlaceholder: "Répéter le mot de passe",
      confirmBtn: "Valider"
    },
    toast: {
      loadError: "Erreur de chargement",
      accessEnabled: "Accès activé",
      accessDisabled: "Accès désactivé",
      passwordTooShort: "Minimum 6 caractères",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      passwordUpdated: "Mot de passe mis à jour",
      accountDeleted: "Compte supprimé"
    }
  },
  en: {
    bcp47: "en-GB",
    page: {
      title: "Client access",
      description: "List and manage client portal accounts."
    },
    searchPlaceholder: "Search a contact…",
    searchAria: "Search a contact",
    accountCount: "{count} account",
    accountCountPlural: "{count} accounts",
    limitReached: "Limit reached ({current}/{max} active accesses).",
    quota: "Quota: {current}/{max} active portal accesses.",
    limitWarn: "Community limit: {max} client portal accounts maximum. Upgrade to Veritas Pro to add more.",
    limitTitle: "Community limit: {max} active accesses maximum",
    columns: {
      contact: "Contact",
      enterprise: "Company",
      email: "Email",
      status: "Status",
      lastLogin: "Last login"
    },
    contactRef: "Contact #{id}",
    statusActive: "Active",
    statusInactive: "Inactive",
    actions: {
      disable: "Disable",
      enable: "Enable",
      resetPassword: "Reset password",
      deleteAccount: "Delete account"
    },
    emptyLoading: "Loading…",
    empty: "No client portal users",
    emptySearch: "No results for this search",
    pager: {
      perPage: "Per page",
      prevTitle: "Previous",
      nextTitle: "Next",
      page: "Page {current} / {total}",
      range: "{start}–{end} of {total}"
    },
    resetModal: {
      title: "Reset password",
      sectionTitle: "New password",
      passwordLabel: "Password",
      passwordPlaceholder: "Minimum 6 characters",
      confirmLabel: "Confirmation",
      confirmPlaceholder: "Repeat password",
      confirmBtn: "Confirm"
    },
    toast: {
      loadError: "Loading error",
      accessEnabled: "Access enabled",
      accessDisabled: "Access disabled",
      passwordTooShort: "Minimum 6 characters",
      passwordMismatch: "Passwords do not match",
      passwordUpdated: "Password updated",
      accountDeleted: "Account deleted"
    }
  },
  de: {
    bcp47: "de-DE",
    page: {
      title: "Kundenzugang",
      description: "Kundenportal-Konten auflisten und verwalten."
    },
    searchPlaceholder: "Kontakt suchen…",
    searchAria: "Kontakt suchen",
    accountCount: "{count} Konto",
    accountCountPlural: "{count} Konten",
    limitReached: "Limit erreicht ({current}/{max} aktive Zugänge).",
    quota: "Kontingent: {current}/{max} aktive Portalzugänge.",
    limitWarn: "Community-Limit: maximal {max} Kundenportal-Konten. Wechseln Sie zu Veritas Pro für mehr.",
    limitTitle: "Community-Limit: maximal {max} aktive Zugänge",
    columns: {
      contact: "Kontakt",
      enterprise: "Unternehmen",
      email: "E-Mail",
      status: "Status",
      lastLogin: "Letzte Anmeldung"
    },
    contactRef: "Kontakt #{id}",
    statusActive: "Aktiv",
    statusInactive: "Inaktiv",
    actions: {
      disable: "Deaktivieren",
      enable: "Aktivieren",
      resetPassword: "Passwort zurücksetzen",
      deleteAccount: "Konto löschen"
    },
    emptyLoading: "Laden…",
    empty: "Keine Kundenportal-Benutzer",
    emptySearch: "Keine Ergebnisse für diese Suche",
    pager: {
      perPage: "Pro Seite",
      prevTitle: "Zurück",
      nextTitle: "Weiter",
      page: "Seite {current} / {total}",
      range: "{start}–{end} von {total}"
    },
    resetModal: {
      title: "Passwort zurücksetzen",
      sectionTitle: "Neues Passwort",
      passwordLabel: "Passwort",
      passwordPlaceholder: "Mindestens 6 Zeichen",
      confirmLabel: "Bestätigung",
      confirmPlaceholder: "Passwort wiederholen",
      confirmBtn: "Bestätigen"
    },
    toast: {
      loadError: "Ladefehler",
      accessEnabled: "Zugang aktiviert",
      accessDisabled: "Zugang deaktiviert",
      passwordTooShort: "Mindestens 6 Zeichen",
      passwordMismatch: "Passwörter stimmen nicht überein",
      passwordUpdated: "Passwort aktualisiert",
      accountDeleted: "Konto gelöscht"
    }
  },
  it: {
    bcp47: "it-IT",
    page: {
      title: "Accesso clienti",
      description: "Elencare e gestire gli account del portale clienti."
    },
    searchPlaceholder: "Cerca un contatto…",
    searchAria: "Cerca un contatto",
    accountCount: "{count} account",
    accountCountPlural: "{count} account",
    limitReached: "Limite raggiunto ({current}/{max} accessi attivi).",
    quota: "Quota: {current}/{max} accessi portale attivi.",
    limitWarn: "Limite Community: massimo {max} account portale clienti. Passa a Veritas Pro per aggiungerne.",
    limitTitle: "Limite Community: massimo {max} accessi attivi",
    columns: {
      contact: "Contatto",
      enterprise: "Azienda",
      email: "Email",
      status: "Stato",
      lastLogin: "Ultimo accesso"
    },
    contactRef: "Contatto #{id}",
    statusActive: "Attivo",
    statusInactive: "Inattivo",
    actions: {
      disable: "Disattiva",
      enable: "Attiva",
      resetPassword: "Reimposta password",
      deleteAccount: "Elimina account"
    },
    emptyLoading: "Caricamento…",
    empty: "Nessun utente portale clienti",
    emptySearch: "Nessun risultato per questa ricerca",
    pager: {
      perPage: "Per pagina",
      prevTitle: "Precedente",
      nextTitle: "Successivo",
      page: "Pagina {current} / {total}",
      range: "{start}–{end} di {total}"
    },
    resetModal: {
      title: "Reimposta password",
      sectionTitle: "Nuova password",
      passwordLabel: "Password",
      passwordPlaceholder: "Minimo 6 caratteri",
      confirmLabel: "Conferma",
      confirmPlaceholder: "Ripeti password",
      confirmBtn: "Conferma"
    },
    toast: {
      loadError: "Errore di caricamento",
      accessEnabled: "Accesso attivato",
      accessDisabled: "Accesso disattivato",
      passwordTooShort: "Minimo 6 caratteri",
      passwordMismatch: "Le password non corrispondono",
      passwordUpdated: "Password aggiornata",
      accountDeleted: "Account eliminato"
    }
  },
  es: {
    bcp47: "es-ES",
    page: {
      title: "Acceso clientes",
      description: "Listar y gestionar cuentas del portal cliente."
    },
    searchPlaceholder: "Buscar un contacto…",
    searchAria: "Buscar un contacto",
    accountCount: "{count} cuenta",
    accountCountPlural: "{count} cuentas",
    limitReached: "Límite alcanzado ({current}/{max} accesos activos).",
    quota: "Cuota: {current}/{max} accesos activos al portal.",
    limitWarn: "Límite Community: máximo {max} cuentas de portal cliente. Pase a Veritas Pro para añadir más.",
    limitTitle: "Límite Community: máximo {max} accesos activos",
    columns: {
      contact: "Contacto",
      enterprise: "Empresa",
      email: "Email",
      status: "Estado",
      lastLogin: "Última conexión"
    },
    contactRef: "Contacto #{id}",
    statusActive: "Activo",
    statusInactive: "Inactivo",
    actions: {
      disable: "Desactivar",
      enable: "Activar",
      resetPassword: "Restablecer contraseña",
      deleteAccount: "Eliminar cuenta"
    },
    emptyLoading: "Cargando…",
    empty: "Ningún usuario del portal cliente",
    emptySearch: "Ningún resultado para esta búsqueda",
    pager: {
      perPage: "Por página",
      prevTitle: "Anterior",
      nextTitle: "Siguiente",
      page: "Página {current} / {total}",
      range: "{start}–{end} de {total}"
    },
    resetModal: {
      title: "Restablecer contraseña",
      sectionTitle: "Nueva contraseña",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Mínimo 6 caracteres",
      confirmLabel: "Confirmación",
      confirmPlaceholder: "Repetir contraseña",
      confirmBtn: "Confirmar"
    },
    toast: {
      loadError: "Error de carga",
      accessEnabled: "Acceso activado",
      accessDisabled: "Acceso desactivado",
      passwordTooShort: "Mínimo 6 caracteres",
      passwordMismatch: "Las contraseñas no coinciden",
      passwordUpdated: "Contraseña actualizada",
      accountDeleted: "Cuenta eliminada"
    }
  }
};
export const getAdminClientPortalCopy = createLocaleGetter(CLIENT_PORTAL_COPY);
export function formatAccountCount(locale, count) {
  const copy = getAdminClientPortalCopy(locale);
  return interpolate(count === 1 ? copy.accountCount : copy.accountCountPlural, {
    count
  });
}
export { interpolate };
