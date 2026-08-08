import { useMemo, useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { NumberStepper } from "./AdminUi";
import { RmmMetricsEstimatePanel } from "./RmmSettingsBlocks";
import { DEFAULT_METRICS } from "./rmmMetricsStorageUtils";
import { buildRmmStorageProjection, estimateRmmClientImpact, estimateRmmNetworkImpact, estimateRmmServerImpact, formatStorageBytes, formatStorageNumber } from "./rmmCostEstimates";
import { interpolate, mapCostImpactRows } from "./adminRmmI18n";
import styles from "./AdminRmm.module.css";
function ImpactCard({
  icon,
  title,
  subtitle,
  rows,
  copy
}) {
  return <article className={styles.consumptionImpactCard}>
      <header className={styles.consumptionImpactHead}>
        <Icon icon={icon} aria-hidden />
        <div>
          <h3 className={styles.consumptionImpactTitle}>{title}</h3>
          {subtitle ? <p className={styles.consumptionImpactSubtitle}>{subtitle}</p> : null}
        </div>
      </header>
      <div className={styles.consumptionTableWrap}>
        <table className={styles.consumptionImpactTable}>
          <thead>
            <tr>
              <th>{copy.common.indicator}</th>
              <th>{copy.common.value}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.label}>
                <td>
                  <span className={styles.costTooltipMetric}>{row.label}</span>
                  {row.note ? <span className={styles.costTooltipNote}>{row.note}</span> : null}
                </td>
                <td className={styles.costTooltipValue}>{row.value}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </article>;
}
export default function RmmConsumptionsPanel({
  copy,
  locale = "fr",
  settings,
  agentCount = 0,
  metricsStorage = null
}) {
  const c = copy.consumptions;
  const heartbeatMinutes = settings?.heartbeatIntervalMinutes ?? 5;
  const metrics = settings?.metrics ?? DEFAULT_METRICS;
  const collectors = settings?.collectors ?? {};
  const avgDisks = metricsStorage?.stats?.avgDisksPerAgent ?? 3;
  const activeAgents = Math.max(0, Number(agentCount) || 0);
  const storageStats = metricsStorage?.stats ?? null;
  const [projectionAgents, setProjectionAgents] = useState(activeAgents);
  useEffect(() => {
    setProjectionAgents(activeAgents);
  }, [activeAgents]);
  const clientImpact = useMemo(() => estimateRmmClientImpact({
    heartbeatIntervalMinutes: heartbeatMinutes
  }), [heartbeatMinutes]);
  const serverImpact = useMemo(() => estimateRmmServerImpact({
    agentCount: projectionAgents,
    heartbeatIntervalMinutes: heartbeatMinutes
  }), [projectionAgents, heartbeatMinutes]);
  const networkImpact = useMemo(() => estimateRmmNetworkImpact({
    agentCount: projectionAgents,
    heartbeatIntervalMinutes: heartbeatMinutes
  }), [projectionAgents, heartbeatMinutes]);
  const storageProjection = useMemo(() => {
    const baseCounts = buildRmmStorageProjection({
      retentionDays: metrics.retentionDays ?? DEFAULT_METRICS.retentionDays,
      collectors,
      avgDisksPerAgent: avgDisks
    });
    const counts = new Set(baseCounts.map(row => row.agentCount));
    if (projectionAgents > 0 && !counts.has(projectionAgents)) {
      const extra = buildRmmStorageProjection({
        agentCounts: [projectionAgents],
        retentionDays: metrics.retentionDays ?? DEFAULT_METRICS.retentionDays,
        collectors,
        avgDisksPerAgent: avgDisks
      });
      return [...extra, ...baseCounts].sort((a, b) => a.agentCount - b.agentCount);
    }
    return baseCounts;
  }, [metrics.retentionDays, collectors, avgDisks, projectionAgents]);
  const rowsPerAgentDay = storageProjection.find(row => row.agentCount === projectionAgents)?.rowsPerAgentDay ?? storageProjection[0]?.rowsPerAgentDay;
  const intervalLabel = `${heartbeatMinutes} ${copy.common.minSuffix}`;
  const retentionLabel = `${metrics.retentionDays ?? DEFAULT_METRICS.retentionDays} ${copy.common.daysSuffix}`;
  const projectionLabel = `${formatStorageNumber(projectionAgents, locale)} ${copy.common.workstationsSuffix}`;
  const agentLabel = activeAgents > 1 ? c.agentPlural : c.agentSingular;
  const introText = interpolate(c.intro, {
    interval: intervalLabel,
    retention: retentionLabel,
    agentCount: activeAgents,
    agentLabel,
    settingsTab: c.settingsTab
  });
  const clientRows = useMemo(() => mapCostImpactRows(clientImpact.rows, copy.cost.client, copy), [clientImpact.rows, copy]);
  const serverRows = useMemo(() => mapCostImpactRows(serverImpact.rows, copy.cost.server, copy, {
    agents: projectionAgents
  }), [serverImpact.rows, copy, projectionAgents]);
  const networkRows = useMemo(() => mapCostImpactRows(networkImpact.rows, copy.cost.network, copy), [networkImpact.rows, copy]);
  const projectionHint = interpolate(c.projectionSectionHint, {
    retention: retentionLabel,
    currentMetrics: storageStats?.totalBytes != null ? interpolate(c.currentMetrics, {
      size: formatStorageBytes(storageStats.totalBytes)
    }) : ""
  });
  return <div className={styles.consumptionsLayout}>
      <section className={styles.consumptionsIntro}>
        <p className={styles.consumptionsIntroText}>{introText}</p>
        <div className={styles.consumptionsProjectionControl}>
          <span className={styles.metricsProjectionLabel}>{c.projectionLabel}</span>
          <NumberStepper value={projectionAgents} onChange={setProjectionAgents} min={0} max={50000} suffix={copy.common.workstationsSuffix} />
        </div>
      </section>

      <section className={styles.consumptionsSection}>
        <h2 className={styles.consumptionsSectionTitle}>{c.heartbeatSectionTitle}</h2>
        <p className={styles.consumptionsSectionHint}>{c.heartbeatSectionHint}</p>
        <div className={styles.consumptionImpactGrid}>
          <ImpactCard copy={copy} icon="mdi:laptop" title={c.clientCardTitle} subtitle={interpolate(c.clientCardSubtitle, {
          interval: intervalLabel
        })} rows={clientRows} />
          <ImpactCard copy={copy} icon="mdi:server" title={c.serverCardTitle} subtitle={interpolate(c.serverCardSubtitle, {
          projection: projectionLabel,
          interval: intervalLabel
        })} rows={serverRows} />
          <ImpactCard copy={copy} icon="mdi:lan-connect" title={c.networkCardTitle} subtitle={interpolate(c.networkCardSubtitle, {
          projection: projectionLabel
        })} rows={networkRows} />
        </div>
      </section>

      <section className={styles.consumptionsSection}>
        <h2 className={styles.consumptionsSectionTitle}>{c.storageSectionTitle}</h2>
        <p className={styles.consumptionsSectionHint}>{c.storageSectionHint}</p>
        <RmmMetricsEstimatePanel copy={copy} locale={locale} metrics={metrics} collectors={collectors} agentCount={projectionAgents} avgDisksPerAgent={avgDisks} storageStats={storageStats} hideProjectionControl />
      </section>

      <section className={styles.consumptionsSection}>
        <header className={styles.agentsStorageProjectionHead}>
          <Icon icon="mdi:table-large" aria-hidden />
          <div>
            <h2 className={styles.consumptionsSectionTitle}>{c.projectionSectionTitle}</h2>
            <p className={styles.consumptionsSectionHint}>{projectionHint}</p>
          </div>
        </header>
        <div className={styles.agentsStorageTableWrap}>
          <table className={styles.agentsStorageTable}>
            <thead>
              <tr>
                <th>{c.colWorkstations}</th>
                <th>{c.colMetricsEst}</th>
                <th>{c.colInventoryEst}</th>
                <th>{c.colTotalEst}</th>
                <th>{c.colMetricRows}</th>
              </tr>
            </thead>
            <tbody>
              {storageProjection.map(row => {
              const highlight = row.agentCount === projectionAgents;
              return <tr key={row.agentCount} className={highlight ? styles.agentsStorageRowActive : undefined}>
                    <td>
                      {formatStorageNumber(row.agentCount, locale)}
                      {highlight ? <span className={styles.agentsStorageRowBadge}>{c.projectionBadge}</span> : null}
                    </td>
                    <td>{formatStorageBytes(row.metricsBytes)}</td>
                    <td>{formatStorageBytes(row.inventoryBytes)}</td>
                    <td>
                      <strong>{formatStorageBytes(row.totalBytes)}</strong>
                    </td>
                    <td>{formatStorageNumber(row.steadyStateRows, locale)}</td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
        <p className={styles.agentsStorageFootnote}>
          {interpolate(c.footnote, {
          rowsPerDay: formatStorageNumber(rowsPerAgentDay, locale),
          sampleInterval: metrics.sampleIntervalMinutes ?? 60
        })}
        </p>
      </section>
    </div>;
}
