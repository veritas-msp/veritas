import JSZip from "jszip";
import { saveAs } from "file-saver";
import { REPORT_META, buildExportCommentsEmptyHtml, buildExportHeaderHtml, buildReportDocumentHtml, buildReportPeriodLabel } from "./exportRapportHtmlTemplate";
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
function buildReportHTML(sectionClone, commentsHtml, config, reportType) {
  const clientName = config?.client?.name || config?.client?.nom || "CLIENT";
  const meta = REPORT_META[reportType] || {
    label: "de monitoring"
  };
  const documentTitle = `${clientName} - ${meta.label}`;
  const periodLabel = buildReportPeriodLabel(config?.client);
  const headerHtml = buildExportHeaderHtml({
    clientName,
    periodLabel,
    reportType
  });
  const commentsBlock = commentsHtml || buildExportCommentsEmptyHtml();
  const bodyContent = `
  ${headerHtml}
  <main class="vex-main">
    ${sectionClone.outerHTML}
    ${commentsBlock}
  </main>`;
  return buildReportDocumentHtml({
    documentTitle,
    collectedCss: collectDocumentCSS(),
    bodyContent
  });
}
export async function buildReportZipBlob(ref, config) {
  if (!ref?.current) {
    throw new Error("Summary content unavailable. Open the “Report summary” step, then try again.");
  }
  if (!config?.client) {
    throw new Error("Client configuration missing.");
  }
  const root = ref.current;
  const sections = [{
    type: "infrastructure",
    selector: '[data-export-section="infrastructure"]'
  }, {
    type: "cybersecurite",
    selector: '[data-export-section="cybersecurite"]'
  }, {
    type: "services",
    selector: '[data-export-section="services"]'
  }];
  const zip = new JSZip();
  const clientName = (config.client.name || config.client.nom || "CLIENT").toString().replace(/\s+/g, " ");
  const fileNames = {
    infrastructure: `${clientName} - Infrastructure report.html`,
    cybersecurite: `${clientName} - Cybersecurity report.html`,
    services: `${clientName} - Services report.html`
  };
  const commentsEl = root.querySelector('[data-export-comments="true"]');
  const commentsHtml = commentsEl ? commentsEl.outerHTML : "";
  for (const {
    type,
    selector
  } of sections) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const clone = el.cloneNode(true);
    if (clone.style) {
      clone.style.display = "block";
    }
    const html = buildReportHTML(clone, commentsHtml, config, type);
    zip.file(fileNames[type], html);
  }
  if (Object.keys(zip.files).length === 0) {
    throw new Error("No report to export. Open the “Report summary” step, then try again.");
  }
  const start = config.client.reportStartDate;
  const end = config.client.reportEndDate;
  let zipFileName = "MONITORING REPORTS";
  if (start && end) {
    const formatZipDate = d => {
      try {
        const date = new Date(d);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      } catch {
        return "";
      }
    };
    zipFileName = `RAPPORTS ${formatZipDate(start)} - ${formatZipDate(end)}`;
  }
  const blob = await zip.generateAsync({
    type: "blob"
  });
  return {
    blob,
    fileName: `${zipFileName}.zip`
  };
}
export async function exportReportAsZIP(ref, config) {
  const {
    blob,
    fileName
  } = await buildReportZipBlob(ref, config);
  saveAs(blob, fileName);
}
