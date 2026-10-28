/**
 * Styles du corps des exports HTML (3 rapports).
 * Header / footer restent dans exportRapportHtmlTemplate.js.
 */
export function buildExportContentStyles() {
  return `
    /* ── Contenu rapport (rebuild) ── */
    .vex-main {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.75rem 2rem 2.75rem;
    }

    [data-export-hide] { display: none !important; }

    .vex-report,
    [data-report-export] {
      display: block !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      visibility: visible !important;
      opacity: 1 !important;
      height: auto !important;
      overflow: visible !important;
    }

    .vex-report > *,
    [data-report-export] > * {
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .vex-report [class*="executiveRoot"],
    .vex-report [class*="_root_"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 1.35rem !important;
      width: 100% !important;
      padding: 0 !important;
    }

    /* Uniquement les blocs section — pas sectionHeading / sectionTitle (sinon column+center). */
    .vex-report [class*="sectionBlock"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.65rem !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      align-items: stretch !important;
      text-align: left !important;
    }

    .vex-report [class*="sectionTitleWrapper"] {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 0.55rem !important;
      width: 100% !important;
      text-align: left !important;
      margin: 0 !important;
    }

    .vex-report h3,
    .vex-report h4,
    .vex-report h5,
    .vex-report [class*="sectionHeading"],
    .vex-report [class*="sectionTitle"],
    .vex-report [class*="detailSectionTitle"],
    .vex-report [class*="commentsHeader"] {
      margin: 0 !important;
      padding: 0 0 0.35rem !important;
      border: none !important;
      border-bottom: 1px solid var(--vex-border) !important;
      color: var(--vex-navy) !important;
      font-family: var(--vex-font-sans) !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      letter-spacing: -0.01em !important;
      line-height: 1.3 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 0.4rem !important;
      width: 100% !important;
      text-align: left !important;
      box-sizing: border-box !important;
    }

    .vex-report [class*="detailSectionTitle"] {
      font-size: 0.9rem !important;
      font-weight: 650 !important;
      border-bottom-color: color-mix(in srgb, var(--vex-border) 70%, transparent) !important;
      margin-top: 0.35rem !important;
    }

    /* KPI */
    .vex-report [class*="kpiStrip"] {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 0.45rem !important;
      padding: 0.4rem !important;
      border-radius: 12px !important;
      border: 1px solid var(--vex-border) !important;
      background: var(--vex-bg-muted) !important;
    }

    .vex-report [class*="kpiStrip"]:not([class*="kpiStripTriple"]) {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    .vex-report [class*="kpiItem"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.2rem !important;
      min-width: 0 !important;
      padding: 0.7rem 0.8rem !important;
      border-radius: 10px !important;
      background: var(--vex-surface) !important;
      border: 1px solid color-mix(in srgb, var(--vex-border) 80%, transparent) !important;
    }

    .vex-report [class*="kpiLabel"] {
      font-size: 0.7rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      color: var(--vex-text-muted) !important;
    }

    .vex-report [class*="kpiValue"] {
      font-size: 1.35rem !important;
      font-weight: 750 !important;
      line-height: 1.15 !important;
      letter-spacing: -0.02em !important;
      color: var(--vex-navy) !important;
      font-variant-numeric: tabular-nums !important;
    }

    .vex-report [class*="kpiValueWarn"] { color: var(--vex-warn) !important; }
    .vex-report [class*="kpiValueCritical"] { color: var(--vex-crit) !important; }
    .vex-report [class*="kpiValueOk"] { color: inherit !important; }

    .vex-report [class*="kpiHint"] {
      font-size: 0.75rem !important;
      color: var(--vex-text-muted) !important;
      line-height: 1.35 !important;
    }

    /* Synthèse */
    .vex-report [class*="synthesisPanel"],
    .vex-report [class*="synthesisEditorHost"],
    .vex-report .vex-synth {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0.95rem 1.05rem !important;
      border-radius: 12px !important;
      border: 1px solid var(--vex-border) !important;
      border-left: 4px solid var(--vex-accent) !important;
      background: color-mix(in srgb, var(--vex-accent) 6%, #fff) !important;
      color: var(--vex-text) !important;
      font-size: 0.92rem !important;
      line-height: 1.55 !important;
    }

    .vex-report [class*="synthesis"],
    .vex-report .vex-synth,
    .vex-report [class*="editor"] {
      margin: 0 !important;
      color: var(--vex-text) !important;
      font-size: 0.92rem !important;
      line-height: 1.55 !important;
    }

    .vex-report [class*="editor"] {
      min-height: 0 !important;
      max-height: none !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      border-radius: 0 !important;
    }

    .vex-report [class*="synthesisEditorHost"] [class*="editor"],
    .vex-report [class*="synthesisEditorHost"] .vex-synth {
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      border-left: none !important;
    }

    .vex-report [class*="synthesisEditorHost"] {
      padding: 0.95rem 1.05rem !important;
      border: 1px solid var(--vex-border) !important;
      border-left: 4px solid var(--vex-accent) !important;
      background: color-mix(in srgb, var(--vex-accent) 6%, #fff) !important;
      border-radius: 12px !important;
    }

    /* Familles */
    .vex-report [class*="familyGrid"] {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr)) !important;
      gap: 0.75rem !important;
    }

    .vex-report [class*="familyCard"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.65rem !important;
      padding: 0.9rem !important;
      border-radius: 12px !important;
      border: 1px solid var(--vex-border) !important;
      background: var(--vex-surface) !important;
      min-width: 0 !important;
    }

    .vex-report .vex-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 0 !important;
      flex-shrink: 0 !important;
      color: inherit !important;
      vertical-align: middle !important;
      overflow: hidden !important;
    }

    .vex-report .vex-icon svg {
      display: block !important;
      margin: 0 !important;
      max-width: none !important;
      overflow: hidden !important;
      color: inherit !important;
      /* Pas de fill !important : les paths MDI « ghost » (fill=none) redeviendraient des cercles. */
    }

    .vex-report [class*="familyCardTop"] {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 0.5rem !important;
      width: 100% !important;
      min-height: 22px !important;
    }

    .vex-report [class*="familyCardTop"] > .vex-icon {
      width: 22px !important;
      height: 22px !important;
      color: var(--vex-navy) !important;
    }

    .vex-report [class*="familyCardIcon"] {
      color: var(--vex-navy) !important;
      flex-shrink: 0 !important;
    }

    .vex-report [class*="familyCardBody"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.15rem !important;
      min-width: 0 !important;
    }

    .vex-report [class*="familyName"] {
      margin: 0 !important;
      border: none !important;
      padding: 0 !important;
      display: block !important;
      font-size: 0.95rem !important;
      font-weight: 700 !important;
      color: var(--vex-navy) !important;
      line-height: 1.25 !important;
    }

    .vex-report [class*="familyMeta"] {
      margin: 0 !important;
      font-size: 0.78rem !important;
      color: var(--vex-text-muted) !important;
      border: none !important;
      padding: 0 !important;
      display: block !important;
    }

    .vex-report [class*="familyCardStatus"] {
      display: inline-flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      align-self: center !important;
      justify-content: flex-end !important;
      gap: 0.3rem !important;
      margin: 0 0 0 auto !important;
      padding: 0 !important;
      border: none !important;
      font-size: 0.72rem !important;
      font-weight: 650 !important;
      color: var(--vex-ok) !important;
      white-space: nowrap !important;
      line-height: 22px !important;
      height: 22px !important;
      box-sizing: border-box !important;
    }

    .vex-report [class*="familyCardStatus"] .vex-icon {
      width: 14px !important;
      height: 14px !important;
      color: inherit !important;
    }

    .vex-report [class*="familyCardStatusAlert"] {
      color: var(--vex-warn) !important;
    }

    .vex-report [class*="familyCardStats"] {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 0.35rem !important;
      width: 100% !important;
    }

    .vex-report [class*="familyStatChip"] {
      display: inline-flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.28rem !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 1.85rem !important;
      padding: 0.3rem 0.35rem !important;
      border-radius: 8px !important;
      background: var(--vex-bg-muted) !important;
      border: 1px solid var(--vex-border) !important;
      font-size: 0.78rem !important;
      color: var(--vex-text) !important;
      line-height: 1 !important;
      box-sizing: border-box !important;
    }

    .vex-report [class*="familyStatChip"] .vex-icon {
      width: 15px !important;
      height: 15px !important;
      color: inherit !important;
      opacity: 1 !important;
    }

    .vex-report [class*="familyStatChip"] strong {
      display: inline-flex !important;
      align-items: center !important;
      font-weight: 700 !important;
      font-variant-numeric: tabular-nums !important;
      color: inherit !important;
      line-height: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Toujours lisibles, même à 0 */
    .vex-report [class*="familyCardStats"] > :nth-child(1) {
      color: var(--vex-ok) !important;
    }
    .vex-report [class*="familyCardStats"] > :nth-child(2),
    .vex-report [class*="familyStatWarn"] {
      color: var(--vex-warn) !important;
    }
    .vex-report [class*="familyCardStats"] > :nth-child(3),
    .vex-report [class*="familyStatCritical"] {
      color: var(--vex-crit) !important;
    }

    /* Tables */
    .vex-report [class*="infraTableWrapper"],
    .vex-report [class*="watchTableWrap"],
    .vex-report [class*="detailTableWrap"],
    .vex-report [class*="tableBlock"] > [class*="infraTableWrapper"] {
      border: 1px solid var(--vex-border) !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      background: var(--vex-surface) !important;
      margin: 0 !important;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    .vex-report [class*="tableBlock"] {
      margin: 0 !important;
    }

    .vex-report table {
      width: 100% !important;
      min-width: 0 !important;
      border-collapse: collapse !important;
      border: none !important;
      font-size: 0.86rem !important;
    }

    .vex-report thead th {
      background: #eef2f7 !important;
      color: var(--vex-text-muted) !important;
      font-size: 0.7rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.04em !important;
      text-transform: uppercase !important;
      text-align: left !important;
      padding: 0.65rem 0.8rem !important;
      border-bottom: 1px solid var(--vex-border-strong) !important;
    }

    .vex-report tbody td {
      padding: 0.65rem 0.8rem !important;
      border-bottom: 1px solid var(--vex-border) !important;
      color: var(--vex-text) !important;
      vertical-align: top !important;
    }

    .vex-report tbody tr:last-child td {
      border-bottom: none !important;
    }

    .vex-report tbody tr:nth-child(even) td {
      background: #fafbfc !important;
    }

    /* Services — métriques / usage */
    .vex-report [class*="serviceCard"],
    .vex-report [class*="usageBlock"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.7rem !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
    }

    .vex-report [class*="usageTitle"],
    .vex-report [class*="serviceSubtitle"],
    .vex-report [class*="serviceName"] {
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.4rem !important;
      font-size: 0.9rem !important;
      font-weight: 650 !important;
      color: var(--vex-navy) !important;
    }

    .vex-report [class*="serviceSubtitle"] {
      font-weight: 500 !important;
      color: var(--vex-text-muted) !important;
      font-size: 0.82rem !important;
    }

    .vex-report [class*="metricGrid"] {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0.55rem !important;
    }

    .vex-report [class*="metricGrid4"] {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    .vex-report [class*="metricItem"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.15rem !important;
      padding: 0.7rem 0.8rem !important;
      border-radius: 10px !important;
      border: 1px solid var(--vex-border) !important;
      background: var(--vex-bg-muted) !important;
    }

    .vex-report [class*="metricLabel"] {
      font-size: 0.7rem !important;
      font-weight: 650 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      color: var(--vex-text-muted) !important;
    }

    .vex-report [class*="metricValue"] {
      font-size: 1.15rem !important;
      font-weight: 750 !important;
      color: var(--vex-navy) !important;
    }

    .vex-report [class*="metricHint"],
    .vex-report [class*="sectionFootnote"],
    .vex-report [class*="emptyHint"],
    .vex-report [class*="perimeterLead"] {
      margin: 0 !important;
      font-size: 0.8rem !important;
      color: var(--vex-text-muted) !important;
      line-height: 1.45 !important;
    }

    .vex-report [class*="simpleList"] {
      margin: 0 !important;
      padding-left: 1.1rem !important;
      color: var(--vex-text) !important;
      font-size: 0.88rem !important;
    }

    .vex-report [class*="domainRow"] {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 0.55rem !important;
      padding: 0.75rem 0.9rem !important;
      border-radius: 10px !important;
      border: 1px solid var(--vex-border) !important;
      background: var(--vex-bg-muted) !important;
    }

    .vex-report [class*="domainName"] {
      font-weight: 700 !important;
      color: var(--vex-navy) !important;
    }

    .vex-report [class*="domainMeta"],
    .vex-report [class*="domainExpiry"] {
      font-size: 0.8rem !important;
      color: var(--vex-text-muted) !important;
    }

    .vex-report [class*="domainExpiry"] {
      color: var(--vex-warn) !important;
      font-weight: 650 !important;
    }

    /* Commentaires */
    .vex-report [class*="commentsHeader"] {
      border-bottom: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .vex-report [class*="commentsEmpty"] {
      margin: 0 !important;
      padding: 0.9rem 1rem !important;
      border-radius: 10px !important;
      border: 1px dashed var(--vex-border-strong) !important;
      background: var(--vex-bg-muted) !important;
      color: var(--vex-text-muted) !important;
      font-size: 0.86rem !important;
    }

    .vex-report [class*="commentsList"] {
      list-style: none !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0.55rem !important;
    }

    .vex-report [class*="commentCard"] {
      padding: 0.85rem 1rem !important;
      border-radius: 12px !important;
      border: 1px solid var(--vex-border) !important;
      border-left: 3px solid var(--vex-accent) !important;
      background: var(--vex-bg-muted) !important;
    }

    .vex-report [class*="commentMeta"] {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 0.45rem 0.75rem !important;
      margin-bottom: 0.35rem !important;
      font-size: 0.75rem !important;
      color: var(--vex-text-muted) !important;
      font-weight: 650 !important;
    }

    .vex-report [class*="commentBody"] {
      margin: 0 !important;
      font-size: 0.88rem !important;
      line-height: 1.5 !important;
      color: var(--vex-text) !important;
      white-space: pre-wrap !important;
    }

    .vex-report [class*="statusBadge"],
    .vex-report [class*="healthTone"] {
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.25rem !important;
      font-size: 0.78rem !important;
      font-weight: 650 !important;
    }

    .vex-report button,
    .vex-report [class*="replyTools"],
    .vex-report [class*="tools"],
    .vex-report [class*="moreToggle"],
    .vex-report [class*="detailToggle"] {
      display: none !important;
    }

    @media (max-width: 900px) {
      .vex-report [class*="kpiStrip"],
      .vex-report [class*="kpiStripTriple"],
      .vex-report [class*="metricGrid4"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media print {
      .vex-report [class*="kpiItem"],
      .vex-report [class*="familyCard"],
      .vex-report [class*="commentCard"],
      .vex-report [class*="infraTableWrapper"],
      .vex-report table {
        break-inside: avoid !important;
      }
      .vex-report [class*="kpiStrip"],
      .vex-report thead th,
      .vex-report tbody tr:nth-child(even) td {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}
