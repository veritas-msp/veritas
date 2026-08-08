import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { buildComputerFleetStats } from "../../utils/computerFleetStats";
import { KpiCard, StatsPieChart, StatsDistributionBars, StatsDashboardBody, statsDashboardStyles as styles } from "./StatsDashboardWidgets";
export default function ComputerFleetStatsView({
  computers = []
}) {
  const [powerPeriod, setPowerPeriod] = useState("monthly");
  const stats = useMemo(() => buildComputerFleetStats(computers), [computers]);
  const powerKwh = powerPeriod === "annual" ? stats.power.annualKwh : stats.power.monthlyKwh;
  const powerCost = powerPeriod === "annual" ? stats.power.annualCostEur : stats.power.monthlyCostEur;
  const powerPeriodLabel = powerPeriod === "annual" ? "annual" : "monthly";
  return <StatsDashboardBody>
        <section className={styles.kpiGrid}>
          <KpiCard icon="mdi:monitor-dashboard" label="Total fleet" value={stats.total} sub={`${stats.rmmManaged} under RMM · ${stats.manual} manual`} />
          <KpiCard icon="mdi:shield-check-outline" label="RMM coverage" value={`${stats.rmmCoveragePct}%`} sub={`${stats.agentStatus.online} online · ${stats.agentStatus.offline} offline`} tone={stats.rmmCoveragePct >= 90 ? "good" : stats.rmmCoveragePct >= 70 ? "warn" : "bad"} />
          <KpiCard icon="mdi:heart-pulse" label="Fleet health" value={stats.fleetHealth.score != null ? `${stats.fleetHealth.score}%` : "-"} sub={stats.fleetHealth.label} tone={stats.fleetHealth.score == null ? "neutral" : stats.fleetHealth.score >= 80 ? "good" : stats.fleetHealth.score >= 60 ? "warn" : "bad"} />
          <KpiCard icon="mdi:microsoft-windows" label="Windows 11" value={stats.lifecycle.windows11} sub={stats.lifecycle.windows10 > 0 ? `${stats.lifecycle.windows10} still on Windows 10` : "OS migration up to date"} tone={stats.lifecycle.windows10 > 0 ? "warn" : "good"} />
          <KpiCard icon="mdi:memory" label="Average RAM" value={stats.hardwareSummary.avgRamGb != null ? `${stats.hardwareSummary.avgRamGb} GB` : "-"} sub={stats.hardwareSummary.knownRamCount > 0 ? `${stats.hardwareSummary.totalRamGb} GB total` : "RMM data required"} />
          <KpiCard icon="mdi:flash-outline" label={`${powerPeriodLabel} usage`} value={`${powerKwh} kWh`} sub={`≈ ${powerCost.toLocaleString("en-GB", {
        style: "currency",
        currency: "EUR"
      })}`} />
        </section>

        <section className={styles.chartGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:factory" />
              Brands
            </h3>
            <StatsPieChart items={stats.brandDistribution} total={stats.total} centerLabel={stats.total} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:laptop" />
              Models & CPU profiles
            </h3>
            <StatsPieChart items={stats.modelDistribution} total={stats.total} centerLabel={stats.total} emptyLabel="RMM inventory required for models" />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:microsoft-windows" />
              Operating systems
            </h3>
            <StatsPieChart items={stats.osDistribution} total={stats.total} centerLabel={stats.total} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:laptop-account" />
              Form factor
            </h3>
            <StatsPieChart items={stats.formFactorDistribution} total={stats.total} centerLabel={stats.total} />
          </article>
        </section>

        <section className={styles.chartBarGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:memory" />
              Memory (RAM)
            </h3>
            <StatsDistributionBars items={stats.ramDistribution} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:chip" />
              Processors
            </h3>
            <StatsDistributionBars items={stats.cpuDistribution} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:harddisk" />
              Storage
            </h3>
            <StatsDistributionBars items={stats.diskDistribution} />
          </article>
        </section>

        <section className={styles.columns}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:lan" />
              Monitoring & compliance
            </h3>
            <ul className={styles.metricList}>
              <li>
                <span>Agents online</span>
                <strong className={styles.metricGood}>{stats.agentStatus.online}</strong>
              </li>
              <li>
                <span>Agents offline</span>
                <strong className={stats.agentStatus.offline > 0 ? styles.metricBad : ""}>
                  {stats.agentStatus.offline}
                </strong>
              </li>
              <li>
                <span>Stale inventory (&gt; {stats.inventoryFreshness.staleThresholdDays} d)</span>
                <strong className={stats.inventoryFreshness.stale > 0 ? styles.metricWarn : ""}>
                  {stats.inventoryFreshness.stale}
                </strong>
              </li>
              <li>
                <span>Pending Windows updates</span>
                <strong className={stats.windowsUpdates.pending > 0 ? styles.metricWarn : styles.metricGood}>
                  {stats.windowsUpdates.pending}
                  {stats.windowsUpdates.pendingTotal > 0 ? ` (${stats.windowsUpdates.pendingTotal} patch(es))` : ""}
                </strong>
              </li>
              <li>
                <span>Up-to-date workstations</span>
                <strong>{stats.windowsUpdates.upToDate}</strong>
              </li>
              <li>
                <span>Disks &gt; 85%</span>
                <strong className={stats.diskAlerts > 0 ? styles.metricBad : ""}>{stats.diskAlerts}</strong>
              </li>
              <li>
                <span>Joined to AD domain</span>
                <strong>{stats.domain.joined}</strong>
              </li>
              <li>
                <span>Workgroup</span>
                <strong>{stats.domain.workgroup}</strong>
              </li>
              <li>
                <span>Inactive Windows licenses</span>
                <strong className={stats.licenseInactive > 0 ? styles.metricWarn : ""}>
                  {stats.licenseInactive}
                </strong>
              </li>
              <li>
                <span>Without RMM agent</span>
                <strong className={stats.manual > 0 ? styles.metricWarn : ""}>{stats.manual}</strong>
              </li>
            </ul>
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:update" />
              Lifecycle & agents
            </h3>
            <ul className={styles.metricList}>
              <li>
                <span>Windows 11</span>
                <strong className={styles.metricGood}>{stats.lifecycle.windows11}</strong>
              </li>
              <li>
                <span>Windows 10 (end of support)</span>
                <strong className={stats.lifecycle.windows10 > 0 ? styles.metricWarn : ""}>
                  {stats.lifecycle.windows10}
                </strong>
              </li>
              <li>
                <span>Average storage</span>
                <strong>
                  {stats.hardwareSummary.avgDiskGb != null ? `${stats.hardwareSummary.avgDiskGb} GB` : "-"}
                </strong>
              </li>
              <li>
                <span>Workstations with known RAM</span>
                <strong>
                  {stats.hardwareSummary.knownRamCount}/{stats.total}
                </strong>
              </li>
            </ul>
            <h4 className={styles.subPanelTitle}>Versions agent RMM</h4>
            <StatsDistributionBars items={stats.agentVersionDistribution} />
          </article>
        </section>

        <article className={styles.panel}>
          <div className={styles.panelHeaderRow}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:lightning-bolt-outline" />
              Estimated power consumption
            </h3>
            <div className={styles.periodToggle} role="tablist" aria-label="Consumption period">
              <button type="button" role="tab" aria-selected={powerPeriod === "monthly"} className={powerPeriod === "monthly" ? styles.periodBtnActive : styles.periodBtn} onClick={() => setPowerPeriod("monthly")}>
                Monthly
              </button>
              <button type="button" role="tab" aria-selected={powerPeriod === "annual"} className={powerPeriod === "annual" ? styles.periodBtnActive : styles.periodBtn} onClick={() => setPowerPeriod("annual")}>
                Annual
              </button>
            </div>
          </div>
          <p className={styles.powerDisclaimer}>
            Estimate based on desktop/laptop profile, {stats.power.hoursPerDay} h/day,{" "}
            {stats.power.daysPerMonth} d/month, rate{" "}
            {stats.power.pricePerKwh.toLocaleString("en-GB", {
          style: "currency",
          currency: "EUR"
        })}/kWh.
          </p>
          <div className={styles.powerSummary}>
            <div className={styles.powerHighlight}>
              <span className={styles.powerHighlightValue}>{powerKwh} kWh</span>
              <span className={styles.powerHighlightLabel}>
                {powerPeriod === "annual" ? "per year" : "per month"}
              </span>
            </div>
            <div className={styles.powerHighlight}>
              <span className={styles.powerHighlightValue}>
                {powerCost.toLocaleString("en-GB", {
              style: "currency",
              currency: "EUR"
            })}
              </span>
              <span className={styles.powerHighlightLabel}>estimated cost</span>
            </div>
          </div>
          {stats.power.breakdown.length > 0 ? <div className={styles.powerBreakdown}>
              {stats.power.breakdown.map(row => <div key={row.profile} className={styles.powerBreakdownRow}>
                  <span>
                    {row.label} · {row.count} workstation{row.count > 1 ? "s" : ""} · ~{row.watts} W
                  </span>
                  <strong>
                    {powerPeriod === "annual" ? `${Math.round(row.monthlyKwh * 12 * 10) / 10} kWh/year` : `${row.monthlyKwh} kWh/month`}
                  </strong>
                </div>)}
            </div> : null}
        </article>
    </StatsDashboardBody>;
}
