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

const REPORT_EXPORT_META = {
  supervision: {
    key: "supervision",
    fileLabel: "Rapport de supervision",
    metaKey: "supervision"
  },
  sauvegarde: {
    key: "sauvegarde",
    fileLabel: "Rapport sauvegardes",
    metaKey: "cybersecurite"
  },
  services: {
    key: "services",
    fileLabel: "Rapport services",
    metaKey: "services"
  }
};

function buildSingleReportHtml({ clone, clientName, periodLabel, reportKey, collectedCss }) {
  const meta = REPORT_EXPORT_META[reportKey] || REPORT_EXPORT_META.supervision;
  const reportMeta = REPORT_META[meta.metaKey] || REPORT_META.supervision;
  const title = clone?.getAttribute?.("data-report-title") || meta.fileLabel;
  const headerHtml = buildExportHeaderHtml({
    clientName,
    periodLabel,
    reportType: meta.metaKey
  });
  const bodyContent = `
  ${headerHtml}
  <main class="vex-main">
    ${clone.outerHTML}
  </main>`;
  return {
    fileLabel: title || reportMeta.label || meta.fileLabel,
    html: buildReportDocumentHtml({
      documentTitle: `${clientName} - ${title || reportMeta.label}`,
      collectedCss,
      bodyContent
    })
  };
}

export async function buildReportZipBlob(ref, config) {
  if (!ref?.current) {
    throw new Error("Contenu de synthèse indisponible. Ouvrez l’étape Synthèse, puis réessayez.");
  }
  if (!config?.client) {
    throw new Error("Configuration client manquante.");
  }
  const root = ref.current;
  const parts = Array.from(root.querySelectorAll("[data-report-export]"));
  const collectedCss = collectDocumentCSS();
  const clientName = config.client.name || config.client.nom || "CLIENT";
  const periodLabel = buildReportPeriodLabel(config.client);
  const safeName = String(clientName).replace(/\s+/g, " ").trim() || "CLIENT";

  const zip = new JSZip();
  const reports = parts.length
    ? parts.map(part => {
        const clone = stripExportHidden(part.cloneNode(true));
        if (clone.style) clone.style.display = "block";
        return buildSingleReportHtml({
          clone,
          clientName,
          periodLabel,
          reportKey: part.getAttribute("data-report-export") || "supervision",
          collectedCss
        });
      })
    : [
        buildSingleReportHtml({
          clone: stripExportHidden(root.cloneNode(true)),
          clientName,
          periodLabel,
          reportKey: "supervision",
          collectedCss
        })
      ];

  reports.forEach(report => {
    zip.file(`${safeName} - ${report.fileLabel}.html`, report.html);
  });

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
