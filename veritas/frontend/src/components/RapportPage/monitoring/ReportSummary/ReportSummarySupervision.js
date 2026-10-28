import React, { useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { SUMMARY_HEALTH_META } from "../steps/summaryData";
import ReportSynthesisEditor from "./ReportSynthesisEditor";
import styles from "./ReportSummarySupervision.module.css";

function plural(count, singular, pluralForm = null) {
  const n = Number(count) || 0;
  return n > 1 ? pluralForm || `${singular}s` : singular;
}

function healthMeta(health) {
  return SUMMARY_HEALTH_META[health] || SUMMARY_HEALTH_META.unmapped;
}

function healthToneColor(health) {
  if (health === "critical") return SUMMARY_HEALTH_META.critical.color;
  if (health === "warn") return SUMMARY_HEALTH_META.warn.color;
  return null;
}

function HealthTone({ health, children }) {
  const meta = healthMeta(health);
  const tone = healthToneColor(health);
  return (
    <span
      className={`${styles.healthTone}${tone ? "" : ` ${styles.healthToneNeutral}`}`}
      style={tone ? { color: tone } : undefined}
      title={meta.label}
    >
      <IconifyIcon icon={meta.icon} width={15} height={15} aria-hidden />
      <span>{children || meta.label}</span>
    </span>
  );
}

function equipmentStatusLabel(eq) {
  const quantified = eq?.quantified || {};
  const parts = [];
  if (!eq?.supervision?.mapped) {
    return "Non supervisé";
  }
  if (quantified.availabilityLabel) parts.push(`Dispo. ${quantified.availabilityLabel}`);
  if (quantified.services > 0) parts.push(`${quantified.services} svc`);
  if (quantified.events > 0) parts.push(`${quantified.events} alerte${quantified.events > 1 ? "s" : ""}`);
  if (parts.length === 0) {
    return healthMeta(eq.health).label;
  }
  return parts.join(" · ");
}

function buildSynthesis({ criticalCount, warnCount, watchCount, monitoredCount, equipmentCount }) {
  if (criticalCount > 0) {
    return `L'infrastructure présente ${criticalCount} ${plural(criticalCount, "point")} critique${criticalCount > 1 ? "s" : ""}.`;
  }
  if (warnCount > 0 || watchCount > 0) {
    return "L'infrastructure est globalement saine, avec des points à vérifier.";
  }
  if (monitoredCount > 0) {
    return "L'infrastructure supervisée est en bonne santé.";
  }
  if (equipmentCount > 0) {
    return "Des équipements sont référencés, mais aucun n'est actuellement supervisé.";
  }
  return "Aucun équipement matériel n'est référencé pour cette période.";
}

function familyHealthSummary(module) {
  const eqs = Array.isArray(module.equipments) ? module.equipments : [];
  if (eqs.length > 0) {
    return {
      critical: eqs.filter(e => e.health === "critical").length,
      warn: eqs.filter(e => e.health === "warn").length,
      ok: eqs.filter(e => e.health === "ok").length,
      unmapped: eqs.filter(e => !e.supervision?.mapped || e.health === "unmapped" || e.health === "unsynced").length,
      total: eqs.length
    };
  }
  return {
    critical: Number(module.critical) || 0,
    warn: Number(module.warn) || 0,
    ok: 0,
    unmapped: 0,
    total: Number(module.count) || 0
  };
}

export default function ReportSummarySupervision({
  snapshot,
  synthesisHtml = null,
  onSynthesisChange = null
}) {
  const [showDetail, setShowDetail] = useState(false);

  const { groups = {}, watchPoints = [], comments = [] } = snapshot || {};

  const reportComments = useMemo(
    () => (Array.isArray(comments) ? comments.filter(c => String(c?.text || "").trim()) : []),
    [comments]
  );

  const commentsByEquipmentKey = useMemo(() => {
    const map = {};
    reportComments.forEach(comment => {
      const key = comment.equipmentKey ? String(comment.equipmentKey) : "";
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(comment);
    });
    return map;
  }, [reportComments]);

  function equipmentCommentLabel(eq) {
    const fromRow = String(eq?.commentPreview || "").trim();
    if (fromRow) return fromRow;
    const items = Array.isArray(eq?.commentItems) ? eq.commentItems : commentsByEquipmentKey[eq?.key] || [];
    const texts = items.map(item => String(item?.text || "").trim()).filter(Boolean);
    return texts.length ? texts.join(" · ") : "—";
  }

  const infraModules = useMemo(
    () => (Array.isArray(groups.infra) ? groups.infra.filter(m => (m.count || 0) > 0 || (m.equipments || []).length > 0) : []),
    [groups.infra]
  );

  const infraKeys = useMemo(() => new Set(infraModules.map(m => m.key)), [infraModules]);

  const hardwareWatchPoints = useMemo(
    () => (watchPoints || []).filter(p => !p.moduleKey || infraKeys.has(p.moduleKey)),
    [watchPoints, infraKeys]
  );

  const { equipmentCount, criticalCount, warnCount, monitoredCount, watchCount } = useMemo(() => {
    let equipments = 0;
    let critical = 0;
    let warn = 0;
    let monitored = 0;
    infraModules.forEach(module => {
      const eqs = Array.isArray(module.equipments) ? module.equipments : [];
      equipments += eqs.length || Number(module.count) || 0;
      if (eqs.length > 0) {
        critical += eqs.filter(e => e.health === "critical").length;
        warn += eqs.filter(e => e.health === "warn").length;
        monitored += eqs.filter(e => e.supervision?.mapped).length;
      } else {
        critical += Number(module.critical) || 0;
        warn += Number(module.warn) || 0;
        monitored += Number(module.monitored) || 0;
      }
    });
    return {
      equipmentCount: equipments,
      criticalCount: critical,
      warnCount: warn,
      monitoredCount: monitored,
      watchCount: hardwareWatchPoints.length
    };
  }, [infraModules, hardwareWatchPoints]);

  const synthesis = useMemo(
    () =>
      buildSynthesis({
        criticalCount,
        warnCount,
        watchCount,
        monitoredCount,
        equipmentCount
      }),
    [criticalCount, warnCount, watchCount, monitoredCount, equipmentCount]
  );

  const supervisedRatio = useMemo(() => {
    if (!equipmentCount) return 0;
    return Math.round((monitoredCount / equipmentCount) * 100);
  }, [equipmentCount, monitoredCount]);

  const overviewCards = useMemo(
    () => [
      {
        key: "equip",
        label: "Périphériques",
        value: equipmentCount,
        hint: "total inventoriés"
      },
      {
        key: "monitored",
        label: "Supervisés",
        value: monitoredCount,
        hint: `sur ${equipmentCount}`
      },
      {
        key: "coverage",
        label: "Infra supervisée",
        value: `${supervisedRatio} %`,
        hint: "couverture surveillance en temps réel"
      }
    ],
    [equipmentCount, monitoredCount, supervisedRatio]
  );

  if (!snapshot) return null;

  return (
    <div className={styles.executiveRoot}>
      <section className={styles.sectionBlock}>
        <div className={`${styles.kpiStrip} ${styles.kpiStripTriple}`} role="list" aria-label="Couverture de supervision">
          {overviewCards.map(card => (
            <div key={card.key} className={styles.kpiItem} role="listitem">
              <span className={styles.kpiLabel}>{card.label}</span>
              <span className={styles.kpiValue}>{card.value}</span>
              {card.hint ? <span className={styles.kpiHint}>{card.hint}</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <h4 className={styles.sectionHeading}>Synthèse</h4>
        <div
          className={
            typeof onSynthesisChange === "function"
              ? styles.synthesisEditorHost
              : styles.synthesisPanel
          }
        >
          {typeof onSynthesisChange === "function" ? (
            <ReportSynthesisEditor
              value={synthesisHtml != null ? synthesisHtml : synthesis}
              onChange={onSynthesisChange}
              placeholder="Rédigez la synthèse de supervision…"
            />
          ) : (
            <p className={styles.synthesis}>{synthesis}</p>
          )}
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <h4 className={styles.sectionHeading}>Santé par famille</h4>
        {infraModules.length === 0 ? (
          <p className={styles.emptyHint}>Aucune famille d&apos;équipements matériel.</p>
        ) : (
          <div className={styles.familyGrid}>
            {infraModules.map(module => {
              const summary = familyHealthSummary(module);
              const health = module.health || "unmapped";
              const meta = healthMeta(health);
              const monitored = Number(module.monitored) || 0;
              const alertTone = health === "critical" || health === "warn";
              return (
                <article
                  key={module.key}
                  className={`${styles.familyCard}${alertTone ? ` ${styles.familyCardAlert}` : ""}`}
                  style={
                    alertTone
                      ? { "--family-tone": meta.color }
                      : undefined
                  }
                >
                  <div className={styles.familyCardTop}>
                    <IconifyIcon
                      icon={module.icon || "mdi:server"}
                      className={styles.familyCardIcon}
                      width={22}
                      height={22}
                      aria-hidden
                    />
                    <span
                      className={`${styles.familyCardStatus}${alertTone ? ` ${styles.familyCardStatusAlert}` : ""}`}
                      title={meta.label}
                      style={alertTone ? { color: meta.color } : undefined}
                    >
                      <IconifyIcon icon={meta.icon} width={14} height={14} aria-hidden />
                      {meta.label}
                    </span>
                  </div>
                  <div className={styles.familyCardBody}>
                    <h5 className={styles.familyName}>{module.label}</h5>
                    <p className={styles.familyMeta}>
                      {monitored}/{summary.total} supervisé{monitored > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className={styles.familyCardStats} aria-label={`Statuts ${module.label}`}>
                    <span className={styles.familyStatChip} title="Sains">
                      <IconifyIcon icon="mdi:check-circle" width={15} height={15} aria-hidden />
                      <strong>{summary.ok}</strong>
                    </span>
                    <span
                      className={`${styles.familyStatChip}${summary.warn > 0 ? ` ${styles.familyStatWarn}` : ""}`}
                      title="À surveiller"
                    >
                      <IconifyIcon icon="mdi:alert" width={15} height={15} aria-hidden />
                      <strong>{summary.warn}</strong>
                    </span>
                    <span
                      className={`${styles.familyStatChip}${summary.critical > 0 ? ` ${styles.familyStatCritical}` : ""}`}
                      title="Critiques"
                    >
                      <IconifyIcon icon="mdi:alert-octagon" width={15} height={15} aria-hidden />
                      <strong>{summary.critical}</strong>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.sectionBlock} data-export-hide="true">
        <button
          type="button"
          className={styles.moreToggle}
          onClick={() => setShowDetail(prev => !prev)}
          aria-expanded={showDetail}
        >
          <IconifyIcon icon={showDetail ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} height={18} aria-hidden />
          {showDetail ? "Masquer le détail des équipements" : "Voir plus — détail de la santé des équipements"}
        </button>

        {showDetail ? (
          <div className={styles.detailPanel}>
            {infraModules.map(module => {
              const eqs = Array.isArray(module.equipments) ? module.equipments : [];
              return (
                <div key={`detail-${module.key}`} className={styles.detailFamily}>
                  <h5 className={styles.detailFamilyTitle}>
                    {module.label}
                    <span className={styles.detailFamilyCount}>{eqs.length}</span>
                  </h5>
                  {eqs.length === 0 ? (
                    <p className={styles.emptyHint}>Aucun équipement dans cette famille.</p>
                  ) : (
                    <div className={styles.detailTableWrap}>
                      <table className={styles.detailTable}>
                        <thead>
                          <tr>
                            <th>Équipement</th>
                            <th>Site</th>
                            <th>État</th>
                            <th>Supervision</th>
                            <th>Commentaires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eqs.map(eq => {
                            const commentLabel = equipmentCommentLabel(eq);
                            const hasComment = commentLabel !== "—";
                            return (
                              <tr key={eq.key || eq.label}>
                                <td>
                                  <span className={styles.eqName}>{eq.label || "—"}</span>
                                </td>
                                <td>{eq.site || "—"}</td>
                                <td>
                                  <HealthTone health={eq.health || "unmapped"} />
                                </td>
                                <td>{equipmentStatusLabel(eq)}</td>
                                <td>
                                  <span
                                    className={hasComment ? styles.eqComment : styles.eqCommentEmpty}
                                    title={hasComment ? commentLabel : undefined}
                                  >
                                    {commentLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className={styles.sectionBlock} data-export-comments="true">
        <div className={styles.commentsHeader}>
          <IconifyIcon icon="mdi:comment-text-outline" width={18} height={18} aria-hidden />
          <h4 className={styles.sectionHeading}>Commentaires</h4>
          {reportComments.length > 0 ? (
            <span className={styles.commentsCount}>{reportComments.length}</span>
          ) : null}
        </div>
        {reportComments.length === 0 ? (
          <p className={styles.commentsEmpty}>Aucun commentaire ajouté sur ce rapport.</p>
        ) : (
          <ul className={styles.commentsList}>
            {reportComments.map(comment => (
              <li key={comment.id || `${comment.linkedLabel}-${comment.createdAt}`} className={styles.commentCard}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentLink}>{comment.linkedLabel || "Note"}</span>
                  {comment.dateLabel ? <span className={styles.commentDate}>{comment.dateLabel}</span> : null}
                </div>
                <p className={styles.commentBody}>{comment.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
