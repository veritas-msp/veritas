import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const TAB_KEYS = ["overview", "microsoft", "domain", "ssl"];
const TAB_ICONS = {
  overview: "mdi:lightning-bolt",
  microsoft: "mdi:microsoft-azure",
  domain: "mdi:web",
  ssl: "mdi:certificate-outline"
};
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const SERVICE_PAGE = {
  fr: {
    eyebrow: "Services managés",
    pageTitle: "Cloud IT et services",
    subtitle: "Cloud & SaaS · tenants Microsoft, noms de domaine et certificats SSL.",
    tabSectionsAria: "Sections services",
    tabs: {
      overview: "À traiter",
      microsoft: "Tenant Microsoft",
      domain: "Nom de domaine",
      ssl: "Certificat SSL"
    },
    overview: {
      hexTitle: "Vue d'ensemble",
      hexKpi: {
        alerts: "Alertes",
        inactiveTenants: "Inactifs",
        domains: "Domaines",
        weakMfa: "MFA faible",
        tenants: "Tenants",
        domainTotal: "NDD",
        sslIssues: "SSL",
        sslTotal: "Certificats",
        health: "Santé (%)"
      },
      healthLabel: "Santé cloud",
      eyebrow: "Synthèse",
      heroTitle: "Services cloud",
      heroDescIssues: "{count} point d'attention sur tenants Microsoft, domaines et certificats SSL.",
      heroDescIssuesPlural: "{count} points d'attention sur tenants Microsoft, domaines et certificats SSL.",
      heroDescOk: "Tenants Microsoft et domaines sont à jour sur le portefeuille.",
      kpi: {
        inactiveTenants: "Tenants inactifs",
        domains: "Domaines",
        weakMfa: "MFA faible",
        tenants: "Tenants",
        active: "Actifs",
        inactive: "Inactifs",
        toReview: "À traiter",
        health: "Santé (%)",
        clients: "Entreprises",
        providers: "Registrars",
        domainTotal: "Domaines"
      },
      viewFleet: "Voir le parc",
      microsoft: {
        eyebrow: "Tenant Microsoft",
        title: "Tenants Microsoft",
        descEmpty: "Aucun tenant Microsoft enregistré",
        descStats: "{clients} entreprise couverte",
        descStatsPlural: "{clients} entreprises couvertes"
      },
      domain: {
        eyebrow: "Nom de domaine",
        title: "Noms de domaine",
        descEmpty: "Aucun nom de domaine enregistré",
        descStats: "{clients} entreprise · {providers} registrar",
        descStatsPlural: "{clients} entreprises · {providers} registrars"
      },
      ssl: {
        eyebrow: "Certificat SSL",
        title: "Certificats SSL",
        descEmpty: "Aucun certificat SSL enregistré",
        descStats: "{clients} entreprise · {certificates} certificat",
        descStatsPlural: "{clients} entreprises · {certificates} certificats"
      },
      priorityTitle: "À traiter en priorité",
      emptyTitle: "Aucune alerte services",
      emptyText: "Les tenants Microsoft et les noms de domaine du portefeuille sont dans un état nominal.",
      actionVerb: "Traiter",
      metaMicrosoftTenant: "Tenant Microsoft",
      actions: {
        inactiveTenant: "Tenant Microsoft inactif",
        mfaAdmins: "MFA admins {pct} %",
        secureScore: "Secure Score {pct} %",
        expiredDomain: "Domaine expiré",
        expiringSoon: "Expiration proche",
        expiredSsl: "Certificat SSL expiré",
        expiringSsl: "Certificat SSL bientôt expiré",
        sslError: "Erreur vérification SSL"
      },
      sslStatus: {
        error: "Erreur",
        unknown: "Non vérifié",
        unknownInvalid: "Inconnu",
        expired: "Expiré",
        warning: "Expire bientôt",
        active: "Valide"
      },
      domainStatus: {
        actif: "Actif",
        expiré: "Expiré",
        expire_bientot: "Expire bientôt"
      }
    },
    microsoft: {
      healthLabel: "Santé Microsoft",
      eyebrow: "Tenant Microsoft",
      heroTitle: "Parc multi-entreprises",
      heroDescIssues: "{count} tenant à traiter.",
      heroDescIssuesPlural: "{count} tenants à traiter.",
      heroDescOk: "Identité, licences et sécurité Entra de vos clients.",
      kpi: {
        tenants: "Tenants",
        active: "Actifs",
        inactive: "Inactifs",
        toReview: "À traiter"
      },
      statusFilters: {
        all: "Tous",
        actif: "Actifs",
        inactif: "Inactifs"
      },
      statusFilterAria: "Filtre statut",
      searchPlaceholder: "Rechercher entreprise, tenant…",
      tenantCount: "{count} tenant",
      tenantCountPlural: "{count} tenants",
      addTenant: "Ajouter un tenant Microsoft",
      syncTenants: "Synchroniser les tenants Microsoft",
      priorityTitle: "À traiter en priorité",
      alertCount: "{count} alerte",
      alertCountPlural: "{count} alertes",
      priorityVerbInactive: "Réactiver",
      priorityVerbMfa: "Renforcer",
      priorityVerbScore: "Analyser",
      loading: "Chargement des tenants Microsoft…",
      emptyTitleNone: "Aucun tenant Microsoft",
      emptyTitleNoMatch: "Aucun résultat",
      emptyTextNone: "Configurez les tenants Microsoft dans les fiches clients.",
      emptyTextNoMatch: "Ajustez les filtres ou la recherche pour afficher des tenants.",
      table: {
        stateAria: "État",
        client: "Entreprise",
        status: "Statut",
        tenantId: "Id tenant",
        users: "Nombre d'utilisateurs",
        licenses: "Nombre de licences total",
        secureScore: "Score Entra",
        mfaAdmins: "MFA admins",
        mfaUsers: "MFA non admins",
        lastSync: "Dernière synchronisation"
      },
      status: {
        actif: "Actif",
        inactif: "Inactif"
      },
      viewEnterprise: "Voir la fiche entreprise",
      rowsPerPage: "Lignes par page",
      prevPage: "Page précédente",
      nextPage: "Page suivante",
      pageOf: "Page {current} / {total}",
      showAllTenants: "Afficher tous les tenants",
      filterActive: "Filtrer : Actif",
      filterInactive: "Filtrer : Inactif"
    },
    domain: {
      healthLabel: "Santé NDD",
      eyebrow: "Nom de domaine",
      heroTitle: "Parc multi-entreprises",
      heroDescIssues: "{count} domaine à traiter.",
      heroDescIssuesPlural: "{count} domaines à traiter.",
      heroDescOk: "Registrars, expirations et renouvellements de vos clients.",
      kpi: {
        domains: "Domaines",
        clients: "Entreprises",
        active: "Actifs",
        toReview: "À traiter"
      },
      statusFilters: {
        all: "Tous",
        actif: "Actifs",
        expire_bientot: "Expire bientôt",
        expiré: "Expirés"
      },
      statusMeta: {
        actif: "Actif",
        expire_bientot: "Expire bientôt",
        expiré: "Expiré",
        inconnu: "Non renseigné"
      },
      statusFilterAria: "Filtre statut",
      registrarFilterAria: "Filtre registrar",
      allRegistrars: "Tous registrars",
      searchPlaceholder: "Rechercher entreprise, domaine, registrar…",
      domainCount: "{count} domaine",
      domainCountPlural: "{count} domaines",
      registrarCount: "{count} registrar",
      registrarCountPlural: "{count} registrars",
      addDomain: "Ajouter un nom de domaine",
      syncDomains: "Synchroniser les domaines OVH",
      priorityTitle: "À traiter en priorité",
      alertCount: "{count} alerte",
      alertCountPlural: "{count} alertes",
      priorityVerbRenew: "Renouveler",
      priorityVerbAnticipate: "Anticiper",
      loading: "Chargement du parc domaines…",
      syncing: "Synchronisation des domaines…",
      emptyTitleNone: "Aucun nom de domaine",
      emptyTitleNoMatch: "Aucun résultat",
      emptyTextNone: "Synchronisez depuis OVH ou ajoutez un domaine depuis une fiche entreprise.",
      emptyTextNoMatch: "Ajustez les filtres ou la recherche pour afficher des domaines.",
      table: {
        stateAria: "État",
        client: "Entreprise",
        domain: "Nom de domaine",
        status: "Statut",
        registrar: "Registrar",
        expiration: "Expiration",
        lastSync: "Dernière sync"
      },
      expPrefix: "exp."
    },
    ssl: {
      healthLabel: "Santé SSL",
      eyebrow: "Certificat SSL",
      heroTitle: "Parc multi-entreprises",
      heroDescIssues: "{count} certificat à traiter.",
      heroDescIssuesPlural: "{count} certificats à traiter.",
      heroDescOk: "Surveillance TLS et expirations de vos clients.",
      kpi: {
        certificates: "Certificats",
        clients: "Entreprises",
        active: "Valides",
        toReview: "À traiter"
      },
      statusFilters: {
        all: "Tous",
        active: "Valides",
        warning: "Expire bientôt",
        expired: "Expirés",
        error: "Erreurs",
        unknown: "Non vérifiés"
      },
      statusMeta: {
        active: "Valide",
        warning: "Expire bientôt",
        expired: "Expiré",
        error: "Erreur",
        unknown: "Non vérifié",
        unknownInvalid: "Inconnu"
      },
      statusFilterAria: "Filtre statut",
      searchPlaceholder: "Rechercher entreprise, hôte, émetteur…",
      certificateCount: "{count} certificat",
      certificateCountPlural: "{count} certificats",
      checkAll: "Vérifier tous les certificats SSL",
      priorityTitle: "À traiter en priorité",
      alertCount: "{count} alerte",
      alertCountPlural: "{count} alertes",
      priorityVerbRenew: "Renouveler",
      priorityVerbAnticipate: "Anticiper",
      loading: "Chargement des certificats SSL…",
      checking: "Vérification des certificats…",
      emptyTitleNone: "Aucun certificat SSL",
      emptyTitleNoMatch: "Aucun résultat",
      emptyTextNone: "Ajoutez des certificats SSL depuis les fiches entreprises.",
      emptyTextNoMatch: "Ajustez les filtres ou la recherche pour afficher des certificats.",
      table: {
        stateAria: "État",
        client: "Entreprise",
        hostname: "Hôte",
        status: "Statut",
        issuer: "Émetteur",
        expiration: "Expiration",
        lastChecked: "Dernière vérification"
      },
      expPrefix: "exp."
    },
    toasts: {
      syncMicrosoftStarted: "Synchronisation Microsoft en cours…",
      syncMicrosoftError: "Erreur lors de la synchronisation",
      syncDomainsStarted: "Synchronisation des domaines OVH en cours…",
      syncDomainsError: "Erreur lors de la synchronisation des domaines",
      syncDomainsSuccess: "Synchronisation terminée avec succès",
      domainsLoadError: "Erreur lors du chargement des domaines",
      sslCheckStarted: "Vérification SSL en cours…",
      sslCheckError: "Erreur lors de la vérification SSL",
      sslCheckSuccess: "Vérification SSL terminée",
      sslLoadError: "Erreur lors du chargement des certificats SSL",
      syncPreparing: "Préparation…",
      syncDone: "Terminé"
    }
  },
  en: {
    eyebrow: "Managed services",
    pageTitle: "Cloud IT & Services",
    subtitle: "Cloud & SaaS · Microsoft tenants, domain names and SSL certificates.",
    tabSectionsAria: "Service sections",
    tabs: {
      overview: "To do",
      microsoft: "Microsoft tenant",
      domain: "Domain names",
      ssl: "SSL certificate"
    },
    overview: {
      hexTitle: "Overview",
      hexKpi: {
        alerts: "Alerts",
        inactiveTenants: "Inactive",
        domains: "Domains",
        weakMfa: "Weak MFA",
        tenants: "Tenants",
        domainTotal: "Domains",
        sslIssues: "SSL",
        sslTotal: "Certificates",
        health: "Health (%)"
      },
      healthLabel: "Cloud health",
      eyebrow: "Overview",
      heroTitle: "Cloud services",
      heroDescIssues: "{count} item needs attention across Microsoft tenants, domains and SSL certificates.",
      heroDescIssuesPlural: "{count} items need attention across Microsoft tenants, domains and SSL certificates.",
      heroDescOk: "Microsoft tenants and domains are up to date across the portfolio.",
      kpi: {
        inactiveTenants: "Inactive tenants",
        domains: "Domains",
        weakMfa: "Weak MFA",
        tenants: "Tenants",
        active: "Active",
        inactive: "Inactive",
        toReview: "To review",
        health: "Health (%)",
        clients: "Companies",
        providers: "Registrars",
        domainTotal: "Domains"
      },
      viewFleet: "View fleet",
      microsoft: {
        eyebrow: "Microsoft tenant",
        title: "Microsoft tenants",
        descEmpty: "No Microsoft tenant registered",
        descStats: "{clients} company covered",
        descStatsPlural: "{clients} companies covered"
      },
      domain: {
        eyebrow: "Domain name",
        title: "Domain names",
        descEmpty: "No domain name registered",
        descStats: "{clients} company · {providers} registrar",
        descStatsPlural: "{clients} companies · {providers} registrars"
      },
      ssl: {
        eyebrow: "SSL certificate",
        title: "SSL certificates",
        descEmpty: "No SSL certificate registered",
        descStats: "{clients} company · {certificates} certificate",
        descStatsPlural: "{clients} companies · {certificates} certificates"
      },
      priorityTitle: "Priority actions",
      emptyTitle: "No service alerts",
      emptyText: "Microsoft tenants and domain names in the portfolio are in a nominal state.",
      actionVerb: "Review",
      metaMicrosoftTenant: "Microsoft tenant",
      actions: {
        inactiveTenant: "Inactive Microsoft tenant",
        mfaAdmins: "Admin MFA {pct} %",
        secureScore: "Secure Score {pct} %",
        expiredDomain: "Expired domain",
        expiringSoon: "Expiring soon",
        expiredSsl: "Expired SSL certificate",
        expiringSsl: "SSL certificate expiring soon",
        sslError: "SSL check error"
      },
      sslStatus: {
        error: "Error",
        unknown: "Not checked",
        unknownInvalid: "Unknown",
        expired: "Expired",
        warning: "Expiring soon",
        active: "Valid"
      },
      domainStatus: {
        actif: "Active",
        expiré: "Expired",
        expire_bientot: "Expiring soon"
      }
    },
    microsoft: {
      healthLabel: "Microsoft health",
      eyebrow: "Microsoft tenant",
      heroTitle: "Multi-company fleet",
      heroDescIssues: "{count} tenant needs attention.",
      heroDescIssuesPlural: "{count} tenants need attention.",
      heroDescOk: "Entra identity, licensing, and security for your clients.",
      kpi: {
        tenants: "Tenants",
        active: "Active",
        inactive: "Inactive",
        toReview: "To review"
      },
      statusFilters: {
        all: "All",
        actif: "Active",
        inactif: "Inactive"
      },
      statusFilterAria: "Status filter",
      searchPlaceholder: "Search company, tenant…",
      tenantCount: "{count} tenant",
      tenantCountPlural: "{count} tenants",
      addTenant: "Add a Microsoft tenant",
      syncTenants: "Sync Microsoft tenants",
      priorityTitle: "Priority actions",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alerts",
      priorityVerbInactive: "Reactivate",
      priorityVerbMfa: "Strengthen",
      priorityVerbScore: "Analyze",
      loading: "Loading Microsoft tenants…",
      emptyTitleNone: "No Microsoft tenant",
      emptyTitleNoMatch: "No results",
      emptyTextNone: "Configure Microsoft tenants in company records.",
      emptyTextNoMatch: "Adjust filters or search to display tenants.",
      table: {
        stateAria: "Status",
        client: "Company",
        status: "Status",
        tenantId: "Tenant ID",
        users: "User count",
        licenses: "Total licenses",
        secureScore: "Entra score",
        mfaAdmins: "Admin MFA",
        mfaUsers: "Non-admin MFA",
        lastSync: "Last sync"
      },
      status: {
        actif: "Active",
        inactif: "Inactive"
      },
      viewEnterprise: "View company record",
      rowsPerPage: "Rows per page",
      prevPage: "Previous page",
      nextPage: "Next page",
      pageOf: "Page {current} / {total}",
      showAllTenants: "Show all tenants",
      filterActive: "Filter: Active",
      filterInactive: "Filter: Inactive"
    },
    domain: {
      healthLabel: "Domain health",
      eyebrow: "Domain names",
      heroTitle: "Multi-company fleet",
      heroDescIssues: "{count} domain needs attention.",
      heroDescIssuesPlural: "{count} domains need attention.",
      heroDescOk: "Registrars, expirations, and renewals for your clients.",
      kpi: {
        domains: "Domains",
        clients: "Companies",
        active: "Active",
        toReview: "To review"
      },
      statusFilters: {
        all: "All",
        actif: "Active",
        expire_bientot: "Expiring soon",
        expiré: "Expired"
      },
      statusMeta: {
        actif: "Active",
        expire_bientot: "Expiring soon",
        expiré: "Expired",
        unknown: "Not specified"
      },
      statusFilterAria: "Status filter",
      registrarFilterAria: "Registrar filter",
      allRegistrars: "All registrars",
      searchPlaceholder: "Search company, domain, registrar…",
      domainCount: "{count} domain",
      domainCountPlural: "{count} domains",
      registrarCount: "{count} registrar",
      registrarCountPlural: "{count} registrars",
      addDomain: "Add a domain name",
      syncDomains: "Sync OVH domains",
      priorityTitle: "Priority actions",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alerts",
      priorityVerbRenew: "Renew",
      priorityVerbAnticipate: "Plan ahead",
      loading: "Loading domain fleet…",
      syncing: "Syncing domains…",
      emptyTitleNone: "No domain name",
      emptyTitleNoMatch: "No results",
      emptyTextNone: "Sync from OVH or add a domain from a company record.",
      emptyTextNoMatch: "Adjust filters or search to display domains.",
      table: {
        stateAria: "Status",
        client: "Company",
        domain: "Domain name",
        status: "Status",
        registrar: "Registrar",
        expiration: "Expiration",
        lastSync: "Last sync"
      },
      expPrefix: "exp."
    },
    ssl: {
      healthLabel: "SSL health",
      eyebrow: "SSL certificate",
      heroTitle: "Multi-company fleet",
      heroDescIssues: "{count} certificate needs attention.",
      heroDescIssuesPlural: "{count} certificates need attention.",
      heroDescOk: "TLS monitoring and expirations for your clients.",
      kpi: {
        certificates: "Certificates",
        clients: "Companies",
        active: "Valid",
        toReview: "To review"
      },
      statusFilters: {
        all: "All",
        active: "Valid",
        warning: "Expiring soon",
        expired: "Expired",
        error: "Errors",
        unknown: "Not checked"
      },
      statusMeta: {
        active: "Valid",
        warning: "Expiring soon",
        expired: "Expired",
        error: "Error",
        unknown: "Not checked",
        unknownInvalid: "Unknown"
      },
      statusFilterAria: "Status filter",
      searchPlaceholder: "Search company, host, issuer…",
      certificateCount: "{count} certificate",
      certificateCountPlural: "{count} certificates",
      checkAll: "Check all SSL certificates",
      priorityTitle: "Priority actions",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alerts",
      priorityVerbRenew: "Renew",
      priorityVerbAnticipate: "Anticipate",
      loading: "Loading SSL certificates…",
      checking: "Checking certificates…",
      emptyTitleNone: "No SSL certificate",
      emptyTitleNoMatch: "No results",
      emptyTextNone: "Add SSL certificates from company records.",
      emptyTextNoMatch: "Adjust filters or search to display certificates.",
      table: {
        stateAria: "Status",
        client: "Company",
        hostname: "Host",
        status: "Status",
        issuer: "Issuer",
        expiration: "Expiration",
        lastChecked: "Last check"
      },
      expPrefix: "exp."
    },
    toasts: {
      syncMicrosoftStarted: "Microsoft sync in progress…",
      syncMicrosoftError: "Sync failed",
      syncDomainsStarted: "OVH domain sync in progress…",
      syncDomainsError: "Domain sync failed",
      syncDomainsSuccess: "Sync completed successfully",
      domainsLoadError: "Failed to load domains",
      sslCheckStarted: "SSL check in progress…",
      sslCheckError: "SSL check failed",
      sslCheckSuccess: "SSL check completed",
      sslLoadError: "Failed to load SSL certificates",
      syncPreparing: "Preparing…",
      syncDone: "Done"
    }
  },
  de: {
    eyebrow: "Managed Services",
    pageTitle: "Cloud IT & Services",
    subtitle: "Cloud & SaaS · Microsoft-Mandanten, Domains und SSL-Zertifikate.",
    tabSectionsAria: "Dienstebereiche",
    tabs: {
      overview: "Zu erledigen",
      microsoft: "Microsoft-Mandant",
      domain: "Domainnamen",
      ssl: "SSL-Zertifikat"
    },
    overview: {
      hexTitle: "Übersicht",
      hexKpi: {
        alerts: "Alarme",
        inactiveTenants: "Inaktiv",
        domains: "Domains",
        weakMfa: "Schwaches MFA",
        tenants: "Mandanten",
        domainTotal: "Domains",
        sslIssues: "SSL",
        sslTotal: "Zertifikate",
        health: "Gesundheit (%)"
      },
      healthLabel: "Cloud-Gesundheit",
      eyebrow: "Übersicht",
      heroTitle: "Cloud-Dienste",
      heroDescIssues: "{count} Hinweis zu Microsoft-Mandanten, Domains und SSL-Zertifikaten.",
      heroDescIssuesPlural: "{count} Hinweise zu Microsoft-Mandanten, Domains und SSL-Zertifikaten.",
      heroDescOk: "Microsoft-Mandanten und Domains sind im Portfolio aktuell.",
      kpi: {
        inactiveTenants: "Inaktive Mandanten",
        domains: "Domains",
        weakMfa: "Schwaches MFA",
        tenants: "Mandanten",
        active: "Aktiv",
        inactive: "Inaktiv",
        toReview: "Zu prüfen",
        health: "Gesundheit (%)",
        clients: "Unternehmen",
        providers: "Registrare",
        domainTotal: "Domains"
      },
      viewFleet: "Bestand anzeigen",
      microsoft: {
        eyebrow: "Microsoft-Mandant",
        title: "Microsoft-Mandanten",
        descEmpty: "Kein Microsoft-Mandant registriert",
        descStats: "{clients} Unternehmen abgedeckt",
        descStatsPlural: "{clients} Unternehmen abgedeckt"
      },
      domain: {
        eyebrow: "Domainname",
        title: "Domainnamen",
        descEmpty: "Kein Domainname registriert",
        descStats: "{clients} Unternehmen · {providers} Registrar",
        descStatsPlural: "{clients} Unternehmen · {providers} Registrare"
      },
      ssl: {
        eyebrow: "SSL-Zertifikat",
        title: "SSL-Zertifikate",
        descEmpty: "Kein SSL-Zertifikat registriert",
        descStats: "{clients} Unternehmen · {certificates} Zertifikat",
        descStatsPlural: "{clients} Unternehmen · {certificates} Zertifikate"
      },
      priorityTitle: "Vorrangig bearbeiten",
      emptyTitle: "Keine Service-Warnungen",
      emptyText: "Microsoft-Mandanten und Domains im Portfolio sind unauffällig.",
      actionVerb: "Bearbeiten",
      metaMicrosoftTenant: "Microsoft-Mandant",
      actions: {
        inactiveTenant: "Inaktiver Microsoft-Mandant",
        mfaAdmins: "Admin-MFA {pct} %",
        secureScore: "Secure Score {pct} %",
        expiredDomain: "Abgelaufene Domain",
        expiringSoon: "Läuft bald ab",
        expiredSsl: "Abgelaufenes SSL-Zertifikat",
        expiringSsl: "SSL-Zertifikat läuft bald ab",
        sslError: "SSL-Prüffehler"
      },
      sslStatus: {
        error: "Fehler",
        unknown: "Nicht geprüft",
        unknownInvalid: "Unbekannt",
        expired: "Abgelaufen",
        warning: "Läuft bald ab",
        active: "Gültig"
      },
      domainStatus: {
        actif: "Aktiv",
        expiré: "Abgelaufen",
        expire_bientot: "Läuft bald ab"
      }
    },
    microsoft: {
      healthLabel: "Microsoft-Gesundheit",
      eyebrow: "Microsoft-Mandant",
      heroTitle: "Multi-Unternehmen-Flotte",
      heroDescIssues: "{count} Mandant zu bearbeiten.",
      heroDescIssuesPlural: "{count} Mandanten zu bearbeiten.",
      heroDescOk: "Entra-Identität, Lizenzen und Sicherheit Ihrer Kunden.",
      kpi: {
        tenants: "Mandanten",
        active: "Aktiv",
        inactive: "Inaktiv",
        toReview: "Zu prüfen"
      },
      statusFilters: {
        all: "Alle",
        actif: "Aktiv",
        inactif: "Inaktiv"
      },
      statusFilterAria: "Statusfilter",
      searchPlaceholder: "Unternehmen, Mandant suchen…",
      tenantCount: "{count} Mandant",
      tenantCountPlural: "{count} Mandanten",
      addTenant: "Microsoft-Mandant hinzufügen",
      syncTenants: "Microsoft-Mandanten synchronisieren",
      priorityTitle: "Vorrangig bearbeiten",
      alertCount: "{count} Warnung",
      alertCountPlural: "{count} Warnungen",
      priorityVerbInactive: "Reaktivieren",
      priorityVerbMfa: "Stärken",
      priorityVerbScore: "Analysieren",
      loading: "Microsoft-Mandanten werden geladen…",
      emptyTitleNone: "Kein Microsoft-Mandant",
      emptyTitleNoMatch: "Keine Ergebnisse",
      emptyTextNone: "Konfigurieren Sie Microsoft-Mandanten in den Unternehmensakten.",
      emptyTextNoMatch: "Filter oder Suche anpassen, um Mandanten anzuzeigen.",
      table: {
        stateAria: "Status",
        client: "Unternehmen",
        status: "Status",
        tenantId: "Mandanten-ID",
        users: "Benutzeranzahl",
        licenses: "Lizenzen gesamt",
        secureScore: "Entra-Score",
        mfaAdmins: "Admin-MFA",
        mfaUsers: "Nicht-Admin-MFA",
        lastSync: "Letzte Synchronisation"
      },
      status: {
        actif: "Aktiv",
        inactif: "Inaktiv"
      },
      viewEnterprise: "Unternehmensakte anzeigen",
      rowsPerPage: "Zeilen pro Seite",
      prevPage: "Vorherige Seite",
      nextPage: "Nächste Seite",
      pageOf: "Seite {current} / {total}",
      showAllTenants: "Alle Mandanten anzeigen",
      filterActive: "Filter: Aktiv",
      filterInactive: "Filter: Inaktiv"
    },
    domain: {
      healthLabel: "Domain-Gesundheit",
      eyebrow: "Domainname",
      heroTitle: "Multi-Unternehmen-Flotte",
      heroDescIssues: "{count} Domain zu bearbeiten.",
      heroDescIssuesPlural: "{count} Domains zu bearbeiten.",
      heroDescOk: "Registrar, Ablauf und Verlängerungen Ihrer Kunden.",
      kpi: {
        domains: "Domains",
        clients: "Unternehmen",
        active: "Aktiv",
        toReview: "Zu prüfen"
      },
      statusFilters: {
        all: "Alle",
        actif: "Aktiv",
        expire_bientot: "Läuft bald ab",
        expiré: "Abgelaufen"
      },
      statusMeta: {
        actif: "Aktiv",
        expire_bientot: "Läuft bald ab",
        expiré: "Abgelaufen",
        inconnu: "Nicht angegeben"
      },
      statusFilterAria: "Statusfilter",
      registrarFilterAria: "Registrar-Filter",
      allRegistrars: "Alle Registrar",
      searchPlaceholder: "Unternehmen, Domain, Registrar suchen…",
      domainCount: "{count} Domain",
      domainCountPlural: "{count} Domains",
      registrarCount: "{count} Registrar",
      registrarCountPlural: "{count} Registrar",
      addDomain: "Domainname hinzufügen",
      syncDomains: "OVH-Domains synchronisieren",
      priorityTitle: "Vorrangig bearbeiten",
      alertCount: "{count} Warnung",
      alertCountPlural: "{count} Warnungen",
      priorityVerbRenew: "Verlängern",
      priorityVerbAnticipate: "Vorausplanen",
      loading: "Domain-Flotte wird geladen…",
      syncing: "Domains werden synchronisiert…",
      emptyTitleNone: "Kein Domainname",
      emptyTitleNoMatch: "Keine Ergebnisse",
      emptyTextNone: "Von OVH synchronisieren oder Domain in einer Unternehmensakte hinzufügen.",
      emptyTextNoMatch: "Filter oder Suche anpassen, um Domains anzuzeigen.",
      table: {
        stateAria: "Status",
        client: "Unternehmen",
        domain: "Domainname",
        status: "Status",
        registrar: "Registrar",
        expiration: "Ablauf",
        lastSync: "Letzte Sync"
      },
      expPrefix: "Abl."
    },
    ssl: {
      healthLabel: "SSL-Gesundheit",
      eyebrow: "SSL-Zertifikat",
      heroTitle: "Multi-Unternehmen-Flotte",
      heroDescIssues: "{count} Zertifikat zu bearbeiten.",
      heroDescIssuesPlural: "{count} Zertifikate zu bearbeiten.",
      heroDescOk: "TLS-Überwachung und Abläufe Ihrer Kunden.",
      kpi: {
        certificates: "Zertifikate",
        clients: "Unternehmen",
        active: "Gültig",
        toReview: "Zu prüfen"
      },
      statusFilters: {
        all: "Alle",
        active: "Gültig",
        warning: "Läuft bald ab",
        expired: "Abgelaufen",
        error: "Fehler",
        unknown: "Nicht geprüft"
      },
      statusMeta: {
        active: "Gültig",
        warning: "Läuft bald ab",
        expired: "Abgelaufen",
        error: "Fehler",
        unknown: "Nicht geprüft",
        unknownInvalid: "Unbekannt"
      },
      statusFilterAria: "Statusfilter",
      searchPlaceholder: "Unternehmen, Host, Aussteller suchen…",
      certificateCount: "{count} Zertifikat",
      certificateCountPlural: "{count} Zertifikate",
      checkAll: "Alle SSL-Zertifikate prüfen",
      priorityTitle: "Vorrangig bearbeiten",
      alertCount: "{count} Warnung",
      alertCountPlural: "{count} Warnungen",
      priorityVerbRenew: "Verlängern",
      priorityVerbAnticipate: "Vorausplanen",
      loading: "SSL-Zertifikate werden geladen…",
      checking: "Zertifikate werden geprüft…",
      emptyTitleNone: "Kein SSL-Zertifikat",
      emptyTitleNoMatch: "Keine Ergebnisse",
      emptyTextNone: "SSL-Zertifikate in den Unternehmensakten hinzufügen.",
      emptyTextNoMatch: "Filter oder Suche anpassen, um Zertifikate anzuzeigen.",
      table: {
        stateAria: "Status",
        client: "Unternehmen",
        hostname: "Host",
        status: "Status",
        issuer: "Aussteller",
        expiration: "Ablauf",
        lastChecked: "Letzte Prüfung"
      },
      expPrefix: "Abl."
    },
    toasts: {
      syncMicrosoftStarted: "Microsoft-Synchronisation läuft…",
      syncMicrosoftError: "Synchronisation fehlgeschlagen",
      syncDomainsStarted: "OVH-Domain-Synchronisation läuft…",
      syncDomainsError: "Domain-Synchronisation fehlgeschlagen",
      syncDomainsSuccess: "Synchronisation erfolgreich abgeschlossen",
      domainsLoadError: "Domains konnten nicht geladen werden",
      sslCheckStarted: "SSL-Prüfung läuft…",
      sslCheckError: "SSL-Prüfung fehlgeschlagen",
      sslCheckSuccess: "SSL-Prüfung abgeschlossen",
      sslLoadError: "SSL-Zertifikate konnten nicht geladen werden",
      syncPreparing: "Vorbereitung…",
      syncDone: "Fertig"
    }
  },
  it: {
    eyebrow: "Servizi gestiti",
    pageTitle: "Cloud IT e servizi",
    subtitle: "Cloud e SaaS · tenant Microsoft, domini e certificati SSL.",
    tabSectionsAria: "Sezioni servizi",
    tabs: {
      overview: "Da trattare",
      microsoft: "Tenant Microsoft",
      domain: "Nomi di dominio",
      ssl: "Certificato SSL"
    },
    overview: {
      hexTitle: "Panoramica",
      hexKpi: {
        alerts: "Avvisi",
        inactiveTenants: "Inattivi",
        domains: "Domini",
        weakMfa: "MFA debole",
        tenants: "Tenant",
        domainTotal: "Domini",
        sslIssues: "SSL",
        sslTotal: "Certificati",
        health: "Salute (%)"
      },
      healthLabel: "Salute cloud",
      eyebrow: "Sintesi",
      heroTitle: "Servizi cloud",
      heroDescIssues: "{count} punto di attenzione su tenant Microsoft, domini e certificati SSL.",
      heroDescIssuesPlural: "{count} punti di attenzione su tenant Microsoft, domini e certificati SSL.",
      heroDescOk: "Tenant Microsoft e domini sono aggiornati nel portafoglio.",
      kpi: {
        inactiveTenants: "Tenant inattivi",
        domains: "Domini",
        weakMfa: "MFA debole",
        tenants: "Tenant",
        active: "Attivi",
        inactive: "Inattivi",
        toReview: "Da trattare",
        health: "Salute (%)",
        clients: "Aziende",
        providers: "Registrar",
        domainTotal: "Domini"
      },
      viewFleet: "Vedi parco",
      microsoft: {
        eyebrow: "Tenant Microsoft",
        title: "Tenant Microsoft",
        descEmpty: "Nessun tenant Microsoft registrato",
        descStats: "{clients} azienda coperta",
        descStatsPlural: "{clients} aziende coperte"
      },
      domain: {
        eyebrow: "Nome di dominio",
        title: "Nomi di dominio",
        descEmpty: "Nessun nome di dominio registrato",
        descStats: "{clients} azienda · {providers} registrar",
        descStatsPlural: "{clients} aziende · {providers} registrar"
      },
      ssl: {
        eyebrow: "Certificato SSL",
        title: "Certificati SSL",
        descEmpty: "Nessun certificato SSL registrato",
        descStats: "{clients} azienda · {certificates} certificato",
        descStatsPlural: "{clients} aziende · {certificates} certificati"
      },
      priorityTitle: "Da trattare in priorità",
      emptyTitle: "Nessun avviso servizi",
      emptyText: "Tenant Microsoft e domini del portafoglio sono in stato nominale.",
      actionVerb: "Gestire",
      metaMicrosoftTenant: "Tenant Microsoft",
      actions: {
        inactiveTenant: "Tenant Microsoft inattivo",
        mfaAdmins: "MFA admin {pct} %",
        secureScore: "Secure Score {pct} %",
        expiredDomain: "Dominio scaduto",
        expiringSoon: "Scadenza imminente",
        expiredSsl: "Certificato SSL scaduto",
        expiringSsl: "Certificato SSL in scadenza",
        sslError: "Errore verifica SSL"
      },
      sslStatus: {
        error: "Errore",
        unknown: "Non verificato",
        unknownInvalid: "Sconosciuto",
        expired: "Scaduto",
        warning: "In scadenza",
        active: "Valido"
      },
      domainStatus: {
        actif: "Attivo",
        expiré: "Scaduto",
        expire_bientot: "In scadenza"
      }
    },
    microsoft: {
      healthLabel: "Salute Microsoft",
      eyebrow: "Tenant Microsoft",
      heroTitle: "Parco multi-azienda",
      heroDescIssues: "{count} tenant da trattare.",
      heroDescIssuesPlural: "{count} tenant da trattare.",
      heroDescOk: "Identità, licenze e sicurezza Entra dei clienti.",
      kpi: {
        tenants: "Tenant",
        active: "Attivi",
        inactive: "Inattivi",
        toReview: "Da trattare"
      },
      statusFilters: {
        all: "Tutti",
        actif: "Attivi",
        inactif: "Inattivi"
      },
      statusFilterAria: "Filtro stato",
      searchPlaceholder: "Cerca azienda, tenant…",
      tenantCount: "{count} tenant",
      tenantCountPlural: "{count} tenant",
      addTenant: "Aggiungi tenant Microsoft",
      syncTenants: "Sincronizza tenant Microsoft",
      priorityTitle: "Da trattare in priorità",
      alertCount: "{count} avviso",
      alertCountPlural: "{count} avvisi",
      priorityVerbInactive: "Riattivare",
      priorityVerbMfa: "Rafforzare",
      priorityVerbScore: "Analizzare",
      loading: "Caricamento tenant Microsoft…",
      emptyTitleNone: "Nessun tenant Microsoft",
      emptyTitleNoMatch: "Nessun risultato",
      emptyTextNone: "Configura i tenant Microsoft nelle schede azienda.",
      emptyTextNoMatch: "Modifica filtri o ricerca per visualizzare i tenant.",
      table: {
        stateAria: "Stato",
        client: "Azienda",
        status: "Stato",
        tenantId: "Id tenant",
        users: "Numero utenti",
        licenses: "Licenze totali",
        secureScore: "Punteggio Entra",
        mfaAdmins: "MFA admin",
        mfaUsers: "MFA non admin",
        lastSync: "Ultima sincronizzazione"
      },
      status: {
        actif: "Attivo",
        inactif: "Inattivo"
      },
      viewEnterprise: "Vedi scheda azienda",
      rowsPerPage: "Righe per pagina",
      prevPage: "Pagina precedente",
      nextPage: "Pagina successiva",
      pageOf: "Pagina {current} / {total}",
      showAllTenants: "Mostra tutti i tenant",
      filterActive: "Filtra: Attivo",
      filterInactive: "Filtra: Inattivo"
    },
    domain: {
      healthLabel: "Salute domini",
      eyebrow: "Nome di dominio",
      heroTitle: "Parco multi-azienda",
      heroDescIssues: "{count} dominio da trattare.",
      heroDescIssuesPlural: "{count} domini da trattare.",
      heroDescOk: "Registrar, scadenze e rinnovi dei clienti.",
      kpi: {
        domains: "Domini",
        clients: "Aziende",
        active: "Attivi",
        toReview: "Da trattare"
      },
      statusFilters: {
        all: "Tutti",
        actif: "Attivi",
        expire_bientot: "In scadenza",
        expiré: "Scaduti"
      },
      statusMeta: {
        actif: "Attivo",
        expire_bientot: "In scadenza",
        expiré: "Scaduto",
        inconnu: "Non indicato"
      },
      statusFilterAria: "Filtro stato",
      registrarFilterAria: "Filtro registrar",
      allRegistrars: "Tutti i registrar",
      searchPlaceholder: "Cerca azienda, dominio, registrar…",
      domainCount: "{count} dominio",
      domainCountPlural: "{count} domini",
      registrarCount: "{count} registrar",
      registrarCountPlural: "{count} registrar",
      addDomain: "Aggiungi nome di dominio",
      syncDomains: "Sincronizza domini OVH",
      priorityTitle: "Da trattare in priorità",
      alertCount: "{count} avviso",
      alertCountPlural: "{count} avvisi",
      priorityVerbRenew: "Rinnovare",
      priorityVerbAnticipate: "Anticipare",
      loading: "Caricamento parco domini…",
      syncing: "Sincronizzazione domini…",
      emptyTitleNone: "Nessun nome di dominio",
      emptyTitleNoMatch: "Nessun risultato",
      emptyTextNone: "Sincronizza da OVH o aggiungi un dominio da una scheda azienda.",
      emptyTextNoMatch: "Modifica filtri o ricerca per visualizzare i domini.",
      table: {
        stateAria: "Stato",
        client: "Azienda",
        domain: "Nome di dominio",
        status: "Stato",
        registrar: "Registrar",
        expiration: "Scadenza",
        lastSync: "Ultima sync"
      },
      expPrefix: "scad."
    },
    ssl: {
      healthLabel: "Salute SSL",
      eyebrow: "Certificato SSL",
      heroTitle: "Parco multi-azienda",
      heroDescIssues: "{count} certificato da trattare.",
      heroDescIssuesPlural: "{count} certificati da trattare.",
      heroDescOk: "Monitoraggio TLS e scadenze dei clienti.",
      kpi: {
        certificates: "Certificati",
        clients: "Aziende",
        active: "Validi",
        toReview: "Da trattare"
      },
      statusFilters: {
        all: "Tutti",
        active: "Validi",
        warning: "In scadenza",
        expired: "Scaduti",
        error: "Errori",
        unknown: "Non verificati"
      },
      statusMeta: {
        active: "Valido",
        warning: "In scadenza",
        expired: "Scaduto",
        error: "Errore",
        unknown: "Non verificato",
        unknownInvalid: "Sconosciuto"
      },
      statusFilterAria: "Filtro stato",
      searchPlaceholder: "Cerca azienda, host, emittente…",
      certificateCount: "{count} certificato",
      certificateCountPlural: "{count} certificati",
      checkAll: "Verifica tutti i certificati SSL",
      priorityTitle: "Da trattare in priorità",
      alertCount: "{count} avviso",
      alertCountPlural: "{count} avvisi",
      priorityVerbRenew: "Rinnovare",
      priorityVerbAnticipate: "Anticipare",
      loading: "Caricamento certificati SSL…",
      checking: "Verifica certificati…",
      emptyTitleNone: "Nessun certificato SSL",
      emptyTitleNoMatch: "Nessun risultato",
      emptyTextNone: "Aggiungi certificati SSL dalle schede azienda.",
      emptyTextNoMatch: "Modifica filtri o ricerca per visualizzare i certificati.",
      table: {
        stateAria: "Stato",
        client: "Azienda",
        hostname: "Host",
        status: "Stato",
        issuer: "Emittente",
        expiration: "Scadenza",
        lastChecked: "Ultima verifica"
      },
      expPrefix: "scad."
    },
    toasts: {
      syncMicrosoftStarted: "Sincronizzazione Microsoft in corso…",
      syncMicrosoftError: "Errore durante la sincronizzazione",
      syncDomainsStarted: "Sincronizzazione domini OVH in corso…",
      syncDomainsError: "Errore sincronizzazione domini",
      syncDomainsSuccess: "Sincronizzazione completata",
      domainsLoadError: "Errore caricamento domini",
      sslCheckStarted: "Verifica SSL in corso…",
      sslCheckError: "Errore verifica SSL",
      sslCheckSuccess: "Verifica SSL completata",
      sslLoadError: "Errore caricamento certificati SSL",
      syncPreparing: "Preparazione…",
      syncDone: "Completato"
    }
  },
  es: {
    eyebrow: "Servicios gestionados",
    pageTitle: "Cloud IT y servicios",
    subtitle: "Cloud y SaaS · tenants Microsoft, dominios y certificados SSL.",
    tabSectionsAria: "Secciones de servicios",
    tabs: {
      overview: "Por tratar",
      microsoft: "Tenant Microsoft",
      domain: "Nombres de dominio",
      ssl: "Certificado SSL"
    },
    overview: {
      hexTitle: "Resumen",
      hexKpi: {
        alerts: "Alertas",
        inactiveTenants: "Inactivos",
        domains: "Dominios",
        weakMfa: "MFA débil",
        tenants: "Tenants",
        domainTotal: "Dominios",
        sslIssues: "SSL",
        sslTotal: "Certificados",
        health: "Salud (%)"
      },
      healthLabel: "Salud cloud",
      eyebrow: "Resumen",
      heroTitle: "Servicios cloud",
      heroDescIssues: "{count} punto de atención en tenants Microsoft, dominios y certificados SSL.",
      heroDescIssuesPlural: "{count} puntos de atención en tenants Microsoft, dominios y certificados SSL.",
      heroDescOk: "Los tenants Microsoft y dominios están al día en la cartera.",
      kpi: {
        inactiveTenants: "Tenants inactivos",
        domains: "Dominios",
        weakMfa: "MFA débil",
        tenants: "Tenants",
        active: "Activos",
        inactive: "Inactivos",
        toReview: "Por tratar",
        health: "Salud (%)",
        clients: "Empresas",
        providers: "Registradores",
        domainTotal: "Dominios"
      },
      viewFleet: "Ver parque",
      microsoft: {
        eyebrow: "Tenant Microsoft",
        title: "Tenants Microsoft",
        descEmpty: "Ningún tenant Microsoft registrado",
        descStats: "{clients} empresa cubierta",
        descStatsPlural: "{clients} empresas cubiertas"
      },
      domain: {
        eyebrow: "Nombre de dominio",
        title: "Nombres de dominio",
        descEmpty: "Ningún nombre de dominio registrado",
        descStats: "{clients} empresa · {providers} registrador",
        descStatsPlural: "{clients} empresas · {providers} registradores"
      },
      ssl: {
        eyebrow: "Certificado SSL",
        title: "Certificados SSL",
        descEmpty: "Ningún certificado SSL registrado",
        descStats: "{clients} empresa · {certificates} certificado",
        descStatsPlural: "{clients} empresas · {certificates} certificados"
      },
      priorityTitle: "Por tratar con prioridad",
      emptyTitle: "Sin alertas de servicios",
      emptyText: "Los tenants Microsoft y dominios de la cartera están en estado nominal.",
      actionVerb: "Gestionar",
      metaMicrosoftTenant: "Tenant Microsoft",
      actions: {
        inactiveTenant: "Tenant Microsoft inactivo",
        mfaAdmins: "MFA admins {pct} %",
        secureScore: "Secure Score {pct} %",
        expiredDomain: "Dominio caducado",
        expiringSoon: "Caduca pronto",
        expiredSsl: "Certificado SSL caducado",
        expiringSsl: "Certificado SSL caduca pronto",
        sslError: "Error de verificación SSL"
      },
      sslStatus: {
        error: "Error",
        unknown: "No verificado",
        unknownInvalid: "Desconocido",
        expired: "Caducado",
        warning: "Caduca pronto",
        active: "Válido"
      },
      domainStatus: {
        actif: "Activo",
        expiré: "Caducado",
        expire_bientot: "Caduca pronto"
      }
    },
    microsoft: {
      healthLabel: "Salud Microsoft",
      eyebrow: "Tenant Microsoft",
      heroTitle: "Parque multiempresa",
      heroDescIssues: "{count} tenant por tratar.",
      heroDescIssuesPlural: "{count} tenants por tratar.",
      heroDescOk: "Identidad, licencias y seguridad Entra de sus clientes.",
      kpi: {
        tenants: "Tenants",
        active: "Activos",
        inactive: "Inactivos",
        toReview: "Por tratar"
      },
      statusFilters: {
        all: "Todos",
        actif: "Activos",
        inactif: "Inactivos"
      },
      statusFilterAria: "Filtro de estado",
      searchPlaceholder: "Buscar empresa, tenant…",
      tenantCount: "{count} tenant",
      tenantCountPlural: "{count} tenants",
      addTenant: "Añadir tenant Microsoft",
      syncTenants: "Sincronizar tenants Microsoft",
      priorityTitle: "Por tratar con prioridad",
      alertCount: "{count} alerta",
      alertCountPlural: "{count} alertas",
      priorityVerbInactive: "Reactivar",
      priorityVerbMfa: "Reforzar",
      priorityVerbScore: "Analizar",
      loading: "Cargando tenants Microsoft…",
      emptyTitleNone: "Ningún tenant Microsoft",
      emptyTitleNoMatch: "Sin resultados",
      emptyTextNone: "Configure los tenants Microsoft en las fichas de empresa.",
      emptyTextNoMatch: "Ajuste filtros o búsqueda para mostrar tenants.",
      table: {
        stateAria: "Estado",
        client: "Empresa",
        status: "Estado",
        tenantId: "Id tenant",
        users: "Número de usuarios",
        licenses: "Licencias totales",
        secureScore: "Puntuación Entra",
        mfaAdmins: "MFA admins",
        mfaUsers: "MFA no admins",
        lastSync: "Última sincronización"
      },
      status: {
        actif: "Activo",
        inactif: "Inactivo"
      },
      viewEnterprise: "Ver ficha de empresa",
      rowsPerPage: "Filas por página",
      prevPage: "Página anterior",
      nextPage: "Página siguiente",
      pageOf: "Página {current} / {total}",
      showAllTenants: "Mostrar todos los tenants",
      filterActive: "Filtrar: Activo",
      filterInactive: "Filtrar: Inactivo"
    },
    domain: {
      healthLabel: "Salud dominios",
      eyebrow: "Nombre de dominio",
      heroTitle: "Parque multiempresa",
      heroDescIssues: "{count} dominio por tratar.",
      heroDescIssuesPlural: "{count} dominios por tratar.",
      heroDescOk: "Registrars, caducidades y renovaciones de sus clientes.",
      kpi: {
        domains: "Dominios",
        clients: "Empresas",
        active: "Activos",
        toReview: "Por tratar"
      },
      statusFilters: {
        all: "Todos",
        actif: "Activos",
        expire_bientot: "Caduca pronto",
        expiré: "Caducados"
      },
      statusMeta: {
        actif: "Activo",
        expire_bientot: "Caduca pronto",
        expiré: "Caducado",
        inconnu: "No indicado"
      },
      statusFilterAria: "Filtro de estado",
      registrarFilterAria: "Filtro de registrar",
      allRegistrars: "Todos los registrars",
      searchPlaceholder: "Buscar empresa, dominio, registrar…",
      domainCount: "{count} dominio",
      domainCountPlural: "{count} dominios",
      registrarCount: "{count} registrar",
      registrarCountPlural: "{count} registrars",
      addDomain: "Añadir nombre de dominio",
      syncDomains: "Sincronizar dominios OVH",
      priorityTitle: "Por tratar con prioridad",
      alertCount: "{count} alerta",
      alertCountPlural: "{count} alertas",
      priorityVerbRenew: "Renovar",
      priorityVerbAnticipate: "Anticipar",
      loading: "Cargando parque de dominios…",
      syncing: "Sincronizando dominios…",
      emptyTitleNone: "Ningún nombre de dominio",
      emptyTitleNoMatch: "Sin resultados",
      emptyTextNone: "Sincronice desde OVH o añada un dominio desde una ficha de empresa.",
      emptyTextNoMatch: "Ajuste filtros o búsqueda para mostrar dominios.",
      table: {
        stateAria: "Estado",
        client: "Empresa",
        domain: "Nombre de dominio",
        status: "Estado",
        registrar: "Registrar",
        expiration: "Caducidad",
        lastSync: "Última sync"
      },
      expPrefix: "cad."
    },
    ssl: {
      healthLabel: "Salud SSL",
      eyebrow: "Certificado SSL",
      heroTitle: "Parque multiempresa",
      heroDescIssues: "{count} certificado por tratar.",
      heroDescIssuesPlural: "{count} certificados por tratar.",
      heroDescOk: "Monitorización TLS y caducidades de sus clientes.",
      kpi: {
        certificates: "Certificados",
        clients: "Empresas",
        active: "Válidos",
        toReview: "Por tratar"
      },
      statusFilters: {
        all: "Todos",
        active: "Válidos",
        warning: "Caduca pronto",
        expired: "Caducados",
        error: "Errores",
        unknown: "No verificados"
      },
      statusMeta: {
        active: "Válido",
        warning: "Caduca pronto",
        expired: "Caducado",
        error: "Error",
        unknown: "No verificado",
        unknownInvalid: "Desconocido"
      },
      statusFilterAria: "Filtro de estado",
      searchPlaceholder: "Buscar empresa, host, emisor…",
      certificateCount: "{count} certificado",
      certificateCountPlural: "{count} certificados",
      checkAll: "Verificar todos los certificados SSL",
      priorityTitle: "Por tratar con prioridad",
      alertCount: "{count} alerta",
      alertCountPlural: "{count} alertas",
      priorityVerbRenew: "Renovar",
      priorityVerbAnticipate: "Anticipar",
      loading: "Cargando certificados SSL…",
      checking: "Verificando certificados…",
      emptyTitleNone: "Ningún certificado SSL",
      emptyTitleNoMatch: "Sin resultados",
      emptyTextNone: "Añada certificados SSL desde las fichas de empresa.",
      emptyTextNoMatch: "Ajuste filtros o búsqueda para mostrar certificados.",
      table: {
        stateAria: "Estado",
        client: "Empresa",
        hostname: "Host",
        status: "Estado",
        issuer: "Emisor",
        expiration: "Caducidad",
        lastChecked: "Última verificación"
      },
      expPrefix: "cad."
    },
    toasts: {
      syncMicrosoftStarted: "Sincronización Microsoft en curso…",
      syncMicrosoftError: "Error al sincronizar",
      syncDomainsStarted: "Sincronización de dominios OVH en curso…",
      syncDomainsError: "Error al sincronizar dominios",
      syncDomainsSuccess: "Sincronización completada",
      domainsLoadError: "Error al cargar dominios",
      sslCheckStarted: "Verificación SSL en curso…",
      sslCheckError: "Error al verificar SSL",
      sslCheckSuccess: "Verificación SSL completada",
      sslLoadError: "Error al cargar certificados SSL",
      syncPreparing: "Preparando…",
      syncDone: "Hecho"
    }
  }
};
function pluralPick(count, singular, plural) {
  return count > 1 ? plural : singular;
}
function buildServiceFleetDescription(stats, section, locale) {
  const t = pickLocaleMessages(SERVICE_PAGE, locale);
  const s = t.overview[section];
  if (stats.total <= 0) return s.descEmpty;
  const clients = stats.clients ?? 0;
  const providers = stats.providers ?? 0;
  if (section === "microsoft") {
    const template = clients > 1 ? s.descStatsPlural : s.descStats;
    return interpolate(template, {
      clients: String(clients)
    });
  }
  if (section === "ssl") {
    const certificates = stats.total ?? 0;
    const template = clients > 1 || certificates > 1 ? s.descStatsPlural : s.descStats;
    return interpolate(template, {
      clients: String(clients),
      certificates: String(certificates)
    });
  }
  if (clients > 0 && providers > 0) {
    const template = clients > 1 || providers > 1 ? s.descStatsPlural : s.descStats;
    return interpolate(template, {
      clients: String(clients),
      providers: String(providers)
    });
  }
  return s.descEmpty;
}
export function getServicePageCopy(locale) {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  const t = pickLocaleMessages(SERVICE_PAGE, locale);
  const bcp47 = LOCALE_BCP47[code] || LOCALE_BCP47.fr;
  const bind = section => ({
    ...section,
    formatCount: (key, count) => interpolate(pluralPick(count, section[key], section[`${key}Plural`] || section[key]), {
      count
    })
  });
  return {
    ...t,
    locale: code,
    bcp47,
    tabs: TAB_KEYS.map(key => ({
      key,
      label: t.tabs[key],
      icon: TAB_ICONS[key]
    })),
    overview: {
      ...t.overview,
      formatHeroDesc: count => count > 0 ? interpolate(pluralPick(count, t.overview.heroDescIssues, t.overview.heroDescIssuesPlural), {
        count
      }) : t.overview.heroDescOk,
      formatMfaAdmins: pct => interpolate(t.overview.actions.mfaAdmins, {
        pct
      }),
      formatSecureScore: pct => interpolate(t.overview.actions.secureScore, {
        pct
      }),
      getDomainStatusLabel: status => t.overview.domainStatus[status] || status,
      formatMicrosoftFleetDescription: stats => buildServiceFleetDescription(stats, "microsoft", locale),
      formatDomainFleetDescription: stats => buildServiceFleetDescription(stats, "domain", locale),
      formatSslFleetDescription: stats => buildServiceFleetDescription(stats, "ssl", locale)
    },
    microsoft: {
      ...bind(t.microsoft),
      locale: code,
      formatHeroDesc: count => count > 0 ? interpolate(pluralPick(count, t.microsoft.heroDescIssues, t.microsoft.heroDescIssuesPlural), {
        count
      }) : t.microsoft.heroDescOk,
      formatAlertCount: count => interpolate(pluralPick(count, t.microsoft.alertCount, t.microsoft.alertCountPlural), {
        count
      }),
      formatPageOf: (current, total) => interpolate(t.microsoft.pageOf, {
        current,
        total
      }),
      statusFilters: [{
        id: "all",
        label: t.microsoft.statusFilters.all
      }, {
        id: "actif",
        label: t.microsoft.statusFilters.actif
      }, {
        id: "inactif",
        label: t.microsoft.statusFilters.inactif
      }]
    },
    domain: {
      ...bind(t.domain),
      locale: code,
      formatHeroDesc: count => count > 0 ? interpolate(pluralPick(count, t.domain.heroDescIssues, t.domain.heroDescIssuesPlural), {
        count
      }) : t.domain.heroDescOk,
      formatAlertCount: count => interpolate(pluralPick(count, t.domain.alertCount, t.domain.alertCountPlural), {
        count
      }),
      getStatusMeta: status => ({
        label: t.domain.statusMeta[status] || t.domain.statusMeta.inconnu,
        tone: status === "expiré" ? "bad" : status === "expire_bientot" ? "warn" : status === "actif" ? "good" : "neutral"
      }),
      statusFilters: [{
        id: "all",
        label: t.domain.statusFilters.all
      }, {
        id: "actif",
        label: t.domain.statusFilters.actif
      }, {
        id: "expire_bientot",
        label: t.domain.statusFilters.expire_bientot
      }, {
        id: "expiré",
        label: t.domain.statusFilters.expiré
      }]
    },
    ssl: {
      ...bind(t.ssl),
      locale: code,
      formatHeroDesc: count => count > 0 ? interpolate(pluralPick(count, t.ssl.heroDescIssues, t.ssl.heroDescIssuesPlural), {
        count
      }) : t.ssl.heroDescOk,
      formatAlertCount: count => interpolate(pluralPick(count, t.ssl.alertCount, t.ssl.alertCountPlural), {
        count
      }),
      getStatusMeta: statusKey => ({
        label: t.ssl.statusMeta[statusKey] || t.ssl.statusMeta.unknown,
        tone: statusKey === "expired" || statusKey === "error" ? "bad" : statusKey === "warning" ? "warn" : statusKey === "active" ? "good" : "neutral"
      }),
      statusFilters: [{
        id: "all",
        label: t.ssl.statusFilters.all
      }, {
        id: "active",
        label: t.ssl.statusFilters.active
      }, {
        id: "warning",
        label: t.ssl.statusFilters.warning
      }, {
        id: "expired",
        label: t.ssl.statusFilters.expired
      }, {
        id: "error",
        label: t.ssl.statusFilters.error
      }, {
        id: "unknown",
        label: t.ssl.statusFilters.unknown
      }]
    }
  };
}
