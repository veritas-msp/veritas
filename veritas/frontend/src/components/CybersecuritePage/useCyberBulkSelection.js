import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function fleetRowKey(row) {
  if (row?.clientId != null && row?.id != null) return `${row.clientId}:${row.id}`;
  return String(row?.id ?? "");
}

export function useCyberBulkSelection(items = [], getId) {
  const getIdRef = useRef(getId);
  getIdRef.current = getId || (item => item?.id);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const ids = useMemo(() => (Array.isArray(items) ? items : []).map(item => getIdRef.current(item)).filter(id => id != null && id !== ""), [items]);
  useEffect(() => {
    setSelectedIds(prev => {
      if (!prev.size) return prev;
      const valid = new Set(ids);
      const next = [...prev].filter(id => valid.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [ids]);
  const selectedItems = useMemo(() => (Array.isArray(items) ? items : []).filter(item => selectedIds.has(getIdRef.current(item))), [items, selectedIds]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const toggleItem = useCallback((itemId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(itemId);else next.delete(itemId);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (ids.length > 0 && ids.every(id => next.has(id))) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, [ids]);
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(ids));
  }, [ids]);
  const toggleMany = useCallback((itemIds, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      itemIds.forEach(id => {
        if (checked) next.add(id);else next.delete(id);
      });
      return next;
    });
  }, []);
  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    allSelected: ids.length > 0 && ids.every(id => selectedIds.has(id)),
    clearSelection,
    toggleItem,
    toggleAll,
    toggleMany,
    selectAll
  };
}
