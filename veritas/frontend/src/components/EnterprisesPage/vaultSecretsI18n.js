import { createLocaleGetter, interpolate } from "../../i18n/translate";
const AVAILABILITY_KEYS = ["active", "expired", "exhausted", "revoked", "deletion_requested"];
const VAULT_SECRETS_COPY = {
  fr: {
    availability: {
      active: "Actif",
      expired: "Expiré",
      exhausted: "Vues épuisées",
      revoked: "Révoqué",
      deletion_requested: "Suppression demandée"
    },
    panel: {
      intro: "Partagez un mot de passe ou un accès temporaire avec {contact} sur son portail · expiration, limite de vues, suppression possible côté client.",
      contactFallback: "ce contact",
      activeCount: "{count} accès actif.",
      activeCountPlural: "{count} accès actifs.",
      loading: "Chargement des accès…",
      empty: "Aucun accès partagé pour le moment.",
      expiresAt: "Expire le {date}",
      views: "Vues {used}/{max}",
      viewsRemaining: " ({count} restante)",
      viewsRemainingPlural: " ({count} restantes)",
      createdAt: "Créé le {date}",
      deletionRequested: "Suppression demandée par le client",
      revokeTitle: "Révoquer l'accès"
    },
    shareModal: {
      eyebrow: "Portail client",
      title: "Partager un accès",
      subtitle: "Le secret sera chiffré et accessible côté portail client jusqu'à expiration ou épuisement des vues.",
      hint: "Le mot de passe ne sera jamais affiché en clair ici après création. Le client pourra le consulter un nombre limité de fois, puis demander la suppression immédiate.",
      titleLabel: "Titre",
      titlePlaceholder: "Ex : Accès VPN temporaire, Compte admin local…",
      contextLabel: "Contexte (optionnel)",
      contextPlaceholder: "Ex : Pour l'intervention du 27/06 · poste compta",
      loginLabel: "Identifiant / login (optionnel)",
      loginPlaceholder: "Ex : admin@entreprise.fr",
      secretLabel: "Mot de passe / secret",
      secretPlaceholder: "Saisissez ou générez un mot de passe",
      show: "Afficher",
      hide: "Masquer",
      generate: "Générer",
      expiresLabel: "Expiration (jours)",
      maxViewsLabel: "Vues maximum",
      footerHint: "Chiffrement AES-256 côté serveur",
      cancel: "Annuler",
      share: "Partager avec le client",
      sharing: "Partage…",
      close: "Fermer"
    },
    revokeModal: {
      title: "Révoquer l'accès partagé",
      subtitle: "L'accès ne sera plus visible ni utilisable côté portail client.",
      defaultSecretTitle: "Accès partagé",
      contactLine: "Contact : {name}",
      consequences: "Conséquences",
      bulletNoAccess: "Le secret ne pourra plus être consulté par le client.",
      bulletExpiry: "Expiration prévue le {date}{views}.",
      viewsRemaining: " · {count} vue restante",
      viewsRemainingPlural: " · {count} vues restantes",
      bulletImmediate: "Cette action est immédiate et ne peut pas être annulée.",
      cancel: "Annuler",
      revoke: "Révoquer l'accès",
      revoking: "Révocation…",
      close: "Fermer"
    },
    stepper: {
      increase: "Augmenter",
      decrease: "Diminuer"
    },
    toast: {
      loadError: "Impossible de charger les accès partagés.",
      revoked: "Accès révoqué.",
      revokeError: "Impossible de révoquer cet accès.",
      created: "Accès partagé avec le portail client.",
      shareError: "Erreur lors du partage.",
      contactNotFound: "Contact introuvable.",
      clientNotFound: "Entreprise introuvable.",
      titleRequired: "Titre requis.",
      secretRequired: "Mot de passe requis."
    }
  },
  en: {
    availability: {
      active: "Active",
      expired: "Expired",
      exhausted: "Views exhausted",
      revoked: "Revoked",
      deletion_requested: "Deletion requested"
    },
    panel: {
      intro: "Share a password or temporary access with {contact} on their portal · expiry, view limit, client-side deletion.",
      contactFallback: "this contact",
      activeCount: "{count} active access.",
      activeCountPlural: "{count} active accesses.",
      loading: "Loading accesses…",
      empty: "No shared access yet.",
      expiresAt: "Expires {date}",
      views: "Views {used}/{max}",
      viewsRemaining: " ({count} remaining)",
      viewsRemainingPlural: " ({count} remaining)",
      createdAt: "Created {date}",
      deletionRequested: "Deletion requested by client",
      revokeTitle: "Revoke access"
    },
    shareModal: {
      eyebrow: "Client portal",
      title: "Share access",
      subtitle: "The secret will be encrypted and available on the client portal until expiry or views are used up.",
      hint: "The password will never be shown in plain text here after creation. The client can view it a limited number of times, then request immediate deletion.",
      titleLabel: "Title",
      titlePlaceholder: "E.g. Temporary VPN access, Local admin account…",
      contextLabel: "Context (optional)",
      contextPlaceholder: "E.g. For 27/06 intervention · accounting workstation",
      loginLabel: "Username / login (optional)",
      loginPlaceholder: "E.g. admin@company.com",
      secretLabel: "Password / secret",
      secretPlaceholder: "Enter or generate a password",
      show: "Show",
      hide: "Hide",
      generate: "Generate",
      expiresLabel: "Expiry (days)",
      maxViewsLabel: "Maximum views",
      footerHint: "AES-256 encryption on server",
      cancel: "Cancel",
      share: "Share with client",
      sharing: "Sharing…",
      close: "Close"
    },
    revokeModal: {
      title: "Revoke shared access",
      subtitle: "The access will no longer be visible or usable on the client portal.",
      defaultSecretTitle: "Shared access",
      contactLine: "Contact: {name}",
      consequences: "Consequences",
      bulletNoAccess: "The client will no longer be able to view the secret.",
      bulletExpiry: "Scheduled expiry {date}{views}.",
      viewsRemaining: " · {count} view remaining",
      viewsRemainingPlural: " · {count} views remaining",
      bulletImmediate: "This action is immediate and cannot be undone.",
      cancel: "Cancel",
      revoke: "Revoke access",
      revoking: "Revoking…",
      close: "Close"
    },
    stepper: {
      increase: "Increase",
      decrease: "Decrease"
    },
    toast: {
      loadError: "Unable to load shared accesses.",
      revoked: "Access revoked.",
      revokeError: "Unable to revoke this access.",
      created: "Access shared with client portal.",
      shareError: "Error sharing access.",
      contactNotFound: "Contact not found.",
      clientNotFound: "Company not found.",
      titleRequired: "Title is required.",
      secretRequired: "Password is required."
    }
  },
  de: {
    availability: {
      active: "Aktiv",
      expired: "Abgelaufen",
      exhausted: "Aufrufe aufgebraucht",
      revoked: "Widerrufen",
      deletion_requested: "Löschung angefordert"
    },
    panel: {
      intro: "Passwort oder temporären Zugang mit {contact} im Portal teilen · Ablauf, Aufruflimit, Löschung durch Kunden.",
      contactFallback: "diesem Kontakt",
      activeCount: "{count} aktiver Zugang.",
      activeCountPlural: "{count} aktive Zugänge.",
      loading: "Zugänge werden geladen…",
      empty: "Noch keine geteilten Zugänge.",
      expiresAt: "Läuft ab am {date}",
      views: "Aufrufe {used}/{max}",
      viewsRemaining: " ({count} verbleibend)",
      viewsRemainingPlural: " ({count} verbleibend)",
      createdAt: "Erstellt am {date}",
      deletionRequested: "Löschung vom Kunden angefordert",
      revokeTitle: "Zugang widerrufen"
    },
    shareModal: {
      eyebrow: "Kundenportal",
      title: "Zugang teilen",
      subtitle: "Das Secret wird verschlüsselt und im Kundenportal bis Ablauf oder Aufruflimit verfügbar.",
      hint: "Das Passwort wird nach der Erstellung hier nicht mehr im Klartext angezeigt.",
      titleLabel: "Titel",
      titlePlaceholder: "z. B. Temporärer VPN-Zugang…",
      contextLabel: "Kontext (optional)",
      contextPlaceholder: "z. B. Für Einsatz am 27.06",
      loginLabel: "Benutzername (optional)",
      loginPlaceholder: "z. B. admin@firma.de",
      secretLabel: "Passwort / Secret",
      secretPlaceholder: "Passwort eingeben oder generieren",
      show: "Anzeigen",
      hide: "Ausblenden",
      generate: "Generieren",
      expiresLabel: "Ablauf (Tage)",
      maxViewsLabel: "Max. Aufrufe",
      footerHint: "AES-256-Verschlüsselung auf dem Server",
      cancel: "Abbrechen",
      share: "Mit Kunde teilen",
      sharing: "Teilen…",
      close: "Schließen"
    },
    revokeModal: {
      title: "Geteilten Zugang widerrufen",
      subtitle: "Der Zugang ist im Kundenportal nicht mehr sichtbar oder nutzbar.",
      defaultSecretTitle: "Geteilter Zugang",
      contactLine: "Kontakt: {name}",
      consequences: "Folgen",
      bulletNoAccess: "Der Kunde kann das Secret nicht mehr einsehen.",
      bulletExpiry: "Geplanter Ablauf {date}{views}.",
      viewsRemaining: " · {count} Aufruf verbleibend",
      viewsRemainingPlural: " · {count} Aufrufe verbleibend",
      bulletImmediate: "Diese Aktion ist sofort und unwiderruflich.",
      cancel: "Abbrechen",
      revoke: "Zugang widerrufen",
      revoking: "Widerruf…",
      close: "Schließen"
    },
    stepper: {
      increase: "Erhöhen",
      decrease: "Verringern"
    },
    toast: {
      loadError: "Geteilte Zugänge konnten nicht geladen werden.",
      revoked: "Zugang widerrufen.",
      revokeError: "Zugang konnte nicht widerrufen werden.",
      created: "Zugang mit Kundenportal geteilt.",
      shareError: "Fehler beim Teilen.",
      contactNotFound: "Kontakt nicht gefunden.",
      clientNotFound: "Unternehmen nicht gefunden.",
      titleRequired: "Titel erforderlich.",
      secretRequired: "Passwort erforderlich."
    }
  },
  it: {
    availability: {
      active: "Attivo",
      expired: "Scaduto",
      exhausted: "Visualizzazioni esaurite",
      revoked: "Revocato",
      deletion_requested: "Eliminazione richiesta"
    },
    panel: {
      intro: "Condividi password o accesso temporaneo con {contact} sul portale · scadenza, limite visualizzazioni, eliminazione lato cliente.",
      contactFallback: "questo contatto",
      activeCount: "{count} accesso attivo.",
      activeCountPlural: "{count} accessi attivi.",
      loading: "Caricamento accessi…",
      empty: "Nessun accesso condiviso al momento.",
      expiresAt: "Scade il {date}",
      views: "Visualizzazioni {used}/{max}",
      viewsRemaining: " ({count} rimanente)",
      viewsRemainingPlural: " ({count} rimanenti)",
      createdAt: "Creato il {date}",
      deletionRequested: "Eliminazione richiesta dal cliente",
      revokeTitle: "Revoca accesso"
    },
    shareModal: {
      eyebrow: "Portale cliente",
      title: "Condividi accesso",
      subtitle: "Il secret sarà cifrato e accessibile sul portale fino a scadenza o esaurimento visualizzazioni.",
      hint: "La password non sarà più mostrata in chiaro dopo la creazione.",
      titleLabel: "Titolo",
      titlePlaceholder: "Es. Accesso VPN temporaneo…",
      contextLabel: "Contesto (opzionale)",
      contextPlaceholder: "Es. Per intervento del 27/06",
      loginLabel: "Identificativo (opzionale)",
      loginPlaceholder: "Es. admin@azienda.it",
      secretLabel: "Password / secret",
      secretPlaceholder: "Inserisci o genera una password",
      show: "Mostra",
      hide: "Nascondi",
      generate: "Genera",
      expiresLabel: "Scadenza (giorni)",
      maxViewsLabel: "Visualizzazioni max",
      footerHint: "Crittografia AES-256 lato server",
      cancel: "Annulla",
      share: "Condividi con il cliente",
      sharing: "Condivisione…",
      close: "Chiudi"
    },
    revokeModal: {
      title: "Revoca accesso condiviso",
      subtitle: "L'accesso non sarà più visibile o utilizzabile sul portale cliente.",
      defaultSecretTitle: "Accesso condiviso",
      contactLine: "Contatto: {name}",
      consequences: "Conseguenze",
      bulletNoAccess: "Il cliente non potrà più consultare il secret.",
      bulletExpiry: "Scadenza prevista {date}{views}.",
      viewsRemaining: " · {count} visualizzazione rimanente",
      viewsRemainingPlural: " · {count} visualizzazioni rimanenti",
      bulletImmediate: "Azione immediata e irreversibile.",
      cancel: "Annulla",
      revoke: "Revoca accesso",
      revoking: "Revoca…",
      close: "Chiudi"
    },
    stepper: {
      increase: "Aumenta",
      decrease: "Diminuisci"
    },
    toast: {
      loadError: "Impossibile caricare gli accessi condivisi.",
      revoked: "Accesso revocato.",
      revokeError: "Impossibile revocare l'accesso.",
      created: "Accesso condiviso sul portale cliente.",
      shareError: "Errore durante la condivisione.",
      contactNotFound: "Contatto non trovato.",
      clientNotFound: "Azienda non trovata.",
      titleRequired: "Titolo obbligatorio.",
      secretRequired: "Password obbligatoria."
    }
  },
  es: {
    availability: {
      active: "Activo",
      expired: "Caducado",
      exhausted: "Vistas agotadas",
      revoked: "Revocado",
      deletion_requested: "Eliminación solicitada"
    },
    panel: {
      intro: "Comparta contraseña o acceso temporal con {contact} en su portal · caducidad, límite de vistas, eliminación por el cliente.",
      contactFallback: "este contacto",
      activeCount: "{count} acceso activo.",
      activeCountPlural: "{count} accesos activos.",
      loading: "Cargando accesos…",
      empty: "Ningún acceso compartido por ahora.",
      expiresAt: "Caduca el {date}",
      views: "Vistas {used}/{max}",
      viewsRemaining: " ({count} restante)",
      viewsRemainingPlural: " ({count} restantes)",
      createdAt: "Creado el {date}",
      deletionRequested: "Eliminación solicitada por el cliente",
      revokeTitle: "Revocar acceso"
    },
    shareModal: {
      eyebrow: "Portal cliente",
      title: "Compartir acceso",
      subtitle: "El secreto se cifrará y estará disponible en el portal hasta caducidad o agotar vistas.",
      hint: "La contraseña no se mostrará en claro aquí tras la creación.",
      titleLabel: "Título",
      titlePlaceholder: "Ej. Acceso VPN temporal…",
      contextLabel: "Contexto (opcional)",
      contextPlaceholder: "Ej. Para intervención del 27/06",
      loginLabel: "Identificador (opcional)",
      loginPlaceholder: "Ej. admin@empresa.es",
      secretLabel: "Contraseña / secreto",
      secretPlaceholder: "Introduzca o genere una contraseña",
      show: "Mostrar",
      hide: "Ocultar",
      generate: "Generar",
      expiresLabel: "Caducidad (días)",
      maxViewsLabel: "Vistas máximas",
      footerHint: "Cifrado AES-256 en servidor",
      cancel: "Cancelar",
      share: "Compartir con el cliente",
      sharing: "Compartiendo…",
      close: "Cerrar"
    },
    revokeModal: {
      title: "Revocar acceso compartido",
      subtitle: "El acceso ya no será visible ni utilizable en el portal cliente.",
      defaultSecretTitle: "Acceso compartido",
      contactLine: "Contacto: {name}",
      consequences: "Consecuencias",
      bulletNoAccess: "El cliente ya no podrá consultar el secreto.",
      bulletExpiry: "Caducidad prevista {date}{views}.",
      viewsRemaining: " · {count} vista restante",
      viewsRemainingPlural: " · {count} vistas restantes",
      bulletImmediate: "Acción inmediata e irreversible.",
      cancel: "Cancelar",
      revoke: "Revocar acceso",
      revoking: "Revocando…",
      close: "Cerrar"
    },
    stepper: {
      increase: "Aumentar",
      decrease: "Disminuir"
    },
    toast: {
      loadError: "No se pudieron cargar los accesos compartidos.",
      revoked: "Acceso revocado.",
      revokeError: "No se pudo revocar el acceso.",
      created: "Acceso compartido en el portal cliente.",
      shareError: "Error al compartir.",
      contactNotFound: "Contacto no encontrado.",
      clientNotFound: "Empresa no encontrada.",
      titleRequired: "Título obligatorio.",
      secretRequired: "Contraseña obligatoria."
    }
  }
};
export const getVaultSecretsCopy = createLocaleGetter(VAULT_SECRETS_COPY);
export function getVaultSecretAvailabilityLabel(availability, locale) {
  const labels = getVaultSecretsCopy(locale).availability;
  const key = String(availability || "").toLowerCase();
  return labels[key] || availability || "-";
}
export function getVaultSecretAvailabilityLabels(locale) {
  const labels = getVaultSecretsCopy(locale).availability;
  return AVAILABILITY_KEYS.reduce((acc, key) => {
    acc[key] = labels[key];
    return acc;
  }, {});
}
export { interpolate };
