import { createLocaleGetter, interpolate } from "../../i18n/translate";
import { SUPPORT_SETTINGS_MODALS } from "./adminSupportSettingsModalsI18n";
const TAB_KEYS = ["templates", "macros", "categories", "solution-catalog", "ticket-views"];
const VIEW_META_KEYS = ["templates", "macros", "categories", "solution-catalog", "ticket-views", "sales-ticket-views"];
const TEMPLATE_FORM_SECTION_ICONS = {
  general: "mdi:information-outline",
  content: "mdi:text-box-outline"
};
const MACRO_FORM_SECTION_ICONS = {
  general: "mdi:information-outline",
  actions: "mdi:lightning-bolt-outline"
};
const ITIL_CATEGORY_FORM_SECTION_ICONS = {
  general: "mdi:information-outline",
  details: "mdi:text-box-outline"
};
const ITIL_SECTION_FORM_SECTION_ICONS = {
  general: "mdi:information-outline",
  details: "mdi:text-box-outline"
};
const SUPPORT_SETTINGS_COPY = {
  fr: {
    tabs: {
      templates: "Templates",
      macros: "Macros",
      categories: "Catégories",
      "solution-catalog": "Solutions",
      "ticket-views": "Vues support"
    },
    viewMeta: {
      templates: {
        title: "Modèles de commentaires",
        description: "Textes prédéfinis réutilisables dans les réponses et les automatisations de tickets."
      },
      macros: {
        title: "Enchaînements d'actions",
        description: "Macros exécutables en un clic : statut, commentaire, email, message Teams, etc."
      },
      categories: {
        title: "Arborescence ITIL",
        description: "Sections et catégories proposées lors de la création et du classement des tickets."
      },
      "solution-catalog": {
        title: "Catégories de résolution",
        description: "Types d'intervention et d'action proposés lors de la résolution d'un ticket."
      },
      "ticket-views": {
        title: "Vues support",
        description: "Filtres de tickets et assignation par utilisateur, profil ou équipe."
      },
      "sales-ticket-views": {
        title: "Vues prestations",
        description: "Filtres des tickets Services & installations et assignation par utilisateur, profil ou équipe."
      }
    },
    common: {
      columns: {
        name: "Nom",
        label: "Libellé",
        order: "Ordre",
        status: "Statut",
        description: "Description",
        section: "Section",
        intervention: "Intervention",
        steps: "Étapes",
        view: "Vue",
        visibility: "Visibilité",
        filters: "Filtres",
        assignment: "Assignation"
      },
      actions: {
        preview: "Aperçu",
        edit: "Modifier",
        delete: "Supprimer",
        add: "Ajouter",
        actionsAria: "Actions"
      },
      loading: "Chargement…",
      emptyDash: "-",
      statusActive: "Actif",
      statusInactive: "Inactif",
      rangeEmpty: "0 élément",
      range: "{start}-{end} sur {total}",
      countSection: "{count} section",
      countSectionPlural: "{count} sections",
      countCategory: "{count} catégorie",
      countCategoryPlural: "{count} catégories",
      countEntry: "{count} entrée",
      countEntryPlural: "{count} entrées",
      countView: "{count} vue",
      countViewPlural: "{count} vues"
    },
    templates: {
      addBtn: "Ajouter un template",
      limitTitle: "Limite Community : {max} templates maximum",
      limitReached: "Limite atteinte ({current}/{max} templates).",
      quota: "Quota : {current}/{max} templates actifs.",
      empty: "Aucun template",
      previewTitle: "Aperçu template - {name}",
      previewClose: "Fermer",
      previewOk: "OK",
      previewEmpty: "Aucun contenu à prévisualiser.",
      toast: {
        loadError: "Erreur de chargement templates/macros",
        nameRequired: "Le nom du template est requis",
        limitWarn: "Limite Community : {max} templates maximum. Passez à Veritas Pro pour en ajouter davantage.",
        addError: "Erreur lors de l'ajout du template",
        updateError: "Erreur lors de la mise a jour du template",
        saveError: "Erreur lors de l'enregistrement du template",
        deleteError: "Erreur lors de la suppression du template",
        added: "Template ajouté",
        updated: "Template mis à jour",
        deleted: "Template supprimé"
      }
    },
    macros: {
      addBtn: "Ajouter une macro",
      limitTitle: "Limite Community : {max} macros maximum",
      limitReached: "Limite atteinte ({current}/{max} macros).",
      quota: "Quota : {current}/{max} macros actives.",
      empty: "Aucune macro",
      proLockedHint: "Cette action est réservée à Veritas Pro. Passez à l'édition Pro pour l'utiliser à l'exécution.",
      variablesBtn: "Variables",
      variablesBtnTitle: "Insérer une variable dynamique dans le champ actif",
      variablesBtnLockedTitle: "Variables dynamiques · disponible avec Veritas Pro",
      variablesHint: "Placez le curseur dans un champ, puis choisissez une variable.",
      describe: {
        visibilityInternal: "interne",
        visibilityPublic: "public",
        tagsAdd: "Ajouter",
        tagsRemove: "Retirer",
        manualAttachment: "pièce jointe manuelle"
      },
      placeholders: {
        assignee: "Rechercher un assigné...",
        follower: "Rechercher un follower...",
        category: "Rechercher une catégorie...",
        noAssignee: "Aucun assigné",
        noFollower: "Aucun follower",
        noCategory: "Aucune catégorie",
        newValue: "Nouvelle valeur",
        emailTo: "Destinataire (email)",
        emailCc: "Copie (CC, séparés par virgule)",
        emailSubject: "Objet de l'email",
        emailBody: "Contenu du mail",
        tagsAddOption: "Ajouter des étiquettes",
        tagsRemoveOption: "Retirer des étiquettes",
        tagsList: "étiquette1, étiquette2, étiquette3",
        reminderTitle: "Titre de l'alerte planning",
        reminderOffsetLabel: "Délai (minutes après exécution)",
        reminderNote: "Note de l'alerte (optionnel)",
        selectWebhook: "Sélectionner un webhook",
        noWebhookHint: "Aucun webhook actif. Configurez-en un dans Administration → Tickets → Webhooks.",
        teamsTitle: "Titre du message (optionnel)",
        teamsMessage: "Message Teams",
        phoneNumber: "Numéro à appeler",
        ticketId: "ID ticket à lier",
        equipmentId: "ID matériel à lier",
        manualAttachmentHint: "La pièce jointe sera à ajouter manuellement lors de l'exécution de la macro."
      },
      toast: {
        nameRequired: "Le nom de la macro est requis",
        actionsRequired: "Ajoutez au moins une action dans la macro",
        limitWarn: "Limite Community : {max} macros maximum. Passez à Veritas Pro pour en ajouter davantage.",
        addError: "Erreur lors de l'ajout de la macro",
        updateError: "Erreur lors de la mise a jour de la macro",
        deleteError: "Erreur lors de la suppression de la macro",
        added: "Macro ajoutée",
        updated: "Macro mise à jour",
        deleted: "Macro supprimée"
      }
    },
    categories: {
      newSectionBtn: "Nouvelle section",
      categoriesTitle: "Catégories ITIL",
      uncategorized: "Non classée",
      searchSection: "Rechercher une section…",
      searchCategory: "Rechercher une catégorie…",
      emptySections: "Aucune section ITIL",
      emptySectionsSearch: "Aucune section ne correspond à la recherche.",
      emptyCategories: "Aucune catégorie ITIL",
      emptyCategoriesSearch: "Aucune catégorie ne correspond à la recherche.",
      sectionDeleteBlockedOne: "Suppression impossible : 1 catégorie rattachée",
      sectionDeleteBlockedMany: "Suppression impossible : {count} catégories rattachées",
      sectionDeleteWarnOne: "Impossible de supprimer « {name} » : 1 catégorie ITIL y est encore rattachée.",
      sectionDeleteWarnMany: "Impossible de supprimer « {name} » : {count} catégories ITIL y sont encore rattachées.",
      thisSection: "cette section",
      toast: {
        categoriesLoadError: "Erreur lors du chargement des catégories ITIL",
        sectionsLoadError: "Erreur lors du chargement des sections ITIL",
        categoryNameRequired: "Le nom de la catégorie est requis.",
        categoryAdded: "Catégorie ITIL ajoutée",
        categoryUpdated: "Catégorie ITIL mise à jour",
        categorySaveError: "Erreur lors de la sauvegarde de la catégorie ITIL",
        categoryDeleted: "Catégorie ITIL supprimée",
        categoryDeleteError: "Erreur lors de la suppression de la catégorie ITIL",
        sectionNameRequired: "Le nom de la section est requis.",
        sectionAdded: "Section ITIL ajoutée",
        sectionUpdated: "Section ITIL mise à jour",
        sectionSaveError: "Erreur lors de la sauvegarde de la section ITIL",
        sectionDeleted: "Section ITIL supprimée",
        sectionDeleteError: "Erreur lors de la suppression de la section ITIL"
      }
    },
    solutions: {
      interventionTitle: "Types d'intervention",
      actionTitle: "Types d'action",
      searchIntervention: "Rechercher un type d'intervention…",
      searchAction: "Rechercher un type d'action…",
      emptyInterventions: "Aucun type d'intervention",
      emptyActions: "Aucun type d'action",
      interventionDeleteBlockedOne: "Suppression impossible : 1 type d'action rattaché",
      interventionDeleteBlockedMany: "Suppression impossible : {count} types d'action rattachés",
      interventionDeleteWarnOne: "Impossible de supprimer « {name} » : 1 type d'action y est encore rattaché.",
      interventionDeleteWarnMany: "Impossible de supprimer « {name} » : {count} types d'action y sont encore rattachés.",
      thisIntervention: "ce type d'intervention",
      toast: {
        loadError: "Erreur lors du chargement du catalogue de solutions",
        labelRequired: "Le libellé est requis.",
        interventionRequired: "Le type d'intervention est requis pour un type d'action.",
        added: "Entrée ajoutée au catalogue",
        updated: "Entrée catalogue mise à jour",
        saveError: "Erreur lors de la sauvegarde de l'entrée catalogue",
        deleted: "Entrée catalogue supprimée",
        deleteError: "Erreur lors de la suppression de l'entrée catalogue"
      }
    },
    ticketViews: {
      cardDescription: "Créez des vues de filtrage et assignez-les à des utilisateurs, profils ou équipes.",
      newViewBtn: "Nouvelle vue",
      searchPlaceholder: "Rechercher une vue…",
      filters: {
        all: "Toutes les vues",
        public: "Publiques",
        assigned: "Assignées"
      },
      visibility: {
        public: "Publique",
        assigned: "Assignée",
        private: "Privée"
      },
      builtin: "Intégrée",
      emptyNone: "Aucune vue.",
      createLink: "Créer une vue",
      emptySearch: "Aucune vue ne correspond à la recherche.",
      toast: {
        loadError: "Erreur lors du chargement des vues",
        updated: "Vue mise à jour",
        created: "Vue créée",
        deleted: "Vue supprimée",
        deleteError: "Erreur lors de la suppression"
      }
    },
    templateFormSections: {
      general: {
        label: "Général",
        description: "Nom du template"
      },
      content: {
        label: "Contenu",
        description: "Texte et mise en forme"
      }
    },
    macroFormSections: {
      general: {
        label: "Général",
        description: "Nom de la macro"
      },
      actions: {
        label: "Actions",
        description: "Ordre d'exécution"
      }
    },
    itilCategoryFormSections: {
      general: {
        label: "Général",
        description: "Section et nom"
      },
      details: {
        label: "Détails",
        description: "Description et statut"
      }
    },
    itilSectionFormSections: {
      general: {
        label: "Général",
        description: "Nom et statut"
      },
      details: {
        label: "Détails",
        description: "Description"
      }
    },
    macroActionTypes: [{
      value: "set_field",
      label: "Changer un champ"
    }, {
      value: "add_comment",
      label: "Envoyer un message support"
    }, {
      value: "open_email",
      label: "Ouvrir un email"
    }, {
      value: "manage_tags",
      label: "Gérer les étiquettes"
    }, {
      value: "planning_alert",
      label: "Alerte planning",
      proOnly: true
    }, {
      value: "teams_message",
      label: "Message Teams (webhook)",
      proOnly: true
    }, {
      value: "call",
      label: "Lancer un appel"
    }, {
      value: "add_attachment",
      label: "Ajouter une pièce jointe (manuel)"
    }],
    macroFieldOptions: [{
      value: "assigned_user_id",
      label: "Assigné"
    }, {
      value: "followers",
      label: "Followers"
    }, {
      value: "status",
      label: "Statut"
    }, {
      value: "type",
      label: "Type"
    }, {
      value: "category",
      label: "Catégorie"
    }, {
      value: "priority",
      label: "Priorité"
    }, {
      value: "is_major_incident",
      label: "Incident majeur"
    }, {
      value: "channel",
      label: "Canal"
    }, {
      value: "assigned_to_me",
      label: "Assigner à moi"
    }],
    macroFieldModeOptions: {
      assigned_user_id: [{
        value: "replace",
        label: "Remplacer"
      }, {
        value: "add",
        label: "Ajouter"
      }],
      followers: [{
        value: "add",
        label: "Ajouter"
      }, {
        value: "remove",
        label: "Retirer"
      }, {
        value: "replace",
        label: "Remplacer"
      }]
    },
    macroBoundedFieldValues: {
      status: [{
        value: "new",
        label: "Nouveau"
      }, {
        value: "in_progress",
        label: "En cours"
      }, {
        value: "pending",
        label: "En attente"
      }, {
        value: "resolved",
        label: "Résolu"
      }, {
        value: "closed",
        label: "Clos"
      }],
      type: [{
        value: "incident",
        label: "Incident"
      }, {
        value: "demande",
        label: "Demande"
      }, {
        value: "probleme",
        label: "Problème"
      }, {
        value: "changement",
        label: "Changement"
      }],
      priority: [{
        value: "low",
        label: "Basse"
      }, {
        value: "normal",
        label: "Normale"
      }, {
        value: "high",
        label: "Haute"
      }, {
        value: "urgent",
        label: "Urgente"
      }],
      channel: [{
        value: "phone",
        label: "Téléphone"
      }, {
        value: "email",
        label: "Email"
      }, {
        value: "web",
        label: "Web"
      }, {
        value: "chat",
        label: "Chat"
      }, {
        value: "whatsapp",
        label: "WhatsApp"
      }],
      is_major_incident: [{
        value: "true",
        label: "Oui"
      }, {
        value: "false",
        label: "Non"
      }],
      assigned_to_me: [{
        value: "true",
        label: "Oui"
      }, {
        value: "false",
        label: "Non"
      }]
    },
    modals: SUPPORT_SETTINGS_MODALS.fr
  },
  en: {
    tabs: {
      templates: "Templates",
      macros: "Macros",
      categories: "Categories",
      "solution-catalog": "Solutions",
      "ticket-views": "Support views"
    },
    viewMeta: {
      templates: {
        title: "Comment templates",
        description: "Predefined texts reused in ticket replies and automations."
      },
      macros: {
        title: "Action sequences",
        description: "One-click macros: status, comment, email, Teams message, etc."
      },
      categories: {
        title: "ITIL tree",
        description: "Sections and categories offered when creating and classifying tickets."
      },
      "solution-catalog": {
        title: "Resolution categories",
        description: "Intervention and action types offered when resolving a ticket."
      },
      "ticket-views": {
        title: "Support views",
        description: "Ticket filters and assignment by user, profile or team."
      },
      "sales-ticket-views": {
        title: "Service views",
        description: "Filters for Services & installations tickets and assignment by user, profile or team."
      }
    },
    common: {
      columns: {
        name: "Name",
        label: "Label",
        order: "Order",
        status: "Status",
        description: "Description",
        section: "Section",
        intervention: "Intervention",
        steps: "Steps",
        view: "View",
        visibility: "Visibility",
        filters: "Filters",
        assignment: "Assignment"
      },
      actions: {
        preview: "Preview",
        edit: "Edit",
        delete: "Delete",
        add: "Add",
        actionsAria: "Actions"
      },
      loading: "Loading…",
      emptyDash: "-",
      statusActive: "Active",
      statusInactive: "Inactive",
      rangeEmpty: "0 items",
      range: "{start}-{end} of {total}",
      countSection: "{count} section",
      countSectionPlural: "{count} sections",
      countCategory: "{count} category",
      countCategoryPlural: "{count} categories",
      countEntry: "{count} entry",
      countEntryPlural: "{count} entries",
      countView: "{count} view",
      countViewPlural: "{count} views"
    },
    templates: {
      addBtn: "Add template",
      limitTitle: "Community limit: {max} templates maximum",
      limitReached: "Limit reached ({current}/{max} templates).",
      quota: "Quota: {current}/{max} active templates.",
      empty: "No templates",
      previewTitle: "Template preview - {name}",
      previewClose: "Close",
      previewOk: "OK",
      previewEmpty: "No content to preview.",
      toast: {
        loadError: "Error loading templates/macros",
        nameRequired: "Template name is required",
        limitWarn: "Community limit: {max} templates maximum. Upgrade to Veritas Pro to add more.",
        addError: "Error while adding template",
        updateError: "Error while updating template",
        saveError: "Error while saving template",
        deleteError: "Error while deleting template",
        added: "Template added",
        updated: "Template updated",
        deleted: "Template deleted"
      }
    },
    macros: {
      addBtn: "Add macro",
      limitTitle: "Community limit: {max} macros maximum",
      limitReached: "Limit reached ({current}/{max} macros).",
      quota: "Quota: {current}/{max} active macros.",
      empty: "No macros",
      proLockedHint: "This action is reserved for Veritas Pro. Upgrade to Pro to use it at runtime.",
      variablesBtn: "Variables",
      variablesBtnTitle: "Insert a dynamic variable into the active field",
      variablesBtnLockedTitle: "Dynamic variables · available with Veritas Pro",
      variablesHint: "Place the cursor in a field, then pick a variable.",
      describe: {
        visibilityInternal: "internal",
        visibilityPublic: "public",
        tagsAdd: "Add",
        tagsRemove: "Remove",
        manualAttachment: "manual attachment"
      },
      placeholders: {
        assignee: "Search for an assignee...",
        follower: "Search for a follower...",
        category: "Search for a category...",
        noAssignee: "No assignee",
        noFollower: "No follower",
        noCategory: "No category",
        newValue: "New value",
        emailTo: "Recipient (email)",
        emailCc: "Copy (CC, comma-separated)",
        emailSubject: "Email subject",
        emailBody: "Email body",
        tagsAddOption: "Add tags",
        tagsRemoveOption: "Remove tags",
        tagsList: "tag1, tag2, tag3",
        reminderTitle: "Planning alert title",
        reminderOffsetLabel: "Delay (minutes after execution)",
        reminderNote: "Alert note (optional)",
        selectWebhook: "Select a webhook",
        noWebhookHint: "No active webhook. Configure one in Administration → Tickets → Webhooks.",
        teamsTitle: "Message title (optional)",
        teamsMessage: "Teams message",
        phoneNumber: "Phone number to call",
        ticketId: "Ticket ID to link",
        equipmentId: "Equipment ID to link",
        manualAttachmentHint: "The attachment must be added manually when running the macro."
      },
      toast: {
        nameRequired: "Macro name is required",
        actionsRequired: "Add at least one action to the macro",
        limitWarn: "Community limit: {max} macros maximum. Upgrade to Veritas Pro to add more.",
        addError: "Error while adding macro",
        updateError: "Error while updating macro",
        deleteError: "Error while deleting macro",
        added: "Macro added",
        updated: "Macro updated",
        deleted: "Macro deleted"
      }
    },
    categories: {
      newSectionBtn: "New section",
      categoriesTitle: "ITIL categories",
      uncategorized: "Uncategorized",
      searchSection: "Search for a section…",
      searchCategory: "Search for a category…",
      emptySections: "No ITIL sections",
      emptySectionsSearch: "No section matches your search.",
      emptyCategories: "No ITIL categories",
      emptyCategoriesSearch: "No category matches your search.",
      sectionDeleteBlockedOne: "Cannot delete: 1 linked category",
      sectionDeleteBlockedMany: "Cannot delete: {count} linked categories",
      sectionDeleteWarnOne: "Cannot delete « {name} »: 1 ITIL category is still linked to it.",
      sectionDeleteWarnMany: "Cannot delete « {name} »: {count} ITIL categories are still linked to it.",
      thisSection: "this section",
      toast: {
        categoriesLoadError: "Error loading ITIL categories",
        sectionsLoadError: "Error loading ITIL sections",
        categoryNameRequired: "Category name is required.",
        categoryAdded: "ITIL category added",
        categoryUpdated: "ITIL category updated",
        categorySaveError: "Error saving ITIL category",
        categoryDeleted: "ITIL category deleted",
        categoryDeleteError: "Error deleting ITIL category",
        sectionNameRequired: "Section name is required.",
        sectionAdded: "ITIL section added",
        sectionUpdated: "ITIL section updated",
        sectionSaveError: "Error saving ITIL section",
        sectionDeleted: "ITIL section deleted",
        sectionDeleteError: "Error deleting ITIL section"
      }
    },
    solutions: {
      interventionTitle: "Intervention types",
      actionTitle: "Action types",
      searchIntervention: "Search for an intervention type…",
      searchAction: "Search for an action type…",
      emptyInterventions: "No intervention types",
      emptyActions: "No action types",
      interventionDeleteBlockedOne: "Cannot delete: 1 linked action type",
      interventionDeleteBlockedMany: "Cannot delete: {count} linked action types",
      interventionDeleteWarnOne: "Cannot delete « {name} »: 1 action type is still linked to it.",
      interventionDeleteWarnMany: "Cannot delete « {name} »: {count} action types are still linked to it.",
      thisIntervention: "this intervention type",
      toast: {
        loadError: "Error loading solution catalog",
        labelRequired: "Label is required.",
        interventionRequired: "An intervention type is required for an action type.",
        added: "Catalog entry added",
        updated: "Catalog entry updated",
        saveError: "Error saving catalog entry",
        deleted: "Catalog entry deleted",
        deleteError: "Error deleting catalog entry"
      }
    },
    ticketViews: {
      cardDescription: "Create filter views and assign them to users, profiles or teams.",
      newViewBtn: "New view",
      searchPlaceholder: "Search for a view…",
      filters: {
        all: "All views",
        public: "Public",
        assigned: "Assigned"
      },
      visibility: {
        public: "Public",
        assigned: "Assigned",
        private: "Private"
      },
      builtin: "Built-in",
      emptyNone: "No views.",
      createLink: "Create a view",
      emptySearch: "No view matches your search.",
      toast: {
        loadError: "Error loading views",
        updated: "View updated",
        created: "View created",
        deleted: "View deleted",
        deleteError: "Error while deleting"
      }
    },
    templateFormSections: {
      general: {
        label: "General",
        description: "Template name"
      },
      content: {
        label: "Content",
        description: "Text and formatting"
      }
    },
    macroFormSections: {
      general: {
        label: "General",
        description: "Macro name"
      },
      actions: {
        label: "Actions",
        description: "Execution order"
      }
    },
    itilCategoryFormSections: {
      general: {
        label: "General",
        description: "Section and name"
      },
      details: {
        label: "Details",
        description: "Description and status"
      }
    },
    itilSectionFormSections: {
      general: {
        label: "General",
        description: "Name and status"
      },
      details: {
        label: "Details",
        description: "Description"
      }
    },
    macroActionTypes: [{
      value: "set_field",
      label: "Change a field"
    }, {
      value: "add_comment",
      label: "Send a support message"
    }, {
      value: "open_email",
      label: "Open an email"
    }, {
      value: "manage_tags",
      label: "Manage tags"
    }, {
      value: "planning_alert",
      label: "Planning alert",
      proOnly: true
    }, {
      value: "teams_message",
      label: "Teams message (webhook)",
      proOnly: true
    }, {
      value: "call",
      label: "Start a call"
    }, {
      value: "add_attachment",
      label: "Add attachment (manual)"
    }],
    macroFieldOptions: [{
      value: "assigned_user_id",
      label: "Assignee"
    }, {
      value: "followers",
      label: "Followers"
    }, {
      value: "status",
      label: "Status"
    }, {
      value: "type",
      label: "Type"
    }, {
      value: "category",
      label: "Category"
    }, {
      value: "priority",
      label: "Priority"
    }, {
      value: "is_major_incident",
      label: "Major incident"
    }, {
      value: "channel",
      label: "Channel"
    }, {
      value: "assigned_to_me",
      label: "Assign to me"
    }],
    macroFieldModeOptions: {
      assigned_user_id: [{
        value: "replace",
        label: "Replace"
      }, {
        value: "add",
        label: "Add"
      }],
      followers: [{
        value: "add",
        label: "Add"
      }, {
        value: "remove",
        label: "Remove"
      }, {
        value: "replace",
        label: "Replace"
      }]
    },
    macroBoundedFieldValues: {
      status: [{
        value: "new",
        label: "New"
      }, {
        value: "in_progress",
        label: "In progress"
      }, {
        value: "pending",
        label: "Pending"
      }, {
        value: "resolved",
        label: "Resolved"
      }, {
        value: "closed",
        label: "Closed"
      }],
      type: [{
        value: "incident",
        label: "Incident"
      }, {
        value: "demande",
        label: "Request"
      }, {
        value: "probleme",
        label: "Problem"
      }, {
        value: "changement",
        label: "Change"
      }],
      priority: [{
        value: "low",
        label: "Low"
      }, {
        value: "normal",
        label: "Normal"
      }, {
        value: "high",
        label: "High"
      }, {
        value: "urgent",
        label: "Urgent"
      }],
      channel: [{
        value: "phone",
        label: "Phone"
      }, {
        value: "email",
        label: "Email"
      }, {
        value: "web",
        label: "Web"
      }, {
        value: "chat",
        label: "Chat"
      }, {
        value: "whatsapp",
        label: "WhatsApp"
      }],
      is_major_incident: [{
        value: "true",
        label: "Yes"
      }, {
        value: "false",
        label: "No"
      }],
      assigned_to_me: [{
        value: "true",
        label: "Yes"
      }, {
        value: "false",
        label: "No"
      }]
    },
    modals: SUPPORT_SETTINGS_MODALS.en
  },
  de: {
    tabs: {
      templates: "Templates",
      macros: "Makros",
      categories: "Kategorien",
      "solution-catalog": "Lösungen",
      "ticket-views": "Support-Ansichten"
    },
    viewMeta: {
      templates: {
        title: "Kommentarvorlagen",
        description: "Vordefinierte Texte für Ticket-Antworten und Automatisierungen."
      },
      macros: {
        title: "Aktionsketten",
        description: "Makros per Klick: Status, Kommentar, E-Mail, Teams-Nachricht usw."
      },
      categories: {
        title: "ITIL-Baum",
        description: "Abschnitte und Kategorien bei Ticket-Erstellung und -Klassifizierung."
      },
      "solution-catalog": {
        title: "Lösungskategorien",
        description: "Interventions- und Aktionstypen bei Ticket-Lösung."
      },
      "ticket-views": {
        title: "Support-Ansichten",
        description: "Ticket-Filter und Zuweisung nach Benutzer, Profil oder Team."
      },
      "sales-ticket-views": {
        title: "Leistungsansichten",
        description: "Filter für Leistungs- und Installationstickets und Zuweisung nach Benutzer, Profil oder Team."
      }
    },
    common: {
      columns: {
        name: "Name",
        label: "Bezeichnung",
        order: "Reihenfolge",
        status: "Status",
        description: "Beschreibung",
        section: "Abschnitt",
        intervention: "Intervention",
        steps: "Schritte",
        view: "Ansicht",
        visibility: "Sichtbarkeit",
        filters: "Filter",
        assignment: "Zuweisung"
      },
      actions: {
        preview: "Vorschau",
        edit: "Bearbeiten",
        delete: "Löschen",
        add: "Hinzufügen",
        actionsAria: "Aktionen"
      },
      loading: "Laden…",
      emptyDash: "-",
      statusActive: "Aktiv",
      statusInactive: "Inaktiv",
      rangeEmpty: "0 Einträge",
      range: "{start}-{end} von {total}",
      countSection: "{count} Abschnitt",
      countSectionPlural: "{count} Abschnitte",
      countCategory: "{count} Kategorie",
      countCategoryPlural: "{count} Kategorien",
      countEntry: "{count} Eintrag",
      countEntryPlural: "{count} Einträge",
      countView: "{count} Ansicht",
      countViewPlural: "{count} Ansichten"
    },
    templates: {
      addBtn: "Template hinzufügen",
      limitTitle: "Community-Limit: maximal {max} Templates",
      limitReached: "Limit erreicht ({current}/{max} Templates).",
      quota: "Kontingent: {current}/{max} aktive Templates.",
      empty: "Keine Templates",
      previewTitle: "Template-Vorschau - {name}",
      previewClose: "Schließen",
      previewOk: "OK",
      previewEmpty: "Kein Inhalt zur Vorschau.",
      toast: {
        loadError: "Fehler beim Laden von Templates/Makros",
        nameRequired: "Template-Name ist erforderlich",
        limitWarn: "Community-Limit: maximal {max} Templates. Wechseln Sie zu Veritas Pro für mehr.",
        addError: "Fehler beim Hinzufügen des Templates",
        updateError: "Fehler beim Aktualisieren des Templates",
        saveError: "Fehler beim Speichern des Templates",
        deleteError: "Fehler beim Löschen des Templates",
        added: "Template hinzugefügt",
        updated: "Template aktualisiert",
        deleted: "Template gelöscht"
      }
    },
    macros: {
      addBtn: "Makro hinzufügen",
      limitTitle: "Community-Limit: maximal {max} Makros",
      limitReached: "Limit erreicht ({current}/{max} Makros).",
      quota: "Kontingent: {current}/{max} aktive Makros.",
      empty: "Keine Makros",
      proLockedHint: "Diese Aktion ist Veritas Pro vorbehalten. Wechseln Sie zu Pro, um sie auszuführen.",
      variablesBtn: "Variablen",
      variablesBtnTitle: "Dynamische Variable in das aktive Feld einfügen",
      variablesBtnLockedTitle: "Dynamische Variablen · verfügbar mit Veritas Pro",
      variablesHint: "Cursor in ein Feld setzen, dann eine Variable wählen.",
      describe: {
        visibilityInternal: "intern",
        visibilityPublic: "öffentlich",
        tagsAdd: "Hinzufügen",
        tagsRemove: "Entfernen",
        manualAttachment: "manueller Anhang"
      },
      placeholders: {
        assignee: "Assignee suchen...",
        follower: "Follower suchen...",
        category: "Kategorie suchen...",
        noAssignee: "Kein Assignee",
        noFollower: "Kein Follower",
        noCategory: "Keine Kategorie",
        newValue: "Neuer Wert",
        emailTo: "Empfänger (E-Mail)",
        emailCc: "Kopie (CC, kommagetrennt)",
        emailSubject: "E-Mail-Betreff",
        emailBody: "E-Mail-Inhalt",
        tagsAddOption: "Tags hinzufügen",
        tagsRemoveOption: "Tags entfernen",
        tagsList: "tag1, tag2, tag3",
        reminderTitle: "Titel der Planungswarnung",
        reminderOffsetLabel: "Verzögerung (Minuten nach Ausführung)",
        reminderNote: "Hinweis zur Warnung (optional)",
        selectWebhook: "Webhook auswählen",
        noWebhookHint: "Kein aktiver Webhook. Konfigurieren Sie einen unter Administration → Tickets → Webhooks.",
        teamsTitle: "Nachrichtentitel (optional)",
        teamsMessage: "Teams-Nachricht",
        phoneNumber: "Anzurufende Nummer",
        ticketId: "Zu verknüpfende Ticket-ID",
        equipmentId: "Zu verknüpfende Geräte-ID",
        manualAttachmentHint: "Der Anhang muss bei der Makro-Ausführung manuell hinzugefügt werden."
      },
      toast: {
        nameRequired: "Makro-Name ist erforderlich",
        actionsRequired: "Fügen Sie mindestens eine Aktion zum Makro hinzu",
        limitWarn: "Community-Limit: maximal {max} Makros. Wechseln Sie zu Veritas Pro für mehr.",
        addError: "Fehler beim Hinzufügen des Makros",
        updateError: "Fehler beim Aktualisieren des Makros",
        deleteError: "Fehler beim Löschen des Makros",
        added: "Makro hinzugefügt",
        updated: "Makro aktualisiert",
        deleted: "Makro gelöscht"
      }
    },
    categories: {
      newSectionBtn: "Neuer Abschnitt",
      categoriesTitle: "ITIL-Kategorien",
      uncategorized: "Nicht klassifiziert",
      searchSection: "Abschnitt suchen…",
      searchCategory: "Kategorie suchen…",
      emptySections: "Keine ITIL-Abschnitte",
      emptySectionsSearch: "Kein Abschnitt entspricht der Suche.",
      emptyCategories: "Keine ITIL-Kategorien",
      emptyCategoriesSearch: "Keine Kategorie entspricht der Suche.",
      sectionDeleteBlockedOne: "Löschen nicht möglich: 1 verknüpfte Kategorie",
      sectionDeleteBlockedMany: "Löschen nicht möglich: {count} verknüpfte Kategorien",
      sectionDeleteWarnOne: "« {name} » kann nicht gelöscht werden: 1 ITIL-Kategorie ist noch verknüpft.",
      sectionDeleteWarnMany: "« {name} » kann nicht gelöscht werden: {count} ITIL-Kategorien sind noch verknüpft.",
      thisSection: "dieser Abschnitt",
      toast: {
        categoriesLoadError: "Fehler beim Laden der ITIL-Kategorien",
        sectionsLoadError: "Fehler beim Laden der ITIL-Abschnitte",
        categoryNameRequired: "Kategoriename ist erforderlich.",
        categoryAdded: "ITIL-Kategorie hinzugefügt",
        categoryUpdated: "ITIL-Kategorie aktualisiert",
        categorySaveError: "Fehler beim Speichern der ITIL-Kategorie",
        categoryDeleted: "ITIL-Kategorie gelöscht",
        categoryDeleteError: "Fehler beim Löschen der ITIL-Kategorie",
        sectionNameRequired: "Abschnittsname ist erforderlich.",
        sectionAdded: "ITIL-Abschnitt hinzugefügt",
        sectionUpdated: "ITIL-Abschnitt aktualisiert",
        sectionSaveError: "Fehler beim Speichern des ITIL-Abschnitts",
        sectionDeleted: "ITIL-Abschnitt gelöscht",
        sectionDeleteError: "Fehler beim Löschen des ITIL-Abschnitts"
      }
    },
    solutions: {
      interventionTitle: "Interventionstypen",
      actionTitle: "Aktionstypen",
      searchIntervention: "Interventionstyp suchen…",
      searchAction: "Aktionstyp suchen…",
      emptyInterventions: "Keine Interventionstypen",
      emptyActions: "Keine Aktionstypen",
      interventionDeleteBlockedOne: "Löschen nicht möglich: 1 verknüpfter Aktionstyp",
      interventionDeleteBlockedMany: "Löschen nicht möglich: {count} verknüpfte Aktionstypen",
      interventionDeleteWarnOne: "« {name} » kann nicht gelöscht werden: 1 Aktionstyp ist noch verknüpft.",
      interventionDeleteWarnMany: "« {name} » kann nicht gelöscht werden: {count} Aktionstypen sind noch verknüpft.",
      thisIntervention: "dieser Interventionstyp",
      toast: {
        loadError: "Fehler beim Laden des Lösungskatalogs",
        labelRequired: "Bezeichnung ist erforderlich.",
        interventionRequired: "Ein Interventionstyp ist für einen Aktionstyp erforderlich.",
        added: "Katalogeintrag hinzugefügt",
        updated: "Katalogeintrag aktualisiert",
        saveError: "Fehler beim Speichern des Katalogeintrags",
        deleted: "Katalogeintrag gelöscht",
        deleteError: "Fehler beim Löschen des Katalogeintrags"
      }
    },
    ticketViews: {
      cardDescription: "Erstellen Sie Filteransichten und weisen Sie sie Benutzern, Profilen oder Teams zu.",
      newViewBtn: "Neue Ansicht",
      searchPlaceholder: "Ansicht suchen…",
      filters: {
        all: "Alle Ansichten",
        public: "Öffentlich",
        assigned: "Zugewiesen"
      },
      visibility: {
        public: "Öffentlich",
        assigned: "Zugewiesen",
        private: "Privat"
      },
      builtin: "Integriert",
      emptyNone: "Keine Ansichten.",
      createLink: "Ansicht erstellen",
      emptySearch: "Keine Ansicht entspricht der Suche.",
      toast: {
        loadError: "Fehler beim Laden der Ansichten",
        updated: "Ansicht aktualisiert",
        created: "Ansicht erstellt",
        deleted: "Ansicht gelöscht",
        deleteError: "Fehler beim Löschen"
      }
    },
    templateFormSections: {
      general: {
        label: "Allgemein",
        description: "Template-Name"
      },
      content: {
        label: "Inhalt",
        description: "Text und Formatierung"
      }
    },
    macroFormSections: {
      general: {
        label: "Allgemein",
        description: "Makro-Name"
      },
      actions: {
        label: "Aktionen",
        description: "Ausführungsreihenfolge"
      }
    },
    itilCategoryFormSections: {
      general: {
        label: "Allgemein",
        description: "Abschnitt und Name"
      },
      details: {
        label: "Details",
        description: "Beschreibung und Status"
      }
    },
    itilSectionFormSections: {
      general: {
        label: "Allgemein",
        description: "Name und Status"
      },
      details: {
        label: "Details",
        description: "Beschreibung"
      }
    },
    macroActionTypes: [{
      value: "set_field",
      label: "Feld ändern"
    }, {
      value: "add_comment",
      label: "Support-Nachricht senden"
    }, {
      value: "open_email",
      label: "E-Mail öffnen"
    }, {
      value: "manage_tags",
      label: "Tags verwalten"
    }, {
      value: "planning_alert",
      label: "Planungswarnung",
      proOnly: true
    }, {
      value: "teams_message",
      label: "Teams-Nachricht (Webhook)",
      proOnly: true
    }, {
      value: "call",
      label: "Anruf starten"
    }, {
      value: "add_attachment",
      label: "Anhang hinzufügen (manuell)"
    }],
    macroFieldOptions: [{
      value: "assigned_user_id",
      label: "Zugewiesen"
    }, {
      value: "followers",
      label: "Follower"
    }, {
      value: "status",
      label: "Status"
    }, {
      value: "type",
      label: "Typ"
    }, {
      value: "category",
      label: "Kategorie"
    }, {
      value: "priority",
      label: "Priorität"
    }, {
      value: "is_major_incident",
      label: "Schwerer Vorfall"
    }, {
      value: "channel",
      label: "Kanal"
    }, {
      value: "assigned_to_me",
      label: "Mir zuweisen"
    }],
    macroFieldModeOptions: {
      assigned_user_id: [{
        value: "replace",
        label: "Ersetzen"
      }, {
        value: "add",
        label: "Hinzufügen"
      }],
      followers: [{
        value: "add",
        label: "Hinzufügen"
      }, {
        value: "remove",
        label: "Entfernen"
      }, {
        value: "replace",
        label: "Ersetzen"
      }]
    },
    macroBoundedFieldValues: {
      status: [{
        value: "new",
        label: "Neu"
      }, {
        value: "in_progress",
        label: "In Bearbeitung"
      }, {
        value: "pending",
        label: "Ausstehend"
      }, {
        value: "resolved",
        label: "Gelöst"
      }, {
        value: "closed",
        label: "Geschlossen"
      }],
      type: [{
        value: "incident",
        label: "Vorfall"
      }, {
        value: "demande",
        label: "Anfrage"
      }, {
        value: "probleme",
        label: "Problem"
      }, {
        value: "changement",
        label: "Änderung"
      }],
      priority: [{
        value: "low",
        label: "Niedrig"
      }, {
        value: "normal",
        label: "Normal"
      }, {
        value: "high",
        label: "Hoch"
      }, {
        value: "urgent",
        label: "Dringend"
      }],
      channel: [{
        value: "phone",
        label: "Telefon"
      }, {
        value: "email",
        label: "E-Mail"
      }, {
        value: "web",
        label: "Web"
      }, {
        value: "chat",
        label: "Chat"
      }, {
        value: "whatsapp",
        label: "WhatsApp"
      }],
      is_major_incident: [{
        value: "true",
        label: "Ja"
      }, {
        value: "false",
        label: "Nein"
      }],
      assigned_to_me: [{
        value: "true",
        label: "Ja"
      }, {
        value: "false",
        label: "Nein"
      }]
    },
    modals: SUPPORT_SETTINGS_MODALS.de
  },
  it: {
    tabs: {
      templates: "Template",
      macros: "Macro",
      categories: "Categorie",
      "solution-catalog": "Soluzioni",
      "ticket-views": "Viste supporto"
    },
    viewMeta: {
      templates: {
        title: "Modelli di commento",
        description: "Testi predefiniti riutilizzabili nelle risposte e automazioni ticket."
      },
      macros: {
        title: "Sequenze di azioni",
        description: "Macro eseguibili in un clic: stato, commento, email, messaggio Teams, ecc."
      },
      categories: {
        title: "Albero ITIL",
        description: "Sezioni e categorie proposte alla creazione e classificazione dei ticket."
      },
      "solution-catalog": {
        title: "Categorie di risoluzione",
        description: "Tipi di intervento e azione proposti alla risoluzione di un ticket."
      },
      "ticket-views": {
        title: "Viste supporto",
        description: "Filtri ticket e assegnazione per utente, profilo o team."
      },
      "sales-ticket-views": {
        title: "Viste prestazioni",
        description: "Filtri dei ticket Servizi e installazioni e assegnazione per utente, profilo o team."
      }
    },
    common: {
      columns: {
        name: "Nome",
        label: "Etichetta",
        order: "Ordine",
        status: "Stato",
        description: "Descrizione",
        section: "Sezione",
        intervention: "Intervento",
        steps: "Passaggi",
        view: "Vista",
        visibility: "Visibilità",
        filters: "Filtri",
        assignment: "Assegnazione"
      },
      actions: {
        preview: "Anteprima",
        edit: "Modifica",
        delete: "Elimina",
        add: "Aggiungi",
        actionsAria: "Azioni"
      },
      loading: "Caricamento…",
      emptyDash: "-",
      statusActive: "Attivo",
      statusInactive: "Inattivo",
      rangeEmpty: "0 elementi",
      range: "{start}-{end} di {total}",
      countSection: "{count} sezione",
      countSectionPlural: "{count} sezioni",
      countCategory: "{count} categoria",
      countCategoryPlural: "{count} categorie",
      countEntry: "{count} voce",
      countEntryPlural: "{count} voci",
      countView: "{count} vista",
      countViewPlural: "{count} viste"
    },
    templates: {
      addBtn: "Aggiungi template",
      limitTitle: "Limite Community: massimo {max} template",
      limitReached: "Limite raggiunto ({current}/{max} template).",
      quota: "Quota: {current}/{max} template attivi.",
      empty: "Nessun template",
      previewTitle: "Anteprima template - {name}",
      previewClose: "Chiudi",
      previewOk: "OK",
      previewEmpty: "Nessun contenuto da anteprima.",
      toast: {
        loadError: "Errore caricamento template/macro",
        nameRequired: "Il nome del template è obbligatorio",
        limitWarn: "Limite Community: massimo {max} template. Passa a Veritas Pro per aggiungerne altri.",
        addError: "Errore durante l'aggiunta del template",
        updateError: "Errore durante l'aggiornamento del template",
        saveError: "Errore durante il salvataggio del template",
        deleteError: "Errore durante l'eliminazione del template",
        added: "Template aggiunto",
        updated: "Template aggiornato",
        deleted: "Template eliminato"
      }
    },
    macros: {
      addBtn: "Aggiungi macro",
      limitTitle: "Limite Community: massimo {max} macro",
      limitReached: "Limite raggiunto ({current}/{max} macro).",
      quota: "Quota: {current}/{max} macro attive.",
      empty: "Nessuna macro",
      proLockedHint: "Questa azione è riservata a Veritas Pro. Passa a Pro per usarla all'esecuzione.",
      variablesBtn: "Variabili",
      variablesBtnTitle: "Inserisci una variabile dinamica nel campo attivo",
      variablesBtnLockedTitle: "Variabili dinamiche · disponibile con Veritas Pro",
      variablesHint: "Posiziona il cursore in un campo, poi scegli una variabile.",
      describe: {
        visibilityInternal: "interno",
        visibilityPublic: "pubblico",
        tagsAdd: "Aggiungi",
        tagsRemove: "Rimuovi",
        manualAttachment: "allegato manuale"
      },
      placeholders: {
        assignee: "Cerca un assegnatario...",
        follower: "Cerca un follower...",
        category: "Cerca una categoria...",
        noAssignee: "Nessun assegnatario",
        noFollower: "Nessun follower",
        noCategory: "Nessuna categoria",
        newValue: "Nuovo valore",
        emailTo: "Destinatario (email)",
        emailCc: "Copia (CC, separati da virgola)",
        emailSubject: "Oggetto email",
        emailBody: "Contenuto email",
        tagsAddOption: "Aggiungi etichette",
        tagsRemoveOption: "Rimuovi etichette",
        tagsList: "etichetta1, etichetta2, etichetta3",
        reminderTitle: "Titolo avviso pianificazione",
        reminderOffsetLabel: "Ritardo (minuti dopo l'esecuzione)",
        reminderNote: "Nota avviso (opzionale)",
        selectWebhook: "Seleziona un webhook",
        noWebhookHint: "Nessun webhook attivo. Configurane uno in Amministrazione → Ticket → Webhook.",
        teamsTitle: "Titolo messaggio (opzionale)",
        teamsMessage: "Messaggio Teams",
        phoneNumber: "Numero da chiamare",
        ticketId: "ID ticket da collegare",
        equipmentId: "ID materiale da collegare",
        manualAttachmentHint: "L'allegato dovrà essere aggiunto manualmente all'esecuzione della macro."
      },
      toast: {
        nameRequired: "Il nome della macro è obbligatorio",
        actionsRequired: "Aggiungi almeno un'azione alla macro",
        limitWarn: "Limite Community: massimo {max} macro. Passa a Veritas Pro per aggiungerne altre.",
        addError: "Errore durante l'aggiunta della macro",
        updateError: "Errore durante l'aggiornamento della macro",
        deleteError: "Errore durante l'eliminazione della macro",
        added: "Macro aggiunta",
        updated: "Macro aggiornata",
        deleted: "Macro eliminata"
      }
    },
    categories: {
      newSectionBtn: "Nuova sezione",
      categoriesTitle: "Categorie ITIL",
      uncategorized: "Non classificata",
      searchSection: "Cerca una sezione…",
      searchCategory: "Cerca una categoria…",
      emptySections: "Nessuna sezione ITIL",
      emptySectionsSearch: "Nessuna sezione corrisponde alla ricerca.",
      emptyCategories: "Nessuna categoria ITIL",
      emptyCategoriesSearch: "Nessuna categoria corrisponde alla ricerca.",
      sectionDeleteBlockedOne: "Eliminazione impossibile: 1 categoria collegata",
      sectionDeleteBlockedMany: "Eliminazione impossibile: {count} categorie collegate",
      sectionDeleteWarnOne: "Impossibile eliminare « {name} »: 1 categoria ITIL vi è ancora collegata.",
      sectionDeleteWarnMany: "Impossibile eliminare « {name} »: {count} categorie ITIL vi sono ancora collegate.",
      thisSection: "questa sezione",
      toast: {
        categoriesLoadError: "Errore caricamento categorie ITIL",
        sectionsLoadError: "Errore caricamento sezioni ITIL",
        categoryNameRequired: "Il nome della categoria è obbligatorio.",
        categoryAdded: "Categoria ITIL aggiunta",
        categoryUpdated: "Categoria ITIL aggiornata",
        categorySaveError: "Errore salvataggio categoria ITIL",
        categoryDeleted: "Categoria ITIL eliminata",
        categoryDeleteError: "Errore eliminazione categoria ITIL",
        sectionNameRequired: "Il nome della sezione è obbligatorio.",
        sectionAdded: "Sezione ITIL aggiunta",
        sectionUpdated: "Sezione ITIL aggiornata",
        sectionSaveError: "Errore salvataggio sezione ITIL",
        sectionDeleted: "Sezione ITIL eliminata",
        sectionDeleteError: "Errore eliminazione sezione ITIL"
      }
    },
    solutions: {
      interventionTitle: "Tipi di intervento",
      actionTitle: "Tipi di azione",
      searchIntervention: "Cerca un tipo di intervento…",
      searchAction: "Cerca un tipo di azione…",
      emptyInterventions: "Nessun tipo di intervento",
      emptyActions: "Nessun tipo di azione",
      interventionDeleteBlockedOne: "Eliminazione impossibile: 1 tipo di azione collegato",
      interventionDeleteBlockedMany: "Eliminazione impossibile: {count} tipi di azione collegati",
      interventionDeleteWarnOne: "Impossibile eliminare « {name} »: 1 tipo di azione vi è ancora collegato.",
      interventionDeleteWarnMany: "Impossibile eliminare « {name} »: {count} tipi di azione vi sono ancora collegati.",
      thisIntervention: "questo tipo di intervento",
      toast: {
        loadError: "Errore caricamento catalogo soluzioni",
        labelRequired: "L'etichetta è obbligatoria.",
        interventionRequired: "Il tipo di intervento è obbligatorio per un tipo di azione.",
        added: "Voce catalogo aggiunta",
        updated: "Voce catalogo aggiornata",
        saveError: "Errore salvataggio voce catalogo",
        deleted: "Voce catalogo eliminata",
        deleteError: "Errore eliminazione voce catalogo"
      }
    },
    ticketViews: {
      cardDescription: "Crea viste di filtro e assegnale a utenti, profili o team.",
      newViewBtn: "Nuova vista",
      searchPlaceholder: "Cerca una vista…",
      filters: {
        all: "Tutte le viste",
        public: "Pubbliche",
        assigned: "Assegnate"
      },
      visibility: {
        public: "Pubblica",
        assigned: "Assegnata",
        private: "Privata"
      },
      builtin: "Integrata",
      emptyNone: "Nessuna vista.",
      createLink: "Crea una vista",
      emptySearch: "Nessuna vista corrisponde alla ricerca.",
      toast: {
        loadError: "Errore caricamento viste",
        updated: "Vista aggiornata",
        created: "Vista creata",
        deleted: "Vista eliminata",
        deleteError: "Errore durante l'eliminazione"
      }
    },
    templateFormSections: {
      general: {
        label: "Generale",
        description: "Nome del template"
      },
      content: {
        label: "Contenuto",
        description: "Testo e formattazione"
      }
    },
    macroFormSections: {
      general: {
        label: "Generale",
        description: "Nome della macro"
      },
      actions: {
        label: "Azioni",
        description: "Ordine di esecuzione"
      }
    },
    itilCategoryFormSections: {
      general: {
        label: "Generale",
        description: "Sezione e nome"
      },
      details: {
        label: "Dettagli",
        description: "Descrizione e stato"
      }
    },
    itilSectionFormSections: {
      general: {
        label: "Generale",
        description: "Nome e stato"
      },
      details: {
        label: "Dettagli",
        description: "Descrizione"
      }
    },
    macroActionTypes: [{
      value: "set_field",
      label: "Modifica un campo"
    }, {
      value: "add_comment",
      label: "Invia un messaggio supporto"
    }, {
      value: "open_email",
      label: "Apri un'email"
    }, {
      value: "manage_tags",
      label: "Gestisci etichette"
    }, {
      value: "planning_alert",
      label: "Avviso pianificazione",
      proOnly: true
    }, {
      value: "teams_message",
      label: "Messaggio Teams (webhook)",
      proOnly: true
    }, {
      value: "call",
      label: "Avvia una chiamata"
    }, {
      value: "add_attachment",
      label: "Aggiungi allegato (manuale)"
    }],
    macroFieldOptions: [{
      value: "assigned_user_id",
      label: "Assegnatario"
    }, {
      value: "followers",
      label: "Follower"
    }, {
      value: "status",
      label: "Stato"
    }, {
      value: "type",
      label: "Tipo"
    }, {
      value: "category",
      label: "Categoria"
    }, {
      value: "priority",
      label: "Priorità"
    }, {
      value: "is_major_incident",
      label: "Incidente maggiore"
    }, {
      value: "channel",
      label: "Canale"
    }, {
      value: "assigned_to_me",
      label: "Assegna a me"
    }],
    macroFieldModeOptions: {
      assigned_user_id: [{
        value: "replace",
        label: "Sostituisci"
      }, {
        value: "add",
        label: "Aggiungi"
      }],
      followers: [{
        value: "add",
        label: "Aggiungi"
      }, {
        value: "remove",
        label: "Rimuovi"
      }, {
        value: "replace",
        label: "Sostituisci"
      }]
    },
    macroBoundedFieldValues: {
      status: [{
        value: "new",
        label: "Nuovo"
      }, {
        value: "in_progress",
        label: "In corso"
      }, {
        value: "pending",
        label: "In attesa"
      }, {
        value: "resolved",
        label: "Risolto"
      }, {
        value: "closed",
        label: "Chiuso"
      }],
      type: [{
        value: "incident",
        label: "Incidente"
      }, {
        value: "demande",
        label: "Richiesta"
      }, {
        value: "probleme",
        label: "Problema"
      }, {
        value: "changement",
        label: "Cambio"
      }],
      priority: [{
        value: "low",
        label: "Bassa"
      }, {
        value: "normal",
        label: "Normale"
      }, {
        value: "high",
        label: "Alta"
      }, {
        value: "urgent",
        label: "Urgente"
      }],
      channel: [{
        value: "phone",
        label: "Telefono"
      }, {
        value: "email",
        label: "Email"
      }, {
        value: "web",
        label: "Web"
      }, {
        value: "chat",
        label: "Chat"
      }, {
        value: "whatsapp",
        label: "WhatsApp"
      }],
      is_major_incident: [{
        value: "true",
        label: "Sì"
      }, {
        value: "false",
        label: "No"
      }],
      assigned_to_me: [{
        value: "true",
        label: "Sì"
      }, {
        value: "false",
        label: "No"
      }]
    },
    modals: SUPPORT_SETTINGS_MODALS.it
  },
  es: {
    tabs: {
      templates: "Plantillas",
      macros: "Macros",
      categories: "Categorías",
      "solution-catalog": "Soluciones",
      "ticket-views": "Vistas de soporte"
    },
    viewMeta: {
      templates: {
        title: "Plantillas de comentarios",
        description: "Textos predefinidos reutilizables en respuestas y automatizaciones de tickets."
      },
      macros: {
        title: "Secuencias de acciones",
        description: "Macros ejecutables en un clic: estado, comentario, email, mensaje Teams, etc."
      },
      categories: {
        title: "Árbol ITIL",
        description: "Secciones y categorías propuestas al crear y clasificar tickets."
      },
      "solution-catalog": {
        title: "Categorías de resolución",
        description: "Tipos de intervención y acción propuestos al resolver un ticket."
      },
      "ticket-views": {
        title: "Vistas de soporte",
        description: "Filtros de tickets y asignación por usuario, perfil o equipo."
      },
      "sales-ticket-views": {
        title: "Vistas de prestaciones",
        description: "Filtros de tickets Servicios e instalaciones y asignación por usuario, perfil o equipo."
      }
    },
    common: {
      columns: {
        name: "Nombre",
        label: "Etiqueta",
        order: "Orden",
        status: "Estado",
        description: "Descripción",
        section: "Sección",
        intervention: "Intervención",
        steps: "Pasos",
        view: "Vista",
        visibility: "Visibilidad",
        filters: "Filtros",
        assignment: "Asignación"
      },
      actions: {
        preview: "Vista previa",
        edit: "Modificar",
        delete: "Eliminar",
        add: "Añadir",
        actionsAria: "Acciones"
      },
      loading: "Cargando…",
      emptyDash: "-",
      statusActive: "Activo",
      statusInactive: "Inactivo",
      rangeEmpty: "0 elementos",
      range: "{start}-{end} de {total}",
      countSection: "{count} sección",
      countSectionPlural: "{count} secciones",
      countCategory: "{count} categoría",
      countCategoryPlural: "{count} categorías",
      countEntry: "{count} entrada",
      countEntryPlural: "{count} entradas",
      countView: "{count} vista",
      countViewPlural: "{count} vistas"
    },
    templates: {
      addBtn: "Añadir plantilla",
      limitTitle: "Límite Community: {max} plantillas como máximo",
      limitReached: "Límite alcanzado ({current}/{max} plantillas).",
      quota: "Cuota: {current}/{max} plantillas activas.",
      empty: "Ninguna plantilla",
      previewTitle: "Vista previa plantilla - {name}",
      previewClose: "Cerrar",
      previewOk: "OK",
      previewEmpty: "No hay contenido para previsualizar.",
      toast: {
        loadError: "Error al cargar plantillas/macros",
        nameRequired: "El nombre de la plantilla es obligatorio",
        limitWarn: "Límite Community: {max} plantillas como máximo. Pase a Veritas Pro para añadir más.",
        addError: "Error al añadir la plantilla",
        updateError: "Error al actualizar la plantilla",
        saveError: "Error al guardar la plantilla",
        deleteError: "Error al eliminar la plantilla",
        added: "Plantilla añadida",
        updated: "Plantilla actualizada",
        deleted: "Plantilla eliminada"
      }
    },
    macros: {
      addBtn: "Añadir macro",
      limitTitle: "Límite Community: {max} macros como máximo",
      limitReached: "Límite alcanzado ({current}/{max} macros).",
      quota: "Cuota: {current}/{max} macros activas.",
      empty: "Ninguna macro",
      proLockedHint: "Esta acción está reservada a Veritas Pro. Pase a Pro para usarla en la ejecución.",
      variablesBtn: "Variables",
      variablesBtnTitle: "Insertar una variable dinámica en el campo activo",
      variablesBtnLockedTitle: "Variables dinámicas · disponible con Veritas Pro",
      variablesHint: "Coloque el cursor en un campo y elija una variable.",
      describe: {
        visibilityInternal: "interno",
        visibilityPublic: "público",
        tagsAdd: "Añadir",
        tagsRemove: "Quitar",
        manualAttachment: "adjunto manual"
      },
      placeholders: {
        assignee: "Buscar un asignado...",
        follower: "Buscar un seguidor...",
        category: "Buscar una categoría...",
        noAssignee: "Ningún asignado",
        noFollower: "Ningún seguidor",
        noCategory: "Ninguna categoría",
        newValue: "Nuevo valor",
        emailTo: "Destinatario (email)",
        emailCc: "Copia (CC, separados por coma)",
        emailSubject: "Asunto del email",
        emailBody: "Contenido del email",
        tagsAddOption: "Añadir etiquetas",
        tagsRemoveOption: "Quitar etiquetas",
        tagsList: "etiqueta1, etiqueta2, etiqueta3",
        reminderTitle: "Título de alerta de planificación",
        reminderOffsetLabel: "Retraso (minutos tras la ejecución)",
        reminderNote: "Nota de alerta (opcional)",
        selectWebhook: "Seleccionar un webhook",
        noWebhookHint: "Ningún webhook activo. Configure uno en Administración → Tickets → Webhooks.",
        teamsTitle: "Título del mensaje (opcional)",
        teamsMessage: "Mensaje Teams",
        phoneNumber: "Número a llamar",
        ticketId: "ID de ticket a vincular",
        equipmentId: "ID de material a vincular",
        manualAttachmentHint: "El adjunto deberá añadirse manualmente al ejecutar la macro."
      },
      toast: {
        nameRequired: "El nombre de la macro es obligatorio",
        actionsRequired: "Añada al menos una acción a la macro",
        limitWarn: "Límite Community: {max} macros como máximo. Pase a Veritas Pro para añadir más.",
        addError: "Error al añadir la macro",
        updateError: "Error al actualizar la macro",
        deleteError: "Error al eliminar la macro",
        added: "Macro añadida",
        updated: "Macro actualizada",
        deleted: "Macro eliminada"
      }
    },
    categories: {
      newSectionBtn: "Nueva sección",
      categoriesTitle: "Categorías ITIL",
      uncategorized: "Sin clasificar",
      searchSection: "Buscar una sección…",
      searchCategory: "Buscar una categoría…",
      emptySections: "Ninguna sección ITIL",
      emptySectionsSearch: "Ninguna sección coincide con la búsqueda.",
      emptyCategories: "Ninguna categoría ITIL",
      emptyCategoriesSearch: "Ninguna categoría coincide con la búsqueda.",
      sectionDeleteBlockedOne: "Eliminación imposible: 1 categoría vinculada",
      sectionDeleteBlockedMany: "Eliminación imposible: {count} categorías vinculadas",
      sectionDeleteWarnOne: "No se puede eliminar « {name} »: 1 categoría ITIL sigue vinculada.",
      sectionDeleteWarnMany: "No se puede eliminar « {name} »: {count} categorías ITIL siguen vinculadas.",
      thisSection: "esta sección",
      toast: {
        categoriesLoadError: "Error al cargar las categorías ITIL",
        sectionsLoadError: "Error al cargar las secciones ITIL",
        categoryNameRequired: "El nombre de la categoría es obligatorio.",
        categoryAdded: "Categoría ITIL añadida",
        categoryUpdated: "Categoría ITIL actualizada",
        categorySaveError: "Error al guardar la categoría ITIL",
        categoryDeleted: "Categoría ITIL eliminada",
        categoryDeleteError: "Error al eliminar la categoría ITIL",
        sectionNameRequired: "El nombre de la sección es obligatorio.",
        sectionAdded: "Sección ITIL añadida",
        sectionUpdated: "Sección ITIL actualizada",
        sectionSaveError: "Error al guardar la sección ITIL",
        sectionDeleted: "Sección ITIL eliminada",
        sectionDeleteError: "Error al eliminar la sección ITIL"
      }
    },
    solutions: {
      interventionTitle: "Tipos de intervención",
      actionTitle: "Tipos de acción",
      searchIntervention: "Buscar un tipo de intervención…",
      searchAction: "Buscar un tipo de acción…",
      emptyInterventions: "Ningún tipo de intervención",
      emptyActions: "Ningún tipo de acción",
      interventionDeleteBlockedOne: "No se puede eliminar: 1 tipo de acción vinculado",
      interventionDeleteBlockedMany: "No se puede eliminar: {count} tipos de acción vinculados",
      interventionDeleteWarnOne: "No se puede eliminar « {name} »: 1 tipo de acción sigue vinculado.",
      interventionDeleteWarnMany: "No se puede eliminar « {name} »: {count} tipos de acción siguen vinculados.",
      thisIntervention: "este tipo de intervención",
      toast: {
        loadError: "Error al cargar el catálogo de soluciones",
        labelRequired: "La etiqueta es obligatoria.",
        interventionRequired: "El tipo de intervención es obligatorio para un tipo de acción.",
        added: "Entrada añadida al catálogo",
        updated: "Entrada del catálogo actualizada",
        saveError: "Error al guardar la entrada del catálogo",
        deleted: "Entrada del catálogo eliminada",
        deleteError: "Error al eliminar la entrada del catálogo"
      }
    },
    ticketViews: {
      cardDescription: "Cree vistas de filtrado y asígnelas a usuarios, perfiles o equipos.",
      newViewBtn: "Nueva vista",
      searchPlaceholder: "Buscar una vista…",
      filters: {
        all: "Todas las vistas",
        public: "Públicas",
        assigned: "Asignadas"
      },
      visibility: {
        public: "Pública",
        assigned: "Asignada",
        private: "Privada"
      },
      builtin: "Integrada",
      emptyNone: "Ninguna vista.",
      createLink: "Crear una vista",
      emptySearch: "Ninguna vista coincide con la búsqueda.",
      toast: {
        loadError: "Error al cargar las vistas",
        updated: "Vista actualizada",
        created: "Vista creada",
        deleted: "Vista eliminada",
        deleteError: "Error al eliminar"
      }
    },
    templateFormSections: {
      general: {
        label: "General",
        description: "Nombre de la plantilla"
      },
      content: {
        label: "Contenido",
        description: "Texto y formato"
      }
    },
    macroFormSections: {
      general: {
        label: "General",
        description: "Nombre de la macro"
      },
      actions: {
        label: "Acciones",
        description: "Orden de ejecución"
      }
    },
    itilCategoryFormSections: {
      general: {
        label: "General",
        description: "Sección y nombre"
      },
      details: {
        label: "Detalles",
        description: "Descripción y estado"
      }
    },
    itilSectionFormSections: {
      general: {
        label: "General",
        description: "Nombre y estado"
      },
      details: {
        label: "Detalles",
        description: "Descripción"
      }
    },
    macroActionTypes: [{
      value: "set_field",
      label: "Cambiar un campo"
    }, {
      value: "add_comment",
      label: "Enviar un mensaje de soporte"
    }, {
      value: "open_email",
      label: "Abrir un email"
    }, {
      value: "manage_tags",
      label: "Gestionar etiquetas"
    }, {
      value: "planning_alert",
      label: "Alerta de planificación",
      proOnly: true
    }, {
      value: "teams_message",
      label: "Mensaje Teams (webhook)",
      proOnly: true
    }, {
      value: "call",
      label: "Iniciar una llamada"
    }, {
      value: "add_attachment",
      label: "Añadir adjunto (manual)"
    }],
    macroFieldOptions: [{
      value: "assigned_user_id",
      label: "Asignado"
    }, {
      value: "followers",
      label: "Seguidores"
    }, {
      value: "status",
      label: "Estado"
    }, {
      value: "type",
      label: "Tipo"
    }, {
      value: "category",
      label: "Categoría"
    }, {
      value: "priority",
      label: "Prioridad"
    }, {
      value: "is_major_incident",
      label: "Incidente mayor"
    }, {
      value: "channel",
      label: "Canal"
    }, {
      value: "assigned_to_me",
      label: "Asignarme"
    }],
    macroFieldModeOptions: {
      assigned_user_id: [{
        value: "replace",
        label: "Reemplazar"
      }, {
        value: "add",
        label: "Añadir"
      }],
      followers: [{
        value: "add",
        label: "Añadir"
      }, {
        value: "remove",
        label: "Quitar"
      }, {
        value: "replace",
        label: "Reemplazar"
      }]
    },
    macroBoundedFieldValues: {
      status: [{
        value: "new",
        label: "Nuevo"
      }, {
        value: "in_progress",
        label: "En curso"
      }, {
        value: "pending",
        label: "En espera"
      }, {
        value: "resolved",
        label: "Resuelto"
      }, {
        value: "closed",
        label: "Cerrado"
      }],
      type: [{
        value: "incident",
        label: "Incidente"
      }, {
        value: "demande",
        label: "Solicitud"
      }, {
        value: "probleme",
        label: "Problema"
      }, {
        value: "changement",
        label: "Cambio"
      }],
      priority: [{
        value: "low",
        label: "Baja"
      }, {
        value: "normal",
        label: "Normal"
      }, {
        value: "high",
        label: "Alta"
      }, {
        value: "urgent",
        label: "Urgente"
      }],
      channel: [{
        value: "phone",
        label: "Teléfono"
      }, {
        value: "email",
        label: "Email"
      }, {
        value: "web",
        label: "Web"
      }, {
        value: "chat",
        label: "Chat"
      }, {
        value: "whatsapp",
        label: "WhatsApp"
      }],
      is_major_incident: [{
        value: "true",
        label: "Sí"
      }, {
        value: "false",
        label: "No"
      }],
      assigned_to_me: [{
        value: "true",
        label: "Sí"
      }, {
        value: "false",
        label: "No"
      }]
    },
    modals: SUPPORT_SETTINGS_MODALS.es
  }
};
export const getAdminSupportSettingsCopy = createLocaleGetter(SUPPORT_SETTINGS_COPY);
export function getTicketAdminViews(locale) {
  const tabs = getAdminSupportSettingsCopy(locale).tabs;
  return TAB_KEYS.map(key => ({
    key,
    label: tabs[key]
  }));
}
export function getSupportSettingsViewMeta(locale) {
  const copy = getAdminSupportSettingsCopy(locale);
  return VIEW_META_KEYS.reduce((acc, key) => {
    acc[key] = copy.viewMeta[key];
    return acc;
  }, {});
}
function buildFormSections(locale, sectionKey, icons) {
  const sections = getAdminSupportSettingsCopy(locale)[sectionKey];
  return Object.keys(sections).map(id => ({
    id,
    icon: icons[id],
    label: sections[id].label,
    description: sections[id].description
  }));
}
export function getTemplateFormSections(locale) {
  return buildFormSections(locale, "templateFormSections", TEMPLATE_FORM_SECTION_ICONS);
}
export function getMacroFormSections(locale) {
  return buildFormSections(locale, "macroFormSections", MACRO_FORM_SECTION_ICONS);
}
export function getItilCategoryFormSections(locale) {
  return buildFormSections(locale, "itilCategoryFormSections", ITIL_CATEGORY_FORM_SECTION_ICONS);
}
export function getItilSectionFormSections(locale) {
  return buildFormSections(locale, "itilSectionFormSections", ITIL_SECTION_FORM_SECTION_ICONS);
}
export function getMacroActionTypes(locale) {
  return getAdminSupportSettingsCopy(locale).macroActionTypes.map(item => ({
    ...item
  }));
}
export function getMacroFieldOptions(locale) {
  return getAdminSupportSettingsCopy(locale).macroFieldOptions.map(item => ({
    ...item
  }));
}
export function getMacroFieldModeOptions(locale) {
  const options = getAdminSupportSettingsCopy(locale).macroFieldModeOptions;
  return Object.fromEntries(Object.entries(options).map(([field, values]) => [field, values.map(item => ({
    ...item
  }))]));
}
export function getMacroBoundedFieldValues(locale) {
  const values = getAdminSupportSettingsCopy(locale).macroBoundedFieldValues;
  return Object.fromEntries(Object.entries(values).map(([field, options]) => [field, options.map(item => ({
    ...item
  }))]));
}
export function getTicketViewVisibilityLabel(locale, visibility) {
  const labels = getAdminSupportSettingsCopy(locale).ticketViews.visibility;
  return labels[visibility] || visibility || "-";
}
export function formatSupportSettingsRange(locale, start, end, total) {
  const common = getAdminSupportSettingsCopy(locale).common;
  const n = Number(total) || 0;
  if (n === 0) return common.rangeEmpty;
  return interpolate(common.range, {
    start,
    end,
    total: n
  });
}
export function formatSupportSettingsCount(locale, kind, count) {
  const common = getAdminSupportSettingsCopy(locale).common;
  const n = Number(count) || 0;
  const templates = {
    section: [common.countSection, common.countSectionPlural],
    category: [common.countCategory, common.countCategoryPlural],
    entry: [common.countEntry, common.countEntryPlural],
    view: [common.countView, common.countViewPlural]
  };
  const [singular, plural] = templates[kind] || templates.entry;
  return interpolate(n === 1 ? singular : plural, {
    count: n
  });
}
export { interpolate };
