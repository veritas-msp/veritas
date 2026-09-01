export const SYSTEM_NOTIFICATION_DEFS = [{
  key: "auth.password_reset",
  group: "auth",
  channels: ["email"],
  recipients: "user",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Réinitialisation de votre mot de passe Veritas",
  defaultTitle: "Mot de passe oublié",
  defaultBody: "<p>Bonjour{{#user.username}} {{user.username}}{{/user.username}},</p><p>Vous avez demandé la réinitialisation de votre mot de passe Veritas.</p><p><a href=\"{{resetLink}}\">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 15 minutes.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>",
  variables: ["resetLink", "user.email", "user.username"]
}, {
  key: "auth.password_changed",
  group: "auth",
  channels: ["email"],
  recipients: "user",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Votre mot de passe Veritas a été modifié",
  defaultTitle: "Mot de passe modifié",
  defaultBody: "<p>Bonjour,</p><p>Votre mot de passe a été mis à jour avec succès.</p><p>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement votre administrateur.</p>",
  variables: ["user.email", "user.username"]
}, {
  key: "auth.portal_invite",
  group: "auth",
  channels: ["email"],
  recipients: "contact",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Activez votre accès au portail client Veritas",
  defaultTitle: "Invitation portail",
  defaultBody: "<p>Bonjour{{#contact.prenom}} {{contact.prenom}}{{/contact.prenom}},</p><p>Votre prestataire vous a ouvert un accès au portail client Veritas.</p><p><a href=\"{{activateLink}}\">Activer mon accès</a></p><p>Ce lien expire dans 72 heures.</p>",
  variables: ["activateLink", "contact.prenom", "contact.nom", "contact.email"]
}, {
  key: "tickets.created_ack",
  group: "tickets",
  channels: ["email"],
  recipients: "requester",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Ticket #{{ticket.ticket_number}} — nous avons bien reçu votre demande",
  defaultTitle: "Accusé de création",
  defaultBody: "<p>Bonjour{{#requester.prenom}} {{requester.prenom}}{{/requester.prenom}},</p><p>Votre demande a bien été enregistrée.</p><p><strong>Ticket #{{ticket.ticket_number}}</strong> — {{ticket.title}}</p><p>Entreprise : {{entreprise.nom}}</p><p>Nous revenons vers vous dès que possible.</p>",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "ticket.priority", "entreprise.nom", "requester.prenom", "requester.nom", "requester.email"]
}, {
  key: "tickets.assigned",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "assignees",
  inAppKey: "ticket_assigned",
  inAppFields: [],
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Ticket #{{ticket.ticket_number}} vous a été assigné",
  defaultTitle: "Ticket assigné",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>Le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong> vous a été assigné.</p><p>Entreprise : {{entreprise.nom}}</p><p>Assigné par : {{agent.username}}</p>",
  defaultInAppTitle: "Assignation · #{{ticket.ticket_number}}",
  defaultInAppBody: "Vous avez été assigné au ticket {{ticket.title}}.",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "user.username", "user.email", "agent.username"]
}, {
  key: "tickets.updated",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "assignees",
  inAppKey: "ticket_updated",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Ticket #{{ticket.ticket_number}} mis à jour",
  defaultTitle: "Ticket mis à jour",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>Le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong> a été mis à jour.</p><p>Statut : {{ticket.status}}</p><p>Champs modifiés : {{changedFields}}</p>",
  defaultInAppTitle: "Mise à jour · #{{ticket.ticket_number}}",
  defaultInAppBody: "Le ticket {{ticket.title}} a été mis à jour.",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "changedFields", "user.username"]
}, {
  key: "tickets.created",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "assignees",
  inAppKey: "ticket_created",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Nouveau ticket #{{ticket.ticket_number}} — {{ticket.title}}",
  defaultTitle: "Nouveau ticket",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>Un nouveau ticket vous concerne : <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>Entreprise : {{entreprise.nom}}</p>",
  defaultInAppTitle: "Nouveau ticket · #{{ticket.ticket_number}}",
  defaultInAppBody: "Un nouveau ticket a été créé : {{ticket.title}}.",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "user.username"]
}, {
  key: "tickets.commented",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "assignees",
  inAppKey: "ticket_commented",
  inAppFields: ["notifyAssignees", "notifyWatchers", "excludeInternalComments"],
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Nouveau commentaire sur le ticket #{{ticket.ticket_number}}",
  defaultTitle: "Commentaire ticket",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>{{comment.author}} a commenté le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>{{comment.preview}}</p>",
  defaultInAppTitle: "Commentaire · #{{ticket.ticket_number}}",
  defaultInAppBody: "{{comment.author}} : {{comment.preview}}",
  variables: ["ticket.ticket_number", "ticket.title", "comment.author", "comment.preview", "entreprise.nom", "user.username"]
}, {
  key: "tickets.resolved",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "assignees",
  inAppKey: "ticket_resolved",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Ticket #{{ticket.ticket_number}} résolu",
  defaultTitle: "Ticket résolu",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>Le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong> a été marqué comme résolu.</p>",
  defaultInAppTitle: "Résolu · #{{ticket.ticket_number}}",
  defaultInAppBody: "Le ticket {{ticket.title}} est résolu.",
  variables: ["ticket.ticket_number", "ticket.title", "ticket.status", "entreprise.nom", "user.username"]
}, {
  key: "tickets.satisfaction",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "assignees",
  inAppKey: "ticket_satisfaction",
  inAppFields: ["notifyAssignees", "notifyWatchers"],
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Avis client sur le ticket #{{ticket.ticket_number}}",
  defaultTitle: "Satisfaction client",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>{{satisfaction.author}} a noté le ticket <strong>#{{ticket.ticket_number}}</strong> : {{satisfaction.rating}}/5</p><p>{{satisfaction.message}}</p>",
  defaultInAppTitle: "Avis client · #{{ticket.ticket_number}}",
  defaultInAppBody: "{{satisfaction.author}} · {{satisfaction.rating}}/5",
  variables: ["ticket.ticket_number", "ticket.title", "satisfaction.author", "satisfaction.rating", "satisfaction.message", "user.username"]
}, {
  key: "tickets.validation_requested",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "validator",
  inAppKey: "ticket_validation_requested",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Validation demandée — ticket #{{ticket.ticket_number}}",
  defaultTitle: "Validation demandée",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>{{agent.username}} vous demande de valider le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>{{validation.message}}</p>",
  defaultInAppTitle: "Validation · #{{ticket.ticket_number}}",
  defaultInAppBody: "{{agent.username}} demande votre validation.",
  variables: ["ticket.ticket_number", "ticket.title", "agent.username", "validation.message", "user.username"]
}, {
  key: "tickets.validation_responded",
  group: "tickets",
  channels: ["email", "inapp"],
  recipients: "requester_agent",
  inAppKey: "ticket_validation_responded",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Réponse de validation — ticket #{{ticket.ticket_number}}",
  defaultTitle: "Validation répondue",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>{{validation.validator}} a {{validation.decision}} le ticket <strong>#{{ticket.ticket_number}} — {{ticket.title}}</strong></p><p>{{validation.message}}</p>",
  defaultInAppTitle: "Validation · #{{ticket.ticket_number}}",
  defaultInAppBody: "{{validation.validator}} : {{validation.decision}}",
  variables: ["ticket.ticket_number", "ticket.title", "validation.validator", "validation.decision", "validation.message", "user.username"]
}, {
  key: "planning.event_created",
  group: "planning",
  channels: ["email", "inapp"],
  recipients: "assignees",
  defaultEnabled: false,
  defaultEmail: false,
  defaultInApp: false,
  defaultSubject: "Nouvel événement : {{event.title}}",
  defaultTitle: "Événement planifié",
  defaultBody: "<p>Bonjour {{user.username}},</p><p>Un événement vous a été attribué.</p><p><strong>{{event.title}}</strong></p><p>Type : {{event.type}}</p><p>Début : {{event.start}}</p><p>Fin : {{event.end}}</p><p>Entreprise : {{entreprise.nom}}</p>",
  defaultInAppTitle: "Événement · {{event.title}}",
  defaultInAppBody: "Un événement vous a été attribué le {{event.start}}.",
  variables: ["event.title", "event.type", "event.start", "event.end", "event.description", "entreprise.nom", "user.username", "user.email", "agent.username"]
}];

export function getSystemNotificationDef(key) {
  return SYSTEM_NOTIFICATION_DEFS.find(item => item.key === key) || null;
}

function getByPath(source, path) {
  return String(path || "").split(".").reduce((acc, part) => acc == null ? undefined : acc[part], source);
}

export function renderSystemTemplate(content = "", context = {}) {
  const src = String(content || "");
  const withConditionals = src.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, token, inner) => {
    const value = getByPath(context, token);
    if (value === null || value === undefined || value === false || String(value).trim() === "") return "";
    return inner;
  });
  return withConditionals.replace(/\{\{\s*([^}#/][^}]*)\s*\}\}/g, (_m, tokenRaw) => {
    const token = String(tokenRaw || "").trim();
    const value = getByPath(context, token);
    if (value === null || value === undefined || String(value) === "") return "";
    return String(value);
  });
}

function pickFlag(value, fallback) {
  return typeof value === "boolean" ? value : fallback === true;
}

export function normalizeSystemNotification(def, raw = {}) {
  const item = raw && typeof raw === "object" ? raw : {};
  return {
    key: def.key,
    enabled: pickFlag(item.enabled, def.defaultEnabled),
    emailEnabled: def.channels.includes("email") ? pickFlag(item.emailEnabled, def.defaultEmail) : false,
    inAppEnabled: def.channels.includes("inapp") ? pickFlag(item.inAppEnabled, def.defaultInApp) : false,
    subject: String(item.subject || "").trim() || def.defaultSubject,
    title: String(item.title || "").trim() || def.defaultTitle,
    body: String(item.body || item.content || "").trim() || def.defaultBody,
    inAppTitle: String(item.inAppTitle || "").trim() || def.defaultInAppTitle || def.defaultTitle,
    inAppBody: String(item.inAppBody || "").trim() || def.defaultInAppBody || ""
  };
}

export function normalizeSystemNotifications(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(SYSTEM_NOTIFICATION_DEFS.map(def => [def.key, normalizeSystemNotification(def, source[def.key])]));
}
