import PDFDocument from "pdfkit";

const PAGE_WIDTH = 595;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ACCENT = "#2b5fab";
const TEXT = "#0f1c2e";
const MUTED = "#5c6b82";
const LINE = "#e2e8f0";

function fmt(value, fallback = "—") {
  if (value == null || value === "") return fallback;
  if (typeof value === "number" && !Number.isFinite(value)) return fallback;
  return String(value);
}

function fmtHours(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${value} h`;
}

function fmtPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${value} %`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = n => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function drawKpiGrid(doc, items, y) {
  const cols = Math.min(4, items.length || 1);
  const gap = 8;
  const cardW = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
  const cardH = 52;
  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = MARGIN + col * (cardW + gap);
    const top = y + row * (cardH + gap);
    doc.roundedRect(x, top, cardW, cardH, 6).fill("#f7f9fc");
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(13).text(fmt(item.value), x + 10, top + 10, {
      width: cardW - 20
    });
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(item.label, x + 10, top + 30, {
      width: cardW - 20
    });
  });
  const rows = Math.ceil(items.length / cols);
  return y + rows * (cardH + gap) + 6;
}

function drawTable(doc, columns, rows, y) {
  if (!rows?.length) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("—", MARGIN, y);
    return y + 18;
  }
  const colW = columns.map(col => col.width || CONTENT_WIDTH / columns.length);
  const headerH = 18;
  doc.rect(MARGIN, y, CONTENT_WIDTH, headerH).fill("#eef3f9");
  let x = MARGIN;
  columns.forEach((col, i) => {
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text(col.label, x + 6, y + 5, {
      width: colW[i] - 10
    });
    x += colW[i];
  });
  y += headerH;
  rows.slice(0, 12).forEach((row, index) => {
    if (index % 2 === 1) doc.rect(MARGIN, y, CONTENT_WIDTH, 16).fill("#f8fafc");
    x = MARGIN;
    columns.forEach((col, i) => {
      doc.fillColor(TEXT).font("Helvetica").fontSize(8).text(fmt(row[col.key]), x + 6, y + 4, {
        width: colW[i] - 10
      });
      x += colW[i];
    });
    y += 16;
  });
  return y + 10;
}

function ensureSpace(doc, y, needed = 80) {
  if (y + needed < 790) return y;
  doc.addPage();
  return MARGIN;
}

function sectionTitle(doc, title, y) {
  y = ensureSpace(doc, y, 40);
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(13).text(title, MARGIN, y);
  y += 18;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor(LINE).lineWidth(1).stroke();
  return y + 10;
}

export function generateKpiReportPdf({
  data,
  labels,
  organizationName,
  periodLabel,
  categories
} = {}) {
  const selected = new Set(categories?.length ? categories : ["support", "devices", "enterprise"]);
  const L = labels || {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      info: {
        Title: L.title || "KPI report",
        Author: organizationName || "Veritas"
      }
    });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, PAGE_WIDTH, 92).fill(ACCENT);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text(L.title || "Tableau de bord KPI", MARGIN, 28, {
      width: CONTENT_WIDTH
    });
    doc.font("Helvetica").fontSize(10).text(`${organizationName || "Veritas"} · ${periodLabel || ""}`, MARGIN, 56, {
      width: CONTENT_WIDTH
    });
    doc.fontSize(8).text(`${L.generatedAt || "Généré le"} ${formatDate(data?.generatedAt)}`, MARGIN, 72, {
      width: CONTENT_WIDTH
    });

    let y = 112;
    if (selected.has("support")) {
      y = sectionTitle(doc, L.supportTitle || "Support", y);
      const s = data?.support || {};
      y = drawKpiGrid(doc, [{
        label: L.ticketsCreated || "Tickets créés",
        value: s.overview?.created
      }, {
        label: L.ticketsClosed || "Clôturés",
        value: s.overview?.closed
      }, {
        label: L.ticketsOpen || "Ouverts",
        value: s.overview?.openNow
      }, {
        label: L.closureRate || "Taux de clôture",
        value: fmtPct(s.overview?.closureRate)
      }, {
        label: L.firstResponse || "1re prise en charge",
        value: fmtHours(s.timing?.avgFirstResponseHours)
      }, {
        label: L.resolution || "Résolution",
        value: fmtHours(s.timing?.avgResolutionHours)
      }], y);
      y = ensureSpace(doc, y, 120);
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9).text(L.topAgents || "Agents", MARGIN, y);
      y += 14;
      y = drawTable(doc, [{
        key: "label",
        label: L.agent || "Agent",
        width: 180
      }, {
        key: "assignedCount",
        label: L.assigned || "Assignés",
        width: 90
      }, {
        key: "closedCount",
        label: L.closed || "Clôturés",
        width: 90
      }, {
        key: "openCount",
        label: L.open || "Ouverts",
        width: 90
      }, {
        key: "avgResolutionHours",
        label: L.resolution || "Résol.",
        width: 97
      }], (s.topAgents || []).map(row => ({
        ...row,
        avgResolutionHours: fmtHours(row.avgResolutionHours)
      })), y);
    }

    if (selected.has("devices")) {
      y = sectionTitle(doc, L.devicesTitle || "Périphériques", y);
      const d = data?.devices || data?.infrastructure || {};
      y = drawKpiGrid(doc, [{
        label: L.equipTotal || "Parc",
        value: d.equipTotal ?? d.equipMonitoredTotal
      }, {
        label: L.supervised || "Supervisés",
        value: d.equipUnderSurveillanceCount
      }, {
        label: L.surveillance || "Taux supervision",
        value: fmtPct(d.equipSurveillancePercent)
      }, {
        label: L.rmmOnline || "RMM en ligne",
        value: `${d.rmmOnline ?? 0} / ${d.rmmAgents ?? 0}`
      }, {
        label: L.computers || "Ordinateurs",
        value: d.computersTotal
      }, {
        label: L.computersActive || "Ordinateurs actifs",
        value: d.computersActive
      }], y);
      y = ensureSpace(doc, y, 120);
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9).text(L.families || "Parc par famille", MARGIN, y);
      y += 14;
      y = drawTable(doc, [{
        key: "label",
        label: L.family || "Famille",
        width: 260
      }, {
        key: "count",
        label: L.total || "Total",
        width: 120
      }, {
        key: "monitored",
        label: L.supervised || "Supervisés",
        width: 167
      }], d.families || [], y);
    }

    if (selected.has("enterprise")) {
      y = sectionTitle(doc, L.enterpriseTitle || "Entreprise", y);
      const e = data?.enterprise || data?.crm || {};
      y = drawKpiGrid(doc, [{
        label: L.clients || "Entreprises",
        value: e.clientsPortfolio ?? e.clientsTotal
      }, {
        label: L.contacts || "Contacts",
        value: e.contactsTotal
      }, {
        label: L.contractsActive || "Contrats actifs",
        value: e.contractsActive
      }, {
        label: L.contractsExpiring || "Échéance 30 j",
        value: e.contractsExpiring
      }, {
        label: L.contractsExpired || "Expirés",
        value: e.contractsExpired
      }, {
        label: L.contractsSuspended || "Suspendus",
        value: e.contractsSuspended
      }], y);
      y = ensureSpace(doc, y, 120);
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9).text(L.modules || "Modules contrat", MARGIN, y);
      y += 14;
      y = drawTable(doc, [{
        key: "label",
        label: L.module || "Module",
        width: 360
      }, {
        key: "count",
        label: L.clients || "Entreprises",
        width: 187
      }], e.modules || [], y);
      y = ensureSpace(doc, y, 100);
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9).text(L.solutions || "Solutions déployées", MARGIN, y);
      y += 14;
      const solutionLabels = L.solutionLabels || {};
      y = drawTable(doc, [{
        key: "label",
        label: L.solution || "Solution",
        width: 360
      }, {
        key: "count",
        label: L.total || "Total",
        width: 187
      }], (e.solutions || []).map(row => ({
        label: solutionLabels[row.key] || row.key,
        count: row.count
      })), y);
    }

    doc.end();
  });
}

export function buildKpiPdfFilename(categories = []) {
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = categories.length === 1 ? categories[0] : "kpi";
  return `veritas-${suffix}-${stamp}.pdf`;
}
