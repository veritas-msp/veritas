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
  const w11 = stats.win11Readiness;
  const win11Tone = w11.blocked > 0 ? "bad" : w11.ready > 0 || w11.unknown > 0 ? "warn" : "good";
  const win11Sub = w11.ready > 0
    ? `${w11.ready} still on Windows 10 (probable ready)`
    : w11.blocked > 0
      ? `${w11.blocked} Windows 10 to renew`
      : "OS migration up to date";
  const bitlockerLabel = stats.securityPosture.bitlockerOnPct != null
    ? `${stats.securityPosture.bitlockerOnPct}% encrypted`
    : "No BitLocker data";
  const defenderLabel = stats.securityPosture.defenderOnPct != null
    ? `${stats.securityPosture.defenderOff} without realtime`
    : "No Defender data";

  return <StatsDashboardBody>
        <section className={styles.kpiGrid}>
          <KpiCard icon="mdi:monitor-dashboard" label="Total fleet" value={stats.total} sub={`${stats.rmmManaged} under RMM · ${stats.manual} manual`} />
          <KpiCard icon="mdi:shield-check-outline" label="RMM coverage" value={`${stats.rmmCoveragePct}%`} sub={`${stats.agentStatus.online} online · ${stats.agentStatus.offline} offline`} tone={stats.rmmCoveragePct >= 90 ? "good" : stats.rmmCoveragePct >= 70 ? "warn" : "bad"} />
          <KpiCard icon="mdi:heart-pulse" label="Fleet health" value={stats.fleetHealth.score != null ? `${stats.fleetHealth.score}%` : "-"} sub={stats.fleetHealth.label} tone={stats.fleetHealth.score == null ? "neutral" : stats.fleetHealth.score >= 80 ? "good" : stats.fleetHealth.score >= 60 ? "warn" : "bad"} />
          <KpiCard
            icon="mdi:microsoft-windows"
            label="Win11 ready (est.)"
            value={`${w11.readyCount} / ${stats.total}`}
            sub={win11Sub}
            tone={win11Tone}
          />
          <KpiCard icon="mdi:memory" label="Average RAM" value={stats.hardwareSummary.avgRamGb != null ? `${stats.hardwareSummary.avgRamGb} GB` : "-"} sub={stats.hardwareSummary.knownRamCount > 0 ? `${stats.hardwareSummary.totalRamGb} GB total` : "No RAM filled"} />
          <KpiCard icon="mdi:flash-outline" label={`${powerPeriodLabel} usage`} value={`${powerKwh} kWh`} sub={`≈ ${powerCost.toLocaleString("en-GB", {
        style: "currency",
        currency: "EUR"
      })}`} />
        </section>

        <section className={styles.insightGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:microsoft-windows" />
              Windows 11 readiness
            </h3>
            <p className={styles.panelDesc}>
              Probable compatibility from CPU + RAM (≥ 4 GB) + disk (≥ 64 GB). TPM 2.0 / Secure Boot not collected — not Microsoft-certified.
            </p>
            <div className={styles.statusGrid}>
              <div className={`${styles.statusCard} ${styles.statusGood}`}>
                <span className={styles.statusCount}>{w11.on_w11}</span>
                <span className={styles.statusLabel}>Already on Windows 11</span>
              </div>
              <div className={`${styles.statusCard} ${styles.statusInfo}`}>
                <span className={styles.statusCount}>{w11.ready}</span>
                <span className={styles.statusLabel}>Windows 10 ready (est.)</span>
              </div>
              <div className={`${styles.statusCard} ${styles.statusBad}`}>
                <span className={styles.statusCount}>{w11.blocked}</span>
                <span className={styles.statusLabel}>Windows 10 blocked</span>
              </div>
              <div className={`${styles.statusCard} ${styles.statusMuted}`}>
                <span className={styles.statusCount}>{w11.unknown}</span>
                <span className={styles.statusLabel}>Unknown / insufficient data</span>
              </div>
            </div>
            {w11.tightRam > 0 ? (
              <p className={styles.insightNote}>
                {w11.tightRam} workstation{w11.tightRam > 1 ? "s" : ""} with tight RAM (4–8 GB) — upgrade recommended for comfort.
              </p>
            ) : null}
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:shield-half-full" />
              Warranty & age
            </h3>
            <ul className={styles.metricList}>
              <li>
                <span>Warranty expired</span>
                <strong className={stats.warranty.expired > 0 ? styles.metricBad : ""}>{stats.warranty.expired}</strong>
              </li>
              <li>
                <span>Expiring &lt; 90 days</span>
                <strong className={stats.warranty.soon > 0 ? styles.metricWarn : ""}>{stats.warranty.soon}</strong>
              </li>
              <li>
                <span>Warranty OK</span>
                <strong className={styles.metricGood}>{stats.warranty.ok}</strong>
              </li>
              <li>
                <span>Warranty unknown</span>
                <strong>{stats.warranty.unknown}</strong>
              </li>
              <li>
                <span>OS install ≥ 5 years</span>
                <strong className={stats.warranty.aging > 0 ? styles.metricWarn : ""}>{stats.warranty.aging}</strong>
              </li>
            </ul>
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:shield-lock-outline" />
              Security posture
            </h3>
            <p className={styles.securityHero}>
              <strong>{bitlockerLabel}</strong>
              <span>·</span>
              <strong className={stats.securityPosture.defenderOff > 0 ? styles.metricBad : ""}>{defenderLabel}</strong>
            </p>
            <ul className={styles.metricList}>
              <li>
                <span>BitLocker on</span>
                <strong className={styles.metricGood}>{stats.securityPosture.bitlockerOn}</strong>
              </li>
              <li>
                <span>BitLocker partial</span>
                <strong className={stats.securityPosture.bitlockerPartial > 0 ? styles.metricWarn : ""}>{stats.securityPosture.bitlockerPartial}</strong>
              </li>
              <li>
                <span>BitLocker off</span>
                <strong className={stats.securityPosture.bitlockerOff > 0 ? styles.metricBad : ""}>{stats.securityPosture.bitlockerOff}</strong>
              </li>
              <li>
                <span>Defender realtime on</span>
                <strong className={styles.metricGood}>{stats.securityPosture.defenderOn}</strong>
              </li>
              <li>
                <span>Defender realtime off</span>
                <strong className={stats.securityPosture.defenderOff > 0 ? styles.metricBad : ""}>{stats.securityPosture.defenderOff}</strong>
              </li>
            </ul>
            <h4 className={styles.subPanelTitle}>Undersizing (quote levers)</h4>
            <ul className={styles.metricList}>
              <li>
                <span>RAM &lt; 8 GB</span>
                <strong className={stats.undersizing.ramUnder8 > 0 ? styles.metricWarn : ""}>{stats.undersizing.ramUnder8}</strong>
              </li>
              <li>
                <span>Disk 70–85%</span>
                <strong className={stats.undersizing.diskWarn > 0 ? styles.metricWarn : ""}>{stats.undersizing.diskWarn}</strong>
              </li>
              <li>
                <span>Disk ≥ 85%</span>
                <strong className={stats.undersizing.diskCritical > 0 ? styles.metricBad : ""}>{stats.undersizing.diskCritical}</strong>
              </li>
              <li>
                <span>HDD only · SSD only</span>
                <strong>{stats.undersizing.hddOnly} · {stats.undersizing.ssdOnly}</strong>
              </li>
            </ul>
          </article>
        </section>

        <section className={styles.chartGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:factory" />
              Brands
            </h3>
            <StatsPieChart items={stats.brandDistribution} total={stats.total} centerLabel={stats.total} title="Brands" />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:laptop" />
              Models
            </h3>
            <StatsPieChart items={stats.modelDistribution} total={stats.total} centerLabel={stats.total} emptyLabel="No model filled" title="Models" />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:microsoft-windows" />
              Operating systems
            </h3>
            <StatsPieChart items={stats.osDistribution} total={stats.total} centerLabel={stats.total} title="Operating systems" />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:laptop-account" />
              Form factor
            </h3>
            <StatsPieChart items={stats.formFactorDistribution} total={stats.total} centerLabel={stats.total} title="Form factor" />
          </article>
        </section>

        <section className={styles.chartBarGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:memory" />
              Memory (RAM)
            </h3>
            <StatsDistributionBars items={stats.ramDistribution} title="Memory (RAM)" />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:chip" />
              Processors
            </h3>
            <StatsDistributionBars items={stats.cpuDistribution} title="Processors" />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:harddisk" />
              Storage
            </h3>
            <StatsDistributionBars items={stats.diskDistribution} title="Storage" />
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
            <StatsDistributionBars items={stats.agentVersionDistribution} title="Versions agent RMM" />
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
