import React, { useMemo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
import { SUMMARY_HEALTH_META } from "../steps/summaryData";
import { ReportCategoryKpisBlock, ReportTableBlock } from "./ReportSummaryBlocks";
import infraStyles from "./ReportSummaryInfrastructure.module.css";

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function renderTextWithLinks(value) {
  const text = String(value || "");
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function HealthBadge({ health }) {
  const meta = SUMMARY_HEALTH_META[health] || SUMMARY_HEALTH_META.unmapped;
  return (
    <span
      className={infraStyles.monitoringStatusIcon}
      title={meta.label}
      aria-label={meta.label}
      style={{ color: meta.color, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
    >
      <IconifyIcon icon={meta.icon || "mdi:circle"} width={16} height={16} />
      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{meta.label}</span>
    </span>
  );
}

function SectionShell({ icon, title, subtitle, children }) {
  return (
    <section className={infraStyles.section}>
      <div className={infraStyles.sectionHeader}>
        <div className={infraStyles.sectionTitleWrapper}>
          <span className={infraStyles.sectionIcon}>
            <IconifyIcon icon={icon} width={28} height={28} />
          </span>
          <div>
            <h4 className={infraStyles.sectionTitle}>{title}</h4>
            {subtitle ? <div className={infraStyles.sectionSubtitle}>{subtitle}</div> : null}
          </div>
        </div>
      </div>
      <div className={infraStyles.sectionTitleSeparator} />
      {children}
    </section>
  );
}

function buildInventoryRows(modules = []) {
  return modules.flatMap(module => {
    const equipments = Array.isArray(module.equipments) ? module.equipments : [];
    if (!equipments.length) {
      return [
        {
          _rowKey: `${module.key}-empty`,
          family: module.label,
          name: "—",
          site: "—",
          health: module.health || "unmapped",
          metrics: `${module.count || 0} élément(s)`,
          activity: [module.tickets > 0 ? `${module.tickets} ticket(s)` : null, module.comments > 0 ? `${module.comments} note(s)` : null]
            .filter(Boolean)
            .join(" · ") || "—"
        }
      ];
    }
    return equipments.map(eq => {
      const quantified = eq.quantified || {};
      const metricParts = [];
      if (quantified.availabilityLabel) metricParts.push(`Dispo. ${quantified.availabilityLabel}`);
      if (quantified.services > 0) metricParts.push(`${quantified.services} svc`);
      if (quantified.events > 0) metricParts.push(`${quantified.events} évén.`);
      if (quantified.alerts > 0) metricParts.push(`${quantified.alerts} alerte(s)`);
      return {
        _rowKey: eq.key || `${module.key}-${eq.label}`,
        family: module.label,
        name: eq.label || "—",
        site: eq.site || "—",
        health: eq.health || module.health || "unmapped",
        metrics: metricParts.join(" · ") || "—",
        activity: [
          (eq.tickets || quantified.tickets || 0) > 0 ? `${eq.tickets || quantified.tickets} ticket(s)` : null,
          (eq.comments || quantified.comments || 0) > 0 ? `${eq.comments || quantified.comments} note(s)` : null
        ]
          .filter(Boolean)
          .join(" · ") || "—"
      };
    });
  });
}

const INVENTORY_COLUMNS = [
  { id: "family", label: "Famille" },
  { id: "name", label: "Élément" },
  { id: "site", label: "Site" },
  {
    id: "health",
    label: "État",
    render: row => <HealthBadge health={row.health} />
  },
  { id: "metrics", label: "Supervision" },
  { id: "activity", label: "Activité" }
];

const WATCH_COLUMNS = [
  {
    id: "severity",
    label: "Sévérité",
    render: row => <HealthBadge health={row.severity} />
  },
  { id: "label", label: "Élément" },
  { id: "moduleLabel", label: "Module" },
  { id: "site", label: "Site" },
  { id: "reasons", label: "Motifs" },
  { id: "notes", label: "Notes" }
];

export default function ReportSummarySupervision({
  snapshot,
  supportStats = null,
  credits = null,
  consumedOnPeriod = 0
}) {
  const {
    stats = {},
    groups = {},
    modules = [],
    watchPoints = [],
    contrat = null,
    periodLabel = "",
    clientPrefix = "",
    clientMainLabel = "",
    globalComments = [],
    generalComments = []
  } = snapshot || {};

  const notes = (globalComments.length ? globalComments : generalComments).filter(Boolean);
  const packs = Array.isArray(credits?.packs) ? credits.packs : [];
  const creditTotals = computeSupportCreditTotals(credits?.balance, packs);
  const hasCreditData =
    Boolean(credits) &&
    (creditTotals.total > 0 || creditTotals.remaining > 0 || consumedOnPeriod > 0 || packs.length > 0);
  const hasContractInfo = Boolean(contrat?.type || contrat?.debut || contrat?.expiration || hasCreditData);
  const ticketCount = supportStats?.total ?? stats.tickets ?? 0;
  const commentCount = notes.length || stats.comments || 0;

  const overviewKpis = useMemo(
    () => [
      {
        label: "Périphériques",
        value: stats.equipments ?? 0,
        icon: "mdi:devices",
        iconColor: "#2563eb"
      },
      {
        label: "Points de vigilance",
        value: stats.vigilance ?? watchPoints.length,
        icon: "mdi:eye-outline",
        iconColor: (stats.vigilance || watchPoints.length) > 0 ? "#b45309" : "#059669"
      },
      {
        label: "Tickets",
        value: ticketCount,
        icon: "mdi:ticket-outline",
        iconColor: "#7c3aed"
      },
      {
        label: "Commentaires",
        value: commentCount,
        icon: "mdi:comment-text-outline",
        iconColor: "#0891b2"
      }
    ],
    [stats, watchPoints.length, ticketCount, commentCount]
  );

  const moduleKpis = useMemo(
    () =>
      (modules || []).slice(0, 8).map(module => ({
        label: module.label,
        value: module.count,
        hint:
          module.critical > 0
            ? `${module.critical} critique(s)`
            : module.warn > 0
              ? `${module.warn} à surveiller`
              : module.monitored > 0
                ? `${module.monitored} supervisé(s)`
                : null,
        icon: module.icon || "mdi:cube-outline",
        iconColor: SUMMARY_HEALTH_META[module.health]?.color || "#6b7280"
      })),
    [modules]
  );

  const watchRows = useMemo(
    () =>
      (watchPoints || []).map(point => ({
        _rowKey: point.id || point.equipmentKey || point.label,
        severity: point.severity || "warn",
        label: point.label || "—",
        moduleLabel: point.moduleLabel || "—",
        site: point.site || "—",
        reasons: Array.isArray(point.reasons) && point.reasons.length ? point.reasons.join(" · ") : "—",
        notes:
          Array.isArray(point.comments) && point.comments.length
            ? point.comments.map(c => c.text).filter(Boolean).join(" | ")
            : "—"
      })),
    [watchPoints]
  );

  const infraRows = useMemo(() => buildInventoryRows(groups.infra || []), [groups.infra]);
  const cyberRows = useMemo(() => buildInventoryRows(groups.cyber || []), [groups.cyber]);
  const cloudRows = useMemo(() => buildInventoryRows(groups.cloud || []), [groups.cloud]);

  const supportKpis = [
    {
      label: "Créés",
      value: supportStats?.total ?? "…",
      icon: "mdi:plus-circle-outline",
      iconColor: "#2563eb"
    },
    {
      label: "Clôturés",
      value: supportStats?.closed ?? "…",
      icon: "mdi:check-circle-outline",
      iconColor: "#059669"
    },
    {
      label: "Ouverts",
      value: supportStats?.open ?? "…",
      icon: "mdi:clock-outline",
      iconColor: (supportStats?.open || 0) > 0 ? "#b45309" : "#6b7280"
    },
    {
      label: "Priorité haute",
      value: supportStats?.highPriority ?? "…",
      icon: "mdi:alert-circle-outline",
      iconColor: (supportStats?.highPriority || 0) > 0 ? "#b91c1c" : "#6b7280"
    }
  ];

  const contractKpis = hasContractInfo
    ? [
        {
          label: "Type de contrat",
          value: contrat?.type || "—",
          icon: "mdi:file-document-outline",
          iconColor: "#4b5563"
        },
        {
          label: "Début",
          value: formatDateFr(contrat?.debut),
          icon: "mdi:calendar-start",
          iconColor: "#4b5563"
        },
        {
          label: "Expiration",
          value: formatDateFr(contrat?.expiration),
          icon: "mdi:calendar-end",
          iconColor: "#4b5563"
        },
        {
          label: "Crédits restants",
          value: hasCreditData ? creditTotals.remaining : "—",
          hint: hasCreditData && creditTotals.total > 0 ? `sur ${creditTotals.total}` : periodLabel || null,
          icon: "mdi:ticket-percent-outline",
          iconColor: "#0891b2"
        },
        {
          label: "Crédits consommés",
          value: hasCreditData ? consumedOnPeriod : "—",
          hint: periodLabel || null,
          icon: "mdi:ticket-confirmation-outline",
          iconColor: "#7c3aed"
        },
        {
          label: "Total crédits",
          value: hasCreditData ? creditTotals.total : "—",
          icon: "mdi:counter",
          iconColor: "#4b5563"
        }
      ]
    : [];

  if (!snapshot) return null;

  return (
    <div className={infraStyles.root}>
      <div className={infraStyles.overviewContainer}>
        <div className={infraStyles.globalIntro}>
          <div className={infraStyles.globalIntroHeader}>
            <span className={infraStyles.globalIntroIcon}>
              <IconifyIcon icon="mdi:clipboard-text-outline" width={22} height={22} />
            </span>
            <h3 className={infraStyles.globalIntroTitle}>Synthèse de supervision</h3>
          </div>
          <p className={infraStyles.globalIntroText}>
            {clientPrefix ? `${clientPrefix} — ` : ""}
            {clientMainLabel}
            {periodLabel ? ` · ${periodLabel}` : ""}
          </p>
        </div>
        <ReportCategoryKpisBlock items={overviewKpis} />
      </div>

      <SectionShell
        icon="mdi:eye-check-outline"
        title="Points à surveiller"
        subtitle="Périphériques à attention et motifs associés sur la période."
      >
        <ReportTableBlock
          title="Vigilance"
          count={watchRows.length}
          columns={WATCH_COLUMNS}
          rows={watchRows}
          emptyMessage="Aucun point à surveiller identifié sur la période."
        />
      </SectionShell>

      <SectionShell
        icon="mdi:file-sign"
        title="Contrat et crédits"
        subtitle="Informations contractuelles et consommation de crédits support."
      >
        {hasContractInfo ? (
          <ReportCategoryKpisBlock items={contractKpis} />
        ) : (
          <div className={infraStyles.sectionHelperMuted}>Aucune information contractuelle ou crédit renseignée.</div>
        )}
      </SectionShell>

      <SectionShell
        icon="mdi:view-dashboard-outline"
        title="État des lieux"
        subtitle="Volumes par famille et inventaire détaillé des éléments suivis."
      >
        {moduleKpis.length > 0 ? (
          <>
            <p className={infraStyles.kpiSectionTitle}>Volumes par module</p>
            <ReportCategoryKpisBlock items={moduleKpis} />
          </>
        ) : null}

        <ReportTableBlock
          title="Infrastructure"
          count={infraRows.length}
          columns={INVENTORY_COLUMNS}
          rows={infraRows}
          emptyMessage={null}
        />
        <ReportTableBlock
          title="Cybersécurité"
          count={cyberRows.length}
          columns={INVENTORY_COLUMNS}
          rows={cyberRows}
          emptyMessage={null}
        />
        <ReportTableBlock
          title="Services & cloud"
          count={cloudRows.length}
          columns={INVENTORY_COLUMNS}
          rows={cloudRows}
          emptyMessage={null}
        />

        {!infraRows.length && !cyberRows.length && !cloudRows.length ? (
          <div className={infraStyles.sectionHelperMuted}>Aucun module activé pour ce rapport.</div>
        ) : null}
      </SectionShell>

      <SectionShell
        icon="mdi:headset"
        title="Activité support"
        subtitle="Tickets créés sur la période du rapport."
      >
        <ReportCategoryKpisBlock items={supportKpis} />
      </SectionShell>

      <SectionShell
        icon="mdi:notebook-outline"
        title="Notes du rapport"
        subtitle="Commentaires globaux ajoutés pendant la construction du rapport."
      >
        <div data-export-comments="true">
          {notes.length > 0 ? (
            <div className={infraStyles.infraTableWrapper}>
              <table className={infraStyles.infraTable}>
                <thead>
                  <tr>
                    <th className={infraStyles.infraTableHeaderCell}>Date</th>
                    <th className={infraStyles.infraTableHeaderCell}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((comment, idx) => (
                    <tr key={comment.id || idx} className={infraStyles.infraTableRow}>
                      <td className={infraStyles.infraTableCell}>{comment.dateLabel || "—"}</td>
                      <td className={infraStyles.infraTableCell}>{renderTextWithLinks(comment.text)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={infraStyles.sectionHelperMuted}>Aucune note globale pour ce rapport.</div>
          )}
        </div>
      </SectionShell>
    </div>
  );
}
