let currentOpener = null;
const listeners = new Set();

function notify() {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

export function registerPageGuideOpener(openFn) {
  currentOpener = typeof openFn === "function" ? openFn : null;
  notify();
  return () => {
    if (currentOpener === openFn) {
      currentOpener = null;
      notify();
    }
  };
}

export function openRegisteredPageGuide() {
  if (typeof currentOpener !== "function") return false;
  currentOpener();
  return true;
}

export function hasRegisteredPageGuide() {
  return typeof currentOpener === "function";
}

export function subscribePageGuideRegistry(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}
