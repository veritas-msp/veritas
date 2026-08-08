import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import styles from "./EquipmentDetailPage.module.css";
import specsStyles from "./EquipmentDetailSpecsPanel.module.css";
import EquipmentDateRangeFilter from "./EquipmentDateRangeFilter";
import { getEquipmentDetailTypeLabel, formatEquipmentDetailRelative } from "./equipmentDetailPageI18n";
const STATUS_KEYS = ["new", "in_progress", "pending", "resolved", "closed"];
const PRIORITY_KEYS = ["urgent", "high", "normal", "low"];
export default function EquipmentStatsPanel({
  copy,
  locale,
  equipment,
  loading,
  activity,
  datePreset,
  onDatePresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  alertSettings,
  rmmManaged
}) {
  const stats = activity?.stats || {};
  const typeLabel = getEquipmentDetailTypeLabel(equipment, locale);
  const ticketKpis = useMemo(() => [{
    key: "ticketsTotal",
    label: copy.stats.kpiTicketsTotal,
    value: stats.ticketsTotal ?? 0,
    icon: "mdi:ticket-outline",
    tone: "blue"
  }, {
    key: "ticketsOpen",
    label: copy.stats.kpiTicketsOpen,
    value: stats.ticketsOpen ?? 0,
    icon: "mdi:ticket-account",
    tone: "amber"
  }, {
    key: "eventsTotal",
    label: copy.stats.kpiEventsTotal,
    value: stats.eventsTotal ?? 0,
    icon: "mdi:calendar-multiselect",
    tone: "violet"
  }, {
    key: "eventsUpcoming",
    label: copy.stats.kpiEventsUpcoming,
    value: stats.eventsUpcoming ?? 0,
    icon: "mdi:calendar-clock",
    tone: "green"
  }], [copy.stats, stats]);
  const deviceFacts = useMemo(() => {
    const rows = [{
      label: copy.stats.deviceType,
      value: typeLabel || "-"
    }, {
      label: copy.fields.name,
      value: equipment?.name || equipment?.rawData?.nom || "-"
    }];
    const ip = equipment?.ip || equipment?.rawData?.ip;
    if (ip) rows.push({
      label: copy.fields.ip,
      value: ip
    });
    const serial = equipment?.serial || equipment?.rawData?.numeroSerie;
    if (serial) rows.push({
      label: copy.fields.serial,
      value: serial
    });
    if (equipment?.clientName) {
      rows.push({
        label: copy.fields.clientName,
        value: equipment.clientName
      });
    }
    if (alertSettings?.alertsEnabled != null) {
      rows.push({
        label: copy.stats.alerts,
        value: alertSettings.alertsEnabled ? copy.stats.alertsOn : copy.stats.alertsOff
      });
    }
    if (rmmManaged) {
      rows.push({
        label: copy.stats.rmmManaged,
        value: copy.stats.rmmYes
      });
    }
    const lastSync = equipment?.rmmLastHeartbeat || equipment?.rawData?.rmm_last_heartbeat || equipment?.checkmkLastSyncedAt;
    if (lastSync) {
      rows.push({
        label: copy.stats.lastSync,
        value: formatEquipmentDetailRelative(lastSync, locale)
      });
    }
    return rows;
  }, [alertSettings?.alertsEnabled, copy, equipment, locale, rmmManaged, typeLabel]);
  return <section className={enterpriseDetailStyles.panel}>
      <header className={specsStyles.panelHeader}>
        <div>
          <h2 className={specsStyles.panelTitle}>
            <Icon icon="mdi:chart-box-outline" className={specsStyles.panelTitleIcon} aria-hidden />
            {copy.stats.title}
          </h2>
          <p className={specsStyles.panelSubtitle}>{copy.stats.subtitle}</p>
        </div>
      </header>

      <div className={enterpriseDetailStyles.panelBody}>
        <EquipmentDateRangeFilter copy={copy} preset={datePreset} onPresetChange={onDatePresetChange} customStart={customStart} customEnd={customEnd} onCustomStartChange={onCustomStartChange} onCustomEndChange={onCustomEndChange} />

        {loading ? <div className={styles.loadingState}>{copy.loading}</div> : <>
            <div className={styles.activityKpiGrid}>
              {ticketKpis.map(kpi => <div key={kpi.key} className={`${styles.activityKpiCard} ${styles[`activityKpi_${kpi.tone}`]}`}>
                  <div className={styles.activityKpiIconWrap}>
                    <Icon icon={kpi.icon} aria-hidden />
                  </div>
                  <div className={styles.activityKpiBody}>
                    <span className={styles.activityKpiValue}>{kpi.value}</span>
                    <span className={styles.activityKpiLabel}>{kpi.label}</span>
                  </div>
                </div>)}
            </div>

            <div className={styles.activityStatsGrid}>
              <div className={styles.activityStatsBlock}>
                <h3 className={styles.activityStatsTitle}>{copy.stats.ticketsByStatus}</h3>
                <ul className={styles.activityStatsList}>
                  {STATUS_KEYS.map(key => <li key={key}>
                      <span>{copy.activity.status[key]}</span>
                      <strong>{stats.ticketsByStatus?.[key] ?? 0}</strong>
                    </li>)}
                </ul>
                {stats.avgResolutionHours != null ? <p className={styles.activityStatsHint}>
                    {copy.stats.avgResolution.replace("{hours}", String(stats.avgResolutionHours))}
                  </p> : null}
              </div>

              <div className={styles.activityStatsBlock}>
                <h3 className={styles.activityStatsTitle}>{copy.stats.ticketsByPriority}</h3>
                <ul className={styles.activityStatsList}>
                  {PRIORITY_KEYS.map(key => <li key={key}>
                      <span>{copy.activity.priority[key]}</span>
                      <strong>{stats.ticketsByPriority?.[key] ?? 0}</strong>
                    </li>)}
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

              <div className={styles.activityStatsBlock}>
                <h3 className={styles.activityStatsTitle}>{copy.stats.deviceOverview}</h3>
                <ul className={styles.activityStatsList}>
                  {deviceFacts.map(row => <li key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </li>)}
                </ul>
              </div>
            </div>
          </>}
      </div>
    </section>;
}
