import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { ColumnChart, DistributionPanel, HeroKpi, Panel, TrendBars, deltaTone, formatDelta, formatDuration, formatNumber, formatPercent } from "./dashboardWidgets";
import { buildDistributionItems } from "./DashboardCharts";
import styles from "./DashboardPage.module.css";

const NAV = [{
  key: "overview",
  icon: "mdi:home-outline"
}, {
  key: "tickets",
  icon: "mdi:ticket-outline"
}, {
  key: "team",
  icon: "mdi:account-hard-hat"
}, {
  key: "clients",
  icon: "mdi:domain"
}, {
  key: "analysis",
  icon: "mdi:chart-box-outline"
}];
const VOLUME_TABS = ["day", "week", "month", "year"];

function formatTrendLabel(period) {
  if (!period) return "";
  const value = String(period);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short"
      });
    }
  }
  return value;
}

function toColumnItems(rows, labelFor) {
  return (rows || []).map(row => ({
    key: String(row.period),
    label: labelFor(row.period),
    value: Number(row.count) || 0
  }));
}

function DualTrend({
  items,
  createdLabel,
  resolvedLabel,
  emptyLabel
}) {
  if (!items?.length) return <p className={styles.emptyHint}>{emptyLabel}</p>;
  const max = Math.max(...items.flatMap(item => [item.created, item.resolved]), 1);
  return <div className={styles.dualTrend}>
      <div className={styles.dualTrendLegend}>
        <span><i className={styles.dualSwatchCreated} />{createdLabel}</span>
        <span><i className={styles.dualSwatchResolved} />{resolvedLabel}</span>
      </div>
      <div className={styles.dualTrendBars}>
        {items.map(item => <div key={String(item.period)} className={styles.dualTrendCol}>
            <div className={styles.dualTrendPair}>
              <span className={styles.dualBarCreated} style={{
              height: `${Math.max(6, Math.round(item.created / max * 100))}%`
            }} title={`${createdLabel}: ${item.created}`} />
              <span className={styles.dualBarResolved} style={{
              height: `${Math.max(6, Math.round(item.resolved / max * 100))}%`
            }} title={`${resolvedLabel}: ${item.resolved}`} />
            </div>
            <span className={styles.trendBarLabel}>{formatTrendLabel(item.period)}</span>
          </div>)}
      </div>
    </div>;
}

function TimingStrip({
  title,
  icon,
  copy,
  stats
}) {
  const items = [{
    key: "median",
    label: copy.median,
    value: formatDuration(copy, stats?.median)
  }, {
    key: "avg",
    label: copy.average,
    value: formatDuration(copy, stats?.avg)
  }, {
    key: "p90",
    label: copy.p90,
    value: formatDuration(copy, stats?.p90)
  }, stats?.p95 != null ? {
    key: "p95",
    label: copy.p95,
    value: formatDuration(copy, stats?.p95)
  } : null].filter(Boolean);
  return <Panel title={title} icon={icon}>
      <div className={styles.timingStrip}>
        {items.map(item => <div key={item.key} className={styles.timingCell}>
            <span className={styles.timingValue}>{item.value}</span>
            <span className={styles.timingLabel}>{item.label}</span>
          </div>)}
      </div>
    </Panel>;
}

function DataTable({
  columns,
  rows,
  emptyLabel
}) {
  if (!rows?.length) return <p className={styles.emptyHint}>{emptyLabel}</p>;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {columns.map(col => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.id}>
              {columns.map(col => <td key={col.key} className={col.warn && col.warn(row) ? styles.cellWarn : undefined}>
                  {col.render(row)}
                </td>)}
            </tr>)}
        </tbody>
      </table>
    </div>;
}

export default function DashboardSupportCockpit({
  data,
  copy,
  locale
}) {
  const [view, setView] = useState("overview");
  const [volumeTab, setVolumeTab] = useState("day");
  const cockpitCopy = copy.supportCockpit;
  const cockpit = data?.support?.cockpit || {};
  const volume = cockpit.volume || {};
  const backlog = volume.backlog || {};
  const timing = cockpit.timing || {};
  const sla = cockpit.sla || {};
  const deltas = cockpit.deltas || {};
  const createdResolved = volume.createdResolved || [];
  const lastPair = createdResolved[createdResolved.length - 1];
  const net = (lastPair?.created || 0) - (lastPair?.resolved || 0);
  const categoryItems = useMemo(() => buildDistributionItems((cockpit.categories || []).map(row => ({
    name: row.label,
    count: row.count
  }))).items, [cockpit.categories]);
  const volumeChartItems = useMemo(() => {
    if (volumeTab === "day") {
      return toColumnItems(volume.weekdayCreated, day => cockpitCopy.weekdays?.[day] || String(day));
    }
    if (volumeTab === "week") {
      return toColumnItems(volume.weeklyCreated, formatTrendLabel);
    }
    if (volumeTab === "month") {
      return toColumnItems(volume.monthOfYearCreated, month => cockpitCopy.months?.[month] || String(month));
    }
    return toColumnItems(volume.yearlyCreated, year => String(year));
  }, [volumeTab, volume.weekdayCreated, volume.weeklyCreated, volume.monthOfYearCreated, volume.yearlyCreated, cockpitCopy.weekdays, cockpitCopy.months]);
  const overview = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-confirmation-outline" value={formatNumber(volume.created)} label={cockpitCopy.kpis.created} hint={cockpitCopy.hints.created} delta={deltas.createdPct} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:check-circle-outline" value={formatNumber(volume.closed)} label={cockpitCopy.kpis.resolved} hint={cockpitCopy.hints.resolved} delta={deltas.closedPct} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:folder-open-outline" value={formatNumber(data.support?.overview?.openNow)} label={cockpitCopy.kpis.open} hint={cockpitCopy.hints.open} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:timer-outline" value={formatDuration(copy, timing.resolution?.avg)} label={cockpitCopy.kpis.resolution} hint={cockpitCopy.hints.resolution} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:flash-outline" value={formatDuration(copy, timing.firstResponse?.median || timing.firstResponse?.avg)} label={cockpitCopy.kpis.firstResponse} hint={cockpitCopy.hints.firstResponse} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-check-outline" value={formatPercent(copy, sla.metPct)} label={cockpitCopy.kpis.slaMet} hint={cockpitCopy.hints.slaMet} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-alert-outline" value={formatNumber(sla.breachedCount)} label={cockpitCopy.kpis.slaBreached} hint={cockpitCopy.hints.slaBreached} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:reload" value={formatNumber(volume.reopened)} label={cockpitCopy.kpis.reopened} hint={cockpitCopy.hints.reopened} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:account-group-outline" value={volume.ticketsPerTechnician != null ? String(volume.ticketsPerTechnician) : copy.units.none} label={cockpitCopy.kpis.perTech} hint={cockpitCopy.hints.perTech} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-clock-outline" value={backlog.avgAgeDays != null ? cockpitCopy.days.replace("{value}", String(backlog.avgAgeDays)) : copy.units.none} label={cockpitCopy.kpis.backlogAge} hint={cockpitCopy.hints.backlogAge} help invert locale={locale} />
      </div>
      <div className={styles.grid2}>
        <TimingStrip title={cockpitCopy.firstResponseTitle} icon="mdi:flash-outline" copy={{
        ...copy,
        ...cockpitCopy
      }} stats={timing.firstResponse} />
        <TimingStrip title={cockpitCopy.resolutionTitle} icon="mdi:clock-check-outline" copy={{
        ...copy,
        ...cockpitCopy
      }} stats={timing.resolution} />
      </div>
    </>;

  const tickets = <>
      <div className={styles.followGrid}>
        {[{
        label: cockpitCopy.createdPerDay,
        value: formatNumber(volume.createdPerDay)
      }, {
        label: cockpitCopy.createdPerWeek,
        value: formatNumber(volume.createdPerWeek)
      }, {
        label: cockpitCopy.createdPerMonth,
        value: formatNumber(volume.createdPerMonth)
      }, {
        label: cockpitCopy.kpis.resolved,
        value: formatNumber(volume.closed)
      }, {
        label: cockpitCopy.cancelled,
        value: formatNumber(volume.cancelled)
      }, {
        label: cockpitCopy.transferred,
        value: formatNumber(volume.transferred)
      }, {
        label: cockpitCopy.reopened,
        value: formatNumber(volume.reopened)
      }, {
        label: cockpitCopy.backlogNow,
        value: formatNumber(backlog.total)
      }, {
        label: cockpitCopy.backlog7,
        value: formatNumber(backlog.over7)
      }, {
        label: cockpitCopy.backlog30,
        value: formatNumber(backlog.over30)
      }, {
        label: cockpitCopy.backlog90,
        value: formatNumber(backlog.over90)
      }].map(item => <div key={item.label} className={styles.followCard}>
            <span className={styles.followValue}>{item.value}</span>
            <span className={styles.followLabel}>{item.label}</span>
          </div>)}
      </div>
      <Panel title={cockpitCopy.volumeByPeriodTitle} icon="mdi:chart-bar" headerExtra={<div className={styles.chartTabs} role="tablist" aria-label={cockpitCopy.volumeByPeriodTitle}>
          {VOLUME_TABS.map(tab => <button key={tab} type="button" role="tab" aria-selected={volumeTab === tab} className={`${styles.chartTab} ${volumeTab === tab ? styles.chartTabActive : ""}`} onClick={() => setVolumeTab(tab)}>
              {cockpitCopy.volumeTabs?.[tab] || tab}
            </button>)}
        </div>}>
        <ColumnChart emptyLabel={copy.empty} formatValue={formatNumber} items={volumeChartItems} />
      </Panel>
      <Panel title={cockpitCopy.evolutionTitle} icon="mdi:chart-timeline-variant">
        <TrendBars items={volume.weeklyCreated?.length > 1 ? volume.weeklyCreated : volume.dailyCreated} formatLabel={formatTrendLabel} emptyLabel={copy.empty} />
      </Panel>
      <Panel title={cockpitCopy.createdVsResolved} icon="mdi:swap-vertical" note={cockpitCopy.createdVsResolvedNote} className={styles.panelWide}>
        <DualTrend items={createdResolved} createdLabel={cockpitCopy.createdSeries} resolvedLabel={cockpitCopy.resolvedSeries} emptyLabel={copy.empty} />
        {lastPair ? <p className={styles.netBacklogNote}>
            {cockpitCopy.netBacklog.replace("{value}", `${net > 0 ? "+" : ""}${net}`)}
          </p> : null}
      </Panel>
    </>;

  const team = <>
      <Panel title={cockpitCopy.teamTitle} icon="mdi:account-hard-hat" note={cockpitCopy.teamNote}>
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "agent",
        label: cockpitCopy.teamCols.agent,
        render: row => row.label
      }, {
        key: "open",
        label: cockpitCopy.teamCols.open,
        render: row => formatNumber(row.openCount)
      }, {
        key: "resolved",
        label: cockpitCopy.teamCols.resolved,
        render: row => formatNumber(row.closedCount)
      }, {
        key: "assigned",
        label: cockpitCopy.teamCols.assigned,
        render: row => formatNumber(row.assignedCount)
      }, {
        key: "sla",
        label: cockpitCopy.teamCols.sla,
        render: row => formatPercent(copy, row.slaMetPct),
        warn: row => row.slaMetPct != null && row.slaMetPct < 95
      }, {
        key: "median",
        label: cockpitCopy.teamCols.median,
        render: row => formatDuration(copy, row.medianResolutionHours)
      }, {
        key: "fr",
        label: cockpitCopy.teamCols.firstResponse,
        render: row => formatDuration(copy, row.avgFirstResponseHours)
      }]} rows={(cockpit.agents || []).map(row => ({
        ...row,
        id: row.userId
      }))} />
      </Panel>
      <div className={styles.grid2}>
        <TimingStrip title={cockpitCopy.firstResponseTitle} icon="mdi:flash-outline" copy={{
        ...copy,
        ...cockpitCopy
      }} stats={timing.firstResponse} />
        <Panel title={cockpitCopy.slaTitle} icon="mdi:shield-check-outline">
          <div className={styles.timingStrip}>
            <div className={styles.timingCell}>
              <span className={styles.timingValue}>{formatPercent(copy, sla.metPct)}</span>
              <span className={styles.timingLabel}>{cockpitCopy.slaMet}</span>
            </div>
            <div className={styles.timingCell}>
              <span className={styles.timingValue}>{formatNumber(sla.breachedCount)}</span>
              <span className={styles.timingLabel}>{cockpitCopy.kpis.slaBreached}</span>
            </div>
          </div>
        </Panel>
      </div>
    </>;

  const clients = <Panel title={cockpitCopy.clientsTitle} icon="mdi:domain">
      <DataTable emptyLabel={copy.empty} columns={[{
      key: "client",
      label: cockpitCopy.clientCols.client,
      render: row => row.label
    }, {
      key: "tickets",
      label: cockpitCopy.clientCols.tickets,
      render: row => formatNumber(row.tickets)
    }, {
      key: "evol",
      label: cockpitCopy.clientCols.evolution,
      render: row => formatDelta(row.evolutionPct, locale) || copy.units.none,
      warn: row => Number(row.evolutionPct) >= 30
    }, {
      key: "sla",
      label: cockpitCopy.clientCols.sla,
      render: row => formatPercent(copy, row.slaMetPct),
      warn: row => row.slaMetPct != null && row.slaMetPct < 95
    }, {
      key: "backlog",
      label: cockpitCopy.clientCols.backlog,
      render: row => formatNumber(row.backlog)
    }, {
      key: "critical",
      label: cockpitCopy.clientCols.critical,
      render: row => formatNumber(row.critical)
    }, {
      key: "over7",
      label: cockpitCopy.clientCols.over7,
      render: row => formatNumber(row.over7)
    }]} rows={(cockpit.clients || []).map(row => ({
      ...row,
      id: row.clientId
    }))} />
    </Panel>;

  const analysis = <>
      <div className={styles.grid2}>
        <DistributionPanel title={cockpitCopy.categoriesTitle} icon="mdi:tag-outline" items={categoryItems} emptyLabel={copy.empty} />
        <Panel title={cockpitCopy.reopenTitle} icon="mdi:reload">
          <div className={styles.timingStrip}>
            <div className={styles.timingCell}>
              <span className={styles.timingValue}>{formatPercent(copy, volume.reopenRate)}</span>
              <span className={styles.timingLabel}>{cockpitCopy.reopenRate}</span>
            </div>
            <div className={styles.timingCell}>
              <span className={styles.timingValue}>{formatNumber(volume.reopened)}</span>
              <span className={styles.timingLabel}>{cockpitCopy.reopened}</span>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title={cockpitCopy.motivesTitle} icon="mdi:lightbulb-on-outline">
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "motive",
        label: cockpitCopy.motiveCols.motive,
        render: row => row.label
      }, {
        key: "count",
        label: cockpitCopy.motiveCols.count,
        render: row => formatNumber(row.count)
      }, {
        key: "share",
        label: cockpitCopy.motiveCols.share,
        render: row => formatPercent(copy, row.sharePct)
      }, {
        key: "resolution",
        label: cockpitCopy.motiveCols.resolution,
        render: row => formatDuration(copy, row.avgResolutionHours)
      }, {
        key: "reopen",
        label: cockpitCopy.motiveCols.reopen,
        render: row => formatPercent(copy, row.reopenRate),
        warn: row => row.reopenRate >= 10
      }]} rows={(cockpit.categories || []).map(row => ({
        ...row,
        id: row.key
      }))} />
      </Panel>
      <Panel title={cockpitCopy.trendsTitle} icon="mdi:chart-line">
        <div className={styles.followGrid}>
          <div className={styles.followCard}>
            <span className={`${styles.followValue} ${deltaTone(deltas.createdPct)}`.trim()}>{formatDelta(deltas.createdPct, locale) || copy.units.none}</span>
            <span className={styles.followLabel}>{cockpitCopy.kpis.created}</span>
          </div>
          <div className={styles.followCard}>
            <span className={styles.followValue}>{formatNumber(backlog.total)}</span>
            <span className={styles.followLabel}>{cockpitCopy.backlogNow}</span>
          </div>
          <div className={styles.followCard}>
            <span className={styles.followValue}>{formatPercent(copy, sla.metPct)}</span>
            <span className={styles.followLabel}>{cockpitCopy.slaMet}</span>
          </div>
          <div className={styles.followCard}>
            <span className={styles.followValue}>{formatDuration(copy, timing.resolution?.median || timing.resolution?.avg)}</span>
            <span className={styles.followLabel}>{cockpitCopy.kpis.resolution}</span>
          </div>
          <div className={styles.followCard}>
            <span className={styles.followValue}>{formatPercent(copy, volume.reopenRate)}</span>
            <span className={styles.followLabel}>{cockpitCopy.reopenRate}</span>
          </div>
        </div>
      </Panel>
      <Panel title={cockpitCopy.slaByPriority} icon="mdi:flag-outline">
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "priority",
        label: cockpitCopy.slaColPriority,
        render: row => row.label
      }, {
        key: "target",
        label: cockpitCopy.slaColTarget,
        render: row => formatDuration(copy, row.targetHours)
      }, {
        key: "met",
        label: cockpitCopy.slaColMet,
        render: row => formatPercent(copy, row.metPct)
      }]} rows={(sla.byPriority || []).map(row => ({
        ...row,
        id: row.key
      }))} />
      </Panel>
      {sla.topBreachedClients?.length ? <Panel title={cockpitCopy.topSlaClients} icon="mdi:domain">
          <DataTable emptyLabel={copy.empty} columns={[{
        key: "client",
        label: cockpitCopy.clientCols.client,
        render: row => row.label
      }, {
        key: "breached",
        label: cockpitCopy.kpis.slaBreached,
        render: row => formatNumber(row.breached)
      }, {
        key: "sla",
        label: cockpitCopy.clientCols.tickets,
        render: row => formatNumber(row.slaCount)
      }]} rows={sla.topBreachedClients.map(row => ({
        ...row,
        id: row.clientId
      }))} />
        </Panel> : null}
    </>;

  const views = {
    overview,
    tickets,
    team,
    clients,
    analysis
  };

  return <div className={styles.cockpitLayout}>
      <aside className={styles.cockpitNav} aria-label={cockpitCopy.navAria}>
        {NAV.map(item => <button key={item.key} type="button" className={`${styles.cockpitNavItem} ${view === item.key ? styles.cockpitNavItemActive : ""}`} onClick={() => setView(item.key)}>
            <Icon icon={item.icon} aria-hidden />
            {cockpitCopy.nav[item.key]}
          </button>)}
      </aside>
      <div className={styles.cockpitMain}>
        {views[view]}
      </div>
    </div>;
}
