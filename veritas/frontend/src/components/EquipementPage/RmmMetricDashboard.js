import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { computeLoadZoneDistribution, computeTemperatureZoneDistribution, computeUpdatesDayDistribution, formatMetricPeriodLabel, resolvePrimaryDiskHistory, summarizeHistoryPoints } from "./rmmMetricDashboardUtils";
import styles from "./RmmMetricHistoryPanel.module.css";
function DonutTooltip({
  active,
  payload
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipLabel}>{item.name}</span>
      <strong>{item.value} jour{item.value > 1 ? "s" : ""}</strong>
    </div>;
}
function LegendList({
  segments,
  valueSuffix = ""
}) {
  if (!segments?.length) return null;
  return <ul className={styles.legendList}>
      {segments.map(segment => <li key={segment.name}>
          <span className={styles.legendSwatch} style={{
        background: segment.color
      }} aria-hidden />
          <span className={styles.legendName}>{segment.name}</span>
          <span className={styles.legendValue}>
            {segment.value}
            {valueSuffix}
          </span>
        </li>)}
    </ul>;
}
function ZonePieCard({
  title,
  icon,
  segments,
  summary,
  periodLabel,
  emptyHint
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  return <article className={styles.zoneCard}>
      <header className={styles.donutCardHeader}>
        <Icon icon={icon} className={styles.donutCardIcon} aria-hidden />
        <div>
          <h3 className={styles.donutCardTitle}>{title}</h3>
          {periodLabel ? <p className={styles.zoneCardSubtitle}>{periodLabel}</p> : null}
        </div>
      </header>

      {total === 0 ? <p className={styles.donutEmpty}>{emptyHint || "Pas assez de data sur la period"}</p> : <>
          <div className={styles.zoneChartWrap}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={segments} dataKey="value" nameKey="name" innerRadius={0} outerRadius="88%" paddingAngle={1} stroke="#fff" strokeWidth={2}>
                  {segments.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendList segments={segments} />
          {summary ? <div className={styles.statChips}>
              <span className={styles.statChip}>Moy. {summary.avg} %</span>
              <span className={styles.statChip}>Min {summary.min} %</span>
              <span className={styles.statChip}>Max {summary.max} %</span>
            </div> : null}
        </>}
    </article>;
}
export default function RmmMetricDashboard({
  dashboardHistory,
  days,
  loading,
  error
}) {
  const cpuZones = useMemo(() => computeLoadZoneDistribution(dashboardHistory?.cpu?.points), [dashboardHistory?.cpu]);
  const ramZones = useMemo(() => computeLoadZoneDistribution(dashboardHistory?.ram?.points), [dashboardHistory?.ram]);
  const tempZones = useMemo(() => computeTemperatureZoneDistribution(dashboardHistory?.temp?.points), [dashboardHistory?.temp]);
  const updatesZones = useMemo(() => computeUpdatesDayDistribution(dashboardHistory?.updates?.points), [dashboardHistory?.updates]);
  const cpuSummary = useMemo(() => summarizeHistoryPoints(dashboardHistory?.cpu?.points), [dashboardHistory?.cpu]);
  const ramSummary = useMemo(() => summarizeHistoryPoints(dashboardHistory?.ram?.points), [dashboardHistory?.ram]);
  const {
    drive: primaryDrive,
    history: primaryDiskHistory
  } = useMemo(() => resolvePrimaryDiskHistory(dashboardHistory?.disks), [dashboardHistory?.disks]);
  const diskZones = useMemo(() => computeLoadZoneDistribution(primaryDiskHistory?.points, {
    warn: 80,
    critical: 90
  }), [primaryDiskHistory]);
  const diskSummary = useMemo(() => summarizeHistoryPoints(primaryDiskHistory?.points), [primaryDiskHistory]);
  const periodLabel = formatMetricPeriodLabel(days);
  if (loading && !dashboardHistory) {
    return <div className={styles.dashboardState}>Loading dashboard…</div>;
  }
  if (error && !dashboardHistory) {
    return <div className={`${styles.dashboardState} ${styles.stateError}`}>{error}</div>;
  }
  return <div className={styles.dashboard}>
      <section className={styles.dashboardSection}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Period analysis</h3>
          <p className={styles.sectionDesc}>
            Day distribution by thresholds · quickly spot stressed workstations.
          </p>
        </header>
        <div className={styles.zoneGrid}>
          <ZonePieCard title="CPU · niveaux de charge" icon="mdi:chart-donut" segments={cpuZones} summary={cpuSummary} periodLabel={periodLabel} />
          <ZonePieCard title="RAM · niveaux d'utilisation" icon="mdi:chart-pie" segments={ramZones} summary={ramSummary} periodLabel={periodLabel} />
          <ZonePieCard title={primaryDrive ? `Disk ${primaryDrive} · usage` : "Disk · usage"} icon="mdi:harddisk" segments={diskZones} summary={diskSummary} periodLabel={periodLabel} emptyHint="Disk history unavailable" />
          {tempZones.length > 0 ? <ZonePieCard title="Temperature" icon="mdi:thermometer-lines" segments={tempZones} periodLabel={periodLabel} emptyHint="Capteur thermique non available" /> : null}
          {updatesZones.length > 0 ? <ZonePieCard title="Windows Update" icon="mdi:microsoft-windows" segments={updatesZones} periodLabel={periodLabel} emptyHint="Update history unavailable" /> : null}
        </div>
      </section>
    </div>;
}
