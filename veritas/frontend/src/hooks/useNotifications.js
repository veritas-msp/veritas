import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, archiveNotification, archiveAllNotifications } from "../api/notifications";
const UPDATE_EVENT = "veritas:notifications-updated";
const POLL_INTERVAL_MS = 30000;
const PAGE_SIZE = 30;
export function emitNotificationsUpdated() {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}
export function useNotifications({
  ticketId = null,
  enabled = true
} = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const mountedRef = useRef(true);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const archivedOnly = !ticketId && showArchived;
      const [listPayload, count] = await Promise.all([fetchNotifications({
        limit: ticketId ? 100 : PAGE_SIZE,
        offset: 0,
        unreadOnly: Boolean(ticketId),
        archivedOnly,
        ticketId
      }), ticketId ? Promise.resolve(null) : fetchUnreadNotificationCount()]);
      if (!mountedRef.current) return;
      setItems(Array.isArray(listPayload?.items) ? listPayload.items : []);
      setTotal(Number(listPayload?.total) || 0);
      if (count != null) setUnreadCount(count);else {
        const unreadItems = (listPayload?.items || []).filter(item => !item.isRead);
        setUnreadCount(unreadItems.length);
      }
    } catch (_err) {
      if (!mountedRef.current) return;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled, ticketId, showArchived]);
  const loadMore = useCallback(async () => {
    if (!enabled || ticketId || loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const listPayload = await fetchNotifications({
        limit: PAGE_SIZE,
        offset: items.length,
        archivedOnly: showArchived,
        ticketId: null
      });
      if (!mountedRef.current) return;
      const nextItems = Array.isArray(listPayload?.items) ? listPayload.items : [];
      setItems(prev => [...prev, ...nextItems]);
      setTotal(Number(listPayload?.total) || total);
    } catch (_err) {} finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [enabled, ticketId, loadingMore, items.length, total, showArchived]);
  const markRead = useCallback(async notificationId => {
    await markNotificationRead(notificationId);
    emitNotificationsUpdated();
    await refresh();
  }, [refresh]);
  const markAllRead = useCallback(async (scopeTicketId = ticketId) => {
    await markAllNotificationsRead(scopeTicketId || null);
    emitNotificationsUpdated();
    await refresh();
  }, [refresh, ticketId]);
  const archive = useCallback(async notificationId => {
    await archiveNotification(notificationId);
    emitNotificationsUpdated();
    await refresh();
  }, [refresh]);
  const archiveAll = useCallback(async (scopeTicketId = ticketId) => {
    await archiveAllNotifications(scopeTicketId || null);
    emitNotificationsUpdated();
    await refresh();
  }, [refresh, ticketId]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!enabled) return undefined;
    const handleUpdate = () => refresh();
    window.addEventListener(UPDATE_EVENT, handleUpdate);
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
      window.clearInterval(timer);
    };
  }, [enabled, refresh]);
  const unreadByCommentId = useCallback(() => {
    const map = new Map();
    items.forEach(item => {
      if (item.isRead || !item.commentId) return;
      map.set(String(item.commentId), item);
    });
    return map;
  }, [items]);
  return {
    items,
    total,
    hasMore: !ticketId && items.length < total,
    unreadCount,
    showArchived,
    setShowArchived,
    loading,
    loadingMore,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    archive,
    archiveAll,
    unreadByCommentId: unreadByCommentId()
  };
}
