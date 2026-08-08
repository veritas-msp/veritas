import { computeMonthResizeRange } from "./planningEventMove";
import { suppressPlanningEventClickBriefly } from "./planningDragFeedback";
const RESIZE_BODY_CLASS = "planning-month-event-resizing";
export function attachMonthEventResize({
  event,
  edge,
  pointerEvent,
  onResize
}) {
  if (!onResize) return;
  pointerEvent.stopPropagation();
  pointerEvent.preventDefault();
  const handleEl = pointerEvent.currentTarget;
  handleEl.setPointerCapture?.(pointerEvent.pointerId);
  const monthRow = handleEl.closest(".rbc-month-row");
  const rowBg = monthRow?.querySelector(".rbc-row-bg");
  if (!rowBg) {
    handleEl.releasePointerCapture?.(pointerEvent.pointerId);
    return;
  }
  const startX = pointerEvent.clientX;
  const dayWidth = rowBg.getBoundingClientRect().width / 7;
  let deltaDays = 0;
  document.body.classList.add(RESIZE_BODY_CLASS);
  const onMove = moveEvent => {
    deltaDays = Math.round((moveEvent.clientX - startX) / Math.max(dayWidth, 1));
  };
  const finishResize = () => {
    handleEl.releasePointerCapture?.(pointerEvent.pointerId);
    handleEl.removeEventListener("pointermove", onMove);
    handleEl.removeEventListener("pointerup", finishResize);
    handleEl.removeEventListener("pointercancel", finishResize);
    document.body.classList.remove(RESIZE_BODY_CLASS);
    const range = computeMonthResizeRange(event, edge, deltaDays);
    if (range) {
      onResize({
        event,
        start: range.start,
        end: range.end
      });
    }
    suppressPlanningEventClickBriefly();
  };
  handleEl.addEventListener("pointermove", onMove);
  handleEl.addEventListener("pointerup", finishResize);
  handleEl.addEventListener("pointercancel", finishResize);
}
