import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const TAB_KEYS = ["overview", "antivirus", "antispam", "campaigns"];
const TAB_ICONS = {
  overview: "mdi:lightning-bolt",
  antivirus: "mdi:shield-search",
  antispam: "mdi:email-secure",
  campaigns: "mdi:shield-lock"
};
const STATUS_FILTER_IDS = ["all", "actif", "expire_bientot", "inactif"];
const STATUS_META_KEYS = ["actif", "expire_bientot", "inactif", "inconnu"];
const CAMPAIGN_TYPE_KEYS = ["microsoft_security", "cybersecurity_training", "rgpd_audit", "penetration_test", "phishing_simulation", "vulnerability_scan", "incident_response", "compliance_audit"];
const CAMPAIGN_STATUS_KEYS = ["en_preparation", "active", "suspendue", "inactive"];
const CAMPAIGN_STATUS_COLORS = {
  en_preparation: "#fbbf24",
  active: "#10b981",
  suspendue: "#ef4444",
  inactive: "#6b7280"
};
const CAMPAIGN_STATUS_TONES = {
  en_preparation: "warn",
  active: "good",
  suspendue: "bad",
  inactive: "neutral"
};
const CAMPAIGN_STATUS_FILTER_IDS = ["all", "en_preparation", "active", "suspendue", "inactive"];
const CYBERSECURITE_PAGE_COPY = {
  fr: {
    eyebrow: "Services managés",
    pageTitle: "Cybersécurité",
    subtitle: "Posture sécurité · antivirus, antispam et campagnes de sensibilisation.",
    tabSectionsAria: "Onglets cybersécurité",
    proTabSuffix: " · Veritas Pro",
    proFeatureKey: "cyberCampaigns",
    tabs: {
      overview: "À traiter",
      antivirus: "Antivirus",
      antispam: "Antispam",
      campaigns: "Campagnes"
    },
    overview: {
      priorityTitle: "À traiter en priorité",
      portfolioAlerts: "{count} alerte sur le portefeuille",
      portfolioAlertsPlural: "{count} alertes sur le portefeuille",
      emptyTitle: "Aucune alerte sécurité",
      emptyText: "Les solutions antivirus et antispam du portefeuille sont dans un état nominal.",
      treat: "Traiter",
      viewFleet: "Voir le parc",
      actions: {
        avExpired: "Antivirus expiré ou inactif",
        avRenew: "Antivirus à renouveler",
        avLicenseSoon: "Licence antivirus bientôt expirée",
        asExpired: "Antispam expiré ou inactif",
        asSoon: "Antispam bientôt expiré",
        campaignSuspended: "Campagne suspendue",
        campaignFallback: "Campagne"
      },
      hexTitle: "Vue d'ensemble",
      hexKpi: {
        alerts: "Alertes",
        avIssues: "Antivirus",
        asIssues: "Antispam",
        campaigns: "Campagnes",
        avSolutions: "Sol. AV",
        asSolutions: "Sol. AS",
        health: "Santé (%)"
      },
      kpi: {
        solutions: "Solutions",
        enterprises: "Entreprises",
        endpoints: "Postes",
        licenses: "Licences",
        users: "Utilisateurs",
        domains: "Domaines",
        todo: "À traiter",
        health: "Santé (%)"
      },
      av: {
        eyebrow: "Antivirus",
        title: "Solutions antivirus",
        descEmpty: "Aucune solution antivirus enregistrée",
        descStats: "{clients} entreprise couverte · {providers} fournisseur",
        descStatsPlural: "{clients} entreprises couvertes · {providers} fournisseurs",
        descStatsClients: "{clients} entreprise couverte",
        descStatsClientsPlural: "{clients} entreprises couvertes",
        descStatsProviders: "{providers} fournisseur",
        descStatsProvidersPlural: "{providers} fournisseurs"
      },
      as: {
        eyebrow: "Antispam",
        title: "Solutions antispam",
        descEmpty: "Aucune solution antispam enregistrée",
        descStats: "{clients} entreprise couverte · {providers} fournisseur",
        descStatsPlural: "{clients} entreprises couvertes · {providers} fournisseurs"
      }
    },
    msp: {
      heroTitle: "Parc multi-entreprises",
      statusFilterAria: "Filtre statut",
      providerFilterAria: "Filtre fournisseur",
      allProviders: "Tous fournisseurs",
      priorityTitle: "À traiter en priorité",
      alertCount: "{count} alerte",
      alertCountPlural: "{count} alertes",
      solutionCount: "{count} solution",
      solutionCountPlural: "{count} solutions",
      endpointCount: "{count} postes",
      userCount: "{count} utilisateurs",
      renew: "Renouveler",
      anticipate: "Anticiper",
      expPrefix: "exp.",
      statusAria: "État",
      licensesTitle: "{used} / {total} licences",
      coverageUsers: "{count} utilisateur",
      coverageUsersPlural: "{count} utilisateurs",
      coverageDomains: "{count} domaine",
      coverageDomainsPlural: "{count} domaines",
      statusFilters: {
        all: "Tous",
        actif: "Actifs",
        expire_bientot: "Expire bientôt",
        inactif: "Inactifs"
      },
      statusMeta: {
        actif: "Actif",
        expire_bientot: "Expire bientôt",
        inactif: "Inactif",
        inconnu: "Non renseigné"
      },
      table: {
        enterprise: "Entreprise",
        solution: "Solution",
        plan: "Plan",
        mode: "Mode",
        status: "Statut",
        expiration: "Expiration",
        coverage: "Couverture",
        lastSync: "Dernière sync"
      },
      kpi: {
        solutions: "Solutions",
        enterprises: "Entreprises",
        active: "Actives",
        todo: "À traiter"
      },
      antivirus: {
        eyebrow: "Antivirus",
        healthLabel: "Santé AV",
        heroDescOk: "Licences, couverture et expirations de vos clients.",
        heroDescIssues: "{count} solution à traiter.",
        heroDescIssuesPlural: "{count} solutions à traiter.",
        searchPlaceholder: "Rechercher entreprise, solution, fournisseur…",
        addTitle: "Ajouter une solution antivirus",
        syncTitle: "Synchroniser les tenants Bitdefender",
        loading: "Chargement du parc antivirus…",
        emptyTitle: "Aucune solution antivirus",
        noResultsTitle: "Aucun résultat",
        emptyText: "Configurez les solutions dans les fiches entreprises ou ajoutez-en une depuis ce tableau de bord.",
        noResultsText: "Ajustez les filtres ou la recherche pour afficher des solutions."
      },
      antispam: {
        eyebrow: "Antispam",
        healthLabel: "Santé AS",
        heroDescOk: "Couverture, domaines protégés et expirations de vos clients.",
        heroDescIssues: "{count} solution à traiter.",
        heroDescIssuesPlural: "{count} solutions à traiter.",
        searchPlaceholder: "Rechercher entreprise, solution, fournisseur…",
        addTitle: "Ajouter une solution antispam",
        syncTitle: "Synchroniser les solutions antispam",
        loading: "Chargement du parc antispam…",
        emptyTitle: "Aucune solution antispam",
        noResultsTitle: "Aucun résultat",
        emptyText: "Configurez les solutions dans les fiches entreprises ou ajoutez-en une depuis ce tableau de bord.",
        noResultsText: "Ajustez les filtres ou la recherche pour afficher des solutions."
      }
    },
    campaigns: {
      eyebrow: "Campagnes",
      healthLabel: "Santé camp.",
      heroDescOk: "Suivi des campagnes de sensibilisation et conformité.",
      heroDescIssues: "{count} campagne suspendue.",
      heroDescIssuesPlural: "{count} campagnes suspendues.",
      searchPlaceholder: "Rechercher entreprise, campagne, type…",
      campaignCount: "{count} campagne",
      campaignCountPlural: "{count} campagnes",
      openCampaign: "Ouvrir",
      statusFilters: {
        all: "Toutes",
        en_preparation: "En préparation",
        active: "Actives",
        suspendue: "En pause",
        inactive: "Terminées"
      },
      totalTitle: "Cliquez pour afficher toutes les campagnes",
      filterTitle: "Cliquez pour filtrer : {label}",
      sectionTitle: "Campagnes de cybersécurité",
      addTitle: "Ajouter une campagne MFA",
      loading: "Chargement des campagnes…",
      emptyTitle: "Aucune campagne",
      emptyText: "Créez votre première campagne MFA Microsoft",
      emptyCta: "Créer une campagne MFA",
      viewClient: "Voir la fiche client",
      rowsPerPage: "Lignes par page",
      prevPage: "Page précédente",
      nextPage: "Page suivante",
      pageInfo: "Page {page} / {total}",
      table: {
        enterprise: "Entreprise",
        name: "Nom",
        type: "Type",
        status: "Statut",
        startDate: "Date début",
        endDate: "Date fin",
        progress: "Progression",
        createdAt: "Créé le"
      },
      types: {
        microsoft_security: "Sécurité Microsoft (MFA)",
        cybersecurity_training: "Formation cybersécurité",
        rgpd_audit: "Audit conformité RGPD",
        penetration_test: "Test de pénétration",
        phishing_simulation: "Simulation de phishing",
        vulnerability_scan: "Scan de vulnérabilités",
        incident_response: "Réponse aux incidents",
        compliance_audit: "Audit de conformité"
      },
      statuses: {
        en_preparation: "En préparation",
        active: "Active",
        suspendue: "En pause",
        inactive: "Terminée"
      },
      modal: {
        editTitle: "Modifier la campagne",
        createTitle: "Nouvelle campagne MFA",
        eyebrow: "Campagnes MFA",
        createSubtitle: "Campagne d'adoption MFA basée sur les données du tenant Microsoft.",
        editSubtitle: "Modifiez les informations de la campagne MFA.",
        sectionTitle: "Informations générales",
        sectionDesc: "Client, nom et type. Les étapes MFA et les snapshots seront générés automatiquement.",
        sectionsNavAria: "Sections du formulaire campagne",
        footerHint: "Les champs marqués * sont obligatoires",
        sections: {
          general: {
            navLabel: "Général",
            navHint: "Entreprise et type",
            title: "Informations générales",
            desc: "Sélectionnez l'entreprise et nommez la campagne MFA Microsoft."
          },
          dates: {
            navLabel: "Dates",
            navHint: "Période de campagne",
            title: "Période",
            desc: "Définissez la fenêtre de démarrage et de fin de la campagne."
          },
          details: {
            navLabel: "Détails",
            navHint: "Contexte et notes",
            title: "Spécificités",
            desc: "Ajoutez le contexte, les attentes ou les contraintes de la campagne."
          }
        },
        close: "Fermer",
        namePlaceholder: "Ex. Campagne MFA T2 2026",
        enterprise: "Entreprise *",
        enterpriseSearch: "Rechercher une entreprise…",
        noEnterprise: "Aucune entreprise trouvée",
        name: "Nom de la campagne *",
        type: "Type *",
        provider: "Provider *",
        providerMicrosoft: "Microsoft",
        providerGoogle: "Google Workspace",
        providerOkta: "Okta",
        providerComingSoon: "Ce provider sera bientôt disponible",
        badgeSoon: "Soon",
        tenant: "Tenant *",
        tenantLoading: "Chargement du tenant Microsoft…",
        tenantFallbackLabel: "Tenant Microsoft",
        needMicrosoftTenant: "Configurez d’abord un tenant Microsoft Entra pour cette entreprise avant de créer une campagne MFA.",
        startDate: "Date de début",
        endDate: "Date de fin",
        specificity: "Spécificité",
        specificityPlaceholder: "Spécificités de la campagne (contexte, attentes, contraintes…)",
        saveEdit: "Modifier la campagne",
        saveCreate: "Créer la campagne",
        status: "Statut",
        adoptionGoal: "Objectif d'adoption (%)",
        adoptionGoalPlaceholder: "Ex. : 90",
        delete: "Supprimer",
        deleting: "Suppression…"
      },
      delete: {
        title: "Supprimer la campagne",
        message: "Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.",
        confirmLabel: 'Tapez "JE CONFIRME" pour valider :',
        confirmPlaceholder: "JE CONFIRME",
        confirmWord: "JE CONFIRME"
      },
      toasts: {
        requiredFields: "Le client, le nom et le type de campagne sont requis",
        needMicrosoftTenant: "Un tenant Microsoft Entra doit être configuré pour créer une campagne MFA",
        updated: "Campagne mise à jour avec succès",
        created: "Campagne créée avec succès",
        saveError: "Erreur lors de la sauvegarde de la campagne",
        confirmDelete: 'Veuillez écrire "JE CONFIRME" pour valider la suppression',
        deleted: "Campagne supprimée avec succès",
        deleteError: "Erreur lors de la suppression de la campagne"
      }
    },
    sync: {
      preparing: "Préparation…",
      none: "Aucune licence Bitdefender à synchroniser",
      progress: "Synchronisation {current}/{total} · {name}",
      done: "Terminé",
      success: "Synchronisation terminée: {success} licence(s) mise(s) à jour{errors}",
      successErrors: ", {count} erreur(s)",
      failed: "Synchronisation échouée: {count} erreur(s)",
      error: "Erreur lors de la synchronisation des licences Bitdefender"
    }
  },
  en: {
    eyebrow: "Managed services",
    pageTitle: "Cybersecurity",
    subtitle: "Security posture · antivirus, antispam, and awareness campaigns.",
    tabSectionsAria: "Cybersecurity sections",
    proTabSuffix: " · Veritas Pro",
    proFeatureKey: "cyberCampaigns",
    tabs: {
      overview: "To do",
      antivirus: "Antivirus",
      antispam: "Antispam",
      campaigns: "Campaigns"
    },
    overview: {
      priorityTitle: "Priority items",
      portfolioAlerts: "{count} alert on the portfolio",
      portfolioAlertsPlural: "{count} alerts on the portfolio",
      emptyTitle: "No security alerts",
      emptyText: "Antivirus and antispam solutions across the portfolio are in good standing.",
      treat: "Handle",
      viewFleet: "View fleet",
      actions: {
        avExpired: "Antivirus expired or inactive",
        avRenew: "Antivirus renewal required",
        avLicenseSoon: "Antivirus license expiring soon",
        asExpired: "Antispam expired or inactive",
        asSoon: "Antispam expiring soon",
        campaignSuspended: "Campaign suspended",
        campaignFallback: "Campaign"
      },
      hexTitle: "Overview",
      hexKpi: {
        alerts: "Alerts",
        avIssues: "Antivirus",
        asIssues: "Antispam",
        campaigns: "Campaigns",
        avSolutions: "AV sol.",
        asSolutions: "AS sol.",
        health: "Health (%)"
      },
      kpi: {
        solutions: "Solutions",
        enterprises: "Companies",
        endpoints: "Endpoints",
        licenses: "Licenses",
        users: "Users",
        domains: "Domains",
        todo: "To do",
        health: "Health (%)"
      },
      av: {
        eyebrow: "Antivirus",
        title: "Antivirus solutions",
        descEmpty: "No antivirus solution registered",
        descStats: "{clients} company covered · {providers} provider",
        descStatsPlural: "{clients} companies covered · {providers} providers",
        descStatsClients: "{clients} company covered",
        descStatsClientsPlural: "{clients} companies covered",
        descStatsProviders: "{providers} provider",
        descStatsProvidersPlural: "{providers} providers"
      },
      as: {
        eyebrow: "Antispam",
        title: "Antispam solutions",
        descEmpty: "No antispam solution registered",
        descStats: "{clients} company covered · {providers} provider",
        descStatsPlural: "{clients} companies covered · {providers} providers"
      }
    },
    msp: {
      heroTitle: "Multi-company fleet",
      statusFilterAria: "Status filter",
      providerFilterAria: "Provider filter",
      allProviders: "All providers",
      priorityTitle: "Priority items",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alerts",
      solutionCount: "{count} solution",
      solutionCountPlural: "{count} solutions",
      endpointCount: "{count} endpoints",
      userCount: "{count} users",
      renew: "Renew",
      anticipate: "Plan ahead",
      expPrefix: "exp.",
      statusAria: "Status",
      licensesTitle: "{used} / {total} licenses",
      coverageUsers: "{count} user",
      coverageUsersPlural: "{count} users",
      coverageDomains: "{count} domain",
      coverageDomainsPlural: "{count} domains",
      statusFilters: {
        all: "All",
        actif: "Active",
        expire_bientot: "Expiring soon",
        inactif: "Inactive"
      },
      statusMeta: {
        actif: "Active",
        expire_bientot: "Expiring soon",
        inactif: "Inactive",
        unknown: "Not specified"
      },
      table: {
        enterprise: "Company",
        solution: "Solution",
        plan: "Plan",
        mode: "Mode",
        status: "Status",
        expiration: "Expiration",
        coverage: "Coverage",
        lastSync: "Last sync"
      },
      kpi: {
        solutions: "Solutions",
        enterprises: "Companies",
        active: "Active",
        todo: "To do"
      },
      antivirus: {
        eyebrow: "Antivirus",
        healthLabel: "AV health",
        heroDescOk: "Licenses, coverage, and expirations for your clients.",
        heroDescIssues: "{count} solution to handle.",
        heroDescIssuesPlural: "{count} solutions to handle.",
        searchPlaceholder: "Search company, solution, provider…",
        addTitle: "Add an antivirus solution",
        syncTitle: "Sync Bitdefender tenants",
        loading: "Loading antivirus fleet…",
        emptyTitle: "No antivirus solution",
        noResultsTitle: "No results",
        emptyText: "Configure solutions in company records or add one from this dashboard.",
        noResultsText: "Adjust filters or search to display solutions."
      },
      antispam: {
        eyebrow: "Antispam",
        healthLabel: "AS health",
        heroDescOk: "Coverage, protected domains, and expirations for your clients.",
        heroDescIssues: "{count} solution to handle.",
        heroDescIssuesPlural: "{count} solutions to handle.",
        searchPlaceholder: "Search company, solution, provider…",
        addTitle: "Add an antispam solution",
        syncTitle: "Sync antispam solutions",
        loading: "Loading antispam fleet…",
        emptyTitle: "No antispam solution",
        noResultsTitle: "No results",
        emptyText: "Configure solutions in company records or add one from this dashboard.",
        noResultsText: "Adjust filters or search to display solutions."
      }
    },
    campaigns: {
      eyebrow: "Campaigns",
      healthLabel: "Campaign health",
      heroDescOk: "Track awareness and compliance campaigns.",
      heroDescIssues: "{count} suspended campaign.",
      heroDescIssuesPlural: "{count} suspended campaigns.",
      searchPlaceholder: "Search company, campaign, type…",
      campaignCount: "{count} campaign",
      campaignCountPlural: "{count} campaigns",
      openCampaign: "Open",
      statusFilters: {
        all: "All",
        en_preparation: "In preparation",
        active: "Active",
        suspendue: "Paused",
        inactive: "Completed"
      },
      totalTitle: "Click to show all campaigns",
      filterTitle: "Click to filter: {label}",
      sectionTitle: "Cybersecurity campaigns",
      addTitle: "Add an MFA campaign",
      loading: "Loading campaigns…",
      emptyTitle: "No campaigns",
      emptyText: "Create your first Microsoft MFA campaign",
      emptyCta: "Create MFA campaign",
      viewClient: "View company record",
      rowsPerPage: "Rows per page",
      prevPage: "Previous page",
      nextPage: "Next page",
      pageInfo: "Page {page} / {total}",
      table: {
        enterprise: "Company",
        name: "Name",
        type: "Type",
        status: "Status",
        startDate: "Start date",
        endDate: "End date",
        progress: "Progress",
        createdAt: "Created on"
      },
      types: {
        microsoft_security: "Microsoft security (MFA)",
        cybersecurity_training: "Cybersecurity training",
        rgpd_audit: "GDPR compliance audit",
        penetration_test: "Penetration test",
        phishing_simulation: "Phishing simulation",
        vulnerability_scan: "Vulnerability scan",
        incident_response: "Incident response",
        compliance_audit: "Compliance audit"
      },
      statuses: {
        en_preparation: "In preparation",
        active: "Active",
        suspendue: "Paused",
        inactive: "Completed"
      },
      modal: {
        editTitle: "Edit campaign",
        createTitle: "New MFA campaign",
        eyebrow: "MFA campaigns",
        createSubtitle: "MFA adoption campaign based on Microsoft tenant data.",
        editSubtitle: "Update the MFA campaign information.",
        sectionTitle: "General information",
        sectionDesc: "Client, name, and type. MFA steps and snapshots are created automatically.",
        sectionsNavAria: "Campaign form sections",
        footerHint: "Fields marked * are required",
        sections: {
          general: {
            navLabel: "General",
            navHint: "Company and type",
            title: "General information",
            desc: "Select the company and name the Microsoft MFA campaign."
          },
          dates: {
            navLabel: "Dates",
            navHint: "Campaign period",
            title: "Period",
            desc: "Set the campaign start and end window."
          },
          details: {
            navLabel: "Details",
            navHint: "Context and notes",
            title: "Specifics",
            desc: "Add context, expectations, or constraints for the campaign."
          }
        },
        close: "Close",
        namePlaceholder: "E.g. MFA campaign Q2 2026",
        enterprise: "Company *",
        enterpriseSearch: "Search for a company…",
        noEnterprise: "No company found",
        name: "Campaign name *",
        type: "Type *",
        provider: "Provider *",
        providerMicrosoft: "Microsoft",
        providerGoogle: "Google Workspace",
        providerOkta: "Okta",
        providerComingSoon: "This provider will be available soon",
        badgeSoon: "Soon",
        tenant: "Tenant *",
        tenantLoading: "Loading Microsoft tenant…",
        tenantFallbackLabel: "Microsoft tenant",
        needMicrosoftTenant: "Configure a Microsoft Entra tenant for this company before creating an MFA campaign.",
        startDate: "Start date",
        endDate: "End date",
        specificity: "Specifics",
        specificityPlaceholder: "Campaign specifics (context, expectations, constraints…)",
        saveEdit: "Update campaign",
        saveCreate: "Create campaign",
        status: "Status",
        adoptionGoal: "Adoption goal (%)",
        adoptionGoalPlaceholder: "E.g. 90",
        delete: "Delete",
        deleting: "Deleting…"
      },
      delete: {
        title: "Delete campaign",
        message: "Are you sure you want to delete this campaign? This action cannot be undone.",
        confirmLabel: 'Type "I CONFIRM" to validate:',
        confirmPlaceholder: "I CONFIRM",
        confirmWord: "I CONFIRM"
      },
      toasts: {
        requiredFields: "Client, name, and campaign type are required",
        needMicrosoftTenant: "A Microsoft Entra tenant must be configured to create an MFA campaign",
        updated: "Campaign updated successfully",
        created: "Campaign created successfully",
        saveError: "Error saving campaign",
        confirmDelete: 'Please type "I CONFIRM" to validate deletion',
        deleted: "Campaign deleted successfully",
        deleteError: "Error deleting campaign"
      }
    },
    sync: {
      preparing: "Preparing…",
      none: "No Bitdefender license to sync",
      progress: "Syncing {current}/{total} · {name}",
      done: "Done",
      success: "Sync complete: {success} license(s) updated{errors}",
      successErrors: ", {count} error(s)",
      failed: "Sync failed: {count} error(s)",
      error: "Error syncing Bitdefender licenses"
    }
  },
  de: {
    eyebrow: "Managed Services",
    pageTitle: "Cybersicherheit",
    subtitle: "Sicherheitslage · Antivirus, Antispam und Sensibilisierungskampagnen.",
    tabSectionsAria: "Cybersicherheitsbereiche",
    proTabSuffix: " · Veritas Pro",
    proFeatureKey: "cyberCampaigns",
    tabs: {
      overview: "Zu erledigen",
      antivirus: "Antivirus",
      antispam: "Antispam",
      campaigns: "Kampagnen"
    },
    overview: {
      priorityTitle: "Priorität",
      portfolioAlerts: "{count} Alarm im Portfolio",
      portfolioAlertsPlural: "{count} Alarme im Portfolio",
      emptyTitle: "Keine Sicherheitsalarme",
      emptyText: "Antivirus- und Antispam-Lösungen im Portfolio sind in Ordnung.",
      treat: "Bearbeiten",
      viewFleet: "Bestand anzeigen",
      actions: {
        avExpired: "Antivirus abgelaufen oder inaktiv",
        avRenew: "Antivirus-Erneuerung erforderlich",
        avLicenseSoon: "Antivirus-Lizenz läuft bald ab",
        asExpired: "Antispam abgelaufen oder inaktiv",
        asSoon: "Antispam läuft bald ab",
        campaignSuspended: "Kampagne ausgesetzt",
        campaignFallback: "Kampagne"
      },
      hexTitle: "Übersicht",
      hexKpi: {
        alerts: "Alarme",
        avIssues: "Antivirus",
        asIssues: "Antispam",
        campaigns: "Kampagnen",
        avSolutions: "AV-Lös.",
        asSolutions: "AS-Lös.",
        health: "Gesundheit (%)"
      },
      kpi: {
        solutions: "Lösungen",
        enterprises: "Unternehmen",
        endpoints: "Arbeitsplätze",
        licenses: "Lizenzen",
        users: "Benutzer",
        domains: "Domains",
        todo: "Zu erledigen",
        health: "Gesundheit (%)"
      },
      av: {
        eyebrow: "Antivirus",
        title: "Antivirus-Lösungen",
        descEmpty: "Keine Antivirus-Lösung erfasst",
        descStats: "{clients} Unternehmen abgedeckt · {providers} Anbieter",
        descStatsPlural: "{clients} Unternehmen abgedeckt · {providers} Anbieter",
        descStatsClients: "{clients} Unternehmen abgedeckt",
        descStatsClientsPlural: "{clients} Unternehmen abgedeckt",
        descStatsProviders: "{providers} Anbieter",
        descStatsProvidersPlural: "{providers} Anbieter"
      },
      as: {
        eyebrow: "Antispam",
        title: "Antispam-Lösungen",
        descEmpty: "Keine Antispam-Lösung erfasst",
        descStats: "{clients} Unternehmen abgedeckt · {providers} Anbieter",
        descStatsPlural: "{clients} Unternehmen abgedeckt · {providers} Anbieter"
      }
    },
    msp: {
      heroTitle: "Multi-Unternehmens-Bestand",
      statusFilterAria: "Statusfilter",
      providerFilterAria: "Anbieterfilter",
      allProviders: "Alle Anbieter",
      priorityTitle: "Priorität",
      alertCount: "{count} Alarm",
      alertCountPlural: "{count} Alarme",
      solutionCount: "{count} Lösung",
      solutionCountPlural: "{count} Lösungen",
      endpointCount: "{count} Arbeitsplätze",
      userCount: "{count} Benutzer",
      renew: "Erneuern",
      anticipate: "Vorausplanen",
      expPrefix: "abl.",
      statusAria: "Status",
      licensesTitle: "{used} / {total} Lizenzen",
      coverageUsers: "{count} Benutzer",
      coverageUsersPlural: "{count} Benutzer",
      coverageDomains: "{count} Domain",
      coverageDomainsPlural: "{count} Domains",
      statusFilters: {
        all: "Alle",
        actif: "Aktiv",
        expire_bientot: "Läuft bald ab",
        inactif: "Inaktiv"
      },
      statusMeta: {
        actif: "Aktiv",
        expire_bientot: "Läuft bald ab",
        inactif: "Inaktiv",
        inconnu: "Nicht angegeben"
      },
      table: {
        enterprise: "Unternehmen",
        solution: "Lösung",
        plan: "Plan",
        mode: "Modus",
        status: "Status",
        expiration: "Ablauf",
        coverage: "Abdeckung",
        lastSync: "Letzte Sync"
      },
      kpi: {
        solutions: "Lösungen",
        enterprises: "Unternehmen",
        active: "Aktiv",
        todo: "Zu erledigen"
      },
      antivirus: {
        eyebrow: "Antivirus",
        healthLabel: "AV-Gesundheit",
        heroDescOk: "Lizenzen, Abdeckung und Ablaufdaten Ihrer Kunden.",
        heroDescIssues: "{count} Lösung zu bearbeiten.",
        heroDescIssuesPlural: "{count} Lösungen zu bearbeiten.",
        searchPlaceholder: "Unternehmen, Lösung, Anbieter suchen…",
        addTitle: "Antivirus-Lösung hinzufügen",
        syncTitle: "Bitdefender-Mandanten synchronisieren",
        loading: "Antivirus-Bestand wird geladen…",
        emptyTitle: "Keine Antivirus-Lösung",
        noResultsTitle: "Keine Ergebnisse",
        emptyText: "Konfigurieren Sie Lösungen in den Unternehmensakten oder fügen Sie eine über dieses Dashboard hinzu.",
        noResultsText: "Passen Sie Filter oder Suche an, um Lösungen anzuzeigen."
      },
      antispam: {
        eyebrow: "Antispam",
        healthLabel: "AS-Gesundheit",
        heroDescOk: "Abdeckung, geschützte Domains und Ablaufdaten Ihrer Kunden.",
        heroDescIssues: "{count} Lösung zu bearbeiten.",
        heroDescIssuesPlural: "{count} Lösungen zu bearbeiten.",
        searchPlaceholder: "Unternehmen, Lösung, Anbieter suchen…",
        addTitle: "Antispam-Lösung hinzufügen",
        syncTitle: "Antispam-Lösungen synchronisieren",
        loading: "Antispam-Bestand wird geladen…",
        emptyTitle: "Keine Antispam-Lösung",
        noResultsTitle: "Keine Ergebnisse",
        emptyText: "Konfigurieren Sie Lösungen in den Unternehmensakten oder fügen Sie eine über dieses Dashboard hinzu.",
        noResultsText: "Passen Sie Filter oder Suche an, um Lösungen anzuzeigen."
      }
    },
    campaigns: {
      eyebrow: "Kampagnen",
      healthLabel: "Kamp.-Gesundheit",
      heroDescOk: "Sensibilisierungs- und Compliance-Kampagnen verfolgen.",
      heroDescIssues: "{count} ausgesetzte Kampagne.",
      heroDescIssuesPlural: "{count} ausgesetzte Kampagnen.",
      searchPlaceholder: "Unternehmen, Kampagne, Typ suchen…",
      campaignCount: "{count} Kampagne",
      campaignCountPlural: "{count} Kampagnen",
      openCampaign: "Öffnen",
      statusFilters: {
        all: "Alle",
        en_preparation: "In Vorbereitung",
        active: "Aktiv",
        suspendue: "Pausiert",
        inactive: "Abgeschlossen"
      },
      totalTitle: "Klicken, um alle Kampagnen anzuzeigen",
      filterTitle: "Klicken zum Filtern: {label}",
      sectionTitle: "Cybersicherheitskampagnen",
      addTitle: "MFA-Kampagne hinzufügen",
      loading: "Kampagnen werden geladen…",
      emptyTitle: "Keine Kampagnen",
      emptyText: "Erstellen Sie Ihre erste Microsoft-MFA-Kampagne",
      emptyCta: "MFA-Kampagne erstellen",
      viewClient: "Unternehmensakte anzeigen",
      rowsPerPage: "Zeilen pro Seite",
      prevPage: "Vorherige Seite",
      nextPage: "Nächste Seite",
      pageInfo: "Seite {page} / {total}",
      table: {
        enterprise: "Unternehmen",
        name: "Name",
        type: "Typ",
        status: "Status",
        startDate: "Startdatum",
        endDate: "Enddatum",
        progress: "Fortschritt",
        createdAt: "Erstellt am"
      },
      types: {
        microsoft_security: "Microsoft-Sicherheit (MFA)",
        cybersecurity_training: "Cybersicherheitsschulung",
        rgpd_audit: "DSGVO-Compliance-Audit",
        penetration_test: "Penetrationstest",
        phishing_simulation: "Phishing-Simulation",
        vulnerability_scan: "Schwachstellen-Scan",
        incident_response: "Incident Response",
        compliance_audit: "Compliance-Audit"
      },
      statuses: {
        en_preparation: "In Vorbereitung",
        active: "Aktiv",
        suspendue: "Pausiert",
        inactive: "Abgeschlossen"
      },
      modal: {
        editTitle: "Kampagne bearbeiten",
        createTitle: "Neue MFA-Kampagne",
        eyebrow: "MFA-Kampagnen",
        createSubtitle: "MFA-Adoptionkampagne auf Basis der Microsoft-Tenant-Daten.",
        editSubtitle: "MFA-Kampagneninformationen bearbeiten.",
        sectionTitle: "Allgemeine Informationen",
        sectionDesc: "Kunde, Name und Typ. MFA-Schritte und Snapshots werden automatisch erstellt.",
        sectionsNavAria: "Abschnitte des Kampagnenformulars",
        footerHint: "Mit * markierte Felder sind Pflichtfelder",
        sections: {
          general: {
            navLabel: "Allgemein",
            navHint: "Unternehmen und Typ",
            title: "Allgemeine Informationen",
            desc: "Wählen Sie das Unternehmen und benennen Sie die Microsoft-MFA-Kampagne."
          },
          dates: {
            navLabel: "Daten",
            navHint: "Kampagnenzeitraum",
            title: "Zeitraum",
            desc: "Legen Sie Start- und Endfenster der Kampagne fest."
          },
          details: {
            navLabel: "Details",
            navHint: "Kontext und Notizen",
            title: "Besonderheiten",
            desc: "Fügen Sie Kontext, Erwartungen oder Einschränkungen hinzu."
          }
        },
        close: "Schließen",
        namePlaceholder: "z. B. MFA-Kampagne Q2 2026",
        enterprise: "Unternehmen *",
        enterpriseSearch: "Unternehmen suchen…",
        noEnterprise: "Kein Unternehmen gefunden",
        name: "Kampagnenname *",
        type: "Typ *",
        provider: "Provider *",
        providerMicrosoft: "Microsoft",
        providerGoogle: "Google Workspace",
        providerOkta: "Okta",
        providerComingSoon: "Dieser Provider wird bald verfügbar sein",
        badgeSoon: "Soon",
        tenant: "Tenant *",
        tenantLoading: "Microsoft-Tenant wird geladen…",
        tenantFallbackLabel: "Microsoft-Tenant",
        needMicrosoftTenant: "Konfigurieren Sie zuerst einen Microsoft Entra-Tenant für dieses Unternehmen, bevor Sie eine MFA-Kampagne erstellen.",
        startDate: "Startdatum",
        endDate: "Enddatum",
        specificity: "Besonderheiten",
        specificityPlaceholder: "Besonderheiten der Kampagne (Kontext, Erwartungen, Einschränkungen…)",
        saveEdit: "Kampagne aktualisieren",
        saveCreate: "Kampagne erstellen",
        status: "Status",
        adoptionGoal: "Adoptionsziel (%)",
        adoptionGoalPlaceholder: "z. B. 90",
        delete: "Löschen",
        deleting: "Wird gelöscht…"
      },
      delete: {
        title: "Kampagne löschen",
        message: "Möchten Sie diese Kampagne wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
        confirmLabel: 'Geben Sie "ICH BESTÄTIGE" ein:',
        confirmPlaceholder: "ICH BESTÄTIGE",
        confirmWord: "ICH BESTÄTIGE"
      },
      toasts: {
        requiredFields: "Kunde, Name und Kampagnentyp sind erforderlich",
        needMicrosoftTenant: "Ein Microsoft Entra-Tenant muss konfiguriert sein, um eine MFA-Kampagne zu erstellen",
        updated: "Kampagne erfolgreich aktualisiert",
        created: "Kampagne erfolgreich erstellt",
        saveError: "Fehler beim Speichern der Kampagne",
        confirmDelete: 'Bitte geben Sie "ICH BESTÄTIGE" ein, um die Löschung zu bestätigen',
        deleted: "Kampagne erfolgreich gelöscht",
        deleteError: "Fehler beim Löschen der Kampagne"
      }
    },
    sync: {
      preparing: "Vorbereitung…",
      none: "Keine Bitdefender-Lizenz zu synchronisieren",
      progress: "Synchronisation {current}/{total} · {name}",
      done: "Fertig",
      success: "Synchronisation abgeschlossen: {success} Lizenz(en) aktualisiert{errors}",
      successErrors: ", {count} Fehler",
      failed: "Synchronisation fehlgeschlagen: {count} Fehler",
      error: "Fehler bei der Synchronisation der Bitdefender-Lizenzen"
    }
  },
  it: {
    eyebrow: "Servizi gestiti",
    pageTitle: "Cybersicurezza",
    subtitle: "Postura di sicurezza · antivirus, antispam e campagne di sensibilizzazione.",
    tabSectionsAria: "Sezioni cybersicurezza",
    proTabSuffix: " · Veritas Pro",
    proFeatureKey: "cyberCampaigns",
    tabs: {
      overview: "Da trattare",
      antivirus: "Antivirus",
      antispam: "Antispam",
      campaigns: "Campagne"
    },
    overview: {
      priorityTitle: "Priorità",
      portfolioAlerts: "{count} avviso sul portafoglio",
      portfolioAlertsPlural: "{count} avvisi sul portafoglio",
      emptyTitle: "Nessun avviso di sicurezza",
      emptyText: "Le soluzioni antivirus e antispam del portafoglio sono in stato nominale.",
      treat: "Gestisci",
      viewFleet: "Vedi parco",
      actions: {
        avExpired: "Antivirus scaduto o inattivo",
        avRenew: "Antivirus da rinnovare",
        avLicenseSoon: "Licenza antivirus in scadenza",
        asExpired: "Antispam scaduto o inattivo",
        asSoon: "Antispam in scadenza",
        campaignSuspended: "Campagna sospesa",
        campaignFallback: "Campagna"
      },
      hexTitle: "Panoramica",
      hexKpi: {
        alerts: "Avvisi",
        avIssues: "Antivirus",
        asIssues: "Antispam",
        campaigns: "Campagne",
        avSolutions: "Sol. AV",
        asSolutions: "Sol. AS",
        health: "Salute (%)"
      },
      kpi: {
        solutions: "Soluzioni",
        enterprises: "Aziende",
        endpoints: "Postazioni",
        licenses: "Licenze",
        users: "Utenti",
        domains: "Domini",
        todo: "Da trattare",
        health: "Salute (%)"
      },
      av: {
        eyebrow: "Antivirus",
        title: "Soluzioni antivirus",
        descEmpty: "Nessuna soluzione antivirus registrata",
        descStats: "{clients} azienda coperta · {providers} fornitore",
        descStatsPlural: "{clients} aziende coperte · {providers} fornitori",
        descStatsClients: "{clients} azienda coperta",
        descStatsClientsPlural: "{clients} aziende coperte",
        descStatsProviders: "{providers} fornitore",
        descStatsProvidersPlural: "{providers} fornitori"
      },
      as: {
        eyebrow: "Antispam",
        title: "Soluzioni antispam",
        descEmpty: "Nessuna soluzione antispam registrata",
        descStats: "{clients} azienda coperta · {providers} fornitore",
        descStatsPlural: "{clients} aziende coperte · {providers} fornitori"
      }
    },
    msp: {
      heroTitle: "Parco multi-azienda",
      statusFilterAria: "Filtro stato",
      providerFilterAria: "Filtro fornitore",
      allProviders: "Tutti i fornitori",
      priorityTitle: "Priorità",
      alertCount: "{count} avviso",
      alertCountPlural: "{count} avvisi",
      solutionCount: "{count} soluzione",
      solutionCountPlural: "{count} soluzioni",
      endpointCount: "{count} postazioni",
      userCount: "{count} utenti",
      renew: "Rinnovare",
      anticipate: "Anticipare",
      expPrefix: "scad.",
      statusAria: "Stato",
      licensesTitle: "{used} / {total} licenze",
      coverageUsers: "{count} utente",
      coverageUsersPlural: "{count} utenti",
      coverageDomains: "{count} dominio",
      coverageDomainsPlural: "{count} domini",
      statusFilters: {
        all: "Tutti",
        actif: "Attivi",
        expire_bientot: "In scadenza",
        inactif: "Inattivi"
      },
      statusMeta: {
        actif: "Attivo",
        expire_bientot: "In scadenza",
        inactif: "Inattivo",
        inconnu: "Non indicato"
      },
      table: {
        enterprise: "Azienda",
        solution: "Soluzione",
        plan: "Piano",
        mode: "Modalità",
        status: "Stato",
        expiration: "Scadenza",
        coverage: "Copertura",
        lastSync: "Ultima sync"
      },
      kpi: {
        solutions: "Soluzioni",
        enterprises: "Aziende",
        active: "Attive",
        todo: "Da trattare"
      },
      antivirus: {
        eyebrow: "Antivirus",
        healthLabel: "Salute AV",
        heroDescOk: "Licenze, copertura e scadenze dei vostri clienti.",
        heroDescIssues: "{count} soluzione da trattare.",
        heroDescIssuesPlural: "{count} soluzioni da trattare.",
        searchPlaceholder: "Cerca azienda, soluzione, fornitore…",
        addTitle: "Aggiungi soluzione antivirus",
        syncTitle: "Sincronizza tenant Bitdefender",
        loading: "Caricamento parco antivirus…",
        emptyTitle: "Nessuna soluzione antivirus",
        noResultsTitle: "Nessun risultato",
        emptyText: "Configurate le soluzioni nelle schede azienda o aggiungetene una da questa dashboard.",
        noResultsText: "Modificate filtri o ricerca per visualizzare le soluzioni."
      },
      antispam: {
        eyebrow: "Antispam",
        healthLabel: "Salute AS",
        heroDescOk: "Copertura, domini protetti e scadenze dei vostri clienti.",
        heroDescIssues: "{count} soluzione da trattare.",
        heroDescIssuesPlural: "{count} soluzioni da trattare.",
        searchPlaceholder: "Cerca azienda, soluzione, fornitore…",
        addTitle: "Aggiungi soluzione antispam",
        syncTitle: "Sincronizza soluzioni antispam",
        loading: "Caricamento parco antispam…",
        emptyTitle: "Nessuna soluzione antispam",
        noResultsTitle: "Nessun risultato",
        emptyText: "Configurate le soluzioni nelle schede azienda o aggiungetene una da questa dashboard.",
        noResultsText: "Modificate filtri o ricerca per visualizzare le soluzioni."
      }
    },
    campaigns: {
      eyebrow: "Campagne",
      healthLabel: "Salute camp.",
      heroDescOk: "Monitoraggio campagne di sensibilizzazione e conformità.",
      heroDescIssues: "{count} campagna sospesa.",
      heroDescIssuesPlural: "{count} campagne sospese.",
      searchPlaceholder: "Cerca azienda, campagna, tipo…",
      campaignCount: "{count} campagna",
      campaignCountPlural: "{count} campagne",
      openCampaign: "Apri",
      statusFilters: {
        all: "Tutte",
        en_preparation: "In preparazione",
        active: "Attive",
        suspendue: "In pausa",
        inactive: "Completate"
      },
      totalTitle: "Clicca per mostrare tutte le campagne",
      filterTitle: "Clicca per filtrare: {label}",
      sectionTitle: "Campagne di cybersicurezza",
      addTitle: "Aggiungi campagna MFA",
      loading: "Caricamento campagne…",
      emptyTitle: "Nessuna campagna",
      emptyText: "Create la vostra prima campagna MFA Microsoft",
      emptyCta: "Crea campagna MFA",
      viewClient: "Vedi scheda cliente",
      rowsPerPage: "Righe per pagina",
      prevPage: "Pagina precedente",
      nextPage: "Pagina successiva",
      pageInfo: "Pagina {page} / {total}",
      table: {
        enterprise: "Azienda",
        name: "Nome",
        type: "Tipo",
        status: "Stato",
        startDate: "Data inizio",
        endDate: "Data fine",
        progress: "Avanzamento",
        createdAt: "Creato il"
      },
      types: {
        microsoft_security: "Sicurezza Microsoft (MFA)",
        cybersecurity_training: "Formazione cybersicurezza",
        rgpd_audit: "Audit conformità GDPR",
        penetration_test: "Test di penetrazione",
        phishing_simulation: "Simulazione phishing",
        vulnerability_scan: "Scansione vulnerabilità",
        incident_response: "Risposta agli incidenti",
        compliance_audit: "Audit di conformità"
      },
      statuses: {
        en_preparation: "In preparazione",
        active: "Attiva",
        suspendue: "In pausa",
        inactive: "Completata"
      },
      modal: {
        editTitle: "Modifica campagna",
        createTitle: "Nuova campagna MFA",
        eyebrow: "Campagne MFA",
        createSubtitle: "Campagna di adozione MFA basata sui dati del tenant Microsoft.",
        editSubtitle: "Modifica le informazioni della campagna MFA.",
        sectionTitle: "Informazioni generali",
        sectionDesc: "Cliente, nome e tipo. Passi MFA e snapshot vengono creati automaticamente.",
        sectionsNavAria: "Sezioni del modulo campagna",
        footerHint: "I campi contrassegnati con * sono obbligatori",
        sections: {
          general: {
            navLabel: "Generale",
            navHint: "Azienda e tipo",
            title: "Informazioni generali",
            desc: "Seleziona l'azienda e assegna un nome alla campagna MFA Microsoft."
          },
          dates: {
            navLabel: "Date",
            navHint: "Periodo campagna",
            title: "Periodo",
            desc: "Definisci la finestra di inizio e fine della campagna."
          },
          details: {
            navLabel: "Dettagli",
            navHint: "Contesto e note",
            title: "Specificità",
            desc: "Aggiungi contesto, aspettative o vincoli della campagna."
          }
        },
        close: "Chiudi",
        namePlaceholder: "Es. Campagna MFA T2 2026",
        enterprise: "Azienda *",
        enterpriseSearch: "Cerca un'azienda…",
        noEnterprise: "Nessuna azienda trovata",
        name: "Nome campagna *",
        type: "Tipo *",
        provider: "Provider *",
        providerMicrosoft: "Microsoft",
        providerGoogle: "Google Workspace",
        providerOkta: "Okta",
        providerComingSoon: "Questo provider sarà presto disponibile",
        badgeSoon: "Soon",
        tenant: "Tenant *",
        tenantLoading: "Caricamento del tenant Microsoft…",
        tenantFallbackLabel: "Tenant Microsoft",
        needMicrosoftTenant: "Configura prima un tenant Microsoft Entra per questa azienda prima di creare una campagna MFA.",
        startDate: "Data di inizio",
        endDate: "Data di fine",
        specificity: "Specificità",
        specificityPlaceholder: "Specificità della campagna (contesto, aspettative, vincoli…)",
        saveEdit: "Aggiorna campagna",
        saveCreate: "Crea campagna",
        status: "Stato",
        adoptionGoal: "Obiettivo di adozione (%)",
        adoptionGoalPlaceholder: "Es. 90",
        delete: "Elimina",
        deleting: "Eliminazione…"
      },
      delete: {
        title: "Elimina campagna",
        message: "Eliminare questa campagna? Questa azione è irreversibile.",
        confirmLabel: 'Digitare "CONFERMO" per validare:',
        confirmPlaceholder: "CONFERMO",
        confirmWord: "CONFERMO"
      },
      toasts: {
        requiredFields: "Cliente, nome e tipo di campagna sono obbligatori",
        needMicrosoftTenant: "Un tenant Microsoft Entra deve essere configurato per creare una campagna MFA",
        updated: "Campagna aggiornata con successo",
        created: "Campagna creata con successo",
        saveError: "Errore durante il salvataggio della campagna",
        confirmDelete: 'Digitare "CONFERMO" per validare l\'eliminazione',
        deleted: "Campagna eliminata con successo",
        deleteError: "Errore durante l'eliminazione della campagna"
      }
    },
    sync: {
      preparing: "Preparazione…",
      none: "Nessuna licenza Bitdefender da sincronizzare",
      progress: "Sincronizzazione {current}/{total} · {name}",
      done: "Completato",
      success: "Sincronizzazione completata: {success} licenza/e aggiornata/e{errors}",
      successErrors: ", {count} errore/i",
      failed: "Sincronizzazione fallita: {count} errore/i",
      error: "Errore durante la sincronizzazione delle licenze Bitdefender"
    }
  },
  es: {
    eyebrow: "Servicios gestionados",
    pageTitle: "Ciberseguridad",
    subtitle: "Postura de seguridad · antivirus, antispam y campañas de concienciación.",
    tabSectionsAria: "Secciones de ciberseguridad",
    proTabSuffix: " · Veritas Pro",
    proFeatureKey: "cyberCampaigns",
    tabs: {
      overview: "Por tratar",
      antivirus: "Antivirus",
      antispam: "Antispam",
      campaigns: "Campañas"
    },
    overview: {
      priorityTitle: "Prioridad",
      portfolioAlerts: "{count} alerta en la cartera",
      portfolioAlertsPlural: "{count} alertas en la cartera",
      emptyTitle: "Sin alertas de seguridad",
      emptyText: "Las soluciones antivirus y antispam de la cartera están en estado nominal.",
      treat: "Gestionar",
      viewFleet: "Ver parque",
      actions: {
        avExpired: "Antivirus caducado o inactivo",
        avRenew: "Antivirus por renovar",
        avLicenseSoon: "Licencia antivirus próxima a caducar",
        asExpired: "Antispam caducado o inactivo",
        asSoon: "Antispam próximo a caducar",
        campaignSuspended: "Campaña suspendida",
        campaignFallback: "Campaña"
      },
      hexTitle: "Resumen",
      hexKpi: {
        alerts: "Alertas",
        avIssues: "Antivirus",
        asIssues: "Antispam",
        campaigns: "Campañas",
        avSolutions: "Sol. AV",
        asSolutions: "Sol. AS",
        health: "Salud (%)"
      },
      kpi: {
        solutions: "Soluciones",
        enterprises: "Empresas",
        endpoints: "Equipos",
        licenses: "Licencias",
        users: "Usuarios",
        domains: "Dominios",
        todo: "Por tratar",
        health: "Salud (%)"
      },
      av: {
        eyebrow: "Antivirus",
        title: "Soluciones antivirus",
        descEmpty: "Ninguna solución antivirus registrada",
        descStats: "{clients} empresa cubierta · {providers} proveedor",
        descStatsPlural: "{clients} empresas cubiertas · {providers} proveedores",
        descStatsClients: "{clients} empresa cubierta",
        descStatsClientsPlural: "{clients} empresas cubiertas",
        descStatsProviders: "{providers} proveedor",
        descStatsProvidersPlural: "{providers} proveedores"
      },
      as: {
        eyebrow: "Antispam",
        title: "Soluciones antispam",
        descEmpty: "Ninguna solución antispam registrada",
        descStats: "{clients} empresa cubierta · {providers} proveedor",
        descStatsPlural: "{clients} empresas cubiertas · {providers} proveedores"
      }
    },
    msp: {
      heroTitle: "Parque multiempresa",
      statusFilterAria: "Filtro de estado",
      providerFilterAria: "Filtro de proveedor",
      allProviders: "Todos los proveedores",
      priorityTitle: "Prioridad",
      alertCount: "{count} alerta",
      alertCountPlural: "{count} alertas",
      solutionCount: "{count} solución",
      solutionCountPlural: "{count} soluciones",
      endpointCount: "{count} equipos",
      userCount: "{count} usuarios",
      renew: "Renovar",
      anticipate: "Anticipar",
      expPrefix: "cad.",
      statusAria: "Estado",
      licensesTitle: "{used} / {total} licencias",
      coverageUsers: "{count} usuario",
      coverageUsersPlural: "{count} usuarios",
      coverageDomains: "{count} dominio",
      coverageDomainsPlural: "{count} dominios",
      statusFilters: {
        all: "Todos",
        actif: "Activos",
        expire_bientot: "Caduca pronto",
        inactif: "Inactivos"
      },
      statusMeta: {
        actif: "Activo",
        expire_bientot: "Caduca pronto",
        inactif: "Inactivo",
        inconnu: "No indicado"
      },
      table: {
        enterprise: "Empresa",
        solution: "Solución",
        plan: "Plan",
        mode: "Modo",
        status: "Estado",
        expiration: "Caducidad",
        coverage: "Cobertura",
        lastSync: "Última sync"
      },
      kpi: {
        solutions: "Soluciones",
        enterprises: "Empresas",
        active: "Activas",
        todo: "Por tratar"
      },
      antivirus: {
        eyebrow: "Antivirus",
        healthLabel: "Salud AV",
        heroDescOk: "Licencias, cobertura y caducidades de sus clientes.",
        heroDescIssues: "{count} solución por tratar.",
        heroDescIssuesPlural: "{count} soluciones por tratar.",
        searchPlaceholder: "Buscar empresa, solución, proveedor…",
        addTitle: "Añadir solución antivirus",
        syncTitle: "Sincronizar tenants Bitdefender",
        loading: "Cargando parque antivirus…",
        emptyTitle: "Ninguna solución antivirus",
        noResultsTitle: "Sin resultados",
        emptyText: "Configure las soluciones en las fichas de empresa o añada una desde este panel.",
        noResultsText: "Ajuste los filtros o la búsqueda para mostrar soluciones."
      },
      antispam: {
        eyebrow: "Antispam",
        healthLabel: "Salud AS",
        heroDescOk: "Cobertura, dominios protegidos y caducidades de sus clientes.",
        heroDescIssues: "{count} solución por tratar.",
        heroDescIssuesPlural: "{count} soluciones por tratar.",
        searchPlaceholder: "Buscar empresa, solución, proveedor…",
        addTitle: "Añadir solución antispam",
        syncTitle: "Sincronizar soluciones antispam",
        loading: "Cargando parque antispam…",
        emptyTitle: "Ninguna solución antispam",
        noResultsTitle: "Sin resultados",
        emptyText: "Configure las soluciones en las fichas de empresa o añada una desde este panel.",
        noResultsText: "Ajuste los filtros o la búsqueda para mostrar soluciones."
      }
    },
    campaigns: {
      eyebrow: "Campañas",
      healthLabel: "Salud camp.",
      heroDescOk: "Seguimiento de campañas de concienciación y conformidad.",
      heroDescIssues: "{count} campaña suspendida.",
      heroDescIssuesPlural: "{count} campañas suspendidas.",
      searchPlaceholder: "Buscar empresa, campaña, tipo…",
      campaignCount: "{count} campaña",
      campaignCountPlural: "{count} campañas",
      openCampaign: "Abrir",
      statusFilters: {
        all: "Todas",
        en_preparation: "En preparación",
        active: "Activas",
        suspendue: "En pausa",
        inactive: "Finalizadas"
      },
      totalTitle: "Clic para mostrar todas las campañas",
      filterTitle: "Clic para filtrar: {label}",
      sectionTitle: "Campañas de ciberseguridad",
      addTitle: "Añadir campaña MFA",
      loading: "Cargando campañas…",
      emptyTitle: "Ninguna campaña",
      emptyText: "Cree su primera campaña MFA Microsoft",
      emptyCta: "Crear campaña MFA",
      viewClient: "Ver ficha cliente",
      rowsPerPage: "Filas por página",
      prevPage: "Página anterior",
      nextPage: "Página siguiente",
      pageInfo: "Página {page} / {total}",
      table: {
        enterprise: "Empresa",
        name: "Nombre",
        type: "Tipo",
        status: "Estado",
        startDate: "Fecha inicio",
        endDate: "Fecha fin",
        progress: "Progreso",
        createdAt: "Creado el"
      },
      types: {
        microsoft_security: "Seguridad Microsoft (MFA)",
        cybersecurity_training: "Formación en ciberseguridad",
        rgpd_audit: "Auditoría conformidad RGPD",
        penetration_test: "Prueba de penetración",
        phishing_simulation: "Simulación de phishing",
        vulnerability_scan: "Escaneo de vulnerabilidades",
        incident_response: "Respuesta a incidentes",
        compliance_audit: "Auditoría de conformidad"
      },
      statuses: {
        en_preparation: "En preparación",
        active: "Activa",
        suspendue: "En pausa",
        inactive: "Finalizada"
      },
      modal: {
        editTitle: "Modificar campaña",
        createTitle: "Nueva campaña MFA",
        eyebrow: "Campañas MFA",
        createSubtitle: "Campaña de adopción MFA basada en los datos del tenant Microsoft.",
        editSubtitle: "Modifique la información de la campaña MFA.",
        sectionTitle: "Información general",
        sectionDesc: "Cliente, nombre y tipo. Los pasos MFA y los snapshots se crean automáticamente.",
        sectionsNavAria: "Secciones del formulario de campaña",
        footerHint: "Los campos marcados con * son obligatorios",
        sections: {
          general: {
            navLabel: "General",
            navHint: "Empresa y tipo",
            title: "Información general",
            desc: "Seleccione la empresa y asigne un nombre a la campaña MFA Microsoft."
          },
          dates: {
            navLabel: "Fechas",
            navHint: "Periodo de campaña",
            title: "Periodo",
            desc: "Defina la ventana de inicio y fin de la campaña."
          },
          details: {
            navLabel: "Detalles",
            navHint: "Contexto y notas",
            title: "Especificidades",
            desc: "Añada contexto, expectativas o restricciones de la campaña."
          }
        },
        close: "Cerrar",
        namePlaceholder: "Ej. Campaña MFA T2 2026",
        enterprise: "Empresa *",
        enterpriseSearch: "Buscar una empresa…",
        noEnterprise: "Ninguna empresa encontrada",
        name: "Nombre de la campaña *",
        type: "Tipo *",
        provider: "Provider *",
        providerMicrosoft: "Microsoft",
        providerGoogle: "Google Workspace",
        providerOkta: "Okta",
        providerComingSoon: "Este provider estará disponible pronto",
        badgeSoon: "Soon",
        tenant: "Tenant *",
        tenantLoading: "Cargando el tenant Microsoft…",
        tenantFallbackLabel: "Tenant Microsoft",
        needMicrosoftTenant: "Configure primero un tenant Microsoft Entra para esta empresa antes de crear una campaña MFA.",
        startDate: "Fecha de inicio",
        endDate: "Fecha de fin",
        specificity: "Especificidad",
        specificityPlaceholder: "Especificidades de la campaña (contexto, expectativas, restricciones…)",
        saveEdit: "Modificar campaña",
        saveCreate: "Crear campaña",
        status: "Estado",
        adoptionGoal: "Objetivo de adopción (%)",
        adoptionGoalPlaceholder: "Ej.: 90",
        delete: "Eliminar",
        deleting: "Eliminando…"
      },
      delete: {
        title: "Eliminar campaña",
        message: "¿Eliminar esta campaña? Esta acción es irreversible.",
        confirmLabel: 'Escriba "CONFIRMO" para validar:',
        confirmPlaceholder: "CONFIRMO",
        confirmWord: "CONFIRMO"
      },
      toasts: {
        requiredFields: "El cliente, el nombre y el tipo de campaña son obligatorios",
        needMicrosoftTenant: "Debe configurarse un tenant Microsoft Entra para crear una campaña MFA",
        updated: "Campaña actualizada correctamente",
        created: "Campaña creada correctamente",
        saveError: "Error al guardar la campaña",
        confirmDelete: 'Escriba "CONFIRMO" para validar la eliminación',
        deleted: "Campaña eliminada correctamente",
        deleteError: "Error al eliminar la campaña"
      }
    },
    sync: {
      preparing: "Preparación…",
      none: "Ninguna licencia Bitdefender que sincronizar",
      progress: "Sincronización {current}/{total} · {name}",
      done: "Terminado",
      success: "Sincronización completada: {success} licencia(s) actualizada(s){errors}",
      successErrors: ", {count} error(es)",
      failed: "Sincronización fallida: {count} error(es)",
      error: "Error al sincronizar las licencias Bitdefender"
    }
  }
};
function buildFleetDescription(stats, section, locale) {
  const t = pickLocaleMessages(CYBERSECURITE_PAGE_COPY, locale);
  const s = t.overview[section];
  if (stats.total <= 0) return s.descEmpty;
  const clients = stats.clients ?? 0;
  const providers = stats.providers ?? 0;
  if (clients > 0 && providers > 0) {
    const template = clients > 1 || providers > 1 ? s.descStatsPlural : s.descStats;
    return interpolate(template, {
      clients: String(clients),
      providers: String(providers)
    });
  }
  return s.descEmpty;
}
export function getCybersecuritePageCopy(locale) {
  const t = pickLocaleMessages(CYBERSECURITE_PAGE_COPY, locale);
  const statusMeta = STATUS_META_KEYS.reduce((acc, key) => {
    const label = t.msp.statusMeta[key];
    const tone = key === "actif" ? "good" : key === "expire_bientot" ? "warn" : key === "inactif" ? "bad" : "neutral";
    acc[key] = {
      label,
      tone
    };
    return acc;
  }, {});
  return {
    ...t,
    locale,
    tabs: TAB_KEYS.map(key => ({
      key,
      label: t.tabs[key],
      icon: TAB_ICONS[key],
      proOnly: key === "campaigns"
    })),
    statusFilters: STATUS_FILTER_IDS.map(id => ({
      id,
      label: t.msp.statusFilters[id]
    })),
    statusMeta,
    campaignTypes: CAMPAIGN_TYPE_KEYS.map(value => ({
      value,
      label: t.campaigns.types[value]
    })),
    campaignStatuses: CAMPAIGN_STATUS_KEYS.map(value => ({
      value,
      label: t.campaigns.statuses[value],
      color: CAMPAIGN_STATUS_COLORS[value]
    })),
    campaignStatusFilters: CAMPAIGN_STATUS_FILTER_IDS.map(id => ({
      id,
      label: t.campaigns.statusFilters[id]
    })),
    getCampaignStatusMeta: status => ({
      label: t.campaigns.statuses[status] || status,
      tone: CAMPAIGN_STATUS_TONES[status] || "neutral"
    }),
    formatPortfolioAlerts: count => interpolate(count === 1 ? t.overview.portfolioAlerts : t.overview.portfolioAlertsPlural, {
      count: String(count)
    }),
    formatAlertCount: count => interpolate(count === 1 ? t.msp.alertCount : t.msp.alertCountPlural, {
      count: String(count)
    }),
    formatSolutionCount: count => interpolate(count === 1 ? t.msp.solutionCount : t.msp.solutionCountPlural, {
      count: String(count)
    }),
    formatEndpointCount: count => interpolate(t.msp.endpointCount, {
      count: String(count)
    }),
    formatUserCount: count => interpolate(t.msp.userCount, {
      count: String(count)
    }),
    formatCoverageUsers: count => interpolate(Number(count) === 1 ? t.msp.coverageUsers : t.msp.coverageUsersPlural, {
      count: String(count)
    }),
    formatCoverageDomains: count => interpolate(Number(count) === 1 ? t.msp.coverageDomains : t.msp.coverageDomainsPlural, {
      count: String(count)
    }),
    formatLicensesTitle: (used, total) => interpolate(t.msp.licensesTitle, {
      used: String(used ?? 0),
      total: String(total)
    }),
    formatHeroIssues: (kind, count) => {
      const section = t.msp[kind];
      const template = count === 1 ? section.heroDescIssues : section.heroDescIssuesPlural;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatAvFleetDescription: stats => buildFleetDescription(stats, "av", locale),
    formatAsFleetDescription: stats => buildFleetDescription(stats, "as", locale),
    getCampaignTypeLabel: type => t.campaigns.types[type] || type,
    getCampaignStatusLabel: status => t.campaigns.statuses[status] || status,
    getStatusMeta: status => statusMeta[status] || statusMeta.inconnu,
    formatCampaignCount: count => interpolate(count === 1 ? t.campaigns.campaignCount : t.campaigns.campaignCountPlural, {
      count: String(count)
    }),
    formatCampaignHeroIssues: count => interpolate(count === 1 ? t.campaigns.heroDescIssues : t.campaigns.heroDescIssuesPlural, {
      count: String(count)
    }),
    formatSyncProgress: (current, total, name) => interpolate(t.sync.progress, {
      current: String(current),
      total: String(total),
      name: name || ""
    }),
    formatSyncSuccess: (success, errorCount) => interpolate(t.sync.success, {
      success: String(success),
      errors: errorCount > 0 ? interpolate(t.sync.successErrors, {
        count: String(errorCount)
      }) : ""
    }),
    formatSyncFailed: count => interpolate(t.sync.failed, {
      count: String(count)
    }),
    formatCampaignPageInfo: (page, total) => interpolate(t.campaigns.pageInfo, {
      page: String(page),
      total: String(total)
    })
  };
}
