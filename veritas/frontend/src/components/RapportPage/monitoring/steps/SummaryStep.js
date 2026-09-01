import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  buildSummarySnapshot,
  SUMMARY_HEALTH_META
} from "./summaryData";
import { fetchSupportSummary } from "./summarySupport";
import styles from "./SummaryStep.module.css";

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
    <span className={styles.healthBadge} style={{ background: meta.bg, color: meta.color }}>
      <Icon icon={meta.icon} width={12} height={12} aria-hidden />
      {meta.label}
    </span>
  );
}

function EquipmentQuantified({ quantified }) {
  const items = [];
  if (quantified.availabilityLabel) items.push({ icon: "mdi:chart-line", label: "Dispo.", value: quantified.availabilityLabel });
  if (quantified.services > 0) items.push({ icon: "mdi:cog-outline", label: "Services", value: quantified.services });
  if (quantified.events > 0) items.push({ icon: "mdi:radar", label: "Évén.", value: quantified.events });
  if (quantified.tickets > 0) items.push({ icon: "mdi:ticket-outline", label: "Tickets", value: quantified.tickets });
  if (quantified.alerts > 0) items.push({ icon: "mdi:bell-alert-outline", label: "Alertes", value: quantified.alerts });
  if (quantified.comments > 0) items.push({ icon: "mdi:comment-text-outline", label: "Notes", value: quantified.comments });
  if (!items.length) return <span className={styles.equipmentMetricMuted}>Aucune métrique</span>;
  return (
    <div className={styles.equipmentMetrics}>
      {items.map(item => (
        <span key={item.label} className={styles.equipmentMetric} title={item.label}>
          <Icon icon={item.icon} width={11} height={11} aria-hidden />
          {item.value}
        </span>
      ))}
    </div>
  );
}

function ModuleCard({ module }) {
  return (
    <article className={styles.moduleCard}>
      <div className={styles.moduleCardHead}>
        <div className={styles.moduleCardIntro}>
          <span className={styles.moduleCardIconWrap}>
            <Icon icon={module.icon} width={18} height={18} aria-hidden />
          </span>
          <div>
            <h4 className={styles.moduleCardTitle}>{module.label}</h4>
            <p className={styles.moduleCardCount}>
              {module.count} élément{module.count > 1 ? "s" : ""}
              {module.monitored > 0 ? ` · ${module.monitored} supervisé${module.monitored > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <HealthBadge health={module.health} />
      </div>

      <div className={styles.moduleSignals}>
        {module.critical > 0 ? (
          <span className={`${styles.signal} ${styles.signalActive}`} style={{ color: "#b91c1c", background: "#fef2f2" }}>
            <Icon icon="mdi:alert-octagon" width={12} height={12} />
            {module.critical} critique{module.critical > 1 ? "s" : ""}
          </span>
        ) : null}
        {module.warn > 0 ? (
          <span className={`${styles.signal} ${styles.signalActive}`} style={{ color: "#b45309", background: "#fffbeb" }}>
            <Icon icon="mdi:alert" width={12} height={12} />
            {module.warn} alerte{module.warn > 1 ? "s" : ""}
          </span>
        ) : null}
        {module.tickets > 0 ? (
          <span className={`${styles.signal} ${styles.signalActive}`}>
            <Icon icon="mdi:ticket-outline" width={12} height={12} />
            {module.tickets} ticket{module.tickets > 1 ? "s" : ""}
          </span>
        ) : null}
        {module.comments > 0 ? (
          <span className={`${styles.signal} ${styles.signalActive}`}>
            <Icon icon="mdi:comment-text-outline" width={12} height={12} />
            {module.comments} note{module.comments > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {module.equipments.length > 0 ? (
        <ul className={styles.equipmentList}>
          {module.equipments.map(eq => (
            <li key={eq.key} className={styles.equipmentRow}>
              <div className={styles.equipmentMain}>
                <div className={styles.equipmentName} title={eq.label}>
                  {eq.label}
                  {eq.site ? <span className={styles.equipmentSite}>{eq.site}</span> : null}
                </div>
                <EquipmentQuantified quantified={eq.quantified} />
              </div>
              <HealthBadge health={eq.health} />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ModuleGroup({ title, modules }) {
  if (!modules.length) return null;
  return (
    <div className={styles.groupBlock}>
      <p className={styles.groupLabel}>{title}</p>
      <div className={styles.moduleGrid}>
        {modules.map(module => (
          <ModuleCard key={module.key} module={module} />
        ))}
      </div>
    </div>
  );
}

function WatchPointRow({ point }) {
  const severityMeta = SUMMARY_HEALTH_META[point.severity] || SUMMARY_HEALTH_META.warn;
  return (
    <article className={styles.watchItem}>
      <span className={styles.watchSeverity} style={{ background: severityMeta.bg, color: severityMeta.color }}>
        <Icon icon={severityMeta.icon} width={16} height={16} aria-hidden />
      </span>
      <div className={styles.watchBody}>
        <div className={styles.watchTitle}>{point.label}</div>
        <div className={styles.watchMeta}>
          {point.moduleLabel}
          {point.site ? ` · ${point.site}` : ""}
        </div>
        <ul className={styles.watchReasons}>
          {point.reasons.map(reason => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <EquipmentQuantified quantified={point.quantified} />
      </div>
    </article>
  );
}

export default function SummaryStep({
  client,
  equipmentCheckMKData = {},
  monitoringSyncStatus = {},
  allComments = [],
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  equipmentAlertCounts = {},
  summaryContentRef = null
}) {
  const [supportStats, setSupportStats] = useState(null);

  useEffect(() => {
    if (!client) {
      setSupportStats(null);
      return undefined;
    }
    const controller = new AbortController();
    fetchSupportSummary(client, controller.signal).then(setSupportStats);
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

  const { stats, groups, watchPoints, comments, contrat, periodLabel, clientPrefix, clientMainLabel } = snapshot;

  return (
    <div className={styles.root}>
      <header className={styles.hero} data-export-hide="true">
        <p className={styles.heroBrand}>Synthèse de supervision</p>
        <h2 className={styles.heroTitle}>
          {clientPrefix ? <span className={styles.heroPrefix}>{clientPrefix} — </span> : null}
          {clientMainLabel}
        </h2>
        <p className={styles.heroPeriod}>{periodLabel}</p>
        <p className={styles.heroLead}>
          État des lieux consolidé : infrastructure, cybersécurité, services cloud, surveillance, tickets et notes du rapport.
        </p>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.modules}</span>
            <span className={styles.statLabel}>Domaines</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.equipments}</span>
            <span className={styles.statLabel}>Éléments</span>
          </div>
          <div className={`${styles.statCard} ${stats.critical > 0 ? styles.statDanger : ""}`}>
            <span className={styles.statValue}>{stats.critical}</span>
            <span className={styles.statLabel}>Critiques</span>
          </div>
          <div className={`${styles.statCard} ${stats.warn > 0 ? styles.statWarn : ""}`}>
            <span className={styles.statValue}>{stats.warn}</span>
            <span className={styles.statLabel}>À surveiller</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.tickets}</span>
            <span className={styles.statLabel}>Tickets</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{comments.length}</span>
            <span className={styles.statLabel}>Notes</span>
          </div>
        </div>
      </header>

      <div ref={summaryContentRef} className={styles.exportRoot}>
        <section className={styles.section} id="synthese-vigilance">
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Icon icon="mdi:eye-alert-outline" width={18} height={18} aria-hidden />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>Points à surveiller</h3>
              <p className={styles.sectionSubtitle}>
                Périphériques nécessitant une attention : surveillance dégradée, alertes ou tickets sur la période.
              </p>
            </div>
          </div>
          <div className={styles.panel}>
            {watchPoints.length > 0 ? (
              <div className={styles.watchList}>
                {watchPoints.map(point => (
                  <WatchPointRow key={point.id} point={point} />
                ))}
              </div>
            ) : (
              <div className={styles.okBanner}>
                <Icon icon="mdi:check-circle" width={20} height={20} aria-hidden />
                Aucun point à surveiller identifié sur la période.
              </div>
            )}
          </div>
        </section>

        <section className={styles.section} id="synthese-contrat">
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Icon icon="mdi:file-document-outline" width={18} height={18} aria-hidden />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>Contrat & crédits</h3>
              <p className={styles.sectionSubtitle}>Informations contractuelles du client.</p>
            </div>
          </div>
          <div className={styles.panel}>
            {contrat?.type || contrat?.debut || contrat?.expiration ? (
              <dl className={styles.contractGrid}>
                {contrat.type ? (
                  <div className={styles.contractItem}>
                    <dt>Type</dt>
                    <dd>{contrat.type}</dd>
                  </div>
                ) : null}
                {contrat.debut ? (
                  <div className={styles.contractItem}>
                    <dt>Début</dt>
                    <dd>{new Date(contrat.debut).toLocaleDateString("fr-FR")}</dd>
                  </div>
                ) : null}
                {contrat.expiration ? (
                  <div className={styles.contractItem}>
                    <dt>Expiration</dt>
                    <dd>{new Date(contrat.expiration).toLocaleDateString("fr-FR")}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className={styles.empty}>Aucune information contractuelle renseignée.</p>
            )}
          </div>
        </section>

        <section className={styles.section} id="synthese-etat-lieux">
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Icon icon="mdi:view-dashboard-outline" width={18} height={18} aria-hidden />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>État des lieux</h3>
              <p className={styles.sectionSubtitle}>Quantitatif par périphérique pour chaque domaine du rapport.</p>
            </div>
          </div>
          <div className={styles.panel}>
            <ModuleGroup title="Infrastructure" modules={groups.infra} />
            <ModuleGroup title="Cybersécurité" modules={groups.cyber} />
            <ModuleGroup title="Services & cloud" modules={groups.cloud} />
            {!groups.infra.length && !groups.cyber.length && !groups.cloud.length ? (
              <p className={styles.empty}>Aucun module activé pour ce rapport.</p>
            ) : null}
          </div>
        </section>

        <section className={styles.section} id="synthese-support">
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Icon icon="mdi:headset" width={18} height={18} aria-hidden />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>Activité support</h3>
              <p className={styles.sectionSubtitle}>Tickets créés sur la période du rapport.</p>
            </div>
          </div>
          <div className={styles.panel}>
            <article className={styles.moduleCard}>
              <div className={styles.moduleCardHead}>
                <div className={styles.moduleCardIntro}>
                  <span className={styles.moduleCardIconWrap}>
                    <Icon icon="mdi:ticket-outline" width={18} height={18} aria-hidden />
                  </span>
                  <div>
                    <h4 className={styles.moduleCardTitle}>Support technique</h4>
                    <p className={styles.moduleCardCount}>Synthèse de l'activité ticket sur {periodLabel}</p>
                  </div>
                </div>
                <HealthBadge
                  health={
                    supportStats == null
                      ? "unsynced"
                      : supportStats.highPriority > 0
                        ? "warn"
                        : supportStats.open > 0
                          ? "warn"
                          : "ok"
                  }
                />
              </div>
              <div className={styles.moduleSignals}>
                <span className={`${styles.signal} ${styles.signalActive}`}>
                  <Icon icon="mdi:ticket-outline" width={12} height={12} />
                  {supportStats?.total ?? "…"} créé{(supportStats?.total ?? 0) > 1 ? "s" : ""}
                </span>
                {supportStats?.closed > 0 ? (
                  <span className={styles.signal}>
                    <Icon icon="mdi:check-circle-outline" width={12} height={12} />
                    {supportStats.closed} clôturé{supportStats.closed > 1 ? "s" : ""}
                  </span>
                ) : null}
                {supportStats?.open > 0 ? (
                  <span className={`${styles.signal} ${styles.signalActive}`} style={{ color: "#b45309", background: "#fffbeb" }}>
                    <Icon icon="mdi:progress-clock" width={12} height={12} />
                    {supportStats.open} ouvert{supportStats.open > 1 ? "s" : ""}
                  </span>
                ) : null}
                {supportStats?.highPriority > 0 ? (
                  <span className={`${styles.signal} ${styles.signalActive}`} style={{ color: "#b91c1c", background: "#fef2f2" }}>
                    <Icon icon="mdi:alert-circle-outline" width={12} height={12} />
                    {supportStats.highPriority} priorité haute
                  </span>
                ) : null}
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section} id="synthese-notes" data-export-comments="true">
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Icon icon="mdi:comment-text-multiple-outline" width={18} height={18} aria-hidden />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>Notes du rapport</h3>
              <p className={styles.sectionSubtitle}>Commentaires ajoutés pendant la construction du rapport.</p>
            </div>
          </div>
          <div className={styles.panel}>
            {comments.length > 0 ? (
              <div className={styles.commentsList}>
                {comments.map(comment => (
                  <article key={comment.id} className={styles.commentCard}>
                    <div className={styles.commentMeta}>
                      {comment.dateLabel ? <span>{comment.dateLabel}</span> : null}
                      <span className={styles.commentTag}>
                        <Icon
                          icon={comment.isTicket ? "mdi:ticket-outline" : "mdi:comment-text-outline"}
                          width={12}
                          height={12}
                          aria-hidden
                        />
                        {comment.linkedLabel}
                      </span>
                    </div>
                    <div className={styles.commentBody}>{renderTextWithLinks(comment.text)}</div>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Aucune note ajoutée pour ce rapport.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
