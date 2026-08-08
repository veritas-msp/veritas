const SOURCE_CLASS = "planning-event-drag-source";
const GHOST_CLASS = "planning-event-drag-ghost";
const BODY_ACTIVE_CLASS = "planning-event-drag-active";
const BODY_MONTH_DRAG_CLASS = "planning-month-event-dragging";
export function markPlanningMonthEventDragging() {
  document.body.classList.add(BODY_MONTH_DRAG_CLASS);
}
export function clearPlanningMonthEventDragging() {
  document.body.classList.remove(BODY_MONTH_DRAG_CLASS);
}
export function suppressPlanningEventClickBriefly() {
  document.body.classList.add("planning-event-click-suppressed");
  window.setTimeout(() => {
    document.body.classList.remove("planning-event-click-suppressed");
  }, 0);
}
function removeGhost(ghost) {
  if (ghost?.parentNode) {
    ghost.parentNode.removeChild(ghost);
  }
}
export function applyPlanningDragPickup(dragEvent) {
  const el = dragEvent.currentTarget;
  if (!el) return;
  el.classList.add(SOURCE_CLASS);
  document.body.classList.add(BODY_ACTIVE_CLASS);
  try {
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.classList.add(GHOST_CLASS);
    ghost.classList.remove(SOURCE_CLASS);
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.position = "fixed";
    ghost.style.top = "-10000px";
    ghost.style.left = "-10000px";
    ghost.style.width = `${Math.max(rect.width, 24)}px`;
    ghost.style.height = `${Math.max(rect.height, 16)}px`;
    ghost.style.pointerEvents = "none";
    ghost.style.margin = "0";
    document.body.appendChild(ghost);
    const offsetX = Math.min(Math.max(dragEvent.clientX - rect.left, 8), rect.width - 8);
    const offsetY = Math.min(Math.max(dragEvent.clientY - rect.top, 8), rect.height - 8);
    dragEvent.dataTransfer.setDragImage(ghost, offsetX, offsetY);
    setTimeout(() => removeGhost(ghost), 0);
  } catch {}
}
export function clearPlanningDragPickup(dragEvent) {
  dragEvent?.currentTarget?.classList.remove(SOURCE_CLASS);
  document.body.classList.remove(BODY_ACTIVE_CLASS);
}
