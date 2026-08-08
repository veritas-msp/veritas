import { Icon } from "@iconify/react";
import moment from "moment";
import SmartTooltip from "../SmartTooltip";
import { getPlanningEventTypeIcon } from "./planningEventTypes";
import { getPlanningEventId, isPlanningEventDraggable, PLANNING_EVENT_DRAG_MIME } from "./planningEventMove";
import { attachMonthEventResize } from "./planningMonthResize";
import { applyPlanningDragPickup, clearPlanningDragPickup, clearPlanningMonthEventDragging, markPlanningMonthEventDragging, suppressPlanningEventClickBriefly } from "./planningDragFeedback";
import styles from "./PlanningPage.module.css";
export default function PlanningMonthEventBar({
  event,
  continuesPrior = false,
  continuesAfter = false,
  renderPreview,
  onMonthEventResize,
  eventFallbackTitle = "Event"
}) {
  const title = event.title || eventFallbackTitle;
  const timeStr = event.start ? moment(event.start).format("HH:mm") : "";
  const typeIcon = getPlanningEventTypeIcon(event);
  const eventId = getPlanningEventId(event);
  const canInteract = isPlanningEventDraggable(event);
  const canResizeLeft = canInteract && !continuesPrior && Boolean(onMonthEventResize);
  const canResizeRight = canInteract && !continuesAfter && Boolean(onMonthEventResize);
  const handleNativeDragStart = dragEvent => {
    if (!canInteract || !eventId) return;
    dragEvent.stopPropagation();
    markPlanningMonthEventDragging();
    applyPlanningDragPickup(dragEvent);
    dragEvent.dataTransfer.setData(PLANNING_EVENT_DRAG_MIME, String(eventId));
    dragEvent.dataTransfer.effectAllowed = "move";
  };
  const handleNativeDragEnd = dragEvent => {
    clearPlanningDragPickup(dragEvent);
    clearPlanningMonthEventDragging();
    suppressPlanningEventClickBriefly();
  };
  const stopCalendarBubble = domEvent => {
    domEvent.stopPropagation();
  };
  const beginResize = edge => pointerEvent => {
    attachMonthEventResize({
      event,
      edge,
      pointerEvent,
      onResize: onMonthEventResize
    });
  };
  return <span className={`${styles.eventBarShell} ${canResizeLeft || canResizeRight ? styles.eventBarShellResizable : ""}`} onClick={stopCalendarBubble}>
      {canResizeLeft ? <button type="button" className={`${styles.eventBarResizeHandle} ${styles.eventBarResizeHandleLeft}`} aria-label="Adjust start" onPointerDown={beginResize("left")} onClick={stopCalendarBubble} /> : null}
      {canInteract ? <span className={styles.eventBarDragHandle} draggable onDragStart={handleNativeDragStart} onDragEnd={handleNativeDragEnd} onClick={stopCalendarBubble} onPointerDown={stopCalendarBubble} role="button" aria-label="Move event" title="Move">
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </span> : null}
      <SmartTooltip trigger="click-contextmenu" interactive clickSuppressOnDrag content={renderPreview(event)} tooltipClassName={styles.eventHoverPortal} data-tooltip-position="planning-popover" as="span" className={styles.eventBarWrapper} onContextMenu={stopCalendarBubble}>
        <span className={styles.eventBarContent}>
          <Icon icon={typeIcon} className={styles.eventTypeIcon} aria-hidden />
          {timeStr ? <span className={styles.eventBarTime}>{timeStr}</span> : null}
          <span className={styles.eventBarTitle}>{title}</span>
        </span>
      </SmartTooltip>
      {canResizeRight ? <button type="button" className={`${styles.eventBarResizeHandle} ${styles.eventBarResizeHandleRight}`} aria-label="Adjust end" onPointerDown={beginResize("right")} onClick={stopCalendarBubble} /> : null}
    </span>;
}
