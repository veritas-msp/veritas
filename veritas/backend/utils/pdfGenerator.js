import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadReportBranding } from './reportBranding.js';
import { formatStoredSnapshot } from '../services/campaignMfaSnapshotService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_H = 78;
const FOOTER_H = 52;
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function resolveUploadPath(publicPath) {
  const raw = String(publicPath || '').trim().replace(/\\/g, '/');
  if (!raw || raw.includes('..')) return null;
  const relative = raw.startsWith('/uploads/') ? raw.slice('/uploads/'.length) : raw.replace(/^\/+/, '');
  const absolute = path.join(UPLOADS_ROOT, relative);
  return fs.existsSync(absolute) ? absolute : null;
}

function fmtPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)} %`;
}

function fmtDelta(value, suffix = '') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Number.isInteger(n) ? n : n.toFixed(1)}${suffix}`;
}

function fmtDate(value, locale = 'fr-FR') {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value);
  }
}

function drawBrandedHeader(doc, branding, meta) {
  const style = branding?.style || {};
  const bg = style.headerBg || '#0b3d4a';
  const text = style.headerText || '#f8fafc';
  const brand = style.headerBrandColor || '#99f6e4';
  const accent = style.headerAccentBar || '#99f6e4';
  const accentEnd = style.headerAccentBarEnd || '#fbbf24';

  doc.save();
  doc.rect(0, 0, PAGE_WIDTH, HEADER_H).fill(bg);
  doc.rect(0, HEADER_H - 3, PAGE_WIDTH, 3).fill(accent);
  // thin accent end bar
  doc.rect(PAGE_WIDTH - 80, HEADER_H - 3, 80, 3).fill(accentEnd);

  let x = MARGIN;
  const logoPath = branding?.showHeaderLogo ? resolveUploadPath(branding.logoPath) : null;
  if (logoPath) {
    try {
      doc.image(logoPath, x, 16, { height: 36 });
      x += 52;
    } catch {
      // ignore broken logo
    }
  }

  let y = 16;
  if (branding?.showHeaderBrand !== false && branding?.brandLabel) {
    doc.fillColor(brand).font('Helvetica-Bold').fontSize(8).text(String(branding.brandLabel).toUpperCase(), x, y, {
      width: CONTENT_WIDTH - (x - MARGIN) - 120
    });
    y += 12;
  }
  if (branding?.showHeaderCompany !== false) {
    doc.fillColor(text).font('Helvetica-Bold').fontSize(12).text(branding?.companyName || 'Veritas', x, y, {
      width: CONTENT_WIDTH - (x - MARGIN) - 120
    });
    y += 16;
  }
  if (branding?.showHeaderClient !== false) {
    doc.fillColor(text).font('Helvetica').fontSize(9).text(meta.clientName || '—', x, y, {
      width: CONTENT_WIDTH - (x - MARGIN) - 120
    });
  }

  if (branding?.showHeaderPill !== false) {
    const pill = 'Campagne MFA';
    const pillW = 88;
    doc.roundedRect(PAGE_WIDTH - MARGIN - pillW, 18, pillW, 18, 9).fill(accent);
    doc.fillColor(bg).font('Helvetica-Bold').fontSize(8).text(pill, PAGE_WIDTH - MARGIN - pillW, 23, {
      width: pillW,
      align: 'center'
    });
  }
  if (branding?.showHeaderPeriod !== false && meta.periodLabel) {
    doc.fillColor(text).font('Helvetica').fontSize(8).text(meta.periodLabel, PAGE_WIDTH - MARGIN - 160, 42, {
      width: 160,
      align: 'right'
    });
  }
  if (branding?.showHeaderGeneratedAt !== false && meta.generatedAt) {
    doc.fillColor(text).font('Helvetica').fontSize(7).text(meta.generatedAt, PAGE_WIDTH - MARGIN - 160, 56, {
      width: 160,
      align: 'right'
    });
  }
  doc.restore();
  doc.y = HEADER_H + 18;
  doc.x = MARGIN;
}

function drawBrandedFooter(doc, branding, pageNumber, pageCount) {
  const style = branding?.style || {};
  const bg = style.footerBg || '#ffffff';
  const text = style.footerText || '#1e3a5f';
  const muted = style.footerMuted || '#64748b';
  const y0 = PAGE_HEIGHT - FOOTER_H;

  doc.save();
  doc.rect(0, y0, PAGE_WIDTH, FOOTER_H).fill(bg);
  doc.moveTo(MARGIN, y0).lineTo(PAGE_WIDTH - MARGIN, y0).strokeColor('#e2e8f0').lineWidth(0.8).stroke();

  let x = MARGIN;
  const footerLogo = branding?.showFooterLogo ? resolveUploadPath(branding.footerLogoPath || branding.logoPath) : null;
  if (footerLogo) {
    try {
      doc.image(footerLogo, x, y0 + 10, { height: 22 });
      x += 36;
    } catch {
      // ignore
    }
  }

  const leftParts = [];
  if (branding?.showFooterCompany !== false && branding?.companyName) leftParts.push(branding.companyName);
  if (branding?.showFooterBrand !== false && branding?.brandLabel) leftParts.push(branding.brandLabel);
  doc.fillColor(text).font('Helvetica-Bold').fontSize(8).text(leftParts.join(' · ') || 'Veritas', x, y0 + 12, {
    width: 220
  });

  const contact = [];
  if (branding?.showFooterEmail !== false && branding?.supportEmail) contact.push(branding.supportEmail);
  if (branding?.showFooterPhone !== false && branding?.supportPhone) contact.push(branding.supportPhone);
  if (branding?.showFooterWebsite !== false && branding?.website) contact.push(branding.website);
  doc.fillColor(muted).font('Helvetica').fontSize(7).text(contact.join('  ·  '), x, y0 + 26, {
    width: 280
  });

  if (branding?.showFooterNote !== false && branding?.footerNote) {
    doc.fillColor(muted).font('Helvetica-Oblique').fontSize(7).text(branding.footerNote, MARGIN, y0 + 38, {
      width: CONTENT_WIDTH - 80
    });
  }

  doc.fillColor(muted).font('Helvetica').fontSize(8).text(`${pageNumber} / ${pageCount}`, PAGE_WIDTH - MARGIN - 50, y0 + 20, {
    width: 50,
    align: 'right'
  });
  doc.restore();
}

function ensureSpace(doc, branding, meta, needed = 80) {
  if (doc.y + needed < PAGE_HEIGHT - FOOTER_H - 8) return;
  doc.addPage();
  drawBrandedHeader(doc, branding, meta);
}

function sectionTitle(doc, branding, meta, title) {
  ensureSpace(doc, branding, meta, 36);
  const navy = branding?.style?.navy || '#1e3a5f';
  const accent = branding?.style?.accent || '#0f766e';
  doc.fillColor(navy).font('Helvetica-Bold').fontSize(12).text(title, MARGIN, doc.y);
  doc.moveDown(0.15);
  doc.rect(MARGIN, doc.y, 36, 2).fill(accent);
  doc.moveDown(0.55);
  doc.fillColor('#111827');
}

function writeKvGrid(doc, rows, branding, meta) {
  const colW = CONTENT_WIDTH / 2;
  let y = doc.y;
  rows.forEach((row, index) => {
    ensureSpace(doc, branding, meta, 16);
    if (index % 2 === 0) y = doc.y;
    const col = index % 2;
    const x = MARGIN + col * colW;
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(row[0], x, y, { width: colW * 0.55 });
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(row[1], x + colW * 0.55, y, { width: colW * 0.4 });
    if (col === 1 || index === rows.length - 1) {
      doc.y = y + 14;
    }
  });
  doc.moveDown(0.4);
}

export async function generateCampaignReportPDF(campaign, startSnapshot, endSnapshot, comparison, outputPath) {
  const branding = await loadReportBranding().catch(() => null);
  const start = formatStoredSnapshot(startSnapshot);
  const end = formatStoredSnapshot(endSnapshot);
  const cmp = comparison || {};
  const locale = 'fr-FR';
  const periodLabel = `${fmtDate(start?.createdAt, locale)} → ${fmtDate(end?.createdAt, locale)}`;
  const generatedAt = `Généré le ${fmtDate(new Date(), locale)}`;
  const meta = {
    clientName: campaign.client_name || `Client ${campaign.client_id}`,
    periodLabel,
    generatedAt
  };

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        autoFirstPage: true,
        bufferPages: true
      });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      drawBrandedHeader(doc, branding, meta);

      const navy = branding?.style?.navy || '#1e3a5f';
      doc.fillColor(navy).font('Helvetica-Bold').fontSize(18).text('Rapport d’adoption MFA', MARGIN, doc.y);
      doc.moveDown(0.25);
      doc.fillColor('#334155').font('Helvetica').fontSize(10).text(campaign.name || 'Campagne Microsoft Security', MARGIN, doc.y);
      doc.moveDown(0.7);

      // Campaign card
      ensureSpace(doc, branding, meta, 70);
      const cardY = doc.y;
      doc.roundedRect(MARGIN, cardY, CONTENT_WIDTH, 58, 6).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('Campagne', MARGIN + 12, cardY + 10);
      doc.font('Helvetica').fontSize(9).text(campaign.name || '—', MARGIN + 12, cardY + 24);
      doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(`Client : ${meta.clientName}`, MARGIN + 12, cardY + 38);
      const goal = campaign.objectif_adoption;
      if (goal !== undefined && goal !== null && goal !== '' && !Number.isNaN(Number(goal))) {
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('Objectif', MARGIN + CONTENT_WIDTH - 120, cardY + 10, { width: 100, align: 'right' });
        doc.font('Helvetica').fontSize(12).text(fmtPct(goal), MARGIN + CONTENT_WIDTH - 120, cardY + 26, { width: 100, align: 'right' });
      }
      doc.y = cardY + 70;

      sectionTitle(doc, branding, meta, '1. Synthèse exécutive');
      const durationDays = Math.max(
        0,
        Math.ceil((new Date(end?.createdAt || endSnapshot.created_at) - new Date(start?.createdAt || startSnapshot.created_at)) / 86400000)
      );
      doc.fillColor('#334155').font('Helvetica').fontSize(9.5);
      doc.text(
        `Période analysée : ${fmtDate(start?.createdAt, locale)} → ${fmtDate(end?.createdAt, locale)} (${durationDays} jour${durationDays > 1 ? 's' : ''}).`,
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );
      doc.moveDown(0.3);
      doc.text(
        `Taux MFA global : ${fmtPct(cmp.mfaPercentage?.start)} → ${fmtPct(cmp.mfaPercentage?.end)} (${fmtDelta(cmp.mfaPercentage?.change, ' %')}).`,
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );
      doc.moveDown(0.3);
      doc.text(
        `Comptes protégés : ${cmp.mfaEnabledCount?.start ?? '—'} → ${cmp.mfaEnabledCount?.end ?? '—'} (${fmtDelta(cmp.mfaEnabledCount?.change)}). Résistance au phishing : ${fmtPct(cmp.phishingResistantPercentage?.start)} → ${fmtPct(cmp.phishingResistantPercentage?.end)}.`,
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );
      doc.moveDown(0.8);

      sectionTitle(doc, branding, meta, '2. Snapshots début / fin');
      const snapshotPairs = [
        ['Utilisateurs actifs', start?.userCount, end?.userCount],
        ['Administrateurs', start?.adminCount, end?.adminCount],
        ['Non-admins', start?.nonAdminCount, end?.nonAdminCount],
        ['MFA activé', start?.mfaEnabledCount, end?.mfaEnabledCount],
        ['Sans MFA', start?.mfaDisabledCount, end?.mfaDisabledCount],
        ['Taux MFA global', fmtPct(start?.mfaPercentage), fmtPct(end?.mfaPercentage)],
        ['Taux MFA admins', fmtPct(start?.adminMfaPercentage), fmtPct(end?.adminMfaPercentage)],
        ['Taux MFA non-admins', fmtPct(start?.nonAdminMfaPercentage), fmtPct(end?.nonAdminMfaPercentage)],
        ['Phishing-resistant', `${start?.phishingResistantCount ?? 0} (${fmtPct(start?.phishingResistantPercentage)})`, `${end?.phishingResistantCount ?? 0} (${fmtPct(end?.phishingResistantPercentage)})`],
        ['Inscriptions MFA 30 j', start?.recentlyRegisteredMfa ?? 0, end?.recentlyRegisteredMfa ?? 0]
      ];

      ensureSpace(doc, branding, meta, 40);
      const cw = [190, 110, 110, 90];
      let ty = doc.y;
      doc.rect(MARGIN, ty, CONTENT_WIDTH, 18).fill('#f1f5f9');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8);
      doc.text('Indicateur', MARGIN + 6, ty + 5);
      doc.text('Début', MARGIN + cw[0] + 6, ty + 5);
      doc.text('Fin', MARGIN + cw[0] + cw[1] + 6, ty + 5);
      doc.text('Écart', MARGIN + cw[0] + cw[1] + cw[2] + 6, ty + 5);
      ty += 18;
      doc.font('Helvetica').fontSize(8);
      snapshotPairs.forEach((row, i) => {
        ensureSpace(doc, branding, meta, 18);
        if (doc.y > ty) ty = doc.y;
        if (i % 2 === 0) doc.rect(MARGIN, ty, CONTENT_WIDTH, 16).fill('#fafafa');
        const change =
          typeof row[1] === 'number' && typeof row[2] === 'number'
            ? fmtDelta(row[2] - row[1])
            : '—';
        doc.fillColor('#334155').text(String(row[0]), MARGIN + 6, ty + 4, { width: cw[0] - 8 });
        doc.text(String(row[1] ?? '—'), MARGIN + cw[0] + 6, ty + 4, { width: cw[1] - 8 });
        doc.text(String(row[2] ?? '—'), MARGIN + cw[0] + cw[1] + 6, ty + 4, { width: cw[2] - 8 });
        doc.text(change, MARGIN + cw[0] + cw[1] + cw[2] + 6, ty + 4, { width: cw[3] - 8 });
        ty += 16;
        doc.y = ty;
      });
      doc.moveDown(0.8);

      sectionTitle(doc, branding, meta, '3. Méthodes d’authentification');
      const methodRows = [
        ['Authenticator', start?.methods?.authenticator, end?.methods?.authenticator],
        ['Téléphone / SMS', start?.methods?.phone, end?.methods?.phone],
        ['E-mail', start?.methods?.email, end?.methods?.email],
        ['FIDO2 / Passkey', start?.methods?.fido2, end?.methods?.fido2],
        ['OTP logiciel', start?.methods?.softwareOath, end?.methods?.softwareOath],
        ['Windows Hello', start?.methods?.windowsHello, end?.methods?.windowsHello]
      ];
      writeKvGrid(
        doc,
        methodRows.map(([label, a, b]) => [label, `${a ?? 0} → ${b ?? 0} (${fmtDelta((b ?? 0) - (a ?? 0))})`]),
        branding,
        meta
      );

      sectionTitle(doc, branding, meta, '4. Comptes encore sans MFA (fin de campagne)');
      const without = end?.withoutMfa;
      doc.fillColor('#334155').font('Helvetica').fontSize(9);
      doc.text(
        `Total sans MFA : ${without?.total ?? end?.mfaDisabledCount ?? 0} (admins : ${without?.adminTotal ?? '—'}, utilisateurs : ${without?.userTotal ?? '—'}).`,
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );
      doc.moveDown(0.4);
      const samples = [
        ...(without?.admins || []).map(u => ({ ...u, role: 'Admin' })),
        ...(without?.users || []).map(u => ({ ...u, role: 'User' }))
      ].slice(0, 24);
      if (!samples.length) {
        doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(9).text('Aucun compte actif sans MFA dans l’échantillon.', MARGIN, doc.y);
        doc.moveDown(0.6);
      } else {
        samples.forEach(user => {
          ensureSpace(doc, branding, meta, 14);
          doc.fillColor('#0f172a').font('Helvetica').fontSize(8).text(
            `• [${user.role}] ${user.displayName || user.userPrincipalName || user.userId}${user.adminRole ? ` — ${user.adminRole}` : ''}`,
            MARGIN,
            doc.y,
            { width: CONTENT_WIDTH }
          );
          doc.moveDown(0.15);
        });
        if (without?.truncated) {
          doc.moveDown(0.2);
          doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(8).text('Liste tronquée — échantillon représentatif uniquement.', MARGIN, doc.y);
        }
        doc.moveDown(0.6);
      }

      sectionTitle(doc, branding, meta, '5. Conclusion');
      const reached =
        goal !== undefined && goal !== null && goal !== '' && !Number.isNaN(Number(goal))
          ? Number(end?.mfaPercentage || 0) >= Number(goal)
          : null;
      doc.fillColor('#334155').font('Helvetica').fontSize(9.5);
      if (reached === true) {
        doc.text(`L’objectif d’adoption (${fmtPct(goal)}) est atteint en fin de campagne (${fmtPct(end?.mfaPercentage)}).`, MARGIN, doc.y, {
          width: CONTENT_WIDTH
        });
      } else if (reached === false) {
        doc.text(
          `L’objectif d’adoption (${fmtPct(goal)}) n’est pas encore atteint (${fmtPct(end?.mfaPercentage)} en fin de campagne).`,
          MARGIN,
          doc.y,
          { width: CONTENT_WIDTH }
        );
      } else {
        doc.text(`Taux MFA final constaté : ${fmtPct(end?.mfaPercentage)}.`, MARGIN, doc.y, { width: CONTENT_WIDTH });
      }
      doc.moveDown(0.35);
      doc.text(
        'Ce rapport compare les snapshots capturés au lancement et à l’arrêt de la campagne, sur la base des données Microsoft Entra synchronisées dans Veritas.',
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i += 1) {
        doc.switchToPage(pages.start + i);
        drawBrandedFooter(doc, branding, i + 1, pages.count);
      }

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', err => reject(err));
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
