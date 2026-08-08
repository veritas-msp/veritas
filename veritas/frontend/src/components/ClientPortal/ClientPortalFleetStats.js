import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { buildComputerFleetStats } from "../../utils/computerFleetStats";
import { KpiCard, StatsPieChart, StatsDistributionBars, StatsDashboardBody, statsDashboardStyles as fleetStyles } from "../EnterprisesPage/StatsDashboardWidgets";
import { getClientPortalCopy } from "./clientPortalI18n";
import styles from "./ClientPortalFleetStats.module.css";
const LOCALE_MAP = {
  fr: "en-US",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT"
};
function formatMoney(value, locale) {
  const fmtLocale = LOCALE_MAP[locale] || "en-US";
  return value.toLocaleString(fmtLocale, {
    style: "currency",
    currency: "EUR"
  });
}
function localizePowerProfile(profile, label, chartLabels) {
  const keyMap = {
    desktop: "powerDesktop",
    laptop: "laptop",
    unknown: "powerGeneric"
  };
  return chartLabels[keyMap[profile]] || label;
}
export default function ClientPortalFleetStats({
  computers = []
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const fleet = copy.fleet;
  const [powerPeriod, setPowerPeriod] = useState("monthly");
  const stats = useMemo(() => buildComputerFleetStats(computers), [computers]);
  const localizedStats = useMemo(() => ({
    ...stats,
    osDistribution: copy.localizeFleetDistribution(stats.osDistribution),
    brandDistribution: copy.localizeFleetDistribution(stats.brandDistribution),
    modelDistribution: copy.localizeFleetDistribution(stats.modelDistribution),
    formFactorDistribution: copy.localizeFleetDistribution(stats.formFactorDistribution),
    ramDistribution: copy.localizeFleetDistribution(stats.ramDistribution),
    cpuDistribution: copy.localizeFleetDistribution(stats.cpuDistribution),
    diskDistribution: copy.localizeFleetDistribution(stats.diskDistribution),
    agentVersionDistribution: copy.localizeFleetDistribution(stats.agentVersionDistribution)
  }), [copy, stats]);
  if (!stats.total) return null;
  const attentionCount = stats.fleetHealth?.attentionCount ?? (stats.windowsUpdates?.pending || 0) + (stats.diskAlerts || 0) + (stats.inventoryFreshness?.stale || 0);
  const fleetHealthLabel = copy.getFleetHealthLabel(attentionCount, stats.total);
  const powerKwh = powerPeriod === "annual" ? stats.power.annualKwh : stats.power.monthlyKwh;
  const powerCost = powerPeriod === "annual" ? stats.power.annualCostEur : stats.power.monthlyCostEur;
  const powerPriceLabel = formatMoney(stats.power.pricePerKwh, locale);
  const rmmSub = stats.manual > 1 ? interpolate(fleet.rmmManagedSubPlural, {
    managed: String(stats.rmmManaged),
    manual: String(stats.manual)
  }) : interpolate(fleet.rmmManagedSub, {
    managed: String(stats.rmmManaged),
    manual: String(stats.manual)
  });
  const rmmOnlineSub = interpolate(fleet.rmmOnlineSub, {
    online: String(stats.agentStatus.online),
    offline: String(stats.agentStatus.offline)
  });
  const ramSub = stats.hardwareSummary.knownRamCount > 0 ? interpolate(fleet.cumulativeRam, {
    total: String(stats.hardwareSummary.totalRamGb)
  }) : fleet.rmmDataRequired;
  const windowsSub = stats.lifecycle.windows10 > 0 ? interpolate(fleet.stillOnWindows10, {
    count: String(stats.lifecycle.windows10)
  }) : fleet.migrationOsUpToDate;
  const pendingUpdatesSuffix = stats.windowsUpdates.pendingTotal > 0 ? interpolate(fleet.metricWindowsUpdatesFixes, {
    count: String(stats.windowsUpdates.pendingTotal)
  }) : "";
  return <div className={styles.root}>
      <StatsDashboardBody>
        <section className={`${fleetStyles.kpiGrid} ${styles.kpiGridWide}`}>
          <KpiCard icon="mdi:monitor-dashboard" label={fleet.totalFleet} value={stats.total} sub={rmmSub} />
          <KpiCard icon="mdi:shield-check-outline" label={fleet.rmmCoverage} value={`${stats.rmmCoveragePct}%`} sub={rmmOnlineSub} tone={stats.rmmCoveragePct >= 90 ? "good" : stats.rmmCoveragePct >= 70 ? "warn" : "bad"} />
          <KpiCard icon="mdi:heart-pulse" label={fleet.fleetHealth} value={stats.fleetHealth.score != null ? `${stats.fleetHealth.score}%` : "-"} sub={fleetHealthLabel} tone={stats.fleetHealth.score == null ? "neutral" : stats.fleetHealth.score >= 80 ? "good" : stats.fleetHealth.score >= 60 ? "warn" : "bad"} />
          <KpiCard icon="mdi:microsoft-windows" label={fleet.windows11} value={stats.lifecycle.windows11} sub={windowsSub} tone={stats.lifecycle.windows10 > 0 ? "warn" : "good"} />
          <KpiCard icon="mdi:memory" label={fleet.avgRam} value={stats.hardwareSummary.avgRamGb != null ? `${stats.hardwareSummary.avgRamGb} Go` : "-"} sub={ramSub} />
          <KpiCard icon="mdi:flash-outline" label={powerPeriod === "annual" ? fleet.powerAnnual : fleet.powerMonthly} value={`${powerKwh} kWh`} sub={`≈ ${formatMoney(powerCost, locale)}`} />
        </section>

        <section className={`${fleetStyles.chartGrid} ${styles.chartGridWide}`}>
          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:factory" />
              {fleet.brandsTitle}
            </h3>
            <StatsPieChart items={localizedStats.brandDistribution} total={stats.total} centerLabel={stats.total} />
          </article>

          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:laptop" />
              {fleet.modelsTitle}
            </h3>
            <StatsPieChart items={localizedStats.modelDistribution} total={stats.total} centerLabel={stats.total} emptyLabel={fleet.modelsEmpty} />
          </article>

          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:microsoft-windows" />
              {fleet.osTitle}
            </h3>
            <StatsPieChart items={localizedStats.osDistribution} total={stats.total} centerLabel={stats.total} />
          </article>

          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:laptop-account" />
              {fleet.formFactorTitle}
            </h3>
            <StatsPieChart items={localizedStats.formFactorDistribution} total={stats.total} centerLabel={stats.total} />
          </article>
        </section>

        <section className={`${fleetStyles.chartBarGrid} ${styles.chartBarGrid}`}>
          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:memory" />
              {fleet.ramTitle}
            </h3>
            <StatsDistributionBars items={localizedStats.ramDistribution} />
          </article>

          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:chip" />
              {fleet.cpuTitle}
            </h3>
            <StatsDistributionBars items={localizedStats.cpuDistribution} />
          </article>

          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:harddisk" />
              {fleet.storageTitle}
            </h3>
            <StatsDistributionBars items={localizedStats.diskDistribution} />
          </article>
        </section>

        <section className={fleetStyles.columns}>
          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:lan" />
              {fleet.supervisionTitle}
            </h3>
            <ul className={fleetStyles.metricList}>
              <li>
                <span>{fleet.metricAgentsOnline}</span>
                <strong className={fleetStyles.metricGood}>{stats.agentStatus.online}</strong>
              </li>
              <li>
                <span>{fleet.metricAgentsOffline}</span>
                <strong className={stats.agentStatus.offline > 0 ? fleetStyles.metricBad : ""}>
                  {stats.agentStatus.offline}
                </strong>
              </li>
              <li>
                <span>
                  {interpolate(fleet.metricStaleInventory, {
                  days: String(stats.inventoryFreshness.staleThresholdDays)
                })}
                </span>
                <strong className={stats.inventoryFreshness.stale > 0 ? fleetStyles.metricWarn : ""}>
                  {stats.inventoryFreshness.stale}
                </strong>
              </li>
              <li>
                <span>{fleet.metricWindowsUpdatesPending}</span>
                <strong className={stats.windowsUpdates.pending > 0 ? fleetStyles.metricWarn : fleetStyles.metricGood}>
                  {stats.windowsUpdates.pending}
                  {pendingUpdatesSuffix}
                </strong>
              </li>
              <li>
                <span>{fleet.metricWindowsUpdatesUpToDate}</span>
                <strong>{stats.windowsUpdates.upToDate}</strong>
              </li>
              <li>
                <span>{fleet.metricHighDiskUsage}</span>
                <strong className={stats.diskAlerts > 0 ? fleetStyles.metricBad : ""}>{stats.diskAlerts}</strong>
              </li>
              <li>
                <span>{fleet.metricDomainJoined}</span>
                <strong>{stats.domain.joined}</strong>
              </li>
              <li>
                <span>{fleet.metricWorkgroup}</span>
                <strong>{stats.domain.workgroup}</strong>
              </li>
              <li>
                <span>{fleet.metricInactiveLicenses}</span>
                <strong className={stats.licenseInactive > 0 ? fleetStyles.metricWarn : ""}>
                  {stats.licenseInactive}
                </strong>
              </li>
              <li>
                <span>{fleet.metricNoRmmAgent}</span>
                <strong className={stats.manual > 0 ? fleetStyles.metricWarn : ""}>{stats.manual}</strong>
              </li>
            </ul>
          </article>

          <article className={fleetStyles.panel}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:update" />
              {fleet.lifecycleTitle}
            </h3>
            <ul className={fleetStyles.metricList}>
              <li>
                <span>{fleet.metricWin11}</span>
                <strong className={fleetStyles.metricGood}>{stats.lifecycle.windows11}</strong>
              </li>
              <li>
                <span>{fleet.metricWin10Eol}</span>
                <strong className={stats.lifecycle.windows10 > 0 ? fleetStyles.metricWarn : ""}>
                  {stats.lifecycle.windows10}
                </strong>
              </li>
              <li>
                <span>{fleet.metricAvgStorage}</span>
                <strong>
                  {stats.hardwareSummary.avgDiskGb != null ? `${stats.hardwareSummary.avgDiskGb} Go` : "-"}
                </strong>
              </li>
              <li>
                <span>{fleet.metricKnownRam}</span>
                <strong>
                  {stats.hardwareSummary.knownRamCount}/{stats.total}
                </strong>
              </li>
            </ul>
            <h4 className={fleetStyles.subPanelTitle}>{fleet.agentVersionsTitle}</h4>
            <StatsDistributionBars items={localizedStats.agentVersionDistribution} />
          </article>
        </section>

        <article className={fleetStyles.panel}>
          <div className={fleetStyles.panelHeaderRow}>
            <h3 className={fleetStyles.panelTitle}>
              <Icon icon="mdi:lightning-bolt-outline" />
              {fleet.powerTitle}
            </h3>
            <div className={fleetStyles.periodToggle} role="tablist" aria-label={fleet.powerPeriodAria}>
              <button type="button" role="tab" aria-selected={powerPeriod === "monthly"} className={powerPeriod === "monthly" ? fleetStyles.periodBtnActive : fleetStyles.periodBtn} onClick={() => setPowerPeriod("monthly")}>
                {fleet.periodMonthly}
              </button>
              <button type="button" role="tab" aria-selected={powerPeriod === "annual"} className={powerPeriod === "annual" ? fleetStyles.periodBtnActive : fleetStyles.periodBtn} onClick={() => setPowerPeriod("annual")}>
                {fleet.periodAnnual}
              </button>
            </div>
          </div>
          <p className={fleetStyles.powerDisclaimer}>
            {interpolate(fleet.powerDisclaimer, {
            hours: String(stats.power.hoursPerDay),
            days: String(stats.power.daysPerMonth),
            price: powerPriceLabel
          })}
          </p>
          <div className={fleetStyles.powerSummary}>
            <div className={fleetStyles.powerHighlight}>
              <span className={fleetStyles.powerHighlightValue}>{powerKwh} kWh</span>
              <span className={fleetStyles.powerHighlightLabel}>
                {powerPeriod === "annual" ? fleet.powerPerYear : fleet.powerPerMonth}
              </span>
            </div>
            <div className={fleetStyles.powerHighlight}>
              <span className={fleetStyles.powerHighlightValue}>{formatMoney(powerCost, locale)}</span>
              <span className={fleetStyles.powerHighlightLabel}>{fleet.powerEstimatedCost}</span>
            </div>
          </div>
          {stats.power.breakdown.length > 0 ? <div className={fleetStyles.powerBreakdown}>
              {stats.power.breakdown.map(row => {
            const countLabel = row.count > 1 ? fleet.workstationMany : fleet.workstationOne;
            const profileLabel = localizePowerProfile(row.profile, row.label, fleet.chartLabels);
            const kwhValue = powerPeriod === "annual" ? interpolate(fleet.powerBreakdownKwhYear, {
              value: String(Math.round(row.monthlyKwh * 12 * 10) / 10)
            }) : interpolate(fleet.powerBreakdownKwhMonth, {
              value: String(row.monthlyKwh)
            });
            return <div key={row.profile} className={fleetStyles.powerBreakdownRow}>
                    <span>
                      {interpolate(fleet.powerBreakdownLine, {
                  label: profileLabel,
                  count: String(row.count),
                  countLabel,
                  watts: String(row.watts)
                })}
                    </span>
                    <strong>{kwhValue}</strong>
                  </div>;
          })}
            </div> : null}
        </article>

        {(stats.windowsUpdates.pending > 0 || stats.diskAlerts > 0 || stats.inventoryFreshness.stale > 0) && <section className={styles.alertPanel}>
            <h3 className={styles.alertTitle}>
              <Icon icon="mdi:alert-circle-outline" />
              {fleet.alertsTitle}
            </h3>
            <ul className={styles.alertList}>
              {stats.windowsUpdates.pending > 0 ? <li>
                  {stats.windowsUpdates.pending > 1 ? interpolate(fleet.windowsUpdatesPendingMany, {
              count: String(stats.windowsUpdates.pending)
            }) : interpolate(fleet.windowsUpdatesPendingOne, {
              count: String(stats.windowsUpdates.pending)
            })}
                </li> : null}
              {stats.diskAlerts > 0 ? <li>
                  {stats.diskAlerts > 1 ? interpolate(fleet.diskAlertsMany, {
              count: String(stats.diskAlerts)
            }) : interpolate(fleet.diskAlertsOne, {
              count: String(stats.diskAlerts)
            })}
                </li> : null}
              {stats.inventoryFreshness.stale > 0 ? <li>
                  {stats.inventoryFreshness.stale > 1 ? interpolate(fleet.staleInventoryMany, {
              count: String(stats.inventoryFreshness.stale),
              days: String(stats.inventoryFreshness.staleThresholdDays)
            }) : interpolate(fleet.staleInventoryOne, {
              count: String(stats.inventoryFreshness.stale),
              days: String(stats.inventoryFreshness.staleThresholdDays)
            })}
                </li> : null}
            </ul>
          </section>}
      </StatsDashboardBody>
    </div>;
}
