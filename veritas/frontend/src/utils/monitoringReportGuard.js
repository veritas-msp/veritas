export const MONITORING_REPORT_LEAVE_MESSAGE =
  "Important : tant que vous n’enregistrez pas le rapport, quitter cette page, changer d’onglet ou recharger fera perdre toute la progression. Voulez-vous vraiment quitter ?";

export function confirmLeaveMonitoringReport() {
  return window.confirm(MONITORING_REPORT_LEAVE_MESSAGE);
}

/** Active when Documents → État de supervision (or legacy monitoring) builder is open. */
export function isMonitoringReportBuilderActive(builderType, builderClient) {
  return (builderType === "monitoring" || builderType === "supervision-etat") && !!builderClient;
}

/** Any in-progress report builder (period gate, intervention, placeholders, supervision). */
export function isReportBuilderSessionActive({
  builderType,
  builderClient,
  draftReport
} = {}) {
  if (isMonitoringReportBuilderActive(builderType, builderClient)) return true;
  return Boolean(draftReport);
}
