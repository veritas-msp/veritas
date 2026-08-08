import { useMemo } from "react";
import { Icon } from "@iconify/react";
import moment from "moment";
import SmartTooltip from "../SmartTooltip";
import { getPlanningEventColors } from "./planningAgentColors";
import { getPlanningEventTypeIcon, getPlanningEventTypeKey } from "./planningEventTypes";
import { getTicketTypeSupportLabel } from "../../utils/ticketReminderEvent";
import { buildAgendaDayGroups, getAgendaWeekRange } from "./planningAgendaLayout";
import pageStyles from "./PlanningPage.module.css";
import styles from "./PlanningAgendaView.module.css";
function capitalizeLabel(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function getLocalizedEventTypeLabel(event, planningTypes = []) {
  if (event?.isTicketReminder || event?.ticketId) {
    return getTicketTypeSupportLabel(event.ticketType);
  }
  const key = getPlanningEventTypeKey(event);
  const match = planningTypes.find(type => type.value === key);
  return match?.label || key;
}
function AgendaEventCard({
  item,
  renderEventPreview,
  defaultEventTitle,
  planningTypes
}) {
  const {
    event,
    timeLabel,
    allDay
  } = item;
  const {
    backgroundColor
  } = getPlanningEventColors(event);
  const typeLabel = getLocalizedEventTypeLabel(event, planningTypes);
  const typeIcon = getPlanningEventTypeIcon(event);
  const card = <button type="button" className={styles.eventCard}>
      <span className={styles.eventAccent} style={{
      backgroundColor
    }} aria-hidden />
      <div className={styles.timeCol}>
        <span className={allDay ? styles.timeLabelAllDay : styles.timeLabel}>{timeLabel}</span>
      </div>
      <div className={styles.mainCol}>
        <div className={styles.titleRow}>
          <Icon icon={typeIcon} className={styles.typeIcon} aria-hidden />
          <p className={styles.eventTitle}>{event.title || defaultEventTitle}</p>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.typeChip} style={{
          "--chip-bg": `${backgroundColor}22`,
          "--chip-fg": backgroundColor
        }}>
            {typeLabel}
          </span>
          {event.clientName ? <span className={styles.metaChip} title={event.clientName}>
              <Icon icon="mdi:domain" className={styles.metaChipIcon} aria-hidden />
              {event.clientName}
            </span> : null}
          {event.assignedUserName ? <span className={styles.metaChip} title={event.assignedUserName}>
              <Icon icon="mdi:account" className={styles.metaChipIcon} aria-hidden />
              {event.assignedUserName}
            </span> : null}
        </div>
      </div>
    </button>;
  if (!renderEventPreview) return card;
  return <SmartTooltip trigger="click" interactive content={renderEventPreview(event)} tooltipClassName={pageStyles.eventHoverPortal} data-tooltip-position="planning-popover" as="div" className={styles.tooltipTrigger}>
      {card}
    </SmartTooltip>;
}
export default function PlanningAgendaView({
  currentDate,
  events,
  renderEventPreview,
  copy
}) {
  const agenda = useMemo(() => buildAgendaDayGroups(events, currentDate, {
    locale: copy?.locale || "fr",
    agendaTime: copy?.agendaTime
  }), [events, currentDate, copy]);
  const weekLabel = useMemo(() => {
    const {
      weekStart,
      weekEnd
    } = getAgendaWeekRange(currentDate);
    if (weekStart.isSame(weekEnd, "month")) {
      return `${weekStart.format("D")} – ${weekEnd.format("D MMMM YYYY")}`;
    }
    if (weekStart.isSame(weekEnd, "year")) {
      return `${weekStart.format("D MMMM")} – ${weekEnd.format("D MMMM YYYY")}`;
    }
    return `${weekStart.format("D MMMM YYYY")} – ${weekEnd.format("D MMMM YYYY")}`;
  }, [currentDate]);
  return <div className={styles.wrap}>
      <div className={styles.summaryBar}>
        <span>
          {copy?.agenda?.weekOf || "Week of"}{" "}
          <strong>{capitalizeLabel(weekLabel)}</strong>
        </span>
        <span className={styles.summaryCount}>
          {copy?.formatAgendaEventCount ? copy.formatAgendaEventCount(agenda.totalEvents) : `${agenda.totalEvents} event${agenda.totalEvents > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className={styles.scrollArea}>
        {!agenda.hasEvents ? <div className={styles.emptyState}>
            <Icon icon="mdi:calendar-blank-outline" className={styles.emptyIcon} aria-hidden />
            <p className={styles.emptyTitle}>
              {copy?.agenda?.emptyTitle || "No events this week"}
            </p>
            <p className={styles.emptyHint}>
              {copy?.agenda?.emptyHint || "Adjust assignee or type filters, or navigate to another week using the calendar arrows."}
            </p>
          </div> : agenda.groups.map(group => <section key={group.dateKey} className={styles.daySection} aria-label={group.label}>
              <div className={styles.dayHeader}>
                <h3 className={`${styles.dayTitle} ${group.isToday ? styles.dayTitleToday : ""}`}>
                  {capitalizeLabel(group.label)}
                </h3>
                {group.isToday ? <span className={styles.dayBadgeToday}>
                    {copy?.agenda?.today || "Today"}
                  </span> : group.isWeekend ? <span className={styles.dayBadgeWeekend}>
                    {copy?.agenda?.weekend || "Weekend"}
                  </span> : null}
              </div>
              <div className={styles.eventList}>
                {group.events.map(item => <AgendaEventCard key={`${group.dateKey}-${item.event.id}-${moment(item.event.start).format("HHmm")}`} item={item} renderEventPreview={renderEventPreview} defaultEventTitle={copy?.defaults?.event || "Event"} planningTypes={copy?.planningTypes || []} />)}
              </div>
            </section>)}
      </div>
    </div>;
}
