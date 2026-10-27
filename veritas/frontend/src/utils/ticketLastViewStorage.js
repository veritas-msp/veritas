import { useCallback, useEffect, useRef, useState } from "react";
import { getUserSetting, saveUserSetting } from "../api/userSettings";

const STORAGE_PREFIX = "veritas_last_ticket_view";
const SERVER_PERSIST_DEBOUNCE_MS = 450;

export const LAST_TICKET_VIEW_SETTING_KEYS = {
  ticket: "ticket_last_view_id",
  ticket_sales: "ticket_sales_last_view_id"
};

function scopeKey(pageScope) {
  return String(pageScope || "ticket").trim() || "ticket";
}

function settingKeyFor(pageScope) {
  return LAST_TICKET_VIEW_SETTING_KEYS[scopeKey(pageScope)] || LAST_TICKET_VIEW_SETTING_KEYS.ticket;
}

function storageKeys(pageScope, userId) {
  const scoped = scopeKey(pageScope);
  const uid = String(userId || "").trim();
  const keys = [];
  if (uid) keys.push(`${STORAGE_PREFIX}:${scoped}:${uid}`);
  keys.push(`${STORAGE_PREFIX}:${scoped}`);
  return keys;
}

export function parseLastTicketViewId(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(value.viewId || value.id || "").trim();
  }
  return String(value).trim();
}

export function readLastTicketViewId(pageScope, userId) {
  try {
    for (const key of storageKeys(pageScope, userId)) {
      const value = String(localStorage.getItem(key) || "").trim();
      if (value) return value;
    }
  } catch {}
  return "";
}

export function writeLastTicketViewId(pageScope, viewId, userId) {
  try {
    const value = String(viewId || "").trim();
    if (!value) return;
    storageKeys(pageScope, userId).forEach(key => {
      localStorage.setItem(key, value);
    });
  } catch {}
}

export function usePersistedTicketViewId(pageScope, userId, fallbackId) {
  const [activeViewId, setActiveViewIdState] = useState(
    () => readLastTicketViewId(pageScope, userId) || fallbackId
  );
  const [prefsReady, setPrefsReady] = useState(false);
  const userPickedRef = useRef(false);
  const lastPersistedRef = useRef(String(activeViewId || ""));
  const persistTimerRef = useRef(null);
  const activeViewIdRef = useRef(activeViewId);
  const pageScopeRef = useRef(pageScope);
  activeViewIdRef.current = activeViewId;
  pageScopeRef.current = pageScope;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { value } = await getUserSetting(settingKeyFor(pageScope));
        if (cancelled) return;
        const serverId = parseLastTicketViewId(value);
        if (serverId && !userPickedRef.current) {
          setActiveViewIdState(serverId);
          writeLastTicketViewId(pageScope, serverId, userId);
          lastPersistedRef.current = serverId;
        }
      } catch {
        // Keep the local cache if the account setting cannot be loaded.
      } finally {
        if (!cancelled) setPrefsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageScope, userId]);

  useEffect(() => {
    if (!prefsReady) return undefined;
    const value = String(activeViewId || "").trim();
    if (!value || value === lastPersistedRef.current) return undefined;
    writeLastTicketViewId(pageScope, value, userId);
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      if (value === lastPersistedRef.current) return;
      lastPersistedRef.current = value;
      saveUserSetting(settingKeyFor(pageScope), value).catch(() => {});
    }, SERVER_PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [prefsReady, activeViewId, pageScope, userId]);

  // Flush uniquement au démontage réel (pas à chaque clic de vue).
  useEffect(() => () => {
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const value = String(activeViewIdRef.current || "").trim();
    if (!value || value === lastPersistedRef.current) return;
    lastPersistedRef.current = value;
    saveUserSetting(settingKeyFor(pageScopeRef.current), value).catch(() => {});
  }, []);

  const setActiveViewId = useCallback(next => {
    userPickedRef.current = true;
    setActiveViewIdState(prev => {
      const value = typeof next === "function" ? next(prev) : next;
      const normalized = String(value || "").trim();
      if (normalized) writeLastTicketViewId(pageScope, normalized, userId);
      return value;
    });
  }, [pageScope, userId]);

  return [activeViewId, setActiveViewId];
}
