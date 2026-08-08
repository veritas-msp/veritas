import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import styles from "./EquipmentDetailPage.module.css";
import EquipmentDateRangeFilter from "./EquipmentDateRangeFilter";
import { buildActivityFeedItems, getLocaleDateTimeFormat } from "./equipmentActivityUtils";
function ActivityKindBadge({
  kind,
  copy
}) {
  const isTicket = kind === "ticket";
  return <span className={`${styles.activityKindBadge} ${isTicket ? styles.activityKindTicket : styles.activityKindPlanning}`}>
      <Icon icon={isTicket ? "mdi:ticket-outline" : "mdi:calendar-clock"} aria-hidden />
      {isTicket ? copy?.activity?.kindTicket : copy?.activity?.kindPlanning}
    </span>;
}
function TicketStatusBadge({
  status,
  copy
}) {
  const key = String(status || "").toLowerCase() === "open" ? "new" : String(status || "").toLowerCase();
  const label = copy?.activity?.status?.[key] || status || "-";
  return <span className={`${styles.activityStatusBadge} ${styles[`activityStatus_${key}`] || ""}`}>{label}</span>;
}
export default function EquipmentEventsPanel({
  copy,
  locale,
  loading,
  activity,
  datePreset,
  onDatePresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onCreateEvent,
  onOpenPlanningEvent,
  onOpenTicket,
  isCommunity,
  proBadge,
  hideDateFilter = false
}) {
  const localeCode = getLocaleDateTimeFormat(locale);
  const feedItems = useMemo(() => buildActivityFeedItems({
    events: activity?.events,
    tickets: activity?.tickets,
    copy
  }), [activity?.events, activity?.tickets, copy]);
  const formatDate = value => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString(localeCode, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  return <section className={enterpriseDetailStyles.panel}>
      <header className={enterpriseDetailStyles.panelHeader}>
        <div className={enterpriseDetailStyles.panelHeaderMain}>
          <h2 className={enterpriseDetailStyles.panelTitle}>{copy.events.title}</h2>
        </div>
        <button type="button" className={styles.panelSectionAction} onClick={onCreateEvent}>
          <Icon icon="mdi:calendar-plus-outline" aria-hidden />
          <span className={styles.heroMenuItemLabel}>
            {copy.hero.createEvent}
            {isCommunity ? proBadge : null}
          </span>
        </button>
      </header>

      <div className={enterpriseDetailStyles.panelBody}>
        {!hideDateFilter ? <EquipmentDateRangeFilter copy={copy} preset={datePreset} onPresetChange={onDatePresetChange} customStart={customStart} customEnd={customEnd} onCustomStartChange={onCustomStartChange} onCustomEndChange={onCustomEndChange} /> : null}

        {loading ? <div className={styles.loadingState}>{copy.loading}</div> : feedItems.length === 0 ? <div className={styles.emptyState}>
            <Icon icon="mdi:calendar-outline" className={styles.emptyIcon} />
            <h5>{copy.events.emptyTitle}</h5>
            <p className={styles.emptyHint}>{copy.events.emptyHint}</p>
          </div> : <div className={enterpriseDetailStyles.dataTableWrapper}>
            <table className={enterpriseDetailStyles.dataTable}>
              <thead>
                <tr>
                  <th>{copy.activity.colKind}</th>
                  <th>{copy.events.colTitle}</th>
                  <th>{copy.activity.colStatus}</th>
                  <th>{copy.events.colDate}</th>
                </tr>
              </thead>
              <tbody>
                {feedItems.map(item => <tr key={item.id} className={styles.activityRowClickable} onClick={() => {
              if (item.kind === "ticket") onOpenTicket?.(item.raw);else onOpenPlanningEvent?.(item.raw);
            }} onKeyDown={e => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              if (item.kind === "ticket") onOpenTicket?.(item.raw);else onOpenPlanningEvent?.(item.raw);
            }} tabIndex={0} role="button">
                    <td>
                      <ActivityKindBadge kind={item.kind} copy={copy} />
                    </td>
                    <td>
                      <div className={styles.activityTitleCell}>
                        <span>{item.title}</span>
                        {item.subtitle ? <span className={styles.activitySubtitle}>{item.subtitle}</span> : null}
                      </div>
                    </td>
                    <td>
                      {item.kind === "ticket" ? <TicketStatusBadge status={item.status} copy={copy} /> : <span className={styles.activityMetaMuted}>{item.subtitle || "-"}</span>}
                    </td>
                    <td className={styles.eventMetaCell}>{formatDate(item.date)}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>
    </section>;
}
