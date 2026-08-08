import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { buildPortalOverview } from "./clientPortalOverview";
import styles from "./ClientDashboardOverview.module.css";
function OverviewTile({
  to,
  subscribed,
  active,
  icon,
  label,
  children,
  className = ""
}) {
  const body = <div className={`${styles.tile} ${subscribed ? styles.tileSubscribed : styles.tileInactive} ${active ? styles.tileActive : ""} ${className}`.trim()}>
      <div className={styles.tileIconWrap}>
        <Icon icon={icon} aria-hidden />
      </div>
      <div className={styles.tileBody}>{children}</div>
    </div>;
  if (to && subscribed) {
    return <Link to={to} className={styles.tileLink}>
        {body}
      </Link>;
  }
  return body;
}
function formatCloudSummary(summary, copy) {
  if (!summary) return null;
  switch (summary.key) {
    case "licenseCount":
      return summary.count > 1 ? interpolate(copy.cloudSummaryLicensesMany, {
        count: String(summary.count)
      }) : interpolate(copy.cloudSummaryLicensesOne, {
        count: String(summary.count)
      });
    case "userCount":
      return summary.count > 1 ? interpolate(copy.cloudSummaryUsersMany, {
        count: String(summary.count)
      }) : interpolate(copy.cloudSummaryUsersOne, {
        count: String(summary.count)
      });
    case "serviceCount":
      return summary.count > 1 ? interpolate(copy.cloudSummaryServicesMany, {
        count: String(summary.count)
      }) : interpolate(copy.cloudSummaryServicesOne, {
        count: String(summary.count)
      });
    case "products":
      return summary.products.join(" · ");
    case "backupSummary":
      if (summary.instances > 0 && summary.jobs > 0) {
        return interpolate(copy.cloudSummaryBackup, {
          instances: String(summary.instances),
          jobs: String(summary.jobs)
        });
      }
      return summary.count > 1 ? interpolate(copy.cloudSummaryServicesMany, {
        count: String(summary.count)
      }) : interpolate(copy.cloudSummaryServicesOne, {
        count: String(summary.count)
      });
    default:
      return null;
  }
}
export default function ClientDashboardOverview({
  data,
  copy,
  mappedComputers = []
}) {
  const t = copy.dashboard;
  const overview = buildPortalOverview({
    ...data,
    mappedComputers
  }, copy);
  const {
    workstations,
    infraTypes,
    cloudTypes,
    infraDeviceTotal,
    infraMonitoredTotal
  } = overview;
  return <div className={styles.overviewRoot}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t.overviewInfraEyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.overviewInfraTitle}</h2>
          </div>
          <Link to="/client/devices" className={styles.sectionLink}>
            {t.seeDevices}
            <Icon icon="mdi:arrow-right" aria-hidden />
          </Link>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroValue}>{infraDeviceTotal + workstations.total}</span>
            <span className={styles.heroLabel}>{t.overviewTotalDevices}</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroValue}>{workstations.rmmManaged}</span>
            <span className={styles.heroLabel}>{t.overviewRmmWorkstations}</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroValue}>{infraMonitoredTotal + workstations.monitored}</span>
            <span className={styles.heroLabel}>{t.overviewMonitoredTotal}</span>
          </div>
        </div>

        <div className={styles.tileGrid}>
          <OverviewTile to="/client/devices" subscribed={workstations.subscribed} active={workstations.total > 0} icon="mdi:laptop" label={copy.overviewCatalog.workstations} className={styles.tileWide}>
            <span className={styles.tileLabel}>{copy.overviewCatalog.workstations}</span>
            <span className={styles.tileValue}>{workstations.total}</span>
            <span className={styles.tileMeta}>
              {workstations.total > 0 ? interpolate(t.overviewWorkstationsRmm, {
              rmm: String(workstations.rmmManaged),
              total: String(workstations.total)
            }) : t.notSubscribed}
            </span>
          </OverviewTile>

          {infraTypes.map(entry => <OverviewTile key={entry.type} to="/client/devices" subscribed={entry.subscribed} active={entry.count > 0} icon={entry.icon} label={entry.label}>
              <span className={styles.tileLabel}>{entry.label}</span>
              <span className={styles.tileValue}>{entry.subscribed ? entry.count : "—"}</span>
              <span className={styles.tileMeta}>
                {!entry.subscribed ? t.notSubscribed : entry.count > 0 ? entry.monitoredCount > 0 ? interpolate(t.overviewMonitoredCount, {
              count: String(entry.monitoredCount)
            }) : t.overviewNoMonitored : t.overviewEnabledEmpty}
              </span>
            </OverviewTile>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t.overviewCloudEyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.overviewCloudTitle}</h2>
          </div>
          <Link to="/client/services" className={styles.sectionLink}>
            {t.seeServices}
            <Icon icon="mdi:arrow-right" aria-hidden />
          </Link>
        </div>

        <div className={styles.tileGrid}>
          {cloudTypes.map(entry => {
          const summaryText = formatCloudSummary(entry.summary, copy.dashboard);
          return <OverviewTile key={entry.type} to="/client/services" subscribed={entry.subscribed} active={entry.active} icon={entry.icon} label={entry.label}>
                <span className={styles.tileLabel}>{entry.label}</span>
                <span className={styles.tileValue}>{entry.subscribed && entry.count > 0 ? entry.count : "—"}</span>
                <span className={styles.tileMeta}>
                  {!entry.subscribed ? t.notSubscribed : summaryText || (entry.count > 0 ? t.overviewActive : t.overviewEnabledEmpty)}
                </span>
                {entry.subscribed && entry.expiration ? <span className={styles.tileSubMeta}>{copy.formatPortalDate(entry.expiration)}</span> : null}
              </OverviewTile>;
        })}
        </div>
      </section>
    </div>;
}
