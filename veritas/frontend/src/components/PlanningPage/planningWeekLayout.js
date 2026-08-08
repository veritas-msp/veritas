import moment from "moment";
export const WEEK_HOUR_START = 8;
export const WEEK_HOUR_END = 18;
export const WEEK_HOURS_PER_DAY = WEEK_HOUR_END - WEEK_HOUR_START;
export const WEEK_DAY_COUNT = 7;
export const WEEK_TOTAL_MINUTES = WEEK_DAY_COUNT * WEEK_HOURS_PER_DAY * 60;
export function getWeekRange(currentDate) {
  const weekStart = moment(currentDate).startOf("week");
  const weekEnd = weekStart.clone().endOf("week");
  return {
    weekStart,
    weekEnd
  };
}
export function isAllDayPlanningEvent(event) {
  if (event.schedule?.allDay === true) return true;
  if (event.schedule?.allDay === false) return false;
  if (!event.start || !event.end) return false;
  const start = moment(event.start);
  const end = moment(event.end);
  return start.format("HH:mm") === "00:00" && (end.format("HH:mm") === "23:59" || end.format("HH:mm") === "00:00" || end.diff(start, "hours") >= 23);
}
export function getEventAgentIds(event) {
  if (Array.isArray(event.assignedUserIds) && event.assignedUserIds.length > 0) {
    return event.assignedUserIds.map(id => String(id)).filter(Boolean);
  }
  if (event.assignedUserId || event._rawData?.assigned_user_id) {
    return [String(event.assignedUserId || event._rawData?.assigned_user_id)];
  }
  return [];
}
function minutesOnWeekGrid(date, weekStart) {
  const m = moment(date);
  const dayIndex = m.clone().startOf("day").diff(weekStart.clone().startOf("day"), "days");
  if (dayIndex < 0 || dayIndex >= WEEK_DAY_COUNT) return null;
  const dayCapacity = WEEK_HOURS_PER_DAY * 60;
  let minutesInDay = (m.hour() - WEEK_HOUR_START) * 60 + m.minute();
  minutesInDay = Math.max(0, Math.min(dayCapacity, minutesInDay));
  return dayIndex * dayCapacity + minutesInDay;
}
function clipTimedSegment(event, weekStart, weekEnd) {
  const rawStart = moment(event.start);
  const rawEnd = moment(event.end);
  if (!rawStart.isValid() || !rawEnd.isValid() || !rawEnd.isAfter(rawStart)) return null;
  const gridStart = weekStart.clone().hour(WEEK_HOUR_START).minute(0).second(0);
  const gridEnd = weekEnd.clone().hour(WEEK_HOUR_END).minute(0).second(0);
  const start = moment.max(rawStart, gridStart);
  const end = moment.min(rawEnd, gridEnd);
  if (!end.isAfter(start)) return null;
  let startMin = minutesOnWeekGrid(start, weekStart);
  let endMin = minutesOnWeekGrid(end, weekStart);
  if (startMin == null || endMin == null) return null;
  if (endMin <= startMin) {
    endMin = Math.min(WEEK_TOTAL_MINUTES, startMin + 30);
  }
  return {
    event,
    startMin,
    endMin,
    isAllDay: false
  };
}
function clipAllDaySegment(event, weekStart, weekEnd) {
  const rawStart = moment(event.start).startOf("day");
  const rawEnd = moment(event.end).startOf("day");
  if (!rawStart.isValid() || !rawEnd.isValid()) return null;
  const visibleStart = moment.max(rawStart, weekStart.clone().startOf("day"));
  const visibleEnd = moment.min(rawEnd, weekEnd.clone().startOf("day"));
  if (visibleEnd.isBefore(visibleStart)) return null;
  const startDay = visibleStart.diff(weekStart.clone().startOf("day"), "days");
  const endDay = visibleEnd.diff(weekStart.clone().startOf("day"), "days");
  return {
    event,
    startDay: Math.max(0, startDay),
    endDay: Math.min(WEEK_DAY_COUNT - 1, endDay),
    isAllDay: true
  };
}
export function buildWeekSegment(event, weekStart, weekEnd) {
  if (isAllDayPlanningEvent(event)) {
    return clipAllDaySegment(event, weekStart, weekEnd);
  }
  return clipTimedSegment(event, weekStart, weekEnd);
}
export function assignLanes(segments) {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const laneEnds = [];
  sorted.forEach(segment => {
    let laneIndex = laneEnds.findIndex(laneEnd => laneEnd <= segment.startMin);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[laneIndex] = segment.endMin;
    segment.lane = laneIndex;
  });
  return {
    segments: sorted,
    laneCount: Math.max(1, laneEnds.length)
  };
}
export function assignAllDayLanes(segments) {
  const sorted = [...segments].sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay);
  const laneEnds = [];
  sorted.forEach(segment => {
    let laneIndex = laneEnds.findIndex(laneEnd => laneEnd < segment.startDay);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(-1);
    }
    laneEnds[laneIndex] = segment.endDay;
    segment.lane = laneIndex;
  });
  return {
    segments: sorted,
    laneCount: Math.max(0, laneEnds.length)
  };
}
export function buildAgentWeekLayout(agentId, events, weekStart, weekEnd) {
  const timed = [];
  const allDay = [];
  events.forEach(event => {
    const agentIds = getEventAgentIds(event);
    if (!agentIds.includes(String(agentId))) return;
    const segment = buildWeekSegment(event, weekStart, weekEnd);
    if (!segment) return;
    if (segment.isAllDay) {
      allDay.push(segment);
    } else {
      timed.push(segment);
    }
  });
  const timedLayout = assignLanes(timed);
  const allDayLayout = assignAllDayLanes(allDay);
  return {
    timed: timedLayout.segments,
    timedLaneCount: timed.length ? timedLayout.laneCount : 0,
    allDay: allDayLayout.segments,
    allDayLaneCount: allDayLayout.laneCount
  };
}
export function segmentToPercentStyle(segment) {
  const left = segment.startMin / WEEK_TOTAL_MINUTES * 100;
  const width = (segment.endMin - segment.startMin) / WEEK_TOTAL_MINUTES * 100;
  return {
    left: `${left}%`,
    width: `${Math.max(width, 0.4)}%`
  };
}
export function allDaySegmentToPercentStyle(segment) {
  const left = segment.startDay / WEEK_DAY_COUNT * 100;
  const width = (segment.endDay - segment.startDay + 1) / WEEK_DAY_COUNT * 100;
  return {
    left: `${left}%`,
    width: `${Math.max(width, 100 / WEEK_DAY_COUNT)}%`
  };
}
export function weekResizeBoundsToPercentStyle(variant, startBound, endBound) {
  if (variant === "allDay") {
    return allDaySegmentToPercentStyle({
      startDay: startBound,
      endDay: endBound
    });
  }
  return segmentToPercentStyle({
    startMin: startBound,
    endMin: endBound
  });
}
export function weekGridMinutesToDate(weekStart, totalMinutes) {
  const dayCapacity = WEEK_HOURS_PER_DAY * 60;
  const clamped = Math.max(0, Math.min(WEEK_TOTAL_MINUTES, totalMinutes));
  const dayIndex = Math.floor(clamped / dayCapacity);
  const minutesInDay = clamped % dayCapacity;
  const hour = WEEK_HOUR_START + Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  return weekStart.clone().add(dayIndex, "days").hour(hour).minute(minute).second(0).millisecond(0);
}
export function allDaySegmentDaysToRange(weekStart, startDay, endDay, referenceEvent) {
  const safeStartDay = Math.max(0, Math.min(WEEK_DAY_COUNT - 1, startDay));
  const safeEndDay = Math.max(safeStartDay, Math.min(WEEK_DAY_COUNT - 1, endDay));
  const newStart = weekStart.clone().add(safeStartDay, "days").startOf("day");
  const spanDays = Math.max(0, safeEndDay - safeStartDay);
  const refEnd = moment(referenceEvent?.end);
  const newEnd = newStart.clone().add(spanDays, "days");
  if (refEnd.isValid() && refEnd.format("HH:mm") === "23:59") {
    newEnd.hour(23).minute(59).second(59);
  } else if (refEnd.isValid()) {
    newEnd.hour(refEnd.hour()).minute(refEnd.minute()).second(0);
  } else {
    newEnd.endOf("day");
  }
  return {
    start: newStart.toDate(),
    end: newEnd.toDate()
  };
}
export function timedSegmentMinutesToRange(weekStart, startMin, endMin) {
  const safeStart = Math.max(0, Math.min(WEEK_TOTAL_MINUTES - 15, startMin));
  const safeEnd = Math.max(safeStart + 15, Math.min(WEEK_TOTAL_MINUTES, endMin));
  const start = weekGridMinutesToDate(weekStart, safeStart);
  const end = weekGridMinutesToDate(weekStart, safeEnd);
  if (!end.isAfter(start)) return null;
  return {
    start: start.toDate(),
    end: end.toDate()
  };
}
