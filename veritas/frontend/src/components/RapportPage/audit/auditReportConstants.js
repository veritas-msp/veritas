export const AUDIT_SUBTYPE_IDS = {
  INFRASTRUCTURE: "infrastructure",
  CYBERSECURITY: "cybersecurity",
  GLOBAL: "global",
  ANTIVIRUS: "antivirus",
  ANTISPAM: "antispam",
  BACKUP: "backup"
};

/** Sections techniques par sous-type (après couverture / client / objet). */
export const AUDIT_SUBTYPE_SECTION_KEYS = {
  [AUDIT_SUBTYPE_IDS.INFRASTRUCTURE]: [
    "internet",
    "network",
    "internalNetworks",
    "servers",
    "fleet",
    "securityBackup"
  ],
  [AUDIT_SUBTYPE_IDS.CYBERSECURITY]: [
    "protections",
    "identities",
    "vulnerabilities",
    "recommendations"
  ],
  [AUDIT_SUBTYPE_IDS.GLOBAL]: [
    "internet",
    "network",
    "servers",
    "fleet",
    "protections",
    "antivirus",
    "antispam",
    "backup"
  ],
  [AUDIT_SUBTYPE_IDS.ANTIVIRUS]: ["antivirus", "coverage", "recommendations"],
  [AUDIT_SUBTYPE_IDS.ANTISPAM]: ["antispam", "coverage", "recommendations"],
  [AUDIT_SUBTYPE_IDS.BACKUP]: ["backup", "externalization", "recommendations"]
};

export const AUDIT_SUBTYPE_DEFS = [{
  id: AUDIT_SUBTYPE_IDS.INFRASTRUCTURE,
  icon: "mdi:lan",
  key: "infrastructure"
}, {
  id: AUDIT_SUBTYPE_IDS.CYBERSECURITY,
  icon: "mdi:shield-check-outline",
  key: "cybersecurity"
}, {
  id: AUDIT_SUBTYPE_IDS.GLOBAL,
  icon: "mdi:view-dashboard-outline",
  key: "global"
}, {
  id: AUDIT_SUBTYPE_IDS.ANTIVIRUS,
  icon: "mdi:shield-virus-outline",
  key: "antivirus"
}, {
  id: AUDIT_SUBTYPE_IDS.ANTISPAM,
  icon: "mdi:email-seal-outline",
  key: "antispam"
}, {
  id: AUDIT_SUBTYPE_IDS.BACKUP,
  icon: "mdi:cloud-upload-outline",
  key: "backup"
}];

export const AUDIT_FINDING_SEVERITIES = ["info", "watch", "critical"];

export const AUDIT_BUILDER_STEP_KEYS = {
  COVER: "cover",
  CLIENT: "client",
  OBJECT: "object",
  SECTIONS: "sections",
  SYNTHESIS: "synthesis",
  ACTION_PLAN: "actionPlan",
  VALIDATION: "validation"
};
