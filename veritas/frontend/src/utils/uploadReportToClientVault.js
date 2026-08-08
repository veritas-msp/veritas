import { uploadClientFile } from "../api/clientFiles";
export async function uploadReportArchiveToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false
}) {
  if (!blob || !clientId) {
    throw new Error("Insufficient data to archive the report.");
  }
  const baseName = String(fileName || "monitoring-report").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const zipName = baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`;
  const file = new File([blob], zipName, {
    type: "application/zip"
  });
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient)
  });
}
export async function uploadInterventionPdfToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false
}) {
  if (!blob || !clientId) {
    throw new Error("Insufficient data to archive the report.");
  }
  const baseName = String(fileName || "rapport-intervention").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const pdfName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
  const file = new File([blob], pdfName, {
    type: "application/pdf"
  });
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient)
  });
}
