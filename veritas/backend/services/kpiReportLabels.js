const LABELS = {
  fr: {
    title: "Rapport KPI Veritas",
    generatedAt: "Généré le",
    supportTitle: "Support",
    devicesTitle: "Périphériques",
    enterpriseTitle: "Entreprise",
    ticketsCreated: "Tickets créés",
    ticketsClosed: "Clôturés",
    ticketsOpen: "Ouverts",
    closureRate: "Taux de clôture",
    firstResponse: "1re prise en charge",
    resolution: "Résolution",
    topAgents: "Classement agents",
    agent: "Agent",
    assigned: "Assignés",
    closed: "Clôturés",
    open: "Ouverts",
    equipTotal: "Parc",
    supervised: "Supervisés",
    surveillance: "Taux supervision",
    rmmOnline: "RMM en ligne",
    computers: "Ordinateurs",
    computersActive: "Ordinateurs actifs",
    families: "Parc par famille",
    family: "Famille",
    total: "Total",
    clients: "Entreprises",
    contacts: "Contacts",
    contractsActive: "Contrats actifs",
    contractsExpiring: "Échéance 30 j",
    contractsExpired: "Expirés",
    contractsSuspended: "Suspendus",
    modules: "Modules contrat",
    module: "Module",
    solutions: "Solutions déployées",
    solution: "Solution",
    solutionLabels: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      backup: "Sauvegarde",
      o365: "Microsoft 365",
      domain: "Noms de domaine",
      ssl: "Certificats SSL",
      campaigns: "Campagnes"
    },
    mailTitle: "Rapport KPI Veritas",
    mailIntro: "Veuillez trouver ci-joint le rapport KPI pour la période demandée.",
    mailSubject: "Rapport KPI Veritas — {period}"
  },
  en: {
    title: "Veritas KPI report",
    generatedAt: "Generated on",
    supportTitle: "Support",
    devicesTitle: "Devices",
    enterpriseTitle: "Company",
    ticketsCreated: "Tickets created",
    ticketsClosed: "Closed",
    ticketsOpen: "Open",
    closureRate: "Closure rate",
    firstResponse: "First response",
    resolution: "Resolution",
    topAgents: "Agent ranking",
    agent: "Agent",
    assigned: "Assigned",
    closed: "Closed",
    open: "Open",
    equipTotal: "Fleet",
    supervised: "Monitored",
    surveillance: "Monitoring rate",
    rmmOnline: "RMM online",
    computers: "Computers",
    computersActive: "Active computers",
    families: "Fleet by family",
    family: "Family",
    total: "Total",
    clients: "Companies",
    contacts: "Contacts",
    contractsActive: "Active contracts",
    contractsExpiring: "Expiring (30d)",
    contractsExpired: "Expired",
    contractsSuspended: "Suspended",
    modules: "Contract modules",
    module: "Module",
    solutions: "Deployed solutions",
    solution: "Solution",
    solutionLabels: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      backup: "Backup",
      o365: "Microsoft 365",
      domain: "Domains",
      ssl: "SSL certificates",
      campaigns: "Campaigns"
    },
    mailTitle: "Veritas KPI report",
    mailIntro: "Please find attached the KPI report for the requested period.",
    mailSubject: "Veritas KPI report — {period}"
  }
};

export const KPI_CATEGORIES = ["support", "devices", "enterprise"];
export const KPI_PERIOD_PRESETS = ["7d", "30d", "90d", "365d", "ytd"];
export const KPI_FREQUENCIES = ["daily", "weekly", "monthly"];

export function getKpiReportLabels(locale = "fr") {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  return LABELS[code] || LABELS.fr;
}

export function normalizeCategories(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(",");
  const selected = [...new Set(list.map(item => String(item || "").trim().toLowerCase()).filter(item => KPI_CATEGORIES.includes(item)))];
  return selected.length ? selected : [...KPI_CATEGORIES];
}

export function parseRecipientList(value) {
  return String(value || "").split(/[;,]/).map(item => item.trim()).filter(Boolean);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}
