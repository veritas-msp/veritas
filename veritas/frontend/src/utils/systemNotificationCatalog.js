export const SYSTEM_NOTIFICATION_DEFS = [{
  key: "auth.password_reset",
  group: "auth",
  channels: ["email"],
  recipients: "L'utilisateur qui demande la réinitialisation",
  variables: ["resetLink", "user.email", "user.username"]
}, {
  key: "auth.password_changed",
  group: "auth",
  channels: ["email"],
  recipients: "L'utilisateur dont le mot de passe a changé",
  variables: ["user.email", "user.username"]
}, {
  key: "auth.portal_invite",
  group: "auth",
  channels: ["email"],
  recipients: "Le contact invité sur le portail",
  variables: ["activateLink", "contact.prenom", "contact.nom", "contact.email"]
}, {
  key: "tickets.created_ack",
  group: "tickets",
  channels: ["email"],
  recipients: "Le demandeur du ticket",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "ticket.priority", "entreprise.nom", "requester.prenom", "requester.nom", "requester.email"]
}, {
  key: "tickets.assigned",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_assigned",
  inAppFields: [],
  recipients: "Les agents assignés",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "user.username", "user.email", "agent.username"]
}, {
  key: "tickets.updated",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_updated",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  recipients: "Les agents assignés",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "changedFields", "user.username"]
}, {
  key: "tickets.created",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_created",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  recipients: "Les agents assignés et, en option, les followers",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "user.username"]
}, {
  key: "tickets.commented",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_commented",
  inAppFields: ["notifyAssignees", "notifyWatchers", "excludeInternalComments"],
  recipients: "Les assignés et les followers",
  variables: ["ticket.ticket_number", "ticket.title", "comment.author", "comment.preview", "entreprise.nom", "user.username"]
}, {
  key: "tickets.resolved",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_resolved",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  recipients: "Les agents assignés et, en option, les followers",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "user.username"]
}, {
  key: "tickets.satisfaction",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_satisfaction",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  recipients: "Les agents assignés et, en option, les followers",
  variables: ["ticket.ticket_number", "ticket.title", "satisfaction.author", "satisfaction.rating", "satisfaction.message", "user.username"]
}, {
  key: "tickets.validation_requested",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_validation_requested",
  recipients: "Le validateur désigné",
  variables: ["ticket.ticket_number", "ticket.title", "agent.username", "validation.message", "user.username"]
}, {
  key: "tickets.validation_responded",
  group: "tickets",
  channels: ["email", "inapp"],
  inAppKey: "ticket_validation_responded",
  recipients: "L'agent qui a demandé la validation",
  variables: ["ticket.ticket_number", "ticket.title", "validation.validator", "validation.decision", "validation.message", "user.username"]
}, {
  key: "planning.event_created",
  group: "planning",
  channels: ["email", "inapp"],
  recipients: "L'utilisateur attribué à l'événement",
  variables: ["event.title", "event.type", "event.start", "event.end", "event.description", "entreprise.nom", "user.username", "user.email", "agent.username"]
}, {
  key: "documents.vault_shared",
  group: "documents",
  channels: ["email", "inapp"],
  recipients: "Les comptes portail actifs de l'entreprise",
  variables: ["document.file_name", "document.category", "document.description", "entreprise.nom", "portalLink"]
}, {
  key: "vault.access_shared",
  group: "documents",
  channels: ["email", "inapp"],
  recipients: "Le contact destinataire du partage",
  variables: ["secret.title", "secret.description", "secret.expires_at", "secret.max_views", "contact.prenom", "contact.nom", "contact.email", "entreprise.nom", "portalLink"]
}];

export const SYSTEM_NOTIFICATION_GROUPS = [{
  id: "auth",
  title: "Compte et accès"
}, {
  id: "tickets",
  title: "Tickets"
}, {
  id: "planning",
  title: "Planning"
}, {
  id: "documents",
  title: "Documents et coffre-fort"
}];

export const SYSTEM_NOTIFICATION_DEFAULTS = {
  "auth.password_reset": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Réinitialisation de votre mot de passe Veritas",
    title: "Mot de passe oublié",
    body: "<p>Bonjour{{#user.username}} {{user.username}}{{/user.username}},</p><p>Vous avez demandé la réinitialisation de votre mot de passe Veritas.</p><p><a href=\"{{resetLink}}\">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 15 minutes.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>",
    inAppTitle: "",
    inAppBody: ""
  },
  "auth.password_changed": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Votre mot de passe Veritas a été modifié",
    title: "Mot de passe modifié",
    body: "<p>Bonjour,</p><p>Votre mot de passe a été mis à jour avec succès.</p><p>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement votre administrateur.</p>",
    inAppTitle: "",
    inAppBody: ""
  },
  "auth.portal_invite": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Activez votre accès au portail client Veritas",
    title: "Invitation portail",
    body: "<p>Bonjour{{#contact.prenom}} {{contact.prenom}}{{/contact.prenom}},</p><p>Votre prestataire vous a ouvert un accès au portail client Veritas.</p><p><a href=\"{{activateLink}}\">Activer mon accès</a></p><p>Ce lien expire dans 72 heures.</p>",
    inAppTitle: "",
    inAppBody: ""
  },
  "tickets.created_ack": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Ticket #{{ticket.ticket_number}} — nous avons bien reçu votre demande",
    title: "Accusé de création",
    body: "<p>Bonjour{{#requester.prenom}} {{requester.prenom}}{{/requester.prenom}},</p><p>Votre demande a bien été enregistrée.</p><p><strong>Ticket #{{ticket.ticket_number}}</strong> — {{ticket.title}}</p><p>Entreprise : {{entreprise.nom}}</p><p>Nous revenons vers vous dès que possible.</p>",
    inAppTitle: "",
    inAppBody: ""
  },
  "tickets.assigned": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Ticket #{{ticket.ticket_number}} vous a été assigné",
    title: "Ticket assigné",
    body: "<p>Bonjour {{user.username}},</p><p>Le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong> vous a été assigné.</p><p>Entreprise : {{entreprise.nom}}</p><p>Assigné par : {{agent.username}}</p>",
    inAppTitle: "Assignation · #{{ticket.ticket_number}}",
    inAppBody: "Vous avez été assigné au ticket {{ticket.title}}."
  },
  "tickets.updated": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Ticket #{{ticket.ticket_number}} mis à jour",
    title: "Ticket mis à jour",
    body: "<p>Bonjour {{user.username}},</p><p>Le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong> a été mis à jour.</p><p>Statut : {{ticket.status}}</p><p>Champs modifiés : {{changedFields}}</p>",
    inAppTitle: "Mise à jour · #{{ticket.ticket_number}}",
    inAppBody: "Le ticket {{ticket.title}} a été mis à jour."
  },
  "tickets.created": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Nouveau ticket #{{ticket.ticket_number}} — {{ticket.title}}",
    title: "Nouveau ticket",
    body: "<p>Bonjour {{user.username}},</p><p>Un nouveau ticket vous concerne : <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>Entreprise : {{entreprise.nom}}</p>",
    inAppTitle: "Nouveau ticket · #{{ticket.ticket_number}}",
    inAppBody: "Un nouveau ticket a été créé : {{ticket.title}}."
  },
  "tickets.commented": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Nouveau commentaire sur le ticket #{{ticket.ticket_number}}",
    title: "Commentaire ticket",
    body: "<p>Bonjour {{user.username}},</p><p>{{comment.author}} a commenté le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>{{comment.preview}}</p>",
    inAppTitle: "Commentaire · #{{ticket.ticket_number}}",
    inAppBody: "{{comment.author}} : {{comment.preview}}"
  },
  "tickets.resolved": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Ticket #{{ticket.ticket_number}} résolu",
    title: "Ticket résolu",
    body: "<p>Bonjour {{user.username}},</p><p>Le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong> a été marqué comme résolu.</p>",
    inAppTitle: "Résolu · #{{ticket.ticket_number}}",
    inAppBody: "Le ticket {{ticket.title}} est résolu."
  },
  "tickets.satisfaction": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Avis client sur le ticket #{{ticket.ticket_number}}",
    title: "Satisfaction client",
    body: "<p>Bonjour {{user.username}},</p><p>{{satisfaction.author}} a noté le ticket <strong>#{{ticket.ticket_number}}</strong> : {{satisfaction.rating}}/5</p><p>{{satisfaction.message}}</p>",
    inAppTitle: "Avis client · #{{ticket.ticket_number}}",
    inAppBody: "{{satisfaction.author}} · {{satisfaction.rating}}/5"
  },
  "tickets.validation_requested": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Validation demandée — ticket #{{ticket.ticket_number}}",
    title: "Validation demandée",
    body: "<p>Bonjour {{user.username}},</p><p>{{agent.username}} vous demande de valider le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>{{validation.message}}</p>",
    inAppTitle: "Validation · #{{ticket.ticket_number}}",
    inAppBody: "{{agent.username}} demande votre validation."
  },
  "tickets.validation_responded": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Réponse de validation — ticket #{{ticket.ticket_number}}",
    title: "Validation répondue",
    body: "<p>Bonjour {{user.username}},</p><p>{{validation.validator}} a {{validation.decision}} le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>{{validation.message}}</p>",
    inAppTitle: "Validation · #{{ticket.ticket_number}}",
    inAppBody: "{{validation.validator}} : {{validation.decision}}"
  },
  "planning.event_created": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Nouvel événement : {{event.title}}",
    title: "Événement planifié",
    body: "<p>Bonjour {{user.username}},</p><p>Un événement vous a été attribué.</p><p><strong>{{event.title}}</strong></p><p>Type : {{event.type}}</p><p>Début : {{event.start}}</p><p>Fin : {{event.end}}</p><p>Entreprise : {{entreprise.nom}}</p>",
    inAppTitle: "Événement · {{event.title}}",
    inAppBody: "Un événement vous a été attribué le {{event.start}}."
  },
  "documents.vault_shared": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Nouveau document dans votre coffre-fort — {{document.file_name}}",
    title: "Document ajouté au coffre-fort",
    body: "<p>Bonjour,</p><p>Un nouveau document a été partagé avec votre entreprise sur le portail client.</p><p><strong>{{document.file_name}}</strong></p><p>Catégorie : {{document.category}}</p><p>Entreprise : {{entreprise.nom}}</p><p><a href=\"{{portalLink}}\">Ouvrir mon coffre-fort</a></p>",
    inAppTitle: "Document · {{document.file_name}}",
    inAppBody: "Un document a été ajouté au coffre-fort de {{entreprise.nom}}."
  },
  "vault.access_shared": {
    enabled: false,
    emailEnabled: false,
    inAppEnabled: false,
    subject: "Un accès vous a été partagé — {{secret.title}}",
    title: "Partage d'accès portail",
    body: "<p>Bonjour{{#contact.prenom}} {{contact.prenom}}{{/contact.prenom}},</p><p>Un accès sécurisé vient d'être partagé avec vous sur le portail client.</p><p><strong>{{secret.title}}</strong></p><p>{{secret.description}}</p><p>Entreprise : {{entreprise.nom}}</p><p><a href=\"{{portalLink}}\">Consulter mon coffre-fort</a></p>",
    inAppTitle: "Accès partagé · {{secret.title}}",
    inAppBody: "Un accès sécurisé vous a été partagé."
  }
};

export function normalizeSystemNotifications(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(SYSTEM_NOTIFICATION_DEFS.map(def => {
    const fallback = SYSTEM_NOTIFICATION_DEFAULTS[def.key];
    const item = source[def.key] && typeof source[def.key] === "object" ? source[def.key] : {};
    return [def.key, {
      ...fallback,
      ...item,
      enabled: item.enabled !== undefined ? item.enabled !== false : fallback.enabled,
      emailEnabled: item.emailEnabled !== undefined ? item.emailEnabled === true : fallback.emailEnabled,
      inAppEnabled: item.inAppEnabled !== undefined ? item.inAppEnabled === true : fallback.inAppEnabled,
      subject: String(item.subject || fallback.subject),
      title: String(item.title || fallback.title),
      body: String(item.body || item.content || fallback.body),
      inAppTitle: String(item.inAppTitle || fallback.inAppTitle || ""),
      inAppBody: String(item.inAppBody || fallback.inAppBody || "")
    }];
  }));
}
