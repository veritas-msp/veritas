import { createLocaleGetter, interpolate } from "../../../i18n/translate";
import { getLocaleTag } from "../../../i18n/locales";
import { IN_APP_EVENT_OPTIONS } from "../../../utils/inAppNotificationSettings";
const USER_PROFILE_COPY = {
  fr: {
    loading: "Chargement de votre compte…",
    loadError: "Impossible de charger votre profil",
    loadProfileError: "Impossible de charger votre profil.",
    accountDisabled: "Votre compte est désactivé. Contactez un administrateur pour rétablir l'accès.",
    eyebrow: "Compte utilisateur",
    pageTitle: "Mon compte",
    kpi: {
      role: "Rôle",
      mfa: "Authentification MFA",
      mspProfile: "Profil MSP"
    },
    roles: {
      admin: "Administrateur",
      superviseur: "Superviseur",
      utilisateur: "Utilisateur",
      client: "Client portail"
    },
    mfa: {
      enabled: "Activé",
      pending: "Configuration en cours",
      off: "Désactivé",
      enabledDesc: "Votre compte est protégé par un code à usage unique généré par une application d'authentification.",
      pendingDesc: "La configuration MFA a été démarrée mais n'est pas terminée. Scannez le QR code et validez un code pour finaliser.",
      offDesc: "Ajoutez une couche de sécurité avec Microsoft Authenticator, Google Authenticator ou une application compatible TOTP.",
      continueSetup: "Continuer la configuration",
      enable: "Activer le MFA"
    },
    sections: {
      identity: {
        title: "Identité",
        description: "Pseudo de connexion, e-mail et mot de passe"
      },
      photo: {
        title: "Photo de profil",
        description: "Avatar affiché dans le chat support et votre menu compte"
      },
      security: {
        title: "Sécurité",
        description: "Authentification à deux facteurs (MFA)"
      },
      helpdesk: {
        title: "Helpdesk · pseudo tickets",
        description: "Nom affiché aux clients dans les échanges de tickets"
      },
      accessibility: {
        title: "Accessibilité · chat tickets",
        description: "Taille du texte et espacement des messages dans le fil de discussion (personnel)"
      },
      notifications: {
        title: "Notifications in-app",
        globallyDisabled: "Désactivées globalement par votre administrateur.",
        activeCount: "{count}/{total} types d'alertes actifs pour vous.",
        allDisabled: "Vous avez désactivé toutes les alertes in-app."
      },
      mspProfile: {
        title: "Profil MSP",
        description: "Droits et modules attribués par votre administrateur (lecture seule)"
      },
      activity: {
        title: "Activité du compte",
        description: "Informations de connexion"
      }
    },
    identity: {
      username: "Pseudo",
      usernameHint: "Utilisé pour vous identifier dans l'application",
      email: "Adresse e-mail",
      emailHint: "Utilisée pour la connexion et les notifications",
      password: "Mot de passe",
      passwordHint: "Modifiez régulièrement pour sécuriser votre compte",
      editUsername: "Modifier le pseudo",
      editEmail: "Modifier l'e-mail",
      changePassword: "Changer le mot de passe"
    },
    helpdesk: {
      label: "Pseudo helpdesk",
      hint: "Laissez vide pour utiliser votre pseudo de connexion",
      placeholder: "Ex. Jean D.",
      preview: "Aperçu côté client :",
      save: "Enregistrer",
      saving: "Enregistrement…"
    },
    chat: {
      previewLabel: "Aperçu du chat",
      agentMessage: "Bonjour, nous avons bien pris en charge votre ticket et nous revenons vers vous rapidement.",
      clientLabel: "Client",
      clientMessage: "Merci, je reste disponible si vous avez besoin d'informations complémentaires.",
      textSize: "Taille du texte",
      messageSpacing: "Espacement entre les messages",
      savePrefs: "Enregistrer les préférences",
      saving: "Enregistrement…"
    },
    notifications: {
      adminBanner: "Les notifications in-app sont coupées au niveau de l'organisation. Contactez un administrateur pour les réactiver.",
      masterLabel: "Recevoir les notifications in-app",
      masterHint: "Cloche dans la sidebar et badges sur les tickets assignés",
      adminDisabledHint: "Non proposé par la configuration globale de votre organisation",
      hint: "Les paramètres globaux définissent ce qui est disponible. Vous pouvez les restreindre pour votre compte, pas les étendre au-delà.",
      reset: "Réinitialiser",
      save: "Enregistrer",
      saving: "Enregistrement…",
      events: {
        ticket_commented: {
          label: "Commentaire ajouté",
          description: "Alerte lors d'un nouveau message sur un ticket suivi."
        },
        ticket_assigned: {
          label: "Assignation",
          description: "Alerte quand un agent est ajouté comme assigné."
        },
        ticket_created: {
          label: "Création de ticket",
          description: "Alerte à la création du ticket."
        },
        ticket_updated: {
          label: "Modification de ticket",
          description: "Alerte lors d'une mise à jour (statut, priorité, etc.)."
        },
        ticket_resolved: {
          label: "Résolution de ticket",
          description: "Alerte quand un ticket passe en résolu."
        },
        ticket_satisfaction: {
          label: "Retour satisfaction client",
          description: "Alerte quand un client laisse une note sur un ticket terminé."
        },
        ticket_validation_requested: {
          label: "Demande de validation",
          description: "Alerte quand on vous demande de valider un ticket."
        },
        ticket_validation_responded: {
          label: "Réponse de validation",
          description: "Alerte quand votre demande de validation est acceptée ou refusée."
        }
      }
    },
    mspModules: {
      contrat_enabled: "Entreprise",
      contact_enabled: "Contacts",
      infrastructure_enabled: "Infrastructure",
      cybersecurite_enabled: "Cybersécurité",
      service_enabled: "Services",
      monitoring_enabled: "Rapports",
      tickets_enabled: "Support",
      planning_enabled: "Planning",
      configurateur_enabled: "Configurateur",
      dashboard_enabled: "Tableau de bord",
      accessGranted: "Accès autorisé",
      accessDenied: "Accès non autorisé"
    },
    activity: {
      created: "Compte créé",
      lastLogin: "Dernière connexion"
    },
    modals: {
      username: {
        title: "Modifier le pseudo",
        label: "Nouveau pseudo",
        hint: "2 à 50 caractères",
        placeholder: "Votre pseudo"
      },
      email: {
        title: "Modifier l'adresse e-mail",
        label: "Nouvelle adresse e-mail"
      },
      password: {
        title: "Changer le mot de passe",
        label: "Nouveau mot de passe",
        hint: "Minimum 6 caractères",
        confirm: "Confirmer le mot de passe",
        confirmAction: "Mettre à jour"
      },
      mfa: {
        title: "Configurer l'authentification à deux facteurs",
        desc: "Scannez ce QR code avec votre application d'authentification, puis saisissez le code à 6 chiffres.",
        qrAlt: "QR code MFA",
        manualKey: "Clé manuelle :",
        enable: "Activer le MFA"
      },
      save: "Enregistrer"
    },
    toast: {
      loadError: "Impossible de charger votre profil",
      usernameTooShort: "Le pseudo doit contenir au moins 2 caractères",
      usernameUpdated: "Pseudo mis à jour",
      usernameError: "Erreur lors de la mise à jour du pseudo",
      emailInvalid: "Adresse e-mail invalide",
      emailUpdated: "Adresse e-mail mise à jour",
      emailError: "Erreur lors de la mise à jour de l'e-mail",
      passwordTooShort: "Minimum 6 caractères",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      passwordUpdated: "Mot de passe mis à jour",
      passwordError: "Erreur lors de la mise à jour du mot de passe",
      helpdeskSaved: "Pseudo helpdesk enregistré",
      helpdeskError: "Erreur lors de l'enregistrement",
      chatUiSaved: "Préférences d'affichage enregistrées",
      chatUiError: "Erreur lors de l'enregistrement des préférences",
      notifSaved: "Préférences de notifications enregistrées",
      notifError: "Erreur lors de l'enregistrement des notifications",
      mfaSetupError: "Erreur configuration MFA",
      mfaEnabled: "Authentification à deux facteurs activée",
      mfaInvalidCode: "Code invalide"
    },
    defaultAgent: "Agent"
  },
  en: {
    loading: "Loading your account…",
    loadError: "Unable to load your profile",
    loadProfileError: "Unable to load your profile.",
    accountDisabled: "Your account is disabled. Contact an administrator to restore access.",
    eyebrow: "User account",
    pageTitle: "My account",
    kpi: {
      role: "Role",
      mfa: "MFA authentication",
      mspProfile: "MSP profile"
    },
    roles: {
      admin: "Administrator",
      superviseur: "Supervisor",
      utilisateur: "User",
      client: "Portal client"
    },
    mfa: {
      enabled: "Enabled",
      pending: "Setup in progress",
      off: "Disabled",
      enabledDesc: "Your account is protected by a one-time code generated by an authentication app.",
      pendingDesc: "MFA setup was started but not completed. Scan the QR code and validate a code to finish.",
      offDesc: "Add a security layer with Microsoft Authenticator, Google Authenticator or a TOTP-compatible app.",
      continueSetup: "Continue setup",
      enable: "Enable MFA"
    },
    sections: {
      identity: {
        title: "Identity",
        description: "Login nickname, email and password"
      },
      photo: {
        title: "Profile picture",
        description: "Avatar shown in support chat and your account menu"
      },
      security: {
        title: "Security",
        description: "Two-factor authentication (MFA)"
      },
      helpdesk: {
        title: "Helpdesk · ticket nickname",
        description: "Name shown to customers in ticket exchanges"
      },
      accessibility: {
        title: "Accessibility · ticket chat",
        description: "Text size and message spacing in the discussion thread (personal)"
      },
      notifications: {
        title: "In-app notifications",
        globallyDisabled: "Disabled globally by your administrator.",
        activeCount: "{count}/{total} alert types active for you.",
        allDisabled: "You have disabled all in-app alerts."
      },
      mspProfile: {
        title: "MSP profile",
        description: "Rights and modules assigned by your administrator (read-only)"
      },
      activity: {
        title: "Account activity",
        description: "Login information"
      }
    },
    identity: {
      username: "Nickname",
      usernameHint: "Used to identify you in the application",
      email: "Email address",
      emailHint: "Used for login and notifications",
      password: "Password",
      passwordHint: "Change regularly to secure your account",
      editUsername: "Edit nickname",
      editEmail: "Edit email",
      changePassword: "Change password"
    },
    helpdesk: {
      label: "Helpdesk nickname",
      hint: "Leave blank to use your login nickname",
      placeholder: "e.g. John D.",
      preview: "Customer-side preview:",
      save: "Save",
      saving: "Saving…"
    },
    chat: {
      previewLabel: "Chat preview",
      agentMessage: "Hello, we have received your ticket and will get back to you shortly.",
      clientLabel: "Customer",
      clientMessage: "Thank you, I remain available if you need further information.",
      textSize: "Text size",
      messageSpacing: "Spacing between messages",
      savePrefs: "Save preferences",
      saving: "Saving…"
    },
    notifications: {
      adminBanner: "In-app notifications are disabled at the organisation level. Contact an administrator to re-enable them.",
      masterLabel: "Receive in-app notifications",
      masterHint: "Bell in the sidebar and badges on assigned tickets",
      adminDisabledHint: "Not offered by your organisation's global configuration",
      hint: "Global settings define what is available. You can restrict them for your account, not extend them beyond.",
      reset: "Reset",
      save: "Save",
      saving: "Saving…",
      events: {
        ticket_commented: {
          label: "Comment added",
          description: "Alert when a new message is posted on a followed ticket."
        },
        ticket_assigned: {
          label: "Assignment",
          description: "Alert when an agent is added as assignee."
        },
        ticket_created: {
          label: "Ticket created",
          description: "Alert when a ticket is created."
        },
        ticket_updated: {
          label: "Ticket updated",
          description: "Alert on an update (status, priority, etc.)."
        },
        ticket_resolved: {
          label: "Ticket resolved",
          description: "Alert when a ticket is marked resolved."
        },
        ticket_satisfaction: {
          label: "Customer satisfaction feedback",
          description: "Alert when a customer rates a completed ticket."
        },
        ticket_validation_requested: {
          label: "Validation requested",
          description: "Alert when someone asks you to validate a ticket."
        },
        ticket_validation_responded: {
          label: "Validation answered",
          description: "Alert when your validation request is approved or rejected."
        }
      }
    },
    mspModules: {
      contrat_enabled: "Company",
      contact_enabled: "Contacts",
      infrastructure_enabled: "Infrastructure",
      cybersecurite_enabled: "Cybersecurity",
      service_enabled: "Services",
      monitoring_enabled: "Reports",
      tickets_enabled: "Support",
      planning_enabled: "Scheduling",
      configurateur_enabled: "Configurator",
      dashboard_enabled: "Dashboard",
      accessGranted: "Access granted",
      accessDenied: "Access denied"
    },
    activity: {
      created: "Account created",
      lastLogin: "Last login"
    },
    modals: {
      username: {
        title: "Edit nickname",
        label: "New nickname",
        hint: "2 to 50 characters",
        placeholder: "Your nickname"
      },
      email: {
        title: "Edit email address",
        label: "New email address"
      },
      password: {
        title: "Change password",
        label: "New password",
        hint: "Minimum 6 characters",
        confirm: "Confirm password",
        confirmAction: "Update"
      },
      mfa: {
        title: "Set up two-factor authentication",
        desc: "Scan this QR code with your authentication app, then enter the 6-digit code.",
        qrAlt: "MFA QR code",
        manualKey: "Manual key:",
        enable: "Enable MFA"
      },
      save: "Save"
    },
    toast: {
      loadError: "Unable to load your profile",
      usernameTooShort: "Nickname must be at least 2 characters",
      usernameUpdated: "Nickname updated",
      usernameError: "Error updating nickname",
      emailInvalid: "Invalid email address",
      emailUpdated: "Email address updated",
      emailError: "Error updating email",
      passwordTooShort: "Minimum 6 characters",
      passwordMismatch: "Passwords do not match",
      passwordUpdated: "Password updated",
      passwordError: "Error updating password",
      helpdeskSaved: "Helpdesk nickname saved",
      helpdeskError: "Error saving",
      chatUiSaved: "Display preferences saved",
      chatUiError: "Error saving preferences",
      notifSaved: "Notification preferences saved",
      notifError: "Error saving notifications",
      mfaSetupError: "MFA setup error",
      mfaEnabled: "Two-factor authentication enabled",
      mfaInvalidCode: "Invalid code"
    },
    defaultAgent: "Agent"
  },
  de: {
    loading: "Konto wird geladen…",
    loadError: "Profil konnte nicht geladen werden",
    loadProfileError: "Profil konnte nicht geladen werden.",
    accountDisabled: "Ihr Konto ist deaktiviert. Wenden Sie sich an einen Administrator, um den Zugang wiederherzustellen.",
    eyebrow: "Benutzerkonto",
    pageTitle: "Mein Konto",
    kpi: {
      role: "Rolle",
      mfa: "MFA-Authentifizierung",
      mspProfile: "MSP-Profil"
    },
    roles: {
      admin: "Administrator",
      superviseur: "Supervisor",
      utilisateur: "Benutzer",
      client: "Portal-Kunde"
    },
    mfa: {
      enabled: "Aktiviert",
      pending: "Einrichtung läuft",
      off: "Deaktiviert",
      enabledDesc: "Ihr Konto ist durch einen Einmalcode aus einer Authentifizierungs-App geschützt.",
      pendingDesc: "Die MFA-Einrichtung wurde gestartet, aber nicht abgeschlossen. Scannen Sie den QR-Code und bestätigen Sie einen Code.",
      offDesc: "Fügen Sie eine Sicherheitsebene mit Microsoft Authenticator, Google Authenticator oder einer TOTP-kompatiblen App hinzu.",
      continueSetup: "Einrichtung fortsetzen",
      enable: "MFA aktivieren"
    },
    sections: {
      identity: {
        title: "Identität",
        description: "Anmeldename, E-Mail und Passwort"
      },
      photo: {
        title: "Profilbild",
        description: "Avatar im Support-Chat und im Kontomenü"
      },
      security: {
        title: "Sicherheit",
        description: "Zwei-Faktor-Authentifizierung (MFA)"
      },
      helpdesk: {
        title: "Helpdesk · Ticket-Pseudonym",
        description: "Name, der Kunden in Ticket-Austauschen angezeigt wird"
      },
      accessibility: {
        title: "Barrierefreiheit · Ticket-Chat",
        description: "Textgröße und Nachrichtenabstand im Verlauf (persönlich)"
      },
      notifications: {
        title: "In-App-Benachrichtigungen",
        globallyDisabled: "Global durch Ihren Administrator deaktiviert.",
        activeCount: "{count}/{total} aktive Alert-Typen für Sie.",
        allDisabled: "Sie haben alle In-App-Alerts deaktiviert."
      },
      mspProfile: {
        title: "MSP-Profil",
        description: "Vom Administrator zugewiesene Rechte und Module (nur Lesen)"
      },
      activity: {
        title: "Kontoaktivität",
        description: "Anmeldeinformationen"
      }
    },
    identity: {
      username: "Pseudonym",
      usernameHint: "Zur Identifikation in der Anwendung",
      email: "E-Mail-Adresse",
      emailHint: "Für Anmeldung und Benachrichtigungen",
      password: "Passwort",
      passwordHint: "Ändern Sie es regelmäßig, um Ihr Konto zu sichern",
      editUsername: "Pseudonym bearbeiten",
      editEmail: "E-Mail bearbeiten",
      changePassword: "Passwort ändern"
    },
    helpdesk: {
      label: "Helpdesk-Pseudonym",
      hint: "Leer lassen, um Ihr Anmeldepseudonym zu verwenden",
      placeholder: "z. B. Max M.",
      preview: "Vorschau für Kunden:",
      save: "Speichern",
      saving: "Speichern…"
    },
    chat: {
      previewLabel: "Chat-Vorschau",
      agentMessage: "Guten Tag, wir haben Ihr Ticket übernommen und melden uns in Kürze.",
      clientLabel: "Kunde",
      clientMessage: "Danke, ich stehe für weitere Informationen zur Verfügung.",
      textSize: "Textgröße",
      messageSpacing: "Abstand zwischen Nachrichten",
      savePrefs: "Einstellungen speichern",
      saving: "Speichern…"
    },
    notifications: {
      adminBanner: "In-App-Benachrichtigungen sind auf Organisationsebene deaktiviert. Wenden Sie sich an einen Administrator.",
      masterLabel: "In-App-Benachrichtigungen erhalten",
      masterHint: "Glocke in der Sidebar und Badges bei zugewiesenen Tickets",
      adminDisabledHint: "Nicht in der globalen Konfiguration Ihrer Organisation verfügbar",
      hint: "Globale Einstellungen legen fest, was verfügbar ist. Sie können sie für Ihr Konto einschränken, nicht erweitern.",
      reset: "Zurücksetzen",
      save: "Speichern",
      saving: "Speichern…",
      events: {
        ticket_commented: {
          label: "Kommentar hinzugefügt",
          description: "Alert bei einer neuen Nachricht auf einem verfolgten Ticket."
        },
        ticket_assigned: {
          label: "Zuweisung",
          description: "Alert, wenn ein Agent als Zuständiger hinzugefügt wird."
        },
        ticket_created: {
          label: "Ticket erstellt",
          description: "Alert bei Erstellung eines Tickets."
        },
        ticket_updated: {
          label: "Ticket aktualisiert",
          description: "Alert bei einer Aktualisierung (Status, Priorität usw.)."
        },
        ticket_resolved: {
          label: "Ticket gelöst",
          description: "Alert, wenn ein Ticket als gelöst markiert wird."
        },
        ticket_satisfaction: {
          label: "Kundenzufriedenheit",
          description: "Alert, wenn ein Kunde ein abgeschlossenes Ticket bewertet."
        },
        ticket_validation_requested: {
          label: "Validierung angefordert",
          description: "Alert, wenn Sie gebeten werden, ein Ticket zu validieren."
        },
        ticket_validation_responded: {
          label: "Validierungsantwort",
          description: "Alert, wenn Ihre Validierungsanfrage genehmigt oder abgelehnt wird."
        }
      }
    },
    mspModules: {
      contrat_enabled: "Unternehmen",
      contact_enabled: "Kontakte",
      infrastructure_enabled: "Infrastruktur",
      cybersecurite_enabled: "Cybersicherheit",
      service_enabled: "Services",
      monitoring_enabled: "Berichte",
      tickets_enabled: "Support",
      planning_enabled: "Planung",
      configurateur_enabled: "Konfigurator",
      dashboard_enabled: "Dashboard",
      accessGranted: "Zugang erlaubt",
      accessDenied: "Zugang verweigert"
    },
    activity: {
      created: "Konto erstellt",
      lastLogin: "Letzte Anmeldung"
    },
    modals: {
      username: {
        title: "Pseudonym bearbeiten",
        label: "Neues Pseudonym",
        hint: "2 bis 50 Zeichen",
        placeholder: "Ihr Pseudonym"
      },
      email: {
        title: "E-Mail-Adresse bearbeiten",
        label: "Neue E-Mail-Adresse"
      },
      password: {
        title: "Passwort ändern",
        label: "Neues Passwort",
        hint: "Mindestens 6 Zeichen",
        confirm: "Passwort bestätigen",
        confirmAction: "Aktualisieren"
      },
      mfa: {
        title: "Zwei-Faktor-Authentifizierung einrichten",
        desc: "Scannen Sie diesen QR-Code mit Ihrer Authentifizierungs-App und geben Sie den 6-stelligen Code ein.",
        qrAlt: "MFA-QR-Code",
        manualKey: "Manueller Schlüssel:",
        enable: "MFA aktivieren"
      },
      save: "Speichern"
    },
    toast: {
      loadError: "Profil konnte nicht geladen werden",
      usernameTooShort: "Das Pseudonym muss mindestens 2 Zeichen haben",
      usernameUpdated: "Pseudonym aktualisiert",
      usernameError: "Fehler beim Aktualisieren des Pseudonyms",
      emailInvalid: "Ungültige E-Mail-Adresse",
      emailUpdated: "E-Mail-Adresse aktualisiert",
      emailError: "Fehler beim Aktualisieren der E-Mail",
      passwordTooShort: "Mindestens 6 Zeichen",
      passwordMismatch: "Passwörter stimmen nicht überein",
      passwordUpdated: "Passwort aktualisiert",
      passwordError: "Fehler beim Aktualisieren des Passworts",
      helpdeskSaved: "Helpdesk-Pseudonym gespeichert",
      helpdeskError: "Fehler beim Speichern",
      chatUiSaved: "Anzeigeeinstellungen gespeichert",
      chatUiError: "Fehler beim Speichern der Einstellungen",
      notifSaved: "Benachrichtigungseinstellungen gespeichert",
      notifError: "Fehler beim Speichern der Benachrichtigungen",
      mfaSetupError: "Fehler bei der MFA-Einrichtung",
      mfaEnabled: "Zwei-Faktor-Authentifizierung aktiviert",
      mfaInvalidCode: "Ungültiger Code"
    },
    defaultAgent: "Agent"
  },
  it: {
    loading: "Caricamento del tuo account…",
    loadError: "Impossibile caricare il profilo",
    loadProfileError: "Impossibile caricare il profilo.",
    accountDisabled: "Il tuo account è disattivato. Contatta un amministratore per ripristinare l'accesso.",
    eyebrow: "Account utente",
    pageTitle: "Il mio account",
    kpi: {
      role: "Ruolo",
      mfa: "Autenticazione MFA",
      mspProfile: "Profilo MSP"
    },
    roles: {
      admin: "Amministratore",
      superviseur: "Supervisore",
      utilisateur: "Utente",
      client: "Cliente portale"
    },
    mfa: {
      enabled: "Attivato",
      pending: "Configurazione in corso",
      off: "Disattivato",
      enabledDesc: "Il tuo account è protetto da un codice monouso generato da un'app di autenticazione.",
      pendingDesc: "La configurazione MFA è stata avviata ma non completata. Scansiona il QR code e convalida un codice.",
      offDesc: "Aggiungi un livello di sicurezza con Microsoft Authenticator, Google Authenticator o un'app compatibile TOTP.",
      continueSetup: "Continua la configurazione",
      enable: "Attiva MFA"
    },
    sections: {
      identity: {
        title: "Identità",
        description: "Nickname di accesso, e-mail e password"
      },
      photo: {
        title: "Foto del profilo",
        description: "Avatar mostrato nella chat di supporto e nel menu account"
      },
      security: {
        title: "Sicurezza",
        description: "Autenticazione a due fattori (MFA)"
      },
      helpdesk: {
        title: "Helpdesk · nickname ticket",
        description: "Nome mostrato ai clienti negli scambi dei ticket"
      },
      accessibility: {
        title: "Accessibilità · chat ticket",
        description: "Dimensione testo e spaziatura messaggi nel filo discussione (personale)"
      },
      notifications: {
        title: "Notifiche in-app",
        globallyDisabled: "Disattivate globalmente dal tuo amministratore.",
        activeCount: "{count}/{total} tipi di alert attivi per te.",
        allDisabled: "Hai disattivato tutti gli alert in-app."
      },
      mspProfile: {
        title: "Profilo MSP",
        description: "Diritti e moduli assegnati dal tuo amministratore (sola lettura)"
      },
      activity: {
        title: "Attività account",
        description: "Informazioni di accesso"
      }
    },
    identity: {
      username: "Nickname",
      usernameHint: "Usato per identificarti nell'applicazione",
      email: "Indirizzo e-mail",
      emailHint: "Usato per l'accesso e le notifiche",
      password: "Password",
      passwordHint: "Modificala regolarmente per proteggere il tuo account",
      editUsername: "Modifica nickname",
      editEmail: "Modifica e-mail",
      changePassword: "Cambia password"
    },
    helpdesk: {
      label: "Nickname helpdesk",
      hint: "Lascia vuoto per usare il tuo nickname di accesso",
      placeholder: "Es. Mario R.",
      preview: "Anteprima lato cliente:",
      save: "Salva",
      saving: "Salvataggio…"
    },
    chat: {
      previewLabel: "Anteprima chat",
      agentMessage: "Buongiorno, abbiamo preso in carico il tuo ticket e ti risponderemo a breve.",
      clientLabel: "Cliente",
      clientMessage: "Grazie, resto disponibile se avete bisogno di ulteriori informazioni.",
      textSize: "Dimensione testo",
      messageSpacing: "Spaziatura tra i messaggi",
      savePrefs: "Salva preferenze",
      saving: "Salvataggio…"
    },
    notifications: {
      adminBanner: "Le notifiche in-app sono disattivate a livello organizzativo. Contatta un amministratore per riattivarle.",
      masterLabel: "Ricevi notifiche in-app",
      masterHint: "Campanella nella sidebar e badge sui ticket assegnati",
      adminDisabledHint: "Non previsto dalla configurazione globale della tua organizzazione",
      hint: "Le impostazioni globali definiscono ciò che è disponibile. Puoi limitarle per il tuo account, non estenderle.",
      reset: "Reimposta",
      save: "Salva",
      saving: "Salvataggio…",
      events: {
        ticket_commented: {
          label: "Commento aggiunto",
          description: "Alert per un nuovo messaggio su un ticket seguito."
        },
        ticket_assigned: {
          label: "Assegnazione",
          description: "Alert quando un agente viene aggiunto come assegnatario."
        },
        ticket_created: {
          label: "Ticket creato",
          description: "Alert alla creazione del ticket."
        },
        ticket_updated: {
          label: "Ticket modificato",
          description: "Alert in caso di aggiornamento (stato, priorità, ecc.)."
        },
        ticket_resolved: {
          label: "Ticket risolto",
          description: "Alert quando un ticket viene contrassegnato come risolto."
        },
        ticket_satisfaction: {
          label: "Feedback soddisfazione cliente",
          description: "Alert quando un cliente valuta un ticket completato."
        },
        ticket_validation_requested: {
          label: "Validazione richiesta",
          description: "Alert quando ti viene chiesto di validare un ticket."
        },
        ticket_validation_responded: {
          label: "Risposta di validazione",
          description: "Alert quando la tua richiesta di validazione è approvata o rifiutata."
        }
      }
    },
    mspModules: {
      contrat_enabled: "Azienda",
      contact_enabled: "Contatti",
      infrastructure_enabled: "Infrastruttura",
      cybersecurite_enabled: "Cybersicurezza",
      service_enabled: "Servizi",
      monitoring_enabled: "Report",
      tickets_enabled: "Supporto",
      planning_enabled: "Pianificazione",
      configurateur_enabled: "Configuratore",
      dashboard_enabled: "Dashboard",
      accessGranted: "Accesso consentito",
      accessDenied: "Accesso non consentito"
    },
    activity: {
      created: "Account creato",
      lastLogin: "Ultimo accesso"
    },
    modals: {
      username: {
        title: "Modifica nickname",
        label: "Nuovo nickname",
        hint: "Da 2 a 50 caratteri",
        placeholder: "Il tuo nickname"
      },
      email: {
        title: "Modifica indirizzo e-mail",
        label: "Nuovo indirizzo e-mail"
      },
      password: {
        title: "Cambia password",
        label: "Nuova password",
        hint: "Minimo 6 caratteri",
        confirm: "Conferma password",
        confirmAction: "Aggiorna"
      },
      mfa: {
        title: "Configura autenticazione a due fattori",
        desc: "Scansiona questo QR code con la tua app di autenticazione, poi inserisci il codice a 6 cifre.",
        qrAlt: "QR code MFA",
        manualKey: "Chiave manuale:",
        enable: "Attiva MFA"
      },
      save: "Salva"
    },
    toast: {
      loadError: "Impossibile caricare il profilo",
      usernameTooShort: "Il nickname deve contenere almeno 2 caratteri",
      usernameUpdated: "Nickname aggiornato",
      usernameError: "Errore durante l'aggiornamento del nickname",
      emailInvalid: "Indirizzo e-mail non valido",
      emailUpdated: "Indirizzo e-mail aggiornato",
      emailError: "Errore durante l'aggiornamento dell'e-mail",
      passwordTooShort: "Minimo 6 caratteri",
      passwordMismatch: "Le password non corrispondono",
      passwordUpdated: "Password aggiornata",
      passwordError: "Errore durante l'aggiornamento della password",
      helpdeskSaved: "Nickname helpdesk salvato",
      helpdeskError: "Errore durante il salvataggio",
      chatUiSaved: "Preferenze di visualizzazione salvate",
      chatUiError: "Errore durante il salvataggio delle preferenze",
      notifSaved: "Preferenze notifiche salvate",
      notifError: "Errore durante il salvataggio delle notifiche",
      mfaSetupError: "Errore configurazione MFA",
      mfaEnabled: "Autenticazione a due fattori attivata",
      mfaInvalidCode: "Codice non valido"
    },
    defaultAgent: "Agente"
  },
  es: {
    loading: "Cargando su cuenta…",
    loadError: "No se pudo cargar el perfil",
    loadProfileError: "No se pudo cargar el perfil.",
    accountDisabled: "Su cuenta está desactivada. Contacte a un administrador para restablecer el acceso.",
    eyebrow: "Cuenta de usuario",
    pageTitle: "Mi cuenta",
    kpi: {
      role: "Rol",
      mfa: "Autenticación MFA",
      mspProfile: "Perfil MSP"
    },
    roles: {
      admin: "Administrador",
      superviseur: "Supervisor",
      utilisateur: "Usuario",
      client: "Cliente del portal"
    },
    mfa: {
      enabled: "Activado",
      pending: "Configuración en curso",
      off: "Desactivado",
      enabledDesc: "Su cuenta está protegida por un código de un solo uso generado por una aplicación de autenticación.",
      pendingDesc: "La configuración MFA se inició pero no se completó. Escanee el código QR y valide un código.",
      offDesc: "Añada una capa de seguridad con Microsoft Authenticator, Google Authenticator o una app compatible TOTP.",
      continueSetup: "Continuar configuración",
      enable: "Activar MFA"
    },
    sections: {
      identity: {
        title: "Identidad",
        description: "Apodo de acceso, correo y contraseña"
      },
      photo: {
        title: "Foto de perfil",
        description: "Avatar mostrado en el chat de soporte y en su menú de cuenta"
      },
      security: {
        title: "Seguridad",
        description: "Autenticación de dos factores (MFA)"
      },
      helpdesk: {
        title: "Helpdesk · apodo de tickets",
        description: "Nombre mostrado a los clientes en los intercambios de tickets"
      },
      accessibility: {
        title: "Accesibilidad · chat de tickets",
        description: "Tamaño del texto y espaciado de mensajes en el hilo (personal)"
      },
      notifications: {
        title: "Notificaciones in-app",
        globallyDisabled: "Desactivadas globalmente por su administrador.",
        activeCount: "{count}/{total} tipos de alerta activos para usted.",
        allDisabled: "Ha desactivado todas las alertas in-app."
      },
      mspProfile: {
        title: "Perfil MSP",
        description: "Derechos y módulos asignados por su administrador (solo lectura)"
      },
      activity: {
        title: "Actividad de la cuenta",
        description: "Información de inicio de sesión"
      }
    },
    identity: {
      username: "Apodo",
      usernameHint: "Usado para identificarle en la aplicación",
      email: "Dirección de correo",
      emailHint: "Usada para el acceso y las notificaciones",
      password: "Contraseña",
      passwordHint: "Cámbiela regularmente para proteger su cuenta",
      editUsername: "Editar apodo",
      editEmail: "Editar correo",
      changePassword: "Cambiar contraseña"
    },
    helpdesk: {
      label: "Apodo helpdesk",
      hint: "Deje vacío para usar su apodo de acceso",
      placeholder: "Ej. Juan P.",
      preview: "Vista previa del cliente:",
      save: "Guardar",
      saving: "Guardando…"
    },
    chat: {
      previewLabel: "Vista previa del chat",
      agentMessage: "Hola, hemos recibido su ticket y le responderemos en breve.",
      clientLabel: "Cliente",
      clientMessage: "Gracias, sigo disponible si necesita más información.",
      textSize: "Tamaño del texto",
      messageSpacing: "Espaciado entre mensajes",
      savePrefs: "Guardar preferencias",
      saving: "Guardando…"
    },
    notifications: {
      adminBanner: "Las notificaciones in-app están desactivadas a nivel de organización. Contacte a un administrador.",
      masterLabel: "Recibir notificaciones in-app",
      masterHint: "Campana en la barra lateral y badges en tickets asignados",
      adminDisabledHint: "No ofrecido por la configuración global de su organización",
      hint: "Los ajustes globales definen lo disponible. Puede restringirlos para su cuenta, no ampliarlos.",
      reset: "Restablecer",
      save: "Guardar",
      saving: "Guardando…",
      events: {
        ticket_commented: {
          label: "Comentario añadido",
          description: "Alerta cuando hay un nuevo mensaje en un ticket seguido."
        },
        ticket_assigned: {
          label: "Asignación",
          description: "Alerta cuando se añade un agente como asignado."
        },
        ticket_created: {
          label: "Ticket creado",
          description: "Alerta al crear un ticket."
        },
        ticket_updated: {
          label: "Ticket actualizado",
          description: "Alerta en una actualización (estado, prioridad, etc.)."
        },
        ticket_resolved: {
          label: "Ticket resuelto",
          description: "Alerta cuando un ticket se marca como resuelto."
        },
        ticket_satisfaction: {
          label: "Valoración de satisfacción",
          description: "Alerta cuando un cliente valora un ticket completado."
        },
        ticket_validation_requested: {
          label: "Validación solicitada",
          description: "Alerta cuando te piden validar un ticket."
        },
        ticket_validation_responded: {
          label: "Respuesta de validación",
          description: "Alerta cuando tu solicitud de validación es aprobada o rechazada."
        }
      }
    },
    mspModules: {
      contrat_enabled: "Empresa",
      contact_enabled: "Contactos",
      infrastructure_enabled: "Infraestructura",
      cybersecurite_enabled: "Ciberseguridad",
      service_enabled: "Servicios",
      monitoring_enabled: "Informes",
      tickets_enabled: "Soporte",
      planning_enabled: "Planificación",
      configurateur_enabled: "Configurador",
      dashboard_enabled: "Panel",
      accessGranted: "Acceso autorizado",
      accessDenied: "Acceso no autorizado"
    },
    activity: {
      created: "Cuenta creada",
      lastLogin: "Último acceso"
    },
    modals: {
      username: {
        title: "Editar apodo",
        label: "Nuevo apodo",
        hint: "De 2 a 50 caracteres",
        placeholder: "Su apodo"
      },
      email: {
        title: "Editar dirección de correo",
        label: "Nueva dirección de correo"
      },
      password: {
        title: "Cambiar contraseña",
        label: "Nueva contraseña",
        hint: "Mínimo 6 caracteres",
        confirm: "Confirmar contraseña",
        confirmAction: "Actualizar"
      },
      mfa: {
        title: "Configurar autenticación de dos factores",
        desc: "Escanee este código QR con su app de autenticación y escriba el código de 6 dígitos.",
        qrAlt: "Código QR MFA",
        manualKey: "Clave manual:",
        enable: "Activar MFA"
      },
      save: "Guardar"
    },
    toast: {
      loadError: "No se pudo cargar el perfil",
      usernameTooShort: "El apodo debe tener al menos 2 caracteres",
      usernameUpdated: "Apodo actualizado",
      usernameError: "Error al actualizar el apodo",
      emailInvalid: "Dirección de correo no válida",
      emailUpdated: "Dirección de correo actualizada",
      emailError: "Error al actualizar el correo",
      passwordTooShort: "Mínimo 6 caracteres",
      passwordMismatch: "Las contraseñas no coinciden",
      passwordUpdated: "Contraseña actualizada",
      passwordError: "Error al actualizar la contraseña",
      helpdeskSaved: "Apodo helpdesk guardado",
      helpdeskError: "Error al guardar",
      chatUiSaved: "Preferencias de visualización guardadas",
      chatUiError: "Error al guardar las preferencias",
      notifSaved: "Preferencias de notificaciones guardadas",
      notifError: "Error al guardar las notificaciones",
      mfaSetupError: "Error de configuración MFA",
      mfaEnabled: "Autenticación de dos factores activada",
      mfaInvalidCode: "Código no válido"
    },
    defaultAgent: "Agente"
  }
};
const MSP_MODULE_KEYS = [{
  key: "contrat_enabled",
  icon: "mdi:office-building-outline"
}, {
  key: "contact_enabled",
  icon: "mdi:account-group-outline"
}, {
  key: "infrastructure_enabled",
  icon: "mdi:server-network"
}, {
  key: "cybersecurite_enabled",
  icon: "mdi:shield-lock-outline"
}, {
  key: "service_enabled",
  icon: "mdi:cog-outline"
}, {
  key: "monitoring_enabled",
  icon: "mdi:chart-line"
}, {
  key: "tickets_enabled",
  icon: "mdi:ticket-outline"
}, {
  key: "planning_enabled",
  icon: "mdi:calendar-month-outline"
}, {
  key: "configurateur_enabled",
  icon: "mdi:tune-variant"
}, {
  key: "dashboard_enabled",
  icon: "mdi:view-dashboard-outline"
}];
export const getUserProfileCopy = createLocaleGetter(USER_PROFILE_COPY);
export function formatProfileDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(getLocaleTag(locale), {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
export function getMfaStatus(user, locale) {
  const t = getUserProfileCopy(locale).mfa;
  if (user?.mfa_enabled) {
    return {
      key: "enabled",
      label: t.enabled,
      icon: "mdi:shield-check",
      className: "mfaBanner_enabled"
    };
  }
  if (user?.mfa_pending_setup) {
    return {
      key: "pending",
      label: t.pending,
      icon: "mdi:shield-sync",
      className: "mfaBanner_pending"
    };
  }
  return {
    key: "off",
    label: t.off,
    icon: "mdi:shield-off-outline",
    className: "mfaBanner_off"
  };
}
export function getLocalizedNotifEventOptions(locale) {
  const events = getUserProfileCopy(locale).notifications.events;
  return IN_APP_EVENT_OPTIONS.map(option => ({
    ...option,
    label: events[option.key]?.label || option.label,
    description: events[option.key]?.description || option.description
  }));
}
export function getMspModules(locale) {
  const labels = getUserProfileCopy(locale).mspModules;
  return MSP_MODULE_KEYS.map(mod => ({
    ...mod,
    label: labels[mod.key] || mod.key,
    accessGranted: labels.accessGranted,
    accessDenied: labels.accessDenied
  }));
}
export function getNotificationsSectionDescription(t, {
  notifGloballyDisabled,
  notifUserEnabled,
  activeCount,
  total
}) {
  if (notifGloballyDisabled) return t.sections.notifications.globallyDisabled;
  if (notifUserEnabled) {
    return interpolate(t.sections.notifications.activeCount, {
      count: String(activeCount),
      total: String(total)
    });
  }
  return t.sections.notifications.allDisabled;
}
