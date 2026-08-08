export const REPORT_TYPE_IDS = {
  SUPERVISION_ETAT: "supervision-etat",
  INTERVENTION: "intervention",
  CAHIER_RECETTE: "cahier-recette"
};
export const REPORT_TYPE_DEFS = [{
  id: REPORT_TYPE_IDS.SUPERVISION_ETAT,
  icon: "mdi:radar",
  key: "supervisionEtat"
}, {
  id: REPORT_TYPE_IDS.INTERVENTION,
  icon: "mdi:toolbox-outline",
  key: "intervention"
}, {
  id: REPORT_TYPE_IDS.CAHIER_RECETTE,
  icon: "mdi:clipboard-check-outline",
  key: "cahierRecette"
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
