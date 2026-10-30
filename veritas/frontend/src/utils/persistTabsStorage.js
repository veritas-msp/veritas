const TABS_KEY = "veritas_tabs";
const ACTIVE_KEY = "veritas_activeTabId";
const DEBOUNCE_MS = 300;

let pendingTabs = undefined;
let pendingActive = undefined;
let timer = null;
let listenersBound = false;

function flush() {
  timer = null;
  try {
    if (pendingTabs !== undefined) {
      if (!Array.isArray(pendingTabs) || pendingTabs.length === 0) {
        localStorage.removeItem(TABS_KEY);
      } else {
        localStorage.setItem(TABS_KEY, JSON.stringify(pendingTabs));
      }
      pendingTabs = undefined;
    }
    if (pendingActive !== undefined) {
      if (pendingActive == null || pendingActive === "") {
        localStorage.removeItem(ACTIVE_KEY);
      } else {
        localStorage.setItem(ACTIVE_KEY, String(pendingActive));
      }
      pendingActive = undefined;
    }
  } catch (error) {
    console.error("Error lors de la sauvegarde des onglets:", error);
  }
}

function tabsHaveHeavyPayload(tabs) {
  return Array.isArray(tabs) && tabs.some(tab =>
    tab?.type === "MonitoringDetail" && tab?.data && typeof tab.data === "object"
  );
}

function schedule(immediate) {
  if (immediate) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    flush();
    return;
  }
  if (timer) return;
  timer = setTimeout(flush, DEBOUNCE_MS);
}

function ensureUnloadFlush() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const onLeave = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    flush();
  };
  window.addEventListener("pagehide", onLeave);
  window.addEventListener("beforeunload", onLeave);
}

/**
 * Persist tab list. Debounced by default to avoid main-thread freezes
 * from synchronous JSON.stringify of large Monitoring payloads.
 * `immediate` is ignored when a MonitoringDetail tab is present — pagehide still flushes.
 */
export function persistTabs(tabs, { immediate = false } = {}) {
  ensureUnloadFlush();
  pendingTabs = tabs;
  const allowImmediate = immediate && !tabsHaveHeavyPayload(tabs);
  schedule(allowImmediate);
}

export function persistActiveTabId(tabId, { immediate = false } = {}) {
  ensureUnloadFlush();
  pendingActive = tabId;
  schedule(immediate);
}

export function clearPersistedTabs({ immediate = true } = {}) {
  ensureUnloadFlush();
  pendingTabs = [];
  pendingActive = null;
  schedule(immediate);
}

export function flushTabsStorage() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  flush();
}
