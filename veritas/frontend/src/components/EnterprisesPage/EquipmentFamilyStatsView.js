import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { buildEquipmentFamilyStats } from "../../utils/equipmentFamilyStats";
import { getEquipmentFamilyStatsCopy } from "../../utils/equipmentFamilyStatsI18n";
import { KpiCard, StatsPieChart, StatsDistributionBars, StatsDashboardBody, statsDashboardStyles as styles } from "./StatsDashboardWidgets";

const LABEL_ALIASES = {
  "Not specified": "unspecified",
  "Non renseigné": "unspecified",
  Others: "others",
  Autres: "others",
  Yes: "yes",
  No: "no",
  Guest: "guest",
  Private: "private",
  Physical: "physical",
  Virtual: "virtual"
};

function localizeItems(items, copy) {
  return (Array.isArray(items) ? items : []).map(item => {
    const alias = LABEL_ALIASES[item.name];
    const mapped = alias ? copy[alias] : null;
    return {
      ...item,
      name: mapped || item.name
    };
  });
}

function ChartPanel({ icon, title, children }) {
  return (
    <article className={styles.panel}>
      <h3 className={styles.panelTitle}>
        <Icon icon={icon} aria-hidden />
        {title}
      </h3>
      {children}
    </article>
  );
}

function DistributionPie({ items, total, copy, emptyLabel }) {
  return <StatsPieChart items={localizeItems(items, copy)} total={total} centerLabel={total} emptyLabel={emptyLabel || copy.emptyChart} />;
}

function DistributionBars({ items, copy }) {
  return <StatsDistributionBars items={localizeItems(items, copy)} emptyLabel={copy.emptyChart} />;
}

function hasUsefulDistribution(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return false;
  if (list.length === 1 && LABEL_ALIASES[list[0].name] === "unspecified") return false;
  return true;
}

function formatGb(value) {
  if (value == null) return "-";
  if (value >= 1024) return `${Math.round(value / 102.4) / 10} To`;
  return `${Math.round(value)} Go`;
}

function SpecificCharts({ family, specifics, total, copy }) {
  if (!specifics) return null;
  if (family === "internet") {
    return (
      <>
        <section className={styles.chartGrid}>
          <ChartPanel icon="mdi:domain" title={copy.providersTitle}>
            <DistributionPie items={specifics.providerDistribution} total={total} copy={copy} />
          </ChartPanel>
          <ChartPanel icon="mdi:lan-connect" title={copy.linkTypeTitle}>
            <DistributionPie items={specifics.typeDistribution} total={total} copy={copy} />
          </ChartPanel>
          <ChartPanel icon="mdi:speedometer" title={copy.debitTitle}>
            <DistributionPie items={specifics.debitDistribution} total={total} copy={copy} />
          </ChartPanel>
          {hasUsefulDistribution(specifics.haDistribution) ? (
            <ChartPanel icon="mdi:server-network" title={copy.haTitle}>
              <DistributionPie items={specifics.haDistribution} total={total} copy={copy} />
            </ChartPanel>
          ) : null}
          {hasUsefulDistribution(specifics.boxDistribution) ? (
            <ChartPanel icon="mdi:router-network" title={copy.boxTitle}>
              <DistributionPie items={specifics.boxDistribution} total={total} copy={copy} />
            </ChartPanel>
          ) : null}
        </section>
      </>
    );
  }
  if (family === "firewalls") {
    return (
      <section className={styles.chartGrid}>
        <ChartPanel icon="mdi:shield-outline" title={copy.firewallTypeTitle}>
          <DistributionPie items={specifics.typeDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:server-network" title={copy.haTitle}>
          <DistributionPie items={specifics.haDistribution} total={total} copy={copy} />
        </ChartPanel>
      </section>
    );
  }
  if (family === "servers") {
    return (
      <>
        <section className={styles.chartGrid}>
          <ChartPanel icon="mdi:microsoft-windows" title={copy.osTitle}>
            <DistributionPie items={specifics.osDistribution} total={total} copy={copy} />
          </ChartPanel>
          <ChartPanel icon="mdi:server" title={copy.serverTypeTitle}>
            <DistributionPie items={specifics.typeDistribution} total={total} copy={copy} />
          </ChartPanel>
          <ChartPanel icon="mdi:briefcase-outline" title={copy.rolesTitle}>
            <DistributionPie items={specifics.roleDistribution} total={total} copy={copy} />
          </ChartPanel>
          {hasUsefulDistribution(specifics.hypervisorDistribution) ? (
            <ChartPanel icon="mdi:cloud-outline" title={copy.hypervisorTitle}>
              <DistributionPie items={specifics.hypervisorDistribution} total={total} copy={copy} />
            </ChartPanel>
          ) : null}
        </section>
      </>
    );
  }
  if (family === "storage") {
    return (
      <section className={styles.chartGrid}>
          <ChartPanel icon="mdi:nas" title={copy.raidTitle}>
          <DistributionPie items={specifics.raidDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:database" title={copy.capacityTitle}>
          <DistributionPie items={specifics.capacityDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:server-network" title={copy.haTitle}>
          <DistributionPie items={specifics.haDistribution} total={total} copy={copy} />
        </ChartPanel>
      </section>
    );
  }
  if (family === "switch") {
    return (
      <section className={styles.chartGrid}>
        <ChartPanel icon="mdi:power-plug" title={copy.poeTitle}>
          <DistributionPie items={specifics.poeDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:cog-outline" title={copy.manageableTitle}>
          <DistributionPie items={specifics.manageableDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:layers-triple" title={copy.stackingTitle}>
          <DistributionPie items={specifics.stackDistribution} total={total} copy={copy} />
        </ChartPanel>
      </section>
    );
  }
  if (family === "wifi") {
    const assignmentTotal = Math.max(specifics.assignmentTotal, 0);
    return (
      <section className={styles.chartGrid}>
        {hasUsefulDistribution(specifics.ssidDistribution) ? (
          <ChartPanel icon="mdi:wifi" title={copy.ssidTitle}>
            <DistributionBars items={specifics.ssidDistribution} copy={copy} />
          </ChartPanel>
        ) : null}
        {assignmentTotal > 0 && hasUsefulDistribution(specifics.typeDistribution) ? (
          <ChartPanel icon="mdi:account-group-outline" title={copy.ssidTypeTitle}>
            <DistributionPie items={specifics.typeDistribution} total={assignmentTotal} copy={copy} />
          </ChartPanel>
        ) : null}
        {assignmentTotal > 0 && hasUsefulDistribution(specifics.bandDistribution) ? (
          <ChartPanel icon="mdi:access-point" title={copy.ssidBandTitle}>
            <DistributionPie items={specifics.bandDistribution} total={assignmentTotal} copy={copy} />
          </ChartPanel>
        ) : null}
        {hasUsefulDistribution(specifics.poeDistribution) ? (
          <ChartPanel icon="mdi:power-plug" title={copy.poeTitle}>
            <DistributionPie items={specifics.poeDistribution} total={total} copy={copy} />
          </ChartPanel>
        ) : null}
      </section>
    );
  }
  if (family === "router") {
    return (
      <section className={styles.chartGrid}>
        <ChartPanel icon="mdi:router-wireless" title={copy.routerTypeTitle}>
          <DistributionPie items={specifics.typeDistribution} total={total} copy={copy} />
        </ChartPanel>
      </section>
    );
  }
  if (family === "power") {
    return (
      <section className={styles.chartGrid}>
        <ChartPanel icon="mdi:battery-charging" title={copy.upsTypeTitle}>
          <DistributionPie items={specifics.typeDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:flash" title={copy.vaTitle}>
          <DistributionPie items={specifics.vaDistribution} total={total} copy={copy} />
        </ChartPanel>
      </section>
    );
  }
  if (family === "toip") {
    return (
      <section className={styles.chartGrid}>
        <ChartPanel icon="mdi:phone-voip" title={copy.toipTypeTitle}>
          <DistributionPie items={specifics.typeDistribution} total={total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:web" title={copy.sipDomainTitle}>
          <DistributionPie items={specifics.domainDistribution} total={total} copy={copy} />
        </ChartPanel>
      </section>
    );
  }
  return null;
}

function SpecificKpis({ family, specifics, copy }) {
  if (!specifics) return null;
  if (family === "internet") {
    return (
      <>
        <KpiCard icon="mdi:speedometer" label={copy.avgDebit} value={specifics.avgDebitMbps != null ? `${specifics.avgDebitMbps} Mbps` : "-"} sub={specifics.avgUploadMbps != null ? `${copy.avgUpload}: ${specifics.avgUploadMbps} Mbps` : undefined} />
        <KpiCard icon="mdi:domain" label={copy.uniqueProviders} value={specifics.uniqueProviders} />
        <KpiCard icon="mdi:server-network" label={copy.haEnabled} value={specifics.haEnabled} />
      </>
    );
  }
  if (family === "firewalls") {
    return (
      <>
        <KpiCard icon="mdi:certificate-outline" label={copy.licensed} value={specifics.licensed} />
        <KpiCard icon="mdi:server-network" label={copy.haEnabled} value={specifics.haEnabled} />
      </>
    );
  }
  if (family === "servers") {
    return (
      <>
        <KpiCard icon="mdi:server" label={copy.physicalServers} value={specifics.physical} />
        <KpiCard icon="mdi:cloud-outline" label={copy.virtualServers} value={specifics.virtual} />
      </>
    );
  }
  if (family === "storage") {
    return (
      <>
        <KpiCard icon="mdi:database" label={copy.totalCapacity} value={formatGb(specifics.totalCapacityGb)} />
        <KpiCard icon="mdi:harddisk" label={copy.disks} value={specifics.diskCount} />
      </>
    );
  }
  if (family === "switch") {
    return (
      <>
        <KpiCard icon="mdi:power-plug" label={copy.poeCount} value={specifics.poeCount} />
        <KpiCard icon="mdi:cog-outline" label={copy.manageableCount} value={specifics.manageableCount} />
      </>
    );
  }
  if (family === "wifi") {
    return (
      <>
        <KpiCard icon="mdi:wifi" label={copy.ssidUnique} value={specifics.uniqueSsidCount} sub={`${specifics.assignmentTotal} ${copy.ssidAssigned.toLowerCase()}`} />
        <KpiCard icon="mdi:access-point" label={copy.ssidAvg} value={specifics.avgPerAp} sub={`${specifics.emptyApCount} ${copy.ssidEmpty.toLowerCase()}`} tone={specifics.emptyApCount > 0 ? "warn" : "good"} />
        <KpiCard icon="mdi:format-list-bulleted" label={copy.ssidCatalog} value={specifics.catalogCount} />
        <KpiCard icon="mdi:login-variant" label={copy.captivePortal} value={specifics.captivePortalCount} />
      </>
    );
  }
  if (family === "power") {
    return (
      <>
        <KpiCard icon="mdi:flash" label={copy.totalVa} value={specifics.totalVa != null ? `${specifics.totalVa} VA` : "-"} sub={specifics.totalW != null ? `${specifics.totalW} W` : undefined} />
        <KpiCard icon="mdi:power-socket-eu" label={copy.outlets} value={specifics.outletCount} />
        <KpiCard icon="mdi:battery-alert" label={copy.batteryAging} value={specifics.batteryAging} tone={specifics.batteryAging > 0 ? "warn" : "good"} />
      </>
    );
  }
  if (family === "toip") {
    return (
      <>
        <KpiCard icon="mdi:dialpad" label={copy.extensions} value={specifics.extensionCount} />
        <KpiCard icon="mdi:cog-outline" label={copy.manageableCount} value={specifics.manageableCount} />
      </>
    );
  }
  return null;
}

export default function EquipmentFamilyStatsView({
  items = [],
  familyType,
  clientSsids = []
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentFamilyStatsCopy(locale), [locale]);
  const stats = useMemo(
    () => buildEquipmentFamilyStats(items, familyType, { clientSsids }),
    [items, familyType, clientSsids]
  );
  const common = stats.common;
  if (!common.total) {
    return (
      <StatsDashboardBody>
        <p className={styles.emptyHint}>{copy.emptyFleet}</p>
      </StatsDashboardBody>
    );
  }
  const warrantyTone = common.warranty.expired > 0 ? "bad" : common.warranty.soon > 0 ? "warn" : "good";
  return (
    <StatsDashboardBody>
      <section className={styles.kpiGrid}>
        <KpiCard icon="mdi:devices" label={copy.total} value={common.total} />
        <KpiCard
          icon="mdi:check-circle-outline"
          label={copy.active}
          value={`${common.activePct}%`}
          sub={interpolate(copy.activeSub, { active: String(common.active), inactive: String(common.inactive) })}
          tone={common.activePct >= 90 ? "good" : common.activePct >= 70 ? "warn" : "bad"}
        />
        <KpiCard
          icon="mdi:eye-outline"
          label={copy.monitored}
          value={`${common.monitoredPct}%`}
          sub={interpolate(copy.monitoredSub, { monitored: String(common.monitored), unmonitored: String(common.unmonitored) })}
          tone={common.monitoredPct >= 70 ? "good" : common.monitoredPct > 0 ? "warn" : "neutral"}
        />
        <KpiCard
          icon="mdi:shield-half-full"
          label={copy.warrantyKpi}
          value={common.warrantyOkPct != null ? `${common.warrantyOkPct}%` : "-"}
          sub={interpolate(copy.warrantyKpiSub, { expired: String(common.warranty.expired), soon: String(common.warranty.soon) })}
          tone={common.warrantyOkPct == null ? "neutral" : warrantyTone}
        />
        <SpecificKpis family={stats.family} specifics={stats.specifics} copy={copy} />
      </section>

      <section className={`${styles.insightGrid} ${styles.insightGridAuto}`}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>
            <Icon icon="mdi:shield-half-full" aria-hidden />
            {copy.warrantyTitle}
          </h3>
          <div className={styles.statusGrid}>
            <div className={`${styles.statusCard} ${styles.statusGood}`}>
              <span className={styles.statusCount}>{common.warranty.ok}</span>
              <span className={styles.statusLabel}>{copy.warrantyOk}</span>
            </div>
            <div className={`${styles.statusCard} ${styles.statusInfo}`}>
              <span className={styles.statusCount}>{common.warranty.soon}</span>
              <span className={styles.statusLabel}>{copy.warrantySoon}</span>
            </div>
            <div className={`${styles.statusCard} ${styles.statusBad}`}>
              <span className={styles.statusCount}>{common.warranty.expired}</span>
              <span className={styles.statusLabel}>{copy.warrantyExpired}</span>
            </div>
            <div className={`${styles.statusCard} ${styles.statusMuted}`}>
              <span className={styles.statusCount}>{common.warranty.unknown}</span>
              <span className={styles.statusLabel}>{copy.warrantyUnknown}</span>
            </div>
          </div>
        </article>
        {stats.family === "wifi" && hasUsefulDistribution(stats.specifics?.ssidDistribution) ? (
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:wifi" aria-hidden />
              {copy.ssidListTitle}
            </h3>
            <ul className={styles.metricList}>
              {localizeItems(stats.specifics.ssidDistribution, copy).slice(0, 8).map(entry => (
                <li key={entry.name}>
                  <span>{entry.name}</span>
                  <strong>{entry.count}</strong>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </section>

      <section className={styles.chartGrid}>
        <ChartPanel icon="mdi:factory" title={copy.brandsTitle}>
          <DistributionPie items={common.brandDistribution} total={common.total} copy={copy} />
        </ChartPanel>
        <ChartPanel icon="mdi:shape-outline" title={copy.modelsTitle}>
          <DistributionPie items={common.modelDistribution} total={common.total} copy={copy} />
        </ChartPanel>
        {hasUsefulDistribution(common.siteDistribution) ? (
          <ChartPanel icon="mdi:map-marker-outline" title={copy.sitesTitle}>
            <DistributionPie items={common.siteDistribution} total={common.total} copy={copy} />
          </ChartPanel>
        ) : null}
        {hasUsefulDistribution(common.firmwareDistribution) ? (
          <ChartPanel icon="mdi:chip" title={copy.firmwareTitle}>
            <DistributionBars items={common.firmwareDistribution} copy={copy} />
          </ChartPanel>
        ) : null}
      </section>

      <SpecificCharts family={stats.family} specifics={stats.specifics} total={common.total} copy={copy} />
    </StatsDashboardBody>
  );
}
