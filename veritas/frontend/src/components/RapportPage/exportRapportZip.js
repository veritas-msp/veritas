import JSZip from "jszip";
import { saveAs } from "file-saver";
import { REPORT_META, buildExportHeaderHtml, buildReportDocumentHtml, buildReportPeriodLabel } from "./exportRapportHtmlTemplate";

function collectDocumentCSS() {
  let css = "";
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of sheet.cssRules) {
          css += rule.cssText + "\n";
        }
      } catch {}
    }
  } catch (e) {
    console.warn("Report export: CSS collection", e);
  }
  return css;
}

function stripExportHidden(node) {
  if (!node || typeof node.querySelectorAll !== "function") return node;
  node.querySelectorAll("[data-export-hide]").forEach(el => el.remove());
  return node;
}

function formatZipDate(d) {
  try {
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return "";
  }
}

export async function buildReportZipBlob(ref, config) {
  if (!ref?.current) {
    throw new Error("Contenu de synthèse indisponible. Ouvrez l’étape Synthèse, puis réessayez.");
  }
  if (!config?.client) {
    throw new Error("Configuration client manquante.");
  }
  const root = ref.current;
  const clone = stripExportHidden(root.cloneNode(true));
  if (clone.style) clone.style.display = "block";

  const clientName = config.client.name || config.client.nom || "CLIENT";
  const periodLabel = buildReportPeriodLabel(config.client);
  const headerHtml = buildExportHeaderHtml({
    clientName,
    periodLabel,
    reportType: "supervision"
  });
  const bodyContent = `
  ${headerHtml}
  <main class="vex-main">
    ${clone.outerHTML}
  </main>`;
  const html = buildReportDocumentHtml({
    documentTitle: `${clientName} - ${REPORT_META.supervision.label}`,
    collectedCss: collectDocumentCSS(),
    bodyContent
  });

  const zip = new JSZip();
  const safeName = String(clientName).replace(/\s+/g, " ").trim() || "CLIENT";
  zip.file(`${safeName} - Rapport de supervision.html`, html);

  const start = config.client.reportStartDate;
  const end = config.client.reportEndDate;
  let zipFileName = "Rapport de supervision";
  if (start && end) {
    zipFileName = `Rapport supervision ${formatZipDate(start)} - ${formatZipDate(end)}`;
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    fileName: `${zipFileName}.zip`
  };
}

export async function exportReportAsZIP(ref, config) {
  const { blob, fileName } = await buildReportZipBlob(ref, config);
  saveAs(blob, fileName);
}
