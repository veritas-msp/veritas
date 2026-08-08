import { createLocaleGetter } from "../../i18n/translate";
const MFA_ENROLLMENT_COPY = {
  fr: {
    prompt: {
      title: "Sécurisez votre compte",
      text: "L'authentification à deux facteurs (MFA) ajoute une couche de protection à votre compte Veritas. Scannez un QR code avec une application comme Microsoft Authenticator ou Google Authenticator.",
      hint: "Cette invitation s'affiche une seule fois après votre connexion, tant que le MFA n'est pas activé.",
      configure: "Configurer le MFA",
      later: "Plus tard",
      loading: "Chargement…"
    },
    setup: {
      title: "Scannez le QR code",
      text: "Ajoutez Veritas dans votre application d'authentification, puis saisissez le code à 6 chiffres.",
      manualKey: "Clé manuelle :",
      codePlaceholder: "000000",
      activate: "Activer le MFA",
      verifying: "Vérification…",
      back: "Retour"
    },
    qrAlt: "QR code MFA",
    toasts: {
      enabled: "Authentification à deux facteurs activée."
    }
  },
  en: {
    prompt: {
      title: "Secure your account",
      text: "Two-factor authentication (MFA) adds an extra layer of protection to your Veritas account. Scan a QR code with an app such as Microsoft Authenticator or Google Authenticator.",
      hint: "This prompt appears once after you sign in, until MFA is enabled.",
      configure: "Set up MFA",
      later: "Later",
      loading: "Loading…"
    },
    setup: {
      title: "Scan the QR code",
      text: "Add Veritas to your authenticator app, then enter the 6-digit code.",
      manualKey: "Manual key:",
      codePlaceholder: "000000",
      activate: "Enable MFA",
      verifying: "Verifying…",
      back: "Back"
    },
    qrAlt: "MFA QR code",
    toasts: {
      enabled: "Two-factor authentication has been enabled."
    }
  },
  de: {
    prompt: {
      title: "Sichern Sie Ihr Konto",
      text: "Die Zwei-Faktor-Authentifizierung (MFA) schützt Ihr Veritas-Konto zusätzlich. Scannen Sie einen QR-Code mit einer App wie Microsoft Authenticator oder Google Authenticator.",
      hint: "Diese Aufforderung erscheint einmal nach der Anmeldung, bis MFA aktiviert ist.",
      configure: "MFA einrichten",
      later: "Später",
      loading: "Laden…"
    },
    setup: {
      title: "QR-Code scannen",
      text: "Fügen Sie Veritas in Ihrer Authenticator-App hinzu und geben Sie den 6-stelligen Code ein.",
      manualKey: "Manueller Schlüssel:",
      codePlaceholder: "000000",
      activate: "MFA aktivieren",
      verifying: "Überprüfung…",
      back: "Zurück"
    },
    qrAlt: "MFA-QR-Code",
    toasts: {
      enabled: "Zwei-Faktor-Authentifizierung wurde aktiviert."
    }
  },
  it: {
    prompt: {
      title: "Proteggi il tuo account",
      text: "L'autenticazione a due fattori (MFA) aggiunge un ulteriore livello di protezione al tuo account Veritas. Scansiona un codice QR con un'app come Microsoft Authenticator o Google Authenticator.",
      hint: "Questo invito viene mostrato una sola volta dopo l'accesso, finché il MFA non è attivo.",
      configure: "Configura MFA",
      later: "Più tardi",
      loading: "Caricamento…"
    },
    setup: {
      title: "Scansiona il codice QR",
      text: "Aggiungi Veritas nella tua app di autenticazione, poi inserisci il codice a 6 cifre.",
      manualKey: "Chiave manuale:",
      codePlaceholder: "000000",
      activate: "Attiva MFA",
      verifying: "Verifica…",
      back: "Indietro"
    },
    qrAlt: "Codice QR MFA",
    toasts: {
      enabled: "Autenticazione a due fattori attivata."
    }
  },
  es: {
    prompt: {
      title: "Proteja su cuenta",
      text: "La autenticación de dos factores (MFA) añade una capa extra de protección a su cuenta Veritas. Escanee un código QR con una aplicación como Microsoft Authenticator o Google Authenticator.",
      hint: "Este aviso se muestra una sola vez después de iniciar sesión, hasta que el MFA esté activado.",
      configure: "Configurar MFA",
      later: "Más tarde",
      loading: "Cargando…"
    },
    setup: {
      title: "Escanee el código QR",
      text: "Añada Veritas en su aplicación de autenticación y luego introduzca el código de 6 dígitos.",
      manualKey: "Clave manual:",
      codePlaceholder: "000000",
      activate: "Activar MFA",
      verifying: "Verificando…",
      back: "Volver"
    },
    qrAlt: "Código QR MFA",
    toasts: {
      enabled: "Autenticación de dos factores activada."
    }
  }
};
export const getMfaEnrollmentCopy = createLocaleGetter(MFA_ENROLLMENT_COPY);
