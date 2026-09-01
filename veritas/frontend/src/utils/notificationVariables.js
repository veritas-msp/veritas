export const NOTIFICATION_VARIABLE_GROUPS = [{
  label: "Dates",
  variables: [{
    key: "{{now.fr}}",
    description: "Date/heure actuelle (format FR)"
  }, {
    key: "{{now.date}}",
    description: "Date actuelle (format FR)"
  }, {
    key: "{{now.time}}",
    description: "Heure actuelle (format FR)"
  }]
}, {
  label: "Agent",
  variables: [{
    key: "{{agent.id}}",
    description: "ID de l'utilisateur qui déclenche l'action"
  }, {
    key: "{{agent.username}}",
    description: "Nom / identifiant de l'utilisateur"
  }, {
    key: "{{agent.email}}",
    description: "Email de l'utilisateur"
  }, {
    key: "{{agent.role}}",
    description: "Rôle de l'utilisateur"
  }]
}, {
  label: "Notification context",
  variables: [{
    key: "{{source}}",
    description: "Source (tickets, entreprise, cyber…)"
  }, {
    key: "{{element}}",
    description: "Élément déclencheur (updated, created…)"
  }, {
    key: "{{enterpriseId}}",
    description: "ID entreprise"
  }, {
    key: "{{enterpriseName}}",
    description: "Nom de l'entreprise"
  }, {
    key: "{{daysUntil}}",
    description: "Jours restants (événements *_soon)"
  }, {
    key: "{{contractEndDate}}",
    description: "Date de fin de contrat"
  }]
}, {
  label: "Company",
  variables: [{
    key: "{{entreprise.id}}",
    description: "ID entreprise"
  }, {
    key: "{{entreprise.nom}}",
    description: "Nom de l'entreprise"
  }, {
    key: "{{entreprise.siret}}",
    description: "Identifiant légal"
  }, {
    key: "{{entreprise.adresse}}",
    description: "Adresse"
  }, {
    key: "{{entreprise.lieux.0}}",
    description: "Premier site"
  }, {
    key: "{{entreprise.lieuxCount}}",
    description: "Nombre de sites"
  }, {
    key: "{{entreprise.secteur}}",
    description: "Secteur d'activité"
  }, {
    key: "{{entreprise.contratStatut}}",
    description: "Statut du contrat"
  }, {
    key: "{{entreprise.contratTypeEntreprise}}",
    description: "Type d'entreprise"
  }, {
    key: "{{entreprise.contratDateDebut}}",
    description: "Date de début de contrat"
  }, {
    key: "{{entreprise.contratDateFin}}",
    description: "Date de fin de contrat"
  }, {
    key: "{{entreprise.contrat.suspendu}}",
    description: "Contrat suspendu (bool)"
  }, {
    key: "{{entreprise.commercial.username}}",
    description: "Commercial (nom)"
  }, {
    key: "{{entreprise.commercial.email}}",
    description: "Commercial (email)"
  }]
}, {
  label: "Ticket",
  variables: [{
    key: "{{ticket.id}}",
    description: "ID ticket"
  }, {
    key: "{{ticket.ticket_number}}",
    description: "Numéro de ticket"
  }, {
    key: "{{ticket.title}}",
    description: "Titre du ticket"
  }, {
    key: "{{ticket.status}}",
    description: "Statut du ticket"
  }, {
    key: "{{oldStatus}}",
    description: "Ancien statut"
  }, {
    key: "{{newStatus}}",
    description: "Nouveau statut"
  }]
}, {
  label: "Contact",
  variables: [{
    key: "{{contact.id}}",
    description: "ID contact"
  }, {
    key: "{{contact.nom}}",
    description: "Nom du contact"
  }, {
    key: "{{contact.prenom}}",
    description: "Prénom du contact"
  }, {
    key: "{{contact.email}}",
    description: "Email du contact"
  }, {
    key: "{{contact.telephone}}",
    description: "Téléphone du contact"
  }, {
    key: "{{contact.poste}}",
    description: "Poste du contact"
  }]
}, {
  label: "Cyber campaign",
  variables: [{
    key: "{{campaign.id}}",
    description: "ID campagne"
  }, {
    key: "{{campaign.name}}",
    description: "Nom de la campagne"
  }, {
    key: "{{campaign.status}}",
    description: "Statut de la campagne"
  }, {
    key: "{{campaign.start_date}}",
    description: "Date de début"
  }, {
    key: "{{campaign.end_date}}",
    description: "Date de fin"
  }]
}, {
  label: "Report",
  variables: [{
    key: "{{report.id}}",
    description: "ID rapport"
  }, {
    key: "{{report.name}}",
    description: "Nom du rapport"
  }, {
    key: "{{report.report_period}}",
    description: "Période du rapport"
  }, {
    key: "{{report.client_name}}",
    description: "Client du rapport"
  }]
}, {
  label: "Equipment",
  variables: [{
    key: "{{material.name}}",
    description: "Nom de l'équipement"
  }, {
    key: "{{material.id}}",
    description: "ID équipement"
  }, {
    key: "{{material.type}}",
    description: "Type d'équipement"
  }, {
    key: "{{material.serial}}",
    description: "Numéro de série"
  }, {
    key: "{{material.list}}",
    description: "Tous les équipements liés"
  }]
}, {
  label: "Technical fields",
  variables: [{
    key: "{{changedFields}}",
    description: "Champs modifiés (liste)"
  }, {
    key: "{{changedFields.0}}",
    description: "1er champ modifié"
  }, {
    key: "{{changes.0.field}}",
    description: "Nom du 1er champ détaillé"
  }, {
    key: "{{changes.0.oldValue}}",
    description: "Ancienne valeur"
  }, {
    key: "{{changes.0.newValue}}",
    description: "Nouvelle valeur"
  }]
}];

const GENERIC_VARIABLE_SECTION_LABELS = ["Notification context", "Dates", "Agent"];

export function resolveNotificationVariableSectionLabels(sourceKey, elementKey) {
  const source = String(sourceKey || "").trim().toLowerCase();
  const element = String(elementKey || "").trim().toLowerCase();
  const labels = new Set(GENERIC_VARIABLE_SECTION_LABELS);
  if (source === "entreprise") labels.add("Company");
  if (source === "contact") {
    labels.add("Contact");
    labels.add("Company");
  }
  if (source === "tickets") {
    labels.add("Ticket");
    labels.add("Company");
  }
  if (source === "cyber") {
    labels.add("Cyber campaign");
    labels.add("Company");
  }
  if (source === "rapport") {
    labels.add("Report");
    labels.add("Company");
  }
  if (source === "infrastructure") {
    labels.add("Equipment");
    labels.add("Company");
  }
  if (source === "services") labels.add("Company");
  if (element.includes("updated")) labels.add("Technical fields");
  return labels;
}

export function getVisibleNotificationVariableGroups(sourceKey, elementKey) {
  const allowed = resolveNotificationVariableSectionLabels(sourceKey, elementKey);
  return NOTIFICATION_VARIABLE_GROUPS.filter(group => allowed.has(group.label));
}
