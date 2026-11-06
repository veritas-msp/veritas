import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MIN_WIDTH = 72;
const DEFAULT_MAX_WIDTH = 720;
const AUTOFIT_GUTTER = 12;

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
 * Mesure la largeur naturelle d’une cellule (contenu non tronqué),
 * même si la table est en layout fixed + ellipsis.
 */
function measureCellNaturalWidth(cell) {
  if (!cell || typeof document === "undefined") return 0;
  const style = window.getComputedStyle(cell);
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "height:auto",
    "width:max-content",
    "max-width:none",
    "min-width:0",
    "overflow:visible",
    "visibility:hidden",
    "pointer-events:none",
    "box-sizing:border-box",
    `padding:${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
    `border-left:${style.borderLeftWidth} solid transparent`,
    `border-right:${style.borderRightWidth} solid transparent`,
    `font:${style.font}`,
    `letter-spacing:${style.letterSpacing}`,
    `text-transform:${style.textTransform}`,
    `line-height:${style.lineHeight}`
  ].join(";");

  const clone = cell.cloneNode(true);
  clone.querySelectorAll("[role='separator'], .colResizeHandle").forEach(el => el.remove());
  clone.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "gap:inherit",
    "width:max-content",
    "max-width:none",
    "min-width:0",
    "overflow:visible",
    "white-space:nowrap",
    "text-overflow:clip",
    "box-sizing:border-box",
    "padding:0",
    "border:0",
    "margin:0"
  ].join(";");
  clone.querySelectorAll("*").forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    el.style.maxWidth = "none";
    el.style.overflow = "visible";
    el.style.textOverflow = "clip";
    el.style.whiteSpace = "nowrap";
  });

  probe.appendChild(clone);
  document.body.appendChild(probe);
  const width = Math.ceil(probe.getBoundingClientRect().width);
  probe.remove();
  return width;
}

function measureColumnContentWidth(table, columnIndex) {
  if (!table || !Number.isFinite(columnIndex) || columnIndex < 0) return 0;
  let maxWidth = 0;
  const rows = table.rows;
  for (let i = 0; i < rows.length; i += 1) {
    const cell = rows[i]?.cells?.[columnIndex];
    if (!cell) continue;
    maxWidth = Math.max(maxWidth, measureCellNaturalWidth(cell));
  }
  return maxWidth;
}

/**
 * Redimensionnement de colonnes de table (persisté localStorage).
 * Retourne les largeurs, un style col, et un handler de démarrage de drag.
 * Double-clic sur la poignée → auto-fit type Excel selon le contenu.
 */
export default function useResizableTableColumns({
  storageKey,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH
} = {}) {
  const [widths, setWidths] = useState(() => readStoredWidths(storageKey));
  const [resizingColumnId, setResizingColumnId] = useState(null);
  const dragRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

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
      // Ignore les micro-mouvements (ex. double-clic).
      if (Math.abs(delta) < 2 && !drag.moved) return;
      drag.moved = true;
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
    // Un double-clic déclenche aussi mousedown : on ignore pour laisser place à l’auto-fit.
    if (event.detail > 1 || Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const th = event.currentTarget?.closest?.("th") || options.headerEl || null;
    const measured = th?.getBoundingClientRect?.().width;
    const current = getColumnWidth(columnId) || (Number.isFinite(measured) ? measured : minWidth);
    dragRef.current = {
      columnId: String(columnId),
      startX: event.clientX,
      startWidth: current,
      moved: false,
      onDone: options.onDone
    };
    setResizingColumnId(String(columnId));
    setWidths(prev => ({
      ...prev,
      [columnId]: Math.round(current)
    }));
  }, [getColumnWidth, minWidth]);

  const autoFitColumn = useCallback((event, columnId) => {
    if (!columnId) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickUntilRef.current = Date.now() + 350;
    dragRef.current = null;
    setResizingColumnId(null);

    const handle = event.currentTarget;
    const th = handle?.closest?.("th") || null;
    const table = handle?.closest?.("table") || th?.closest?.("table") || null;
    if (!table || !th) return;

    const measured = measureColumnContentWidth(table, th.cellIndex) + AUTOFIT_GUTTER;
    const nextWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(measured || minWidth)));
    setWidths(prev => {
      const next = {
        ...prev,
        [columnId]: nextWidth
      };
      writeStoredWidths(storageKey, next);
      return next;
    });
  }, [storageKey, minWidth, maxWidth]);

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
    autoFitColumn,
    resetWidths
  };
}
