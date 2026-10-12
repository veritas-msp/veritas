import { pickLocaleMessages } from "../../../i18n/translate";
import { AUDIT_SUBTYPE_DEFS, AUDIT_SUBTYPE_IDS } from "./auditReportConstants";

const AUDIT_REPORT = {
  fr: {
    gateTitle: "Quel type d'audit ?",
    gateHint: "Choisissez le périmètre du rapport. Les sections techniques s'adaptent ensuite.",
    gateConfirm: "Continuer",
    gateBack: "Retour",
    changeSubtype: "Changer de type d'audit",
    defaultDocumentTitle: "Rapport d'audit",
    saveNamePlaceholder: "Audit · {subtype} · {client}",
    backToSelection: "Retour à la sélection",
    continue: "Continuer",
    back: "Retour",
    save: "Enregistrer",
    saveDraft: "Enregistrer le brouillon",
    finish: "Finaliser",
    addFinding: "Ajouter un constat",
    addAction: "Ajouter une action",
    remove: "Retirer",
    severityInfo: "Info",
    severityWatch: "À surveiller",
    severityCritical: "Critique",
    priorityLow: "Basse",
    priorityMedium: "Moyenne",
    priorityHigh: "Haute",
    steps: {
      cover: "Couverture",
      client: "Client & mission",
      object: "Objet",
      sections: "Constats techniques",
      synthesis: "Synthèse",
      actionPlan: "Plan d'action",
      validation: "Validation"
    },
    validation: {
      previewTitle: "Aperçu du rapport",
      downloadHtml: "Télécharger le HTML",
      saveLibrary: "Enregistrer dans la bibliothèque",
      modify: "Modifier",
      saveNameLabel: "Nom du document",
      reportLabel: "Rapport d'audit"
    },
    fields: {
      documentTitle: "Titre du document",
      diffusion: "Diffusion",
      createdAt: "Date de création",
      authorName: "Auteur(s)",
      authorRole: "Fonction",
      reviewers: "Relecteur(s)",
      confidentialityNote: "Accord de confidentialité",
      clientName: "Entreprise",
      clientSiteName: "Nom du site",
      clientAddress: "Adresse",
      clientNumber: "Identifiant client",
      contractNumber: "N° contrat",
      contractStart: "Début de contrat",
      contractEnd: "Fin de contrat",
      missionStart: "Début d'intervention",
      missionEnd: "Fin d'intervention",
      technicians: "Techniciens",
      technicianRole: "Fonction technicien",
      clientApprover: "Approbateur(s) client",
      clientApproverRole: "Fonction approbateur",
      commercialReferent: "Référent commercial",
      objectText: "Objet du document",
      contextText: "Présentation du contexte",
      synthesis: "Synthèse de l'audit",
      questionsAnswers: "Réponses aux questions de l'audit",
      sectionContent: "Analyse / description",
      findingTitle: "Constat",
      findingDetail: "Détail",
      findingSeverity: "Sévérité",
      actionTitle: "Action",
      actionDetail: "Détail",
      actionOwner: "Responsable",
      actionDue: "Échéance",
      actionPriority: "Priorité",
      companyName: "Société prestataire",
      companyAddress: "Adresse prestataire"
    },
    defaults: {
      diffusion: "Confidentielle",
      authorRole: "Ingénieur IT",
      confidentialityNote:
        "Ce document contient des informations confidentielles. Aucune copie ne pourra être remise à un tiers sans l'accord écrit du client.",
      objectText:
        "Ce document est le compte rendu de notre visite d'audit. Il dresse un bilan de l'existant et liste les actions à mener pour assurer la maintenance et les futurs projets."
    },
    sectionTitles: {
      internet: "Accès Internet & firewall",
      network: "Infrastructure réseau",
      internalNetworks: "Réseaux internes (VLAN, domaines)",
      servers: "Serveurs physiques & virtuels",
      fleet: "Parc informatique",
      securityBackup: "Organes de sécurité et sauvegarde",
      protections: "Protections en place",
      identities: "Identités & accès",
      vulnerabilities: "Vulnérabilités constatées",
      recommendations: "Recommandations",
      antivirus: "Solution antivirale",
      antispam: "Protection des e-mails / antispam",
      backup: "Plan de sauvegarde",
      coverage: "Couverture & périmètre",
      externalization: "Externalisation & cloud"
    },
    subtypes: {
      [AUDIT_SUBTYPE_IDS.INFRASTRUCTURE]: {
        title: "Audit d'infrastructure",
        description: "Internet, firewall, réseau, serveurs, parc, sauvegarde — comme un rapport type GRETA."
      },
      [AUDIT_SUBTYPE_IDS.CYBERSECURITY]: {
        title: "Audit de cybersécurité",
        description: "Protections, identités, vulnérabilités et recommandations de durcissement."
      },
      [AUDIT_SUBTYPE_IDS.GLOBAL]: {
        title: "Audit global",
        description: "Vue d'ensemble infrastructure + cybersécurité + solutions métier."
      },
      [AUDIT_SUBTYPE_IDS.ANTIVIRUS]: {
        title: "Audit solution antivirale",
        description: "Couverture EDR/AV, politiques, écarts et plan de remédiation."
      },
      [AUDIT_SUBTYPE_IDS.ANTISPAM]: {
        title: "Audit solution antispam",
        description: "Protection messagerie, filtrage, quarantaine et recommandations."
      },
      [AUDIT_SUBTYPE_IDS.BACKUP]: {
        title: "Audit sauvegarde",
        description: "Plan de backup, externalisation, RPO/RTO et points de vigilance."
      }
    },
    alerts: {
      stepInvalid: "Complétez les champs obligatoires de cette étape.",
      saveSuccess: "Rapport d'audit enregistré.",
      saveError: "Impossible d'enregistrer le rapport d'audit.",
      saveNameRequired: "Indiquez un nom de document.",
      duplicateName: "Un document porte déjà ce nom.",
      overwriteTitle: "Remplacer le document ?",
      overwriteMessage: "Un rapport porte déjà ce nom. Voulez-vous le remplacer ?",
      overwriteConfirm: "Remplacer",
      overwriteCancel: "Annuler",
      pdfError: "Impossible de générer le PDF.",
      htmlError: "Impossible de générer le HTML.",
      vaultError: "Rapport enregistré, mais l'archivage coffre a échoué."
    },
    saveModal: {
      eyebrow: "Rapport d'audit",
      title: "Enregistrer le rapport",
      subtitle: "Confirmez l'enregistrement dans la bibliothèque.",
      documentLabel: "Document",
      vaultNote: "Un PDF sera généré et archivé dans le coffre-fort documentaire de l'entreprise.",
      footerHint: "Bibliothèque agents + coffre entreprise",
      nameLabel: "Nom du document",
      confirm: "Enregistrer",
      cancel: "Annuler",
      saving: "Enregistrement…"
    }
  },
  en: {
    gateTitle: "Which audit type?",
    gateHint: "Pick the report scope. Technical sections adapt accordingly.",
    gateConfirm: "Continue",
    gateBack: "Back",
    changeSubtype: "Change audit type",
    defaultDocumentTitle: "Audit report",
    saveNamePlaceholder: "Audit · {subtype} · {client}",
    backToSelection: "Back to selection",
    continue: "Continue",
    back: "Back",
    save: "Save",
    saveDraft: "Save draft",
    finish: "Finish",
    addFinding: "Add finding",
    addAction: "Add action",
    remove: "Remove",
    severityInfo: "Info",
    severityWatch: "Watch",
    severityCritical: "Critical",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    steps: {
      cover: "Cover",
      client: "Client & mission",
      object: "Purpose",
      sections: "Technical findings",
      synthesis: "Summary",
      actionPlan: "Action plan",
      validation: "Validation"
    },
    validation: {
      previewTitle: "Report preview",
      downloadHtml: "Download HTML",
      saveLibrary: "Save to library",
      modify: "Edit",
      saveNameLabel: "Document name",
      reportLabel: "Audit report"
    },
    fields: {
      documentTitle: "Document title",
      diffusion: "Distribution",
      createdAt: "Created on",
      authorName: "Author(s)",
      authorRole: "Role",
      reviewers: "Reviewer(s)",
      confidentialityNote: "Confidentiality notice",
      clientName: "Company",
      clientSiteName: "Site name",
      clientAddress: "Address",
      clientNumber: "Client ID",
      contractNumber: "Contract no.",
      contractStart: "Contract start",
      contractEnd: "Contract end",
      missionStart: "Mission start",
      missionEnd: "Mission end",
      technicians: "Technicians",
      technicianRole: "Technician role",
      clientApprover: "Client approver(s)",
      clientApproverRole: "Approver role",
      commercialReferent: "Account manager",
      objectText: "Document purpose",
      contextText: "Context",
      synthesis: "Audit summary",
      questionsAnswers: "Answers to audit questions",
      sectionContent: "Analysis / description",
      findingTitle: "Finding",
      findingDetail: "Detail",
      findingSeverity: "Severity",
      actionTitle: "Action",
      actionDetail: "Detail",
      actionOwner: "Owner",
      actionDue: "Due date",
      actionPriority: "Priority",
      companyName: "Service provider",
      companyAddress: "Provider address"
    },
    defaults: {
      diffusion: "Confidential",
      authorRole: "IT Engineer",
      confidentialityNote:
        "This document contains confidential information. No copy may be shared with a third party without the client's written consent.",
      objectText:
        "This document is the report of our audit visit. It summarizes the current state and lists the actions required for maintenance and upcoming projects."
    },
    sectionTitles: {
      internet: "Internet access & firewall",
      network: "Network infrastructure",
      internalNetworks: "Internal networks (VLANs, domains)",
      servers: "Physical & virtual servers",
      fleet: "IT estate",
      securityBackup: "Security & backup",
      protections: "Protections in place",
      identities: "Identities & access",
      vulnerabilities: "Observed vulnerabilities",
      recommendations: "Recommendations",
      antivirus: "Antivirus solution",
      antispam: "Email / antispam protection",
      backup: "Backup plan",
      coverage: "Coverage & scope",
      externalization: "Offsite & cloud"
    },
    subtypes: {
      [AUDIT_SUBTYPE_IDS.INFRASTRUCTURE]: {
        title: "Infrastructure audit",
        description: "Internet, firewall, network, servers, fleet, backup."
      },
      [AUDIT_SUBTYPE_IDS.CYBERSECURITY]: {
        title: "Cybersecurity audit",
        description: "Protections, identities, vulnerabilities and hardening recommendations."
      },
      [AUDIT_SUBTYPE_IDS.GLOBAL]: {
        title: "Global audit",
        description: "Combined infrastructure, cybersecurity and business solutions view."
      },
      [AUDIT_SUBTYPE_IDS.ANTIVIRUS]: {
        title: "Antivirus solution audit",
        description: "EDR/AV coverage, policies, gaps and remediation plan."
      },
      [AUDIT_SUBTYPE_IDS.ANTISPAM]: {
        title: "Antispam solution audit",
        description: "Mail protection, filtering, quarantine and recommendations."
      },
      [AUDIT_SUBTYPE_IDS.BACKUP]: {
        title: "Backup audit",
        description: "Backup plan, offsite strategy, RPO/RTO and watch points."
      }
    },
    alerts: {
      stepInvalid: "Complete the required fields for this step.",
      saveSuccess: "Audit report saved.",
      saveError: "Unable to save the audit report.",
      saveNameRequired: "Enter a document name.",
      duplicateName: "A document with this name already exists.",
      overwriteTitle: "Replace document?",
      overwriteMessage: "A report already uses this name. Do you want to replace it?",
      overwriteConfirm: "Replace",
      overwriteCancel: "Cancel",
      pdfError: "Unable to generate the PDF.",
      htmlError: "Unable to generate the HTML.",
      vaultError: "Report saved, but vault archival failed."
    },
    saveModal: {
      eyebrow: "Audit report",
      title: "Save report",
      subtitle: "Confirm saving to the library.",
      documentLabel: "Document",
      vaultNote: "A PDF will be generated and archived in the company document vault.",
      footerHint: "Agent library + company vault",
      nameLabel: "Document name",
      confirm: "Save",
      cancel: "Cancel",
      saving: "Saving…"
    }
  }
};

export function getAuditReportCopy(locale = "fr") {
  return pickLocaleMessages(AUDIT_REPORT, locale) || AUDIT_REPORT.fr;
}

export function getAuditSubtypeOptions(copy) {
  return AUDIT_SUBTYPE_DEFS.map(def => ({
    id: def.id,
    icon: def.icon,
    key: def.key,
    title: copy?.subtypes?.[def.id]?.title || def.key,
    description: copy?.subtypes?.[def.id]?.description || ""
  }));
}
