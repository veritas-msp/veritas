import { jsPDF } from "jspdf";
import { exportBrandedReportPdfFromElement } from "../exportBrandedReportPdfFromElement";

const COLORS = {
  labelBg: [232, 240, 248],
  headerBg: [30, 74, 122],
  border: [180, 198, 216],
  text: [30, 74, 122],
  muted: [90, 110, 130],
  ok: [34, 140, 70],
  pb: [190, 40, 40],
  white: [255, 255, 255],
  photoBg: [210, 226, 240]
};

function checkPage(doc, y, needed, margin) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawInfoTable(doc, rows, y, margin, pageWidth, font) {
  const tableWidth = pageWidth - margin * 2;
  const labelWidth = tableWidth * 0.38;
  const valueWidth = tableWidth - labelWidth;
  const lineHeight = 12;
  const padY = 8;

  rows.forEach(row => {
    const valueLines = doc.splitTextToSize(String(row.value || " "), valueWidth - 16);
    const labelLines = doc.splitTextToSize(String(row.label || ""), labelWidth - 16);
    const lines = Math.max(valueLines.length, labelLines.length, 1);
    const rowHeight = Math.max(28, lines * lineHeight + padY * 2);
    y = checkPage(doc, y, rowHeight + 2, margin);

    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.labelBg);
    doc.rect(margin, y, labelWidth, rowHeight, "FD");
    doc.setFillColor(...COLORS.white);
    doc.rect(margin + labelWidth, y, valueWidth, rowHeight, "FD");

    doc.setFont(font, "bold").setFontSize(10).setTextColor(...COLORS.text);
    doc.text(labelLines, margin + 8, y + padY + 8);
    doc.setFont(font, "normal").setTextColor(...COLORS.text);
    doc.text(valueLines, margin + labelWidth + 8, y + padY + 8);
    y += rowHeight;
  });
  return y;
}

function drawTaskBlock(doc, title, tasks, emptyLabel, y, margin, pageWidth, font, accentColor) {
  const tableWidth = pageWidth - margin * 2;
  const headerHeight = 26;
  const pad = 8;
  const lineHeight = 12;

  y = checkPage(doc, y, headerHeight + 40, margin);
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(margin, y, tableWidth, headerHeight, "F");
  doc.setFont(font, "bold").setFontSize(11).setTextColor(...COLORS.white);
  doc.text(title, margin + 10, y + 17);
  y += headerHeight + 4;

  const rows = tasks.length ? tasks : [{ label: emptyLabel || "—" }];
  rows.forEach((task, index) => {
    const label = String(task?.label || emptyLabel || "—");
    const lines = doc.splitTextToSize(label, tableWidth - 36);
    const rowHeight = Math.max(22, lines.length * lineHeight + pad);
    y = checkPage(doc, y, rowHeight + 2, margin);
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, tableWidth, rowHeight, "FD");
    doc.setFont(font, "bold").setFontSize(9).setTextColor(...accentColor);
    doc.text(String(index + 1), margin + 8, y + pad + 6);
    doc.setFont(font, "normal").setFontSize(10).setTextColor(...COLORS.text);
    doc.text(lines, margin + 24, y + pad + 6);
    y += rowHeight;
  });

  return y + 10;
}

function drawOperationsSection(doc, data, labels, y, margin, pageWidth, font) {
  const done = (Array.isArray(data.tasksDone) ? data.tasksDone : [])
    .map(task => ({ label: String(task?.label || "").trim() }))
    .filter(task => task.label);
  const todo = (Array.isArray(data.tasksTodo) ? data.tasksTodo : [])
    .map(task => ({ label: String(task?.label || "").trim() }))
    .filter(task => task.label);

  // Legacy fallback
  if (!done.length && !todo.length && Array.isArray(data.operations)) {
    data.operations.forEach(op => {
      const label = String(op?.label || "").trim();
      if (!label) return;
      if (op.status === "pb") todo.push({ label });
      else done.push({ label });
    });
  }

  y = drawTaskBlock(
    doc,
    labels.doneTitle || labels.operationsTitle,
    done,
    labels.emptyDone,
    y,
    margin,
    pageWidth,
    font,
    COLORS.ok
  );
  y = drawTaskBlock(
    doc,
    labels.todoTitle || "Todo",
    todo,
    labels.emptyTodo,
    y,
    margin,
    pageWidth,
    font,
    COLORS.pb
  );

  const comment = String(data.operationsComment || "").trim();
  if (comment) {
    const tableWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(comment, tableWidth - 16);
    const blockHeight = 26 + lines.length * 12 + 16;
    y = checkPage(doc, y, blockHeight, margin);
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(margin, y, tableWidth, 26, "F");
    doc.setFont(font, "bold").setFontSize(11).setTextColor(...COLORS.white);
    doc.text(labels.commentLabel || "Comment", margin + 10, y + 17);
    y += 26;
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.white);
    doc.rect(margin, y, tableWidth, lines.length * 12 + 16, "FD");
    doc.setFont(font, "normal").setFontSize(10).setTextColor(...COLORS.text);
    doc.text(lines, margin + 8, y + 14);
    y += lines.length * 12 + 28;
  }

  return y;
}

function drawRemarksBlock(doc, data, labels, y, margin, pageWidth, font) {
  const tableWidth = pageWidth - margin * 2;
  y = checkPage(doc, y, 220, margin);

  doc.setFillColor(...COLORS.headerBg);
  doc.rect(margin, y, tableWidth, 28, "F");
  doc.setFont(font, "bold").setFontSize(11).setTextColor(...COLORS.white);
  doc.text(labels.remarksTitle, margin + 10, y + 18);
  y += 28;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(248, 250, 252);
  const reserveHeight = 70;
  doc.rect(margin, y, tableWidth, reserveHeight, "FD");
  doc.setFont(font, "bold").setFontSize(10).setTextColor(...COLORS.text);
  doc.text(labels.reservesClient, margin + 10, y + 16);
  doc.setFont(font, "normal");
  const reserveLines = doc.splitTextToSize(String(data.reservesClient || " "), tableWidth - 20);
  doc.text(reserveLines, margin + 10, y + 32);
  y += reserveHeight + 10;

  const certify = labels.certifyTemplate
    .replace("{name}", data.signataireNom || "………………")
    .replace("{role}", data.signataireFonction || "………………");
  doc.setFont(font, "normal").setFontSize(10).setTextColor(...COLORS.text);
  const certifyLines = doc.splitTextToSize(certify, tableWidth);
  doc.text(certifyLines, margin, y);
  y += certifyLines.length * 13 + 8;

  doc.setFont(font, "bold");
  doc.text(`${labels.place} :`, margin, y);
  doc.setFont(font, "normal");
  doc.text(data.signatureLieu || "………………", margin + 50, y);
  doc.setFont(font, "bold");
  doc.text(`${labels.date} :`, margin + tableWidth / 2, y);
  doc.setFont(font, "normal");
  doc.text(data.signatureDate || "………………", margin + tableWidth / 2 + 30, y);
  y += 24;

  const colWidth = (tableWidth - 12) / 2;
  const boxHeight = 95;
  y = checkPage(doc, y, boxHeight + 4, margin);

  [
    {
      title: labels.clientSignTitle,
      subtitle: labels.nameAndSignature,
      image: data.signatureClient
    },
    {
      title: labels.providerSignTitle.replace("{org}", data.companyName || labels.providerFallback),
      subtitle: labels.nameAndSignature,
      image: data.signaturePrestataire
    }
  ].forEach((box, index) => {
    const x = margin + index * (colWidth + 12);
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(248, 250, 252);
    doc.rect(x, y, colWidth, boxHeight, "FD");
    doc.setFont(font, "bold").setFontSize(9).setTextColor(...COLORS.text);
    doc.text(box.title, x + 8, y + 16);
    doc.setFont(font, "normal").setFontSize(8).setTextColor(...COLORS.muted);
    doc.text(box.subtitle, x + 8, y + 30);
    if (box.image) {
      try {
        doc.addImage(box.image, "PNG", x + 12, y + 38, colWidth - 24, 48);
      } catch {
        // ignore invalid signature image
      }
    }
  });

  return y + boxHeight;
}

export async function exportInterventionPdfFromElement(sourceEl, options = {}) {
  return exportBrandedReportPdfFromElement(sourceEl, {
    fileName: "rapport-intervention.pdf",
    ...options
  });
}

export function exportInterventionPdf(data, labels, { asBlob = false, fileName = "rapport-intervention.pdf" } = {}) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait"
  });
  const font = "helvetica";
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  let y = margin;

  doc.setFont(font, "bold").setFontSize(18).setTextColor(...COLORS.text);
  doc.text(labels.title, pageWidth / 2, y, { align: "center" });
  y += 28;

  y = drawInfoTable(
    doc,
    [
      { label: labels.client, value: data.client },
      { label: labels.adresse, value: data.adresse },
      { label: labels.numeroTicket, value: data.numeroTicket },
      { label: labels.typeIntervention, value: data.typeIntervention }
    ],
    y,
    margin,
    pageWidth,
    font
  );
  y += 14;

  const linkedEquipments = Array.isArray(data.linkedEquipments) ? data.linkedEquipments : [];
  const equipmentValue = linkedEquipments.length
    ? linkedEquipments
        .map(item => {
          const label = item?.label || [item?.type, item?.name].filter(Boolean).join(" · ") || item?.id;
          return item?.serial ? `${label} (${labels.numerosSerie}: ${item.serial})` : label;
        })
        .join("\n")
    : data.materiels || "";

  y = drawInfoTable(
    doc,
    [
      { label: labels.materiels, value: equipmentValue },
      { label: labels.numerosSerie, value: data.numerosSerie },
      { label: labels.salle, value: data.salle },
      { label: labels.photoLabel, value: "" }
    ],
    y,
    margin,
    pageWidth,
    font
  );
  y += 8;

  const photoHeight = 150;
  y = checkPage(doc, y, photoHeight + 8, margin);
  doc.setFillColor(...COLORS.photoBg);
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, y, pageWidth - margin * 2, photoHeight, "FD");
  if (data.photoInstallation) {
    try {
      const imgW = pageWidth - margin * 2 - 16;
      const imgH = photoHeight - 16;
      doc.addImage(data.photoInstallation, "JPEG", margin + 8, y + 8, imgW, imgH);
    } catch {
      doc.setFont(font, "italic").setFontSize(10).setTextColor(...COLORS.muted);
      doc.text(labels.photoMissing, pageWidth / 2, y + photoHeight / 2, { align: "center" });
    }
  } else {
    doc.setFont(font, "italic").setFontSize(10).setTextColor(...COLORS.muted);
    doc.text(labels.photoMissing, pageWidth / 2, y + photoHeight / 2, { align: "center" });
  }
  y += photoHeight + 18;

  y = drawOperationsSection(doc, data, labels, y, margin, pageWidth, font);
  y = drawRemarksBlock(doc, data, labels, y, margin, pageWidth, font);

  if (asBlob) return doc.output("blob");
  doc.save(fileName);
  return null;
}

export function buildInterventionPdfLabels(copy) {
  const ctx = copy.context || {};
  const ops = copy.operations || {};
  const rem = copy.remarks || {};
  const val = copy.validation || {};
  return {
    title: val.title || "Rapport d'intervention",
    client: ctx.client || "Nom - Client",
    adresse: ctx.adresse || "Adresse",
    typeIntervention: ctx.typeIntervention || "Type d'intervention",
    numeroTicket: ctx.numeroTicket || "Numéro de ticket",
    salle: ctx.salle || "Salle",
    materiels: ctx.materiels || "Matériel(s) concerné(s)",
    numerosSerie: ctx.numerosSerie || "Numéro(s) de Série",
    photoLabel: ctx.photoLabel || "Photo de l'installation ci-dessous",
    photoMissing: ctx.photoMissing || "Aucune photo",
    operationsTitle: ops.title || "Tâches & commentaire",
    doneTitle: ops.doneTitle || "Tâches effectuées",
    todoTitle: ops.todoTitle || "Tâches restantes",
    emptyDone: ops.emptyDone || "Aucune tâche effectuée.",
    emptyTodo: ops.emptyTodo || "Aucune tâche restante.",
    commentLabel: ops.commentLabel || "Commentaire",
    remarksTitle: rem.title || "REMARQUES SUR LA PRESTATION",
    reservesClient: rem.reservesClient || "Réserves client :",
    certifyTemplate:
      rem.certifyTemplate ||
      "Je soussigné(e), {name} ayant la fonction de {role}, certifie avoir pris connaissance de ce document et atteste du bon fonctionnement des solutions informatiques.",
    place: rem.place || "Fait à",
    date: rem.date || "Le",
    clientSignTitle: rem.clientSignTitle || "Pour le représentant de l'établissement,",
    providerSignTitle: rem.providerSignTitle || "Pour {org},",
    providerFallback: rem.providerFallback || "le prestataire",
    nameAndSignature: rem.nameAndSignature || "Nom & Signature"
  };
}
