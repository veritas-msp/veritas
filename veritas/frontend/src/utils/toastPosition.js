const EVENT_NAME = "veritas:toast-position";
const DEFAULT_POSITION = "bottom-right";
const ADMIN_POSITION = "top-right";

let currentPosition = DEFAULT_POSITION;

export function getToastPosition() {
  return currentPosition;
}

export function setToastPosition(position) {
  const next = position || DEFAULT_POSITION;
  if (currentPosition === next) return;
  currentPosition = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: next
    }));
  }
}

export function enableAdminToastPosition() {
  setToastPosition(ADMIN_POSITION);
}

export function disableAdminToastPosition() {
  setToastPosition(DEFAULT_POSITION);
}

export function subscribeToastPosition(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = event => listener(event.detail || DEFAULT_POSITION);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
