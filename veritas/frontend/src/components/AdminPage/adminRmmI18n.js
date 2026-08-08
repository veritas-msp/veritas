import { createLocaleGetter, interpolate } from "../../i18n/translate";
import { COLLECTOR_GROUPS, COLLECTORS } from "./rmmConstants";
import { METRICS_FIELDS } from "./rmmMetricsStorageUtils";
import { RMM_DURATION_UNITS } from "./rmmDurationUtils";
import { RMM_TOKEN_FORM_SECTIONS } from "./rmmTokenConstants";
const ADMIN_RMM_COPY = {
  "fr": {
    "common": {
      "loading": "Chargement du module RMM…",
      "loadingShort": "Chargement…",
      "saving": "Enregistrement…",
      "save": "Enregistrer",
      "close": "Fermer",
      "cancel": "Annuler",
      "edit": "Éditer",
      "trash": "Corbeille",
      "restore": "Restaurer",
      "revoke": "Révoquer",
      "enabled": "Activé",
      "disabled": "Désactivé",
      "available": "Disponible",
      "comingSoon": "Bientôt disponible",
      "build": "Build",
      "workstationsSuffix": "postes",
      "clientLabel": "Client #{id}",
      "downloading": "Téléchargement…",
      "deletePermanently": "Supprimer définitivement",
      "learnMore": "En savoir plus",
      "noCompany": "Aucune entreprise",
      "noLabel": "Sans libellé",
      "indicator": "Indicateur",
      "value": "Valeur",
      "daysSuffix": "j",
      "minSuffix": "min",
      "durationUnitAria": "Unité de durée",
      "durationUnitSuffix": " · unité",
      "costAgentsActive": "Répartis sur la journée",
      "costNoAgents": "Aucun agent"
    },
    "tabs": {
      "deploy": "Déploiement",
      "settings": "Paramètres",
      "tokenSettings": "Par token",
      "tokens": "Tokens d'enrôlement",
      "agents": "Agents",
      "consumptions": "Consommations"
    },
    "deploy": {
      "cardTitle": "Télécharger l'agent endpoint",
      "cardDescription": "Installez l'agent sur les postes pour remonter automatiquement l'inventaire dans Veritas (famille Ordinateurs).",
      "platforms": {
        "windows": {
          "title": "Windows",
          "hint": "Agent natif Windows · inventaire système et rattachement entreprise."
        },
        "macos": {
          "title": "macOS",
          "hint": "Agent natif macOS · inventaire système et rattachement entreprise."
        },
        "linux": {
          "title": "Linux",
          "hint": "Agent natif Linux · compatible distributions serveur et postes."
        },
        "ios": {
          "title": "iOS / iPadOS",
          "hint": "Supervision des iPhone et iPad d'entreprise."
        },
        "android": {
          "title": "Android",
          "hint": "Agent pour smartphones et tablettes Android."
        },
        "chromeos": {
          "title": "ChromeOS",
          "hint": "Postes Chromebook et environnements Google Workspace."
        }
      },
      "windows": {
        "title": "Installation Windows",
        "downloadMsi": "Télécharger le MSI",
        "argsIntro": "Propriétés MSI pour l'installation silencieuse (GPO / Intune / scripts) :",
        "colProperty": "Propriété",
        "colDescription": "Description",
        "colExample": "Exemple",
        "propApiUrl": "URL de l'API Veritas (hôte + port, chemin /api).",
        "propToken": "Token d'enrôlement (onglet Tokens).",
        "propFamily": "Type d'équipement : ordinateurs ou serveurs.",
        "silentLabel": "Installation silencieuse",
        "silentCmd": "msiexec /i VeritasAgent-Windows-Setup.msi APIURL=\"http://host:3001/api\" TOKEN=\"<token>\" FAMILY=\"ordinateurs\" /qn /L*v %TEMP%\\VeritasAgent-install.log",
        "uninstallLabel": "Désinstallation silencieuse",
        "uninstallCmd": "msiexec /x VeritasAgent-Windows-Setup.msi /qn",
        "interactiveHint": "Sans TOKEN : assistant graphique après l'install. Pour le relancer : menu Démarrer → Veritas → Configurer Veritas Agent, ou : \"C:\\Program Files\\Veritas\\Agent\\VeritasAgent.exe\" --configure. Relancer le MSI déjà installé : Réparer / Désinstaller. Version plus récente : mise à jour."
      },
      "soon": {
        "title": "Installation {platform}",
        "defaultPlatform": "Cette plateforme",
        "message": "L'agent Veritas pour {platform} est en cours de développement. Aucune procédure d'installation n'est disponible pour le moment · vous serez notifié dès sa mise en ligne."
      }
    },
    "settings": {
      "globalTitle": "Configuration globale des agents",
      "globalDescription": "Valeurs par défaut pour toutes les entreprises. Des surcharges par token sont possibles dans l'onglet Par token.",
      "communicationTitle": "Communication agent",
      "heartbeatLabel": "Intervalle heartbeat",
      "heartbeatHint": "Fréquence de remontée des agents.",
      "offlineLabel": "Seuil hors ligne",
      "offlineHint": "Délai sans activité avant statut hors ligne.",
      "autoUpdateLabel": "Mise à jour automatique",
      "autoUpdateHint": "L'agent télécharge et installe le MSI serveur quand une version plus récente est disponible.",
      "applyHint": "À l'enregistrement, un sync complet est demandé aux agents concernés : heartbeat, collectors et auto-update s'appliquent au prochain heartbeat.",
      "customValueHint": "Valeur personnalisée pour cette entreprise.",
      "inheritGlobal": "Hérite du global ({value}).",
      "inheritGlobalEnabled": "Hérite du global ({label})",
      "inheritGlobalMetric": "Hérite du global ({value} {suffix})",
      "customValueTitle": "Valeur personnalisée pour cette entreprise"
    },
    "tokens": {
      "title": "Tokens d'enrôlement par entreprise",
      "description": "Chaque token rattache les agents installés à une entreprise Veritas.",
      "newToken": "Nouveau token",
      "viewAria": "Vue des tokens",
      "viewActive": "Actifs",
      "viewTrash": "Corbeille",
      "colCompany": "Entreprise",
      "colToken": "Token",
      "colLabel": "Libellé",
      "colUses": "Utilisations",
      "colExpires": "Expiration",
      "colCreated": "Créé le",
      "colRevoked": "Révoqué le",
      "emptyActive": "Aucun token actif",
      "emptyTrash": "La corbeille est vide"
    },
    "agents": {
      "title": "Agents déployés",
      "description": "Postes Windows enrôlés via l'agent Veritas. La colonne Portée indique si les paramètres viennent du global ou d'une surcharge par token.",
      "searchPlaceholder": "Rechercher un poste, une entreprise, une version…",
      "searchAria": "Rechercher des agents",
      "searchClear": "Effacer la recherche",
      "colCompany": "Entreprise",
      "colHostname": "Poste",
      "colVersion": "Version",
      "colSettingsScope": "Portée",
      "colHeartbeat": "Heartbeat",
      "colAutoUpdate": "Màj auto",
      "scopeGlobal": "Global",
      "scopeToken": "Token",
      "colStatus": "Statut",
      "colLastSeen": "Dernière activité",
      "statusOnline": "En ligne",
      "statusOffline": "Hors ligne",
      "empty": "Aucun agent enregistré",
      "emptySearch": "Aucun agent ne correspond à votre recherche"
    },
    "consumptions": {
      "cardTitle": "Consommations RMM",
      "cardDescription": "Estimations d'impact poste, serveur, réseau et volumétrie stockage.",
      "intro": "Estimations indicatives basées sur la configuration globale (heartbeat {interval}, rétention métriques {retention}). Parc déployé : {agentCount} {agentLabel}. Les paramètres se modifient dans l'onglet {settingsTab}.",
      "agentSingular": "agent",
      "agentPlural": "agents",
      "settingsTab": "Paramètres",
      "projectionLabel": "Postes pour les projections",
      "heartbeatSectionTitle": "Impact heartbeat (régime stable)",
      "heartbeatSectionHint": "Heartbeat light · hors synchronisation complète occasionnelle.",
      "clientCardTitle": "Poste agent",
      "clientCardSubtitle": "Toutes les {interval} · valeurs typiques Windows",
      "serverCardTitle": "Serveur Veritas",
      "serverCardSubtitle": "Projection {projection} · intervalle {interval}",
      "networkCardTitle": "Réseau",
      "networkCardSubtitle": "Upload agents → API · {projection}",
      "storageSectionTitle": "Stockage métriques en base",
      "storageSectionHint": "Occupation réelle de la table d'agrégats journaliers et estimation à régime permanent.",
      "projectionSectionTitle": "Projection volumétrie globale",
      "projectionSectionHint": "Métriques historiques + inventaire JSONB par poste (rétention {retention}{currentMetrics}).",
      "currentMetrics": " · métriques actuelles : {size}",
      "colWorkstations": "Postes",
      "colMetricsEst": "Métriques (estim.)",
      "colInventoryEst": "Inventaire (estim.)",
      "colTotalEst": "Total estimé",
      "colMetricRows": "Lignes métriques",
      "projectionBadge": "Projection",
      "footnote": "~{rowsPerDay} lignes métriques/poste/jour avec les collecteurs actifs. L'intervalle d'échantillonnage ({sampleInterval} min) affine les min/max du jour sans multiplier les lignes stockées."
    },
    "tokenSettings": {
      "listTitle": "Tokens avec configuration dédiée",
      "listDescription": "Les tokens absents de cette liste utilisent les paramètres globaux. Les agents enrollés avec un token héritent de ses surcharges.",
      "colCompany": "Entreprise",
      "colToken": "Token",
      "colOverrides": "Surcharges",
      "colUpdated": "Modifié le",
      "emptyList": "Aucune configuration par token · tous utilisent les paramètres globaux.",
      "editorTitle": "Configuration par token",
      "editorDescription": "Surchargez uniquement les options nécessaires pour les agents enrollés avec ce token. Les autres restent héritées des paramètres globaux.",
      "tokenField": "Token d'enrôlement",
      "selectToken": "Sélectionner un token…",
      "untitledToken": "Sans libellé",
      "modeField": "Mode",
      "customConfig": "Configuration personnalisée",
      "useGlobal": "Utiliser les paramètres globaux",
      "badgeCustom": "Personnalisée",
      "badgeGlobal": "Paramètres globaux",
      "pickTokenHint": "Choisissez un token pour adapter heartbeat, seuil hors ligne, auto-update et collecteurs.",
      "resetToGlobal": "Réinitialiser aux paramètres globaux",
      "overrideHeartbeat": "Heartbeat",
      "overrideOffline": "Hors ligne",
      "overrideAutoUpdate": "Màj auto",
      "overrideCollectors": "{count} collecteur(s)",
      "overrideMetrics": "{count} métrique(s)"
    },
    "metricsStorage": {
      "title": "Historique métriques (stockage compact)",
      "hint": "Paramètres d'ingestion des séries temporelles RMM (disque, CPU, RAM, température, MAJ). Applicable au prochain heartbeat des agents concernés. Volumétrie et projections : onglet Consommations.",
      "fields": {
        "sampleIntervalMinutes": {
          "label": "Intervalle d'échantillonnage",
          "hint": "Délai minimum entre deux enregistrements (hors variation disque). N'influe pas sur le nombre de lignes · agrégation journalière."
        },
        "diskDeltaPct": {
          "label": "Seuil disque anticipé",
          "hint": "Variation du pire disque (points) déclenchant un enregistrement avant la fin de l'intervalle."
        },
        "retentionDays": {
          "label": "Rétention historique",
          "hint": "Durée de conservation des agrégats journaliers en base."
        }
      },
      "estimate": {
        "actualTitle": "Occupation réelle en base",
        "loadingVolume": "Chargement de la volumétrie…",
        "rows": "Lignes",
        "agentsWithHistory": "Postes avec historique",
        "table": "Table",
        "indexes": "Index",
        "coveredPeriod": "Période couverte",
        "steadyTitle": "Estimation à régime permanent",
        "projectionWorkstations": "Postes pour la projection",
        "projectionAgents": "Postes (projection)",
        "rowsPerAgentDay": "Lignes / poste / jour",
        "retention": "Rétention",
        "totalRowsEst": "Lignes totales estimées",
        "actualVsEst": "Réel vs estimation",
        "note": "Agrégation journalière : l'intervalle d'échantillonnage affine les min/max du jour sans multiplier les lignes. La rétention et les collecteurs actifs pilotent surtout la taille."
      }
    },
    "durationUnits": {
      "min": "Minutes",
      "hour": "Heures",
      "day": "Jours"
    },
    "cost": {
      "client": {
        "duration": {
          "label": "Durée (heartbeat light)",
          "note": "Pic court, process PowerShell éphémère"
        },
        "cpuPeak": {
          "label": "CPU (pic)",
          "note": "WMI + perf ; +1 s si compteur CPU"
        },
        "cpuAvg": {
          "label": "CPU (moyenne 24 h)",
          "note": "~{perDay} passages / jour"
        },
        "ram": {
          "label": "RAM",
          "note": "Le temps du processus PowerShell"
        },
        "networkUpload": {
          "label": "Réseau upload",
          "note": "Inventaire light compressé JSON"
        },
        "fullSync": {
          "label": "Sync complet",
          "note": "{count}× / semaine (estimation)"
        }
      },
      "server": {
        "sqlPerHb": {
          "label": "Requêtes SQL / heartbeat",
          "note": "Auth, settings, merge inventaire, logs"
        },
        "sqlPerDay": {
          "label": "Requêtes SQL / jour (parc)",
          "note": "{agents} poste(s) × {perDay} hb/j"
        },
        "cpuNode": {
          "label": "CPU Node.js / heartbeat",
          "note": "Merge JSONB = opération dominante"
        },
        "inventoryWrite": {
          "label": "Écriture inventaire",
          "note": "Mise à jour v_b_clients_m_ordinateurs.data"
        },
        "historicalMetrics": {
          "label": "Métriques historiques",
          "note": "Découplé du heartbeat (défaut 60 min)"
        },
        "avgLoad": {
          "label": "Charge moyenne",
          "note": "{note}"
        }
      },
      "network": {
        "perHb": {
          "label": "Par heartbeat (aller-retour)",
          "note": "{upload} Ko upload + {response} Ko réponse"
        },
        "perAgentDay": {
          "label": "Par poste / jour",
          "note": "{perDay} heartbeats × ~{kb} Ko"
        },
        "perAgentMonth": {
          "label": "Par poste / mois",
          "note": "Hors sync complets"
        },
        "fleetDay": {
          "label": "Parc / jour",
          "note": "{agents} poste(s)"
        },
        "fleetMonth": {
          "label": "Parc / mois",
          "note": "Estimation régime stable"
        },
        "fullSync": {
          "label": "Sync complet",
          "note": "Occasionnel (enrôlement, sync manuel)"
        }
      }
    },
    "tokenForm": {
      "eyebrow": "RMM · Enrôlement",
      "title": "Nouveau token d'enrôlement",
      "subtitle": "Générez un token pour installer l'agent Windows sur les postes d'une entreprise.",
      "sectionsAria": "Sections du token",
      "sections": {
        "enterprise": {
          "label": "Entreprise",
          "description": "Rattachement Veritas"
        },
        "details": {
          "label": "Détails",
          "description": "Libellé et usage"
        }
      },
      "enterpriseTitle": "Entreprise cible",
      "enterpriseDesc": "Les agents installés avec ce token seront rattachés à cette entreprise dans Veritas.",
      "companyLabel": "Entreprise",
      "selectCompany": "Sélectionner une entreprise",
      "detailsTitle": "Identification",
      "detailsDesc": "Ajoutez un libellé pour retrouver ce token dans la liste (déploiement GPO, site, etc.).",
      "labelOptional": "Libellé (optionnel)",
      "labelPlaceholder": "Ex. Déploiement site Paris",
      "oneTimeTitle": "Usage unique à la création",
      "oneTimeHint": "Le token complet n'est affiché qu'une seule fois après la création. Copiez-le immédiatement pour l'installer sur les postes.",
      "creating": "Création…",
      "create": "Créer le token"
    },
    "tokenCreated": {
      "eyebrow": "RMM · Enrôlement",
      "title": "Token généré",
      "subtitle": "Copiez-le maintenant : il ne sera plus affiché après fermeture de cette fenêtre.",
      "usageTitle": "Usage à l'installation",
      "usageHint": "Saisissez ce token dans l'installateur Windows ou la ligne de commande silencieuse.",
      "tokenAria": "Token d'enrôlement",
      "copyTitle": "Copier le token",
      "footerHint": "Conservez ce token en lieu sûr",
      "copy": "Copier le token"
    },
    "toast": {
      "loadError": "Impossible de charger le module RMM",
      "settingsSaved": "Paramètres RMM enregistrés",
      "saveError": "Erreur lors de l'enregistrement",
      "selectCompany": "Sélectionnez une entreprise",
      "tokenCreated": "Token d'enrôlement créé · copiez-le maintenant, il ne sera plus affiché",
      "tokenCreateError": "Erreur lors de la création du token",
      "tokenCopied": "Token copié",
      "tokenCopyError": "Impossible de copier le token",
      "tokenRevoked": "Token déplacé dans la corbeille",
      "tokenRevokeError": "Erreur lors de la révocation",
      "tokenRestored": "Token restauré",
      "tokenRestoreError": "Erreur lors de la restauration",
      "tokenDeleted": "Token supprimé définitivement",
      "tokenDeleteError": "Erreur lors de la suppression",
      "agentRevoked": "Agent révoqué",
      "agentRevokeError": "Erreur lors de la révocation de l'agent",
      "downloadStarted": "Téléchargement démarré",
      "downloadWithVersion": "Téléchargement : {filename} ({version})",
      "downloadError": "Impossible de télécharger l'agent",
      "tokenLoadError": "Impossible de charger la configuration du token",
      "selectToken": "Sélectionnez un token",
      "tokenResetGlobal": "Configuration du token réinitialisée aux valeurs globales",
      "tokenNeedOverride": "Activez au moins une option personnalisée",
      "tokenSaved": "Configuration du token enregistrée",
      "tokenReset": "Configuration réinitialisée",
      "tokenResetError": "Erreur lors de la réinitialisation"
    },
    "collectors": {
      "items": {
        "os": {
          "label": "Système d'exploitation",
          "description": "Version, build, édition Windows, installation et dernier démarrage."
        },
        "domain": {
          "label": "Domaine / workgroup",
          "description": "Appartenance au domaine Active Directory ou workgroup."
        },
        "network": {
          "label": "Réseau",
          "description": "Cartes actives, IP, MAC, passerelle et DNS."
        },
        "session": {
          "label": "Session utilisateur",
          "description": "Compte Windows actuellement connecté sur le poste."
        },
        "updates": {
          "label": "Correctifs Windows",
          "description": "Hotfixes récents, MAJ/pilotes en attente et redémarrage requis."
        },
        "license": {
          "label": "Licence Windows",
          "description": "Édition Windows activée sur le poste."
        },
        "chassis": {
          "label": "Marque, modèle & n° de série",
          "description": "Constructeur, modèle du poste et numéro de série BIOS."
        },
        "hardware": {
          "label": "Matériel",
          "description": "CPU, RAM, disques logiques/physiques et GPU."
        },
        "performance": {
          "label": "Performance",
          "description": "Charge CPU, RAM utilisée, uptime et processus actifs."
        },
        "sensors": {
          "label": "Capteurs",
          "description": "Températures WMI et batterie (portables)."
        },
        "security": {
          "label": "Sécurité locale",
          "description": "Defender, pare-feu et BitLocker."
        },
        "printers": {
          "label": "Imprimantes",
          "description": "Imprimantes installées, pilote, port et imprimante par défaut."
        },
        "shares": {
          "label": "Partages & lecteurs mappés",
          "description": "Lecteurs réseau mappés et partages locaux Windows."
        },
        "services": {
          "label": "Services critiques",
          "description": "État des services essentiels (spooler, Defender, RPC…)."
        },
        "peripherals": {
          "label": "Écrans & périphériques USB",
          "description": "Moniteurs connectés et périphériques USB/HID."
        },
        "software": {
          "label": "Logiciels installés",
          "description": "Programmes détectés via le registre (150 max.). Collecté uniquement lors d'une synchronisation complète."
        }
      },
      "groups": {
        "system": "Système & réseau",
        "hardware": "Matériel",
        "monitoring": "Supervision & sécurité",
        "sync": "Inventaire complet (sync)"
      },
      "title": "Collecteurs d'inventaire",
      "hint": "Heartbeat léger : système, perf, disques, MAJ. Les collecteurs « sync » ne s'exécutent que lors d'une synchronisation complète (manuelle ou à l'enrôlement).",
      "hintClient": "Passez un collecteur en « Surcharge » pour adapter son activation à ce token.",
      "proBanner": "Le choix des collecteurs (système, réseau, matériel, logiciels…) est réservé à Veritas Pro. Les valeurs par défaut restent appliquées.",
      "badges": {
        "syncOnly": "Sync uniquement",
        "heavy": "Plus lent",
        "override": "Surcharge",
        "global": "Global",
        "enabled": "activé",
        "disabled": "désactivé"
      }
    }
  },
  "en": {
    "common": {
      "loading": "Loading RMM module…",
      "loadingShort": "Loading…",
      "saving": "Saving…",
      "save": "Save",
      "close": "Close",
      "cancel": "Cancel",
      "edit": "Edit",
      "trash": "Trash",
      "restore": "Restore",
      "revoke": "Revoke",
      "enabled": "Enabled",
      "disabled": "Disabled",
      "available": "Available",
      "comingSoon": "Coming soon",
      "build": "Build",
      "workstationsSuffix": "workstations",
      "clientLabel": "Client #{id}",
      "downloading": "Downloading…",
      "deletePermanently": "Delete permanently",
      "learnMore": "Learn more",
      "noCompany": "No company",
      "noLabel": "No label",
      "indicator": "Metric",
      "value": "Value",
      "daysSuffix": "d",
      "minSuffix": "min",
      "durationUnitAria": "Duration unit",
      "durationUnitSuffix": " · unit",
      "costAgentsActive": "Spread across the day",
      "costNoAgents": "No agents"
    },
    "tabs": {
      "deploy": "Deployment",
      "settings": "Settings",
      "tokenSettings": "Per token",
      "tokens": "Enrollment tokens",
      "agents": "Agents",
      "consumptions": "Usage"
    },
    "deploy": {
      "cardTitle": "Download endpoint agent",
      "cardDescription": "Install the agent on endpoints to automatically report inventory to Veritas (Computers family).",
      "platforms": {
        "windows": {
          "title": "Windows",
          "hint": "Native Windows agent · system inventory and company binding."
        },
        "macos": {
          "title": "macOS",
          "hint": "Native macOS agent · system inventory and company binding."
        },
        "linux": {
          "title": "Linux",
          "hint": "Native Linux agent · server and workstation distributions."
        },
        "ios": {
          "title": "iOS / iPadOS",
          "hint": "Management of corporate iPhones and iPads."
        },
        "android": {
          "title": "Android",
          "hint": "Agent for Android smartphones and tablets."
        },
        "chromeos": {
          "title": "ChromeOS",
          "hint": "Chromebooks and Google Workspace environments."
        }
      },
      "windows": {
        "title": "Windows installation",
        "downloadMsi": "Download MSI",
        "argsIntro": "MSI properties for silent install (GPO / Intune / scripts):",
        "colProperty": "Property",
        "colDescription": "Description",
        "colExample": "Example",
        "propApiUrl": "Veritas API URL (host + port, /api path).",
        "propToken": "Enrollment token (Tokens tab).",
        "propFamily": "Equipment type: ordinateurs or serveurs.",
        "silentLabel": "Silent install",
        "silentCmd": "msiexec /i VeritasAgent-Windows-Setup.msi APIURL=\"http://host:3001/api\" TOKEN=\"<token>\" FAMILY=\"ordinateurs\" /qn /L*v %TEMP%\\VeritasAgent-install.log",
        "uninstallLabel": "Silent uninstall",
        "uninstallCmd": "msiexec /x VeritasAgent-Windows-Setup.msi /qn",
        "interactiveHint": "Without TOKEN: GUI wizard after install. To relaunch: Start menu → Veritas → Configurer Veritas Agent, or: \"C:\\Program Files\\Veritas\\Agent\\VeritasAgent.exe\" --configure. Re-run installed MSI: Repair / Uninstall. Newer version: upgrade."
      },
      "soon": {
        "title": "Install on {platform}",
        "defaultPlatform": "This platform",
        "message": "The Veritas agent for {platform} is under development. No installation procedure is available yet · you will be notified when it is released."
      }
    },
    "settings": {
      "globalTitle": "Global agent configuration",
      "globalDescription": "Default values for all companies. Per-token overrides are available in the Per token tab.",
      "communicationTitle": "Agent communication",
      "heartbeatLabel": "Heartbeat interval",
      "heartbeatHint": "How often agents report in.",
      "offlineLabel": "Offline threshold",
      "offlineHint": "Inactivity delay before offline status.",
      "autoUpdateLabel": "Automatic updates",
      "autoUpdateHint": "The agent downloads and installs the server MSI when a newer version is available.",
      "applyHint": "On save, a full sync is requested for affected agents: heartbeat, collectors and auto-update apply on the next heartbeat.",
      "customValueHint": "Custom value for this company.",
      "inheritGlobal": "Inherits global ({value}).",
      "inheritGlobalEnabled": "Inherits global ({label})",
      "inheritGlobalMetric": "Inherits global ({value} {suffix})",
      "customValueTitle": "Custom value for this company"
    },
    "tokens": {
      "title": "Enrollment tokens by company",
      "description": "Each token binds installed agents to a Veritas company.",
      "newToken": "New token",
      "viewAria": "Token view",
      "viewActive": "Active",
      "viewTrash": "Trash",
      "colCompany": "Company",
      "colToken": "Token",
      "colLabel": "Label",
      "colUses": "Uses",
      "colExpires": "Expires",
      "colCreated": "Created",
      "colRevoked": "Revoked on",
      "emptyActive": "No active tokens",
      "emptyTrash": "Trash is empty"
    },
    "agents": {
      "title": "Deployed agents",
      "description": "Windows endpoints enrolled via the Veritas agent. Scope shows whether settings come from global or a token override.",
      "searchPlaceholder": "Search endpoint, company, version…",
      "searchAria": "Search agents",
      "searchClear": "Clear search",
      "colCompany": "Company",
      "colHostname": "Endpoint",
      "colVersion": "Version",
      "colSettingsScope": "Scope",
      "colHeartbeat": "Heartbeat",
      "colAutoUpdate": "Auto-update",
      "scopeGlobal": "Global",
      "scopeToken": "Token",
      "colStatus": "Status",
      "colLastSeen": "Last activity",
      "statusOnline": "Online",
      "statusOffline": "Offline",
      "empty": "No agents registered",
      "emptySearch": "No agents match your search"
    },
    "consumptions": {
      "cardTitle": "RMM usage",
      "cardDescription": "Estimated endpoint, server, network and storage impact.",
      "intro": "Indicative estimates based on global settings (heartbeat {interval}, metrics retention {retention}). Deployed fleet: {agentCount} {agentLabel}. Change settings in the {settingsTab} tab.",
      "agentSingular": "agent",
      "agentPlural": "agents",
      "settingsTab": "Settings",
      "projectionLabel": "Workstations for projections",
      "heartbeatSectionTitle": "Heartbeat impact (steady state)",
      "heartbeatSectionHint": "Light heartbeat · occasional full sync.",
      "clientCardTitle": "Agent endpoint",
      "clientCardSubtitle": "Every {interval} · typical Windows values",
      "serverCardTitle": "Veritas server",
      "serverCardSubtitle": "Projection {projection} · interval {interval}",
      "networkCardTitle": "Network",
      "networkCardSubtitle": "Agent upload → API · {projection}",
      "storageSectionTitle": "Metrics database storage",
      "storageSectionHint": "Actual daily aggregate table usage and steady-state estimate.",
      "projectionSectionTitle": "Global volume projection",
      "projectionSectionHint": "Historical metrics + JSONB inventory per endpoint (retention {retention}{currentMetrics}).",
      "currentMetrics": " · current metrics: {size}",
      "colWorkstations": "Endpoints",
      "colMetricsEst": "Metrics (est.)",
      "colInventoryEst": "Inventory (est.)",
      "colTotalEst": "Total est.",
      "colMetricRows": "Metric rows",
      "projectionBadge": "Projection",
      "footnote": "~{rowsPerDay} metric rows/endpoint/day with active collectors. Sampling interval ({sampleInterval} min) refines daily min/max without multiplying stored rows."
    },
    "tokenSettings": {
      "listTitle": "Tokens with dedicated configuration",
      "listDescription": "Tokens missing from this list use global settings. Agents enrolled with a token inherit its overrides.",
      "colCompany": "Company",
      "colToken": "Token",
      "colOverrides": "Overrides",
      "colUpdated": "Updated",
      "emptyList": "No per-token configuration · all use global settings.",
      "editorTitle": "Per-token configuration",
      "editorDescription": "Override only the options needed for agents enrolled with this token. Everything else inherits global settings.",
      "tokenField": "Enrollment token",
      "selectToken": "Select a token…",
      "untitledToken": "Untitled",
      "modeField": "Mode",
      "customConfig": "Custom configuration",
      "useGlobal": "Use global settings",
      "badgeCustom": "Custom",
      "badgeGlobal": "Global settings",
      "pickTokenHint": "Pick a token to adjust heartbeat, offline threshold, auto-update and collectors.",
      "resetToGlobal": "Reset to global settings",
      "overrideHeartbeat": "Heartbeat",
      "overrideOffline": "Offline",
      "overrideAutoUpdate": "Auto-update",
      "overrideCollectors": "{count} collector(s)",
      "overrideMetrics": "{count} metric(s)"
    },
    "metricsStorage": {
      "title": "Metrics history (compact storage)",
      "hint": "RMM time-series ingestion settings (disk, CPU, RAM, temperature, updates). Applies on the next heartbeat for affected agents. Volume and projections: Usage tab.",
      "fields": {
        "sampleIntervalMinutes": {
          "label": "Sampling interval",
          "hint": "Minimum delay between two records (except disk change). Does not affect row count · daily aggregation."
        },
        "diskDeltaPct": {
          "label": "Disk change threshold",
          "hint": "Worst-disk variation (points) triggering a record before interval ends."
        },
        "retentionDays": {
          "label": "History retention",
          "hint": "How long daily aggregates are kept in the database."
        }
      },
      "estimate": {
        "actualTitle": "Actual database usage",
        "loadingVolume": "Loading volume data…",
        "rows": "Rows",
        "agentsWithHistory": "Endpoints with history",
        "table": "Table",
        "indexes": "Indexes",
        "coveredPeriod": "Covered period",
        "steadyTitle": "Steady-state estimate",
        "projectionWorkstations": "Workstations for projection",
        "projectionAgents": "Endpoints (projection)",
        "rowsPerAgentDay": "Rows / endpoint / day",
        "retention": "Retention",
        "totalRowsEst": "Estimated total rows",
        "actualVsEst": "Actual vs estimate",
        "note": "Daily aggregation: sampling interval refines daily min/max without multiplying rows. Retention and active collectors mainly drive size."
      }
    },
    "durationUnits": {
      "min": "Minutes",
      "hour": "Hours",
      "day": "Days"
    },
    "cost": {
      "client": {
        "duration": {
          "label": "Duration (light heartbeat)",
          "note": "Short spike, ephemeral PowerShell process"
        },
        "cpuPeak": {
          "label": "CPU (peak)",
          "note": "WMI + perf; +1 s if CPU counter"
        },
        "cpuAvg": {
          "label": "CPU (24 h avg)",
          "note": "~{perDay} runs / day"
        },
        "ram": {
          "label": "RAM",
          "note": "While PowerShell process runs"
        },
        "networkUpload": {
          "label": "Network upload",
          "note": "Compressed light inventory JSON"
        },
        "fullSync": {
          "label": "Full sync",
          "note": "{count}× / week (estimate)"
        }
      },
      "server": {
        "sqlPerHb": {
          "label": "SQL queries / heartbeat",
          "note": "Auth, settings, inventory merge, logs"
        },
        "sqlPerDay": {
          "label": "SQL queries / day (fleet)",
          "note": "{agents} endpoint(s) × {perDay} hb/day"
        },
        "cpuNode": {
          "label": "Node.js CPU / heartbeat",
          "note": "JSONB merge is dominant operation"
        },
        "inventoryWrite": {
          "label": "Inventory write",
          "note": "Updates v_b_clients_m_ordinateurs.data"
        },
        "historicalMetrics": {
          "label": "Historical metrics",
          "note": "Decoupled from heartbeat (default 60 min)"
        },
        "avgLoad": {
          "label": "Average load",
          "note": "{note}"
        }
      },
      "network": {
        "perHb": {
          "label": "Per heartbeat (round trip)",
          "note": "{upload} KB upload + {response} KB response"
        },
        "perAgentDay": {
          "label": "Per endpoint / day",
          "note": "{perDay} heartbeats × ~{kb} KB"
        },
        "perAgentMonth": {
          "label": "Per endpoint / month",
          "note": "Excluding full syncs"
        },
        "fleetDay": {
          "label": "Fleet / day",
          "note": "{agents} endpoint(s)"
        },
        "fleetMonth": {
          "label": "Fleet / month",
          "note": "Steady-state estimate"
        },
        "fullSync": {
          "label": "Full sync",
          "note": "Occasional (enrollment, manual sync)"
        }
      }
    },
    "tokenForm": {
      "eyebrow": "RMM · Enrollment",
      "title": "New enrollment token",
      "subtitle": "Generate a token to install the Windows agent on a company's endpoints.",
      "sectionsAria": "Token sections",
      "sections": {
        "enterprise": {
          "label": "Company",
          "description": "Veritas binding"
        },
        "details": {
          "label": "Details",
          "description": "Label and usage"
        }
      },
      "enterpriseTitle": "Target company",
      "enterpriseDesc": "Agents installed with this token will be bound to this company in Veritas.",
      "companyLabel": "Company",
      "selectCompany": "Select a company",
      "detailsTitle": "Identification",
      "detailsDesc": "Add a label to find this token in the list (GPO deployment, site, etc.).",
      "labelOptional": "Label (optional)",
      "labelPlaceholder": "E.g. Paris site deployment",
      "oneTimeTitle": "One-time display at creation",
      "oneTimeHint": "The full token is shown only once after creation. Copy it immediately to install on endpoints.",
      "creating": "Creating…",
      "create": "Create token"
    },
    "tokenCreated": {
      "eyebrow": "RMM · Enrollment",
      "title": "Token generated",
      "subtitle": "Copy it now: it will not be shown again after closing this window.",
      "usageTitle": "Use at installation",
      "usageHint": "Enter this token in the Windows installer or silent command line.",
      "tokenAria": "Enrollment token",
      "copyTitle": "Copy token",
      "footerHint": "Store this token securely",
      "copy": "Copy token"
    },
    "toast": {
      "loadError": "Unable to load RMM module",
      "settingsSaved": "RMM settings saved",
      "saveError": "Error while saving",
      "selectCompany": "Select a company",
      "tokenCreated": "Enrollment token created · copy it now, it will not be shown again",
      "tokenCreateError": "Error creating token",
      "tokenCopied": "Token copied",
      "tokenCopyError": "Unable to copy token",
      "tokenRevoked": "Token moved to trash",
      "tokenRevokeError": "Error revoking token",
      "tokenRestored": "Token restored",
      "tokenRestoreError": "Error restoring token",
      "tokenDeleted": "Token permanently deleted",
      "tokenDeleteError": "Error deleting token",
      "agentRevoked": "Agent revoked",
      "agentRevokeError": "Error revoking agent",
      "downloadStarted": "Download started",
      "downloadWithVersion": "Download: {filename} ({version})",
      "downloadError": "Unable to download agent",
      "tokenLoadError": "Unable to load token configuration",
      "selectToken": "Select a token",
      "tokenResetGlobal": "Token configuration reset to global values",
      "tokenNeedOverride": "Enable at least one custom option",
      "tokenSaved": "Token configuration saved",
      "tokenReset": "Configuration reset",
      "tokenResetError": "Error resetting configuration"
    },
    "collectors": {
      "items": {
        "os": {
          "label": "Operating system",
          "description": "Version, build, Windows edition, installation date and last boot."
        },
        "domain": {
          "label": "Domain / workgroup",
          "description": "Active Directory domain membership or workgroup."
        },
        "network": {
          "label": "Network",
          "description": "Active adapters, IP, MAC, gateway and DNS."
        },
        "session": {
          "label": "User session",
          "description": "Windows account currently logged in on the endpoint."
        },
        "updates": {
          "label": "Windows updates",
          "description": "Recent hotfixes, pending updates/drivers and reboot required."
        },
        "license": {
          "label": "Windows license",
          "description": "Windows edition activated on the endpoint."
        },
        "chassis": {
          "label": "Brand, model & serial number",
          "description": "Manufacturer, model and BIOS serial number."
        },
        "hardware": {
          "label": "Hardware",
          "description": "CPU, RAM, logical/physical disks and GPU."
        },
        "performance": {
          "label": "Performance",
          "description": "CPU load, RAM usage, uptime and active processes."
        },
        "sensors": {
          "label": "Sensors",
          "description": "WMI temperatures and battery (laptops)."
        },
        "security": {
          "label": "Local security",
          "description": "Defender, firewall and BitLocker."
        },
        "printers": {
          "label": "Printers",
          "description": "Installed printers, driver, port and default printer."
        },
        "shares": {
          "label": "Shares & mapped drives",
          "description": "Mapped network drives and local Windows shares."
        },
        "services": {
          "label": "Critical services",
          "description": "Status of essential services (spooler, Defender, RPC…)."
        },
        "peripherals": {
          "label": "Displays & USB devices",
          "description": "Connected monitors and USB/HID devices."
        },
        "software": {
          "label": "Installed software",
          "description": "Programs detected via registry (150 max). Collected only during a full sync."
        }
      },
      "groups": {
        "system": "System & network",
        "hardware": "Hardware",
        "monitoring": "Monitoring & security",
        "sync": "Full inventory (sync)"
      },
      "title": "Inventory collectors",
      "hint": "Light heartbeat: system, perf, disks, updates. Sync collectors run only during a full sync (manual or at enrollment).",
      "hintClient": "Set a collector to Override to customize activation for this token.",
      "proBanner": "Choosing collectors (system, network, hardware, software…) requires Veritas Pro. Default values remain applied.",
      "badges": {
        "syncOnly": "Sync only",
        "heavy": "Slower",
        "override": "Override",
        "global": "Global",
        "enabled": "enabled",
        "disabled": "disabled"
      }
    }
  },
  "de": {
    "common": {
      "loading": "RMM-Modul wird geladen…",
      "loadingShort": "Laden…",
      "saving": "Speichern…",
      "save": "Speichern",
      "close": "Schließen",
      "cancel": "Abbrechen",
      "edit": "Bearbeiten",
      "trash": "Papierkorb",
      "restore": "Wiederherstellen",
      "revoke": "Widerrufen",
      "enabled": "Aktiviert",
      "disabled": "Deaktiviert",
      "available": "Verfügbar",
      "comingSoon": "Demnächst",
      "build": "Build",
      "workstationsSuffix": "Arbeitsplätze",
      "clientLabel": "Kunde #{id}",
      "downloading": "Download…",
      "deletePermanently": "Endgültig löschen",
      "learnMore": "Mehr erfahren",
      "noCompany": "Kein Unternehmen",
      "noLabel": "Ohne Bezeichnung",
      "indicator": "Kennzahl",
      "value": "Wert",
      "daysSuffix": "T",
      "minSuffix": "Min",
      "durationUnitAria": "Zeiteinheit",
      "durationUnitSuffix": " · Einheit",
      "costAgentsActive": "Über den Tag verteilt",
      "costNoAgents": "Keine Agenten"
    },
    "tabs": {
      "deploy": "Bereitstellung",
      "settings": "Einstellungen",
      "tokenSettings": "Pro Token",
      "tokens": "Registrierungstoken",
      "agents": "Agenten",
      "consumptions": "Verbrauch"
    },
    "deploy": {
      "cardTitle": "Endpoint-Agent herunterladen",
      "cardDescription": "Installieren Sie den Agenten auf Endgeräten, um das Inventar automatisch an Veritas zu melden (Gerätefamilie Computer).",
      "platforms": {
        "windows": {
          "title": "Windows",
          "hint": "Nativer Windows-Agent · Systeminventar und Unternehmenszuordnung."
        },
        "macos": {
          "title": "macOS",
          "hint": "Nativer macOS-Agent · Systeminventar und Unternehmenszuordnung."
        },
        "linux": {
          "title": "Linux",
          "hint": "Nativer Linux-Agent · Server- und Arbeitsplatz-Distributionen."
        },
        "ios": {
          "title": "iOS / iPadOS",
          "hint": "Verwaltung von Firmen-iPhones und iPads."
        },
        "android": {
          "title": "Android",
          "hint": "Agent für Android-Smartphones und -Tablets."
        },
        "chromeos": {
          "title": "ChromeOS",
          "hint": "Chromebooks und Google-Workspace-Umgebungen."
        }
      },
      "windows": {
        "title": "Windows-Installation",
        "downloadMsi": "MSI herunterladen",
        "argsIntro": "MSI-Eigenschaften für die stille Installation (GPO / Intune / Skripte):",
        "colProperty": "Eigenschaft",
        "colDescription": "Beschreibung",
        "colExample": "Beispiel",
        "propApiUrl": "Veritas-API-URL (Host + Port, Pfad /api).",
        "propToken": "Registrierungstoken (Tab Token).",
        "propFamily": "Gerätetyp: ordinateurs oder serveurs.",
        "silentLabel": "Stille Installation",
        "silentCmd": "msiexec /i VeritasAgent-Windows-Setup.msi APIURL=\"http://host:3001/api\" TOKEN=\"<token>\" FAMILY=\"ordinateurs\" /qn /L*v %TEMP%\\VeritasAgent-install.log",
        "uninstallLabel": "Stille Deinstallation",
        "uninstallCmd": "msiexec /x VeritasAgent-Windows-Setup.msi /qn",
        "interactiveHint": "Ohne TOKEN: grafischer Assistent. MSI erneut starten: Reparieren / Deinstallieren. Neuere Version: Upgrade."
      },
      "soon": {
        "title": "Installation {platform}",
        "defaultPlatform": "Diese Plattform",
        "message": "Der Veritas-Agent für {platform} ist in Entwicklung. Noch keine Installationsanleitung verfügbar · Sie werden bei Veröffentlichung benachrichtigt."
      }
    },
    "settings": {
      "globalTitle": "Globale Agentenkonfiguration",
      "globalDescription": "Standardwerte für alle Unternehmen. Überschreibungen pro Token im Tab Pro Token möglich.",
      "communicationTitle": "Agentenkommunikation",
      "heartbeatLabel": "Heartbeat-Intervall",
      "heartbeatHint": "Häufigkeit der Agenten-Meldungen.",
      "offlineLabel": "Offline-Schwelle",
      "offlineHint": "Inaktivitätsdauer vor Offline-Status.",
      "autoUpdateLabel": "Automatische Updates",
      "autoUpdateHint": "Der Agent lädt das Server-MSI herunter und installiert es, wenn eine neuere Version verfügbar ist.",
      "applyHint": "Beim Speichern wird ein voller Sync für betroffene Agenten angefordert.",
      "customValueHint": "Individueller Wert für dieses Unternehmen.",
      "inheritGlobal": "Erbt global ({value}).",
      "inheritGlobalEnabled": "Erbt global ({label})",
      "inheritGlobalMetric": "Erbt global ({value} {suffix})",
      "customValueTitle": "Individueller Wert für dieses Unternehmen"
    },
    "tokens": {
      "title": "Registrierungstoken pro Unternehmen",
      "description": "Jedes Token ordnet installierte Agenten einem Veritas-Unternehmen zu.",
      "newToken": "Neues Token",
      "viewAria": "Token-Ansicht",
      "viewActive": "Aktiv",
      "viewTrash": "Papierkorb",
      "colCompany": "Unternehmen",
      "colToken": "Token",
      "colLabel": "Bezeichnung",
      "colUses": "Nutzungen",
      "colExpires": "Ablauf",
      "colCreated": "Erstellt",
      "colRevoked": "Widerrufen am",
      "emptyActive": "Keine aktiven Token",
      "emptyTrash": "Papierkorb ist leer"
    },
    "agents": {
      "title": "Bereitgestellte Agenten",
      "description": "Windows-Endgeräte per Veritas-Agent registriert. Der Geltungsbereich zeigt globale oder Token-Overrides.",
      "searchPlaceholder": "Arbeitsplatz, Unternehmen, Version suchen…",
      "searchAria": "Agenten suchen",
      "searchClear": "Suche löschen",
      "colCompany": "Unternehmen",
      "colHostname": "Arbeitsplatz",
      "colVersion": "Version",
      "colSettingsScope": "Geltungsbereich",
      "colHeartbeat": "Heartbeat",
      "colAutoUpdate": "Auto-Update",
      "scopeGlobal": "Global",
      "scopeToken": "Token",
      "colStatus": "Status",
      "colLastSeen": "Letzte Aktivität",
      "statusOnline": "Online",
      "statusOffline": "Offline",
      "empty": "Keine Agenten registriert",
      "emptySearch": "Keine Agenten entsprechen Ihrer Suche"
    },
    "consumptions": {
      "cardTitle": "RMM-Verbrauch",
      "cardDescription": "Geschätzte Auswirkungen auf Endgerät, Server, Netzwerk und Speicher.",
      "intro": "Indikative Schätzungen basierend auf globalen Einstellungen (Heartbeat {interval}, Metrik-Aufbewahrung {retention}). Bereitgestellter Bestand: {agentCount} {agentLabel}. Einstellungen im Tab {settingsTab}.",
      "agentSingular": "Agent",
      "agentPlural": "Agenten",
      "settingsTab": "Einstellungen",
      "projectionLabel": "Arbeitsplätze für Projektionen",
      "heartbeatSectionTitle": "Heartbeat-Auswirkung (Dauerbetrieb)",
      "heartbeatSectionHint": "Leichter Heartbeat · gelegentliche vollständige Synchronisation.",
      "clientCardTitle": "Agent-Endgerät",
      "clientCardSubtitle": "Alle {interval} · typische Windows-Werte",
      "serverCardTitle": "Veritas-Server",
      "serverCardSubtitle": "Projektion {projection} · Intervall {interval}",
      "networkCardTitle": "Netzwerk",
      "networkCardSubtitle": "Agent-Upload → API · {projection}",
      "storageSectionTitle": "Metrik-Speicher in der Datenbank",
      "storageSectionHint": "Tatsächliche Belegung der Tagesaggregat-Tabelle und Schätzung im Dauerbetrieb.",
      "projectionSectionTitle": "Globale Volumenprojektion",
      "projectionSectionHint": "Historische Metriken + JSONB-Inventar pro Arbeitsplatz (Aufbewahrung {retention}{currentMetrics}).",
      "currentMetrics": " · aktuelle Metriken: {size}",
      "colWorkstations": "Arbeitsplätze",
      "colMetricsEst": "Metriken (gesch.)",
      "colInventoryEst": "Inventar (gesch.)",
      "colTotalEst": "Gesch. gesamt",
      "colMetricRows": "Metrik-Zeilen",
      "projectionBadge": "Projektion",
      "footnote": "~{rowsPerDay} Metrik-Zeilen/Arbeitsplatz/Tag mit aktiven Collectoren. Abtastintervall ({sampleInterval} Min.) verfeinert Tages-Min/Max ohne mehr Zeilen zu speichern."
    },
    "tokenSettings": {
      "listTitle": "Tokens mit eigener Konfiguration",
      "listDescription": "Tokens außerhalb dieser Liste nutzen globale Einstellungen. Mit einem Token registrierte Agenten erben dessen Overrides.",
      "colCompany": "Unternehmen",
      "colToken": "Token",
      "colOverrides": "Overrides",
      "colUpdated": "Geändert",
      "emptyList": "Keine Token-Konfiguration · alle nutzen globale Einstellungen.",
      "editorTitle": "Konfiguration pro Token",
      "editorDescription": "Überschreiben Sie nur die nötigen Optionen für Agenten dieses Tokens. Alles andere erbt globale Werte.",
      "tokenField": "Registrierungstoken",
      "selectToken": "Token auswählen…",
      "untitledToken": "Ohne Bezeichnung",
      "modeField": "Modus",
      "customConfig": "Individuelle Konfiguration",
      "useGlobal": "Globale Einstellungen verwenden",
      "badgeCustom": "Individuell",
      "badgeGlobal": "Globale Einstellungen",
      "pickTokenHint": "Wählen Sie ein Token für Heartbeat, Offline-Schwelle, Auto-Update und Sammler.",
      "resetToGlobal": "Auf globale Einstellungen zurücksetzen",
      "overrideHeartbeat": "Heartbeat",
      "overrideOffline": "Offline",
      "overrideAutoUpdate": "Auto-Update",
      "overrideCollectors": "{count} Collector",
      "overrideMetrics": "{count} Metrik(en)"
    },
    "metricsStorage": {
      "title": "Metrik-Verlauf (kompakte Speicherung)",
      "hint": "Einstellungen zur RMM-Zeitreihen-Erfassung (Festplatte, CPU, RAM, Temperatur, Updates). Gilt ab dem nächsten Heartbeat. Volumen und Projektionen: Tab Verbrauch.",
      "fields": {
        "sampleIntervalMinutes": {
          "label": "Abtastintervall",
          "hint": "Mindestabstand zwischen zwei Einträgen (außer Festplattenänderung). Beeinflusst nicht die Zeilenanzahl · Tagesaggregation."
        },
        "diskDeltaPct": {
          "label": "Festplatten-Schwellwert",
          "hint": "Variation der schlechtesten Festplatte (Punkte), die einen Eintrag vor Intervallende auslöst."
        },
        "retentionDays": {
          "label": "Verlaufs-Aufbewahrung",
          "hint": "Aufbewahrungsdauer der Tagesaggregate in der Datenbank."
        }
      },
      "estimate": {
        "actualTitle": "Tatsächliche DB-Belegung",
        "loadingVolume": "Volumetrie wird geladen…",
        "rows": "Zeilen",
        "agentsWithHistory": "Arbeitsplätze mit Verlauf",
        "table": "Tabelle",
        "indexes": "Indizes",
        "coveredPeriod": "Abgedeckter Zeitraum",
        "steadyTitle": "Schätzung im Dauerbetrieb",
        "projectionWorkstations": "Arbeitsplätze für Projektion",
        "projectionAgents": "Arbeitsplätze (Projektion)",
        "rowsPerAgentDay": "Zeilen / Arbeitsplatz / Tag",
        "retention": "Aufbewahrung",
        "totalRowsEst": "Geschätzte Gesamtzeilen",
        "actualVsEst": "Ist vs. Schätzung",
        "note": "Tagesaggregation: Abtastintervall verfeinert Tages-Min/Max ohne Zeilen zu vervielfachen. Aufbewahrung und aktive Collectoren bestimmen vor allem die Größe."
      }
    },
    "durationUnits": {
      "min": "Minuten",
      "hour": "Stunden",
      "day": "Tage"
    },
    "cost": {
      "client": {
        "duration": {
          "label": "Dauer (leichter Heartbeat)",
          "note": "Kurzer Peak, kurzlebiger PowerShell-Prozess"
        },
        "cpuPeak": {
          "label": "CPU (Peak)",
          "note": "WMI + Leistung; +1 s bei CPU-Zähler"
        },
        "cpuAvg": {
          "label": "CPU (24 h Ø)",
          "note": "~{perDay} Durchläufe / Tag"
        },
        "ram": {
          "label": "RAM",
          "note": "Während des PowerShell-Prozesses"
        },
        "networkUpload": {
          "label": "Netzwerk-Upload",
          "note": "Komprimiertes leichtes Inventar-JSON"
        },
        "fullSync": {
          "label": "Vollsync",
          "note": "{count}× / Woche (Schätzung)"
        }
      },
      "server": {
        "sqlPerHb": {
          "label": "SQL-Abfragen / Heartbeat",
          "note": "Auth, Einstellungen, Inventar-Merge, Logs"
        },
        "sqlPerDay": {
          "label": "SQL-Abfragen / Tag (Bestand)",
          "note": "{agents} Arbeitsplatz/Plätze × {perDay} hb/Tag"
        },
        "cpuNode": {
          "label": "Node.js-CPU / Heartbeat",
          "note": "JSONB-Merge ist dominante Operation"
        },
        "inventoryWrite": {
          "label": "Inventar-Schreibvorgang",
          "note": "Aktualisiert v_b_clients_m_ordinateurs.data"
        },
        "historicalMetrics": {
          "label": "Historische Metriken",
          "note": "Entkoppelt vom Heartbeat (Standard 60 Min.)"
        },
        "avgLoad": {
          "label": "Durchschnittliche Last",
          "note": "{note}"
        }
      },
      "network": {
        "perHb": {
          "label": "Pro Heartbeat (Hin und zurück)",
          "note": "{upload} KB Upload + {response} KB Antwort"
        },
        "perAgentDay": {
          "label": "Pro Arbeitsplatz / Tag",
          "note": "{perDay} Heartbeats × ~{kb} KB"
        },
        "perAgentMonth": {
          "label": "Pro Arbeitsplatz / Monat",
          "note": "Ohne Vollsyncs"
        },
        "fleetDay": {
          "label": "Bestand / Tag",
          "note": "{agents} Arbeitsplatz/Plätze"
        },
        "fleetMonth": {
          "label": "Bestand / Monat",
          "note": "Schätzung Dauerbetrieb"
        },
        "fullSync": {
          "label": "Vollsync",
          "note": "Gelegentlich (Registrierung, manueller Sync)"
        }
      }
    },
    "tokenForm": {
      "eyebrow": "RMM · Registrierung",
      "title": "Neues Registrierungstoken",
      "subtitle": "Token generieren, um den Windows-Agenten auf Unternehmens-Arbeitsplätzen zu installieren.",
      "sectionsAria": "Token-Bereiche",
      "sections": {
        "enterprise": {
          "label": "Unternehmen",
          "description": "Veritas-Zuordnung"
        },
        "details": {
          "label": "Details",
          "description": "Bezeichnung und Nutzung"
        }
      },
      "enterpriseTitle": "Zielunternehmen",
      "enterpriseDesc": "Mit diesem Token installierte Agenten werden diesem Unternehmen in Veritas zugeordnet.",
      "companyLabel": "Unternehmen",
      "selectCompany": "Unternehmen auswählen",
      "detailsTitle": "Identifikation",
      "detailsDesc": "Bezeichnung hinzufügen, um dieses Token in der Liste wiederzufinden (GPO, Standort usw.).",
      "labelOptional": "Bezeichnung (optional)",
      "labelPlaceholder": "z. B. Bereitstellung Standort Paris",
      "oneTimeTitle": "Einmalige Anzeige bei Erstellung",
      "oneTimeHint": "Das vollständige Token wird nur einmal nach der Erstellung angezeigt. Sofort kopieren für die Installation.",
      "creating": "Erstellung…",
      "create": "Token erstellen"
    },
    "tokenCreated": {
      "eyebrow": "RMM · Registrierung",
      "title": "Token erstellt",
      "subtitle": "Jetzt kopieren: nach Schließen dieses Fensters wird es nicht mehr angezeigt.",
      "usageTitle": "Verwendung bei Installation",
      "usageHint": "Token im Windows-Installer oder in der stillen Befehlszeile eingeben.",
      "tokenAria": "Registrierungstoken",
      "copyTitle": "Token kopieren",
      "footerHint": "Token sicher aufbewahren",
      "copy": "Token kopieren"
    },
    "toast": {
      "loadError": "RMM-Modul konnte nicht geladen werden",
      "settingsSaved": "RMM-Einstellungen gespeichert",
      "saveError": "Fehler beim Speichern",
      "selectCompany": "Unternehmen auswählen",
      "tokenCreated": "Registrierungstoken erstellt · jetzt kopieren, es wird nicht erneut angezeigt",
      "tokenCreateError": "Fehler beim Erstellen des Tokens",
      "tokenCopied": "Token kopiert",
      "tokenCopyError": "Token konnte nicht kopiert werden",
      "tokenRevoked": "Token in Papierkorb verschoben",
      "tokenRevokeError": "Fehler beim Widerruf",
      "tokenRestored": "Token wiederhergestellt",
      "tokenRestoreError": "Fehler bei Wiederherstellung",
      "tokenDeleted": "Token endgültig gelöscht",
      "tokenDeleteError": "Fehler beim Löschen",
      "agentRevoked": "Agent widerrufen",
      "agentRevokeError": "Fehler beim Widerruf des Agenten",
      "downloadStarted": "Download gestartet",
      "downloadWithVersion": "Download: {filename} ({version})",
      "downloadError": "Agent konnte nicht heruntergeladen werden",
      "tokenLoadError": "Token-Konfiguration konnte nicht geladen werden",
      "selectToken": "Token auswählen",
      "tokenResetGlobal": "Token-Konfiguration auf globale Werte zurückgesetzt",
      "tokenNeedOverride": "Mindestens eine individuelle Option aktivieren",
      "tokenSaved": "Token-Konfiguration gespeichert",
      "tokenReset": "Konfiguration zurückgesetzt",
      "tokenResetError": "Fehler beim Zurücksetzen"
    },
    "collectors": {
      "items": {
        "os": {
          "label": "Betriebssystem",
          "description": "Version, Build, Windows-Edition, Installation und letzter Neustart."
        },
        "domain": {
          "label": "Domäne / Arbeitsgruppe",
          "description": "Active-Directory-Domäne oder Arbeitsgruppe."
        },
        "network": {
          "label": "Netzwerk",
          "description": "Aktive Adapter, IP, MAC, Gateway und DNS."
        },
        "session": {
          "label": "Benutzersitzung",
          "description": "Aktuell angemeldetes Windows-Konto auf dem Endgerät."
        },
        "updates": {
          "label": "Windows-Updates",
          "description": "Aktuelle Hotfixes, ausstehende Updates/Treiber und Neustart erforderlich."
        },
        "license": {
          "label": "Windows-Lizenz",
          "description": "Auf dem Endgerät aktivierte Windows-Edition."
        },
        "chassis": {
          "label": "Marke, Modell & Seriennummer",
          "description": "Hersteller, Modell und BIOS-Seriennummer."
        },
        "hardware": {
          "label": "Hardware",
          "description": "CPU, RAM, logische/physische Laufwerke und GPU."
        },
        "performance": {
          "label": "Leistung",
          "description": "CPU-Auslastung, RAM-Nutzung, Uptime und aktive Prozesse."
        },
        "sensors": {
          "label": "Sensoren",
          "description": "WMI-Temperaturen und Akku (Notebooks)."
        },
        "security": {
          "label": "Lokale Sicherheit",
          "description": "Defender, Firewall und BitLocker."
        },
        "printers": {
          "label": "Drucker",
          "description": "Installierte Drucker, Treiber, Anschluss und Standarddrucker."
        },
        "shares": {
          "label": "Freigaben & gemappte Laufwerke",
          "description": "Gemappte Netzlaufwerke und lokale Windows-Freigaben."
        },
        "services": {
          "label": "Kritische Dienste",
          "description": "Status wesentlicher Dienste (Spooler, Defender, RPC…)."
        },
        "peripherals": {
          "label": "Bildschirme & USB-Geräte",
          "description": "Angeschlossene Monitore und USB/HID-Geräte."
        },
        "software": {
          "label": "Installierte Software",
          "description": "Über die Registry erkannte Programme (max. 150). Nur bei vollständiger Synchronisation."
        }
      },
      "groups": {
        "system": "System & Netzwerk",
        "hardware": "Hardware",
        "monitoring": "Überwachung & Sicherheit",
        "sync": "Vollinventar (Sync)"
      },
      "title": "Inventar-Collectoren",
      "hint": "Leichter Heartbeat: System, Leistung, Laufwerke, Updates. Sync-Collectoren laufen nur bei vollständiger Synchronisation.",
      "hintClient": "Collectoren auf Überschreibung setzen, um die Aktivierung für dieses Token anzupassen.",
      "proBanner": "Die Auswahl der Collectoren (System, Netzwerk, Hardware, Software…) erfordert Veritas Pro. Standardwerte bleiben aktiv.",
      "badges": {
        "syncOnly": "Nur Sync",
        "heavy": "Langsamer",
        "override": "Überschreibung",
        "global": "Global",
        "enabled": "aktiviert",
        "disabled": "deaktiviert"
      }
    }
  },
  "it": {
    "common": {
      "loading": "Caricamento modulo RMM…",
      "loadingShort": "Caricamento…",
      "saving": "Salvataggio…",
      "save": "Salva",
      "close": "Chiudi",
      "cancel": "Annulla",
      "edit": "Modifica",
      "trash": "Cestino",
      "restore": "Ripristina",
      "revoke": "Revoca",
      "enabled": "Attivato",
      "disabled": "Disattivato",
      "available": "Disponibile",
      "comingSoon": "Prossimamente",
      "build": "Build",
      "workstationsSuffix": "postazioni",
      "clientLabel": "Cliente #{id}",
      "downloading": "Download…",
      "deletePermanently": "Elimina definitivamente",
      "learnMore": "Scopri di più",
      "noCompany": "Nessuna azienda",
      "noLabel": "Senza etichetta",
      "indicator": "Indicatore",
      "value": "Valore",
      "daysSuffix": "g",
      "minSuffix": "min",
      "durationUnitAria": "Unità di durata",
      "durationUnitSuffix": " · unità",
      "costAgentsActive": "Distribuiti durante la giornata",
      "costNoAgents": "Nessun agente"
    },
    "tabs": {
      "deploy": "Distribuzione",
      "settings": "Impostazioni",
      "tokenSettings": "Per token",
      "tokens": "Token di registrazione",
      "agents": "Agenti",
      "consumptions": "Consumi"
    },
    "deploy": {
      "cardTitle": "Download endpoint agent",
      "cardDescription": "Install the agent on endpoints to automatically report inventory to Veritas (Computers family).",
      "platforms": {
        "windows": {
          "title": "Windows",
          "hint": "Agente nativo Windows · inventario di sistema e associazione azienda."
        },
        "macos": {
          "title": "macOS",
          "hint": "Agente nativo macOS · inventario di sistema e associazione azienda."
        },
        "linux": {
          "title": "Linux",
          "hint": "Agente nativo Linux · distribuzioni server e postazioni."
        },
        "ios": {
          "title": "iOS / iPadOS",
          "hint": "Gestione di iPhone e iPad aziendali."
        },
        "android": {
          "title": "Android",
          "hint": "Agente per smartphone e tablet Android."
        },
        "chromeos": {
          "title": "ChromeOS",
          "hint": "Chromebook e ambienti Google Workspace."
        }
      },
      "windows": {
        "title": "Installazione Windows",
        "downloadMsi": "Scarica MSI",
        "argsIntro": "Proprietà MSI per l'installazione silenziosa (GPO / Intune / script):",
        "colProperty": "Proprietà",
        "colDescription": "Descrizione",
        "colExample": "Esempio",
        "propApiUrl": "URL API Veritas (host + porta, percorso /api).",
        "propToken": "Token di registrazione (scheda Token).",
        "propFamily": "Tipo di attrezzatura: ordinateurs o serveurs.",
        "silentLabel": "Installazione silenziosa",
        "silentCmd": "msiexec /i VeritasAgent-Windows-Setup.msi APIURL=\"http://host:3001/api\" TOKEN=\"<token>\" FAMILY=\"ordinateurs\" /qn /L*v %TEMP%\\VeritasAgent-install.log",
        "uninstallLabel": "Disinstallazione silenziosa",
        "uninstallCmd": "msiexec /x VeritasAgent-Windows-Setup.msi /qn",
        "interactiveHint": "Senza TOKEN: procedura guidata. Rilanciare il MSI installato: Ripara / Disinstalla. Versione più recente: aggiornamento."
      },
      "soon": {
        "title": "Installazione {platform}",
        "defaultPlatform": "Questa piattaforma",
        "message": "L'agente Veritas per {platform} è in sviluppo. Nessuna procedura disponibile al momento · sarete avvisati al rilascio."
      }
    },
    "settings": {
      "globalTitle": "Global agent configuration",
      "globalDescription": "Valori predefiniti per tutte le aziende. Sostituzioni per token nella scheda Per token.",
      "communicationTitle": "Comunicazione agente",
      "heartbeatLabel": "Intervallo heartbeat",
      "heartbeatHint": "Frequenza di segnalazione degli agenti.",
      "offlineLabel": "Soglia offline",
      "offlineHint": "Ritardo di inattività prima dello stato offline.",
      "autoUpdateLabel": "Aggiornamento automatico",
      "autoUpdateHint": "L'agente scarica e installa il MSI del server quando e disponibile una versione piu recente.",
      "applyHint": "Al salvataggio viene richiesto un sync completo agli agenti interessati.",
      "customValueHint": "Valore personalizzato per questa azienda.",
      "inheritGlobal": "Eredita globale ({value}).",
      "inheritGlobalEnabled": "Eredita globale ({label})",
      "inheritGlobalMetric": "Eredita globale ({value} {suffix})",
      "customValueTitle": "Valore personalizzato per questa azienda"
    },
    "tokens": {
      "title": "Token di registrazione per azienda",
      "description": "Ogni token associa gli agenti installati a un'azienda Veritas.",
      "newToken": "Nuovo token",
      "viewAria": "Vista token",
      "viewActive": "Attivi",
      "viewTrash": "Cestino",
      "colCompany": "Azienda",
      "colToken": "Token",
      "colLabel": "Etichetta",
      "colUses": "Utilizzi",
      "colExpires": "Scadenza",
      "colCreated": "Creato il",
      "colRevoked": "Revocato il",
      "emptyActive": "Nessun token attivo",
      "emptyTrash": "Il cestino è vuoto"
    },
    "agents": {
      "title": "Agenti distribuiti",
      "description": "Postazioni Windows registrate tramite l'agente Veritas. L'ambito indica impostazioni globali o override per token.",
      "searchPlaceholder": "Cerca postazione, azienda, versione…",
      "searchAria": "Cerca agenti",
      "searchClear": "Cancella ricerca",
      "colCompany": "Azienda",
      "colHostname": "Postazione",
      "colVersion": "Versione",
      "colSettingsScope": "Ambito",
      "colHeartbeat": "Heartbeat",
      "colAutoUpdate": "Agg. auto",
      "scopeGlobal": "Globale",
      "scopeToken": "Token",
      "colStatus": "Stato",
      "colLastSeen": "Ultima attività",
      "statusOnline": "Online",
      "statusOffline": "Offline",
      "empty": "Nessun agente registrato",
      "emptySearch": "Nessun agente corrisponde alla ricerca"
    },
    "consumptions": {
      "cardTitle": "Consumi RMM",
      "cardDescription": "Stime di impatto su postazione, server, rete e storage.",
      "intro": "Stime indicative basate sulla configurazione globale (heartbeat {interval}, conservazione metriche {retention}). Parco distribuito: {agentCount} {agentLabel}. Modificare i parametri nella scheda {settingsTab}.",
      "agentSingular": "agente",
      "agentPlural": "agenti",
      "settingsTab": "Impostazioni",
      "projectionLabel": "Postazioni per le proiezioni",
      "heartbeatSectionTitle": "Impatto heartbeat (regime stabile)",
      "heartbeatSectionHint": "Heartbeat leggero · sincronizzazione completa occasionale.",
      "clientCardTitle": "Postazione agente",
      "clientCardSubtitle": "Ogni {interval} · valori tipici Windows",
      "serverCardTitle": "Server Veritas",
      "serverCardSubtitle": "Proiezione {projection} · intervallo {interval}",
      "networkCardTitle": "Rete",
      "networkCardSubtitle": "Upload agenti → API · {projection}",
      "storageSectionTitle": "Storage metriche in database",
      "storageSectionHint": "Occupazione reale della tabella di aggregati giornalieri e stima a regime.",
      "projectionSectionTitle": "Proiezione volumetria globale",
      "projectionSectionHint": "Metriche storiche + inventario JSONB per postazione (conservazione {retention}{currentMetrics}).",
      "currentMetrics": " · metriche attuali: {size}",
      "colWorkstations": "Postazioni",
      "colMetricsEst": "Metriche (stim.)",
      "colInventoryEst": "Inventario (stim.)",
      "colTotalEst": "Totale stim.",
      "colMetricRows": "Righe metriche",
      "projectionBadge": "Proiezione",
      "footnote": "~{rowsPerDay} righe metriche/postazione/giorno con i collector attivi. L'intervallo di campionamento ({sampleInterval} min) affina min/max giornalieri senza moltiplicare le righe."
    },
    "tokenSettings": {
      "listTitle": "Token con configurazione dedicata",
      "listDescription": "I token assenti da questo elenco usano le impostazioni globali. Gli agenti enrollati con un token ereditano le relative override.",
      "colCompany": "Azienda",
      "colToken": "Token",
      "colOverrides": "Override",
      "colUpdated": "Aggiornato",
      "emptyList": "Nessuna configurazione per token · tutti usano le impostazioni globali.",
      "editorTitle": "Configurazione per token",
      "editorDescription": "Sovrascrivi solo le opzioni necessarie per gli agenti enrollati con questo token. Il resto eredita le impostazioni globali.",
      "tokenField": "Token di registrazione",
      "selectToken": "Selezionare un token…",
      "untitledToken": "Senza etichetta",
      "modeField": "Modalità",
      "customConfig": "Configurazione personalizzata",
      "useGlobal": "Usa impostazioni globali",
      "badgeCustom": "Personalizzata",
      "badgeGlobal": "Impostazioni globali",
      "pickTokenHint": "Scegli un token per adattare heartbeat, soglia offline, auto-update e collector.",
      "resetToGlobal": "Ripristina impostazioni globali",
      "overrideHeartbeat": "Heartbeat",
      "overrideOffline": "Offline",
      "overrideAutoUpdate": "Agg. auto",
      "overrideCollectors": "{count} collector",
      "overrideMetrics": "{count} metrica(e)"
    },
    "metricsStorage": {
      "title": "Storico metriche (storage compatto)",
      "hint": "Impostazioni di acquisizione serie temporali RMM (disco, CPU, RAM, temperatura, aggiornamenti). Valido al prossimo heartbeat. Volumetria e proiezioni: scheda Consumi.",
      "fields": {
        "sampleIntervalMinutes": {
          "label": "Intervallo di campionamento",
          "hint": "Intervallo minimo tra due registrazioni (eccetto variazione disco). Non influisce sul numero di righe · aggregazione giornaliera."
        },
        "diskDeltaPct": {
          "label": "Soglia disco anticipata",
          "hint": "Variazione del disco peggiore (punti) che attiva una registrazione prima della fine dell'intervallo."
        },
        "retentionDays": {
          "label": "Conservazione storico",
          "hint": "Durata di conservazione degli aggregati giornalieri in database."
        }
      },
      "estimate": {
        "actualTitle": "Occupazione reale in database",
        "loadingVolume": "Caricamento volumetria…",
        "rows": "Righe",
        "agentsWithHistory": "Postazioni con storico",
        "table": "Tabella",
        "indexes": "Indici",
        "coveredPeriod": "Periodo coperto",
        "steadyTitle": "Stima a regime permanente",
        "projectionWorkstations": "Postazioni per proiezione",
        "projectionAgents": "Postazioni (proiezione)",
        "rowsPerAgentDay": "Righe / postazione / giorno",
        "retention": "Conservazione",
        "totalRowsEst": "Righe totali stimate",
        "actualVsEst": "Reale vs stima",
        "note": "Aggregazione giornaliera: l'intervallo di campionamento affina min/max giornalieri senza moltiplicare le righe. Conservazione e collector attivi guidano soprattutto la dimensione."
      }
    },
    "durationUnits": {
      "min": "Minuti",
      "hour": "Ore",
      "day": "Giorni"
    },
    "cost": {
      "client": {
        "duration": {
          "label": "Durata (heartbeat leggero)",
          "note": "Picco breve, processo PowerShell effimero"
        },
        "cpuPeak": {
          "label": "CPU (picco)",
          "note": "WMI + prestazioni; +1 s se contatore CPU"
        },
        "cpuAvg": {
          "label": "CPU (media 24 h)",
          "note": "~{perDay} passaggi / giorno"
        },
        "ram": {
          "label": "RAM",
          "note": "Durata del processo PowerShell"
        },
        "networkUpload": {
          "label": "Upload rete",
          "note": "Inventario leggero JSON compresso"
        },
        "fullSync": {
          "label": "Sync completa",
          "note": "{count}× / settimana (stima)"
        }
      },
      "server": {
        "sqlPerHb": {
          "label": "Query SQL / heartbeat",
          "note": "Auth, impostazioni, merge inventario, log"
        },
        "sqlPerDay": {
          "label": "Query SQL / giorno (parco)",
          "note": "{agents} postazione/i × {perDay} hb/g"
        },
        "cpuNode": {
          "label": "CPU Node.js / heartbeat",
          "note": "Merge JSONB = operazione dominante"
        },
        "inventoryWrite": {
          "label": "Scrittura inventario",
          "note": "Aggiorna v_b_clients_m_ordinateurs.data"
        },
        "historicalMetrics": {
          "label": "Metriche storiche",
          "note": "Disaccoppiato dal heartbeat (default 60 min)"
        },
        "avgLoad": {
          "label": "Carico medio",
          "note": "{note}"
        }
      },
      "network": {
        "perHb": {
          "label": "Per heartbeat (andata e ritorno)",
          "note": "{upload} KB upload + {response} KB risposta"
        },
        "perAgentDay": {
          "label": "Per postazione / giorno",
          "note": "{perDay} heartbeat × ~{kb} KB"
        },
        "perAgentMonth": {
          "label": "Per postazione / mese",
          "note": "Escluse sync complete"
        },
        "fleetDay": {
          "label": "Parco / giorno",
          "note": "{agents} postazione/i"
        },
        "fleetMonth": {
          "label": "Parco / mese",
          "note": "Stima regime stabile"
        },
        "fullSync": {
          "label": "Sync completa",
          "note": "Occasionale (registrazione, sync manuale)"
        }
      }
    },
    "tokenForm": {
      "eyebrow": "RMM · Registrazione",
      "title": "Nuovo token di registrazione",
      "subtitle": "Generare un token per installare l'agente Windows sulle postazioni di un'azienda.",
      "sectionsAria": "Sezioni del token",
      "sections": {
        "enterprise": {
          "label": "Azienda",
          "description": "Associazione Veritas"
        },
        "details": {
          "label": "Dettagli",
          "description": "Etichetta e utilizzo"
        }
      },
      "enterpriseTitle": "Azienda target",
      "enterpriseDesc": "Gli agenti installati con questo token saranno associati a questa azienda in Veritas.",
      "companyLabel": "Azienda",
      "selectCompany": "Selezionare un'azienda",
      "detailsTitle": "Identificazione",
      "detailsDesc": "Aggiungere un'etichetta per ritrovare questo token nell'elenco (GPO, sito, ecc.).",
      "labelOptional": "Etichetta (opzionale)",
      "labelPlaceholder": "Es. Distribuzione sito Parigi",
      "oneTimeTitle": "Visualizzazione unica alla creazione",
      "oneTimeHint": "Il token completo è mostrato una sola volta dopo la creazione. Copiarlo subito per l'installazione.",
      "creating": "Creazione…",
      "create": "Crea token"
    },
    "tokenCreated": {
      "eyebrow": "RMM · Registrazione",
      "title": "Token generato",
      "subtitle": "Copiarlo ora: non sarà più mostrato dopo la chiusura di questa finestra.",
      "usageTitle": "Utilizzo all'installazione",
      "usageHint": "Inserire questo token nell'installatore Windows o nella riga di comando silenziosa.",
      "tokenAria": "Token di registrazione",
      "copyTitle": "Copia token",
      "footerHint": "Conservare questo token in modo sicuro",
      "copy": "Copia token"
    },
    "toast": {
      "loadError": "Impossibile caricare il modulo RMM",
      "settingsSaved": "Impostazioni RMM salvate",
      "saveError": "Errore durante il salvataggio",
      "selectCompany": "Selezionare un'azienda",
      "tokenCreated": "Token di registrazione creato · copiarlo ora, non sarà più mostrato",
      "tokenCreateError": "Errore durante la creazione del token",
      "tokenCopied": "Token copiato",
      "tokenCopyError": "Impossibile copiare il token",
      "tokenRevoked": "Token spostato nel cestino",
      "tokenRevokeError": "Errore durante la revoca",
      "tokenRestored": "Token ripristinato",
      "tokenRestoreError": "Errore durante il ripristino",
      "tokenDeleted": "Token eliminato definitivamente",
      "tokenDeleteError": "Errore durante l'eliminazione",
      "agentRevoked": "Agente revocato",
      "agentRevokeError": "Errore durante la revoca dell'agente",
      "downloadStarted": "Download avviato",
      "downloadWithVersion": "Download: {filename} ({version})",
      "downloadError": "Impossibile scaricare l'agente",
      "tokenLoadError": "Impossibile caricare la configurazione del token",
      "selectToken": "Selezionare un token",
      "tokenResetGlobal": "Configurazione token ripristinata ai valori globali",
      "tokenNeedOverride": "Attivare almeno un'opzione personalizzata",
      "tokenSaved": "Configurazione token salvata",
      "tokenReset": "Configurazione ripristinata",
      "tokenResetError": "Errore durante il ripristino"
    },
    "collectors": {
      "items": {
        "os": {
          "label": "Sistema operativo",
          "description": "Versione, build, edizione Windows, installazione e ultimo avvio."
        },
        "domain": {
          "label": "Dominio / workgroup",
          "description": "Appartenenza al dominio Active Directory o workgroup."
        },
        "network": {
          "label": "Rete",
          "description": "Schede attive, IP, MAC, gateway e DNS."
        },
        "session": {
          "label": "Sessione utente",
          "description": "Account Windows attualmente connesso sul posto."
        },
        "updates": {
          "label": "Aggiornamenti Windows",
          "description": "Hotfix recenti, aggiornamenti/driver in sospeso e riavvio richiesto."
        },
        "license": {
          "label": "Licenza Windows",
          "description": "Edizione Windows attivata sul posto."
        },
        "chassis": {
          "label": "Marca, modello e n. di serie",
          "description": "Produttore, modello e numero di serie BIOS."
        },
        "hardware": {
          "label": "Hardware",
          "description": "CPU, RAM, dischi logici/fisici e GPU."
        },
        "performance": {
          "label": "Prestazioni",
          "description": "Carico CPU, RAM utilizzata, uptime e processi attivi."
        },
        "sensors": {
          "label": "Sensori",
          "description": "Temperature WMI e batteria (portatili)."
        },
        "security": {
          "label": "Sicurezza locale",
          "description": "Defender, firewall e BitLocker."
        },
        "printers": {
          "label": "Stampanti",
          "description": "Stampanti installate, driver, porta e stampante predefinita."
        },
        "shares": {
          "label": "Condivisioni e unità mappate",
          "description": "Unità di rete mappate e condivisioni Windows locali."
        },
        "services": {
          "label": "Servizi critici",
          "description": "Stato dei servizi essenziali (spooler, Defender, RPC…)."
        },
        "peripherals": {
          "label": "Schermi e dispositivi USB",
          "description": "Monitor collegati e dispositivi USB/HID."
        },
        "software": {
          "label": "Software installato",
          "description": "Programmi rilevati via registro (max 150). Raccolti solo durante una sincronizzazione completa."
        }
      },
      "groups": {
        "system": "Sistema e rete",
        "hardware": "Hardware",
        "monitoring": "Supervisione e sicurezza",
        "sync": "Inventario completo (sync)"
      },
      "title": "Collector di inventario",
      "hint": "Heartbeat leggero: sistema, prestazioni, dischi, aggiornamenti. I collector sync vengono eseguiti solo durante una sincronizzazione completa.",
      "hintClient": "Impostare un collector su Sostituzione per adattarne l'attivazione a questo token.",
      "proBanner": "La scelta dei collector (sistema, rete, hardware, software…) è riservata a Veritas Pro. Restano i valori predefiniti.",
      "badges": {
        "syncOnly": "Solo sync",
        "heavy": "Più lento",
        "override": "Sostituzione",
        "global": "Globale",
        "enabled": "attivato",
        "disabled": "disattivato"
      }
    }
  },
  "es": {
    "common": {
      "loading": "Cargando módulo RMM…",
      "loadingShort": "Cargando…",
      "saving": "Guardando…",
      "save": "Guardar",
      "close": "Cerrar",
      "cancel": "Cancelar",
      "edit": "Editar",
      "trash": "Papelera",
      "restore": "Restaurar",
      "revoke": "Revocar",
      "enabled": "Activado",
      "disabled": "Desactivado",
      "available": "Disponible",
      "comingSoon": "Próximamente",
      "build": "Build",
      "workstationsSuffix": "equipos",
      "clientLabel": "Cliente #{id}",
      "downloading": "Descargando…",
      "deletePermanently": "Eliminar definitivamente",
      "learnMore": "Más información",
      "noCompany": "Ninguna empresa",
      "noLabel": "Sin etiqueta",
      "indicator": "Indicador",
      "value": "Valor",
      "daysSuffix": "d",
      "minSuffix": "min",
      "durationUnitAria": "Unidad de duración",
      "durationUnitSuffix": " · unidad",
      "costAgentsActive": "Repartido a lo largo del día",
      "costNoAgents": "Ningún agente"
    },
    "tabs": {
      "deploy": "Despliegue",
      "settings": "Ajustes",
      "tokenSettings": "Por token",
      "tokens": "Tokens de registro",
      "agents": "Agentes",
      "consumptions": "Consumos"
    },
    "deploy": {
      "cardTitle": "Download endpoint agent",
      "cardDescription": "Install the agent on endpoints to automatically report inventory to Veritas (Computers family).",
      "platforms": {
        "windows": {
          "title": "Windows",
          "hint": "Agente nativo Windows · inventario de sistema y vinculación empresa."
        },
        "macos": {
          "title": "macOS",
          "hint": "Agente nativo macOS · inventario de sistema y vinculación empresa."
        },
        "linux": {
          "title": "Linux",
          "hint": "Agente nativo Linux · distribuciones servidor y equipos."
        },
        "ios": {
          "title": "iOS / iPadOS",
          "hint": "Supervisión de iPhone e iPad corporativos."
        },
        "android": {
          "title": "Android",
          "hint": "Agente para smartphones y tablets Android."
        },
        "chromeos": {
          "title": "ChromeOS",
          "hint": "Chromebooks y entornos Google Workspace."
        }
      },
      "windows": {
        "title": "Instalación Windows",
        "downloadMsi": "Descargar MSI",
        "argsIntro": "Propiedades MSI para instalación silenciosa (GPO / Intune / scripts):",
        "colProperty": "Propiedad",
        "colDescription": "Descripción",
        "colExample": "Ejemplo",
        "propApiUrl": "URL de la API Veritas (host + puerto, ruta /api).",
        "propToken": "Token de inscripción (pestaña Tokens).",
        "propFamily": "Tipo de equipo: ordinateurs o serveurs.",
        "silentLabel": "Instalación silenciosa",
        "silentCmd": "msiexec /i VeritasAgent-Windows-Setup.msi APIURL=\"http://host:3001/api\" TOKEN=\"<token>\" FAMILY=\"ordinateurs\" /qn /L*v %TEMP%\\VeritasAgent-install.log",
        "uninstallLabel": "Desinstalación silenciosa",
        "uninstallCmd": "msiexec /x VeritasAgent-Windows-Setup.msi /qn",
        "interactiveHint": "Sin TOKEN: asistente gráfico. Volver a ejecutar el MSI instalado: Reparar / Desinstalar. Versión más reciente: actualización."
      },
      "soon": {
        "title": "Instalación {platform}",
        "defaultPlatform": "Esta plataforma",
        "message": "El agente Veritas para {platform} está en desarrollo. Ningún procedimiento disponible por ahora · se le notificará al publicarse."
      }
    },
    "settings": {
      "globalTitle": "Global agent configuration",
      "globalDescription": "Valores predeterminados para todas las empresas. Sustituciones por token en la pestaña Por token.",
      "communicationTitle": "Comunicación del agente",
      "heartbeatLabel": "Intervalo heartbeat",
      "heartbeatHint": "Frecuencia de reporte de los agentes.",
      "offlineLabel": "Umbral offline",
      "offlineHint": "Retraso de inactividad antes del estado offline.",
      "autoUpdateLabel": "Actualización automática",
      "autoUpdateHint": "El agente descarga e instala el MSI del servidor cuando hay una versión más reciente.",
      "applyHint": "Al guardar se solicita un sync completo a los agentes afectados.",
      "customValueHint": "Valor personalizado para esta empresa.",
      "inheritGlobal": "Hereda global ({value}).",
      "inheritGlobalEnabled": "Hereda global ({label})",
      "inheritGlobalMetric": "Hereda global ({value} {suffix})",
      "customValueTitle": "Valor personalizado para esta empresa"
    },
    "tokens": {
      "title": "Tokens de registro por empresa",
      "description": "Cada token vincula los agentes instalados a una empresa Veritas.",
      "newToken": "Nuevo token",
      "viewAria": "Vista de tokens",
      "viewActive": "Activos",
      "viewTrash": "Papelera",
      "colCompany": "Empresa",
      "colToken": "Token",
      "colLabel": "Etiqueta",
      "colUses": "Usos",
      "colExpires": "Caducidad",
      "colCreated": "Creado el",
      "colRevoked": "Revocado el",
      "emptyActive": "Ningún token activo",
      "emptyTrash": "La papelera está vacía"
    },
    "agents": {
      "title": "Agentes desplegados",
      "description": "Equipos Windows registrados mediante el agente Veritas. El alcance indica configuración global o sobrescritura por token.",
      "searchPlaceholder": "Buscar equipo, empresa, versión…",
      "searchAria": "Buscar agentes",
      "searchClear": "Borrar búsqueda",
      "colCompany": "Empresa",
      "colHostname": "Equipo",
      "colVersion": "Versión",
      "colSettingsScope": "Alcance",
      "colHeartbeat": "Heartbeat",
      "colAutoUpdate": "Act. auto",
      "scopeGlobal": "Global",
      "scopeToken": "Token",
      "colStatus": "Estado",
      "colLastSeen": "Última actividad",
      "statusOnline": "En línea",
      "statusOffline": "Desconectado",
      "empty": "Ningún agente registrado",
      "emptySearch": "Ningún agente coincide con la búsqueda"
    },
    "consumptions": {
      "cardTitle": "Consumos RMM",
      "cardDescription": "Estimaciones de impacto en equipo, servidor, red y almacenamiento.",
      "intro": "Estimaciones indicativas según la configuración global (heartbeat {interval}, retención de métricas {retention}). Parque desplegado: {agentCount} {agentLabel}. Modificar parámetros en la pestaña {settingsTab}.",
      "agentSingular": "agente",
      "agentPlural": "agentes",
      "settingsTab": "Ajustes",
      "projectionLabel": "Equipos para proyecciones",
      "heartbeatSectionTitle": "Impacto heartbeat (régimen estable)",
      "heartbeatSectionHint": "Heartbeat ligero · sincronización completa ocasional.",
      "clientCardTitle": "Equipo agente",
      "clientCardSubtitle": "Cada {interval} · valores típicos Windows",
      "serverCardTitle": "Servidor Veritas",
      "serverCardSubtitle": "Proyección {projection} · intervalo {interval}",
      "networkCardTitle": "Red",
      "networkCardSubtitle": "Subida agentes → API · {projection}",
      "storageSectionTitle": "Almacenamiento de métricas en base",
      "storageSectionHint": "Ocupación real de la tabla de agregados diarios y estimación a régimen permanente.",
      "projectionSectionTitle": "Proyección de volumetría global",
      "projectionSectionHint": "Métricas históricas + inventario JSONB por equipo (retención {retention}{currentMetrics}).",
      "currentMetrics": " · métricas actuales: {size}",
      "colWorkstations": "Equipos",
      "colMetricsEst": "Métricas (est.)",
      "colInventoryEst": "Inventario (est.)",
      "colTotalEst": "Total est.",
      "colMetricRows": "Filas métricas",
      "projectionBadge": "Proyección",
      "footnote": "~{rowsPerDay} filas métricas/equipo/día con los collectores activos. El intervalo de muestreo ({sampleInterval} min) afina min/max diarios sin multiplicar filas almacenadas."
    },
    "tokenSettings": {
      "listTitle": "Tokens con configuración dedicada",
      "listDescription": "Los tokens ausentes de esta lista usan la configuración global. Los agentes enrollados con un token heredan sus sobrescrituras.",
      "colCompany": "Empresa",
      "colToken": "Token",
      "colOverrides": "Sobrescrituras",
      "colUpdated": "Actualizado",
      "emptyList": "Sin configuración por token · todos usan la configuración global.",
      "editorTitle": "Configuración por token",
      "editorDescription": "Sobrescriba solo las opciones necesarias para los agentes enrollados con este token. El resto hereda la configuración global.",
      "tokenField": "Token de enrolamiento",
      "selectToken": "Seleccionar un token…",
      "untitledToken": "Sin etiqueta",
      "modeField": "Modo",
      "customConfig": "Configuración personalizada",
      "useGlobal": "Usar configuración global",
      "badgeCustom": "Personalizada",
      "badgeGlobal": "Configuración global",
      "pickTokenHint": "Elija un token para ajustar heartbeat, umbral offline, auto-update y colectores.",
      "resetToGlobal": "Restablecer a configuración global",
      "overrideHeartbeat": "Heartbeat",
      "overrideOffline": "Offline",
      "overrideAutoUpdate": "Act. auto",
      "overrideCollectors": "{count} colector(es)",
      "overrideMetrics": "{count} métrica(s)"
    },
    "metricsStorage": {
      "title": "Historial de métricas (almacenamiento compacto)",
      "hint": "Ajustes de ingesta de series temporales RMM (disco, CPU, RAM, temperatura, actualizaciones). Aplica en el próximo heartbeat. Volumetría y proyecciones: pestaña Consumos.",
      "fields": {
        "sampleIntervalMinutes": {
          "label": "Intervalo de muestreo",
          "hint": "Retraso mínimo entre dos registros (excepto variación de disco). No influye en el número de filas · agregación diaria."
        },
        "diskDeltaPct": {
          "label": "Umbral de disco anticipado",
          "hint": "Variación del peor disco (puntos) que activa un registro antes del fin del intervalo."
        },
        "retentionDays": {
          "label": "Retención histórica",
          "hint": "Duración de conservación de agregados diarios en base."
        }
      },
      "estimate": {
        "actualTitle": "Ocupación real en base",
        "loadingVolume": "Cargando volumetría…",
        "rows": "Filas",
        "agentsWithHistory": "Equipos con historial",
        "table": "Tabla",
        "indexes": "Índices",
        "coveredPeriod": "Periodo cubierto",
        "steadyTitle": "Estimación a régimen permanente",
        "projectionWorkstations": "Equipos para proyección",
        "projectionAgents": "Equipos (proyección)",
        "rowsPerAgentDay": "Filas / equipo / día",
        "retention": "Retención",
        "totalRowsEst": "Filas totales estimadas",
        "actualVsEst": "Real vs estimación",
        "note": "Agregación diaria: el intervalo de muestreo afina min/max diarios sin multiplicar filas. Retención y collectores activos determinan sobre todo el tamaño."
      }
    },
    "durationUnits": {
      "min": "Minutos",
      "hour": "Horas",
      "day": "Días"
    },
    "cost": {
      "client": {
        "duration": {
          "label": "Duración (heartbeat ligero)",
          "note": "Pico breve, proceso PowerShell efímero"
        },
        "cpuPeak": {
          "label": "CPU (pico)",
          "note": "WMI + rendimiento; +1 s si contador CPU"
        },
        "cpuAvg": {
          "label": "CPU (media 24 h)",
          "note": "~{perDay} pasadas / día"
        },
        "ram": {
          "label": "RAM",
          "note": "Durante el proceso PowerShell"
        },
        "networkUpload": {
          "label": "Subida de red",
          "note": "Inventario ligero JSON comprimido"
        },
        "fullSync": {
          "label": "Sync completa",
          "note": "{count}× / semana (estimación)"
        }
      },
      "server": {
        "sqlPerHb": {
          "label": "Consultas SQL / heartbeat",
          "note": "Auth, ajustes, merge inventario, logs"
        },
        "sqlPerDay": {
          "label": "Consultas SQL / día (parque)",
          "note": "{agents} equipo(s) × {perDay} hb/día"
        },
        "cpuNode": {
          "label": "CPU Node.js / heartbeat",
          "note": "Merge JSONB = operación dominante"
        },
        "inventoryWrite": {
          "label": "Escritura inventario",
          "note": "Actualiza v_b_clients_m_ordinateurs.data"
        },
        "historicalMetrics": {
          "label": "Métricas históricas",
          "note": "Desacoplado del heartbeat (defecto 60 min)"
        },
        "avgLoad": {
          "label": "Carga media",
          "note": "{note}"
        }
      },
      "network": {
        "perHb": {
          "label": "Por heartbeat (ida y vuelta)",
          "note": "{upload} KB subida + {response} KB respuesta"
        },
        "perAgentDay": {
          "label": "Por equipo / día",
          "note": "{perDay} heartbeats × ~{kb} KB"
        },
        "perAgentMonth": {
          "label": "Por equipo / mes",
          "note": "Excl. sync completas"
        },
        "fleetDay": {
          "label": "Parque / día",
          "note": "{agents} equipo(s)"
        },
        "fleetMonth": {
          "label": "Parque / mes",
          "note": "Estimación régimen estable"
        },
        "fullSync": {
          "label": "Sync completa",
          "note": "Ocasional (registro, sync manual)"
        }
      }
    },
    "tokenForm": {
      "eyebrow": "RMM · Registro",
      "title": "Nuevo token de registro",
      "subtitle": "Genere un token para instalar el agente Windows en los equipos de una empresa.",
      "sectionsAria": "Secciones del token",
      "sections": {
        "enterprise": {
          "label": "Empresa",
          "description": "Vinculación Veritas"
        },
        "details": {
          "label": "Detalles",
          "description": "Etiqueta y uso"
        }
      },
      "enterpriseTitle": "Empresa objetivo",
      "enterpriseDesc": "Los agentes instalados con este token se vincularán a esta empresa en Veritas.",
      "companyLabel": "Empresa",
      "selectCompany": "Seleccionar una empresa",
      "detailsTitle": "Identificación",
      "detailsDesc": "Añada una etiqueta para encontrar este token en la lista (GPO, sitio, etc.).",
      "labelOptional": "Etiqueta (opcional)",
      "labelPlaceholder": "Ej. Despliegue sitio París",
      "oneTimeTitle": "Visualización única al crear",
      "oneTimeHint": "El token completo solo se muestra una vez tras la creación. Cópielo de inmediato para instalarlo.",
      "creating": "Creando…",
      "create": "Crear token"
    },
    "tokenCreated": {
      "eyebrow": "RMM · Registro",
      "title": "Token generado",
      "subtitle": "Cópielo ahora: no se mostrará de nuevo al cerrar esta ventana.",
      "usageTitle": "Uso en la instalación",
      "usageHint": "Introduzca este token en el instalador Windows o la línea de comandos silenciosa.",
      "tokenAria": "Token de registro",
      "copyTitle": "Copiar token",
      "footerHint": "Guarde este token en lugar seguro",
      "copy": "Copiar token"
    },
    "toast": {
      "loadError": "No se pudo cargar el módulo RMM",
      "settingsSaved": "Ajustes RMM guardados",
      "saveError": "Error al guardar",
      "selectCompany": "Seleccione una empresa",
      "tokenCreated": "Token de registro creado · cópielo ahora, no se mostrará de nuevo",
      "tokenCreateError": "Error al crear el token",
      "tokenCopied": "Token copiado",
      "tokenCopyError": "No se pudo copiar el token",
      "tokenRevoked": "Token movido a la papelera",
      "tokenRevokeError": "Error al revocar",
      "tokenRestored": "Token restaurado",
      "tokenRestoreError": "Error al restaurar",
      "tokenDeleted": "Token eliminado definitivamente",
      "tokenDeleteError": "Error al eliminar",
      "agentRevoked": "Agente revocado",
      "agentRevokeError": "Error al revocar el agente",
      "downloadStarted": "Descarga iniciada",
      "downloadWithVersion": "Descarga: {filename} ({version})",
      "downloadError": "No se pudo descargar el agente",
      "tokenLoadError": "No se pudo cargar la configuración del token",
      "selectToken": "Seleccione un token",
      "tokenResetGlobal": "Configuración del token restablecida a valores globales",
      "tokenNeedOverride": "Active al menos una opción personalizada",
      "tokenSaved": "Configuración del token guardada",
      "tokenReset": "Configuración restablecida",
      "tokenResetError": "Error al restablecer"
    },
    "collectors": {
      "items": {
        "os": {
          "label": "Sistema operativo",
          "description": "Versión, compilación, edición Windows, instalación y último arranque."
        },
        "domain": {
          "label": "Dominio / grupo de trabajo",
          "description": "Pertenencia al dominio Active Directory o grupo de trabajo."
        },
        "network": {
          "label": "Red",
          "description": "Adaptadores activos, IP, MAC, puerta de enlace y DNS."
        },
        "session": {
          "label": "Sesión de usuario",
          "description": "Cuenta Windows conectada actualmente en el equipo."
        },
        "updates": {
          "label": "Actualizaciones Windows",
          "description": "Hotfixes recientes, actualizaciones/controladores pendientes y reinicio requerido."
        },
        "license": {
          "label": "Licencia Windows",
          "description": "Edición Windows activada en el equipo."
        },
        "chassis": {
          "label": "Marca, modelo y n. de serie",
          "description": "Fabricante, modelo y número de serie BIOS."
        },
        "hardware": {
          "label": "Hardware",
          "description": "CPU, RAM, discos lógicos/físicos y GPU."
        },
        "performance": {
          "label": "Rendimiento",
          "description": "Carga CPU, RAM usada, uptime y procesos activos."
        },
        "sensors": {
          "label": "Sensores",
          "description": "Temperaturas WMI y batería (portátiles)."
        },
        "security": {
          "label": "Seguridad local",
          "description": "Defender, firewall y BitLocker."
        },
        "printers": {
          "label": "Impresoras",
          "description": "Impresoras instaladas, controlador, puerto e impresora predeterminada."
        },
        "shares": {
          "label": "Recursos compartidos y unidades mapeadas",
          "description": "Unidades de red mapeadas y recursos compartidos Windows locales."
        },
        "services": {
          "label": "Servicios críticos",
          "description": "Estado de servicios esenciales (spooler, Defender, RPC…)."
        },
        "peripherals": {
          "label": "Pantallas y dispositivos USB",
          "description": "Monitores conectados y dispositivos USB/HID."
        },
        "software": {
          "label": "Software instalado",
          "description": "Programas detectados vía registro (150 máx.). Recopilados solo durante una sincronización completa."
        }
      },
      "groups": {
        "system": "Sistema y red",
        "hardware": "Hardware",
        "monitoring": "Supervisión y seguridad",
        "sync": "Inventario completo (sync)"
      },
      "title": "Collectores de inventario",
      "hint": "Heartbeat ligero: sistema, rendimiento, discos, actualizaciones. Los collectores sync solo se ejecutan durante una sincronización completa.",
      "hintClient": "Ponga un colector en Sustitución para adaptar su activación a este token.",
      "proBanner": "La elección de collectores (sistema, red, hardware, software…) requiere Veritas Pro. Se mantienen los valores predeterminados.",
      "badges": {
        "syncOnly": "Solo sync",
        "heavy": "Más lento",
        "override": "Sustitución",
        "global": "Global",
        "enabled": "activado",
        "disabled": "desactivado"
      }
    }
  }
};
export const getAdminRmmCopy = createLocaleGetter(ADMIN_RMM_COPY);
export function formatRmmClientLabel(id, copy) {
  return interpolate(copy.common.clientLabel, {
    id
  });
}
export function getLocalizedCollectors(copy) {
  return COLLECTORS.map(c => ({
    ...c,
    label: copy.collectors.items[c.key]?.label ?? c.label,
    description: copy.collectors.items[c.key]?.description ?? c.description
  }));
}
export function getLocalizedCollectorGroups(copy) {
  return Object.fromEntries(Object.keys(COLLECTOR_GROUPS).map(key => [key, copy.collectors.groups[key] ?? COLLECTOR_GROUPS[key]]));
}
export function getLocalizedMetricsFields(copy) {
  return METRICS_FIELDS.map(field => ({
    ...field,
    label: copy.metricsStorage.fields[field.key]?.label ?? field.label,
    hint: copy.metricsStorage.fields[field.key]?.hint ?? field.hint
  }));
}
export function getLocalizedDurationUnits(copy) {
  return RMM_DURATION_UNITS.map(entry => ({
    ...entry,
    optionLabel: copy.durationUnits[entry.key] ?? entry.optionLabel
  }));
}
export function getLocalizedTokenFormSections(copy) {
  return RMM_TOKEN_FORM_SECTIONS.map(section => ({
    ...section,
    label: copy.tokenForm.sections[section.id]?.label ?? section.label,
    description: copy.tokenForm.sections[section.id]?.description ?? section.description
  }));
}
export function mapCostImpactRows(rows, sectionCopy, copy, {
  agents = 0
} = {}) {
  return rows.map(row => {
    const meta = sectionCopy[row.key] || {};
    let note = meta.note || "";
    if (row.key === "avgLoad") {
      note = agents > 0 ? copy.common.costAgentsActive : copy.common.costNoAgents;
    } else if (row.noteParams) {
      note = interpolate(note, row.noteParams);
    }
    return {
      label: meta.label || row.key,
      value: row.value,
      note: note || undefined
    };
  });
}
export function formatRmmDateTime(value, locale = "fr") {
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
export function formatRmmDate(value, locale = "fr") {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const tag = `${locale}-${locale.toUpperCase()}`;
  return date.toLocaleDateString(tag);
}
export { interpolate };
