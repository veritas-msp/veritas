import { useContext, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { ThemeContext } from "../ThemeProvider";
import { StatsPanel, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";

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

function renderPie(data, chart) {
  const pieColors = [chart.accent, chart.accentMid, chart.teal, chart.warn, chart.success, chart.slate, chart.muted, chart.danger];
  const hasValue = data.some(item => Number(item.value) > 0);
  const pieData = hasValue
    ? data.filter(item => Number(item.value) > 0)
    : [{ name: "Total", value: 1, color: chart.muted, placeholder: true }];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={78}
          paddingAngle={hasValue ? 2 : 0}
          stroke="transparent"
        >
          {pieData.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || pieColors[index % pieColors.length]} />
          ))}
        </Pie>
        <Tooltip
          content={<ChartTooltip chart={chart} />}
          formatter={(value, _name, props) => [props?.payload?.placeholder ? 0 : value, ""]}
        />
        <Legend
          wrapperStyle={{ fontSize: "0.72rem", color: chart.tick }}
          payload={data.map((entry, index) => ({
            value: entry.name,
            type: "square",
            id: entry.name,
            color: entry.color || pieColors[index % pieColors.length]
          }))}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderBar(data, chart, fill) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.tick }} axisLine={{ stroke: chart.grid }} tickLine={{ stroke: chart.grid }} />
        <YAxis allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11, fill: chart.tick }} width={32} axisLine={{ stroke: chart.grid }} tickLine={{ stroke: chart.grid }} />
        <Tooltip content={<ChartTooltip chart={chart} />} cursor={{ fill: "rgba(127,146,170,0.12)" }} />
        <Bar dataKey="value" fill={fill || chart.accent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AntispamOverviewCharts({
  usersTotal = 0,
  domainsTotal = 0,
  emailsTotal = 0,
  serversTotal = 0,
  sendersTotal = 0,
  spoolsTotal = 0,
  clientPanel = null
}) {
  const chart = useChartTheme();
  const pieData = useMemo(
    () => [
      { name: "Utilisateurs", value: Number(usersTotal) || 0, color: chart.accent },
      { name: "Domaines", value: Number(domainsTotal) || 0, color: chart.accentMid },
      { name: "E-mails", value: Number(emailsTotal) || 0, color: chart.teal },
      { name: "Serveurs", value: Number(serversTotal) || 0, color: chart.warn },
      { name: "Expéditeurs", value: Number(sendersTotal) || 0, color: chart.success },
      { name: "Files d’attente", value: Number(spoolsTotal) || 0, color: chart.slate }
    ],
    [chart, usersTotal, domainsTotal, emailsTotal, serversTotal, sendersTotal, spoolsTotal]
  );
  const barData = useMemo(
    () => [
      { name: "Domaines", value: Number(domainsTotal) || 0 },
      { name: "Utilisateurs", value: Number(usersTotal) || 0 },
      { name: "E-mails", value: Number(emailsTotal) || 0 },
      { name: "Serveurs", value: Number(serversTotal) || 0 },
      { name: "Expéditeurs", value: Number(sendersTotal) || 0 },
      { name: "Files", value: Number(spoolsTotal) || 0 }
    ],
    [usersTotal, domainsTotal, emailsTotal, serversTotal, sendersTotal, spoolsTotal]
  );

  return (
    <section className={dashStyles.chartGrid3}>
      <StatsPanel title="Répartition du parc">
        {renderPie(pieData, chart)}
      </StatsPanel>
      {clientPanel}
      <StatsPanel title="Volumes par module">
        {renderBar(barData, chart, chart.accent)}
      </StatsPanel>
    </section>
  );
}
