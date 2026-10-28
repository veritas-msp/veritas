import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchReportBranding } from "../../api/reportBranding";
import {
  REPORT_META,
  buildExportHeaderHtml,
  buildReportDocumentHtml,
  buildReportPeriodLabel
} from "./exportRapportHtmlTemplate";

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

function removeNodes(root, selector) {
  root.querySelectorAll(selector).forEach(el => el.remove());
}

/**
 * Prépare le clone DOM d'un onglet pour l'export HTML :
 * retire l'UI interactive, fige la synthèse éditable, force l'affichage.
 */
function prepareReportExportClone(sourceNode) {
  const clone = sourceNode.cloneNode(true);

  removeNodes(clone, "[data-export-hide]");
  removeNodes(clone, "script, style, noscript, template");
  removeNodes(clone, "button, [role='tablist'], [role='menu'], [role='dialog']");

  clone.querySelectorAll("[contenteditable]").forEach(el => {
    const html = el.innerHTML || "";
    const staticEl = clone.ownerDocument.createElement("div");
    staticEl.className = `vex-synth ${el.className || ""}`.trim();
    staticEl.innerHTML = html;
    el.replaceWith(staticEl);
  });

  /* Figé les SVG Iconify pour l’export (taille + currentColor). */
  clone.querySelectorAll("svg").forEach(svg => {
    const width = svg.getAttribute("width") || svg.getAttribute("data-width") || "18";
    const height = svg.getAttribute("height") || svg.getAttribute("data-height") || width;
    svg.setAttribute("width", String(width).replace(/px$/i, ""));
    svg.setAttribute("height", String(height).replace(/px$/i, ""));
    svg.style.maxWidth = "none";
    svg.style.flexShrink = "0";
    svg.style.display = "inline-block";
    svg.style.overflow = "visible";
    if (!svg.getAttribute("fill") || svg.getAttribute("fill") === "none") {
      /* paths Iconify gèrent souvent leur fill ; forcer currentColor sur le root aide. */
      if (!svg.querySelector("[fill]:not([fill='none']):not([fill='currentColor'])")) {
        svg.setAttribute("fill", "currentColor");
      }
    }
    svg.querySelectorAll("path, circle, rect, polygon").forEach(node => {
      const fill = node.getAttribute("fill");
      if (!fill || fill === "currentColor") {
        node.setAttribute("fill", "currentColor");
      }
    });
  });

  clone.querySelectorAll("*").forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "contenteditable" || name === "tabindex") {
        el.removeAttribute(attr.name);
      }
    });
    if (el.style) {
      el.style.removeProperty("display");
      el.style.removeProperty("visibility");
      el.style.removeProperty("opacity");
      el.style.removeProperty("height");
      el.style.removeProperty("max-height");
      el.style.removeProperty("overflow");
      el.style.removeProperty("pointer-events");
    }
  });

  Array.from(clone.classList || []).forEach(cls => {
    if (/hidden|pending|fade/i.test(cls)) clone.classList.remove(cls);
  });

  clone.removeAttribute("aria-hidden");
  clone.removeAttribute("hidden");
  if (clone.style) {
    clone.style.setProperty("display", "block", "important");
    clone.style.removeProperty("visibility");
    clone.style.removeProperty("opacity");
  }

  const wrap = clone.ownerDocument.createElement("div");
  wrap.className = "vex-report";
  wrap.setAttribute("data-vex-report", clone.getAttribute("data-report-export") || "");
  while (clone.firstChild) wrap.appendChild(clone.firstChild);

  return wrap;
}

function buildSingleReportHtml({ clone, clientName, periodLabel, reportKey, branding, title: titleOverride }) {
  const meta = REPORT_EXPORT_META[reportKey] || REPORT_EXPORT_META.supervision;
  const reportMeta = REPORT_META[meta.metaKey] || REPORT_META.supervision;
  const title =
    titleOverride ||
    clone?.getAttribute?.("data-report-title") ||
    sourceTitleFromKey(reportKey) ||
    meta.fileLabel;
  const headerHtml = buildExportHeaderHtml({
    clientName,
    periodLabel,
    reportType: meta.metaKey,
    branding
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
      collectedCss: "",
      bodyContent,
      branding
    })
  };
}

function sourceTitleFromKey(reportKey) {
  if (reportKey === "supervision") return "Rapport de supervision";
  if (reportKey === "sauvegarde") return "Rapport sauvegardes";
  if (reportKey === "services") return "Rapport services";
  return "";
}

async function resolveReportBranding() {
  try {
    return (await fetchReportBranding()) || null;
  } catch (err) {
    console.warn("Report export: branding unavailable", err);
    return null;
  }
}

function collectReportParts(root, { clientName, periodLabel, branding }) {
  const parts = Array.from(root.querySelectorAll("[data-report-export]"));
  const orderedKeys = ["supervision", "sauvegarde", "services"];

  if (!parts.length) {
    return [
      buildSingleReportHtml({
        clone: prepareReportExportClone(root),
        clientName,
        periodLabel,
        reportKey: "supervision",
        branding
      })
    ];
  }

  const byKey = new Map();
  parts.forEach(part => {
    const key = part.getAttribute("data-report-export") || "supervision";
    byKey.set(key, part);
  });

  const sequence = [
    ...orderedKeys.filter(key => byKey.has(key)),
    ...[...byKey.keys()].filter(key => !orderedKeys.includes(key))
  ];

  return sequence.map(reportKey => {
    const part = byKey.get(reportKey);
    const title = part.getAttribute("data-report-title") || sourceTitleFromKey(reportKey);
    const clone = prepareReportExportClone(part);
    return buildSingleReportHtml({
      clone,
      clientName,
      periodLabel,
      reportKey,
      branding,
      title
    });
  });
}

function resolveExportContext(ref, config) {
  if (!ref?.current) {
    throw new Error("Contenu de synthèse indisponible. Ouvrez l’étape Synthèse, puis réessayez.");
  }
  if (!config?.client) {
    throw new Error("Configuration client manquante.");
  }
  const clientName = config.client.name || config.client.nom || "CLIENT";
  const periodLabel = buildReportPeriodLabel(config.client);
  const safeName = String(clientName).replace(/\s+/g, " ").trim() || "CLIENT";
  return {
    root: ref.current,
    clientName,
    periodLabel,
    safeName
  };
}

function buildFolderLabel(client) {
  const start = client?.reportStartDate;
  const end = client?.reportEndDate;
  if (start && end) {
    return `Rapport supervision ${formatZipDate(start)} - ${formatZipDate(end)}`;
  }
  return "Rapport de supervision";
}

export async function buildReportZipBlob(ref, config) {
  const { root, clientName, periodLabel, safeName } = resolveExportContext(ref, config);
  const branding = await resolveReportBranding();
  const zip = new JSZip();
  const reports = collectReportParts(root, { clientName, periodLabel, branding });

  reports.forEach(report => {
    const safeLabel = String(report.fileLabel || "Rapport").replace(/[<>:"/\\|?*]+/g, " ").trim();
    zip.file(`${safeName} - ${safeLabel}.html`, report.html);
  });

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  return {
    blob,
    fileName: `${buildFolderLabel(config.client)}.zip`
  };
}

/**
 * Construit les 3 HTML distincts (supervision / sauvegardes / services) sans zip.
 */
export async function buildReportHtmlParts(ref, config) {
  const { root, clientName, periodLabel, safeName } = resolveExportContext(ref, config);
  const branding = await resolveReportBranding();
  const reports = collectReportParts(root, { clientName, periodLabel, branding });

  return {
    folderLabel: buildFolderLabel(config.client),
    files: reports.map(report => {
      const safeLabel =
        String(report.fileLabel || "Rapport").replace(/[<>:"/\\|?*]+/g, " ").trim() || "Rapport";
      const fileName = `${safeName} - ${safeLabel}.html`;
      const html = report.html || "";
      return {
        fileName,
        html,
        blob: new Blob([html], { type: "text/html;charset=utf-8" })
      };
    })
  };
}

export async function exportReportAsZIP(ref, config) {
  const { blob, fileName } = await buildReportZipBlob(ref, config);
  saveAs(blob, fileName);
}
