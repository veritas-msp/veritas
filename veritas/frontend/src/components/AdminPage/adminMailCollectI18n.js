import { createLocaleGetter, interpolate } from "../../i18n/translate";
import { COLLECTOR_FORM_SECTIONS, COLLECTOR_PROVIDER_PRESETS } from "./collectorConstants";
import { INGESTION_RULE_FORM_SECTIONS, RULE_ACTION_OPTIONS } from "./ingestionRuleConstants";
import { MAIL_CRITERION_FIELD_OPTIONS, MAIL_CRITERION_OPERATOR_OPTIONS, normalizeExclusionFilterRoot, normalizeIngestionAction } from "../../utils/mailIngestionRules";
import { ORPHAN_REPLY_BEHAVIOR_OPTIONS } from "../../utils/mailCollectSettingsConstants";
const ADMIN_MAIL_COLLECT_COPY = {
  "fr": {
    "tabs": {
      "collectors": "Collecteurs",
      "email-ingestion": "Règles de collecte",
      "mail-collect-options": "Paramètres"
    },
    "common": {
      "loading": "Chargement de la collecte mail…",
      "loadingShort": "Chargement…",
      "saving": "Enregistrement…",
      "save": "Enregistrer",
      "close": "Fermer",
      "cancel": "Annuler",
      "active": "Actif",
      "inactive": "Inactif",
      "minSuffix": "min",
      "collectorFallback": "Collecteur",
      "ruleFallback": "Règle",
      "ruleUntitled": "Règle sans nom",
      "newRuleName": "Nouvelle règle",
      "proSuffix": " (Pro)",
      "browseFolders": "Parcourir les dossiers",
      "comingSoon": "Bientôt",
      "notAvailable": "Non disponible",
      "test": "Tester",
      "addRule": "Ajouter une règle",
      "yes": "Oui",
      "no": "Non",
      "value": "Valeur",
      "field": "Champ",
      "operator": "Opérateur",
      "group": "Groupe",
      "rule": "Règle",
      "and": "ET",
      "or": "OU",
      "proOnly": "Pro"
    },
    "collectors": {
      "title": "Boîtes mail à collecter",
      "description": "Connexions IMAP/POP3, fréquence de récupération et journaux d'absorption des emails entrants.",
      "addBtn": "Ajouter un collecteur",
      "empty": "Aucun collecteur configuré",
      "columns": {
        "name": "NOM",
        "server": "SERVEUR",
        "protocol": "PROTOCOLE",
        "folder": "DOSSIER",
        "interval": "RÉGULARITÉ",
        "active": "ACTIF",
        "collected": "COLLECTÉS",
        "validated": "VALIDÉS",
        "ignored": "IGNORÉS",
        "logs": "LOGS",
        "actions": "ACTIONS"
      },
      "actions": {
        "forceFetch": "Forcer la récupération",
        "viewLogs": "Voir les logs",
        "edit": "Modifier le collecteur",
        "delete": "Supprimer le collecteur"
      }
    },
    "rules": {
      "title": "Tri des emails entrants",
      "description": "Règles évaluées dans l'ordre pour créer un ticket, ignorer un message ou y répondre automatiquement.",
      "testBtn": "Tester",
      "addBtn": "Ajouter une règle",
      "empty": "Aucune règle de collecte pour le moment.",
      "clickToEdit": "Cliquer pour modifier la règle",
      "moveUp": "Monter la règle",
      "moveDown": "Descendre la règle",
      "delete": "Supprimer la règle",
      "columns": {
        "order": "ORDRE",
        "name": "NOM",
        "collector": "COLLECTEUR",
        "criteria": "CRITÈRES",
        "action": "ACTION",
        "active": "ACTIF",
        "delete": "SUPPR."
      }
    },
    "options": {
      "loading": "Chargement des paramètres…",
      "cardTitle": "Paramètres de collecte",
      "cardDescription": "Comportement du traitement des emails entrants et rétention des journaux.",
      "groups": {
        "thread": {
          "title": "Fil de discussion",
          "description": "Rattachement des réponses via Message-ID / In-Reply-To"
        },
        "logs": {
          "title": "Journal des collecteurs",
          "description": "Volume de logs conservé par collecteur"
        }
      },
      "threadReplies": {
        "label": "Rattachement par fil",
        "hint": "Détecte les réponses liées à un ticket existant."
      },
      "deduplicate": {
        "label": "Déduplication Message-ID",
        "hint": "Ignore les mails déjà enregistrés dans Veritas."
      },
      "orphanReply": {
        "label": "Réponse sans ticket lié",
        "hintFallback": "Si aucun ticket ne correspond au fil.",
        "ariaLabel": "Réponse sans ticket lié"
      },
      "maxLogEntries": {
        "label": "Entrées max. par collecteur",
        "hint": "Les entrées les plus anciennes sont supprimées au-delà de cette limite.",
        "ariaLabel": "Nombre maximal d'entrées de log par collecteur"
      },
      "footerHint": "Mode opt-in : un email n'est traité que s'il correspond à une règle de collecte active. Sinon, il reste en boîte de réception."
    },
    "orphanReply": {
      "ignore": {
        "label": "Ignorer",
        "subtitle": "Laisser le mail en boîte de réception"
      },
      "refuse": {
        "label": "Refuser",
        "subtitle": "Déplacer vers le dossier refusés du collecteur"
      }
    },
    "toast": {
      "loadError": "Impossible de charger la configuration de collecte mail",
      "saveError": "Erreur lors de l'enregistrement",
      "saveSuccess": "Paramètres de collecte mail enregistrés",
      "ruleSaveError": "Erreur lors de la sauvegarde des règles de collecte",
      "ruleDeleteError": "Erreur lors de la suppression de la règle",
      "ruleTestError": "Erreur lors du test de règles.",
      "ruleAdded": "Règle de collecte ajoutée",
      "ruleUpdated": "Règle de collecte mise à jour",
      "ruleDeleted": "Règle de collecte supprimée",
      "imapTestSuccess": "Connexion IMAP réussie.",
      "imapTestError": "Erreur lors du test de connexion.",
      "imapConnectionFailed": "Connexion IMAP impossible.",
      "forceFetchSuccess": "Récupération forcée : {attached} rattaché(s), {ignored} ignoré(s)",
      "forceFetchError": "Erreur pendant la récupération forcée.",
      "forceFetchFailed": "Récupération forcée impossible.",
      "foldersError": "Erreur lors du chargement des dossiers.",
      "foldersFailed": "Impossible de récupérer les dossiers.",
      "emailRequired": "L'adresse email est requise",
      "serverRequired": "Le serveur IMAP est requis",
      "passwordRequired": "Le mot de passe est requis",
      "collectorSaveError": "Erreur lors de la sauvegarde du collecteur",
      "collectorAdded": "Collecteur ajouté",
      "collectorUpdated": "Collecteur mis à jour",
      "collectorDeleted": "Collecteur supprimé",
      "collectorDeleteError": "Erreur lors de la suppression du collecteur",
      "proActionError": "L'action prestations/services est réservée à Veritas Pro.",
      "rulesTestFailed": "Test des règles impossible."
    },
    "collectorForm": {
      "eyebrow": "Collecte mail",
      "createTitle": "Nouveau collecteur mail",
      "editTitle": "Modifier {name}",
      "editTitleFallback": "Modifier le collecteur",
      "createSubtitle": "Choisissez votre messagerie, puis suivez les étapes pour connecter la boîte et configurer la collecte.",
      "editSubtitle": "Ajustez la connexion, les dossiers scannés et le tri après traitement.",
      "sectionsAria": "Sections du collecteur",
      "providerTitle": "Quelle est votre messagerie ?",
      "providerDesc": "Sélectionnez votre fournisseur.",
      "connectionDefaultTitle": "Connexion",
      "connectionDefaultDesc": "Renseignez les informations demandées ci-dessous.",
      "emailLabel": "Adresse email",
      "emailPlaceholder": "support@entreprise.fr",
      "passwordLabel": "Mot de passe",
      "passwordPlaceholder": "••••••••",
      "serverLabel": "Serveur IMAP",
      "serverPlaceholder": "imap.entreprise.fr",
      "nameLabel": "Nom affiché (optionnel)",
      "namePlaceholder": "Nom du collecteur",
      "advancedToggle": "Options avancées (port, certificat)",
      "portLabel": "Port IMAP",
      "portPlaceholder": "993 (SSL par défaut)",
      "certLabel": "Certificat serveur",
      "testingConnection": "Test en cours…",
      "testConnection": "Tester la connexion",
      "ingestionDescBefore": "Indiquez quel dossier scanner, où classer les mails traités, et à quelle fréquence vérifier la boîte. Les critères d'acceptation se configurent dans l'onglet ",
      "ingestionDescTab": "Règles de collecte",
      "ingestionDescAfter": ".",
      "statusLabel": "Collecteur actif",
      "statusHint": "Désactivez pour suspendre la collecte sans supprimer la configuration.",
      "scanFolderTitle": "1. Dossier à scanner",
      "inboxLabel": "Boîte de réception",
      "inboxPlaceholder": "INBOX",
      "moveFolderTitle": "2. Où déplacer les mails traités",
      "moveFolderHint": "Laissez vide pour ne pas déplacer le message. Les dossiers doivent exister dans la boîte (créez-les au préalable si besoin).",
      "acceptedLabel": "Mails acceptés",
      "acceptedPlaceholder": "INBOX/Traités",
      "refusedLabel": "Mails refusés",
      "refusedPlaceholder": "INBOX/Refusés",
      "behaviorTitle": "3. Comportement",
      "autoIngestLabel": "Créer des tickets automatiquement",
      "unreadOnlyLabel": "Uniquement les messages non lus",
      "intervalLabel": "Fréquence de vérification",
      "intervalHintOne": "Vérification toutes les {minutes} minute",
      "intervalHintMany": "Vérification toutes les {minutes} minutes",
      "createBtn": "Créer le collecteur",
      "logConnectionSuccess": "Test de connexion réussi.",
      "logConnectionFailed": "Test de connexion échoué : {error}",
      "logFoldersSuccess": "Liste des dossiers récupérée depuis la boîte mail.",
      "logFoldersFailed": "Récupération des dossiers échouée : {error}",
      "unknownError": "erreur inconnue"
    },
    "collectorLogs": {
      "eyebrow": "Journal d'activité",
      "title": "Logs · {name}",
      "subtitle": "Historique des connexions, récupérations et erreurs pour ce collecteur.",
      "entryOne": "entrée",
      "entryMany": "entrées",
      "errorOne": "erreur",
      "errorMany": "erreurs",
      "emptyTitle": "Aucun log enregistré",
      "emptyDesc": "Les événements apparaîtront ici après les tests de connexion, les récupérations forcées ou les cycles automatiques.",
      "footerRecent": "Du plus récent au plus ancien",
      "footerNone": "Aucune activité récente",
      "levels": {
        "success": "OK",
        "error": "Err.",
        "warning": "Alerte",
        "info": "Info"
      }
    },
    "collectorFolders": {
      "eyebrow": "Boîte distante",
      "title": "Sélectionner un dossier",
      "subtitle": "Parcourez les dossiers disponibles sur le serveur mail connecté.",
      "loading": "Chargement des dossiers…",
      "empty": "Aucun dossier trouvé. Vérifiez la connexion et les identifiants du collecteur."
    },
    "ingestionRuleForm": {
      "eyebrow": "Règles de collecte",
      "createTitle": "Nouvelle règle de collecte",
      "editTitle": "Modifier {name}",
      "editTitleFallback": "Modifier la règle",
      "createSubtitle": "Sans règle active, aucun email n'est traité. Définissez quand et comment agir.",
      "editSubtitle": "Ajustez l'action exécutée lorsque les critères correspondent.",
      "sectionsAria": "Sections de la règle",
      "statusLabel": "Règle active",
      "statusHint": "Seules les règles actives peuvent déclencher une action sur les emails collectés.",
      "collectorLabel": "Collecteur concerné",
      "collectorAll": "Tous les collecteurs",
      "collectorHint": "Sans règle correspondante, les emails restent dans la boîte sans action.",
      "nameLabel": "Nom de la règle",
      "namePlaceholder": "Ex. Support général / Prestations clients",
      "actionLabel": "Action si correspondance",
      "proActionHint": "Réservé à Veritas Pro · ticket prestations / services.",
      "criteriaHintBefore": "Enchaînez règles et groupes avec ET / OU. Sans aucun critère, la règle s'applique à ",
      "criteriaHintBold": "tous les emails",
      "criteriaHintAfter": ". Les règles sont évaluées dans l'ordre du tableau admin.",
      "criteriaEmpty": "Aucun critère · tous les emails déclencheront cette action.",
      "addCriterion": "Ajouter un critère",
      "groupElements": "{count} élément(s)",
      "groupHint": "Les règles de ce groupe sont évaluées ensemble, comme entre parenthèses.",
      "addRuleInGroup": "Règle dans le groupe",
      "addSubgroup": "Sous-groupe",
      "selectNodeHint": "Sélectionnez une règle ou un groupe dans la liste.",
      "addRuleBtn": "Ajouter une règle",
      "addGroupBtn": "Ajouter un groupe",
      "footerAllEmails": "Critères : tous les emails",
      "footerCriteriaOne": "1 critère",
      "footerCriteriaMany": "{count} critères",
      "createBtn": "Créer la règle"
    },
    "ingestionRuleTest": {
      "eyebrow": "Simulation",
      "title": "Tester les règles de collecte",
      "subtitle": "Saisissez un email fictif pour voir quelle règle serait appliquée en premier.",
      "collectorLabel": "Simuler pour le collecteur",
      "collectorAll": "Tous les collecteurs (règles globales uniquement)",
      "fromLabel": "Email expéditeur",
      "fromPlaceholder": "contact@client.fr",
      "fromNameLabel": "Nom expéditeur",
      "fromNamePlaceholder": "Nom visible de l'expéditeur",
      "subjectLabel": "Objet du mail",
      "subjectPlaceholder": "Objet du mail de test",
      "bodyLabel": "Contenu du mail",
      "bodyPlaceholder": "Corps du mail de test",
      "matchTitle": "Règle appliquée : {name}",
      "noMatchTitle": "Aucune règle ne correspond",
      "matchSub": "{count} règle(s) validée(s) sur l'échantillon testé.",
      "noMatchSub": "Aucune règle active ne valide cet email de test.",
      "footerResult": "Résultat basé sur les règles actuellement enregistrées",
      "footerNoTest": "Aucun test lancé",
      "testing": "Test en cours…",
      "runTest": "Lancer le test"
    },
    "providers": {
      "imap-pop3": {
        "label": "IMAP / POP3",
        "hint": "Configuration manuelle",
        "connectionTitle": "Connexion IMAP manuelle",
        "connectionDescription": "Renseignez les identifiants de la boîte mail à scanner."
      },
      "gmail": {
        "label": "Gmail",
        "hint": "Compte Google",
        "connectionTitle": "Connexion Gmail",
        "connectionDescription": "Connexion au compte Google via IMAP.",
        "comingSoon": "Bientôt"
      },
      "outlook-com": {
        "label": "Outlook.com",
        "hint": "Boîte Microsoft",
        "connectionTitle": "Connexion Outlook.com",
        "connectionDescription": "Connexion à la boîte Microsoft personnelle.",
        "comingSoon": "Bientôt"
      },
      "o365": {
        "label": "Microsoft 365",
        "hint": "Tenant Office 365",
        "connectionTitle": "Connexion Microsoft 365",
        "connectionDescription": "Connexion au tenant Office 365.",
        "comingSoon": "Bientôt"
      },
      "ovh": {
        "label": "OVH",
        "hint": "Mail OVH / MX Plan",
        "connectionTitle": "Connexion OVH",
        "connectionDescription": "Connexion à la messagerie OVH / MX Plan.",
        "comingSoon": "Bientôt"
      },
      "exchange": {
        "label": "Exchange",
        "hint": "Serveur Exchange",
        "connectionTitle": "Connexion Exchange",
        "connectionDescription": "Connexion au serveur Microsoft Exchange.",
        "comingSoon": "Bientôt"
      },
      "yahoo": {
        "label": "Yahoo Mail",
        "hint": "Compte Yahoo",
        "connectionTitle": "Connexion Yahoo Mail",
        "connectionDescription": "Connexion au compte Yahoo.",
        "comingSoon": "Bientôt"
      },
      "icloud": {
        "label": "iCloud Mail",
        "hint": "Compte Apple",
        "connectionTitle": "Connexion iCloud Mail",
        "connectionDescription": "Connexion au compte Apple iCloud.",
        "comingSoon": "Bientôt"
      },
      "zoho": {
        "label": "Zoho Mail",
        "hint": "Compte Zoho",
        "connectionTitle": "Connexion Zoho Mail",
        "connectionDescription": "Connexion au compte Zoho Mail.",
        "comingSoon": "Bientôt"
      },
      "proton-mail": {
        "label": "Proton Mail",
        "hint": "Via Proton Bridge",
        "connectionTitle": "Connexion Proton Mail",
        "connectionDescription": "Connexion via Proton Bridge (IMAP local).",
        "comingSoon": "Bientôt"
      }
    },
    "collectorFormSections": {
      "provider": {
        "label": "Type de boîte",
        "description": "Choisissez votre messagerie"
      },
      "connection": {
        "label": "Connexion",
        "description": "Identifiants et serveur"
      },
      "ingestion": {
        "label": "Absorption",
        "description": "Dossiers et fréquence"
      }
    },
    "ingestionRuleFormSections": {
      "general": {
        "label": "Paramètres",
        "description": "Nom, action et statut"
      },
      "criteria": {
        "label": "Critères",
        "description": "Conditions de correspondance"
      }
    },
    "ruleActions": {
      "create_ticket_support": {
        "label": "Créer un ticket support"
      },
      "create_ticket_services": {
        "label": "Créer un ticket prestations / services"
      },
      "attach_comment": {
        "label": "Rattacher à un ticket existant (réponse)"
      },
      "ignore_mail": {
        "label": "Ignorer"
      },
      "create_ticket": {
        "label": "Créer un ticket support"
      }
    },
    "ruleHelpers": {
      "allCollectors": "Tous les collecteurs",
      "deletedCollector": "Collecteur supprimé"
    },
    "mailCriteria": {
      "fields": {
        "subject": {
          "label": "Objet"
        },
        "body": {
          "label": "Contenu"
        },
        "fromAddress": {
          "label": "Email expéditeur"
        },
        "fromName": {
          "label": "Nom expéditeur"
        },
        "fromDomain": {
          "label": "Domaine expéditeur"
        },
        "toAddresses": {
          "label": "Destinataires (À)"
        },
        "ccAddresses": {
          "label": "Copie (Cc)"
        },
        "replyToAddress": {
          "label": "Reply-To"
        },
        "isReply": {
          "label": "Réponse / transfert (RE/FW)"
        }
      },
      "operators": {
        "contains": {
          "label": "contient"
        },
        "not_contains": {
          "label": "ne contient pas"
        },
        "equals": {
          "label": "est égal à"
        },
        "not_equals": {
          "label": "n'est pas égal à"
        },
        "starts_with": {
          "label": "commence par"
        },
        "ends_with": {
          "label": "se termine par"
        },
        "is_empty": {
          "label": "est vide"
        },
        "is_not_empty": {
          "label": "n'est pas vide"
        },
        "in": {
          "label": "contient une des valeurs (liste)"
        },
        "not_in": {
          "label": "ne contient aucune des valeurs"
        }
      },
      "allEmails": "Tous les emails",
      "allEmailsNoCriteria": "Tous les emails (aucun critère)",
      "valuePlaceholder": "Valeur à comparer",
      "listPlaceholder": "valeur1, valeur2, …",
      "isReplyYes": "Oui (RE/FW)",
      "isReplyNo": "Non"
    },
    "certOptions": {
      "noValidate": "Accepter les certificats auto-signés",
      "validate": "Vérifier le certificat"
    }
  },
  "en": {
    "tabs": {
      "collectors": "Collectors",
      "email-ingestion": "Collection rules",
      "mail-collect-options": "Settings"
    },
    "common": {
      "loading": "Loading mail collection…",
      "loadingShort": "Loading…",
      "saving": "Saving…",
      "save": "Save",
      "close": "Close",
      "cancel": "Cancel",
      "active": "Active",
      "inactive": "Inactive",
      "minSuffix": "min",
      "collectorFallback": "Collector",
      "ruleFallback": "Rule",
      "ruleUntitled": "Untitled rule",
      "newRuleName": "New rule",
      "proSuffix": " (Pro)",
      "browseFolders": "Browse folders",
      "comingSoon": "Coming soon",
      "notAvailable": "Not available",
      "test": "Test",
      "addRule": "Add rule",
      "yes": "Yes",
      "no": "No",
      "value": "Value",
      "field": "Field",
      "operator": "Operator",
      "group": "Group",
      "rule": "Rule",
      "and": "AND",
      "or": "OR",
      "proOnly": "Pro"
    },
    "collectors": {
      "title": "Mailboxes to collect",
      "description": "IMAP/POP3 connections, fetch frequency and logs for incoming email ingestion.",
      "addBtn": "Add collector",
      "empty": "No collector configured",
      "columns": {
        "name": "NAME",
        "server": "SERVER",
        "protocol": "PROTOCOL",
        "folder": "FOLDER",
        "interval": "INTERVAL",
        "active": "ACTIVE",
        "collected": "COLLECTED",
        "validated": "ACCEPTED",
        "ignored": "IGNORED",
        "logs": "LOGS",
        "actions": "ACTIONS"
      },
      "actions": {
        "forceFetch": "Force fetch",
        "viewLogs": "View logs",
        "edit": "Edit collector",
        "delete": "Delete collector"
      }
    },
    "rules": {
      "title": "Incoming email routing",
      "description": "Rules evaluated in order to create a ticket, ignore a message or attach a reply automatically.",
      "testBtn": "Test",
      "addBtn": "Add rule",
      "empty": "No collection rules yet.",
      "clickToEdit": "Click to edit rule",
      "moveUp": "Move rule up",
      "moveDown": "Move rule down",
      "delete": "Delete rule",
      "columns": {
        "order": "ORDER",
        "name": "NAME",
        "collector": "COLLECTOR",
        "criteria": "CRITERIA",
        "action": "ACTION",
        "active": "ACTIVE",
        "delete": "DEL."
      }
    },
    "options": {
      "loading": "Loading settings…",
      "cardTitle": "Collection settings",
      "cardDescription": "Incoming email processing behaviour and log retention.",
      "groups": {
        "thread": {
          "title": "Conversation thread",
          "description": "Link replies via Message-ID / In-Reply-To"
        },
        "logs": {
          "title": "Collector logs",
          "description": "Log volume kept per collector"
        }
      },
      "threadReplies": {
        "label": "Thread linking",
        "hint": "Detect replies linked to an existing ticket."
      },
      "deduplicate": {
        "label": "Message-ID deduplication",
        "hint": "Ignore emails already stored in Veritas."
      },
      "orphanReply": {
        "label": "Reply without linked ticket",
        "hintFallback": "When no ticket matches the thread.",
        "ariaLabel": "Reply without linked ticket"
      },
      "maxLogEntries": {
        "label": "Max entries per collector",
        "hint": "Oldest entries are removed beyond this limit.",
        "ariaLabel": "Maximum log entries per collector"
      },
      "footerHint": "Opt-in mode: an email is processed only if it matches an active collection rule. Otherwise it stays in the inbox."
    },
    "orphanReply": {
      "ignore": {
        "label": "Ignore",
        "subtitle": "Leave the email in the inbox"
      },
      "refuse": {
        "label": "Reject",
        "subtitle": "Move to the collector's rejected folder"
      }
    },
    "toast": {
      "loadError": "Unable to load mail collection configuration",
      "saveError": "Error while saving",
      "saveSuccess": "Mail collection settings saved",
      "ruleSaveError": "Error saving collection rules",
      "ruleDeleteError": "Error deleting rule",
      "ruleTestError": "Error testing rules.",
      "ruleAdded": "Collection rule added",
      "ruleUpdated": "Collection rule updated",
      "ruleDeleted": "Collection rule deleted",
      "imapTestSuccess": "IMAP connection successful.",
      "imapTestError": "Error testing connection.",
      "imapConnectionFailed": "IMAP connection failed.",
      "forceFetchSuccess": "Force fetch: {attached} attached, {ignored} ignored",
      "forceFetchError": "Error during force fetch.",
      "forceFetchFailed": "Force fetch failed.",
      "foldersError": "Error loading folders.",
      "foldersFailed": "Unable to retrieve folders.",
      "emailRequired": "Email address is required",
      "serverRequired": "IMAP server is required",
      "passwordRequired": "Password is required",
      "collectorSaveError": "Error saving collector",
      "collectorAdded": "Collector added",
      "collectorUpdated": "Collector updated",
      "collectorDeleted": "Collector deleted",
      "collectorDeleteError": "Error deleting collector",
      "proActionError": "The services ticket action requires Veritas Pro.",
      "rulesTestFailed": "Rule test failed."
    },
    "collectorForm": {
      "eyebrow": "Mail collection",
      "createTitle": "New mail collector",
      "editTitle": "Edit {name}",
      "editTitleFallback": "Edit collector",
      "createSubtitle": "Choose your mail provider, then follow the steps to connect the mailbox and configure collection.",
      "editSubtitle": "Adjust connection, scanned folders and post-processing routing.",
      "sectionsAria": "Collector sections",
      "providerTitle": "Which mail provider do you use?",
      "providerDesc": "Select your provider.",
      "connectionDefaultTitle": "Connection",
      "connectionDefaultDesc": "Enter the information below.",
      "emailLabel": "Email address",
      "emailPlaceholder": "support@company.com",
      "passwordLabel": "Password",
      "passwordPlaceholder": "••••••••",
      "serverLabel": "IMAP server",
      "serverPlaceholder": "imap.company.com",
      "nameLabel": "Display name (optional)",
      "namePlaceholder": "Collector name",
      "advancedToggle": "Advanced options (port, certificate)",
      "portLabel": "IMAP port",
      "portPlaceholder": "993 (SSL by default)",
      "certLabel": "Server certificate",
      "testingConnection": "Testing…",
      "testConnection": "Test connection",
      "ingestionDescBefore": "Specify which folder to scan, where to move processed emails, and how often to check the mailbox. Acceptance criteria are configured in the ",
      "ingestionDescTab": "Collection rules",
      "ingestionDescAfter": " tab.",
      "statusLabel": "Collector active",
      "statusHint": "Disable to suspend collection without deleting the configuration.",
      "scanFolderTitle": "1. Folder to scan",
      "inboxLabel": "Inbox",
      "inboxPlaceholder": "INBOX",
      "moveFolderTitle": "2. Where to move processed emails",
      "moveFolderHint": "Leave empty to keep the message in place. Folders must exist in the mailbox (create them first if needed).",
      "acceptedLabel": "Accepted emails",
      "acceptedPlaceholder": "INBOX/Processed",
      "refusedLabel": "Rejected emails",
      "refusedPlaceholder": "INBOX/Rejected",
      "behaviorTitle": "3. Behaviour",
      "autoIngestLabel": "Create tickets automatically",
      "unreadOnlyLabel": "Unread messages only",
      "intervalLabel": "Check frequency",
      "intervalHintOne": "Check every {minutes} minute",
      "intervalHintMany": "Check every {minutes} minutes",
      "createBtn": "Create collector",
      "logConnectionSuccess": "Connection test successful.",
      "logConnectionFailed": "Connection test failed: {error}",
      "logFoldersSuccess": "Folder list retrieved from the mailbox.",
      "logFoldersFailed": "Folder retrieval failed: {error}",
      "unknownError": "unknown error"
    },
    "collectorLogs": {
      "eyebrow": "Activity log",
      "title": "Logs · {name}",
      "subtitle": "Connection, fetch and error history for this collector.",
      "entryOne": "entry",
      "entryMany": "entries",
      "errorOne": "error",
      "errorMany": "errors",
      "emptyTitle": "No logs recorded",
      "emptyDesc": "Events will appear here after connection tests, force fetches or automatic cycles.",
      "footerRecent": "Newest first",
      "footerNone": "No recent activity",
      "levels": {
        "success": "OK",
        "error": "Err.",
        "warning": "Warn",
        "info": "Info"
      }
    },
    "collectorFolders": {
      "eyebrow": "Remote mailbox",
      "title": "Select a folder",
      "subtitle": "Browse folders available on the connected mail server.",
      "loading": "Loading folders…",
      "empty": "No folders found. Check the connection and collector credentials."
    },
    "ingestionRuleForm": {
      "eyebrow": "Collection rules",
      "createTitle": "New collection rule",
      "editTitle": "Edit {name}",
      "editTitleFallback": "Edit rule",
      "createSubtitle": "Without an active rule, no email is processed. Define when and how to act.",
      "editSubtitle": "Adjust the action executed when criteria match.",
      "sectionsAria": "Rule sections",
      "statusLabel": "Rule active",
      "statusHint": "Only active rules can trigger an action on collected emails.",
      "collectorLabel": "Target collector",
      "collectorAll": "All collectors",
      "collectorHint": "Without a matching rule, emails remain in the mailbox with no action.",
      "nameLabel": "Rule name",
      "namePlaceholder": "E.g. General support / Client services",
      "actionLabel": "Action on match",
      "proActionHint": "Requires Veritas Pro · services ticket.",
      "criteriaHintBefore": "Chain rules and groups with AND / OR. With no criteria, the rule applies to ",
      "criteriaHintBold": "all emails",
      "criteriaHintAfter": ". Rules are evaluated in admin table order.",
      "criteriaEmpty": "No criteria · all emails will trigger this action.",
      "addCriterion": "Add criterion",
      "groupElements": "{count} item(s)",
      "groupHint": "Rules in this group are evaluated together, like parentheses.",
      "addRuleInGroup": "Rule in group",
      "addSubgroup": "Subgroup",
      "selectNodeHint": "Select a rule or group in the list.",
      "addRuleBtn": "Add rule",
      "addGroupBtn": "Add group",
      "footerAllEmails": "Criteria: all emails",
      "footerCriteriaOne": "1 criterion",
      "footerCriteriaMany": "{count} criteria",
      "createBtn": "Create rule"
    },
    "ingestionRuleTest": {
      "eyebrow": "Simulation",
      "title": "Test collection rules",
      "subtitle": "Enter a sample email to see which rule would apply first.",
      "collectorLabel": "Simulate for collector",
      "collectorAll": "All collectors (global rules only)",
      "fromLabel": "Sender email",
      "fromPlaceholder": "contact@client.com",
      "fromNameLabel": "Sender name",
      "fromNamePlaceholder": "Visible sender name",
      "subjectLabel": "Email subject",
      "subjectPlaceholder": "Test email subject",
      "bodyLabel": "Email body",
      "bodyPlaceholder": "Test email body",
      "matchTitle": "Rule applied: {name}",
      "noMatchTitle": "No matching rule",
      "matchSub": "{count} rule(s) matched on the test sample.",
      "noMatchSub": "No active rule validates this test email.",
      "footerResult": "Result based on currently saved rules",
      "footerNoTest": "No test run yet",
      "testing": "Testing…",
      "runTest": "Run test"
    },
    "providers": {
      "imap-pop3": {
        "label": "IMAP / POP3",
        "hint": "Manual setup",
        "connectionTitle": "Manual IMAP connection",
        "connectionDescription": "Enter credentials for the mailbox to scan."
      },
      "gmail": {
        "label": "Gmail",
        "hint": "Google account",
        "connectionTitle": "Gmail connection",
        "connectionDescription": "Connect a Google account via IMAP.",
        "comingSoon": "Coming soon"
      },
      "outlook-com": {
        "label": "Outlook.com",
        "hint": "Microsoft mailbox",
        "connectionTitle": "Outlook.com connection",
        "connectionDescription": "Connect a personal Microsoft mailbox.",
        "comingSoon": "Coming soon"
      },
      "o365": {
        "label": "Microsoft 365",
        "hint": "Office 365 tenant",
        "connectionTitle": "Microsoft 365 connection",
        "connectionDescription": "Connect an Office 365 tenant.",
        "comingSoon": "Coming soon"
      },
      "ovh": {
        "label": "OVH",
        "hint": "OVH / MX Plan mail",
        "connectionTitle": "OVH connection",
        "connectionDescription": "Connect OVH / MX Plan mail.",
        "comingSoon": "Coming soon"
      },
      "exchange": {
        "label": "Exchange",
        "hint": "Exchange server",
        "connectionTitle": "Exchange connection",
        "connectionDescription": "Connect a Microsoft Exchange server.",
        "comingSoon": "Coming soon"
      },
      "yahoo": {
        "label": "Yahoo Mail",
        "hint": "Yahoo account",
        "connectionTitle": "Yahoo Mail connection",
        "connectionDescription": "Connect a Yahoo account.",
        "comingSoon": "Coming soon"
      },
      "icloud": {
        "label": "iCloud Mail",
        "hint": "Apple account",
        "connectionTitle": "iCloud Mail connection",
        "connectionDescription": "Connect an Apple iCloud account.",
        "comingSoon": "Coming soon"
      },
      "zoho": {
        "label": "Zoho Mail",
        "hint": "Zoho account",
        "connectionTitle": "Zoho Mail connection",
        "connectionDescription": "Connect a Zoho Mail account.",
        "comingSoon": "Coming soon"
      },
      "proton-mail": {
        "label": "Proton Mail",
        "hint": "Via Proton Bridge",
        "connectionTitle": "Proton Mail connection",
        "connectionDescription": "Connect via Proton Bridge (local IMAP).",
        "comingSoon": "Coming soon"
      }
    },
    "collectorFormSections": {
      "provider": {
        "label": "Mailbox type",
        "description": "Choose your mail provider"
      },
      "connection": {
        "label": "Connection",
        "description": "Credentials and server"
      },
      "ingestion": {
        "label": "Ingestion",
        "description": "Folders and frequency"
      }
    },
    "ingestionRuleFormSections": {
      "general": {
        "label": "Settings",
        "description": "Name, action and status"
      },
      "criteria": {
        "label": "Criteria",
        "description": "Matching conditions"
      }
    },
    "ruleActions": {
      "create_ticket_support": {
        "label": "Create support ticket"
      },
      "create_ticket_services": {
        "label": "Create services ticket"
      },
      "attach_comment": {
        "label": "Attach to existing ticket (reply)"
      },
      "ignore_mail": {
        "label": "Ignore"
      },
      "create_ticket": {
        "label": "Create support ticket"
      }
    },
    "ruleHelpers": {
      "allCollectors": "All collectors",
      "deletedCollector": "Deleted collector"
    },
    "mailCriteria": {
      "fields": {
        "subject": {
          "label": "Subject"
        },
        "body": {
          "label": "Body"
        },
        "fromAddress": {
          "label": "Sender email"
        },
        "fromName": {
          "label": "Sender name"
        },
        "fromDomain": {
          "label": "Sender domain"
        },
        "toAddresses": {
          "label": "Recipients (To)"
        },
        "ccAddresses": {
          "label": "Copy (Cc)"
        },
        "replyToAddress": {
          "label": "Reply-To"
        },
        "isReply": {
          "label": "Reply / forward (RE/FW)"
        }
      },
      "operators": {
        "contains": {
          "label": "contains"
        },
        "not_contains": {
          "label": "does not contain"
        },
        "equals": {
          "label": "equals"
        },
        "not_equals": {
          "label": "does not equal"
        },
        "starts_with": {
          "label": "starts with"
        },
        "ends_with": {
          "label": "ends with"
        },
        "is_empty": {
          "label": "is empty"
        },
        "is_not_empty": {
          "label": "is not empty"
        },
        "in": {
          "label": "contains one of (list)"
        },
        "not_in": {
          "label": "contains none of the values"
        }
      },
      "allEmails": "All emails",
      "allEmailsNoCriteria": "All emails (no criteria)",
      "valuePlaceholder": "Value to compare",
      "listPlaceholder": "value1, value2, …",
      "isReplyYes": "Yes (RE/FW)",
      "isReplyNo": "No"
    },
    "certOptions": {
      "noValidate": "Accept self-signed certificates",
      "validate": "Verify certificate"
    }
  },
  "de": {
    "tabs": {
      "collectors": "Collectoren",
      "email-ingestion": "Sammelregeln",
      "mail-collect-options": "Einstellungen"
    },
    "common": {
      "loading": "Mail-Sammlung wird geladen…",
      "loadingShort": "Laden…",
      "saving": "Speichern…",
      "save": "Speichern",
      "close": "Schließen",
      "cancel": "Abbrechen",
      "active": "Aktiv",
      "inactive": "Inaktiv",
      "minSuffix": "Min",
      "collectorFallback": "Collector",
      "ruleFallback": "Regel",
      "ruleUntitled": "Regel ohne Namen",
      "newRuleName": "Neue Regel",
      "proSuffix": " (Pro)",
      "browseFolders": "Ordner durchsuchen",
      "comingSoon": "Demnächst",
      "notAvailable": "Nicht verfügbar",
      "test": "Testen",
      "addRule": "Regel hinzufügen",
      "yes": "Ja",
      "no": "Nein",
      "value": "Wert",
      "field": "Feld",
      "operator": "Operator",
      "group": "Gruppe",
      "rule": "Regel",
      "and": "UND",
      "or": "ODER",
      "proOnly": "Pro"
    },
    "collectors": {
      "title": "Zu sammelnde Postfächer",
      "description": "IMAP/POP3-Verbindungen, Abrufintervall und Protokolle für eingehende E-Mails.",
      "addBtn": "Collector hinzufügen",
      "empty": "Kein Collector konfiguriert",
      "columns": {
        "name": "NAME",
        "server": "SERVER",
        "protocol": "PROTOKOLL",
        "folder": "ORDNER",
        "interval": "INTERVALL",
        "active": "AKTIV",
        "collected": "GESAMMELT",
        "validated": "AKZEPTIERT",
        "ignored": "IGNORIERT",
        "logs": "LOGS",
        "actions": "AKTIONEN"
      },
      "actions": {
        "forceFetch": "Abruf erzwingen",
        "viewLogs": "Logs anzeigen",
        "edit": "Collector bearbeiten",
        "delete": "Collector löschen"
      }
    },
    "rules": {
      "title": "Eingehende E-Mails sortieren",
      "description": "Regeln werden der Reihe nach ausgewertet, um Tickets zu erstellen, Nachrichten zu ignorieren oder Antworten zuzuordnen.",
      "testBtn": "Testen",
      "addBtn": "Regel hinzufügen",
      "empty": "Noch keine Sammelregeln.",
      "clickToEdit": "Klicken zum Bearbeiten",
      "moveUp": "Regel nach oben",
      "moveDown": "Regel nach unten",
      "delete": "Regel löschen",
      "columns": {
        "order": "REIHENF.",
        "name": "NAME",
        "collector": "COLLECTOR",
        "criteria": "KRITERIEN",
        "action": "AKTION",
        "active": "AKTIV",
        "delete": "LÖSCH."
      }
    },
    "options": {
      "loading": "Einstellungen werden geladen…",
      "cardTitle": "Sammlungseinstellungen",
      "cardDescription": "Verarbeitung eingehender E-Mails und Aufbewahrung der Protokolle.",
      "groups": {
        "thread": {
          "title": "Diskussionsverlauf",
          "description": "Antworten über Message-ID / In-Reply-To verknüpfen"
        },
        "logs": {
          "title": "Collector-Protokolle",
          "description": "Protokollumfang pro Collector"
        }
      },
      "threadReplies": {
        "label": "Thread-Verknüpfung",
        "hint": "Erkennt Antworten zu einem bestehenden Ticket."
      },
      "deduplicate": {
        "label": "Message-ID-Deduplizierung",
        "hint": "Ignoriert bereits in Veritas gespeicherte Mails."
      },
      "orphanReply": {
        "label": "Antwort ohne verknüpftes Ticket",
        "hintFallback": "Wenn kein Ticket zum Thread passt.",
        "ariaLabel": "Antwort ohne verknüpftes Ticket"
      },
      "maxLogEntries": {
        "label": "Max. Einträge pro Collector",
        "hint": "Älteste Einträge werden über diesem Limit entfernt.",
        "ariaLabel": "Maximale Protokolleinträge pro Collector"
      },
      "footerHint": "Opt-in-Modus: Eine E-Mail wird nur verarbeitet, wenn sie einer aktiven Sammelregel entspricht. Andernfalls bleibt sie im Posteingang."
    },
    "orphanReply": {
      "ignore": {
        "label": "Ignorieren",
        "subtitle": "E-Mail im Posteingang belassen"
      },
      "refuse": {
        "label": "Ablehnen",
        "subtitle": "In den Ablehnungsordner des Collectors verschieben"
      }
    },
    "toast": {
      "loadError": "Mail-Sammlungskonfiguration konnte nicht geladen werden",
      "saveError": "Fehler beim Speichern",
      "saveSuccess": "Mail-Sammlungseinstellungen gespeichert",
      "ruleSaveError": "Fehler beim Speichern der Sammelregeln",
      "ruleDeleteError": "Fehler beim Löschen der Regel",
      "ruleTestError": "Fehler beim Testen der Regeln.",
      "ruleAdded": "Sammelregel hinzugefügt",
      "ruleUpdated": "Sammelregel aktualisiert",
      "ruleDeleted": "Sammelregel gelöscht",
      "imapTestSuccess": "IMAP-Verbindung erfolgreich.",
      "imapTestError": "Fehler beim Verbindungstest.",
      "imapConnectionFailed": "IMAP-Verbindung fehlgeschlagen.",
      "forceFetchSuccess": "Erzwungener Abruf: {attached} zugeordnet, {ignored} ignoriert",
      "forceFetchError": "Fehler beim erzwungenen Abruf.",
      "forceFetchFailed": "Erzwungener Abruf fehlgeschlagen.",
      "foldersError": "Fehler beim Laden der Ordner.",
      "foldersFailed": "Ordner konnten nicht abgerufen werden.",
      "emailRequired": "E-Mail-Adresse ist erforderlich",
      "serverRequired": "IMAP-Server ist erforderlich",
      "passwordRequired": "Passwort ist erforderlich",
      "collectorSaveError": "Fehler beim Speichern des Collectors",
      "collectorAdded": "Collector hinzugefügt",
      "collectorUpdated": "Collector aktualisiert",
      "collectorDeleted": "Collector gelöscht",
      "collectorDeleteError": "Fehler beim Löschen des Collectors",
      "proActionError": "Die Dienstleistungs-Aktion erfordert Veritas Pro.",
      "rulesTestFailed": "Regeltest fehlgeschlagen."
    },
    "collectorForm": {
      "eyebrow": "Mail-Sammlung",
      "createTitle": "Neuer Mail-Collector",
      "editTitle": "{name} bearbeiten",
      "editTitleFallback": "Collector bearbeiten",
      "createSubtitle": "Wählen Sie Ihren Anbieter und folgen Sie den Schritten zur Verbindung und Konfiguration.",
      "editSubtitle": "Verbindung, gescannte Ordner und Nachbearbeitung anpassen.",
      "sectionsAria": "Collector-Bereiche",
      "providerTitle": "Welchen Mail-Anbieter nutzen Sie?",
      "providerDesc": "Anbieter auswählen.",
      "connectionDefaultTitle": "Verbindung",
      "connectionDefaultDesc": "Geben Sie die unten stehenden Informationen ein.",
      "emailLabel": "E-Mail-Adresse",
      "emailPlaceholder": "support@unternehmen.de",
      "passwordLabel": "Passwort",
      "passwordPlaceholder": "••••••••",
      "serverLabel": "IMAP-Server",
      "serverPlaceholder": "imap.unternehmen.de",
      "nameLabel": "Anzeigename (optional)",
      "namePlaceholder": "Collector-Name",
      "advancedToggle": "Erweiterte Optionen (Port, Zertifikat)",
      "portLabel": "IMAP-Port",
      "portPlaceholder": "993 (SSL standardmäßig)",
      "certLabel": "Serverzertifikat",
      "testingConnection": "Test läuft…",
      "testConnection": "Verbindung testen",
      "ingestionDescBefore": "Geben Sie Scan-Ordner, Zielordner und Prüfintervall an. Annahmekriterien konfigurieren Sie im Tab ",
      "ingestionDescTab": "Sammelregeln",
      "ingestionDescAfter": ".",
      "statusLabel": "Collector aktiv",
      "statusHint": "Deaktivieren, um die Sammlung ohne Löschen der Konfiguration auszusetzen.",
      "scanFolderTitle": "1. Zu scannender Ordner",
      "inboxLabel": "Posteingang",
      "inboxPlaceholder": "INBOX",
      "moveFolderTitle": "2. Wohin verarbeitete Mails verschoben werden",
      "moveFolderHint": "Leer lassen, um die Nachricht nicht zu verschieben. Ordner müssen im Postfach existieren.",
      "acceptedLabel": "Akzeptierte Mails",
      "acceptedPlaceholder": "INBOX/Verarbeitet",
      "refusedLabel": "Abgelehnte Mails",
      "refusedPlaceholder": "INBOX/Abgelehnt",
      "behaviorTitle": "3. Verhalten",
      "autoIngestLabel": "Tickets automatisch erstellen",
      "unreadOnlyLabel": "Nur ungelesene Nachrichten",
      "intervalLabel": "Prüfintervall",
      "intervalHintOne": "Prüfung alle {minutes} Minute",
      "intervalHintMany": "Prüfung alle {minutes} Minuten",
      "createBtn": "Collector erstellen",
      "logConnectionSuccess": "Verbindungstest erfolgreich.",
      "logConnectionFailed": "Verbindungstest fehlgeschlagen: {error}",
      "logFoldersSuccess": "Ordnerliste vom Postfach abgerufen.",
      "logFoldersFailed": "Ordnerabruf fehlgeschlagen: {error}",
      "unknownError": "unbekannter Fehler"
    },
    "collectorLogs": {
      "eyebrow": "Aktivitätsprotokoll",
      "title": "Logs · {name}",
      "subtitle": "Verbindungs-, Abruf- und Fehlerhistorie für diesen Collector.",
      "entryOne": "Eintrag",
      "entryMany": "Einträge",
      "errorOne": "Fehler",
      "errorMany": "Fehler",
      "emptyTitle": "Keine Protokolle",
      "emptyDesc": "Ereignisse erscheinen nach Verbindungstests, erzwungenen Abrufen oder automatischen Zyklen.",
      "footerRecent": "Neueste zuerst",
      "footerNone": "Keine recente Aktivität",
      "levels": {
        "success": "OK",
        "error": "Fehl.",
        "warning": "Warn.",
        "info": "Info"
      }
    },
    "collectorFolders": {
      "eyebrow": "Remote-Postfach",
      "title": "Ordner auswählen",
      "subtitle": "Verfügbare Ordner auf dem verbundenen Mailserver durchsuchen.",
      "loading": "Ordner werden geladen…",
      "empty": "Keine Ordner gefunden. Verbindung und Zugangsdaten prüfen."
    },
    "ingestionRuleForm": {
      "eyebrow": "Sammelregeln",
      "createTitle": "Neue Sammelregel",
      "editTitle": "{name} bearbeiten",
      "editTitleFallback": "Regel bearbeiten",
      "createSubtitle": "Ohne aktive Regel wird keine E-Mail verarbeitet. Definieren Sie wann und wie gehandelt wird.",
      "editSubtitle": "Aktion bei übereinstimmenden Kriterien anpassen.",
      "sectionsAria": "Regelbereiche",
      "statusLabel": "Regel aktiv",
      "statusHint": "Nur aktive Regeln können Aktionen auf gesammelten E-Mails auslösen.",
      "collectorLabel": "Betroffener Collector",
      "collectorAll": "Alle Collectoren",
      "collectorHint": "Ohne passende Regel bleiben E-Mails ohne Aktion im Postfach.",
      "nameLabel": "Regelname",
      "namePlaceholder": "z. B. Allgemeiner Support / Kundendienste",
      "actionLabel": "Aktion bei Treffer",
      "proActionHint": "Erfordert Veritas Pro · Dienstleistungsticket.",
      "criteriaHintBefore": "Regeln und Gruppen mit UND / ODER verknüpfen. Ohne Kriterien gilt die Regel für ",
      "criteriaHintBold": "alle E-Mails",
      "criteriaHintAfter": ". Regeln werden in Admin-Tabellenreihenfolge ausgewertet.",
      "criteriaEmpty": "Keine Kriterien · alle E-Mails lösen diese Aktion aus.",
      "addCriterion": "Kriterium hinzufügen",
      "groupElements": "{count} Element(e)",
      "groupHint": "Regeln in dieser Gruppe werden gemeinsam ausgewertet, wie in Klammern.",
      "addRuleInGroup": "Regel in Gruppe",
      "addSubgroup": "Untergruppe",
      "selectNodeHint": "Regel oder Gruppe in der Liste auswählen.",
      "addRuleBtn": "Regel hinzufügen",
      "addGroupBtn": "Gruppe hinzufügen",
      "footerAllEmails": "Kriterien: alle E-Mails",
      "footerCriteriaOne": "1 Kriterium",
      "footerCriteriaMany": "{count} Kriterien",
      "createBtn": "Regel erstellen"
    },
    "ingestionRuleTest": {
      "eyebrow": "Simulation",
      "title": "Sammelregeln testen",
      "subtitle": "Geben Sie eine Beispiel-E-Mail ein, um die zuerst angewendete Regel zu sehen.",
      "collectorLabel": "Simulieren für Collector",
      "collectorAll": "Alle Collectoren (nur globale Regeln)",
      "fromLabel": "Absender-E-Mail",
      "fromPlaceholder": "kontakt@kunde.de",
      "fromNameLabel": "Absendername",
      "fromNamePlaceholder": "Sichtbarer Absendername",
      "subjectLabel": "Betreff",
      "subjectPlaceholder": "Test-Betreff",
      "bodyLabel": "Inhalt",
      "bodyPlaceholder": "Test-Inhalt",
      "matchTitle": "Angewendete Regel: {name}",
      "noMatchTitle": "Keine passende Regel",
      "matchSub": "{count} Regel(n) im Testsample bestätigt.",
      "noMatchSub": "Keine aktive Regel validiert diese Test-E-Mail.",
      "footerResult": "Ergebnis basierend auf gespeicherten Regeln",
      "footerNoTest": "Noch kein Test",
      "testing": "Test läuft…",
      "runTest": "Test starten"
    },
    "providers": {
      "imap-pop3": {
        "label": "IMAP / POP3",
        "hint": "Manuelle Einrichtung",
        "connectionTitle": "Manuelle IMAP-Verbindung",
        "connectionDescription": "Zugangsdaten des zu scannenden Postfachs eingeben."
      },
      "gmail": {
        "label": "Gmail",
        "hint": "Google-Konto",
        "connectionTitle": "Gmail-Verbindung",
        "connectionDescription": "Google-Konto per IMAP verbinden.",
        "comingSoon": "Demnächst"
      },
      "outlook-com": {
        "label": "Outlook.com",
        "hint": "Microsoft-Postfach",
        "connectionTitle": "Outlook.com-Verbindung",
        "connectionDescription": "Persönliches Microsoft-Postfach verbinden.",
        "comingSoon": "Demnächst"
      },
      "o365": {
        "label": "Microsoft 365",
        "hint": "Office-365-Mandant",
        "connectionTitle": "Microsoft-365-Verbindung",
        "connectionDescription": "Office-365-Mandant verbinden.",
        "comingSoon": "Demnächst"
      },
      "ovh": {
        "label": "OVH",
        "hint": "OVH / MX Plan Mail",
        "connectionTitle": "OVH-Verbindung",
        "connectionDescription": "OVH-/MX-Plan-Mail verbinden.",
        "comingSoon": "Demnächst"
      },
      "exchange": {
        "label": "Exchange",
        "hint": "Exchange-Server",
        "connectionTitle": "Exchange-Verbindung",
        "connectionDescription": "Microsoft-Exchange-Server verbinden.",
        "comingSoon": "Demnächst"
      },
      "yahoo": {
        "label": "Yahoo Mail",
        "hint": "Yahoo-Konto",
        "connectionTitle": "Yahoo-Mail-Verbindung",
        "connectionDescription": "Yahoo-Konto verbinden.",
        "comingSoon": "Demnächst"
      },
      "icloud": {
        "label": "iCloud Mail",
        "hint": "Apple-Konto",
        "connectionTitle": "iCloud-Mail-Verbindung",
        "connectionDescription": "Apple-iCloud-Konto verbinden.",
        "comingSoon": "Demnächst"
      },
      "zoho": {
        "label": "Zoho Mail",
        "hint": "Zoho-Konto",
        "connectionTitle": "Zoho-Mail-Verbindung",
        "connectionDescription": "Zoho-Mail-Konto verbinden.",
        "comingSoon": "Demnächst"
      },
      "proton-mail": {
        "label": "Proton Mail",
        "hint": "Über Proton Bridge",
        "connectionTitle": "Proton-Mail-Verbindung",
        "connectionDescription": "Über Proton Bridge (lokales IMAP) verbinden.",
        "comingSoon": "Demnächst"
      }
    },
    "collectorFormSections": {
      "provider": {
        "label": "Postfachtyp",
        "description": "Mail-Anbieter wählen"
      },
      "connection": {
        "label": "Verbindung",
        "description": "Zugangsdaten und Server"
      },
      "ingestion": {
        "label": "Aufnahme",
        "description": "Ordner und Intervall"
      }
    },
    "ingestionRuleFormSections": {
      "general": {
        "label": "Einstellungen",
        "description": "Name, Aktion und Status"
      },
      "criteria": {
        "label": "Kriterien",
        "description": "Übereinstimmungsbedingungen"
      }
    },
    "ruleActions": {
      "create_ticket_support": {
        "label": "Support-Ticket erstellen"
      },
      "create_ticket_services": {
        "label": "Dienstleistungs-/Service-Ticket erstellen"
      },
      "attach_comment": {
        "label": "An bestehendes Ticket anhängen (Antwort)"
      },
      "ignore_mail": {
        "label": "Ignorieren"
      },
      "create_ticket": {
        "label": "Support-Ticket erstellen"
      }
    },
    "ruleHelpers": {
      "allCollectors": "Alle Collectoren",
      "deletedCollector": "Collector gelöscht"
    },
    "mailCriteria": {
      "fields": {
        "subject": {
          "label": "Betreff"
        },
        "body": {
          "label": "Inhalt"
        },
        "fromAddress": {
          "label": "Absender-E-Mail"
        },
        "fromName": {
          "label": "Absendername"
        },
        "fromDomain": {
          "label": "Absender-Domain"
        },
        "toAddresses": {
          "label": "Empfänger (An)"
        },
        "ccAddresses": {
          "label": "Kopie (Cc)"
        },
        "replyToAddress": {
          "label": "Reply-To"
        },
        "isReply": {
          "label": "Antwort / Weiterleitung (RE/FW)"
        }
      },
      "operators": {
        "contains": {
          "label": "enthält"
        },
        "not_contains": {
          "label": "enthält nicht"
        },
        "equals": {
          "label": "ist gleich"
        },
        "not_equals": {
          "label": "ist nicht gleich"
        },
        "starts_with": {
          "label": "beginnt mit"
        },
        "ends_with": {
          "label": "endet mit"
        },
        "is_empty": {
          "label": "ist leer"
        },
        "is_not_empty": {
          "label": "ist nicht leer"
        },
        "in": {
          "label": "enthält einen Wert (Liste)"
        },
        "not_in": {
          "label": "enthält keinen der Werte"
        }
      },
      "allEmails": "Alle E-Mails",
      "allEmailsNoCriteria": "Alle E-Mails (keine Kriterien)",
      "valuePlaceholder": "Vergleichswert",
      "listPlaceholder": "wert1, wert2, …",
      "isReplyYes": "Ja (RE/FW)",
      "isReplyNo": "Nein"
    },
    "certOptions": {
      "noValidate": "Selbstsignierte Zertifikate akzeptieren",
      "validate": "Zertifikat prüfen"
    }
  },
  "it": {
    "tabs": {
      "collectors": "Collector",
      "email-ingestion": "Regole di raccolta",
      "mail-collect-options": "Impostazioni"
    },
    "common": {
      "loading": "Caricamento raccolta mail…",
      "loadingShort": "Caricamento…",
      "saving": "Salvataggio…",
      "save": "Salva",
      "close": "Chiudi",
      "cancel": "Annulla",
      "active": "Attivo",
      "inactive": "Inattivo",
      "minSuffix": "min",
      "collectorFallback": "Collector",
      "ruleFallback": "Regola",
      "ruleUntitled": "Regola senza nome",
      "newRuleName": "Nuova regola",
      "proSuffix": " (Pro)",
      "browseFolders": "Sfoglia cartelle",
      "comingSoon": "Prossimamente",
      "notAvailable": "Non disponibile",
      "test": "Test",
      "addRule": "Aggiungi regola",
      "yes": "Sì",
      "no": "No",
      "value": "Valore",
      "field": "Campo",
      "operator": "Operatore",
      "group": "Gruppo",
      "rule": "Regola",
      "and": "E",
      "or": "O",
      "proOnly": "Pro"
    },
    "collectors": {
      "title": "Caselle mail da raccogliere",
      "description": "Connessioni IMAP/POP3, frequenza di recupero e log di assorbimento delle email in entrata.",
      "addBtn": "Aggiungi collector",
      "empty": "Nessun collector configurato",
      "columns": {
        "name": "NOME",
        "server": "SERVER",
        "protocol": "PROTOCOLLO",
        "folder": "CARTELLA",
        "interval": "FREQUENZA",
        "active": "ATTIVO",
        "collected": "RACCOLTE",
        "validated": "ACCETTATE",
        "ignored": "IGNORATE",
        "logs": "LOG",
        "actions": "AZIONI"
      },
      "actions": {
        "forceFetch": "Forza recupero",
        "viewLogs": "Visualizza log",
        "edit": "Modifica collector",
        "delete": "Elimina collector"
      }
    },
    "rules": {
      "title": "Smistamento email in entrata",
      "description": "Regole valutate in ordine per creare un ticket, ignorare un messaggio o collegare una risposta.",
      "testBtn": "Test",
      "addBtn": "Aggiungi regola",
      "empty": "Nessuna regola di raccolta al momento.",
      "clickToEdit": "Clicca per modificare la regola",
      "moveUp": "Sposta regola su",
      "moveDown": "Sposta regola giù",
      "delete": "Elimina regola",
      "columns": {
        "order": "ORDINE",
        "name": "NOME",
        "collector": "COLLECTOR",
        "criteria": "CRITERI",
        "action": "AZIONE",
        "active": "ATTIVO",
        "delete": "ELIM."
      }
    },
    "options": {
      "loading": "Caricamento impostazioni…",
      "cardTitle": "Impostazioni di raccolta",
      "cardDescription": "Comportamento del trattamento email in entrata e conservazione dei log.",
      "groups": {
        "thread": {
          "title": "Thread di conversazione",
          "description": "Collegamento risposte via Message-ID / In-Reply-To"
        },
        "logs": {
          "title": "Log dei collector",
          "description": "Volume di log conservato per collector"
        }
      },
      "threadReplies": {
        "label": "Collegamento per thread",
        "hint": "Rileva risposte collegate a un ticket esistente."
      },
      "deduplicate": {
        "label": "Deduplicazione Message-ID",
        "hint": "Ignora le mail già registrate in Veritas."
      },
      "orphanReply": {
        "label": "Risposta senza ticket collegato",
        "hintFallback": "Se nessun ticket corrisponde al thread.",
        "ariaLabel": "Risposta senza ticket collegato"
      },
      "maxLogEntries": {
        "label": "Voci max per collector",
        "hint": "Le voci più vecchie vengono rimosse oltre questo limite.",
        "ariaLabel": "Numero massimo di voci di log per collector"
      },
      "footerHint": "Modalità opt-in: un'email viene trattata solo se corrisponde a una regola di raccolta attiva. Altrimenti resta in posta in arrivo."
    },
    "orphanReply": {
      "ignore": {
        "label": "Ignora",
        "subtitle": "Lascia la mail in posta in arrivo"
      },
      "refuse": {
        "label": "Rifiuta",
        "subtitle": "Sposta nella cartella rifiutati del collector"
      }
    },
    "toast": {
      "loadError": "Impossibile caricare la configurazione di raccolta mail",
      "saveError": "Errore durante il salvataggio",
      "saveSuccess": "Impostazioni di raccolta mail salvate",
      "ruleSaveError": "Errore durante il salvataggio delle regole di raccolta",
      "ruleDeleteError": "Errore durante l'eliminazione della regola",
      "ruleTestError": "Errore durante il test delle regole.",
      "ruleAdded": "Regola di raccolta aggiunta",
      "ruleUpdated": "Regola di raccolta aggiornata",
      "ruleDeleted": "Regola di raccolta eliminata",
      "imapTestSuccess": "Connessione IMAP riuscita.",
      "imapTestError": "Errore durante il test di connessione.",
      "imapConnectionFailed": "Connessione IMAP impossibile.",
      "forceFetchSuccess": "Recupero forzato: {attached} collegata/e, {ignored} ignorata/e",
      "forceFetchError": "Errore durante il recupero forzato.",
      "forceFetchFailed": "Recupero forzato impossibile.",
      "foldersError": "Errore durante il caricamento delle cartelle.",
      "foldersFailed": "Impossibile recuperare le cartelle.",
      "emailRequired": "L'indirizzo email è obbligatorio",
      "serverRequired": "Il server IMAP è obbligatorio",
      "passwordRequired": "La password è obbligatoria",
      "collectorSaveError": "Errore durante il salvataggio del collector",
      "collectorAdded": "Collector aggiunto",
      "collectorUpdated": "Collector aggiornato",
      "collectorDeleted": "Collector eliminato",
      "collectorDeleteError": "Errore durante l'eliminazione del collector",
      "proActionError": "L'azione prestazioni/servizi è riservata a Veritas Pro.",
      "rulesTestFailed": "Test delle regole impossibile."
    },
    "collectorForm": {
      "eyebrow": "Raccolta mail",
      "createTitle": "Nuovo collector mail",
      "editTitle": "Modifica {name}",
      "editTitleFallback": "Modifica collector",
      "createSubtitle": "Scegli la tua posta, poi segui i passaggi per collegare la casella e configurare la raccolta.",
      "editSubtitle": "Regola connessione, cartelle scansionate e smistamento post-trattamento.",
      "sectionsAria": "Sezioni del collector",
      "providerTitle": "Quale servizio di posta usi?",
      "providerDesc": "Seleziona il provider.",
      "connectionDefaultTitle": "Connessione",
      "connectionDefaultDesc": "Inserisci le informazioni richieste di seguito.",
      "emailLabel": "Indirizzo email",
      "emailPlaceholder": "support@azienda.it",
      "passwordLabel": "Password",
      "passwordPlaceholder": "••••••••",
      "serverLabel": "Server IMAP",
      "serverPlaceholder": "imap.azienda.it",
      "nameLabel": "Nome visualizzato (opzionale)",
      "namePlaceholder": "Nome del collector",
      "advancedToggle": "Opzioni avanzate (porta, certificato)",
      "portLabel": "Porta IMAP",
      "portPlaceholder": "993 (SSL predefinito)",
      "certLabel": "Certificato server",
      "testingConnection": "Test in corso…",
      "testConnection": "Testa connessione",
      "ingestionDescBefore": "Indica quale cartella scansionare, dove spostare le mail trattate e la frequenza di controllo. I criteri di accettazione si configurano nella scheda ",
      "ingestionDescTab": "Regole di raccolta",
      "ingestionDescAfter": ".",
      "statusLabel": "Collector attivo",
      "statusHint": "Disattiva per sospendere la raccolta senza eliminare la configurazione.",
      "scanFolderTitle": "1. Cartella da scansionare",
      "inboxLabel": "Posta in arrivo",
      "inboxPlaceholder": "INBOX",
      "moveFolderTitle": "2. Dove spostare le mail trattate",
      "moveFolderHint": "Lascia vuoto per non spostare il messaggio. Le cartelle devono esistere nella casella.",
      "acceptedLabel": "Mail accettate",
      "acceptedPlaceholder": "INBOX/Trattate",
      "refusedLabel": "Mail rifiutate",
      "refusedPlaceholder": "INBOX/Rifiutate",
      "behaviorTitle": "3. Comportamento",
      "autoIngestLabel": "Crea ticket automaticamente",
      "unreadOnlyLabel": "Solo messaggi non letti",
      "intervalLabel": "Frequenza di controllo",
      "intervalHintOne": "Controllo ogni {minutes} minuto",
      "intervalHintMany": "Controllo ogni {minutes} minuti",
      "createBtn": "Crea collector",
      "logConnectionSuccess": "Test di connessione riuscito.",
      "logConnectionFailed": "Test di connessione fallito: {error}",
      "logFoldersSuccess": "Elenco cartelle recuperato dalla casella mail.",
      "logFoldersFailed": "Recupero cartelle fallito: {error}",
      "unknownError": "errore sconosciuto"
    },
    "collectorLogs": {
      "eyebrow": "Registro attività",
      "title": "Log · {name}",
      "subtitle": "Storico connessioni, recuperi ed errori per questo collector.",
      "entryOne": "voce",
      "entryMany": "voci",
      "errorOne": "errore",
      "errorMany": "errori",
      "emptyTitle": "Nessun log registrato",
      "emptyDesc": "Gli eventi appariranno qui dopo test di connessione, recuperi forzati o cicli automatici.",
      "footerRecent": "Dal più recente al più vecchio",
      "footerNone": "Nessuna attività recente",
      "levels": {
        "success": "OK",
        "error": "Err.",
        "warning": "Avviso",
        "info": "Info"
      }
    },
    "collectorFolders": {
      "eyebrow": "Casella remota",
      "title": "Seleziona una cartella",
      "subtitle": "Sfoglia le cartelle disponibili sul server mail connesso.",
      "loading": "Caricamento cartelle…",
      "empty": "Nessuna cartella trovata. Verifica connessione e credenziali del collector."
    },
    "ingestionRuleForm": {
      "eyebrow": "Regole di raccolta",
      "createTitle": "Nuova regola di raccolta",
      "editTitle": "Modifica {name}",
      "editTitleFallback": "Modifica regola",
      "createSubtitle": "Senza regola attiva, nessuna email viene trattata. Definisci quando e come agire.",
      "editSubtitle": "Regola l'azione eseguita quando i criteri corrispondono.",
      "sectionsAria": "Sezioni della regola",
      "statusLabel": "Regola attiva",
      "statusHint": "Solo le regole attive possono attivare un'azione sulle email raccolte.",
      "collectorLabel": "Collector interessato",
      "collectorAll": "Tutti i collector",
      "collectorHint": "Senza regola corrispondente, le email restano in casella senza azione.",
      "nameLabel": "Nome regola",
      "namePlaceholder": "Es. Supporto generale / Servizi clienti",
      "actionLabel": "Azione se corrispondenza",
      "proActionHint": "Riservato a Veritas Pro · ticket prestazioni/servizi.",
      "criteriaHintBefore": "Concatena regole e gruppi con E / O. Senza criteri, la regola si applica a ",
      "criteriaHintBold": "tutte le email",
      "criteriaHintAfter": ". Le regole sono valutate nell'ordine della tabella admin.",
      "criteriaEmpty": "Nessun criterio · tutte le email attiveranno questa azione.",
      "addCriterion": "Aggiungi criterio",
      "groupElements": "{count} elemento/i",
      "groupHint": "Le regole di questo gruppo sono valutate insieme, come tra parentesi.",
      "addRuleInGroup": "Regola nel gruppo",
      "addSubgroup": "Sottogruppo",
      "selectNodeHint": "Seleziona una regola o un gruppo nell'elenco.",
      "addRuleBtn": "Aggiungi regola",
      "addGroupBtn": "Aggiungi gruppo",
      "footerAllEmails": "Criteri: tutte le email",
      "footerCriteriaOne": "1 criterio",
      "footerCriteriaMany": "{count} criteri",
      "createBtn": "Crea regola"
    },
    "ingestionRuleTest": {
      "eyebrow": "Simulazione",
      "title": "Testa regole di raccolta",
      "subtitle": "Inserisci un'email fittizia per vedere quale regola verrebbe applicata per prima.",
      "collectorLabel": "Simula per collector",
      "collectorAll": "Tutti i collector (solo regole globali)",
      "fromLabel": "Email mittente",
      "fromPlaceholder": "contatto@cliente.it",
      "fromNameLabel": "Nome mittente",
      "fromNamePlaceholder": "Nome visibile del mittente",
      "subjectLabel": "Oggetto mail",
      "subjectPlaceholder": "Oggetto mail di test",
      "bodyLabel": "Contenuto mail",
      "bodyPlaceholder": "Corpo mail di test",
      "matchTitle": "Regola applicata: {name}",
      "noMatchTitle": "Nessuna regola corrisponde",
      "matchSub": "{count} regola/e convalidata/e sul campione testato.",
      "noMatchSub": "Nessuna regola attiva valida questa email di test.",
      "footerResult": "Risultato basato sulle regole attualmente salvate",
      "footerNoTest": "Nessun test avviato",
      "testing": "Test in corso…",
      "runTest": "Avvia test"
    },
    "providers": {
      "imap-pop3": {
        "label": "IMAP / POP3",
        "hint": "Configurazione manuale",
        "connectionTitle": "Connessione IMAP manuale",
        "connectionDescription": "Inserisci le credenziali della casella da scansionare."
      },
      "gmail": {
        "label": "Gmail",
        "hint": "Account Google",
        "connectionTitle": "Connessione Gmail",
        "connectionDescription": "Connessione account Google via IMAP.",
        "comingSoon": "Prossimamente"
      },
      "outlook-com": {
        "label": "Outlook.com",
        "hint": "Casella Microsoft",
        "connectionTitle": "Connessione Outlook.com",
        "connectionDescription": "Connessione casella Microsoft personale.",
        "comingSoon": "Prossimamente"
      },
      "o365": {
        "label": "Microsoft 365",
        "hint": "Tenant Office 365",
        "connectionTitle": "Connessione Microsoft 365",
        "connectionDescription": "Connessione tenant Office 365.",
        "comingSoon": "Prossimamente"
      },
      "ovh": {
        "label": "OVH",
        "hint": "Mail OVH / MX Plan",
        "connectionTitle": "Connessione OVH",
        "connectionDescription": "Connessione mail OVH / MX Plan.",
        "comingSoon": "Prossimamente"
      },
      "exchange": {
        "label": "Exchange",
        "hint": "Server Exchange",
        "connectionTitle": "Connessione Exchange",
        "connectionDescription": "Connessione server Microsoft Exchange.",
        "comingSoon": "Prossimamente"
      },
      "yahoo": {
        "label": "Yahoo Mail",
        "hint": "Account Yahoo",
        "connectionTitle": "Connessione Yahoo Mail",
        "connectionDescription": "Connessione account Yahoo.",
        "comingSoon": "Prossimamente"
      },
      "icloud": {
        "label": "iCloud Mail",
        "hint": "Account Apple",
        "connectionTitle": "Connessione iCloud Mail",
        "connectionDescription": "Connessione account Apple iCloud.",
        "comingSoon": "Prossimamente"
      },
      "zoho": {
        "label": "Zoho Mail",
        "hint": "Account Zoho",
        "connectionTitle": "Connessione Zoho Mail",
        "connectionDescription": "Connessione account Zoho Mail.",
        "comingSoon": "Prossimamente"
      },
      "proton-mail": {
        "label": "Proton Mail",
        "hint": "Via Proton Bridge",
        "connectionTitle": "Connessione Proton Mail",
        "connectionDescription": "Connessione via Proton Bridge (IMAP locale).",
        "comingSoon": "Prossimamente"
      }
    },
    "collectorFormSections": {
      "provider": {
        "label": "Tipo casella",
        "description": "Scegli la tua posta"
      },
      "connection": {
        "label": "Connessione",
        "description": "Credenziali e server"
      },
      "ingestion": {
        "label": "Assorbimento",
        "description": "Cartelle e frequenza"
      }
    },
    "ingestionRuleFormSections": {
      "general": {
        "label": "Impostazioni",
        "description": "Nome, azione e stato"
      },
      "criteria": {
        "label": "Criteri",
        "description": "Condizioni di corrispondenza"
      }
    },
    "ruleActions": {
      "create_ticket_support": {
        "label": "Crea ticket supporto"
      },
      "create_ticket_services": {
        "label": "Crea ticket prestazioni / servizi"
      },
      "attach_comment": {
        "label": "Collega a ticket esistente (risposta)"
      },
      "ignore_mail": {
        "label": "Ignora"
      },
      "create_ticket": {
        "label": "Crea ticket supporto"
      }
    },
    "ruleHelpers": {
      "allCollectors": "Tutti i collector",
      "deletedCollector": "Collector eliminato"
    },
    "mailCriteria": {
      "fields": {
        "subject": {
          "label": "Oggetto"
        },
        "body": {
          "label": "Contenuto"
        },
        "fromAddress": {
          "label": "Email mittente"
        },
        "fromName": {
          "label": "Nome mittente"
        },
        "fromDomain": {
          "label": "Dominio mittente"
        },
        "toAddresses": {
          "label": "Destinatari (A)"
        },
        "ccAddresses": {
          "label": "Copia (Cc)"
        },
        "replyToAddress": {
          "label": "Reply-To"
        },
        "isReply": {
          "label": "Risposta / inoltro (RE/FW)"
        }
      },
      "operators": {
        "contains": {
          "label": "contiene"
        },
        "not_contains": {
          "label": "non contiene"
        },
        "equals": {
          "label": "è uguale a"
        },
        "not_equals": {
          "label": "non è uguale a"
        },
        "starts_with": {
          "label": "inizia con"
        },
        "ends_with": {
          "label": "termina con"
        },
        "is_empty": {
          "label": "è vuoto"
        },
        "is_not_empty": {
          "label": "non è vuoto"
        },
        "in": {
          "label": "contiene uno dei valori (lista)"
        },
        "not_in": {
          "label": "non contiene nessuno dei valori"
        }
      },
      "allEmails": "Tutte le email",
      "allEmailsNoCriteria": "Tutte le email (nessun criterio)",
      "valuePlaceholder": "Valore da confrontare",
      "listPlaceholder": "valore1, valore2, …",
      "isReplyYes": "Sì (RE/FW)",
      "isReplyNo": "No"
    },
    "certOptions": {
      "noValidate": "Accetta certificati autofirmati",
      "validate": "Verifica certificato"
    }
  },
  "es": {
    "tabs": {
      "collectors": "Colectores",
      "email-ingestion": "Reglas de recogida",
      "mail-collect-options": "Ajustes"
    },
    "common": {
      "loading": "Cargando recogida de correo…",
      "loadingShort": "Cargando…",
      "saving": "Guardando…",
      "save": "Guardar",
      "close": "Cerrar",
      "cancel": "Cancelar",
      "active": "Activo",
      "inactive": "Inactivo",
      "minSuffix": "min",
      "collectorFallback": "Colector",
      "ruleFallback": "Regla",
      "ruleUntitled": "Regla sin nombre",
      "newRuleName": "Nueva regla",
      "proSuffix": " (Pro)",
      "browseFolders": "Explorar carpetas",
      "comingSoon": "Próximamente",
      "notAvailable": "No disponible",
      "test": "Probar",
      "addRule": "Añadir regla",
      "yes": "Sí",
      "no": "No",
      "value": "Valor",
      "field": "Campo",
      "operator": "Operador",
      "group": "Grupo",
      "rule": "Regla",
      "and": "Y",
      "or": "O",
      "proOnly": "Pro"
    },
    "collectors": {
      "title": "Buzones a recoger",
      "description": "Conexiones IMAP/POP3, frecuencia de recuperación y registros de absorción de correos entrantes.",
      "addBtn": "Añadir colector",
      "empty": "Ningún colector configurado",
      "columns": {
        "name": "NOMBRE",
        "server": "SERVIDOR",
        "protocol": "PROTOCOLO",
        "folder": "CARPETA",
        "interval": "FRECUENCIA",
        "active": "ACTIVO",
        "collected": "RECOGIDOS",
        "validated": "ACEPTADOS",
        "ignored": "IGNORADOS",
        "logs": "LOGS",
        "actions": "ACCIONES"
      },
      "actions": {
        "forceFetch": "Forzar recuperación",
        "viewLogs": "Ver logs",
        "edit": "Editar colector",
        "delete": "Eliminar colector"
      }
    },
    "rules": {
      "title": "Clasificación de correos entrantes",
      "description": "Reglas evaluadas en orden para crear un ticket, ignorar un mensaje o adjuntar una respuesta.",
      "testBtn": "Probar",
      "addBtn": "Añadir regla",
      "empty": "Ninguna regla de recogida por el momento.",
      "clickToEdit": "Clic para editar la regla",
      "moveUp": "Subir regla",
      "moveDown": "Bajar regla",
      "delete": "Eliminar regla",
      "columns": {
        "order": "ORDEN",
        "name": "NOMBRE",
        "collector": "COLECTOR",
        "criteria": "CRITERIOS",
        "action": "ACCIÓN",
        "active": "ACTIVO",
        "delete": "ELIM."
      }
    },
    "options": {
      "loading": "Cargando ajustes…",
      "cardTitle": "Ajustes de recogida",
      "cardDescription": "Comportamiento del tratamiento de correos entrantes y retención de registros.",
      "groups": {
        "thread": {
          "title": "Hilo de conversación",
          "description": "Vinculación de respuestas vía Message-ID / In-Reply-To"
        },
        "logs": {
          "title": "Registro de colectores",
          "description": "Volumen de logs conservado por colector"
        }
      },
      "threadReplies": {
        "label": "Vinculación por hilo",
        "hint": "Detecta respuestas vinculadas a un ticket existente."
      },
      "deduplicate": {
        "label": "Deduplicación Message-ID",
        "hint": "Ignora correos ya registrados en Veritas."
      },
      "orphanReply": {
        "label": "Respuesta sin ticket vinculado",
        "hintFallback": "Si ningún ticket corresponde al hilo.",
        "ariaLabel": "Respuesta sin ticket vinculado"
      },
      "maxLogEntries": {
        "label": "Entradas máx. por colector",
        "hint": "Las entradas más antiguas se eliminan más allá de este límite.",
        "ariaLabel": "Número máximo de entradas de log por colector"
      },
      "footerHint": "Modo opt-in: un correo se procesa solo si coincide con una regla de recogida activa. Si no, permanece en la bandeja de entrada."
    },
    "orphanReply": {
      "ignore": {
        "label": "Ignorar",
        "subtitle": "Dejar el correo en la bandeja de entrada"
      },
      "refuse": {
        "label": "Rechazar",
        "subtitle": "Mover a la carpeta de rechazados del colector"
      }
    },
    "toast": {
      "loadError": "No se pudo cargar la configuración de recogida de correo",
      "saveError": "Error al guardar",
      "saveSuccess": "Ajustes de recogida de correo guardados",
      "ruleSaveError": "Error al guardar las reglas de recogida",
      "ruleDeleteError": "Error al eliminar la regla",
      "ruleTestError": "Error al probar las reglas.",
      "ruleAdded": "Regla de recogida añadida",
      "ruleUpdated": "Regla de recogida actualizada",
      "ruleDeleted": "Regla de recogida eliminada",
      "imapTestSuccess": "Conexión IMAP correcta.",
      "imapTestError": "Error al probar la conexión.",
      "imapConnectionFailed": "Conexión IMAP imposible.",
      "forceFetchSuccess": "Recuperación forzada: {attached} vinculado(s), {ignored} ignorado(s)",
      "forceFetchError": "Error durante la recuperación forzada.",
      "forceFetchFailed": "Recuperación forzada imposible.",
      "foldersError": "Error al cargar las carpetas.",
      "foldersFailed": "No se pudieron recuperar las carpetas.",
      "emailRequired": "La dirección de correo es obligatoria",
      "serverRequired": "El servidor IMAP es obligatorio",
      "passwordRequired": "La contraseña es obligatoria",
      "collectorSaveError": "Error al guardar el colector",
      "collectorAdded": "Colector añadido",
      "collectorUpdated": "Colector actualizado",
      "collectorDeleted": "Colector eliminado",
      "collectorDeleteError": "Error al eliminar el colector",
      "proActionError": "La acción de prestaciones/servicios está reservada a Veritas Pro.",
      "rulesTestFailed": "Prueba de reglas imposible."
    },
    "collectorForm": {
      "eyebrow": "Recogida de correo",
      "createTitle": "Nuevo colector de correo",
      "editTitle": "Editar {name}",
      "editTitleFallback": "Editar colector",
      "createSubtitle": "Elija su proveedor de correo y siga los pasos para conectar el buzón y configurar la recogida.",
      "editSubtitle": "Ajuste la conexión, las carpetas escaneadas y el enrutamiento posterior al tratamiento.",
      "sectionsAria": "Secciones del colector",
      "providerTitle": "¿Qué servicio de correo utiliza?",
      "providerDesc": "Seleccione su proveedor.",
      "connectionDefaultTitle": "Conexión",
      "connectionDefaultDesc": "Introduzca la información solicitada a continuación.",
      "emailLabel": "Dirección de correo",
      "emailPlaceholder": "support@empresa.es",
      "passwordLabel": "Contraseña",
      "passwordPlaceholder": "••••••••",
      "serverLabel": "Servidor IMAP",
      "serverPlaceholder": "imap.empresa.es",
      "nameLabel": "Nombre visible (opcional)",
      "namePlaceholder": "Nombre del colector",
      "advancedToggle": "Opciones avanzadas (puerto, certificado)",
      "portLabel": "Puerto IMAP",
      "portPlaceholder": "993 (SSL por defecto)",
      "certLabel": "Certificado del servidor",
      "testingConnection": "Prueba en curso…",
      "testConnection": "Probar conexión",
      "ingestionDescBefore": "Indique qué carpeta escanear, dónde mover los correos tratados y la frecuencia de comprobación. Los criterios de aceptación se configuran en la pestaña ",
      "ingestionDescTab": "Reglas de recogida",
      "ingestionDescAfter": ".",
      "statusLabel": "Colector activo",
      "statusHint": "Desactive para suspender la recogida sin eliminar la configuración.",
      "scanFolderTitle": "1. Carpeta a escanear",
      "inboxLabel": "Bandeja de entrada",
      "inboxPlaceholder": "INBOX",
      "moveFolderTitle": "2. Dónde mover los correos tratados",
      "moveFolderHint": "Deje vacío para no mover el mensaje. Las carpetas deben existir en el buzón.",
      "acceptedLabel": "Correos aceptados",
      "acceptedPlaceholder": "INBOX/Tratados",
      "refusedLabel": "Correos rechazados",
      "refusedPlaceholder": "INBOX/Rechazados",
      "behaviorTitle": "3. Comportamiento",
      "autoIngestLabel": "Crear tickets automáticamente",
      "unreadOnlyLabel": "Solo mensajes no leídos",
      "intervalLabel": "Frecuencia de comprobación",
      "intervalHintOne": "Comprobación cada {minutes} minuto",
      "intervalHintMany": "Comprobación cada {minutes} minutos",
      "createBtn": "Crear colector",
      "logConnectionSuccess": "Prueba de conexión correcta.",
      "logConnectionFailed": "Prueba de conexión fallida: {error}",
      "logFoldersSuccess": "Lista de carpetas recuperada del buzón.",
      "logFoldersFailed": "Recuperación de carpetas fallida: {error}",
      "unknownError": "error desconocido"
    },
    "collectorLogs": {
      "eyebrow": "Registro de actividad",
      "title": "Logs · {name}",
      "subtitle": "Historial de conexiones, recuperaciones y errores de este colector.",
      "entryOne": "entrada",
      "entryMany": "entradas",
      "errorOne": "error",
      "errorMany": "errores",
      "emptyTitle": "Ningún log registrado",
      "emptyDesc": "Los eventos aparecerán aquí tras pruebas de conexión, recuperaciones forzadas o ciclos automáticos.",
      "footerRecent": "Del más reciente al más antiguo",
      "footerNone": "Ninguna actividad reciente",
      "levels": {
        "success": "OK",
        "error": "Err.",
        "warning": "Alerta",
        "info": "Info"
      }
    },
    "collectorFolders": {
      "eyebrow": "Buzón remoto",
      "title": "Seleccionar una carpeta",
      "subtitle": "Explore las carpetas disponibles en el servidor de correo conectado.",
      "loading": "Cargando carpetas…",
      "empty": "Ninguna carpeta encontrada. Verifique la conexión y las credenciales del colector."
    },
    "ingestionRuleForm": {
      "eyebrow": "Reglas de recogida",
      "createTitle": "Nueva regla de recogida",
      "editTitle": "Editar {name}",
      "editTitleFallback": "Editar regla",
      "createSubtitle": "Sin regla activa, ningún correo se procesa. Defina cuándo y cómo actuar.",
      "editSubtitle": "Ajuste la acción ejecutada cuando los criterios coinciden.",
      "sectionsAria": "Secciones de la regla",
      "statusLabel": "Regla activa",
      "statusHint": "Solo las reglas activas pueden activar una acción sobre los correos recogidos.",
      "collectorLabel": "Colector afectado",
      "collectorAll": "Todos los colectores",
      "collectorHint": "Sin regla correspondiente, los correos permanecen en el buzón sin acción.",
      "nameLabel": "Nombre de la regla",
      "namePlaceholder": "Ej. Soporte general / Servicios clientes",
      "actionLabel": "Acción si coincide",
      "proActionHint": "Reservado a Veritas Pro · ticket prestaciones/servicios.",
      "criteriaHintBefore": "Encadene reglas y grupos con Y / O. Sin criterios, la regla se aplica a ",
      "criteriaHintBold": "todos los correos",
      "criteriaHintAfter": ". Las reglas se evalúan en el orden de la tabla admin.",
      "criteriaEmpty": "Sin criterios · todos los correos activarán esta acción.",
      "addCriterion": "Añadir criterio",
      "groupElements": "{count} elemento(s)",
      "groupHint": "Las reglas de este grupo se evalúan juntas, como entre paréntesis.",
      "addRuleInGroup": "Regla en el grupo",
      "addSubgroup": "Subgrupo",
      "selectNodeHint": "Seleccione una regla o un grupo en la lista.",
      "addRuleBtn": "Añadir regla",
      "addGroupBtn": "Añadir grupo",
      "footerAllEmails": "Criterios: todos los correos",
      "footerCriteriaOne": "1 criterio",
      "footerCriteriaMany": "{count} criterios",
      "createBtn": "Crear regla"
    },
    "ingestionRuleTest": {
      "eyebrow": "Simulación",
      "title": "Probar reglas de recogida",
      "subtitle": "Introduzca un correo ficticio para ver qué regla se aplicaría en primer lugar.",
      "collectorLabel": "Simular para el colector",
      "collectorAll": "Todos los colectores (solo reglas globales)",
      "fromLabel": "Correo del remitente",
      "fromPlaceholder": "contacto@cliente.es",
      "fromNameLabel": "Nombre del remitente",
      "fromNamePlaceholder": "Nombre visible del remitente",
      "subjectLabel": "Asunto del correo",
      "subjectPlaceholder": "Asunto del correo de prueba",
      "bodyLabel": "Contenido del correo",
      "bodyPlaceholder": "Cuerpo del correo de prueba",
      "matchTitle": "Regla aplicada: {name}",
      "noMatchTitle": "Ninguna regla coincide",
      "matchSub": "{count} regla(s) validada(s) en la muestra de prueba.",
      "noMatchSub": "Ninguna regla activa valida este correo de prueba.",
      "footerResult": "Resultado basado en las reglas guardadas actualmente",
      "footerNoTest": "Ninguna prueba iniciada",
      "testing": "Prueba en curso…",
      "runTest": "Iniciar prueba"
    },
    "providers": {
      "imap-pop3": {
        "label": "IMAP / POP3",
        "hint": "Configuración manual",
        "connectionTitle": "Conexión IMAP manual",
        "connectionDescription": "Introduzca las credenciales del buzón a escanear."
      },
      "gmail": {
        "label": "Gmail",
        "hint": "Cuenta Google",
        "connectionTitle": "Conexión Gmail",
        "connectionDescription": "Conexión de cuenta Google vía IMAP.",
        "comingSoon": "Próximamente"
      },
      "outlook-com": {
        "label": "Outlook.com",
        "hint": "Buzón Microsoft",
        "connectionTitle": "Conexión Outlook.com",
        "connectionDescription": "Conexión de buzón Microsoft personal.",
        "comingSoon": "Próximamente"
      },
      "o365": {
        "label": "Microsoft 365",
        "hint": "Tenant Office 365",
        "connectionTitle": "Conexión Microsoft 365",
        "connectionDescription": "Conexión al tenant Office 365.",
        "comingSoon": "Próximamente"
      },
      "ovh": {
        "label": "OVH",
        "hint": "Correo OVH / MX Plan",
        "connectionTitle": "Conexión OVH",
        "connectionDescription": "Conexión al correo OVH / MX Plan.",
        "comingSoon": "Próximamente"
      },
      "exchange": {
        "label": "Exchange",
        "hint": "Servidor Exchange",
        "connectionTitle": "Conexión Exchange",
        "connectionDescription": "Conexión al servidor Microsoft Exchange.",
        "comingSoon": "Próximamente"
      },
      "yahoo": {
        "label": "Yahoo Mail",
        "hint": "Cuenta Yahoo",
        "connectionTitle": "Conexión Yahoo Mail",
        "connectionDescription": "Conexión de cuenta Yahoo.",
        "comingSoon": "Próximamente"
      },
      "icloud": {
        "label": "iCloud Mail",
        "hint": "Cuenta Apple",
        "connectionTitle": "Conexión iCloud Mail",
        "connectionDescription": "Conexión de cuenta Apple iCloud.",
        "comingSoon": "Próximamente"
      },
      "zoho": {
        "label": "Zoho Mail",
        "hint": "Cuenta Zoho",
        "connectionTitle": "Conexión Zoho Mail",
        "connectionDescription": "Conexión de cuenta Zoho Mail.",
        "comingSoon": "Próximamente"
      },
      "proton-mail": {
        "label": "Proton Mail",
        "hint": "Vía Proton Bridge",
        "connectionTitle": "Conexión Proton Mail",
        "connectionDescription": "Conexión vía Proton Bridge (IMAP local).",
        "comingSoon": "Próximamente"
      }
    },
    "collectorFormSections": {
      "provider": {
        "label": "Tipo de buzón",
        "description": "Elija su correo"
      },
      "connection": {
        "label": "Conexión",
        "description": "Credenciales y servidor"
      },
      "ingestion": {
        "label": "Absorción",
        "description": "Carpetas y frecuencia"
      }
    },
    "ingestionRuleFormSections": {
      "general": {
        "label": "Ajustes",
        "description": "Nombre, acción y estado"
      },
      "criteria": {
        "label": "Criterios",
        "description": "Condiciones de coincidencia"
      }
    },
    "ruleActions": {
      "create_ticket_support": {
        "label": "Crear ticket de soporte"
      },
      "create_ticket_services": {
        "label": "Crear ticket de prestaciones / servicios"
      },
      "attach_comment": {
        "label": "Adjuntar a ticket existente (respuesta)"
      },
      "ignore_mail": {
        "label": "Ignorar"
      },
      "create_ticket": {
        "label": "Crear ticket de soporte"
      }
    },
    "ruleHelpers": {
      "allCollectors": "Todos los colectores",
      "deletedCollector": "Colector eliminado"
    },
    "mailCriteria": {
      "fields": {
        "subject": {
          "label": "Asunto"
        },
        "body": {
          "label": "Contenido"
        },
        "fromAddress": {
          "label": "Correo remitente"
        },
        "fromName": {
          "label": "Nombre remitente"
        },
        "fromDomain": {
          "label": "Dominio remitente"
        },
        "toAddresses": {
          "label": "Destinatarios (Para)"
        },
        "ccAddresses": {
          "label": "Copia (Cc)"
        },
        "replyToAddress": {
          "label": "Reply-To"
        },
        "isReply": {
          "label": "Respuesta / reenvío (RE/FW)"
        }
      },
      "operators": {
        "contains": {
          "label": "contiene"
        },
        "not_contains": {
          "label": "no contiene"
        },
        "equals": {
          "label": "es igual a"
        },
        "not_equals": {
          "label": "no es igual a"
        },
        "starts_with": {
          "label": "empieza por"
        },
        "ends_with": {
          "label": "termina en"
        },
        "is_empty": {
          "label": "está vacío"
        },
        "is_not_empty": {
          "label": "no está vacío"
        },
        "in": {
          "label": "contiene uno de los valores (lista)"
        },
        "not_in": {
          "label": "no contiene ninguno de los valores"
        }
      },
      "allEmails": "Todos los correos",
      "allEmailsNoCriteria": "Todos los correos (sin criterios)",
      "valuePlaceholder": "Valor a comparar",
      "listPlaceholder": "valor1, valor2, …",
      "isReplyYes": "Sí (RE/FW)",
      "isReplyNo": "No"
    },
    "certOptions": {
      "noValidate": "Aceptar certificados autofirmados",
      "validate": "Verificar certificado"
    }
  }
};
export const getAdminMailCollectCopy = createLocaleGetter(ADMIN_MAIL_COLLECT_COPY);
export function getLocalizedCollectorProviders(copy) {
  return COLLECTOR_PROVIDER_PRESETS.map(provider => ({
    ...provider,
    label: copy.providers[provider.key]?.label ?? provider.label,
    hint: copy.providers[provider.key]?.hint ?? provider.hint,
    connectionTitle: copy.providers[provider.key]?.connectionTitle ?? provider.connectionTitle,
    connectionDescription: copy.providers[provider.key]?.connectionDescription ?? provider.connectionDescription
  }));
}
export function getLocalizedCollectorFormSections(copy) {
  return COLLECTOR_FORM_SECTIONS.map(section => ({
    ...section,
    label: copy.collectorFormSections[section.id]?.label ?? section.label,
    description: copy.collectorFormSections[section.id]?.description ?? section.description
  }));
}
export function getLocalizedIngestionRuleFormSections(copy) {
  return INGESTION_RULE_FORM_SECTIONS.map(section => ({
    ...section,
    label: copy.ingestionRuleFormSections[section.id]?.label ?? section.label,
    description: copy.ingestionRuleFormSections[section.id]?.description ?? section.description
  }));
}
export function getLocalizedRuleActionOptions(copy) {
  return RULE_ACTION_OPTIONS.map(option => ({
    ...option,
    label: copy.ruleActions[normalizeIngestionAction(option.value)]?.label ?? option.label
  }));
}
export function getRuleActionLabel(action, copy) {
  const key = normalizeIngestionAction(action);
  return copy.ruleActions[key]?.label ?? action;
}
export function getLocalizedMailCriterionFields(copy) {
  return MAIL_CRITERION_FIELD_OPTIONS.map(option => ({
    ...option,
    label: copy.mailCriteria.fields[option.value]?.label ?? option.label
  }));
}
export function getLocalizedMailCriterionOperators(copy) {
  return MAIL_CRITERION_OPERATOR_OPTIONS.map(option => ({
    ...option,
    label: copy.mailCriteria.operators[option.value]?.label ?? option.label
  }));
}
export function getLocalizedOrphanReplyOptions(copy) {
  return ORPHAN_REPLY_BEHAVIOR_OPTIONS.map(option => ({
    ...option,
    label: copy.orphanReply[option.value]?.label ?? option.label,
    subtitle: copy.orphanReply[option.value]?.subtitle ?? option.subtitle
  }));
}
export function describeLocalizedRuleCollector(rule, collectors, copy) {
  const collectorId = String(rule?.collectorId || "").trim();
  if (!collectorId) return copy.ruleHelpers.allCollectors;
  const match = (Array.isArray(collectors) ? collectors : []).find(item => String(item?.id) === collectorId);
  if (!match) return copy.ruleHelpers.deletedCollector;
  return String(match.name || "").trim() || String(match.username || "").trim() || String(match.server || "").trim() || copy.common.collectorFallback;
}
export function describeLocalizedMailCriterionBrief(criterion, copy) {
  const field = copy.mailCriteria.fields[criterion.field]?.label ?? criterion.field ?? copy.common.field;
  const operator = copy.mailCriteria.operators[criterion.operator]?.label ?? criterion.operator ?? copy.common.operator;
  if (criterion.operator === "is_empty" || criterion.operator === "is_not_empty") {
    return `${field} ${operator}`;
  }
  const value = String(criterion.value || "").trim();
  return value ? `${field} ${operator} « ${value} »` : `${field} ${operator}…`;
}
export function describeLocalizedExclusionRuleFilters(rule, copy) {
  const root = normalizeExclusionFilterRoot(rule);
  if (!root.children?.length) return copy.mailCriteria.allEmailsNoCriteria;
  const parts = [];
  const walk = group => {
    (group.children || []).forEach((child, index) => {
      if (index > 0 && child.connector) {
        parts.push(child.connector === "or" ? ` ${copy.common.or} ` : ` ${copy.common.and} `);
      }
      if (child.type === "group") {
        parts.push("(");
        walk(child);
        parts.push(")");
      } else {
        parts.push(describeLocalizedMailCriterionBrief(child, copy));
      }
    });
  };
  walk(root);
  return parts.join("") || copy.mailCriteria.allEmails;
}
export function formatMailCollectDateTime(value, locale = "fr") {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const tag = `${locale}-${locale.toUpperCase()}`;
  return date.toLocaleString(tag, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
export { interpolate };
