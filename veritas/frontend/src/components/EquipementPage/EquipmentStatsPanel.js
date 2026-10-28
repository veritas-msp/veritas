import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import styles from "./EquipmentDetailPage.module.css";
import EquipmentDateRangeFilter from "./EquipmentDateRangeFilter";

const STATUS_KEYS = ["new", "in_progress", "pending", "resolved", "closed"];
const PRIORITY_KEYS = ["urgent", "high", "normal", "low"];

export default function EquipmentStatsPanel({
  copy,
  loading,
  activity,
  datePreset,
  onDatePresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  embedded = false
}) {
  const stats = activity?.stats || {};
  const ticketKpis = useMemo(
    () => [
      {
        key: "ticketsTotal",
        label: copy.stats.kpiTicketsTotal,
        value: stats.ticketsTotal ?? 0,
        icon: "mdi:ticket-outline",
        tone: "blue"
      },
      {
        key: "ticketsOpen",
        label: copy.stats.kpiTicketsOpen,
        value: stats.ticketsOpen ?? 0,
        icon: "mdi:ticket-account",
        tone: "amber"
      },
      {
        key: "eventsTotal",
        label: copy.stats.kpiEventsTotal,
        value: stats.eventsTotal ?? 0,
        icon: "mdi:calendar-multiselect",
        tone: "violet"
      }
    ],
    [copy.stats, stats]
  );

  const rootClass = embedded
    ? `${styles.activityEmbeddedSection} ${styles.activityStatsSection}`.trim()
    : enterpriseDetailStyles.panel;

  return (
    <section className={rootClass}>
      {!embedded ? (
        <header className={enterpriseDetailStyles.panelHeader}>
          <div>
            <h2 className={enterpriseDetailStyles.panelTitle}>
              <Icon icon="mdi:chart-box-outline" className={enterpriseDetailStyles.panelTitleIcon} aria-hidden />
              {copy.stats.title}
            </h2>
          </div>
        </header>
      ) : null}

      <div className={embedded ? styles.activityEmbeddedBody : enterpriseDetailStyles.panelBody}>
        <EquipmentDateRangeFilter
          copy={copy}
          preset={datePreset}
          onPresetChange={onDatePresetChange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={onCustomStartChange}
          onCustomEndChange={onCustomEndChange}
        />

        {loading ? (
          <div className={styles.loadingState}>{copy.loading}</div>
        ) : (
          <>
            <div className={styles.activityKpiGrid}>
              {ticketKpis.map(kpi => (
                <div key={kpi.key} className={`${styles.activityKpiCard} ${styles[`activityKpi_${kpi.tone}`]}`}>
                  <div className={styles.activityKpiIconWrap}>
                    <Icon icon={kpi.icon} aria-hidden />
                  </div>
                  <div className={styles.activityKpiBody}>
                    <span className={styles.activityKpiValue}>{kpi.value}</span>
                    <span className={styles.activityKpiLabel}>{kpi.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.activityStatsGrid}>
              <div className={styles.activityStatsBlock}>
                <h3 className={styles.activityStatsTitle}>{copy.stats.ticketsByStatus}</h3>
                <ul className={styles.activityStatsList}>
                  {STATUS_KEYS.map(key => (
                    <li key={key}>
                      <span>{copy.activity.status[key]}</span>
                      <strong>{stats.ticketsByStatus?.[key] ?? 0}</strong>
                    </li>
                  ))}
                </ul>
                {stats.avgResolutionHours != null ? (
                  <p className={styles.activityStatsHint}>
                    {copy.stats.avgResolution.replace("{hours}", String(stats.avgResolutionHours))}
                  </p>
                ) : null}
              </div>

              <div className={styles.activityStatsBlock}>
                <h3 className={styles.activityStatsTitle}>{copy.stats.ticketsByPriority}</h3>
                <ul className={styles.activityStatsList}>
                  {PRIORITY_KEYS.map(key => (
                    <li key={key}>
                      <span>{copy.activity.priority[key]}</span>
                      <strong>{stats.ticketsByPriority?.[key] ?? 0}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.activityStatsBlock}>
                <h3 className={styles.activityStatsTitle}>{copy.stats.eventsBreakdown}</h3>
                <ul className={styles.activityStatsList}>
                  <li>
                    <span>{copy.stats.eventsPast}</span>
                    <strong>{stats.eventsPast ?? 0}</strong>
                  </li>
                  <li>
                    <span>{copy.stats.eventsUpcomingLabel}</span>
                    <strong>{stats.eventsUpcoming ?? 0}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
