export const REPORT_TYPE_IDS = {
  SUPERVISION_ETAT: "supervision-etat",
  INTERVENTION: "intervention",
  CAHIER_RECETTE: "cahier-recette",
  ACTIVITE_MENSUELLE: "activite-mensuelle",
  INVENTAIRE_PARC: "inventaire-parc",
  AUDIT_SECURITE: "audit-securite"
};
export const REPORT_TYPE_DEFS = [{
  id: REPORT_TYPE_IDS.SUPERVISION_ETAT,
  icon: "mdi:radar",
  key: "supervisionEtat"
}, {
  id: REPORT_TYPE_IDS.INTERVENTION,
  icon: "mdi:toolbox-outline",
  key: "intervention",
  comingSoon: true
}, {
  id: REPORT_TYPE_IDS.CAHIER_RECETTE,
  icon: "mdi:clipboard-check-outline",
  key: "cahierRecette",
  comingSoon: true
}, {
  id: REPORT_TYPE_IDS.ACTIVITE_MENSUELLE,
  icon: "mdi:calendar-month-outline",
  key: "activiteMensuelle",
  comingSoon: true
}, {
  id: REPORT_TYPE_IDS.INVENTAIRE_PARC,
  icon: "mdi:desktop-classic",
  key: "inventaireParc",
  comingSoon: true
}, {
  id: REPORT_TYPE_IDS.AUDIT_SECURITE,
  icon: "mdi:shield-check-outline",
  key: "auditSecurite",
  comingSoon: true
}];
export function normalizeReportTypeId(rawType) {
  const value = String(rawType || "").trim().toLowerCase();
  if (!value) return REPORT_TYPE_IDS.SUPERVISION_ETAT;
  if (value === "monitoring" || value.includes("monitoring")) {
    return REPORT_TYPE_IDS.SUPERVISION_ETAT;
  }
  if (value.includes("intervention")) return REPORT_TYPE_IDS.INTERVENTION;
  if (value.includes("recette")) return REPORT_TYPE_IDS.CAHIER_RECETTE;
  if (value.includes("supervision") || value.includes("supervision")) {
    return REPORT_TYPE_IDS.SUPERVISION_ETAT;
  }
  return rawType;
}
