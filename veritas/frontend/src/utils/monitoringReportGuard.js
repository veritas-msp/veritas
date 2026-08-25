export const MONITORING_REPORT_LEAVE_MESSAGE =
  "Un rapport de supervision est en cours de préparation. Voulez-vous vraiment quitter ? Les modifications non enregistrées seront perdues.";

export function confirmLeaveMonitoringReport() {
  return window.confirm(MONITORING_REPORT_LEAVE_MESSAGE);
}

/** Active when Documents → État de supervision (or legacy monitoring) builder is open. */
export function isMonitoringReportBuilderActive(builderType, builderClient) {
  return (builderType === "monitoring" || builderType === "supervision-etat") && !!builderClient;
}
