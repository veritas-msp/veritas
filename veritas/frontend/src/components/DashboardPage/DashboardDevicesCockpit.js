import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { DistributionPanel, HeroKpi, Panel, PiePanel, TrendBars, formatDelta, formatNumber, formatPercent } from "./dashboardWidgets";
import { buildDistributionItems } from "./DashboardCharts";
import styles from "./DashboardPage.module.css";

const NAV = [{
  key: "overview",
  icon: "mdi:view-dashboard-outline"
}, {
  key: "network",
  icon: "mdi:lan"
}, {
  key: "systems",
  icon: "mdi:server"
}, {
  key: "peripherals",
  icon: "mdi:devices"
}, {
  key: "lifecycle",
  icon: "mdi:shield-alert-outline"
}];

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

function FollowCards({
  items
}) {
  return <div className={styles.followGrid}>
      {items.map(item => <div key={item.label} className={styles.followCard}>
          <span className={styles.followValue}>{item.value}</span>
          <span className={styles.followLabel}>{item.label}</span>
        </div>)}
    </div>;
}

function StatusRing({
  ring,
  labels,
  emptyLabel
}) {
  const slices = [{
    key: "ok",
    count: Number(ring?.ok) || 0,
    color: "#16a34a",
    label: labels.ok
  }, {
    key: "warning",
    count: Number(ring?.warning) || 0,
    color: "#f59e0b",
    label: labels.warning
  }, {
    key: "critical",
    count: Number(ring?.critical) || 0,
    color: "#dc2626",
    label: labels.critical
  }, {
    key: "offline",
    count: Number(ring?.offline) || 0,
    color: "#64748b",
    label: labels.offline
  }];
  const total = slices.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <p className={styles.emptyHint}>{emptyLabel}</p>;
  let cursor = 0;
  const gradient = slices.filter(item => item.count > 0).map(item => {
    const start = cursor * 100;
    cursor += item.count / total;
    const end = cursor * 100;
    return `${item.color} ${start}% ${end}%`;
  }).join(", ");
  return <div className={styles.statusRing}>
      <div className={styles.statusRingChart} style={{
      background: `conic-gradient(${gradient})`
    }} role="img" aria-label={labels.title} />
      <ul className={styles.statusRingLegend}>
        {slices.map(item => <li key={item.key}>
            <i style={{
          background: item.color
        }} />
            <span>{item.label}</span>
            <strong>{formatNumber(item.count)}</strong>
          </li>)}
      </ul>
    </div>;
}

function toDist(rows, nameKey = "label", valueKey = "value") {
  return buildDistributionItems((rows || []).map(row => ({
    name: row[nameKey] || row.name || row.label || row.key,
    count: Number(row[valueKey] ?? row.count) || 0
  }))).items;
}

function toTrend(rows) {
  return (rows || []).map(row => ({
    period: row.date || row.period,
    count: Number(row.value ?? row.count) || 0
  }));
}

function formatGb(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  const n = Number(value);
  if (Math.abs(n) >= 1024) {
    return copy.devicesCockpit.tb.replace("{value}", String(Math.round(n / 1024 * 10) / 10));
  }
  return copy.devicesCockpit.gb.replace("{value}", String(Math.round(n)));
}

function formatYears(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.devicesCockpit.years.replace("{value}", String(value));
}

export default function DashboardDevicesCockpit({
  data,
  copy,
  locale,
  scopeHint
}) {
  const [view, setView] = useState("overview");
  const t = copy.devicesCockpit;
  const cockpit = data?.devices?.cockpit || {};
  const overview = cockpit.overview || {};
  const network = cockpit.network || {};
  const systems = cockpit.systems || {};
  const peripherals = cockpit.peripherals || {};
  const lifecycle = cockpit.lifecycle || {};
  const renewal = cockpit.renewalHorizon || {};

  const typeItems = useMemo(() => toDist(cockpit.byType || overview.byType), [cockpit.byType, overview.byType]);
  const techItems = useMemo(() => toDist(cockpit.internetTech), [cockpit.internetTech]);
  const vendorItems = useMemo(() => toDist(cockpit.eolByVendor), [cockpit.eolByVendor]);
  const ageItems = useMemo(() => toDist(cockpit.ageBuckets), [cockpit.ageBuckets]);
  const periphTypeItems = useMemo(() => toDist(cockpit.peripheralByType), [cockpit.peripheralByType]);
  const physVirtItems = useMemo(() => buildDistributionItems([{
    name: t.physical,
    count: Number(cockpit.physicalVsVirtual?.physical) || 0
  }, {
    name: t.virtual,
    count: Number(cockpit.physicalVsVirtual?.virtual) || 0
  }]).items, [cockpit.physicalVsVirtual, t.physical, t.virtual]);
  const storageItems = useMemo(() => toDist(cockpit.storageCapacity), [cockpit.storageCapacity]);
  const backupItems = useMemo(() => buildDistributionItems([{
    name: t.backupOk,
    count: Number(cockpit.backupStatus?.ok) || 0
  }, {
    name: t.backupFailed,
    count: Number(cockpit.backupStatus?.failed) || 0
  }, {
    name: t.backupUnknown,
    count: Number(cockpit.backupStatus?.unknown) || 0
  }]).items, [cockpit.backupStatus, t.backupOk, t.backupFailed, t.backupUnknown]);

  const overviewView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:devices" value={formatNumber(overview.fleetTotal)} label={t.kpis.fleetTotal} hint={t.hints.fleetTotal} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:check-network-outline" value={formatNumber(overview.active)} label={t.kpis.active} hint={t.hints.active} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:lan-disconnect" value={formatNumber(overview.offline)} label={t.kpis.offline} hint={t.hints.offline} invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-circle-outline" value={formatNumber(overview.anomaly)} label={t.kpis.anomaly} hint={t.hints.anomaly} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-off-outline" value={formatNumber(overview.unsupervised)} label={t.kpis.unsupervised} hint={t.hints.unsupervised} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:heart-pulse" value={formatPercent(copy, overview.healthScore)} label={t.kpis.healthScore} hint={t.hints.healthScore} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:chart-timeline-variant" value={formatPercent(copy, overview.availability)} label={t.kpis.availability} hint={t.hints.availability} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:office-building-alert-outline" value={formatNumber(overview.sitesAtRisk)} label={t.kpis.sitesAtRisk} hint={t.hints.sitesAtRisk} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:plus-minus-variant" value={formatDelta(overview.fleetDelta, locale, true) || copy.units.none} label={t.kpis.fleetDelta} hint={t.hints.fleetDelta} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shape-outline" value={formatNumber((cockpit.byType || []).length)} label={t.kpis.byType} hint={t.hints.byType} locale={locale} />
      </div>
      <div className={styles.grid2}>
        <Panel title={t.healthRingTitle} icon="mdi:circle-slice-8">
          <StatusRing ring={cockpit.healthRing} labels={t.status} emptyLabel={copy.empty} />
        </Panel>
        <DistributionPanel title={t.byTypeTitle} icon="mdi:server-network" items={typeItems} emptyLabel={copy.empty} />
      </div>
      <div className={styles.grid2}>
        <Panel title={t.healthTrendTitle} icon="mdi:chart-line" note={t.healthTrendNote}>
          <TrendBars items={toTrend(cockpit.healthTrend)} emptyLabel={copy.empty} />
        </Panel>
        <Panel title={t.clientsAtRiskTitle} icon="mdi:domain">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "client",
          label: t.cols.client,
          render: row => row.name
        }, {
          key: "score",
          label: t.cols.risk,
          warn: row => row.score >= 3,
          render: row => formatNumber(row.score)
        }]} rows={(cockpit.clientsAtRisk || []).map(row => ({
          ...row,
          id: row.id
        }))} />
        </Panel>
      </div>
    </>;

  const networkView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:web" value={formatNumber(network.internet)} label={t.kpis.internet} hint={t.hints.internet} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:wifi-check" value={formatPercent(copy, network.internetAvailability)} label={t.kpis.internetAvailability} hint={t.hints.internetAvailability} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-decagram-outline" value={formatNumber(network.networkIncidents)} label={t.kpis.networkIncidents} hint={t.hints.networkIncidents} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:router" value={formatNumber(network.routers)} label={t.kpis.routers} hint={t.hints.routers} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-outline" value={formatNumber(network.firewalls)} label={t.kpis.firewalls} hint={t.hints.firewalls} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:lan-connect" value={formatNumber(network.switches)} label={t.kpis.switches} hint={t.hints.switches} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:wifi" value={formatNumber(network.wifi)} label={t.kpis.wifi} hint={t.hints.wifi} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:lan-disconnect" value={formatNumber(network.offline)} label={t.kpis.networkOffline} hint={t.hints.networkOffline} invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:source-branch-remove" value={formatNumber(network.sitesWithoutRedundancy)} label={t.kpis.noRedundancy} hint={t.hints.noRedundancy} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:timer-outline" value={network.avgLatencyMs != null ? t.ms.replace("{value}", String(network.avgLatencyMs)) : copy.units.none} label={t.kpis.latency} hint={t.hints.latency} help invert locale={locale} />
      </div>
      <div className={styles.grid2}>
        <Panel title={t.internetByClientTitle} icon="mdi:domain">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "client",
          label: t.cols.client,
          render: row => row.name
        }, {
          key: "availability",
          label: t.kpis.internetAvailability,
          warn: row => row.value != null && row.value < 99,
          render: row => formatPercent(copy, row.value)
        }]} rows={(cockpit.internetAvailabilityByClient || []).map(row => ({
          ...row,
          id: row.id
        }))} />
        </Panel>
        <Panel title={t.networkStatusTitle} icon="mdi:lan">
          <StatusRing ring={cockpit.networkStatus} labels={t.status} emptyLabel={copy.empty} />
        </Panel>
      </div>
      <div className={styles.grid2}>
        <Panel title={t.sitesWithIssuesTitle} icon="mdi:office-building-marker-outline">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "client",
          label: t.cols.client,
          render: row => row.name
        }, {
          key: "issues",
          label: t.cols.issues,
          warn: () => true,
          render: row => formatNumber(row.value)
        }]} rows={(cockpit.sitesWithIssues || []).map((row, index) => ({
          ...row,
          id: row.id || String(index)
        }))} />
        </Panel>
        <Panel title={t.networkIncidentTitle} icon="mdi:chart-bar">
          <TrendBars items={toTrend(cockpit.networkIncidentTrend)} emptyLabel={copy.empty} />
        </Panel>
      </div>
      <DistributionPanel title={t.internetTechTitle} icon="mdi:access-point-network" items={techItems} emptyLabel={copy.empty} />
    </>;

  const systemsView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:server" value={formatNumber(systems.physicalServers)} label={t.kpis.physicalServers} hint={t.hints.physicalServers} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:cloud-outline" value={formatNumber(systems.vms)} label={t.kpis.vms} hint={t.hints.vms} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:layers-outline" value={formatNumber(systems.hypervisors)} label={t.kpis.hypervisors} hint={t.hints.hypervisors} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:nas" value={formatNumber(systems.nasSan)} label={t.kpis.nasSan} hint={t.hints.nasSan} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:database" value={formatGb(copy, systems.capacityTotalGb)} label={t.kpis.capacityTotal} hint={t.hints.capacityTotal} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:database-arrow-up-outline" value={formatGb(copy, systems.capacityUsedGb)} label={t.kpis.capacityUsed} hint={t.hints.capacityUsed} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:gauge-full" value={formatNumber(systems.storageOver80)} label={t.kpis.storageOver80} hint={t.hints.storageOver80} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:harddisk-remove" value={formatNumber(systems.raidDegraded)} label={t.kpis.raidDegraded} hint={t.hints.raidDegraded} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:backup-restore" value={formatNumber(systems.backupsOk)} label={t.kpis.backupsOk} hint={t.hints.backupsOk} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:backup-off" value={formatNumber(systems.backupsFailed)} label={t.kpis.backupsFailed} hint={t.hints.backupsFailed} help invert locale={locale} />
      </div>
      <div className={styles.followGrid} style={{
      marginBottom: "0.85rem"
    }}>
        <div className={styles.followCard}>
          <span className={styles.followValue}>{formatNumber(systems.serversAnomaly)}</span>
          <span className={styles.followLabel}>{t.kpis.serversAnomaly}</span>
        </div>
        <div className={styles.followCard}>
          <span className={styles.followValue}>{formatNumber(systems.serversEol)}</span>
          <span className={styles.followLabel}>{t.kpis.serversEol}</span>
        </div>
        <div className={styles.followCard}>
          <span className={styles.followValue}>{cockpit.cpuRam?.cpuAvg != null ? formatPercent(copy, cockpit.cpuRam.cpuAvg) : copy.units.none}</span>
          <span className={styles.followLabel}>{t.cpuAvg}</span>
        </div>
        <div className={styles.followCard}>
          <span className={styles.followValue}>{cockpit.cpuRam?.ramAvg != null ? formatPercent(copy, cockpit.cpuRam.ramAvg) : copy.units.none}</span>
          <span className={styles.followLabel}>{t.ramAvg}</span>
        </div>
      </div>
      <div className={styles.grid2}>
        <PiePanel title={t.physVirtTitle} icon="mdi:server-network" items={physVirtItems} emptyLabel={copy.empty} />
        <DistributionPanel title={t.storageTitle} icon="mdi:database-outline" items={storageItems} emptyLabel={copy.empty} />
      </div>
      <div className={styles.grid2}>
        <PiePanel title={t.backupTitle} icon="mdi:backup-restore" items={backupItems} emptyLabel={copy.empty} />
        <Panel title={t.infraAtRiskTitle} icon="mdi:alert-octagon-outline">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "client",
          label: t.cols.client,
          render: row => row.name
        }, {
          key: "score",
          label: t.cols.risk,
          warn: row => row.score >= 3,
          render: row => formatNumber(row.score)
        }]} rows={(cockpit.infraAtRisk || []).map(row => ({
          ...row,
          id: row.id
        }))} />
        </Panel>
      </div>
    </>;

  const peripheralsView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:laptop" value={formatNumber(peripherals.computers)} label={t.kpis.computers} hint={t.hints.computers} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:printer" value={formatNumber(peripherals.printers)} label={t.kpis.printers} hint={t.hints.printers} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:projector" value={formatNumber(peripherals.projectors)} label={t.kpis.projectors} hint={t.hints.projectors} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:monitor" value={formatNumber(peripherals.screens)} label={t.kpis.screens} hint={t.hints.screens} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:power-socket" value={formatNumber(peripherals.pdus)} label={t.kpis.pdus} hint={t.hints.pdus} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:battery-charging" value={formatNumber(peripherals.ups)} label={t.kpis.ups} hint={t.hints.ups} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:television" value={formatNumber(peripherals.av)} label={t.kpis.av} hint={t.hints.av} locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:lan-disconnect" value={formatNumber(peripherals.offline)} label={t.kpis.periphOffline} hint={t.hints.periphOffline} invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-circle-outline" value={formatNumber(peripherals.anomaly)} label={t.kpis.periphAnomaly} hint={t.hints.periphAnomaly} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-clock" value={formatYears(copy, peripherals.avgAgeYears)} label={t.kpis.avgAge} hint={t.hints.avgAge} help invert locale={locale} />
      </div>
      <div className={styles.grid2}>
        <DistributionPanel title={t.periphByTypeTitle} icon="mdi:shape-outline" items={periphTypeItems} emptyLabel={copy.empty} />
        <Panel title={t.periphStatusTitle} icon="mdi:circle-slice-4">
          <StatusRing ring={cockpit.peripheralStatus} labels={t.status} emptyLabel={copy.empty} />
        </Panel>
      </div>
      <div className={styles.grid2}>
        <DistributionPanel title={t.ageTitle} icon="mdi:clock-outline" items={ageItems} emptyLabel={copy.empty} />
        <Panel title={t.fleetTrendTitle} icon="mdi:chart-timeline-variant">
          <TrendBars items={toTrend(cockpit.fleetTrend)} emptyLabel={copy.empty} />
        </Panel>
      </div>
      <Panel title={t.topAnomalyTitle} icon="mdi:alert-outline">
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "name",
        label: t.cols.equipment,
        render: row => row.name
      }, {
        key: "value",
        label: t.cols.issues,
        warn: () => true,
        render: row => formatNumber(row.value)
      }]} rows={(cockpit.topAnomalyEquipment || []).map((row, index) => ({
        ...row,
        id: row.id || String(index)
      }))} />
      </Panel>
    </>;

  const lifecycleView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:heart-pulse" value={formatPercent(copy, lifecycle.healthScore)} label={t.kpis.healthScore} hint={t.hints.healthScore} help locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-remove" value={formatNumber(lifecycle.eol)} label={t.kpis.eol} hint={t.hints.eol} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-end" value={formatNumber(lifecycle.eos)} label={t.kpis.eos} hint={t.hints.eos} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-off-outline" value={formatNumber(lifecycle.warrantyExpired)} label={t.kpis.warrantyExpired} hint={t.hints.warrantyExpired} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-alert-outline" value={formatNumber(lifecycle.warrantySoon)} label={t.kpis.warrantySoon} hint={t.hints.warrantySoon} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:chip" value={lifecycle.firmwareObsolete != null ? formatNumber(lifecycle.firmwareObsolete) : copy.units.none} label={t.kpis.firmware} hint={t.hints.firmware} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-off-outline" value={formatNumber(lifecycle.unsupervised)} label={t.kpis.unsupervised} hint={t.hints.unsupervised} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:source-branch-remove" value={formatNumber(lifecycle.spof)} label={t.kpis.spof} hint={t.hints.spof} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-octagon-outline" value={formatNumber(lifecycle.critical)} label={t.kpis.critical} hint={t.hints.critical} help invert locale={locale} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:backup-off" value={formatNumber(lifecycle.withoutBackupConfig)} label={t.kpis.withoutBackup} hint={t.hints.withoutBackup} help invert locale={locale} />
      </div>
      <Panel title={t.renewalTitle} icon="mdi:cached">
        <FollowCards items={[{
        label: t.renewal6,
        value: formatNumber(renewal.months6)
      }, {
        label: t.renewal12,
        value: formatNumber(renewal.months12)
      }, {
        label: t.renewal24,
        value: formatNumber(renewal.months24)
      }]} />
      </Panel>
      <div className={styles.grid2}>
        <DistributionPanel title={t.agePyramidTitle} icon="mdi:chart-gantt" items={ageItems} emptyLabel={copy.empty} />
        <DistributionPanel title={t.eolVendorTitle} icon="mdi:factory" items={vendorItems} emptyLabel={copy.empty} />
      </div>
      <div className={styles.grid2}>
        <Panel title={t.eolClientTitle} icon="mdi:domain">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "name",
          label: t.cols.client,
          render: row => row.name
        }, {
          key: "value",
          label: t.kpis.eol,
          warn: () => true,
          render: row => formatNumber(row.value)
        }]} rows={(cockpit.eolByClient || []).map((row, index) => ({
          ...row,
          id: row.id || String(index)
        }))} />
        </Panel>
        <Panel title={t.risksByClientTitle} icon="mdi:alert-outline">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "name",
          label: t.cols.client,
          render: row => row.name
        }, {
          key: "score",
          label: t.cols.risk,
          warn: row => row.score >= 3,
          render: row => formatNumber(row.score)
        }]} rows={(cockpit.risksByClient || []).map(row => ({
          ...row,
          id: row.id
        }))} />
        </Panel>
      </div>
    </>;

  const views = {
    overview: overviewView,
    network: networkView,
    systems: systemsView,
    peripherals: peripheralsView,
    lifecycle: lifecycleView
  };

  return <div className={styles.cockpitLayout}>
      <aside className={styles.cockpitNav} aria-label={t.navAria}>
        {NAV.map(item => <button key={item.key} type="button" className={`${styles.cockpitNavItem} ${view === item.key ? styles.cockpitNavItemActive : ""}`} onClick={() => setView(item.key)}>
            <Icon icon={item.icon} aria-hidden />
            {t.nav[item.key]}
          </button>)}
      </aside>
      <div className={styles.cockpitMain}>
        {scopeHint}
        {views[view]}
      </div>
    </div>;
}
