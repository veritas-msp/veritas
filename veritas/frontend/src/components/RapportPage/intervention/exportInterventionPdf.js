import { jsPDF } from "jspdf";
function addSectionTitle(doc, text, y, color, font, size, margin) {
  doc.setFont(font, "bold").setFontSize(size).setTextColor(color);
  doc.text(text, margin, y);
  doc.setTextColor(0);
  return y + size + 2;
}
function addSectionText(doc, text, y, font, size, pageWidth, margin, color = 0) {
  doc.setFont(font, "normal").setFontSize(size).setTextColor(color);
  const lines = doc.splitTextToSize(text || "-", pageWidth - margin * 2);
  doc.text(lines, margin, y);
  doc.setTextColor(0);
  return y + lines.length * (size + 2);
}
function checkPage(doc, y, needed, margin) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}
function drawMaterialTable(doc, mouvements, labels, y, margin, pageWidth, font) {
  if (!mouvements?.length) return y;
  y = checkPage(doc, y, 80, margin);
  doc.setFont(font, "bold").setFontSize(13).setTextColor("#3366cc");
  doc.text(labels.materiel, margin, y);
  y += 14;
  doc.setTextColor(0);
  const colWidths = [180, 50, 70, pageWidth - margin * 2 - 300];
  const headers = [labels.designation, labels.quantite, labels.mouvement, labels.commentaire];
  const rowHeight = 18;
  doc.setFillColor(220, 228, 242);
  doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
  doc.setFont(font, "bold").setFontSize(9);
  let x = margin + 4;
  headers.forEach((header, index) => {
    doc.text(header, x, y + 12);
    x += colWidths[index];
  });
  y += rowHeight;
  doc.setFont(font, "normal").setFontSize(9);
  mouvements.forEach(row => {
    y = checkPage(doc, y, rowHeight + 4, margin);
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, y, pageWidth - margin * 2, rowHeight);
    x = margin + 4;
    const cells = [row.designation || "-", String(row.quantite ?? "-"), row.type || "-", row.commentaire || "-"];
    cells.forEach((cell, index) => {
      const clipped = doc.splitTextToSize(String(cell), colWidths[index] - 8);
      doc.text(clipped[0] || "-", x, y + 12);
      x += colWidths[index];
    });
    y += rowHeight;
  });
  return y + 10;
}
export function exportInterventionPdf(data, labels, {
  asBlob = false,
  fileName = "rapport-intervention.pdf"
} = {}) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait"
  });
  const selectedFont = "helvetica";
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;
  doc.setFont(selectedFont, "bold").setFontSize(22).setTextColor("#2b5fab");
  doc.text(labels.title, pageWidth / 2, y, {
    align: "center"
  });
  y += 40;
  doc.setTextColor(0);
  doc.setFont(selectedFont, "bold").setFontSize(12);
  doc.text(labels.intervenant, margin, y);
  doc.text(labels.beneficiaire, pageWidth / 2 + 20, y);
  y += 18;
  doc.setFont(selectedFont, "normal").setFontSize(10);
  doc.text(`${labels.companyName} : ${data.companyName || "-"}`, margin, y);
  doc.text(`${labels.client} : ${data.client || "-"}`, pageWidth / 2 + 20, y);
  y += 14;
  doc.text(`${labels.companyAddress} : ${data.companyAddress || "-"}`, margin, y);
  doc.text(`${labels.adresse} : ${data.adresse || "-"}`, pageWidth / 2 + 20, y);
  y += 14;
  doc.text(`${labels.companyTaxId} : ${data.companyTaxId || "-"}`, margin, y);
  doc.text(`${labels.contactSite} : ${data.contactSite || "-"}`, pageWidth / 2 + 20, y);
  y += 20;
  doc.setDrawColor("#b3b3b3");
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.numero} :`, margin, y);
  doc.setFont(selectedFont, "normal");
  doc.text(`${data.numeroIntervention || "-"}`, margin + 120, y);
  y += 14;
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.dateIntervention} :`, margin, y);
  doc.setFont(selectedFont, "normal");
  doc.text(`${data.dateIntervention || "-"}`, margin + 140, y);
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.duree} :`, pageWidth / 2, y);
  doc.setFont(selectedFont, "normal");
  doc.text(`${data.dureeIntervention || "-"} ${labels.heures}`, pageWidth / 2 + 80, y);
  y += 24;
  y = checkPage(doc, y, 60, margin);
  y = addSectionTitle(doc, labels.demande, y, "#3366cc", selectedFont, 13, margin);
  y = addSectionText(doc, data.descriptionDemande, y, selectedFont, 10, pageWidth, margin, "#222");
  y += 10;
  y = checkPage(doc, y, 60, margin);
  y = addSectionTitle(doc, labels.compteRendu, y, "#3366cc", selectedFont, 13, margin);
  y = addSectionText(doc, data.compteRendu, y, selectedFont, 10, pageWidth, margin, "#222");
  y += 10;
  const todos = (data.todos || []).filter(item => String(item?.text || "").trim());
  if (todos.length > 0) {
    y = checkPage(doc, y, 60, margin);
    y = addSectionTitle(doc, labels.todos, y, "#3366cc", selectedFont, 13, margin);
    doc.setFont(selectedFont, "normal").setFontSize(10);
    todos.forEach(item => {
      y = checkPage(doc, y, 20, margin);
      const status = item.done ? labels.todoDone : labels.todoPending;
      const planned = String(item.plannedFor || "").trim();
      const line = planned ? `${status} · ${item.text} (${labels.plannedFor}: ${planned})` : `${status} · ${item.text}`;
      const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 4;
    });
    y += 6;
  }
  y = drawMaterialTable(doc, data.mouvements, labels, y, margin, pageWidth, selectedFont);
  y = checkPage(doc, y, 120, margin);
  doc.setDrawColor("#b3b3b3");
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;
  doc.setFont(selectedFont, "bold").setFontSize(10);
  doc.text(`${labels.signedDoc} :`, margin, y);
  doc.setFont(selectedFont, "normal");
  doc.text(data.requireSignature ? labels.yes : labels.no, margin + 110, y);
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.recipientName} :`, pageWidth / 2 + 20, y);
  doc.setFont(selectedFont, "normal");
  doc.text(data.signatureNom || data.signatureMotif || "-", pageWidth / 2 + 140, y);
  y += 14;
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.reserve} :`, margin, y);
  doc.setFont(selectedFont, "normal");
  const reserveLines = doc.splitTextToSize(data.signatureReserve || "-", pageWidth - margin * 5);
  doc.text(reserveLines, margin + 100, y);
  y += reserveLines.length * 12 + 10;
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.place} :`, pageWidth / 2 + 20, y);
  doc.setFont(selectedFont, "normal");
  doc.text(data.signatureLieu || "-", pageWidth / 2 + 70, y);
  doc.setFont(selectedFont, "bold");
  doc.text(`${labels.date} :`, pageWidth - margin - 80, y);
  doc.setFont(selectedFont, "normal");
  doc.text(data.signatureDate || "-", pageWidth - margin - 50, y);
  y += 30;
  if (data.requireSignature) {
    doc.setFont(selectedFont, "bold").setFontSize(10);
    doc.text(labels.prestataire, margin, y);
    doc.text(labels.clientSign, pageWidth - margin - 160, y);
    y += 14;
    if (data.signaturePrestataire) {
      doc.addImage(data.signaturePrestataire, "PNG", margin, y, 160, 60);
    }
    if (data.signatureClient) {
      doc.addImage(data.signatureClient, "PNG", pageWidth - margin - 160, y, 160, 60);
    }
    y += 70;
  } else if (data.signaturePrestataire || data.signatureClient) {
    doc.setFont(selectedFont, "bold").setFontSize(10);
    doc.text(labels.prestataire, margin, y);
    doc.text(labels.clientSign, pageWidth - margin - 160, y);
    y += 14;
    if (data.signaturePrestataire) {
      doc.addImage(data.signaturePrestataire, "PNG", margin, y, 160, 60);
    }
    if (data.signatureClient) {
      doc.addImage(data.signatureClient, "PNG", pageWidth - margin - 160, y, 160, 60);
    }
  }
  if (asBlob) {
    return doc.output("blob");
  }
  doc.save(fileName);
  return null;
}
export function buildInterventionPdfLabels(copy) {
  const ctx = copy.context;
  const inter = copy.interventions;
  const val = copy.validation;
  const rep = copy.report;
  const todosCopy = copy.todos;
  return {
    title: val.title,
    intervenant: ctx.intervenant,
    beneficiaire: ctx.beneficiaire,
    companyName: ctx.companyName,
    companyAddress: ctx.companyAddress,
    companyTaxId: ctx.companyTaxId,
    client: ctx.client,
    adresse: ctx.adresse,
    contactSite: ctx.contactSite,
    numero: inter.numero,
    dateIntervention: inter.dateIntervention,
    duree: inter.duree,
    heures: val.heures,
    demande: val.demande,
    compteRendu: val.compteRendu,
    todos: val.todos,
    todoDone: todosCopy.done,
    todoPending: todosCopy.pending,
    plannedFor: todosCopy.plannedFor,
    materiel: val.materiel,
    designation: inter.designation,
    quantite: inter.quantite,
    mouvement: inter.mouvement,
    commentaire: inter.commentaire,
    signedDoc: val.signedDoc,
    recipientName: val.recipientName,
    reserve: val.reserve,
    place: val.place,
    date: val.date,
    yes: rep.yes,
    no: rep.no,
    prestataire: rep.prestataire,
    clientSign: rep.clientSign
  };
}
