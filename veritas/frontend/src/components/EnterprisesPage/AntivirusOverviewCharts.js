import { useContext, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { ThemeContext } from "../ThemeProvider";
import modalStyles from "./AntivirusOverviewModal.module.css";
import {
  KpiCard,
  StatsPanel,
  statsDashboardStyles as dashStyles,
  buildDistributionItems
} from "./StatsDashboardWidgets";

/** Palette light — UI-kit adoucie. */
const CHART_LIGHT = {
  accent: "#2b5fab",
  accentMid: "#5b84c4",
  success: "#3d8f6a",
  warn: "#c47a2b",
  danger: "#c45a5a",
  muted: "#7a8aa3",
  teal: "#3d8a9a",
  slate: "#64748b",
  tick: "#5c6b82",
  grid: "#e2e8f0",
  tooltipBg: "#ffffff",
  tooltipBorder: "#d0dae8",
  tooltipText: "#0f172a"
};

/** Palette dark — moins saturée, lisible sur navy. */
const CHART_DARK = {
  accent: "#6ba3d9",
  accentMid: "#8bb4de",
  success: "#5fa882",
  warn: "#d4a05c",
  danger: "#d08888",
  muted: "#8aa0bb",
  teal: "#6aa8b5",
  slate: "#8aa0bb",
  tick: "#9bb0c9",
  grid: "#2c3d5a",
  tooltipBg: "#1f2d4a",
  tooltipBorder: "#3d5478",
  tooltipText: "#f0f4fa"
};

function useChartTheme() {
  const { theme } = useContext(ThemeContext) || {};
  const dark = theme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  return dark ? CHART_DARK : CHART_LIGHT;
}

function ChartTooltip({ active, payload, label, chart }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={dashStyles.chartTooltip}
      style={{
        background: chart.tooltipBg,
        border: `1px solid ${chart.tooltipBorder}`,
        color: chart.tooltipText,
        borderRadius: 8,
        padding: "0.45rem 0.65rem",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        fontSize: "0.75rem"
      }}
    >
      {label ? <div className={dashStyles.chartTooltipLabel} style={{ marginBottom: 4, color: chart.tick }}>{label}</div> : null}
      {payload.map(entry => (
        <div key={String(entry.name)} style={{ color: chart.tooltipText }}>
          {entry.name ? `${entry.name} : ` : null}
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

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

function renderPie(data, chart, nameKey = "name", valueKey = "value") {
  if (!data?.length) return null;
  const pieColors = [chart.accent, chart.accentMid, chart.teal, chart.warn, chart.success, chart.slate, chart.muted, chart.danger];
  return <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="transparent">
          {data.map((entry, index) => <Cell key={entry[nameKey]} fill={entry.color || pieColors[index % pieColors.length]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip chart={chart} />} formatter={value => [value, ""]} />
        <Legend wrapperStyle={{ fontSize: "0.72rem", color: chart.tick }} />
      </PieChart>
    </ResponsiveContainer>;
}

function renderBar(data, chart, nameKey = "name", valueKey = "value", fill) {
  if (!data?.length) return null;
  return <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{
      top: 8,
      right: 12,
      left: 0,
      bottom: 4
    }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: chart.tick }} axisLine={{ stroke: chart.grid }} tickLine={{ stroke: chart.grid }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chart.tick }} width={32} axisLine={{ stroke: chart.grid }} tickLine={{ stroke: chart.grid }} />
        <Tooltip content={<ChartTooltip chart={chart} />} cursor={{ fill: "rgba(127,146,170,0.12)" }} />
        <Bar dataKey={valueKey} fill={fill || chart.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>;
}

function EndpointTypeKpis({ statistics, variant = "fleet" }) {
  const byType = statistics?.endpoints?.byType;
  const physical = byType?.physical || 0;
  const virtual = byType?.virtual || 0;
  const other = byType?.other || 0;
  const total = physical + virtual + other;
  const pct = count => total > 0 ? Math.round(count / total * 100) : 0;

  if (variant === "fleet") {
    return <StatsPanel title="Types de postes">
        <section className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid3}`}>
          <KpiCard icon="mdi:desktop-classic" label="Physiques" value={physical} sub={`${pct(physical)} %`} />
          <KpiCard icon="mdi:cloud-outline" label="Virtuels" value={virtual} sub={`${pct(virtual)} %`} />
          <KpiCard icon="mdi:devices" label="Autres" value={other} sub={`${pct(other)} %`} />
        </section>
      </StatsPanel>;
  }

  const distribution = buildDistributionItems([{
    name: "Physiques",
    count: physical
  }, {
    name: "Virtuels",
    count: virtual
  }, {
    name: "Autres",
    count: other
  }]);
  return <div className={modalStyles.chartCard}>
      <div className={modalStyles.chartCardHead}>
        <h5 className={modalStyles.chartCardTitle}>Types de postes</h5>
      </div>
      {distribution.total > 0 ? <ul className={dashStyles.metricList}>
          {distribution.items.map(item => <li key={item.name}>
              <span>{item.name}</span>
              <strong>
                {item.count} ({item.pct}%)
              </strong>
            </li>)}
        </ul> : <div className={modalStyles.chartEmpty}>Distribution par type indisponible</div>}
    </div>;
}

export default function AntivirusOverviewCharts({
  statistics,
  enrichedSummary,
  incidents,
  variant = "modal",
  hideEndpointTypes = false
}) {
  const chart = useChartTheme();
  const isFleet = variant === "fleet";
  const showEndpointTypes = !hideEndpointTypes;
  const endpointStatusData = useMemo(() => {
    const byStatus = statistics?.endpoints?.byStatus;
    if (!byStatus) return [];
    return [{
      name: "En ligne",
      value: byStatus.online || 0,
      color: chart.success
    }, {
      name: "Hors ligne",
      value: byStatus.offline || 0,
      color: chart.danger
    }, {
      name: "Inconnu",
      value: byStatus.unknown || 0,
      color: chart.muted
    }].filter(item => item.value > 0);
  }, [statistics, chart]);
  const threatHealthData = useMemo(() => {
    if (!enrichedSummary?.total) return [];
    const infected = enrichedSummary.infected || 0;
    const clean = Math.max(0, enrichedSummary.total - infected);
    return [{
      name: "Sains",
      value: clean,
      color: chart.success
    }, {
      name: "Infectés",
      value: infected,
      color: chart.danger
    }].filter(item => item.value > 0);
  }, [enrichedSummary, chart]);
  const securityBarData = useMemo(() => {
    if (!enrichedSummary) return [];
    const items = [{
      name: "Infectés",
      value: enrichedSummary.infected || 0
    }, {
      name: "Détections (24 h)",
      value: enrichedSummary.malwareDetected || 0
    }, {
      name: "Hors ligne",
      value: enrichedSummary.offline || 0
    }].filter(item => item.value > 0);
    return items.length ? items : null;
  }, [enrichedSummary]);

  const hasAnyChart = endpointStatusData.length > 0 || threatHealthData.length > 0 || securityBarData?.length > 0;
  if (!hasAnyChart) {
    const empty = <div className={modalStyles.chartEmpty}>
        Aucune statistique disponible · actualisez pour récupérer les données GravityZone.
      </div>;
    if (isFleet) {
      return <>
          <section className={dashStyles.chartGrid}>
            <StatsPanel title="Statistiques">
              {empty}
            </StatsPanel>
          </section>
          {showEndpointTypes ? <EndpointTypeKpis statistics={statistics} variant="fleet" /> : null}
        </>;
    }
    return <div className={modalStyles.chartsSection}>
        <h4 className={modalStyles.chartsSectionTitle}>Statistiques</h4>
        {empty}
      </div>;
  }

  const charts = <>
      <ChartCard variant={variant} title="Statut des postes" emptyLabel="Données indisponibles">
        {renderPie(endpointStatusData, chart)}
      </ChartCard>

      <ChartCard variant={variant} title="Santé" emptyLabel="Données indisponibles">
        {renderPie(threatHealthData, chart)}
      </ChartCard>

      <ChartCard variant={variant} title="Menaces" emptyLabel="Aucune menace">
        {securityBarData ? renderBar(securityBarData, chart, "name", "value", chart.danger) : null}
      </ChartCard>
    </>;

  if (isFleet) {
    return <>
        <section className={dashStyles.chartGrid3}>{charts}</section>
        {showEndpointTypes ? <EndpointTypeKpis statistics={statistics} variant="fleet" /> : null}
      </>;
  }

  return <div className={modalStyles.chartsSection}>
      <h4 className={modalStyles.chartsSectionTitle}>Statistiques</h4>
      <div className={modalStyles.chartsGrid}>{charts}</div>
      {showEndpointTypes ? <EndpointTypeKpis statistics={statistics} variant="modal" /> : null}
    </div>;
}
