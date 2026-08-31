import { useCallback, useEffect, useRef, useState } from "react";
import { getUserSetting, saveUserSetting } from "../api/userSettings";

const STORAGE_PREFIX = "veritas_last_ticket_view";

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

function persistLastTicketView(pageScope, viewId, userId) {
  const value = String(viewId || "").trim();
  if (!value) return;
  writeLastTicketViewId(pageScope, value, userId);
  saveUserSetting(settingKeyFor(pageScope), value).catch(() => {});
}

export function usePersistedTicketViewId(pageScope, userId, fallbackId) {
  const [activeViewId, setActiveViewIdState] = useState(
    () => readLastTicketViewId(pageScope, userId) || fallbackId
  );
  const [prefsReady, setPrefsReady] = useState(false);
  const userPickedRef = useRef(false);
  const lastPersistedRef = useRef(String(activeViewId || ""));

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
    if (!prefsReady) return;
    const value = String(activeViewId || "").trim();
    if (!value || value === lastPersistedRef.current) return;
    lastPersistedRef.current = value;
    persistLastTicketView(pageScope, value, userId);
  }, [prefsReady, activeViewId, pageScope, userId]);

  const setActiveViewId = useCallback(next => {
    userPickedRef.current = true;
    setActiveViewIdState(prev => {
      const value = typeof next === "function" ? next(prev) : next;
      const normalized = String(value || "").trim();
      if (normalized) persistLastTicketView(pageScope, normalized, userId);
      lastPersistedRef.current = normalized;
      return value;
    });
  }, [pageScope, userId]);

  return [activeViewId, setActiveViewId];
}
