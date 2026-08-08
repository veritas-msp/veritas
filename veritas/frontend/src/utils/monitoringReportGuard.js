export const MONITORING_REPORT_LEAVE_MESSAGE = "A monitoring report is being prepared. Do you really want to leave? Unsaved changes will be lost.";
export function confirmLeaveMonitoringReport() {
  return window.confirm(MONITORING_REPORT_LEAVE_MESSAGE);
}
export function isMonitoringReportBuilderActive(builderType, builderClient) {
  return builderType === "monitoring" && !!builderClient;
}
