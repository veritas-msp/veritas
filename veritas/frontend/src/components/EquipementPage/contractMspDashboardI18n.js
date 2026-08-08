import { interpolate, pickLocaleMessages } from "../../i18n/translate";
function pluralPick(count, one, many) {
  return Number(count) > 1 ? many : one;
}
const CONTRACT_MSP_DASHBOARD_COPY = {
  fr: {
    healthLabel: "Santé contrats",
    eyebrow: "Contrats & licences",
    heroTitle: "Parc multi-entreprises",
    heroDescIssues: "{count} alerte à traiter.",
    heroDescIssuesPlural: "{count} alertes à traiter.",
    heroDescOk: "Aucune échéance expirée ou à renouveler dans les 60 prochains jours (contrats, antivirus, domaines, SSL, licences).",
    kpi: {
      alerts: "Alertes",
      clients: "Entreprises",
      expired: "Expirées",
      toRenew: "À renouveler"
    },
    statusFilters: {
      all: "Toutes",
      expired: "Expirées",
      expiring: "À renouveler",
      suspended: "Suspendues"
    },
    statusMeta: {
      expired: "Expiré",
      expiring: "Expire bientôt",
      suspended: "Suspendu"
    },
    statusFilterAria: "Filtre statut",
    categoryFilterAria: "Filtre type",
    allCategories: "Tous types",
    searchPlaceholder: "Rechercher entreprise, type, licence…",
    alertCount: "{count} alerte",
    alertCountPlural: "{count} alertes",
    categoryCount: "{count} type",
    categoryCountPlural: "{count} types",
    priorityTitle: "À traiter en priorité",
    priorityVerbFix: "Renouveler",
    priorityVerbReview: "Anticiper",
    loading: "Chargement des alertes…",
    emptyTitleNone: "Contrats et licences OK",
    emptyTitleNoMatch: "Aucun résultat",
    emptyTextNone: "Aucune échéance expirée ou à renouveler dans les 60 prochains jours.",
    emptyTextNoMatch: "Ajustez les filtres ou la recherche pour afficher des alertes.",
    viewEnterprise: "Voir l'entreprise",
    table: {
      stateAria: "État",
      name: "Nom",
      type: "Type",
      status: "Statut",
      expiration: "Expiration",
      actions: "Actions"
    }
  },
  en: {
    healthLabel: "Contract health",
    eyebrow: "Contracts & licenses",
    heroTitle: "Multi-company fleet",
    heroDescIssues: "{count} alert to review.",
    heroDescIssuesPlural: "{count} alerts to review.",
    heroDescOk: "No expired or upcoming renewals within the next 60 days (contracts, antivirus, domains, SSL, licenses).",
    kpi: {
      alerts: "Alerts",
      clients: "Companies",
      expired: "Expired",
      toRenew: "To renew"
    },
    statusFilters: {
      all: "All",
      expired: "Expired",
      expiring: "Expiring soon",
      suspended: "Suspended"
    },
    statusMeta: {
      expired: "Expired",
      expiring: "Expiring soon",
      suspended: "Suspended"
    },
    statusFilterAria: "Status filter",
    categoryFilterAria: "Type filter",
    allCategories: "All types",
    searchPlaceholder: "Search company, type, license…",
    alertCount: "{count} alert",
    alertCountPlural: "{count} alerts",
    categoryCount: "{count} type",
    categoryCountPlural: "{count} types",
    priorityTitle: "Priority review",
    priorityVerbFix: "Renew",
    priorityVerbReview: "Plan ahead",
    loading: "Loading alerts…",
    emptyTitleNone: "Contracts and licenses OK",
    emptyTitleNoMatch: "No results",
    emptyTextNone: "No expired or upcoming renewals within the next 60 days.",
    emptyTextNoMatch: "Adjust filters or search to show alerts.",
    viewEnterprise: "View company",
    table: {
      stateAria: "State",
      name: "Name",
      type: "Type",
      status: "Status",
      expiration: "Expiration",
      actions: "Actions"
    }
  }
};
export function getContractMspDashboardCopy(locale) {
  const t = pickLocaleMessages(CONTRACT_MSP_DASHBOARD_COPY, locale);
  const code = locale?.slice?.(0, 2) || "fr";
  return {
    ...t,
    locale: code,
    formatHeroDesc: count => count > 0 ? interpolate(pluralPick(count, t.heroDescIssues, t.heroDescIssuesPlural), {
      count: String(count)
    }) : t.heroDescOk,
    formatAlertCount: count => interpolate(pluralPick(count, t.alertCount, t.alertCountPlural), {
      count: String(count)
    }),
    formatCount: (key, count) => {
      const n = Number(count) || 0;
      if (key === "categoryCount") {
        return interpolate(pluralPick(n, t.categoryCount, t.categoryCountPlural), {
          count: String(n)
        });
      }
      return interpolate(pluralPick(n, t.alertCount, t.alertCountPlural), {
        count: String(n)
      });
    },
    getStatusMeta: status => ({
      label: t.statusMeta[status] || t.statusMeta.expiring,
      tone: status === "expired" ? "bad" : status === "suspended" ? "bad" : status === "expiring" ? "warn" : "neutral"
    }),
    statusFilters: [{
      id: "all",
      label: t.statusFilters.all
    }, {
      id: "expired",
      label: t.statusFilters.expired
    }, {
      id: "expiring",
      label: t.statusFilters.expiring
    }, {
      id: "suspended",
      label: t.statusFilters.suspended
    }]
  };
}
