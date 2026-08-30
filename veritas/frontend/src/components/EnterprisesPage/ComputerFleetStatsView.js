import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { buildComputerFleetStats, POWER_PROFILES } from "../../utils/computerFleetStats";
import { StatsPieChart, StatsDistributionBars, statsDashboardStyles as shared } from "./StatsDashboardWidgets";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";
import { buildExtensionDistributions } from "../../utils/systemFamilyExtensions";
import SmartTooltip from "../SmartTooltip";
import dash from "./ComputerFleetStatsView.module.css";

function Score({ label, value, sub, tone }) {
  return (
    <article className={`${dash.score} ${tone ? dash[`score_${tone}`] || "" : ""}`}>
      <span className={dash.scoreLabel}>{label}</span>
      <span className={dash.scoreValue}>{value}</span>
      {sub ? <span className={dash.scoreSub}>{sub}</span> : null}
    </article>
  );
}

function Pill({ label, count, tone }) {
  return (
    <div className={`${dash.pill} ${tone ? dash[`pill_${tone}`] || "" : ""}`}>
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  );
}

function Fact({ label, value, tone }) {
  return (
    <div className={`${dash.fact} ${tone ? dash[`fact_${tone}`] || "" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ComputerFleetStatsView({ computers = [] }) {
  const [powerPeriod, setPowerPeriod] = useState("monthly");
  const { fields: extensionFields } = useSystemFamilyExtensions("Ordinateurs");
  const extraDistributions = useMemo(
    () => buildExtensionDistributions(computers, extensionFields).filter(entry =>
      (entry.items || []).some(item => item.name !== "Non renseigné")
    ),
    [computers, extensionFields]
  );
  const stats = useMemo(() => buildComputerFleetStats(computers), [computers]);
  const powerKwh = powerPeriod === "annual" ? stats.power.annualKwh : stats.power.monthlyKwh;
  const powerCost = powerPeriod === "annual" ? stats.power.annualCostEur : stats.power.monthlyCostEur;
  const w11 = stats.win11Readiness;
  const win11Tone = w11.blocked > 0 ? "bad" : w11.ready > 0 || w11.unknown > 0 ? "warn" : "good";
  const win11Sub = w11.ready > 0
    ? `${w11.ready} still on Windows 10`
    : w11.blocked > 0
      ? `${w11.blocked} Windows 10 to renew`
      : "OS migration up to date";
  const money = powerCost.toLocaleString("en-GB", { style: "currency", currency: "EUR" });

  return (
    <div className={shared.root}>
      <div className={dash.page}>
        <section className={dash.scores}>
          <Score
            label="Parc"
            value={stats.total}
            sub={`${stats.rmmManaged} RMM · ${stats.manual} manual`}
          />
          <Score
            label="Santé"
            value={stats.fleetHealth.score != null ? `${stats.fleetHealth.score}%` : "—"}
            sub={stats.fleetHealth.label}
            tone={stats.fleetHealth.score == null ? null : stats.fleetHealth.score >= 80 ? "good" : stats.fleetHealth.score >= 60 ? "warn" : "bad"}
          />
          <Score
            label="Win11 ready"
            value={`${w11.readyCount} / ${stats.total}`}
            sub={win11Sub}
            tone={win11Tone}
          />
          <Score
            label="Couverture RMM"
            value={`${stats.rmmCoveragePct}%`}
            sub={`${stats.agentStatus.online} online · ${stats.agentStatus.offline} offline`}
            tone={stats.rmmCoveragePct >= 90 ? "good" : stats.rmmCoveragePct >= 70 ? "warn" : "bad"}
          />
        </section>

        <section className={dash.strip}>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:chart-donut" aria-hidden />
              Composition
            </h3>
            <div className={dash.pies}>
              <div>
                <h4 className={dash.sectionLabel}>Marques</h4>
                <StatsPieChart items={stats.brandDistribution} total={stats.total} centerLabel={stats.total} title="Marques" />
              </div>
              <div>
                <h4 className={dash.sectionLabel}>Modèles</h4>
                <StatsPieChart items={stats.modelDistribution} total={stats.total} centerLabel={stats.total} emptyLabel="Aucun modèle renseigné" title="Modèles" />
              </div>
            </div>
          </article>

          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:clipboard-check-outline" aria-hidden />
              État du parc
            </h3>
            <h4 className={dash.sectionLabel}>Windows 11</h4>
            <div className={dash.pills}>
              <Pill label="Déjà en Windows 11" count={w11.on_w11} tone="good" />
              <Pill label="W10 prêt (est.)" count={w11.ready} tone="info" />
              <Pill label="W10 bloqué" count={w11.blocked} tone="bad" />
              <Pill label="Inconnu" count={w11.unknown} />
            </div>
            <h4 className={dash.sectionLabel}>Garantie</h4>
            <div className={dash.pills}>
              <Pill label="OK" count={stats.warranty.ok} tone="good" />
              <Pill label="< 90 jours" count={stats.warranty.soon} tone="warn" />
              <Pill label="Expirée" count={stats.warranty.expired} tone="bad" />
              <Pill label="Inconnue" count={stats.warranty.unknown} />
            </div>
            {w11.tightRam > 0 ? (
              <p className={dash.note}>
                {w11.tightRam} poste{w11.tightRam > 1 ? "s" : ""} avec RAM juste (4–8 Go)
              </p>
            ) : null}
          </article>
        </section>

        <section className={dash.hardware}>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:chip" aria-hidden />
              CPU
            </h3>
            <StatsDistributionBars items={stats.cpuDistribution} title="CPU" />
          </article>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:memory" aria-hidden />
              RAM
            </h3>
            <StatsDistributionBars items={stats.ramDistribution} title="RAM" />
          </article>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:harddisk" aria-hidden />
              SSD/HDD
            </h3>
            <StatsDistributionBars items={stats.diskDistribution} title="SSD/HDD" />
          </article>
        </section>

        <section className={dash.strip}>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:microsoft-windows" aria-hidden />
              Systèmes
            </h3>
            <StatsPieChart items={stats.osDistribution} total={stats.total} centerLabel={stats.total} title="Systèmes" />
          </article>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:laptop-account" aria-hidden />
              Facteur de forme
            </h3>
            <StatsPieChart items={stats.formFactorDistribution} total={stats.total} centerLabel={stats.total} title="Facteur de forme" />
          </article>
        </section>

        <section className={dash.ops}>
          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:lan" aria-hidden />
              Supervision
            </h3>
            <div className={dash.facts}>
              <Fact label="Agents online" value={stats.agentStatus.online} tone="good" />
              <Fact label="Agents offline" value={stats.agentStatus.offline} tone={stats.agentStatus.offline > 0 ? "bad" : null} />
              <Fact label={`Inventaire stale (> ${stats.inventoryFreshness.staleThresholdDays} j)`} value={stats.inventoryFreshness.stale} tone={stats.inventoryFreshness.stale > 0 ? "warn" : null} />
              <Fact
                label="MAJ Windows en attente"
                value={stats.windowsUpdates.pendingTotal > 0 ? `${stats.windowsUpdates.pending} (${stats.windowsUpdates.pendingTotal})` : stats.windowsUpdates.pending}
                tone={stats.windowsUpdates.pending > 0 ? "warn" : "good"}
              />
              <Fact label="Postes à jour" value={stats.windowsUpdates.upToDate} />
              <Fact label="Disques > 85 %" value={stats.diskAlerts} tone={stats.diskAlerts > 0 ? "bad" : null} />
              <Fact label="Domaine AD" value={stats.domain.joined} />
              <Fact label="Workgroup" value={stats.domain.workgroup} />
              <Fact label="Licences inactives" value={stats.licenseInactive} tone={stats.licenseInactive > 0 ? "warn" : null} />
              <Fact label="Sans agent RMM" value={stats.manual} tone={stats.manual > 0 ? "warn" : null} />
            </div>
          </article>

          <article className={dash.card}>
            <h3 className={dash.cardTitle}>
              <Icon icon="mdi:shield-lock-outline" aria-hidden />
              Sécurité & conso
            </h3>
            <div className={dash.facts}>
              <Fact label="BitLocker on" value={stats.securityPosture.bitlockerOn} tone="good" />
              <Fact label="BitLocker off" value={stats.securityPosture.bitlockerOff} tone={stats.securityPosture.bitlockerOff > 0 ? "bad" : null} />
              <Fact label="BitLocker partiel" value={stats.securityPosture.bitlockerPartial} tone={stats.securityPosture.bitlockerPartial > 0 ? "warn" : null} />
              <Fact label="Defender off" value={stats.securityPosture.defenderOff} tone={stats.securityPosture.defenderOff > 0 ? "bad" : null} />
              <Fact label="RAM < 8 Go" value={stats.undersizing.ramUnder8} tone={stats.undersizing.ramUnder8 > 0 ? "warn" : null} />
              <Fact label="Disque ≥ 85 %" value={stats.undersizing.diskCritical} tone={stats.undersizing.diskCritical > 0 ? "bad" : null} />
            </div>
            <div className={dash.powerHead}>
              <div className={dash.powerTitle}>
                <h4 className={dash.sectionLabel}>Consommation</h4>
                <SmartTooltip
                  content={(
                    <div className={dash.helpTip}>
                      <p>Estimation selon le type de poste, pas une mesure réelle.</p>
                      <p>
                        kWh/mois = (W ÷ 1000) × {stats.power.hoursPerDay} h/j × {stats.power.daysPerMonth} j/mois × nb postes
                      </p>
                      <p>
                        Coût = kWh × {stats.power.pricePerKwh.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}/kWh
                      </p>
                      <ul>
                        {Object.values(POWER_PROFILES).map((profile) => (
                          <li key={profile.label}>{profile.label} · {profile.watts} W</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  tooltipClassName={dash.helpTipPortal}
                  data-tooltip-position="top"
                  as="button"
                  type="button"
                  className={dash.helpBtn}
                  aria-label="Comment la consommation est calculée"
                >
                  <Icon icon="mdi:help-circle-outline" aria-hidden />
                </SmartTooltip>
              </div>
              <div className={dash.toggle} role="tablist" aria-label="Période">
                <button type="button" role="tab" aria-selected={powerPeriod === "monthly"} className={powerPeriod === "monthly" ? dash.toggleBtnOn : dash.toggleBtn} onClick={() => setPowerPeriod("monthly")}>
                  Mois
                </button>
                <button type="button" role="tab" aria-selected={powerPeriod === "annual"} className={powerPeriod === "annual" ? dash.toggleBtnOn : dash.toggleBtn} onClick={() => setPowerPeriod("annual")}>
                  An
                </button>
              </div>
            </div>
            <div className={dash.powerPair}>
              <div className={dash.powerBox}>
                <strong>{powerKwh} kWh</strong>
                <span>{powerPeriod === "annual" ? "par an" : "par mois"}</span>
              </div>
              <div className={dash.powerBox}>
                <strong>{money}</strong>
                <span>estimé</span>
              </div>
            </div>
            {stats.power.breakdown.map((row) => (
              <div key={row.profile} className={dash.powerLine}>
                <span>{row.label} · {row.count} · ~{row.watts} W</span>
                <strong>
                  {powerPeriod === "annual"
                    ? `${Math.round(row.monthlyKwh * 12 * 10) / 10} kWh/an`
                    : `${row.monthlyKwh} kWh/mois`}
                </strong>
              </div>
            ))}
          </article>
        </section>
        {extraDistributions.length ? (
          <section className={shared.chartGrid}>
            {extraDistributions.map((entry) => (
              <article key={entry.fieldKey} className={shared.panel}>
                <h3 className={shared.panelTitle}>
                  <Icon icon="mdi:form-textbox" aria-hidden />
                  {entry.label}
                </h3>
                <StatsPieChart items={entry.items} total={stats.total} centerLabel={stats.total} emptyLabel="—" othersLabel="Autres" title={entry.label} />
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
