import moment from "moment";
export const AGENDA_TYPE_LABELS = {
  intervention: "Intervention",
  presentation: "Presentation",
  maintenance_preventive: "Preventive maintenance",
  maintenance: "Maintenance",
  mise_a_jour: "Update",
  conge: "Leave",
  campagne: "Campagne",
  integration_monitoring: "Monitoring",
  other: "Other"
};
export function getAgendaWeekRange(currentDate) {
  const anchor = moment(currentDate);
  return {
    weekStart: anchor.clone().startOf("week"),
    weekEnd: anchor.clone().endOf("week")
  };
}
function inferAllDay(event) {
  if (event.schedule?.allDay === true) return true;
  if (event.schedule?.allDay === false) return false;
  if (!event.start || !event.end) return false;
  const start = moment(event.start);
  const end = moment(event.end);
  return start.format("HH:mm") === "00:00" && (end.format("HH:mm") === "23:59" || end.format("HH:mm") === "00:00");
}
export function formatAgendaTimeLabel(event, dayMoment, timeCopy = {}) {
  const labels = {
    allDay: "All day",
    startUntil: "Start · until {date}",
    endSince: "End · since {date}",
    endsAt: "→ {time}",
    startsAt: "{time} →",
    range: "{start} – {end}",
    ...timeCopy
  };
  const interpolate = (template, params) => String(template).replace(/\{(\w+)\}/g, (_, key) => params[key] != null ? String(params[key]) : `{${key}}`);
  if (!event?.start || !event?.end) return "-";
  const allDay = inferAllDay(event);
  const dayStart = dayMoment.clone().startOf("day");
  const dayEnd = dayMoment.clone().endOf("day");
  const eventStart = moment(event.start);
  const eventEnd = moment(event.end);
  if (allDay) {
    const sameDay = eventStart.isSame(eventEnd, "day");
    if (sameDay) return labels.allDay;
    if (eventStart.isSame(dayMoment, "day")) {
      return interpolate(labels.startUntil, {
        date: eventEnd.format("D MMM")
      });
    }
    if (eventEnd.isSame(dayMoment, "day")) {
      return interpolate(labels.endSince, {
        date: eventStart.format("D MMM")
      });
    }
    return labels.allDay;
  }
  const startsBeforeDay = eventStart.isBefore(dayStart);
  const endsAfterDay = eventEnd.isAfter(dayEnd);
  if (startsBeforeDay && endsAfterDay) return labels.allDay;
  if (startsBeforeDay && !endsAfterDay) {
    return interpolate(labels.endsAt, {
      time: eventEnd.format("HH:mm")
    });
  }
  if (!startsBeforeDay && endsAfterDay) {
    return interpolate(labels.startsAt, {
      time: eventStart.format("HH:mm")
    });
  }
  if (eventStart.isSame(eventEnd, "minute")) {
    return eventStart.format("HH:mm");
  }
  return interpolate(labels.range, {
    start: eventStart.format("HH:mm"),
    end: eventEnd.format("HH:mm")
  });
}
function eventOverlapsDay(event, dayMoment) {
  if (!event?.start || !event?.end) return false;
  const dayStart = dayMoment.clone().startOf("day");
  const dayEnd = dayMoment.clone().endOf("day");
  const eventStart = moment(event.start);
  const eventEnd = moment(event.end);
  return eventStart.isBefore(dayEnd) && eventEnd.isAfter(dayStart);
}
export function buildAgendaDayGroups(events, currentDate, {
  locale = "fr",
  agendaTime = {}
} = {}) {
  const {
    weekStart,
    weekEnd
  } = getAgendaWeekRange(currentDate);
  const today = moment().startOf("day");
  const groups = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = weekStart.clone().add(offset, "days");
    const dayEvents = events.filter(event => eventOverlapsDay(event, day)).sort((a, b) => {
      const startDiff = moment(a.start).valueOf() - moment(b.start).valueOf();
      if (startDiff !== 0) return startDiff;
      return (a.title || "").localeCompare(b.title || "", locale);
    }).map(event => ({
      event,
      timeLabel: formatAgendaTimeLabel(event, day, agendaTime),
      allDay: inferAllDay(event)
    }));
    groups.push({
      date: day.toDate(),
      dateKey: day.format("YYYY-MM-DD"),
      label: day.format("dddd D MMMM"),
      isToday: day.isSame(today, "day"),
      isWeekend: day.day() === 0 || day.day() === 6,
      events: dayEvents
    });
  }
  const visibleGroups = groups.filter(group => group.events.length > 0);
  const totalEvents = visibleGroups.reduce((sum, group) => sum + group.events.length, 0);
  return {
    weekStart,
    weekEnd,
    groups: visibleGroups,
    totalEvents,
    hasEvents: totalEvents > 0
  };
}
