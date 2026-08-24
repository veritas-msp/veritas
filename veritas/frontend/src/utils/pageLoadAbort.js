/**
 * Track in-flight page loads so navigation can cancel them immediately
 * (before React unmount cleanup), freeing browser HTTP connection slots.
 */

const PAGE_ABORT_EVENT = "veritas:abort-page-loads";
const activeControllers = new Set();

export function createTrackedAbortController() {
  const controller = new AbortController();
  activeControllers.add(controller);
  const release = () => {
    activeControllers.delete(controller);
  };
  controller.signal.addEventListener("abort", release, {
    once: true
  });
  return controller;
}

export function abortInFlightPageLoads() {
  for (const controller of [...activeControllers]) {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  }
  activeControllers.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PAGE_ABORT_EVENT));
  }
}

export function onPageLoadAbort(handler) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(PAGE_ABORT_EVENT, handler);
  return () => window.removeEventListener(PAGE_ABORT_EVENT, handler);
}
