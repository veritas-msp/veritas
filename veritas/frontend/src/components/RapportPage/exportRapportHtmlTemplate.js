export const REPORT_META = {
  infrastructure: {
    label: "Infrastructure report",
    shortLabel: "Infrastructure"
  },
  cybersecurite: {
    label: "Cybersecurity report",
    shortLabel: "Cybersecurity"
  },
  services: {
    label: "Services report",
    shortLabel: "Services"
  }
};
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function formatReportDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US");
}
export function buildReportPeriodLabel(client) {
  const startLabel = formatReportDate(client?.reportStartDate);
  const endLabel = formatReportDate(client?.reportEndDate);
  if (startLabel && endLabel) {
    return `Period from ${startLabel} to ${endLabel}`;
  }
  return "";
}
export function buildExportPrintStyles() {
  return `
    :root {
      --vex-bg: #ffffff;
      --vex-bg-muted: #f8fafc;
      --vex-border: #e5e7eb;
      --vex-text: #111827;
      --vex-text-muted: #6b7280;
      --vex-accent: #0f766e;
      --vex-accent-soft: #ecfdf5;
      --vex-max: 1200px;
      --vex-radius: 12px;
    }

    * { box-sizing: border-box !important; }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: var(--vex-bg) !important;
      color: var(--vex-text) !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.55 !important;
      -webkit-font-smoothing: antialiased;
    }

    /* ── En-tête export ── */
    .vex-header {
      background: var(--vex-bg);
      border-bottom: 1px solid var(--vex-border);
    }
    .vex-header-inner {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.75rem 2rem 1.5rem;
    }
    .vex-brand {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--vex-accent);
      margin-bottom: 0.85rem;
    }
    .vex-client {
      margin: 0;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--vex-text);
      font-family: 'Montserrat', 'Inter', sans-serif;
    }
    .vex-period {
      margin: 0.35rem 0 0;
      font-size: 0.95rem;
      color: var(--vex-text-muted);
    }
    .vex-report-pill {
      display: inline-flex;
      align-items: center;
      margin-top: 1rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      background: var(--vex-accent-soft);
      border: 1px solid #99f6e4;
      color: var(--vex-accent);
      font-size: 0.82rem;
      font-weight: 650;
      letter-spacing: 0.02em;
    }

    /* ── Contenu rapport ── */
    .vex-main {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.5rem 2rem 2.5rem;
    }

    [data-export-section] {
      display: block !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    [data-export-section] > div {
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    /* Uniformisation titres / sections / KPI / tableaux */
    [data-export-section] h4,
    [data-export-section] [class*="sectionTitle"],
    [data-export-section] [class*="stepTitle"],
    [data-export-section] [class*="tableBlockTitle"] {
      color: var(--vex-text) !important;
      font-size: 1rem !important;
      font-weight: 650 !important;
    }

    [data-export-section] [class*="sectionSubtitle"],
    [data-export-section] [class*="stepSubtitle"],
    [data-export-section] [class*="globalStatsLabel"],
    [data-export-section] [class*="tableBlockCount"] {
      color: var(--vex-text-muted) !important;
    }

    [data-export-section] [class*="globalStatsItem"],
    [data-export-section] [class*="globalStatsGridStylized"] [class*="globalStatsItem"] {
      background: var(--vex-bg-muted) !important;
      border: 1px solid var(--vex-border) !important;
      border-radius: 10px !important;
    }

    [data-export-section] [class*="infraTableWrapper"],
    [data-export-section] table {
      border-color: var(--vex-border) !important;
    }

    [data-export-section] [class*="infraTableHeaderCell"],
    [data-export-section] thead th {
      background: var(--vex-bg-muted) !important;
      color: var(--vex-text-muted) !important;
      font-size: 0.78rem !important;
    }

    [data-export-section] [class*="infraTableCell"],
    [data-export-section] tbody td {
      color: var(--vex-text) !important;
      font-size: 0.84rem !important;
    }

    [data-export-section] [class*="topologyStorageChip"],
    [data-export-section] [class*="topologyServerChip"],
    [data-export-section] [class*="topologyFirewallChip"],
    [data-export-section] [class*="topologyLinkChip"],
    [data-export-section] [class*="card"] {
      background: var(--vex-bg) !important;
      border-color: var(--vex-border) !important;
    }

    /* ── Comments ── */
    .vex-comments,
    [data-export-comments="true"] {
      margin-top: 2rem !important;
      padding-top: 1.25rem !important;
      border-top: 1px solid var(--vex-border) !important;
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .vex-comments-head,
    [data-export-comments="true"] [class*="reportCommentsHeader"] {
      display: flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      margin-bottom: 0.85rem !important;
    }

    .vex-comments-title,
    [data-export-comments="true"] [class*="reportCommentsTitle"] {
      margin: 0 !important;
      font-size: 1rem !important;
      font-weight: 650 !important;
      color: var(--vex-text) !important;
      letter-spacing: -0.01em !important;
      text-transform: none !important;
    }

    .vex-comments-list,
    [data-export-comments="true"] [class*="reportCommentsList"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.65rem !important;
    }

    .vex-comment-card,
    [data-export-comments="true"] [class*="reportCommentCard"] {
      border: 1px solid var(--vex-border) !important;
      border-radius: var(--vex-radius) !important;
      background: var(--vex-bg-muted) !important;
      padding: 0.85rem 1rem !important;
      box-shadow: none !important;
    }

    .vex-comment-meta,
    [data-export-comments="true"] [class*="reportCommentMeta"] {
      font-size: 0.76rem !important;
      font-weight: 600 !important;
      color: var(--vex-text-muted) !important;
      margin-bottom: 0.4rem !important;
    }

    .vex-comment-body,
    [data-export-comments="true"] [class*="reportCommentBody"] {
      font-size: 0.88rem !important;
      line-height: 1.5 !important;
      color: var(--vex-text) !important;
      white-space: pre-wrap !important;
    }

    .vex-comments-empty {
      border: 1px dashed var(--vex-border);
      border-radius: var(--vex-radius);
      background: var(--vex-bg-muted);
      padding: 1.1rem 1.15rem;
      font-size: 0.88rem;
      color: var(--vex-text-muted);
    }

    /* ── Pied de page ── */
    .vex-footer {
      border-top: 1px solid var(--vex-border);
      background: var(--vex-bg-muted);
      margin-top: 1rem;
    }
    .vex-footer-inner {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.35rem 2rem 1.5rem;
      text-align: center;
    }
    .vex-footer-brand {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--vex-text);
    }
    .vex-footer-contacts {
      margin-top: 0.65rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.85rem 1.25rem;
      font-size: 0.84rem;
    }
    .vex-footer-contacts a {
      color: var(--vex-accent);
      text-decoration: none;
    }
    .vex-footer-contacts a:hover {
      text-decoration: underline;
    }
    .vex-footer-social {
      margin-top: 0.75rem;
      display: flex;
      justify-content: center;
      gap: 0.85rem;
    }
    .vex-footer-social a {
      color: var(--vex-text-muted);
      text-decoration: none;
      display: inline-flex;
    }
    .vex-footer-note {
      margin: 0.85rem 0 0;
      font-size: 0.75rem;
      color: var(--vex-text-muted);
    }

    .vex-back-top {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      border: 1px solid var(--vex-border);
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vex-text-muted);
      font-size: 1rem;
      text-decoration: none;
    }

    @media print {
      body { background: white !important; color: black !important; }
      .vex-back-top { display: none !important; }
      * { page-break-inside: avoid !important; }
    }
  `;
}
export function buildExportHeaderHtml({
  clientName,
  periodLabel,
  reportType
}) {
  const meta = REPORT_META[reportType] || {
    label: "Monitoring report"
  };
  return `
  <header class="vex-header">
    <div class="vex-header-inner">
      <div class="vex-brand">PSI × Veritas</div>
      <h1 class="vex-client">${escapeHtml(clientName)}</h1>
      ${periodLabel ? `<p class="vex-period">${escapeHtml(periodLabel)}</p>` : ""}
      <span class="vex-report-pill">${escapeHtml(meta.label)}</span>
    </div>
  </header>`;
}
export function buildExportFooterHtml() {
  const generatedAt = new Date().toLocaleString("en-US");
  return `
  <footer class="vex-footer">
    <div class="vex-footer-inner">
      <div class="vex-footer-brand">PSI × Veritas</div>
      <div class="vex-footer-contacts">
        <a href="mailto:support@psi.fr">support@psi.fr</a>
        <a href="tel:+33971007878">09 71 00 78 78</a>
      </div>
      <div class="vex-footer-social">
        <a href="https://www.linkedin.com/company/psi-informatique/" target="_blank" rel="noreferrer" title="LinkedIn PSI">
          <iconify-icon icon="simple-icons:linkedin" width="20" height="20"></iconify-icon>
        </a>
        <a href="https://www.linkedin.com/showcase/magellan-digital-group/posts/?feedView=all" target="_blank" rel="noreferrer" title="LinkedIn Magellan">
          <iconify-icon icon="simple-icons:linkedin" width="20" height="20"></iconify-icon>
        </a>
        <a href="https://www.facebook.com/p/PSI-100042244849543/" target="_blank" rel="noreferrer" title="Facebook PSI">
          <iconify-icon icon="simple-icons:facebook" width="20" height="20"></iconify-icon>
        </a>
        <a href="https://x.com/PSI_Officiel" target="_blank" rel="noreferrer" title="X PSI">
          <iconify-icon icon="simple-icons:x" width="20" height="20"></iconify-icon>
        </a>
      </div>
      <p class="vex-footer-note">Document generated on ${escapeHtml(generatedAt)}</p>
    </div>
  </footer>`;
}
export function buildExportCommentsEmptyHtml() {
  return `
  <section class="vex-comments" data-export-comments="true">
    <div class="vex-comments-head">
      <iconify-icon icon="mdi:comment-text-multiple-outline" width="20" height="20"></iconify-icon>
      <h2 class="vex-comments-title">Report comments</h2>
    </div>
    <div class="vex-comments-empty">No comments were added for this period.</div>
  </section>`;
}
export function buildReportDocumentHtml({
  documentTitle,
  collectedCss = "",
  bodyContent,
  commentsHtml = ""
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(documentTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
  <style>
    ${collectedCss}
    ${buildExportPrintStyles()}
  </style>
</head>
<body id="top">
  ${bodyContent}
  <a href="#top" class="vex-back-top" aria-label="Remonter en haut de page">↑</a>
  ${buildExportFooterHtml()}
</body>
</html>`;
}
