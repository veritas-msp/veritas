import { useMemo } from "react";
import moment from "moment";
import { Calendar } from "react-big-calendar";
import pageStyles from "./PlanningPage.module.css";
import PlanningMonthDateHeader from "./PlanningMonthDateHeader";
import { createPlanningMonthWeekWrapper, createPlanningMonthDateCellWrapper, filterEventsForMonth } from "./planningMonthView";
export default function PlanningMultiMonthView({
  currentDate,
  monthsShown,
  events,
  localizer,
  calendarHeight,
  EventComponent,
  eventPropGetter,
  onSelectSlot,
  onNavigate,
  onMonthEventDrop,
  onMonthEventResize,
  calendarMessages,
  culture = "fr"
}) {
  const monthDates = useMemo(() => Array.from({
    length: monthsShown
  }, (_, index) => moment(currentDate).add(index, "months").toDate()), [currentDate, monthsShown]);
  const monthCalendars = useMemo(() => monthDates.map(monthDate => ({
    monthDate,
    monthEvents: filterEventsForMonth(events, monthDate),
    weekWrapper: createPlanningMonthWeekWrapper(monthDate),
    dateCellWrapper: createPlanningMonthDateCellWrapper(monthDate, onMonthEventDrop)
  })), [monthDates, events, onMonthEventDrop]);
  return <div className={pageStyles.multiMonthRow} data-months={monthsShown}>
      {monthCalendars.map(({
      monthDate,
      monthEvents,
      weekWrapper,
      dateCellWrapper
    }, index) => <div key={index} className={pageStyles.calendarMonthWrapper}>
          {monthsShown > 1 ? <div className={pageStyles.calendarMonthTitle}>
              {moment(monthDate).format("MMMM YYYY").replace(/^./, c => c.toUpperCase())}
            </div> : null}
          <Calendar localizer={localizer} events={monthEvents} startAccessor="start" endAccessor="end" view="month" date={monthDate} toolbar={false} selectable={Boolean(onSelectSlot)} drilldownView={null} popup onNavigate={onNavigate} onSelectSlot={onSelectSlot} tooltipAccessor={() => ""} style={{
        height: monthsShown === 1 ? "100%" : calendarHeight,
        minHeight: monthsShown === 1 ? undefined : calendarHeight
      }} eventPropGetter={eventPropGetter} components={{
        event: props => <EventComponent {...props} nativeMonthDrag onMonthEventResize={onMonthEventResize} />,
        toolbar: () => null,
        dateHeader: PlanningMonthDateHeader,
        weekWrapper,
        dateCellWrapper
      }} messages={calendarMessages} culture={culture} />
        </div>)}
    </div>;
}
