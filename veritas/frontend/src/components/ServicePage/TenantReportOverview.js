import React from "react";
import { Icon } from "@iconify/react";
import styles from "./TenantDetailPage.module.css";
import { formatTenantFinding } from "./tenantDetailPageI18n";

const CATEGORY_ICONS = {
  identity: "mdi:account-multiple",
  licenses: "mdi:license",
  security: "mdi:shield-check",
  mail: "simple-icons:microsoftexchange",
  collab: "mdi:microsoft-sharepoint",
  adoption: "mdi:chart-line"
};

function StatusBadge({ status, copy }) {
  return <span className={`${styles.reportBadge} ${styles[`reportBadge_${status}`] || ""}`}>
      {copy.status[status] || status}
    </span>;
}

function formatKpi(value, suffix = "") {
  if (value == null || value === "") return "—";
  return `${value}${suffix}`;
}

export default function TenantReportOverview({
  report,
  copy,
  onOpenTab
}) {
  if (!report) return null;
  const {
    globalStatus,
    kpis,
    categories
  } = report;
  const licenseLabel = kpis.licensesUsed != null && kpis.licensesTotal != null
    ? `${kpis.licensesUsed} / ${kpis.licensesTotal}`
    : "—";

  return <div className={styles.report}>
      <section className={styles.reportIntro}>
        <div className={styles.reportIntroHead}>
          <div>
            <h2 className={styles.reportTitle}>{copy.report.title}</h2>
            <p className={styles.reportSubtitle}>{copy.report.subtitle}</p>
          </div>
          <StatusBadge status={globalStatus} copy={copy} />
        </div>
        <div className={styles.reportKpis}>
          <div className={styles.reportKpi}>
            <div className={styles.reportKpiLabel}>{copy.report.globalKpi}</div>
            <div className={styles.reportKpiValue}>
              <StatusBadge status={globalStatus} copy={copy} />
            </div>
          </div>
          <div className={styles.reportKpi}>
            <div className={styles.reportKpiLabel}>{copy.report.users}</div>
            <div className={styles.reportKpiValue}>{formatKpi(kpis.users)}</div>
          </div>
          <div className={styles.reportKpi}>
            <div className={styles.reportKpiLabel}>{copy.report.licenses}</div>
            <div className={styles.reportKpiValue}>{licenseLabel}</div>
          </div>
          <div className={styles.reportKpi}>
            <div className={styles.reportKpiLabel}>{copy.report.secureScore}</div>
            <div className={styles.reportKpiValue}>{kpis.secureScore != null ? `${Math.round(kpis.secureScore)} %` : "—"}</div>
          </div>
          <div className={styles.reportKpi}>
            <div className={styles.reportKpiLabel}>{copy.report.mfa}</div>
            <div className={styles.reportKpiValue}>{kpis.mfaCoverage != null ? `${kpis.mfaCoverage} %` : "—"}</div>
          </div>
        </div>
      </section>

      <div className={styles.reportGrid}>
        {categories.map((category) => {
          const clickable = Boolean(category.tab);
          const Tag = clickable ? "button" : "div";
          return <Tag key={category.id} type={clickable ? "button" : undefined} className={`${styles.reportCard} ${clickable ? styles.reportCardClickable : ""}`} onClick={clickable ? () => onOpenTab(category.tab) : undefined}>
              <div className={styles.reportCardHead}>
                <div className={styles.reportCardTitleWrap}>
                  <span className={styles.reportCardIcon} aria-hidden>
                    <Icon icon={CATEGORY_ICONS[category.id] || "mdi:shape"} />
                  </span>
                  <h3 className={styles.reportCardTitle}>{copy.categories[category.id]}</h3>
                </div>
                <StatusBadge status={category.status} copy={copy} />
              </div>
              <div className={styles.reportMetrics}>
                {category.metrics.map((item) => <div key={item.key} className={styles.reportMetric}>
                    <div className={styles.reportMetricLabel}>{copy.metrics[item.key] || item.key}</div>
                    <div className={styles.reportMetricValue}>{item.value}</div>
                  </div>)}
              </div>
              <ul className={styles.reportFindings}>
                {category.findings.slice(0, 3).map((item) => <li key={item.key}>{formatTenantFinding(copy, item)}</li>)}
              </ul>
            </Tag>;
        })}
      </div>
    </div>;
}
