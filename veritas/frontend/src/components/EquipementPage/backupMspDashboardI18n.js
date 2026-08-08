import { interpolate, pickLocaleMessages } from "../../i18n/translate";
function pluralPick(count, one, many) {
  return Number(count) > 1 ? many : one;
}
const BACKUP_MSP_DASHBOARD_COPY = {
  fr: {
    healthLabel: "Santé jobs",
    eyebrow: "Sauvegardes",
    heroTitle: "Parc multi-entreprises",
    heroDescIssues: "{count} job à traiter.",
    heroDescIssuesPlural: "{count} jobs à traiter.",
    heroDescOk: "Jobs, statuts et dernières exécutions de vos clients.",
    kpi: {
      jobs: "Jobs",
      clients: "Entreprises",
      ok: "OK",
      toReview: "À traiter"
    },
    statusFilters: {
      all: "Tous",
      ok: "OK",
      warning: "Retard",
      critical: "En erreur",
      unmapped: "Non mappés"
    },
    statusMeta: {
      ok: "OK",
      warning: "Retard",
      critical: "En erreur",
      unmapped: "Non mappé",
      hycu: "HYCU"
    },
    statusFilterAria: "Filtre statut",
    providerFilterAria: "Filtre solution",
    allProviders: "Toutes solutions",
    searchPlaceholder: "Rechercher entreprise, job, serveur…",
    jobCount: "{count} job",
    jobCountPlural: "{count} jobs",
    providerCount: "{count} solution",
    providerCountPlural: "{count} solutions",
    syncJobs: "Synchroniser les jobs depuis CheckMK",
    priorityTitle: "À traiter en priorité",
    alertCount: "{count} alerte",
    alertCountPlural: "{count} alertes",
    priorityVerbFix: "Corriger",
    priorityVerbReview: "Vérifier",
    loading: "Chargement des jobs sauvegarde…",
    syncing: "Synchronisation…",
    emptyTitleNone: "Aucun job sauvegarde",
    emptyTitleNoMatch: "Aucun résultat",
    emptyTextNone: "Configurez les jobs de sauvegarde dans les fiches entreprise.",
    emptyTextNoMatch: "Ajustez les filtres ou la recherche pour afficher des jobs.",
    table: {
      stateAria: "État",
      client: "Entreprise",
      job: "Job",
      status: "Statut",
      solution: "Solution",
      server: "Serveur",
      lastBackup: "Dernière sauvegarde"
    }
  },
  en: {
    healthLabel: "Job health",
    eyebrow: "Backups",
    heroTitle: "Multi-company fleet",
    heroDescIssues: "{count} job to review.",
    heroDescIssuesPlural: "{count} jobs to review.",
    heroDescOk: "Jobs, statuses and last runs across your clients.",
    kpi: {
      jobs: "Jobs",
      clients: "Companies",
      ok: "OK",
      toReview: "To review"
    },
    statusFilters: {
      all: "All",
      ok: "OK",
      warning: "Delayed",
      critical: "Failed",
      unmapped: "Unmapped"
    },
    statusMeta: {
      ok: "OK",
      warning: "Delayed",
      critical: "Failed",
      unmapped: "Unmapped",
      hycu: "HYCU"
    },
    statusFilterAria: "Status filter",
    providerFilterAria: "Solution filter",
    allProviders: "All solutions",
    searchPlaceholder: "Search company, job, server…",
    jobCount: "{count} job",
    jobCountPlural: "{count} jobs",
    providerCount: "{count} solution",
    providerCountPlural: "{count} solutions",
    syncJobs: "Sync jobs from CheckMK",
    priorityTitle: "Priority review",
    alertCount: "{count} alert",
    alertCountPlural: "{count} alerts",
    priorityVerbFix: "Fix",
    priorityVerbReview: "Review",
    loading: "Loading backup jobs…",
    syncing: "Syncing…",
    emptyTitleNone: "No backup jobs",
    emptyTitleNoMatch: "No results",
    emptyTextNone: "Configure backup jobs from company records.",
    emptyTextNoMatch: "Adjust filters or search to show jobs.",
    table: {
      stateAria: "State",
      client: "Company",
      job: "Job",
      status: "Status",
      solution: "Solution",
      server: "Server",
      lastBackup: "Last backup"
    }
  }
};
export function getBackupMspDashboardCopy(locale) {
  const t = pickLocaleMessages(BACKUP_MSP_DASHBOARD_COPY, locale);
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
      if (key === "jobCount") {
        return interpolate(pluralPick(n, t.jobCount, t.jobCountPlural), {
          count: String(n)
        });
      }
      if (key === "providerCount") {
        return interpolate(pluralPick(n, t.providerCount, t.providerCountPlural), {
          count: String(n)
        });
      }
      return String(n);
    },
    getStatusMeta: status => ({
      label: t.statusMeta[status] || t.statusMeta.unmapped,
      tone: status === "critical" ? "bad" : status === "warning" ? "warn" : status === "ok" ? "good" : "neutral"
    }),
    statusFilters: [{
      id: "all",
      label: t.statusFilters.all
    }, {
      id: "ok",
      label: t.statusFilters.ok
    }, {
      id: "warning",
      label: t.statusFilters.warning
    }, {
      id: "critical",
      label: t.statusFilters.critical
    }, {
      id: "unmapped",
      label: t.statusFilters.unmapped
    }]
  };
}
