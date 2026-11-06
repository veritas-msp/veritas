import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MIN_WIDTH = 72;
const DEFAULT_MAX_WIDTH = 720;

function readStoredWidths(storageKey) {
  if (!storageKey || typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const next = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const width = Number(value);
      if (Number.isFinite(width) && width > 0) next[String(key)] = Math.round(width);
    });
    return next;
  } catch {
    return {};
  }
}

function writeStoredWidths(storageKey, widths) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths || {}));
  } catch {}
}

/**
 * Redimensionnement de colonnes de table (persisté localStorage).
 * Retourne les largeurs, un style col, et un handler de démarrage de drag.
 */
export default function useResizableTableColumns({
  storageKey,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH
} = {}) {
  const [widths, setWidths] = useState(() => readStoredWidths(storageKey));
  const [resizingColumnId, setResizingColumnId] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    setWidths(readStoredWidths(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!resizingColumnId) return undefined;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = event => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = event.clientX - drag.startX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(drag.startWidth + delta)));
      setWidths(prev => {
        if (prev[drag.columnId] === nextWidth) return prev;
        return {
          ...prev,
          [drag.columnId]: nextWidth
        };
      });
    };

    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setResizingColumnId(null);
      setWidths(prev => {
        writeStoredWidths(storageKey, prev);
        return prev;
      });
      if (drag?.onDone) drag.onDone();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("blur", onUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [resizingColumnId, storageKey, minWidth, maxWidth]);

  const getColumnWidth = useCallback(columnId => {
    const width = Number(widths[columnId]);
    return Number.isFinite(width) && width > 0 ? width : undefined;
  }, [widths]);

  const getColumnStyle = useCallback(columnId => {
    const width = getColumnWidth(columnId);
    if (!width) return undefined;
    return {
      width,
      minWidth: width,
      maxWidth: width
    };
  }, [getColumnWidth]);

  const beginResize = useCallback((event, columnId, options = {}) => {
    if (!columnId || event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const th = event.currentTarget?.closest?.("th") || options.headerEl || null;
    const measured = th?.getBoundingClientRect?.().width;
    const current = getColumnWidth(columnId) || (Number.isFinite(measured) ? measured : minWidth);
    dragRef.current = {
      columnId: String(columnId),
      startX: event.clientX,
      startWidth: current,
      onDone: options.onDone
    };
    setResizingColumnId(String(columnId));
    setWidths(prev => ({
      ...prev,
      [columnId]: Math.round(current)
    }));
  }, [getColumnWidth, minWidth]);

  const resetWidths = useCallback(() => {
    setWidths({});
    writeStoredWidths(storageKey, {});
  }, [storageKey]);

  return {
    widths,
    resizingColumnId,
    isResizing: Boolean(resizingColumnId),
    getColumnWidth,
    getColumnStyle,
    beginResize,
    resetWidths
  };
}
