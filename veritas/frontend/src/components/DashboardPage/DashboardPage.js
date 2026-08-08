import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { fetchAnalyticsDashboard } from "../../api/dashboard";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { buildDistributionItems, DashboardDistributionBars, DashboardPieChart } from "./DashboardCharts";
import { getDashboardPageCopy } from "./dashboardPageI18n";
import DashboardPeriodModal from "./DashboardPeriodModal";
import DashboardDistributionModal from "./DashboardDistributionModal";
import DashboardTopCard from "./DashboardTopCard";
import DashboardScopeFilter from "./DashboardScopeFilter";
import AiBriefingPanel from "../Misc/AiBriefingPanel/AiBriefingPanel";
import { generateDashboardBriefingAi } from "../../api/ai";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import SmartTooltip from "../SmartTooltip";
import { DEFAULT_PERIOD_FILTER, getPeriodFilterLabel } from "./dashboardPeriodUtils";
import { DEFAULT_SCOPE_FILTER, getScopeFilterKey, isScopeFilterActive, isScopeFilterReady } from "./dashboardScopeUtils";
import styles from "./DashboardPage.module.css";
const DASHBOARD_TABS = [{
  key: "overview",
  icon: "mdi:view-dashboard-outline"
}, {
  key: "support",
  icon: "mdi:ticket-outline"
}, {
  key: "planning",
  icon: "mdi:calendar-clock-outline"
}, {
  key: "crm",
  icon: "mdi:domain"
}, {
  key: "reports",
  icon: "mdi:file-chart-outline"
}, {
  key: "infrastructure",
  icon: "mdi:server-network-outline"
}];
function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return String(Math.round(Number(value)));
}
function formatHours(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.hours.replace("{value}", String(value));
}
function formatPercent(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.percent.replace("{value}", String(value));
}
function formatRating(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.units.stars.replace("{value}", String(value));
}
function Panel({
  title,
  icon,
  children,
  className = ""
}) {
  return <article className={`${styles.panel} ${className}`.trim()}>
      {title ? <h3 className={styles.panelTitle}>
          {icon ? <Icon icon={icon} aria-hidden /> : null}
          {title}
        </h3> : null}
      {children}
    </article>;
}
function KpiRow({
  items
}) {
  if (!items?.length) return null;
  return <div className={styles.kpiRow}>
      {items.map(item => <div key={item.key} className={styles.kpiCard}>
          {item.icon ? <span className={styles.kpiIconWrap}>
              <Icon icon={item.icon} className={styles.kpiIcon} aria-hidden />
            </span> : null}
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{item.value}</span>
            <span className={styles.kpiLabel}>{item.label}</span>
          </div>
        </div>)}
    </div>;
}
function MiniStat({
  label,
  value
}) {
  return <div className={styles.miniStat}>
      <span className={styles.miniStatValue}>{value}</span>
      <span className={styles.miniStatLabel}>{label}</span>
    </div>;
}
function TrendBars({
  items,
  formatLabel,
  emptyLabel
}) {
  if (!items?.length) {
    return <p className={styles.emptyHint}>{emptyLabel}</p>;
  }
  const max = Math.max(...items.map(item => item.count), 1);
  return <div className={styles.trendBars}>
      {items.map(item => <div key={String(item.period)} className={styles.trendBarCol}>
          <span className={styles.trendBarValue}>{item.count}</span>
          <div className={styles.trendBarTrack}>
            <span className={styles.trendBarFill} style={{
          height: `${Math.max(6, Math.round(item.count / max * 100))}%`
        }} />
          </div>
          <span className={styles.trendBarLabel}>{formatLabel(item.period)}</span>
        </div>)}
    </div>;
}
function AgentRankingTable({
  rows,
  copy
}) {
  if (!rows?.length) {
    return <p className={styles.emptyHint}>{copy.empty}</p>;
  }
  const cols = copy.support.agentColumns;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{cols.agent}</th>
            <th>{cols.assigned}</th>
            <th>{cols.closed}</th>
            <th>{cols.open}</th>
            <th>{cols.resolution}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.userId || row.label}>
              <td>
                <span className={styles.rankBadge}>{index + 1}</span>
                {row.label}
              </td>
              <td>{formatNumber(row.assignedCount)}</td>
              <td>{formatNumber(row.closedCount)}</td>
              <td>{formatNumber(row.openCount)}</td>
              <td>{formatHours(copy, row.avgResolutionHours)}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}
function SatisfactionAgentTable({
  rows,
  copy
}) {
  if (!rows?.length) {
    return <p className={styles.emptyHint}>{copy.empty}</p>;
  }
  const cols = copy.support.agentColumns;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{cols.agent}</th>
            <th>{cols.responses}</th>
            <th>{cols.rating}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.userId || row.label}>
              <td>{row.label}</td>
              <td>{formatNumber(row.responses)}</td>
              <td>{formatRating(copy, row.avgRating)}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}
function DistributionPanel({
  title,
  icon,
  items,
  emptyLabel
}) {
  return <Panel title={title} icon={icon}>
      <DashboardDistributionBars items={items} emptyLabel={emptyLabel} />
    </Panel>;
}
function PiePanel({
  title,
  icon,
  items,
  emptyLabel
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return <Panel title={title} icon={icon}>
      <DashboardPieChart items={items} total={total} emptyLabel={emptyLabel} />
    </Panel>;
}
export default function DashboardPage() {
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const copy = useMemo(() => getDashboardPageCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState("overview");
  const [periodFilter, setPeriodFilter] = useState(DEFAULT_PERIOD_FILTER);
  const [scopeFilter, setScopeFilter] = useState(DEFAULT_SCOPE_FILTER);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [proRequired, setProRequired] = useState(false);
  const [distributionModal, setDistributionModal] = useState(null);
  const periodFilterKey = useMemo(() => JSON.stringify(periodFilter), [periodFilter]);
  const scopeReady = isScopeFilterReady(scopeFilter);
  const scopeFilterKey = useMemo(() => scopeReady ? getScopeFilterKey(scopeFilter) : null, [scopeFilter, scopeReady]);
  const scopeActive = isScopeFilterActive(scopeFilter);
  const loadDashboard = useCallback(async (period, scope, {
    silent = false
  } = {}) => {
    if (!silent) {
      setLoading(true);
      setData(null);
    } else {
      setRefreshing(true);
    }
    setError(null);
    setProRequired(false);
    try {
      const payload = await fetchAnalyticsDashboard(period, scope);
      setData(payload);
    } catch (err) {
      if (err?.code === "PRO_FEATURE_REQUIRED") {
        setProRequired(true);
        setData(null);
      } else {
        setError(err?.message || copy.errorLoad);
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.errorLoad]);
  useEffect(() => {
    if (!scopeReady || scopeFilterKey == null) return;
    loadDashboard(periodFilter, scopeFilter);
  }, [periodFilterKey, scopeFilterKey, scopeReady, loadDashboard, periodFilter, scopeFilter]);
  const handlePeriodApply = useCallback(filter => {
    setPeriodFilter(filter);
  }, []);
  const periodLabel = useMemo(() => getPeriodFilterLabel(periodFilter, copy, formatters), [periodFilter, copy, formatters]);
  const generatedLabel = useMemo(() => {
    if (!data?.generatedAt) return null;
    const generated = formatters.formatDateTime(data.generatedAt);
    let base;
    if (data.since && data.until) {
      base = copy.generatedAtRange.replace("{start}", formatters.formatDateTime(data.since)).replace("{end}", formatters.formatDateTime(data.until)).replace("{date}", generated);
    } else if (data.since) {
      base = copy.generatedAtRange.replace("{start}", formatters.formatDateTime(data.since)).replace("{end}", formatters.formatDateTime(data.generatedAt)).replace("{date}", generated);
    } else {
      base = copy.generatedAt.replace("{date}", generated);
    }
    if (data.filters?.active || scopeActive) {
      return `${base} · ${copy.scopeFilter.filteredBadge}`;
    }
    return base;
  }, [copy.generatedAt, copy.generatedAtRange, copy.scopeFilter.filteredBadge, data, formatters, scopeActive]);
  const formatWeekdayLabel = useCallback(value => {
    const dow = Number(value);
    if (!Number.isFinite(dow) || dow < 1 || dow > 7) return "-";
    const date = new Date(2024, 0, dow);
    const localeTag = locale === "en" ? "en-GB" : locale || "en-US";
    return date.toLocaleDateString(localeTag, {
      weekday: "short"
    });
  }, [locale]);
  const formatYearLabel = useCallback(value => {
    const year = Number(value);
    return Number.isFinite(year) ? String(year) : "-";
  }, []);
  const formatMonthLabel = useCallback(value => {
    if (!value) return "-";
    try {
      const date = new Date(value);
      return formatters.formatMonthYear?.(date) || formatters.formatDate(date);
    } catch {
      return String(value);
    }
  }, [formatters]);
  const openDistributionModal = useCallback(({
    title,
    icon,
    items
  }) => {
    const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    setDistributionModal({
      title,
      icon,
      items,
      subtitle: copy.support.distributionModalSubtitle.replace("{total}", formatNumber(total)).replace("{count}", formatNumber(items.length))
    });
  }, [copy.support.distributionModalSubtitle]);
  const distributions = useMemo(() => {
    if (!data) return {};
    return {
      supportStatus: buildDistributionItems(data.support?.byStatus || []).items,
      supportPriority: buildDistributionItems(data.support?.byPriority || []).items,
      supportType: buildDistributionItems(data.support?.byType || []).items,
      supportCategory: buildDistributionItems(data.support?.byCategory || []).items,
      supportChannel: buildDistributionItems(data.support?.byChannel || []).items,
      planningType: buildDistributionItems(data.planning?.byType || []).items,
      planningAgent: buildDistributionItems((data.planning?.byAgent || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      reportsType: buildDistributionItems(data.reports?.byType || []).items,
      infraFamilies: buildDistributionItems((data.infrastructure?.families || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      topClients: buildDistributionItems((data.support?.topClients || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      topContacts: buildDistributionItems((data.support?.topContacts || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items
    };
  }, [data]);
  const tabKpis = useMemo(() => {
    if (!data) return {};
    const s = data.summary || {};
    return {
      overview: [{
        key: "tickets",
        icon: "mdi:ticket-outline",
        value: formatNumber(s.ticketsCreated),
        label: copy.summary.ticketsCreated
      }, {
        key: "open",
        icon: "mdi:ticket-account",
        value: formatNumber(s.ticketsOpen),
        label: copy.summary.ticketsOpen
      }, {
        key: "response",
        icon: "mdi:timer-outline",
        value: formatHours(copy, s.avgFirstResponseHours),
        label: copy.summary.avgFirstResponse
      }, {
        key: "resolution",
        icon: "mdi:clock-check-outline",
        value: formatHours(copy, s.avgResolutionHours),
        label: copy.summary.avgResolution
      }, {
        key: "events",
        icon: "mdi:calendar-outline",
        value: formatNumber(s.eventsTotal),
        label: copy.summary.eventsTotal
      }, {
        key: "maintenance",
        icon: "mdi:wrench-outline",
        value: formatNumber(s.maintenanceInPeriod ?? s.maintenanceYtd),
        label: copy.summary.maintenancePeriod
      }, {
        key: "clients",
        icon: "mdi:domain",
        value: formatNumber(s.clientsTotal),
        label: copy.summary.clientsTotal
      }, {
        key: "reports",
        icon: "mdi:file-chart-outline",
        value: formatNumber(s.reportsInPeriod),
        label: copy.summary.reportsInPeriod
      }, {
        key: "equip",
        icon: "mdi:server",
        value: formatNumber(s.equipMonitoredTotal),
        label: copy.summary.equipMonitored
      }, {
        key: "sat",
        icon: "mdi:star-outline",
        value: formatRating(copy, s.satisfactionAvg),
        label: copy.summary.satisfactionAvg
      }],
      support: [{
        key: "created",
        icon: "mdi:plus-circle-outline",
        value: formatNumber(data.support?.overview?.created),
        label: copy.support.created
      }, {
        key: "closed",
        icon: "mdi:check-circle-outline",
        value: formatNumber(data.support?.overview?.closed),
        label: copy.support.closed
      }, {
        key: "open",
        icon: "mdi:ticket-outline",
        value: formatNumber(data.support?.overview?.openNow),
        label: copy.support.openNow
      }, {
        key: "closure",
        icon: "mdi:percent-outline",
        value: formatPercent(copy, data.support?.overview?.closureRate),
        label: copy.support.closureRate
      }, {
        key: "response",
        icon: "mdi:timer-outline",
        value: formatHours(copy, data.support?.timing?.avgFirstResponseHours),
        label: copy.support.firstResponse
      }, {
        key: "resolution",
        icon: "mdi:clock-check-outline",
        value: formatHours(copy, data.support?.timing?.avgResolutionHours),
        label: copy.support.resolution
      }],
      planning: [{
        key: "total",
        icon: "mdi:calendar-multiselect",
        value: formatNumber(data.planning?.overview?.total),
        label: copy.planning.total
      }, {
        key: "maint",
        icon: "mdi:cog-outline",
        value: formatNumber(data.planning?.overview?.maintenanceInPeriod),
        label: copy.planning.maintenancePeriod
      }, {
        key: "ytd",
        icon: "mdi:calendar-range",
        value: formatNumber(data.planning?.overview?.maintenanceYtd),
        label: copy.planning.maintenanceYtd
      }, {
        key: "upcoming",
        icon: "mdi:calendar-arrow-right",
        value: formatNumber(data.planning?.overview?.upcoming),
        label: copy.planning.upcoming
      }],
      crm: [{
        key: "clients",
        icon: "mdi:domain",
        value: formatNumber(data.crm?.clientsTotal),
        label: copy.crm.clients
      }, {
        key: "contacts",
        icon: "mdi:account-group-outline",
        value: formatNumber(data.crm?.contactsTotal),
        label: copy.crm.contacts
      }, {
        key: "new",
        icon: "mdi:account-plus-outline",
        value: formatNumber(data.crm?.contactsNew),
        label: copy.crm.contactsNew
      }, {
        key: "expiring",
        icon: "mdi:calendar-alert",
        value: formatNumber(data.crm?.contractsExpiring),
        label: copy.crm.contractsExpiring
      }, {
        key: "expired",
        icon: "mdi:calendar-remove",
        value: formatNumber(data.crm?.contractsExpired),
        label: copy.crm.contractsExpired
      }],
      reports: [{
        key: "total",
        icon: "mdi:file-document-multiple-outline",
        value: formatNumber(data.reports?.total),
        label: copy.reports.total
      }, {
        key: "period",
        icon: "mdi:file-chart-outline",
        value: formatNumber(data.reports?.inPeriod),
        label: copy.reports.inPeriod
      }],
      infrastructure: [{
        key: "equip",
        icon: "mdi:server",
        value: formatNumber(data.infrastructure?.equipMonitoredTotal),
        label: copy.infrastructure.monitored
      }, {
        key: "surv",
        icon: "mdi:radar",
        value: formatPercent(copy, data.infrastructure?.equipSurveillancePercent),
        label: copy.infrastructure.surveillance
      }, {
        key: "rmm",
        icon: "mdi:remote-desktop",
        value: formatNumber(data.infrastructure?.rmmAgents),
        label: copy.infrastructure.rmmAgents
      }, {
        key: "msp",
        icon: "mdi:account-hard-hat",
        value: formatNumber(data.infrastructure?.activeAgents),
        label: copy.infrastructure.mspAgents
      }]
    };
  }, [copy, data]);
  const heroSubtitle = useMemo(() => {
    if (loading && !data) return copy.loading;
    if (generatedLabel) return generatedLabel;
    return copy.subtitle;
  }, [loading, data, generatedLabel, copy.loading, copy.subtitle]);
  const renderTabContent = () => {
    if (!data) return null;
    switch (activeTab) {
      case "overview":
        return <>
            <KpiRow items={tabKpis.overview} />
            <AiBriefingPanel featureKey="dashboardBriefing" cacheKey="dashboard_ai_analytics_briefing" buildPayload={() => ({
            summary: data?.summary || {},
            support: {
              overview: data?.support?.overview,
              timing: data?.support?.timing,
              byStatus: data?.support?.byStatus
            },
            planning: {
              overview: data?.planning?.overview
            },
            crm: data?.crm,
            infrastructure: data?.infrastructure,
            period: {
              since: data?.since,
              until: data?.until
            }
          })} onGenerate={(stats, loc) => generateDashboardBriefingAi({
            stats,
            source: "analytics",
            locale: loc
          })} />
            <div className={styles.grid2}>
              <Panel title={copy.support.weekdayTrend} icon="mdi:chart-bar">
                <TrendBars items={data.support?.weekdayTrend} formatLabel={formatWeekdayLabel} emptyLabel={copy.empty} />
              </Panel>
              <PiePanel title={copy.support.byStatus} icon="mdi:ticket-percent-outline" items={distributions.supportStatus} emptyLabel={copy.empty} />
            </div>
            <div className={styles.grid2}>
              <PiePanel title={copy.planning.byType} icon="mdi:calendar-multiselect" items={distributions.planningType} emptyLabel={copy.empty} />
              <DistributionPanel title={copy.infrastructure.families} icon="mdi:server-network" items={distributions.infraFamilies} emptyLabel={copy.empty} />
            </div>
          </>;
      case "support":
        return <>
            <KpiRow items={tabKpis.support} />
            <div className={styles.grid2}>
              <Panel title={copy.support.weekdayTrend} icon="mdi:chart-bar">
                <p className={styles.panelNote}>
                  {copy.support.withResponse.replace("{count}", formatNumber(data.support?.timing?.ticketsWithFirstResponse))}
                  {" · "}
                  {copy.support.resolvedCount.replace("{count}", formatNumber(data.support?.timing?.resolvedCount))}
                </p>
                <TrendBars items={data.support?.weekdayTrend} formatLabel={formatWeekdayLabel} emptyLabel={copy.empty} />
              </Panel>
              <Panel title={copy.support.yearlyTrend} icon="mdi:chart-timeline-variant">
                <TrendBars items={data.support?.yearlyTrend} formatLabel={formatYearLabel} emptyLabel={copy.empty} />
              </Panel>
            </div>
            <div className={styles.grid2}>
              <PiePanel title={copy.support.byStatus} icon="mdi:ticket-percent-outline" items={distributions.supportStatus} emptyLabel={copy.empty} />
              <DistributionPanel title={copy.support.byChannel} icon="mdi:message-text-outline" items={distributions.supportChannel} emptyLabel={copy.empty} />
            </div>
            <div className={styles.grid2}>
              <DistributionPanel title={copy.support.byPriority} icon="mdi:flag-outline" items={distributions.supportPriority} emptyLabel={copy.empty} />
              <DistributionPanel title={copy.support.byType} icon="mdi:shape-outline" items={distributions.supportType} emptyLabel={copy.empty} />
            </div>
            <div className={styles.grid3}>
              <DashboardTopCard title={copy.support.topCategories} icon="mdi:tag-outline" items={distributions.supportCategory} previewCount={5} emptyLabel={copy.empty} viewAllLabel={copy.support.viewAllStats} othersLabel={copy.support.othersCount.replace("{count}", String(Math.max(0, distributions.supportCategory.length - 5)))} onOpen={() => openDistributionModal({
              title: copy.support.allCategories,
              icon: "mdi:tag-outline",
              items: distributions.supportCategory
            })} />
              <DashboardTopCard title={copy.support.topCompanies} icon="mdi:domain" items={distributions.topClients} previewCount={5} emptyLabel={copy.empty} viewAllLabel={copy.support.viewAllStats} othersLabel={copy.support.othersCount.replace("{count}", String(Math.max(0, distributions.topClients.length - 5)))} onOpen={() => openDistributionModal({
              title: copy.support.allCompanies,
              icon: "mdi:domain",
              items: distributions.topClients
            })} />
              <DashboardTopCard title={copy.support.topContacts} icon="mdi:account-outline" items={distributions.topContacts} previewCount={5} emptyLabel={copy.empty} viewAllLabel={copy.support.viewAllStats} othersLabel={copy.support.othersCount.replace("{count}", String(Math.max(0, distributions.topContacts.length - 5)))} onOpen={() => openDistributionModal({
              title: copy.support.allContacts,
              icon: "mdi:account-outline",
              items: distributions.topContacts
            })} />
            </div>
            <Panel title={copy.support.topAgents} icon="mdi:account-star-outline">
              <AgentRankingTable rows={data.support?.topAgents} copy={copy} />
            </Panel>
            {data.modules?.satisfaction && data.support?.satisfaction ? <div className={styles.grid2}>
                <Panel title={copy.support.satisfaction} icon="mdi:emoticon-happy-outline">
                  <div className={styles.miniStats}>
                    <MiniStat label={copy.support.satisfaction} value={formatRating(copy, data.support.satisfaction.avgRating)} />
                    <MiniStat label={copy.support.csat} value={formatPercent(copy, data.support.satisfaction.csatPercent)} />
                    <MiniStat label={copy.support.detractors} value={formatPercent(copy, data.support.satisfaction.detractorPercent)} />
                    <MiniStat label={copy.support.agentColumns.responses} value={formatNumber(data.support.satisfaction.responses)} />
                  </div>
                </Panel>
                <Panel title={copy.support.satisfactionByAgent} icon="mdi:account-heart-outline">
                  <SatisfactionAgentTable rows={data.support.satisfaction.byAgent} copy={copy} />
                </Panel>
              </div> : null}
          </>;
      case "planning":
        if (!data.modules?.planning) {
          return <p className={styles.emptyHint}>{copy.planning.unavailable}</p>;
        }
        return <>
            <KpiRow items={tabKpis.planning} />
            <div className={styles.grid2}>
              <PiePanel title={copy.planning.byType} icon="mdi:calendar-multiselect" items={distributions.planningType} emptyLabel={copy.empty} />
              <DistributionPanel title={copy.planning.byAgent} icon="mdi:account-hard-hat" items={distributions.planningAgent} emptyLabel={copy.empty} />
            </div>
            <Panel title={copy.planning.monthlyTrend} icon="mdi:chart-timeline-variant">
              <TrendBars items={data.planning?.monthlyTrend} formatLabel={formatMonthLabel} emptyLabel={copy.empty} />
            </Panel>
          </>;
      case "crm":
        return <>
            <KpiRow items={tabKpis.crm} />
            <Panel title={copy.sections.crm} icon="mdi:briefcase-account-outline">
              <div className={styles.miniStats}>
                <MiniStat label={copy.crm.clients} value={formatNumber(data.crm?.clientsTotal)} />
                <MiniStat label={copy.crm.contacts} value={formatNumber(data.crm?.contactsTotal)} />
                <MiniStat label={copy.crm.contactsNew} value={formatNumber(data.crm?.contactsNew)} />
                <MiniStat label={copy.crm.contractsExpiring} value={formatNumber(data.crm?.contractsExpiring)} />
                <MiniStat label={copy.crm.contractsExpired} value={formatNumber(data.crm?.contractsExpired)} />
              </div>
            </Panel>
          </>;
      case "reports":
        if (!data.modules?.reports) {
          return <p className={styles.emptyHint}>{copy.reports.unavailable}</p>;
        }
        return <>
            <KpiRow items={tabKpis.reports} />
            <div className={styles.grid2}>
              <DistributionPanel title={copy.reports.byType} icon="mdi:file-chart-outline" items={distributions.reportsType} emptyLabel={copy.empty} />
              <Panel title={copy.reports.monthlyTrend} icon="mdi:chart-line">
                <TrendBars items={data.reports?.monthlyTrend} formatLabel={formatMonthLabel} emptyLabel={copy.empty} />
              </Panel>
            </div>
          </>;
      case "infrastructure":
        return <>
            {scopeActive ? <p className={styles.scopeHint}>
                <Icon icon="mdi:information-outline" aria-hidden />
                {copy.scopeFilter.infrastructureHint}
              </p> : null}
            <KpiRow items={tabKpis.infrastructure} />
            <div className={styles.grid2}>
              <Panel title={copy.sections.infrastructure} icon="mdi:radar">
                <div className={styles.miniStats}>
                  <MiniStat label={copy.infrastructure.monitored} value={formatNumber(data.infrastructure?.equipMonitoredTotal)} />
                  <MiniStat label={copy.infrastructure.surveillance} value={formatPercent(copy, data.infrastructure?.equipSurveillancePercent)} />
                  <MiniStat label={copy.infrastructure.rmmAgents} value={formatNumber(data.infrastructure?.rmmAgents)} />
                  <MiniStat label={copy.infrastructure.mspAgents} value={formatNumber(data.infrastructure?.activeAgents)} />
                </div>
              </Panel>
              <DistributionPanel title={copy.infrastructure.families} icon="mdi:server-network" items={distributions.infraFamilies} emptyLabel={copy.empty} />
            </div>
          </>;
      default:
        return null;
    }
  };
  return <div className={`${mspStyles.mspPage} ${styles.dashboardPage} msp-page-insight`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={copy.eyebrow} title={copy.title} subtitle={heroSubtitle} icon="mdi:chart-box-outline">
            <div className={styles.heroToolbar}>
              <DashboardScopeFilter copy={copy.scopeFilter} value={scopeFilter} onChange={setScopeFilter} disabled={loading || refreshing} />
              <div className={styles.heroToolbarActions}>
                <button type="button" className={styles.periodOpenBtn} onClick={() => setPeriodModalOpen(true)} aria-label={copy.periodButtonAria}>
                  <Icon icon="mdi:calendar-range" aria-hidden />
                  <span className={styles.periodOpenLabel}>{periodLabel}</span>
                  <Icon icon="mdi:chevron-down" className={styles.periodOpenChevron} aria-hidden />
                </button>
                <SmartTooltip content={copy.refresh}>
                  <button type="button" className={layout.iconBtn} onClick={() => loadDashboard(periodFilter, scopeFilter, {
                  silent: true
                })} disabled={loading || refreshing} aria-label={copy.refresh}>
                    <Icon icon="mdi:refresh" className={refreshing ? styles.spinner : undefined} aria-hidden />
                  </button>
                </SmartTooltip>
              </div>
            </div>
            <div className={styles.heroTabRow}>
              <div className={mspStyles.mspTabBar} role="tablist" aria-label={copy.tabsAria}>
                {DASHBOARD_TABS.map(({
                key,
                icon
              }) => <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`${mspStyles.mspTab} ${activeTab === key ? mspStyles.mspTabActive : ""}`} onClick={() => setActiveTab(key)}>
                    <Icon icon={icon} className={mspStyles.mspTabIcon} aria-hidden />
                    {copy.tabs[key]}
                  </button>)}
              </div>
            </div>
          </MspPageHero>

          <main className={mspStyles.mspContent}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={styles.tabContent} role="tabpanel">
                {loading && <div className={styles.loadingState}>
                    <Icon icon="mdi:loading" className={styles.spinner} aria-hidden />
                    <span>{copy.loading}</span>
                  </div>}

                {proRequired && <div className={styles.proBanner}>
                    <Icon icon="mdi:lock-outline" aria-hidden />
                    <span>{copy.proRequired}</span>
                  </div>}

                {error && !proRequired ? <div className={styles.errorBanner}>
                    <Icon icon="mdi:alert-circle-outline" aria-hidden />
                    <span>{error}</span>
                  </div> : null}

                {!loading && !error && !proRequired && data && <AnimatePresence mode="wait">
                    <motion.div key={`${activeTab}-${periodFilterKey}-${scopeFilterKey}`} className={styles.tabStack} initial={{
                  opacity: 0,
                  y: 6
                }} animate={{
                  opacity: 1,
                  y: 0
                }} exit={{
                  opacity: 0,
                  y: -4
                }} transition={{
                  duration: 0.2
                }}>
                      {renderTabContent()}
                    </motion.div>
                  </AnimatePresence>}
              </div>
            </div>
          </main>
        </div>
      </div>

      <DashboardPeriodModal open={periodModalOpen} copy={copy} initialFilter={periodFilter} onClose={() => setPeriodModalOpen(false)} onApply={handlePeriodApply} />

      <DashboardDistributionModal open={Boolean(distributionModal)} title={distributionModal?.title} icon={distributionModal?.icon} subtitle={distributionModal?.subtitle} items={distributionModal?.items || []} emptyLabel={copy.empty} closeLabel={copy.support.distributionModalClose} onClose={() => setDistributionModal(null)} />
    </div>;
}
