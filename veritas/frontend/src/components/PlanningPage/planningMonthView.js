import moment from "moment";
import { PLANNING_EVENT_DRAG_MIME } from "./planningEventMove";
import styles from "./PlanningPage.module.css";
export function filterEventsForMonth(events, monthDate) {
  const monthStart = moment(monthDate).startOf("month");
  const monthEnd = moment(monthDate).endOf("month");
  return events.filter(event => {
    const start = moment(event.start);
    const end = moment(event.end ?? event.start);
    return start.isSameOrBefore(monthEnd, "day") && end.isSameOrAfter(monthStart, "day");
  });
}
export function createPlanningMonthWeekWrapper(monthDate) {
  const monthStart = moment(monthDate).startOf("month");
  function PlanningMonthWeekWrapper({
    children,
    slotMetrics
  }) {
    const range = slotMetrics?.range || [];
    return <div className={styles.monthWeekWrap}>
        {children}
        <div className={styles.offRangeMaskRow} aria-hidden>
          {range.map((day, index) => {
          if (moment(day).isSame(monthStart, "month")) return null;
          return <div key={+day} className={styles.offRangeMaskCell} style={{
            left: `${index / 7 * 100}%`,
            width: `${100 / 7}%`
          }} />;
        })}
        </div>
      </div>;
  }
  return PlanningMonthWeekWrapper;
}
export function createPlanningMonthDateCellWrapper(monthDate, onEventDrop) {
  const monthStart = moment(monthDate).startOf("month");
  function PlanningMonthDateCellWrapper({
    value,
    children
  }) {
    const isOffRange = !moment(value).isSame(monthStart, "month");
    const handleDragOver = event => {
      if (isOffRange) return;
      const types = Array.from(event.dataTransfer?.types || []);
      if (!types.includes(PLANNING_EVENT_DRAG_MIME)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      event.currentTarget.setAttribute("data-drag-over", "true");
    };
    const handleDragLeave = event => {
      event.currentTarget.removeAttribute("data-drag-over");
    };
    const handleDrop = event => {
      event.currentTarget.removeAttribute("data-drag-over");
      if (isOffRange) return;
      event.preventDefault();
      event.stopPropagation();
      const eventId = event.dataTransfer.getData(PLANNING_EVENT_DRAG_MIME);
      if (!eventId || !onEventDrop) return;
      onEventDrop(eventId, value);
    };
    return <div className={styles.monthDayDropCell} data-off-range={isOffRange ? "true" : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {children}
      </div>;
  }
  return PlanningMonthDateCellWrapper;
}
