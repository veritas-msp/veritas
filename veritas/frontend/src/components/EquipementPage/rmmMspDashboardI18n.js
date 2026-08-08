import { interpolate, pickLocaleMessages } from "../../i18n/translate";
function pluralPick(count, one, many) {
  return Number(count) > 1 ? many : one;
}
const RMM_MSP_DASHBOARD_COPY = {
  fr: {
    healthLabel: "Santé agents",
    eyebrow: "Agents RMM",
    heroTitle: "Parc multi-entreprises",
    heroDescIssues: "{count} agent à surveiller.",
    heroDescIssuesPlural: "{count} agents à surveiller.",
    heroDescOk: "Tous les agents RMM sont en ligne et à jour.",
    kpi: {
      agents: "Agents",
      clients: "Entreprises",
      online: "En ligne",
      offline: "Hors ligne"
    },
    statusFilters: {
      all: "Tous",
      online: "En ligne",
      offline: "Hors ligne",
      updates: "MAJ en attente"
    },
    statusFilterAria: "Filtre statut",
    searchPlaceholder: "Rechercher poste, client, IP, OS…",
    agentCount: "{count} agent",
    agentCountPlural: "{count} agents",
    priorityTitle: "Hors ligne en priorité",
    priorityVerbFix: "Intervenir",
    loading: "Chargement des agents…",
    emptyTitleNone: "Aucun agent RMM",
    emptyTitleNoMatch: "Aucun résultat",
    emptyTextNone: "Déployez l'agent Veritas sur les postes clients pour la supervision RMM.",
    emptyTextNoMatch: "Ajustez les filtres ou la recherche pour afficher des agents.",
    workstation: "Poste",
    online: "En ligne",
    offline: "Hors ligne",
    viewWorkstation: "Voir le poste",
    table: {
      stateAria: "État",
      hostname: "Poste",
      client: "Client",
      os: "OS",
      ip: "IP",
      lastSeen: "Dernière activité",
      actions: "Actions"
    }
  },
  en: {
    healthLabel: "Agent health",
    eyebrow: "RMM agents",
    heroTitle: "Multi-company fleet",
    heroDescIssues: "{count} agent to review.",
    heroDescIssuesPlural: "{count} agents to review.",
    heroDescOk: "All RMM agents are online and up to date.",
    kpi: {
      agents: "Agents",
      clients: "Companies",
      online: "Online",
      offline: "Offline"
    },
    statusFilters: {
      all: "All",
      online: "Online",
      offline: "Offline",
      updates: "Pending updates"
    },
    statusFilterAria: "Status filter",
    searchPlaceholder: "Search workstation, client, IP, OS…",
    agentCount: "{count} agent",
    agentCountPlural: "{count} agents",
    priorityTitle: "Offline priority",
    priorityVerbFix: "Investigate",
    loading: "Loading agents…",
    emptyTitleNone: "No RMM agents",
    emptyTitleNoMatch: "No results",
    emptyTextNone: "Deploy the Veritas agent on client workstations for RMM supervision.",
    emptyTextNoMatch: "Adjust filters or search to show agents.",
    workstation: "Workstation",
    online: "Online",
    offline: "Offline",
    viewWorkstation: "View workstation",
    table: {
      stateAria: "State",
      hostname: "Workstation",
      client: "Client",
      os: "OS",
      ip: "IP",
      lastSeen: "Last activity",
      actions: "Actions"
    }
  }
};
export function getRmmMspDashboardCopy(locale) {
  const t = pickLocaleMessages(RMM_MSP_DASHBOARD_COPY, locale);
  const code = locale?.slice?.(0, 2) || "fr";
  return {
    ...t,
    locale: code,
    formatHeroDesc: offlineCount => offlineCount > 0 ? interpolate(pluralPick(offlineCount, t.heroDescIssues, t.heroDescIssuesPlural), {
      count: String(offlineCount)
    }) : t.heroDescOk,
    formatAgentCount: count => interpolate(pluralPick(count, t.agentCount, t.agentCountPlural), {
      count: String(count)
    }),
    statusFilters: [{
      id: "all",
      label: t.statusFilters.all
    }, {
      id: "online",
      label: t.statusFilters.online
    }, {
      id: "offline",
      label: t.statusFilters.offline
    }, {
      id: "updates",
      label: t.statusFilters.updates
    }]
  };
}
