import { Icon } from "@iconify/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import portalStyles from "./ClientDashboard.module.css";
import styles from "./ClientServicesDetailView.module.css";

function chartTheme() {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    grid: dark ? "#334155" : "#e5e7eb",
    tick: dark ? "#94a3b8" : "#374151",
    tooltipBg: dark ? "#1e293b" : "#ffffff",
    tooltipBorder: dark ? "#334155" : "#e5e7eb",
    tooltipText: dark ? "#e2e8f0" : "#111827"
  };
}

function formatChartDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function PortalLineChart({ data, lines }) {
  const theme = chartTheme();
  if (!Array.isArray(data) || !data.length) return null;
  return (
    <div className={styles.tenantChart}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="date" tick={{ fill: theme.tick, fontSize: 11 }} stroke={theme.grid} />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} stroke={theme.grid} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.tooltipBorder}`,
              borderRadius: 8,
              color: theme.tooltipText
            }}
          />
          <Legend />
          {lines.map(line => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExchangePortalPanel({ exchange, copy, formatStorage, ServiceTable }) {
  if (!exchange) {
    return <p className={portalStyles.empty}>{copy.noItems}</p>;
  }
  const daily = (exchange.dailyActivity || []).map(day => ({
    date: formatChartDate(day.date),
    [copy.mailSent]: day.sent || 0,
    [copy.mailReceived]: day.received || 0,
    [copy.mailRead]: day.read || 0
  }));
  const buckets = exchange.quotaBuckets || {};
  const pieData = [
    { name: copy.quotaOver50, value: buckets.over50 || 0, color: "#ef4444" },
    { name: copy.quotaFrom25, value: buckets.from25 || 0, color: "#f59e0b" },
    { name: copy.quotaFrom10, value: buckets.from10 || 0, color: "#3b82f6" },
    { name: copy.quotaFrom5, value: buckets.from5 || 0, color: "#10b981" },
    { name: copy.quotaUnder5, value: buckets.under5 || 0, color: "#6b7280" }
  ].filter(item => item.value > 0);
  const theme = chartTheme();

  return (
    <>
      <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
        <div>
          <dt>{copy.mailboxes}</dt>
          <dd>{exchange.mailboxCount ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.mailSent}</dt>
          <dd>{exchange.sent ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.mailReceived}</dt>
          <dd>{exchange.received ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.mailRead}</dt>
          <dd>{exchange.read ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.mailStorage}</dt>
          <dd>{formatStorage(exchange.storage)}</dd>
        </div>
        <div>
          <dt>{copy.mailboxAverage}</dt>
          <dd>{formatStorage(exchange.averageSize)}</dd>
        </div>
        <div>
          <dt>{copy.quotasFull}</dt>
          <dd>{exchange.quotasFull ?? "—"}</dd>
        </div>
      </dl>
      {daily.length ? (
        <PortalLineChart
          data={daily}
          lines={[
            { key: copy.mailSent, label: copy.mailSent, color: "#3b82f6" },
            { key: copy.mailReceived, label: copy.mailReceived, color: "#10b981" },
            { key: copy.mailRead, label: copy.mailRead, color: "#8b5cf6" }
          ]}
        />
      ) : null}
      <div className={styles.tenantQuotaGrid}>
        {pieData.length ? (
          <div className={styles.tenantChart}>
            <h3 className={styles.tenantSubTitle}>{copy.quotaDistribution}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map(item => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: theme.tooltipBg,
                    border: `1px solid ${theme.tooltipBorder}`,
                    borderRadius: 8,
                    color: theme.tooltipText
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <div>
          <h3 className={styles.tenantSubTitle}>{copy.quotaUsers}</h3>
          <ServiceTable
            emptyLabel={copy.noItems}
            tableClassName={styles.tenantAppTable}
            columns={[
              { key: "name", label: copy.userName, render: row => row.name },
              { key: "used", label: copy.quotaUsed, render: row => formatStorage(row.used) },
              { key: "percent", label: copy.quotaPercent, render: row => row.percent != null ? `${row.percent} %` : "—" }
            ]}
            rows={exchange.quotas || []}
          />
        </div>
      </div>
      {(exchange.topUsers || []).length ? (
        <>
          <h3 className={styles.tenantSubTitle}>{copy.topMailUsers}</h3>
          <ServiceTable
            emptyLabel={copy.noItems}
            tableClassName={styles.tenantAppTable}
            columns={[
              { key: "name", label: copy.userName, render: row => row.name },
              { key: "sent", label: copy.mailSent, render: row => row.sent },
              { key: "received", label: copy.mailReceived, render: row => row.received },
              { key: "read", label: copy.mailRead, render: row => row.read }
            ]}
            rows={exchange.topUsers}
          />
        </>
      ) : null}
    </>
  );
}

export function TeamsPortalPanel({ teams, copy, ServiceTable }) {
  if (!teams) {
    return <p className={portalStyles.empty}>{copy.noItems}</p>;
  }
  const daily = (teams.dailyActivity || []).map(day => ({
    date: formatChartDate(day.date),
    [copy.teamsChannelMessages]: day.channelMessages || 0,
    [copy.teamsChatMessages]: day.chatMessages || 0,
    [copy.teamsCalls]: day.oneOnOneCalls || 0,
    [copy.teamsMeetings]: day.totalMeetings || 0
  }));

  return (
    <>
      <dl className={`${portalStyles.infoCardFacts} ${styles.tenantFacts}`}>
        <div>
          <dt>{copy.teamsLicensed}</dt>
          <dd>{teams.licensedUsers ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsActive}</dt>
          <dd>{teams.activeUsers ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsMessages}</dt>
          <dd>{teams.messages?.total ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsChatMessages}</dt>
          <dd>{teams.messages?.privateChat ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsChannelMessages}</dt>
          <dd>{teams.messages?.teamChat ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsMeetings}</dt>
          <dd>{teams.meetings?.total ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsCalls}</dt>
          <dd>{teams.calls?.total ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.teamsCallDuration}</dt>
          <dd>{teams.calls?.totalDuration || "—"}</dd>
        </div>
      </dl>
      {daily.length ? (
        <PortalLineChart
          data={daily}
          lines={[
            { key: copy.teamsChannelMessages, label: copy.teamsChannelMessages, color: "#3b82f6" },
            { key: copy.teamsChatMessages, label: copy.teamsChatMessages, color: "#10b981" },
            { key: copy.teamsCalls, label: copy.teamsCalls, color: "#f59e0b" },
            { key: copy.teamsMeetings, label: copy.teamsMeetings, color: "#8b5cf6" }
          ]}
        />
      ) : null}
      <h3 className={styles.tenantSubTitle}>{copy.teamsTitle}</h3>
      <ServiceTable
        emptyLabel={copy.noItems}
        tableClassName={styles.tenantAppTable}
        columns={[
          { key: "name", label: copy.teamName, render: row => row.name },
          { key: "members", label: copy.teamMembers, render: row => row.members },
          { key: "channels", label: copy.teamChannels, render: row => row.channels },
          {
            key: "visibility",
            label: copy.teamVisibility,
            render: row => row.visibility === "private" ? copy.visibilityPrivate : copy.visibilityPublic
          }
        ]}
        rows={teams.teams || []}
      />
    </>
  );
}

export function AppPanelHeader({ icon, title, count }) {
  return (
    <div className={portalStyles.panelHeader}>
      <span className={portalStyles.panelTitle}>
        <Icon icon={icon} aria-hidden />
        {title}
      </span>
      {count != null ? <span className={portalStyles.panelCount}>{count}</span> : null}
    </div>
  );
}
