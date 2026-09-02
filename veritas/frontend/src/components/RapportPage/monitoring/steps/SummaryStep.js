import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchClientSupportCredits } from "../../../../api/clients";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import {
  buildSummarySnapshot,
  SUMMARY_HEALTH_META
} from "./summaryData";
import { fetchSupportSummary } from "./summarySupport";
import ReportSummaryCybersecurity from "../ReportSummary/ReportSummaryCybersecurity";
import ReportSummaryServices from "../ReportSummary/ReportSummaryServices";
import styles from "./SummaryStep.module.css";

const COMPACT_LIST_THRESHOLD = 10;

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

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function creditsConsumedInPeriod(ledger = [], start, end) {
  if (!Array.isArray(ledger) || !ledger.length) return 0;
  return ledger.reduce((sum, entry) => {
    const kind = String(entry?.kind || "").toLowerCase();
    if (kind !== "debit") return sum;
    if (!isDateWithinPeriod(entry?.created_at || entry?.createdAt, start, end)) return sum;
    const delta = Number(entry?.delta);
    if (!Number.isFinite(delta)) return sum;
    return sum + Math.abs(delta);
  }, 0);
}

function HealthDot({ health }) {
  const meta = SUMMARY_HEALTH_META[health] || SUMMARY_HEALTH_META.unmapped;
  return (
    <span
      className={styles.healthDot}
      style={{ background: meta.color }}
      title={meta.label}
      aria-label={meta.label}
    />
  );
}

function DocSection({ id, title, subtitle, exportComments, children }) {
  return (
    <section
      className={styles.docSection}
      id={id}
      data-export-comments={exportComments ? "true" : undefined}
    >
      <div className={styles.docSectionHead}>
        <h3 className={styles.docSectionTitle}>{title}</h3>
        {subtitle ? <p className={styles.docSectionSubtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.docSectionBody}>{children}</div>
    </section>
  );
}

function DataLine({ label, value, hint, tone }) {
  const toneClass =
    tone === "warn" ? styles.dataValueWarn : tone === "danger" ? styles.dataValueDanger : "";
  return (
    <div className={styles.dataLine}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={`${styles.dataValue} ${toneClass}`.trim()}>
        {value ?? "—"}
        {hint ? <span className={styles.dataHint}>{hint}</span> : null}
      </span>
    </div>
  );
}

function EquipmentQuantified({ quantified }) {
  const parts = [];
  if (quantified?.availabilityLabel) parts.push(`Dispo. ${quantified.availabilityLabel}`);
  if (quantified?.services > 0) parts.push(`${quantified.services} service(s)`);
  if (quantified?.events > 0) parts.push(`${quantified.events} évén.`);
  if (quantified?.tickets > 0) parts.push(`${quantified.tickets} ticket(s)`);
  if (quantified?.alerts > 0) parts.push(`${quantified.alerts} alerte(s)`);
  if (quantified?.comments > 0) parts.push(`${quantified.comments} note(s)`);
  if (!parts.length) return null;
  return <span className={styles.itemMetrics}>{parts.join(" · ")}</span>;
}

function splitEquipments(equipments = []) {
  const attention = [];
  const healthy = [];
  equipments.forEach(eq => {
    const needsAttention =
      eq.health === "critical" ||
      eq.health === "warn" ||
      (eq.tickets || 0) > 0 ||
      (eq.alerts || 0) > 0 ||
      (eq.comments || 0) > 0;
    if (needsAttention) attention.push(eq);
    else healthy.push(eq);
  });
  return { attention, healthy };
}

function EquipmentLine({ eq, dense = false }) {
  const meta = SUMMARY_HEALTH_META[eq.health] || SUMMARY_HEALTH_META.unmapped;
  return (
    <li className={styles.equipLine}>
      <HealthDot health={eq.health} />
      <div className={styles.equipLineMain}>
        <span className={styles.equipLineName}>{eq.label}</span>
        <span className={styles.equipLineMeta}>
          {[eq.site, meta.label].filter(Boolean).join(" · ")}
          {!dense ? <EquipmentQuantified quantified={eq.quantified} /> : null}
        </span>
      </div>
    </li>
  );
}

function FamilyInventoryBlock({ module }) {
  const { attention, healthy } = splitEquipments(module.equipments);
  const compact = module.count >= COMPACT_LIST_THRESHOLD;
  const okCount = Math.max(0, module.count - module.critical - module.warn);
  const meta = SUMMARY_HEALTH_META[module.health] || SUMMARY_HEALTH_META.unmapped;

  return (
    <div className={styles.subBlock}>
      <h4 className={styles.subTitle}>
        <Icon icon={module.icon} width={15} height={15} aria-hidden />
        {module.label}
        <span className={styles.subTitleMeta}>— {meta.label}</span>
      </h4>

      <div className={styles.dataStack}>
        <DataLine
          label="Volume"
          value={`${module.count} élément${module.count > 1 ? "s" : ""}`}
          hint={module.monitored > 0 ? `${module.monitored} supervisé${module.monitored > 1 ? "s" : ""}` : null}
        />
        <DataLine label="Sains" value={okCount} />
        {module.warn > 0 ? <DataLine label="À surveiller" value={module.warn} tone="warn" /> : null}
        {module.critical > 0 ? <DataLine label="Critiques" value={module.critical} tone="danger" /> : null}
        {module.tickets > 0 ? <DataLine label="Tickets" value={module.tickets} /> : null}
        {module.comments > 0 ? <DataLine label="Notes" value={module.comments} /> : null}
      </div>

      {attention.length > 0 ? (
        <div className={styles.subListWrap}>
          <p className={styles.subLabel}>À retenir</p>
          <ul className={styles.equipList}>
            {attention.map(eq => (
              <EquipmentLine key={eq.key} eq={eq} />
            ))}
          </ul>
        </div>
      ) : null}

      {compact && healthy.length > 0 ? (
        <p className={styles.mutedNote}>
          {healthy.length} élément{healthy.length > 1 ? "s" : ""} en état sain — listing condensé
        </p>
      ) : null}

      {!compact && healthy.length > 0 ? (
        <div className={styles.subListWrap}>
          {attention.length > 0 ? <p className={styles.subLabel}>Autres</p> : null}
          <ul className={styles.equipList}>
            {healthy.map(eq => (
              <EquipmentLine key={eq.key} eq={eq} dense />
            ))}
          </ul>
        </div>
      ) : null}

      {!module.equipments.length ? <p className={styles.mutedNote}>Aucun élément listé.</p> : null}
    </div>
  );
}

function InventoryGroup({ title, modules }) {
  if (!modules.length) return null;
  return (
    <div className={styles.groupBlock}>
      <h4 className={styles.groupTitle}>{title}</h4>
      {modules.map(module => (
        <FamilyInventoryBlock key={module.key} module={module} />
      ))}
    </div>
  );
}

function WatchPointBlock({ point }) {
  const severityMeta = SUMMARY_HEALTH_META[point.severity] || SUMMARY_HEALTH_META.warn;
  return (
    <div className={styles.subBlock}>
      <h4 className={styles.subTitle}>
        <span
          className={styles.severityDot}
          style={{ background: severityMeta.color }}
          aria-hidden
        />
        {point.label}
      </h4>
      <p className={styles.subMeta}>
        {point.moduleLabel}
        {point.site ? ` · ${point.site}` : ""}
      </p>
      {point.reasons?.length > 0 ? (
        <ul className={styles.reasonList}>
          {point.reasons.map(reason => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      <EquipmentQuantified quantified={point.quantified} />
      {point.comments?.length > 0 ? (
        <div className={styles.notesStack}>
          {point.comments.map(comment => (
            <div key={comment.id} className={styles.noteItem}>
              <p className={styles.noteMeta}>
                {comment.dateLabel ? `${comment.dateLabel} · ` : ""}
                Commentaire
              </p>
              <div className={styles.noteBody}>{renderTextWithLinks(comment.text)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function SummaryStep({
  client,
  equipmentCheckMKData = {},
  monitoringSyncStatus = {},
  allComments = [],
  equipmentComments = {},
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  equipmentAlertCounts = {},
  summaryContentRef = null
}) {
  const [supportStats, setSupportStats] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!client) {
      setSupportStats(null);
      setCredits(null);
      return undefined;
    }
    const controller = new AbortController();
    const clientId = client?.id ?? client?.uuid;
    fetchSupportSummary(client, controller.signal).then(setSupportStats);
    if (clientId) {
      fetchClientSupportCredits(clientId, { signal: controller.signal })
        .then(setCredits)
        .catch(() => setCredits(null));
    }
    return () => controller.abort();
  }, [client]);

  const snapshot = useMemo(
    () =>
      buildSummarySnapshot({
        client,
        equipmentCheckMKData,
        monitoringSyncStatus,
        equipmentCommentCounts,
        equipmentTicketCounts,
        equipmentAlertCounts,
        allComments
      }),
    [
      client,
      equipmentCheckMKData,
      monitoringSyncStatus,
      equipmentCommentCounts,
      equipmentTicketCounts,
      equipmentAlertCounts,
      allComments
    ]
  );

  if (!client) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>Sélectionnez un client pour afficher la synthèse.</p>
      </div>
    );
  }

  const {
    stats,
    groups,
    modules,
    watchPoints,
    generalComments = [],
    globalComments = [],
    comments,
    contrat,
    periodLabel,
    clientPrefix,
    clientMainLabel
  } = snapshot;

  const notes = (globalComments.length ? globalComments : generalComments).filter(Boolean);

  const packs = Array.isArray(credits?.packs) ? credits.packs : [];
  const creditTotals = computeSupportCreditTotals(credits?.balance, packs);
  const consumedOnPeriod = creditsConsumedInPeriod(credits?.ledger, client?.reportStartDate, client?.reportEndDate);
  const hasCreditData =
    Boolean(credits) &&
    (creditTotals.total > 0 || creditTotals.remaining > 0 || consumedOnPeriod > 0 || packs.length > 0);
  const ticketCount = supportStats?.total ?? stats.tickets ?? 0;
  const commentCount = comments?.length ?? stats.comments ?? 0;
  const hasContractInfo = Boolean(contrat?.type || contrat?.debut || contrat?.expiration || hasCreditData);

  return (
    <div className={styles.root} ref={summaryContentRef}>
      <div className={styles.reportStack}>
        <article className={styles.reportDoc} data-report-export="supervision" data-report-title="Rapport de supervision">
          <header className={styles.reportDocHead} data-export-hide="true">
            <span className={styles.reportDocBadge}>Rapport 1</span>
            <h2 className={styles.reportDocTitle}>Supervision</h2>
            <p className={styles.reportDocDesc}>Synthèse globale, vigilance, contrat, inventaire condensé et support.</p>
          </header>

          <div className={styles.exportRoot}>
            <header className={styles.docHeader}>
              <p className={styles.docBrand}>Synthèse de supervision</p>
              <h2 className={styles.docTitle}>
                {clientPrefix ? <span className={styles.docTitlePrefix}>{clientPrefix} — </span> : null}
                {clientMainLabel}
              </h2>
              <p className={styles.docPeriod}>{periodLabel}</p>
              <div className={styles.dataStack}>
                <DataLine label="Périphériques" value={stats.equipments} />
                <DataLine label="Tickets" value={ticketCount} />
                <DataLine label="Commentaires" value={commentCount} />
              </div>
            </header>

            <DocSection
              id="synthese-vigilance"
              title="Points à surveiller"
              subtitle="Périphériques à attention et commentaires associés."
            >
              {watchPoints.length > 0 ? (
                watchPoints.map(point => <WatchPointBlock key={point.id} point={point} />)
              ) : (
                <p className={styles.okText}>Aucun point à surveiller identifié sur la période.</p>
              )}
            </DocSection>

            <DocSection
              id="synthese-contrat"
              title="Contrat et crédits"
              subtitle="Informations contractuelles et consommation de crédits."
            >
              {hasContractInfo ? (
                <div className={styles.dataStack}>
                  {contrat?.type ? <DataLine label="Type" value={contrat.type} /> : null}
                  {contrat?.debut ? <DataLine label="Début" value={formatDateFr(contrat.debut)} /> : null}
                  <DataLine label="Expiration" value={formatDateFr(contrat?.expiration)} />
                  <DataLine
                    label="Crédits consommés"
                    value={hasCreditData ? consumedOnPeriod : "—"}
                    hint={periodLabel}
                  />
                  <DataLine
                    label="Crédits restants"
                    value={hasCreditData ? creditTotals.remaining : "—"}
                    hint={hasCreditData && creditTotals.total > 0 ? `sur ${creditTotals.total}` : null}
                  />
                  <DataLine label="Total crédits" value={hasCreditData ? creditTotals.total : "—"} />
                </div>
              ) : (
                <p className={styles.mutedNote}>Aucune information contractuelle ou crédit renseignée.</p>
              )}
            </DocSection>

            <DocSection
              id="synthese-etat-lieux"
              title="État des lieux"
              subtitle="Quantitatif par famille, avec listing condensé pour les volumes importants."
            >
              {modules.length > 0 ? (
                <div className={styles.dataStack}>
                  {modules.map(module => (
                    <DataLine key={module.key} label={module.label} value={module.count} />
                  ))}
                </div>
              ) : null}
              <InventoryGroup title="Infrastructure" modules={groups.infra} />
              <InventoryGroup title="Cybersécurité" modules={groups.cyber} />
              <InventoryGroup title="Services & cloud" modules={groups.cloud} />
              {!groups.infra.length && !groups.cyber.length && !groups.cloud.length ? (
                <p className={styles.mutedNote}>Aucun module activé pour ce rapport.</p>
              ) : null}
            </DocSection>

            <DocSection
              id="synthese-support"
              title="Activité support"
              subtitle="Tickets créés sur la période du rapport."
            >
              <div className={styles.dataStack}>
                <DataLine label="Créés" value={supportStats?.total ?? "…"} />
                <DataLine label="Clôturés" value={supportStats?.closed ?? "…"} />
                <DataLine
                  label="Ouverts"
                  value={supportStats?.open ?? "…"}
                  tone={(supportStats?.open || 0) > 0 ? "warn" : undefined}
                />
                <DataLine
                  label="Priorité haute"
                  value={supportStats?.highPriority ?? "…"}
                  tone={(supportStats?.highPriority || 0) > 0 ? "danger" : undefined}
                />
              </div>
            </DocSection>

            <DocSection
              id="synthese-notes"
              title="Notes du rapport"
              subtitle="Commentaires globaux ajoutés pendant la construction du rapport."
              exportComments
            >
              {notes.length > 0 ? (
                <div className={styles.notesStack}>
                  {notes.map(comment => (
                    <div key={comment.id} className={styles.noteItem}>
                      <p className={styles.noteMeta}>
                        {comment.dateLabel ? `${comment.dateLabel} · ` : ""}
                        Note globale
                      </p>
                      <div className={styles.noteBody}>{renderTextWithLinks(comment.text)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.mutedNote}>Aucune note globale pour ce rapport.</p>
              )}
            </DocSection>
          </div>
        </article>

        <article className={styles.reportDoc} data-report-export="sauvegarde" data-report-title="Rapport sauvegardes">
          <header className={styles.reportDocHead}>
            <span className={styles.reportDocBadge}>Rapport 2</span>
            <h2 className={styles.reportDocTitle}>Sauvegardes</h2>
            <p className={styles.reportDocDesc}>Instances, flux et jobs de sauvegarde uniquement.</p>
          </header>
          <div className={styles.exportRoot}>
            <ReportSummaryCybersecurity
              client={client}
              equipmentCheckMKData={equipmentCheckMKData}
              equipmentComments={equipmentComments}
              equipmentCommentCounts={equipmentCommentCounts}
              equipmentTicketCounts={equipmentTicketCounts}
              includeSections={["backup"]}
            />
          </div>
        </article>

        <article className={styles.reportDoc} data-report-export="services" data-report-title="Rapport services">
          <header className={styles.reportDocHead}>
            <span className={styles.reportDocBadge}>Rapport 3</span>
            <h2 className={styles.reportDocTitle}>Services</h2>
            <p className={styles.reportDocDesc}>Antivirus, antispam, Microsoft 365 et noms de domaine.</p>
          </header>
          <div className={styles.exportRoot}>
            <ReportSummaryCybersecurity
              client={client}
              equipmentCheckMKData={equipmentCheckMKData}
              equipmentComments={equipmentComments}
              equipmentCommentCounts={equipmentCommentCounts}
              equipmentTicketCounts={equipmentTicketCounts}
              includeSections={["antivirus", "antispam"]}
            />
            <ReportSummaryServices
              client={client}
              equipmentComments={equipmentComments}
              equipmentCommentCounts={equipmentCommentCounts}
              equipmentTicketCounts={equipmentTicketCounts}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
