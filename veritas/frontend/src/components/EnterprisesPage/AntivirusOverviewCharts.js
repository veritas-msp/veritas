import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import modalStyles from "./AntivirusOverviewModal.module.css";
import { StatsPanel, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";
const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#64748b", "#ec4899"];
const BAR_COLOR = "#ed1c24";
function ChartCard({
  title,
  subtitle,
  children,
  emptyLabel,
  variant = "modal"
}) {
  const isEmpty = !children;
  if (variant === "fleet") {
    return <StatsPanel title={title}>
        {subtitle ? <p className={dashStyles.panelDesc}>{subtitle}</p> : null}
        {isEmpty ? <div className={modalStyles.chartEmpty}>{emptyLabel}</div> : children}
      </StatsPanel>;
  }
  return <div className={modalStyles.chartCard}>
      <div className={modalStyles.chartCardHead}>
        <h5 className={modalStyles.chartCardTitle}>{title}</h5>
        {subtitle ? <p className={modalStyles.chartCardSubtitle}>{subtitle}</p> : null}
      </div>
      {isEmpty ? <div className={modalStyles.chartEmpty}>{emptyLabel}</div> : children}
    </div>;
}
function renderPie(data, nameKey = "name", valueKey = "value") {
  if (!data?.length) return null;
  return <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
          {data.map((entry, index) => <Cell key={entry[nameKey]} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={value => [value, ""]} />
        <Legend wrapperStyle={{
        fontSize: "0.72rem"
      }} />
      </PieChart>
    </ResponsiveContainer>;
}
function renderBar(data, nameKey = "name", valueKey = "value") {
  if (!data?.length) return null;
  return <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{
      top: 8,
      right: 12,
      left: 0,
      bottom: 4
    }}>
        <XAxis dataKey={nameKey} tick={{
        fontSize: 11
      }} />
        <YAxis allowDecimals={false} tick={{
        fontSize: 11
      }} width={32} />
        <Tooltip />
        <Bar dataKey={valueKey} fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>;
}
export default function AntivirusOverviewCharts({
  statistics,
  enrichedSummary,
  incidents,
  variant = "modal"
}) {
  const isFleet = variant === "fleet";
  const endpointStatusData = useMemo(() => {
    const byStatus = statistics?.endpoints?.byStatus;
    if (!byStatus) return [];
    return [{
      name: "Online",
      value: byStatus.online || 0,
      color: "#22c55e"
    }, {
      name: "Offline",
      value: byStatus.offline || 0,
      color: "#ef4444"
    }, {
      name: "Unknown",
      value: byStatus.unknown || 0,
      color: "#94a3b8"
    }].filter(item => item.value > 0);
  }, [statistics]);
  const osDistributionData = useMemo(() => {
    const byOS = statistics?.endpoints?.byOS;
    if (!byOS || !Object.keys(byOS).length) return [];
    return Object.entries(byOS).map(([name, value], index) => ({
      name,
      value,
      color: PIE_COLORS[index % PIE_COLORS.length]
    })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [statistics]);
  const threatHealthData = useMemo(() => {
    if (!enrichedSummary?.total) return [];
    const infected = enrichedSummary.infected || 0;
    const clean = Math.max(0, enrichedSummary.total - infected);
    return [{
      name: "Healthy",
      value: clean,
      color: "#22c55e"
    }, {
      name: "Infected",
      value: infected,
      color: "#ef4444"
    }].filter(item => item.value > 0);
  }, [enrichedSummary]);
  const securityBarData = useMemo(() => {
    if (!enrichedSummary) return [];
    const items = [{
      name: "Infected",
      value: enrichedSummary.infected || 0
    }, {
      name: "Detections (24h)",
      value: enrichedSummary.malwareDetected || 0
    }, {
      name: "Offline",
      value: enrichedSummary.offline || 0
    }].filter(item => item.value > 0);
    return items.length ? items : null;
  }, [enrichedSummary]);
  const incidentsSeverityData = useMemo(() => {
    const items = incidents?.items || [];
    if (!items.length) return [];
    const counts = {};
    items.forEach(item => {
      const severity = String(item.severity || item.priority || "Unclassified");
      counts[severity] = (counts[severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [incidents]);
  const endpointTypeData = useMemo(() => {
    const byType = statistics?.endpoints?.byType;
    if (!byType) return [];
    return [{
      name: "Physical",
      value: byType.physical || 0
    }, {
      name: "Virtual",
      value: byType.virtual || 0
    }, {
      name: "Other",
      value: byType.other || 0
    }].filter(item => item.value > 0);
  }, [statistics]);
  const hasAnyChart = endpointStatusData.length > 0 || osDistributionData.length > 0 || threatHealthData.length > 0 || securityBarData?.length > 0 || incidentsSeverityData.length > 0 || endpointTypeData.length > 0;
  if (!hasAnyChart) {
    const empty = <div className={modalStyles.chartEmpty}>
        No statistics available · click Refresh to retrieve data from
        GravityZone.
      </div>;
    if (isFleet) {
      return <section className={dashStyles.chartGrid}>
          <StatsPanel title="Security statistics" icon="mdi:chart-donut">
            {empty}
          </StatsPanel>
        </section>;
    }
    return <div className={modalStyles.chartsSection}>
        <h4 className={modalStyles.chartsSectionTitle}>Security statistics</h4>
        {empty}
      </div>;
  }
  const charts = <>
      <ChartCard variant={variant} title="Workstation status" subtitle="Online / offline distribution" emptyLabel="Connectivity data unavailable">
        {renderPie(endpointStatusData)}
      </ChartCard>

      <ChartCard variant={variant} title="Endpoint health" subtitle="Infected vs healthy workstations" emptyLabel="Malware data unavailable">
        {renderPie(threatHealthData)}
      </ChartCard>

      <ChartCard variant={variant} title="Operating systems" subtitle="Distribution by OS" emptyLabel="OS distribution unavailable">
        {renderPie(osDistributionData)}
      </ChartCard>

      <ChartCard variant={variant} title="Threats & attacks" subtitle="Infections, recent detections, offline workstations" emptyLabel="No threats detected">
        {securityBarData ? renderBar(securityBarData) : null}
      </ChartCard>

      <ChartCard variant={variant} title="Incidents by severity" subtitle={`${incidents?.total ?? 0} incident(s) in preview`} emptyLabel="No incidents">
        {incidentsSeverityData.length ? renderBar(incidentsSeverityData) : null}
      </ChartCard>

      <ChartCard variant={variant} title="Workstation type" subtitle="Physical vs virtual" emptyLabel="Distribution by type unavailable">
        {endpointTypeData.length ? renderBar(endpointTypeData) : null}
      </ChartCard>
    </>;
  if (isFleet) {
    return <section className={dashStyles.chartGrid}>{charts}</section>;
  }
  return <div className={modalStyles.chartsSection}>
      <h4 className={modalStyles.chartsSectionTitle}>Security statistics</h4>
      <div className={modalStyles.chartsGrid}>{charts}</div>
    </div>;
}
