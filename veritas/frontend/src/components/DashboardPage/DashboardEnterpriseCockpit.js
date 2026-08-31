import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { ColumnChart, DistributionPanel, HeroKpi, Panel, PiePanel, TrendBars, formatNumber, formatPercent } from "./dashboardWidgets";
import { buildDistributionItems } from "./DashboardCharts";
import styles from "./DashboardPage.module.css";

const NAV = [{
  key: "overview",
  icon: "mdi:office-building-outline"
}, {
  key: "contracts",
  icon: "mdi:file-sign"
}, {
  key: "credits",
  icon: "mdi:ticket-percent-outline"
}, {
  key: "options",
  icon: "mdi:puzzle-outline"
}, {
  key: "fleet",
  icon: "mdi:lan"
}];

const FAMILY_ORDER = ["Ordinateurs", "Switch", "BorneWifi", "Serveurs", "Stockage", "Firewalls", "Routeur", "Internet", "Sauvegarde", "Alimentation", "TOIP"];

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

function toTrend(rows) {
  return (rows || []).map(row => ({
    period: row.date || row.period,
    count: Number(row.value ?? row.count) || 0
  }));
}

function formatEuro(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  const n = Number(value);
  const formatted = Math.round(n).toLocaleString();
  return copy.enterpriseCockpit.euro.replace("{value}", formatted);
}

function formatEuroMonth(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  const n = Number(value);
  if (Math.abs(n) >= 10000) {
    const kilo = Math.round(n / 1000).toLocaleString();
    return copy.enterpriseCockpit.kiloMonth.replace("{value}", kilo);
  }
  const formatted = Math.round(n).toLocaleString();
  return copy.enterpriseCockpit.euroMonth.replace("{value}", formatted);
}

function formatMonthLabel(period) {
  if (!period) return "";
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return String(period);
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit"
  });
}

function compactEuro(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)} k`;
  return String(Math.round(n));
}

function creditDot(state) {
  if (state === "over") return "🔴";
  if (state === "warn") return "🟠";
  return "🟢";
}

export default function DashboardEnterpriseCockpit({
  data,
  copy
}) {
  const [view, setView] = useState("overview");
  const [renewalKey, setRenewalKey] = useState(null);
  const t = copy.enterpriseCockpit;
  const cockpit = data?.enterprise?.cockpit || {};
  const overview = cockpit.overview || {};
  const contracts = cockpit.contracts || {};
  const renewal = cockpit.renewal || {};
  const credits = cockpit.credits || {};
  const options = cockpit.options || {};
  const fleet = cockpit.fleet || {};

  const statusItems = useMemo(() => buildDistributionItems((cockpit.byStatus || []).map(row => ({
    name: t.status[row.key] || row.key,
    count: Number(row.value) || 0
  }))).items, [cockpit.byStatus, t.status]);
  const offerItems = useMemo(() => buildDistributionItems((cockpit.byOffer || []).map(row => ({
    name: t.offers[row.key] || row.key,
    count: Number(row.value) || 0
  }))).items, [cockpit.byOffer, t.offers]);
  const adoptionItems = useMemo(() => (cockpit.optionAdoption || []).map(row => ({
    key: row.key || row.label,
    label: row.label,
    value: Number(row.pct) || 0,
    note: formatNumber(row.count)
  })), [cockpit.optionAdoption]);

  const renewalBuckets = [{
    key: "days30",
    color: "#dc2626",
    label: t.renewal30,
    bucket: renewal.days30
  }, {
    key: "days90",
    color: "#ea580c",
    label: t.renewal90,
    bucket: renewal.days90
  }, {
    key: "days180",
    color: "#ca8a04",
    label: t.renewal180,
    bucket: renewal.days180
  }, {
    key: "daysMore",
    color: "#16a34a",
    label: t.renewalMore,
    bucket: renewal.daysMore
  }];
  const selectedRenewal = renewalBuckets.find(item => item.key === renewalKey);
  const creditAlerts = (cockpit.creditClients || []).filter(row => row.state === "over" || row.state === "warn");
  const openView = next => {
    setView(next);
    if (next !== "contracts") setRenewalKey(null);
  };

  const overviewView = <>
      <div className={styles.spotlightGrid}>
        {[{
        key: "companies",
        value: formatNumber(overview.companiesTotal),
        label: t.spotlight.companies,
        next: "overview"
      }, {
        key: "contracts",
        value: formatNumber(overview.contractsActive),
        label: t.spotlight.contracts,
        next: "contracts"
      }, {
        key: "sla",
        value: formatPercent(copy, contracts.slaMetPct),
        label: t.spotlight.sla,
        next: "contracts"
      }, {
        key: "mrr",
        value: formatEuroMonth(copy, overview.mrr),
        label: t.spotlight.mrr,
        next: "overview"
      }, {
        key: "credits",
        value: formatPercent(copy, credits.consumptionPct),
        label: t.spotlight.credits,
        next: "credits"
      }, {
        key: "renew",
        value: formatNumber(contracts.expiring30),
        label: t.spotlight.renew,
        next: "contracts",
        renew: true
      }, {
        key: "options",
        value: formatNumber(options.active),
        label: t.spotlight.options,
        next: "options"
      }, {
        key: "fleet",
        value: formatPercent(copy, fleet.coveragePct),
        label: t.spotlight.fleet,
        next: "fleet"
      }].map(item => <button key={item.key} type="button" className={styles.spotlightCard} onClick={() => {
        openView(item.next);
        if (item.renew) setRenewalKey("days30");
      }}>
            <span className={styles.spotlightLabel}>{item.label}</span>
            <span className={styles.spotlightValue}>{item.value}</span>
          </button>)}
      </div>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:domain" value={formatNumber(overview.companiesTotal)} label={t.kpis.companies} hint={t.hints.companies} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:check-decagram-outline" value={formatNumber(overview.active)} label={t.kpis.active} hint={t.hints.active} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:account-clock-outline" value={formatNumber(overview.onboarding)} label={t.kpis.onboarding} hint={t.hints.onboarding} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:cancel" value={formatNumber(overview.terminated)} label={t.kpis.terminated} hint={t.hints.terminated} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:cash-sync" value={formatEuroMonth(copy, overview.mrr)} label={t.kpis.mrr} hint={t.hints.mrr} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-sign" value={formatNumber(overview.contractsActive)} label={t.kpis.contractsActive} hint={t.hints.contractsActive} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-alert" value={formatNumber(overview.contractsExpiring)} label={t.kpis.expiring} hint={t.hints.expiring} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-remove-outline" value={formatNumber(overview.withoutContract)} label={t.kpis.withoutContract} hint={t.hints.withoutContract} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:heart-pulse" value={formatPercent(copy, overview.healthScore)} label={t.kpis.healthScore} hint={t.hints.healthScore} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-octagon-outline" value={formatNumber(overview.atRisk)} label={t.kpis.atRisk} hint={t.hints.atRisk} help />
      </div>
      <div className={styles.grid2}>
        <PiePanel title={t.byStatusTitle} icon="mdi:chart-pie" items={statusItems} emptyLabel={copy.empty} />
        <Panel title={t.clientTrendTitle} icon="mdi:chart-timeline-variant">
          <TrendBars items={toTrend(cockpit.clientTrend)} formatLabel={formatMonthLabel} emptyLabel={copy.empty} />
        </Panel>
      </div>
      <div className={styles.grid2}>
        <Panel title={t.mrrTrendTitle} icon="mdi:cash-sync">
          <TrendBars items={toTrend(cockpit.mrrTrend)} formatLabel={formatMonthLabel} formatValue={compactEuro} emptyLabel={copy.empty} />
        </Panel>
        <DistributionPanel title={t.byOfferTitle} icon="mdi:briefcase-outline" items={offerItems} emptyLabel={copy.empty} />
      </div>
      <Panel title={t.topMrrTitle} icon="mdi:cash">
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "name",
        label: t.cols.company,
        render: row => row.name
      }, {
        key: "value",
        label: t.kpis.mrr,
        render: row => formatEuroMonth(copy, row.value)
      }]} rows={cockpit.topByMrr || []} />
      </Panel>
    </>;

  const contractsView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-sign" value={formatNumber(contracts.active)} label={t.kpis.contractsActive} hint={t.hints.contractsActive} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-alert" value={formatNumber(contracts.expiring30)} label={t.kpis.expiring30} hint={t.hints.expiring30} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-clock" value={formatNumber(contracts.expiring90)} label={t.kpis.expiring90} hint={t.hints.expiring90} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-question" value={formatNumber(contracts.noRenewalDate)} label={t.kpis.noRenewal} hint={t.hints.noRenewal} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-check-outline" value={formatNumber(contracts.slaActive)} label={t.kpis.slaActive} hint={t.hints.slaActive} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:check-circle-outline" value={formatNumber(contracts.slaMet)} label={t.kpis.slaMet} hint={t.hints.slaMet} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:percent-outline" value={formatPercent(copy, contracts.slaMetPct)} label={t.kpis.slaMetPct} hint={t.hints.slaMetPct} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-alert-outline" value={formatNumber(contracts.slaBreached)} label={t.kpis.slaBreached} hint={t.hints.slaBreached} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-outline" value={formatNumber(contracts.ticketsOutOfSla)} label={t.kpis.ticketsOutOfSla} hint={t.hints.ticketsOutOfSla} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-off-outline" value={formatNumber(contracts.withoutSla)} label={t.kpis.withoutSla} hint={t.hints.withoutSla} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-octagon-outline" value={formatNumber(contracts.criticalSla)} label={t.kpis.criticalSla} hint={t.hints.criticalSla} help />
      </div>
      <Panel title={t.renewalTitle} icon="mdi:cached" note={t.renewalHint}>
        <ColumnChart emptyLabel={copy.empty} formatValue={formatNumber} onSelect={key => setRenewalKey(current => current === key ? null : key)} items={renewalBuckets.map(item => ({
        key: item.key,
        label: item.label,
        value: Number(item.bucket?.count) || 0,
        color: item.color,
        active: renewalKey === item.key
      }))} />
      </Panel>
      {selectedRenewal ? <Panel title={t.renewalListTitle.replace("{label}", selectedRenewal.label)} icon="mdi:domain">
          <DataTable emptyLabel={copy.empty} columns={[{
        key: "name",
        label: t.cols.company,
        render: row => row.name
      }, {
        key: "expiration",
        label: t.cols.expiration,
        render: row => row.expiration || copy.units.none
      }]} rows={selectedRenewal.bucket?.clients || []} />
        </Panel> : null}
    </>;

  const creditsView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-confirmation-outline" value={formatNumber(credits.available)} label={t.kpis.creditsAvailable} hint={t.hints.creditsAvailable} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-outline" value={formatNumber(credits.consumed)} label={t.kpis.creditsConsumed} hint={t.hints.creditsConsumed} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-percent-outline" value={formatNumber(credits.remaining)} label={t.kpis.creditsRemaining} hint={t.hints.creditsRemaining} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:percent-outline" value={formatPercent(copy, credits.consumptionPct)} label={t.kpis.consumptionPct} hint={t.hints.consumptionPct} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-clock" value={formatNumber(credits.expiringSoon)} label={t.kpis.creditsExpiring} hint={t.hints.creditsExpiring} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-circle-outline" value={formatNumber(credits.overLimit)} label={t.kpis.overLimit} hint={t.hints.overLimit} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:battery-low" value={formatNumber(credits.nearEmpty)} label={t.kpis.nearEmpty} hint={t.hints.nearEmpty} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-account" value={formatNumber(credits.ticketsIncluded)} label={t.kpis.ticketsIncluded} hint={t.hints.ticketsIncluded} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-confirmation" value={formatNumber(credits.ticketsOutOfBundle)} label={t.kpis.ticketsOutOfBundle} hint={t.hints.ticketsOutOfBundle} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:cash-plus" value={formatNumber(credits.ticketsBillable)} label={t.kpis.ticketsBillable} hint={t.hints.ticketsBillable} help />
      </div>
      {creditAlerts.length ? <Panel title={t.creditAlertsTitle} icon="mdi:alert-outline">
          <ul className={styles.creditAlertList}>
            {creditAlerts.map(row => <li key={row.id}>
                {t.creditAlert.replace("{name}", row.name).replace("{pct}", row.pct != null ? String(row.pct) : copy.units.none)}
              </li>)}
          </ul>
        </Panel> : null}
      <Panel title={t.creditTableTitle} icon="mdi:table">
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "name",
        label: t.cols.company,
        render: row => row.name
      }, {
        key: "credit",
        label: t.cols.credit,
        render: row => formatNumber(row.credit)
      }, {
        key: "consumed",
        label: t.cols.consumed,
        render: row => formatNumber(row.consumed)
      }, {
        key: "remaining",
        label: t.cols.remaining,
        warn: row => row.state === "over",
        render: row => formatNumber(row.remaining)
      }, {
        key: "state",
        label: t.cols.state,
        render: row => `${creditDot(row.state)} ${row.pct != null ? `${row.pct} %` : copy.units.none}`
      }]} rows={cockpit.creditClients || []} />
      </Panel>
    </>;

  const optionsView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:puzzle-outline" value={formatNumber(options.active)} label={t.kpis.optionsActive} hint={t.hints.optionsActive} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:office-building-cog-outline" value={options.perCompany != null ? String(options.perCompany) : copy.units.none} label={t.kpis.optionsPerCompany} hint={t.hints.optionsPerCompany} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:briefcase-check-outline" value={formatNumber(options.servicesActive)} label={t.kpis.servicesActive} hint={t.hints.servicesActive} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:briefcase-remove-outline" value={formatNumber(options.servicesExpired)} label={t.kpis.servicesExpired} hint={t.hints.servicesExpired} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-alert" value={formatNumber(options.expiringSoon)} label={t.kpis.optionsExpiring} hint={t.hints.optionsExpiring} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:puzzle-minus-outline" value={formatNumber(options.unused)} label={t.kpis.optionsUnused} hint={t.hints.optionsUnused} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:puzzle-plus-outline" value={formatNumber(options.overused)} label={t.kpis.optionsOverused} hint={t.hints.optionsOverused} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:cash" value={formatEuroMonth(copy, options.monthlyValue)} label={t.kpis.optionsMonthly} hint={t.hints.optionsMonthly} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:cash-clock" value={formatEuro(copy, options.yearlyValue)} label={t.kpis.optionsYearly} hint={t.hints.optionsYearly} help />
      </div>
      <Panel title={t.adoptionTitle} icon="mdi:chart-bar">
        <ColumnChart emptyLabel={copy.empty} scaleMax={100} formatValue={value => formatPercent(copy, value)} items={adoptionItems} />
      </Panel>
    </>;

  const fleetView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-check-outline" value={formatNumber(fleet.underContract)} label={t.kpis.underContract} hint={t.hints.underContract} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-remove-outline" value={formatNumber(fleet.outOfContract)} label={t.kpis.outOfContract} hint={t.hints.outOfContract} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:radar" value={formatNumber(fleet.managed)} label={t.kpis.managed} hint={t.hints.managed} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-off-outline" value={formatNumber(fleet.unmanaged)} label={t.kpis.unmanaged} hint={t.hints.unmanaged} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calculator-variant-outline" value={fleet.avgPerClient != null ? String(fleet.avgPerClient) : copy.units.none} label={t.kpis.avgPerClient} hint={t.hints.avgPerClient} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:puzzle-check-outline" value={formatNumber(fleet.coveredByOption)} label={t.kpis.coveredByOption} hint={t.hints.coveredByOption} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:puzzle-remove-outline" value={formatNumber(fleet.withoutCoverage)} label={t.kpis.withoutCoverage} hint={t.hints.withoutCoverage} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:plus-circle-outline" value={formatNumber(fleet.added)} label={t.kpis.added} hint={t.hints.added} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:minus-circle-outline" value={formatNumber(fleet.removed)} label={t.kpis.removed} hint={t.hints.removed} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:office-building-marker-outline" value={formatNumber(fleet.activeSites)} label={t.kpis.sites} hint={t.hints.sites} />
      </div>
      <Panel title={t.coverageTitle} icon="mdi:shield-check-outline" note={t.coverageNote.replace("{value}", fleet.coveragePct != null ? `${fleet.coveragePct} %` : copy.units.none)}>
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "name",
        label: t.cols.company,
        render: row => row.name
      }, {
        key: "contract",
        label: t.cols.contract,
        render: row => t.contractStatus[row.contract] || row.contract
      }, {
        key: "sla",
        label: t.cols.sla,
        render: row => row.sla === "on" ? "🟢" : "⚪"
      }, {
        key: "credit",
        label: t.cols.credit,
        warn: row => row.creditPct != null && row.creditPct >= 85,
        render: row => row.creditPct != null ? `${row.creditPct} %` : copy.units.none
      }, {
        key: "monitoring",
        label: t.cols.monitoring,
        render: row => row.monitoring ? "🟢" : "⚪"
      }, {
        key: "backup",
        label: t.cols.backup,
        render: row => row.backup ? "🟢" : "⚪"
      }, {
        key: "parc",
        label: t.cols.parc,
        render: row => FAMILY_ORDER.filter(key => row.families?.[key]).map(key => `${row.families[key]} ${t.families[key] || key}`).join(" · ") || formatNumber(row.total)
      }, {
        key: "coverage",
        label: t.cols.coverage,
        render: row => row.coveragePct != null ? `${row.coveragePct} %` : copy.units.none
      }]} rows={cockpit.fleetClients || []} />
      </Panel>
    </>;

  const views = {
    overview: overviewView,
    contracts: contractsView,
    credits: creditsView,
    options: optionsView,
    fleet: fleetView
  };

  return <div className={styles.cockpitLayout}>
      <aside className={styles.cockpitNav} aria-label={t.navAria}>
        {NAV.map(item => <button key={item.key} type="button" className={`${styles.cockpitNavItem} ${view === item.key ? styles.cockpitNavItemActive : ""}`} onClick={() => openView(item.key)}>
            <Icon icon={item.icon} aria-hidden />
            {t.nav[item.key]}
          </button>)}
      </aside>
      <div className={styles.cockpitMain}>
        {views[view]}
      </div>
    </div>;
}

