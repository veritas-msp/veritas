import { createLocaleGetter, interpolate } from "../../i18n/translate";

const ADMIN_NOTIFICATION_CENTER_COPY = {
  fr: {
    tabs: {
      system: "Système",
      catalog: "Règles",
      templates: "Templates",
      connectors: "Connecteurs",
      logs: "Journal"
    },
    system: {
      title: "Notifications de l'application",
      description: "Activez, pour chaque action, l'email et/ou le centre de notifications (cloche), puis éditez le template.",
      groups: {
        auth: "Compte et accès",
        tickets: "Tickets",
        planning: "Planning",
        documents: "Documents et coffre-fort"
      },
      items: {
        "auth.password_reset": {
          label: "Récupération de mot de passe",
          hint: "Email envoyé à l'utilisateur qui a oublié son mot de passe.",
          recipients: "L'utilisateur"
        },
        "auth.password_changed": {
          label: "Mot de passe modifié",
          hint: "Confirmation après un changement de mot de passe.",
          recipients: "L'utilisateur"
        },
        "auth.portal_invite": {
          label: "Invitation portail client",
          hint: "Lien d'activation envoyé au contact (création ou renvoi depuis la fiche contact).",
          recipients: "Le contact invité"
        },
        "tickets.created_ack": {
          label: "Accusé de création de ticket",
          hint: "Confirmation au demandeur dès qu'un ticket est créé.",
          recipients: "Le demandeur"
        },
        "tickets.assigned": {
          label: "Ticket assigné",
          hint: "Prévenir l'agent lorsqu'un ticket lui est attribué.",
          recipients: "Les assignés"
        },
        "tickets.updated": {
          label: "Ticket mis à jour",
          hint: "Prévenir les assignés et followers quand le ticket change.",
          recipients: "Assignés / followers"
        },
        "tickets.created": {
          label: "Nouveau ticket (agents)",
          hint: "Alerte les agents concernés dès qu'un ticket est créé (UI, portail, mail, WhatsApp, monitoring).",
          recipients: "Assignés / followers"
        },
        "tickets.commented": {
          label: "Commentaire sur un ticket",
          hint: "Alerte quand un message est posté (y compris portail, mail et WhatsApp).",
          recipients: "Assignés / followers"
        },
        "tickets.resolved": {
          label: "Ticket résolu",
          hint: "Alerte quand un ticket passe au statut résolu.",
          recipients: "Assignés / followers"
        },
        "tickets.satisfaction": {
          label: "Avis de satisfaction",
          hint: "Alerte quand un client note un ticket.",
          recipients: "Assignés / followers"
        },
        "tickets.validation_requested": {
          label: "Validation demandée",
          hint: "Alerte le validateur désigné.",
          recipients: "Le validateur"
        },
        "tickets.validation_responded": {
          label: "Réponse de validation",
          hint: "Alerte l'agent qui a demandé la validation.",
          recipients: "L'agent demandeur"
        },
        "planning.event_created": {
          label: "Événement planning créé",
          hint: "Prévenir l'utilisateur attribué à l'événement.",
          recipients: "L'utilisateur attribué"
        },
        "documents.vault_shared": {
          label: "Ajout d'un document au coffre-fort",
          hint: "Prévenir les comptes portail actifs quand un document est rendu visible côté client.",
          recipients: "Comptes portail de l'entreprise"
        },
        "vault.access_shared": {
          label: "Partage d'accès via le portail client",
          hint: "Prévenir le contact lorsqu'un secret / accès est partagé depuis sa fiche.",
          recipients: "Le contact destinataire"
        }
      },
      fields: {
        enabled: "Notification active",
        enabledHint: "Si désactivé, aucun e-mail ni in-app n'est envoyé pour cette action.",
        emailHint: "Envoi SMTP au destinataire de l'action.",
        center: "Centre de notifications",
        inAppHint: "Alerte dans la cloche (centre de notifications) pour les agents concernés.",
        notifyAssignees: "Assignés",
        notifyAssigneesHint: "Agents assignés au ticket.",
        notifyWatchers: "Followers",
        notifyWatchersHint: "Agents qui suivent le ticket.",
        excludeInternal: "Ignorer les notes internes",
        excludeInternalHint: "Ne pas alerter pour les réponses privées.",
        subject: "Sujet de l'email",
        body: "Contenu de l'email",
        inAppTitle: "Titre dans le centre de notifications",
        inAppBody: "Message dans le centre de notifications",
        variablesHint: "Cliquez une variable pour l'insérer. Exemple : {{ticket.title}}"
      },
      toast: {
        saved: "Template enregistré",
        error: "Erreur lors de l'enregistrement"
      }
    },
    catalog: {
      title: "Actions de l'application",
      description: "Pour chaque action, activez les canaux, éditez le template et consultez le journal.",
      searchPlaceholder: "Rechercher une action…",
      emptySearch: "Aucune action ne correspond à « {query} ».",
      masterOn: "Active",
      masterOff: "Inactive",
      channels: {
        inapp: "In-app",
        mail: "Email",
        webhook: "Intégration"
      },
      channelHints: {
        inapp: "Cloche dans Veritas",
        mail: "Email SMTP",
        webhook: "Teams, Slack ou webhook"
      },
      edit: "Configurer",
      addOverride: "Règle entreprise",
      overrideCount: "{count} règle(s) entreprise",
      unwired: "Déclencheur non branché",
      inAppOnly: "In-app uniquement",
      noRule: "Non configuré",
      toast: {
        saved: "Notification enregistrée",
        toggled: "Canal mis à jour",
        deleted: "Règle supprimée",
        error: "Erreur lors de l'enregistrement"
      }
    },
    templates: {
      title: "Templates de notification",
      description: "Messages réutilisables avec variables {{…}} pour l'email et les intégrations.",
      add: "Nouveau template",
      save: "Enregistrer",
      cancel: "Annuler",
      empty: "Aucun template. Créez-en un pour l'associer aux actions du catalogue.",
      columns: {
        name: "Nom",
        subject: "Sujet email",
        event: "Action liée",
        actions: "Actions"
      },
      anyEvent: "Toutes les actions",
      edit: "Éditer",
      delete: "Supprimer",
      createTitle: "Nouveau template",
      editTitle: "Éditer le template",
      nameLabel: "Nom",
      namePlaceholder: "Ex. Ticket créé — email interne",
      subjectLabel: "Sujet email",
      subjectPlaceholder: "Ex. Ticket #{{ticket.ticket_number}} créé — {{entreprise.nom}}",
      bodyLabel: "Contenu",
      variables: "Variables",
      toast: {
        saved: "Template enregistré",
        deleted: "Template supprimé",
        nameRequired: "Le nom est obligatoire",
        error: "Erreur lors de l'enregistrement"
      }
    },
    logs: {
      title: "Journal des envois",
      description: "Historique des notifications email et intégrations envoyées par Veritas.",
      empty: "Aucun envoi pour le moment.",
      columns: {
        date: "Date",
        source: "Source",
        element: "Action",
        company: "Entreprise",
        channel: "Canal",
        status: "Statut",
        message: "Message",
        actions: "Actions"
      },
      allCompanies: "Toutes les entreprises",
      retry: "Renvoyer",
      toast: {
        retryOk: "Notification renvoyée",
        retryError: "Impossible de renvoyer la notification"
      }
    },
    form: {
      inAppHint: "Cloche sidebar et badges tickets pour les agents concernés.",
      mailHint: "Envoi SMTP vers les destinataires configurés.",
      webhookHint: "Livraison via le connecteur Teams, Slack ou HTTP choisi.",
      subjectLabel: "Sujet de l'email",
      subjectPlaceholder: "Laisser vide pour le sujet par défaut",
      useTemplateHint: "Réutilise un template du catalogue Notifications.",
      inAppOptions: "Destinataires in-app"
    },
    variables: {
      title: "Variables disponibles",
      intro: "Cliquez une variable pour l'insérer dans le message.",
      close: "Fermer"
    }
  },
  en: {
    tabs: {
      system: "System",
      catalog: "Rules",
      templates: "Templates",
      connectors: "Connectors",
      logs: "Log"
    },
    system: {
      title: "Application notifications",
      description: "For each action, enable email and/or the notification center (bell), then edit the template.",
      groups: {
        auth: "Account and access",
        tickets: "Tickets",
        planning: "Planning",
        documents: "Documents and vault"
      },
      items: {
        "auth.password_reset": {
          label: "Password recovery",
          hint: "Email sent to the user who forgot their password.",
          recipients: "The user"
        },
        "auth.password_changed": {
          label: "Password changed",
          hint: "Confirmation after a password change.",
          recipients: "The user"
        },
        "auth.portal_invite": {
          label: "Client portal invite",
          hint: "Activation link sent to the contact (create or resend from the contact page).",
          recipients: "The invited contact"
        },
        "tickets.created_ack": {
          label: "Ticket creation acknowledgement",
          hint: "Confirmation to the requester when a ticket is created.",
          recipients: "The requester"
        },
        "tickets.assigned": {
          label: "Ticket assigned",
          hint: "Notify the agent when a ticket is assigned to them.",
          recipients: "Assignees"
        },
        "tickets.updated": {
          label: "Ticket updated",
          hint: "Notify assignees and followers when the ticket changes.",
          recipients: "Assignees / followers"
        },
        "tickets.created": {
          label: "New ticket (agents)",
          hint: "Alert concerned agents when a ticket is created (UI, portal, mail, WhatsApp, monitoring).",
          recipients: "Assignees / followers"
        },
        "tickets.commented": {
          label: "Ticket comment",
          hint: "Alert when a message is posted (including portal, mail and WhatsApp).",
          recipients: "Assignees / followers"
        },
        "tickets.resolved": {
          label: "Ticket resolved",
          hint: "Alert when a ticket is marked as resolved.",
          recipients: "Assignees / followers"
        },
        "tickets.satisfaction": {
          label: "Satisfaction rating",
          hint: "Alert when a customer rates a ticket.",
          recipients: "Assignees / followers"
        },
        "tickets.validation_requested": {
          label: "Validation requested",
          hint: "Alert the designated validator.",
          recipients: "The validator"
        },
        "tickets.validation_responded": {
          label: "Validation response",
          hint: "Alert the agent who requested validation.",
          recipients: "The requesting agent"
        },
        "planning.event_created": {
          label: "Planning event created",
          hint: "Notify the user assigned to the event.",
          recipients: "The assigned user"
        },
        "documents.vault_shared": {
          label: "Document added to vault",
          hint: "Notify active portal accounts when a document is made visible to the client.",
          recipients: "Company portal accounts"
        },
        "vault.access_shared": {
          label: "Access shared via client portal",
          hint: "Notify the contact when a secret / access is shared from their contact page.",
          recipients: "The recipient contact"
        }
      },
      fields: {
        enabled: "Notification on",
        enabledHint: "If off, no email or in-app is sent for this action.",
        emailHint: "SMTP send to the action recipient.",
        center: "Notification center",
        inAppHint: "Bell alert in the notification center for the concerned agents.",
        notifyAssignees: "Assignees",
        notifyAssigneesHint: "Agents assigned to the ticket.",
        notifyWatchers: "Followers",
        notifyWatchersHint: "Agents following the ticket.",
        excludeInternal: "Ignore internal notes",
        excludeInternalHint: "Do not alert for private replies.",
        subject: "Email subject",
        body: "Email content",
        inAppTitle: "Notification center title",
        inAppBody: "Notification center message",
        variablesHint: "Click a variable to insert it. Example: {{ticket.title}}"
      },
      toast: {
        saved: "Template saved",
        error: "Error while saving"
      }
    },
    catalog: {
      title: "Application actions",
      description: "For each action, enable channels, edit the template and review the send log.",
      searchPlaceholder: "Search an action…",
      emptySearch: "No action matches “{query}”.",
      masterOn: "On",
      masterOff: "Off",
      channels: {
        inapp: "In-app",
        mail: "Email",
        webhook: "Integration"
      },
      channelHints: {
        inapp: "Bell inside Veritas",
        mail: "SMTP email",
        webhook: "Teams, Slack or webhook"
      },
      edit: "Configure",
      addOverride: "Company rule",
      overrideCount: "{count} company rule(s)",
      unwired: "Trigger not wired",
      inAppOnly: "In-app only",
      noRule: "Not configured",
      toast: {
        saved: "Notification saved",
        toggled: "Channel updated",
        deleted: "Rule deleted",
        error: "Error while saving"
      }
    },
    templates: {
      title: "Notification templates",
      description: "Reusable messages with {{…}} variables for email and integrations.",
      add: "New template",
      save: "Save",
      cancel: "Cancel",
      empty: "No template yet. Create one to attach it to catalog actions.",
      columns: {
        name: "Name",
        subject: "Email subject",
        event: "Linked action",
        actions: "Actions"
      },
      anyEvent: "All actions",
      edit: "Edit",
      delete: "Delete",
      createTitle: "New template",
      editTitle: "Edit template",
      nameLabel: "Name",
      namePlaceholder: "E.g. Ticket created — internal email",
      subjectLabel: "Email subject",
      subjectPlaceholder: "E.g. Ticket #{{ticket.ticket_number}} created — {{entreprise.nom}}",
      bodyLabel: "Content",
      variables: "Variables",
      toast: {
        saved: "Template saved",
        deleted: "Template deleted",
        nameRequired: "Name is required",
        error: "Error while saving"
      }
    },
    logs: {
      title: "Delivery log",
      description: "History of email and integration notifications sent by Veritas.",
      empty: "No deliveries yet.",
      columns: {
        date: "Date",
        source: "Source",
        element: "Action",
        company: "Company",
        channel: "Channel",
        status: "Status",
        message: "Message",
        actions: "Actions"
      },
      allCompanies: "All companies",
      retry: "Resend",
      toast: {
        retryOk: "Notification resent",
        retryError: "Unable to resend the notification"
      }
    },
    form: {
      inAppHint: "Sidebar bell and ticket badges for the relevant agents.",
      mailHint: "SMTP send to the configured recipients.",
      webhookHint: "Delivered through the selected Teams, Slack or HTTP connector.",
      subjectLabel: "Email subject",
      subjectPlaceholder: "Leave empty for the default subject",
      useTemplateHint: "Reuse a template from the Notifications catalog.",
      inAppOptions: "In-app recipients"
    },
    variables: {
      title: "Available variables",
      intro: "Click a variable to insert it into the message.",
      close: "Close"
    }
  }
};

export const getAdminNotificationCenterCopy = createLocaleGetter(ADMIN_NOTIFICATION_CENTER_COPY);
export { interpolate };
