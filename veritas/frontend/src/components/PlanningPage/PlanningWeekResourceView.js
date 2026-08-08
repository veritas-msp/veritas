import { useRef, useState } from "react";
import moment from "moment";
import { Icon } from "@iconify/react";
import { WEEK_DAY_COUNT, WEEK_HOUR_START, WEEK_HOURS_PER_DAY, WEEK_TOTAL_MINUTES, allDaySegmentDaysToRange, allDaySegmentToPercentStyle, buildAgentWeekLayout, getWeekRange, segmentToPercentStyle, timedSegmentMinutesToRange, weekResizeBoundsToPercentStyle } from "./planningWeekLayout";
import { getPlanningEventColors, getAgentColor } from "./planningAgentColors";
import { PLANNING_EVENT_DRAG_MIME, getPlanningEventId } from "./planningEventMove";
import { applyPlanningDragPickup, clearPlanningDragPickup } from "./planningDragFeedback";
import styles from "./PlanningWeekResourceView.module.css";
const RESIZE_BODY_CLASS = "planning-week-resizing";
const HOUR_COLUMN_WIDTH = 34;
const DAY_WIDTH = WEEK_HOURS_PER_DAY * HOUR_COLUMN_WIDTH;
const GRID_WIDTH = WEEK_DAY_COUNT * DAY_WIDTH;
const TIMED_LANE_HEIGHT = 24;
const ALL_DAY_LANE_HEIGHT = 20;
const ROW_MIN_HEIGHT = 52;
function formatAgentLabel(agent) {
  const raw = (agent.name || agent.nom || agent.username || "Agent").trim();
  return raw.toUpperCase();
}
function findEventById(events, eventId) {
  return events.find(item => String(item.id) === String(eventId)) || null;
}
const MIN_TIMED_MINUTES = 15;
function snapMinutes(value) {
  return Math.round(value / MIN_TIMED_MINUTES) * MIN_TIMED_MINUTES;
}
function WeekEventBlock({
  segment,
  variant,
  renderEvent,
  getEventColors,
  agentId = null,
  draggable = false,
  resizable = false,
  weekStart,
  onEventResize,
  onAssignToAgent,
  onDragInteractionEnd,
  weekCopy
}) {
  const resizeRef = useRef(null);
  const [previewBounds, setPreviewBounds] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const basePositionStyle = variant === "allDay" ? allDaySegmentToPercentStyle(segment) : segmentToPercentStyle(segment);
  const positionStyle = previewBounds ? weekResizeBoundsToPercentStyle(variant, previewBounds.nextStart, previewBounds.nextEnd) : basePositionStyle;
  const {
    backgroundColor,
    borderColor
  } = getEventColors(segment.event, agentId);
  const laneHeight = variant === "allDay" ? ALL_DAY_LANE_HEIGHT : TIMED_LANE_HEIGHT;
  const eventId = getPlanningEventId(segment.event);
  const canDrag = draggable && !isResizing && Boolean(eventId);
  const beginResize = (edge, pointerEvent) => {
    if (!resizable || !onEventResize) return;
    pointerEvent.stopPropagation();
    pointerEvent.preventDefault();
    const handleEl = pointerEvent.currentTarget;
    handleEl.setPointerCapture?.(pointerEvent.pointerId);
    const startX = pointerEvent.clientX;
    const initialStart = variant === "allDay" ? segment.startDay : segment.startMin;
    const initialEnd = variant === "allDay" ? segment.endDay : segment.endMin;
    setIsResizing(true);
    document.body.classList.add(RESIZE_BODY_CLASS);
    const onMove = moveEvent => {
      const deltaX = moveEvent.clientX - startX;
      if (variant === "allDay") {
        const deltaDays = Math.round(deltaX / GRID_WIDTH * WEEK_DAY_COUNT);
        let nextStart = initialStart;
        let nextEnd = initialEnd;
        if (edge === "left") {
          nextStart = Math.max(0, Math.min(initialEnd, initialStart + deltaDays));
        } else {
          nextEnd = Math.min(WEEK_DAY_COUNT - 1, Math.max(initialStart, initialEnd + deltaDays));
        }
        resizeRef.current = {
          nextStart,
          nextEnd,
          variant: "allDay"
        };
        setPreviewBounds({
          nextStart,
          nextEnd
        });
        return;
      }
      const deltaMinutes = snapMinutes(deltaX / GRID_WIDTH * WEEK_TOTAL_MINUTES);
      let nextStart = initialStart;
      let nextEnd = initialEnd;
      if (edge === "left") {
        nextStart = Math.max(0, Math.min(initialEnd - MIN_TIMED_MINUTES, initialStart + deltaMinutes));
      } else {
        nextEnd = Math.min(WEEK_TOTAL_MINUTES, Math.max(initialStart + MIN_TIMED_MINUTES, initialEnd + deltaMinutes));
      }
      resizeRef.current = {
        nextStart,
        nextEnd,
        variant: "timed"
      };
      setPreviewBounds({
        nextStart,
        nextEnd
      });
    };
    const finishResize = () => {
      handleEl.releasePointerCapture?.(pointerEvent.pointerId);
      handleEl.removeEventListener("pointermove", onMove);
      handleEl.removeEventListener("pointerup", finishResize);
      handleEl.removeEventListener("pointercancel", finishResize);
      document.body.classList.remove(RESIZE_BODY_CLASS);
      setIsResizing(false);
      setPreviewBounds(null);
      const state = resizeRef.current;
      resizeRef.current = null;
      if (!state) return;
      let range = null;
      if (state.variant === "allDay") {
        range = allDaySegmentDaysToRange(weekStart, state.nextStart, state.nextEnd, segment.event);
      } else {
        range = timedSegmentMinutesToRange(weekStart, state.nextStart, state.nextEnd);
      }
      if (!range) return;
      onEventResize({
        event: segment.event,
        start: range.start,
        end: range.end
      });
    };
    handleEl.addEventListener("pointermove", onMove);
    handleEl.addEventListener("pointerup", finishResize);
    handleEl.addEventListener("pointercancel", finishResize);
  };
  return <div className={`${styles.eventBlock} ${variant === "allDay" ? styles.eventBlockAllDay : ""} ${canDrag ? styles.eventBlockDraggable : ""} ${resizable ? styles.eventBlockResizable : ""} ${isResizing ? styles.eventBlockResizing : ""}`} style={{
    ...positionStyle,
    top: `${segment.lane * laneHeight + 2}px`,
    backgroundColor,
    borderColor
  }} draggable={canDrag} onDragStart={event => {
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    event.dataTransfer.setData(PLANNING_EVENT_DRAG_MIME, String(eventId));
    event.dataTransfer.effectAllowed = "move";
    applyPlanningDragPickup(event);
  }} onDragEnd={event => {
    clearPlanningDragPickup(event);
    onDragInteractionEnd?.();
  }} onDragOver={event => {
    if (!onAssignToAgent) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }} onDrop={event => {
    if (!onAssignToAgent) return;
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData(PLANNING_EVENT_DRAG_MIME);
    if (!draggedId || String(eventId) === String(draggedId)) return;
    onAssignToAgent(draggedId);
  }} onClick={event => event.stopPropagation()}>
      {resizable ? <button type="button" className={`${styles.eventResizeHandle} ${styles.eventResizeHandleLeft}`} aria-label={weekCopy?.weekView?.resizeStart || "Adjust start"} onPointerDown={event => beginResize("left", event)} /> : null}
      <div className={styles.eventBlockBody}>
        {renderEvent ? renderEvent(segment.event) : <span className={styles.eventBlockTitle}>
            {segment.event.title || weekCopy?.defaults?.event || "Event"}
          </span>}
      </div>
      {resizable ? <button type="button" className={`${styles.eventResizeHandle} ${styles.eventResizeHandleRight}`} aria-label={weekCopy?.weekView?.resizeEnd || "Adjust end"} onPointerDown={event => beginResize("right", event)} /> : null}
    </div>;
}
export default function PlanningWeekResourceView({
  currentDate,
  events,
  agents,
  renderEvent,
  getEventColors = getPlanningEventColors,
  onSelectSlot,
  onEventMove,
  onEventResize,
  isEventDraggable,
  onDragInteractionEnd,
  weekCopy
}) {
  const [dragOverAgentId, setDragOverAgentId] = useState(null);
  const {
    weekStart
  } = getWeekRange(currentDate);
  const weekDays = Array.from({
    length: WEEK_DAY_COUNT
  }, (_, index) => weekStart.clone().add(index, "days"));
  const hours = Array.from({
    length: WEEK_HOURS_PER_DAY
  }, (_, index) => WEEK_HOUR_START + index);
  const agentRows = agents.map(agent => ({
    agent,
    layout: buildAgentWeekLayout(agent.id, events, weekStart, weekStart.clone().endOf("week"))
  }));
  const getRowHeight = layout => {
    const allDayHeight = layout.allDayLaneCount > 0 ? layout.allDayLaneCount * ALL_DAY_LANE_HEIGHT + 6 : 0;
    const timedHeight = layout.timedLaneCount > 0 ? layout.timedLaneCount * TIMED_LANE_HEIGHT + 6 : ROW_MIN_HEIGHT - allDayHeight;
    return Math.max(ROW_MIN_HEIGHT, allDayHeight + timedHeight);
  };
  const handleDropOnTimedSlot = (eventId, day, hour, agentId) => {
    if (!onEventMove) return;
    const movedEvent = findEventById(events, eventId);
    if (!movedEvent || isEventDraggable && !isEventDraggable(movedEvent)) return;
    onEventMove({
      event: movedEvent,
      start: day.clone().hour(hour).minute(0).second(0).toDate(),
      agentId,
      allDay: false,
      preserveSchedule: false
    });
  };
  const reassignEventToAgent = (eventId, agentId) => {
    if (!onEventMove || !agentId) return;
    const movedEvent = findEventById(events, eventId);
    if (!movedEvent || isEventDraggable && !isEventDraggable(movedEvent)) return;
    const currentAgentIds = Array.isArray(movedEvent.assignedUserIds) ? movedEvent.assignedUserIds.map(String) : movedEvent.assignedUserId ? [String(movedEvent.assignedUserId)] : [];
    if (currentAgentIds.length === 1 && currentAgentIds[0] === String(agentId)) {
      return;
    }
    onEventMove({
      event: movedEvent,
      start: movedEvent.start,
      agentId,
      preserveSchedule: true
    });
  };
  const handleDropOnAllDay = (eventId, day, agentId) => {
    if (!onEventMove) return;
    const movedEvent = findEventById(events, eventId);
    if (!movedEvent || isEventDraggable && !isEventDraggable(movedEvent)) return;
    if (agentId) {
      reassignEventToAgent(eventId, agentId);
      return;
    }
    onEventMove({
      event: movedEvent,
      start: day.clone().startOf("day").toDate(),
      agentId: null,
      allDay: true,
      preserveSchedule: false
    });
  };
  const clearDragOverAgent = () => setDragOverAgentId(null);
  const handleAgentDragOver = (event, agentId) => {
    if (!allowDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverAgentId(String(agentId));
  };
  const allowDrop = Boolean(onEventMove);
  return <div className={styles.wrap}>
      <div className={styles.scrollArea}>
        <div className={styles.gridTable} style={{
        "--week-grid-width": `${GRID_WIDTH}px`
      }}>
          <div className={styles.headerRow}>
            <div className={`${styles.cornerCell} ${styles.headerCorner}`}>
              <Icon icon="mdi:account-group-outline" aria-hidden />
              <span>Agents</span>
            </div>
            <div className={styles.headerGrid}>
              <div className={styles.weekBanner}>
                Sem. {weekStart.isoWeek()}
              </div>
              <div className={styles.dayHeaderRow}>
                {weekDays.map(day => <div key={day.format("YYYY-MM-DD")} className={`${styles.dayHeaderCell} ${day.isSame(moment(), "day") ? styles.dayHeaderToday : ""} ${allowDrop ? styles.dayHeaderDropTarget : ""}`} style={{
                width: DAY_WIDTH
              }} onDragOver={event => {
                if (!allowDrop) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }} onDrop={event => {
                event.preventDefault();
                event.stopPropagation();
                const eventId = event.dataTransfer.getData(PLANNING_EVENT_DRAG_MIME);
                if (!eventId) return;
                handleDropOnAllDay(eventId, day, null);
              }}>
                    {day.format("ddd DD/MM")}
                  </div>)}
              </div>
              <div className={styles.hourHeaderRow}>
                {weekDays.map(day => hours.map(hour => <div key={`${day.format("YYYY-MM-DD")}-${hour}`} className={styles.hourHeaderCell} style={{
                width: HOUR_COLUMN_WIDTH
              }}>
                      {hour}
                    </div>))}
              </div>
            </div>
          </div>

          {agentRows.length === 0 ? <div className={styles.emptyRow}>
              <div className={styles.cornerCell} />
              <div className={styles.emptyMessage}>
                Cochez un ou plusieurs agents pour afficher leur planning hebdomadaire.
              </div>
            </div> : agentRows.map(({
          agent,
          layout
        }) => {
          const rowHeight = getRowHeight(layout);
          const isDragOverRow = dragOverAgentId === String(agent.id);
          const makeAssignHandler = agentId => eventId => reassignEventToAgent(eventId, agentId);
          return <div key={agent.id} className={`${styles.bodyRow} ${isDragOverRow ? styles.bodyRowDragOver : ""}`}>
                  <div className={`${styles.resourceCell} ${isDragOverRow ? styles.resourceCellDragOver : ""}`} title={formatAgentLabel(agent)} onDragOver={event => handleAgentDragOver(event, agent.id)} onDragLeave={clearDragOverAgent} onDrop={event => {
              event.preventDefault();
              clearDragOverAgent();
              const eventId = event.dataTransfer.getData(PLANNING_EVENT_DRAG_MIME);
              if (!eventId) return;
              reassignEventToAgent(eventId, agent.id);
            }}>
                    <span className={styles.resourceAgentDot} style={{
                backgroundColor: getAgentColor(agent.id)
              }} aria-hidden />
                    <Icon icon="mdi:account-outline" aria-hidden />
                    <span>{formatAgentLabel(agent)}</span>
                  </div>
                  <div className={`${styles.timelineCell} ${isDragOverRow ? styles.timelineCellDragOver : ""}`} style={{
              height: rowHeight
            }} onDragOver={event => handleAgentDragOver(event, agent.id)} onDragLeave={clearDragOverAgent} onDrop={event => {
              if (event.target.closest(`.${styles.gridCell}`)) return;
              event.preventDefault();
              clearDragOverAgent();
              const eventId = event.dataTransfer.getData(PLANNING_EVENT_DRAG_MIME);
              if (!eventId) return;
              reassignEventToAgent(eventId, agent.id);
            }}>
                    <div className={styles.gridBackground}>
                      {weekDays.map(day => hours.map(hour => <div key={`${agent.id}-${day.format("YYYY-MM-DD")}-${hour}`} className={`${styles.gridCell} ${day.isSame(moment(), "day") ? styles.gridCellToday : ""} ${onSelectSlot ? styles.gridCellInteractive : ""}`} style={{
                  width: HOUR_COLUMN_WIDTH
                }} onClick={() => {
                  if (!onSelectSlot) return;
                  onSelectSlot({
                    start: day.clone().hour(hour).minute(0).second(0).toDate(),
                    agentId: agent.id
                  });
                }} onKeyDown={event => {
                  if (!onSelectSlot || event.key !== "Enter" && event.key !== " ") {
                    return;
                  }
                  event.preventDefault();
                  onSelectSlot({
                    start: day.clone().hour(hour).minute(0).second(0).toDate(),
                    agentId: agent.id
                  });
                }} onDragOver={event => {
                  if (!allowDrop) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }} onDrop={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearDragOverAgent();
                  const eventId = event.dataTransfer.getData(PLANNING_EVENT_DRAG_MIME);
                  if (!eventId) return;
                  handleDropOnTimedSlot(eventId, day, hour, agent.id);
                }} role={onSelectSlot ? "button" : undefined} tabIndex={onSelectSlot ? 0 : undefined} title={onSelectSlot ? `${day.format("dddd D MMMM")} · ${String(hour).padStart(2, "0")}:00` : undefined} />))}
                    </div>

                    {layout.allDay.length > 0 && <div className={styles.allDayBand} style={{
                height: layout.allDayLaneCount * ALL_DAY_LANE_HEIGHT + 4
              }}>
                        {layout.allDay.map(segment => <WeekEventBlock key={`${segment.event.id}-allday-${segment.startDay}`} segment={segment} variant="allDay" renderEvent={renderEvent} getEventColors={getEventColors} agentId={agent.id} weekStart={weekStart} draggable={!isEventDraggable || isEventDraggable(segment.event)} resizable={Boolean(onEventResize) && (!isEventDraggable || isEventDraggable(segment.event))} onEventResize={onEventResize} onAssignToAgent={makeAssignHandler(agent.id)} onDragInteractionEnd={onDragInteractionEnd} weekCopy={weekCopy} />)}
                      </div>}

                    <div className={styles.timedBand} style={{
                minHeight: layout.timedLaneCount > 0 ? layout.timedLaneCount * TIMED_LANE_HEIGHT + 6 : rowHeight - (layout.allDayLaneCount > 0 ? layout.allDayLaneCount * ALL_DAY_LANE_HEIGHT + 4 : 0)
              }}>
                      {layout.timed.map(segment => <WeekEventBlock key={`${segment.event.id}-${segment.startMin}-${segment.lane}`} segment={segment} variant="timed" renderEvent={renderEvent} getEventColors={getEventColors} agentId={agent.id} weekStart={weekStart} draggable={!isEventDraggable || isEventDraggable(segment.event)} resizable={Boolean(onEventResize) && (!isEventDraggable || isEventDraggable(segment.event))} onEventResize={onEventResize} onAssignToAgent={makeAssignHandler(agent.id)} onDragInteractionEnd={onDragInteractionEnd} weekCopy={weekCopy} />)}
                    </div>
                  </div>
                </div>;
        })}
        </div>
      </div>
    </div>;
}
