import { interpolate, pickLocaleMessages } from "../../i18n/translate";

const TENANT_DETAIL_COPY = {
  fr: {
    empty: {
      title: "Aucune donnée tenant",
      text: "Sélectionnez un tenant Microsoft depuis la fiche entreprise ou la page Services.",
      back: "Retour aux services"
    },
    loading: "Chargement de la fiche tenant…",
    tabTitle: "{client} — Tenant Microsoft",
    tabs: {
      aria: "Sections du tenant Microsoft",
      rapport: "Rapport",
      utilisateurs: "Utilisateurs",
      licences: "Licences",
      exchange: "Exchange",
      sharepoint: "SharePoint",
      onedrive: "OneDrive",
      teams: "Teams",
      securite: "Sécurité"
    },
    hero: {
      eyebrow: "Tenant Microsoft",
      metaAria: "Informations du tenant",
      tenantId: "ID tenant",
      lastSync: "Dernière sync",
      neverSynced: "Jamais synchronisé",
      connectionOk: "Connecté",
      connectionError: "Connexion en échec",
      connectionUnknown: "Statut inconnu",
      backEnterprise: "Retour à l'entreprise",
      sync: "Synchroniser",
      syncing: "Synchronisation…",
      actions: "Actions",
      delete: "Supprimer le tenant"
    },
    sync: {
      preparing: "Préparation…",
      running: "Synchronisation…",
      done: "Finalisation…",
      success: "Données du tenant Microsoft synchronisées",
      error: "Erreur pendant la synchronisation",
      noClient: "Aucun identifiant client pour la synchronisation"
    },
    delete: {
      success: "Tenant retiré du client",
      error: "Erreur lors de la suppression du tenant"
    },
    status: {
      ok: "OK",
      warning: "Attention",
      critical: "Critique",
      unsynced: "Non synchronisé"
    },
    report: {
      title: "État du tenant",
      subtitle: "Synthèse par catégorie. Cliquez une carte pour ouvrir le détail.",
      globalKpi: "Statut global",
      users: "Utilisateurs",
      licenses: "Licences utilisées",
      secureScore: "Secure Score",
      mfa: "Couverture MFA"
    },
    categories: {
      identity: "Identité",
      licenses: "Licences",
      security: "Sécurité",
      mail: "Messagerie",
      collab: "Collaboration",
      adoption: "Adoption"
    },
    metrics: {
      total: "Total",
      active30: "Actifs 30 j",
      inactive90: "Inactifs > 90 j",
      blocked: "Bloqués",
      domains: "Domaines",
      usedTotal: "Utilisées",
      available: "Disponibles",
      usageRate: "Taux d'usage",
      secureScore: "Secure Score",
      mfa: "MFA (humains)",
      highRecos: "Recos hautes",
      mailboxes: "Boîtes",
      volume: "Volume e-mails",
      storage: "Stockage",
      quotasFull: "Quotas saturés",
      sites: "Sites SharePoint",
      onedrive: "Stockage OneDrive",
      teams: "Équipes Teams",
      score: "Score M365",
      people: "Expérience personnes",
      technology: "Expérience techno"
    },
    findings: {
      "identity.unsynced": "Aucun utilisateur synchronisé.",
      "identity.inactiveHigh": "{count} comptes inactifs depuis plus de 90 jours ({pct} %).",
      "identity.blockedHigh": "{count} comptes bloqués ({pct} %).",
      "identity.ok": "Parc d'identités sain.",
      "licenses.unsynced": "Aucune licence payante synchronisée.",
      "licenses.saturated": "Licences presque saturées ({pct} % utilisées).",
      "licenses.waste": "Sous-utilisation des licences ({pct} % d'usage, {count} SKU concernés).",
      "licenses.ok": "Usage des licences maîtrisé ({pct} %).",
      "security.unsynced": "Score de sécurité et MFA non synchronisés.",
      "security.mfaLow": "MFA incomplet : {pct} % des comptes humains ({withMfa}/{total}).",
      "security.scoreLow": "Secure Score bas ({pct} %).",
      "security.highRecos": "{count} recommandation(s) de priorité haute.",
      "security.scoreUnsynced": "Secure Score non synchronisé.",
      "security.mfaUnsynced": "Détail MFA non synchronisé.",
      "security.ok": "Couverture MFA et score de sécurité corrects.",
      "mail.unsynced": "Snapshot Exchange manquant. Lancez une sync complète.",
      "mail.quotasFull": "{count} boîte(s) proche(s) de la saturation.",
      "mail.ok": "Messagerie sans alerte de quota.",
      "collab.unsynced": "SharePoint, OneDrive et Teams non synchronisés.",
      "collab.partial": "Certains services de collaboration n'ont pas de snapshot.",
      "collab.unused": "Peu ou pas d'usage SharePoint / OneDrive / Teams.",
      "collab.ok": "Services de collaboration synchronisés.",
      "adoption.unsynced": "Score d'adoption Microsoft 365 non disponible.",
      "adoption.low": "Adoption faible ({pct} %).",
      "adoption.medium": "Adoption moyenne ({pct} %).",
      "adoption.ok": "Adoption satisfaisante ({pct} %)."
    }
  },
  en: {
    empty: {
      title: "No tenant data",
      text: "Select a Microsoft tenant from the company record or the Services page.",
      back: "Back to services"
    },
    loading: "Loading tenant details…",
    tabTitle: "{client} — Microsoft tenant",
    tabs: {
      aria: "Microsoft tenant sections",
      rapport: "Report",
      utilisateurs: "Users",
      licences: "Licenses",
      exchange: "Exchange",
      sharepoint: "SharePoint",
      onedrive: "OneDrive",
      teams: "Teams",
      securite: "Security"
    },
    hero: {
      eyebrow: "Microsoft tenant",
      metaAria: "Tenant information",
      tenantId: "Tenant ID",
      lastSync: "Last sync",
      neverSynced: "Never synced",
      connectionOk: "Connected",
      connectionError: "Connection failed",
      connectionUnknown: "Unknown status",
      backEnterprise: "Back to company",
      sync: "Sync",
      syncing: "Syncing…",
      actions: "Actions",
      delete: "Remove tenant"
    },
    sync: {
      preparing: "Preparing…",
      running: "Syncing…",
      done: "Finalizing…",
      success: "Microsoft tenant data synced successfully",
      error: "Error during sync",
      noClient: "No client ID available for sync"
    },
    delete: {
      success: "Tenant removed from client",
      error: "Error deleting the tenant"
    },
    status: {
      ok: "OK",
      warning: "Attention",
      critical: "Critical",
      unsynced: "Not synced"
    },
    report: {
      title: "Tenant status",
      subtitle: "Summary by category. Click a card to open the details.",
      globalKpi: "Overall status",
      users: "Users",
      licenses: "Licenses used",
      secureScore: "Secure Score",
      mfa: "MFA coverage"
    },
    categories: {
      identity: "Identity",
      licenses: "Licenses",
      security: "Security",
      mail: "Mail",
      collab: "Collaboration",
      adoption: "Adoption"
    },
    metrics: {
      total: "Total",
      active30: "Active 30d",
      inactive90: "Inactive > 90d",
      blocked: "Blocked",
      domains: "Domains",
      usedTotal: "Used",
      available: "Available",
      usageRate: "Usage rate",
      secureScore: "Secure Score",
      mfa: "MFA (humans)",
      highRecos: "High recos",
      mailboxes: "Mailboxes",
      volume: "Email volume",
      storage: "Storage",
      quotasFull: "Full quotas",
      sites: "SharePoint sites",
      onedrive: "OneDrive storage",
      teams: "Teams",
      score: "M365 score",
      people: "People experiences",
      technology: "Technology experiences"
    },
    findings: {
      "identity.unsynced": "No users synced.",
      "identity.inactiveHigh": "{count} accounts inactive for more than 90 days ({pct}%).",
      "identity.blockedHigh": "{count} blocked accounts ({pct}%).",
      "identity.ok": "Identity estate looks healthy.",
      "licenses.unsynced": "No paid licenses synced.",
      "licenses.saturated": "Licenses almost saturated ({pct}% used).",
      "licenses.waste": "License underuse ({pct}% usage, {count} SKUs).",
      "licenses.ok": "License usage is under control ({pct}%).",
      "security.unsynced": "Secure Score and MFA are not synced.",
      "security.mfaLow": "Incomplete MFA: {pct}% of human accounts ({withMfa}/{total}).",
      "security.scoreLow": "Low Secure Score ({pct}%).",
      "security.highRecos": "{count} high-priority recommendation(s).",
      "security.scoreUnsynced": "Secure Score not synced.",
      "security.mfaUnsynced": "MFA details not synced.",
      "security.ok": "MFA coverage and Secure Score look fine.",
      "mail.unsynced": "Exchange snapshot missing. Run a full sync.",
      "mail.quotasFull": "{count} mailbox(es) close to quota.",
      "mail.ok": "No mailbox quota alerts.",
      "collab.unsynced": "SharePoint, OneDrive and Teams are not synced.",
      "collab.partial": "Some collaboration services have no snapshot.",
      "collab.unused": "Little or no SharePoint / OneDrive / Teams usage.",
      "collab.ok": "Collaboration services are synced.",
      "adoption.unsynced": "Microsoft 365 adoption score is not available.",
      "adoption.low": "Low adoption ({pct}%).",
      "adoption.medium": "Average adoption ({pct}%).",
      "adoption.ok": "Healthy adoption ({pct}%)."
    }
  }
};

export function getTenantDetailCopy(locale) {
  return pickLocaleMessages(TENANT_DETAIL_COPY, locale);
}

export function formatTenantFinding(copy, item) {
  const template = copy.findings?.[item?.key];
  if (!template) return item?.key || "";
  return interpolate(template, item.params || {});
}
