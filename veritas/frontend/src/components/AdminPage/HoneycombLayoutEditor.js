import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { computeHoneycombClusterMetrics, findHoneycombTile, findHoneycombTileAt, getHoneycombNeighbors, honeycombDisplayOffsetRem, HEX_NEIGHBOR_DIRS, moveHoneycombTile, placeHoneycombTile } from "../EnterprisesPage/infraHoneycombLayout";
import { INFRA_TYPE_ICONS } from "../EnterprisesPage/infraMapUtils";
import { isSquareTileShape, tileShapeClassName } from "../EnterprisesPage/tileShapes";
import shapeStyles from "../EnterprisesPage/honeycombTileShapes.module.css";
import TileShapePicker from "./TileShapePicker";
import styles from "./HoneycombLayoutEditor.module.css";

const EDITOR_METRICS_OPTIONS = {
  maxWidthRem: 72,
  minWidthRem: 12,
  minHeightRem: 10,
  paddingRem: 0.9
};

function remToPx(rem) {
  const root = typeof document === "undefined" ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize);
  return rem * (Number.isFinite(root) && root > 0 ? root : 16);
}

export default function HoneycombLayoutEditor({
  tiles = [],
  currentKey,
  selectedKey,
  onSelectedKeyChange,
  onTilesChange,
  getTileLabel,
  getTileIcon,
  hint,
  moveHint,
  selectedLabel,
  tileShape = "hexagon",
  onTileShapeChange,
  shapeLabel,
  shapeHint,
  shapeLabels = {},
  variant = "modal"
}) {
  const viewportRef = useRef(null);
  const [viewportPx, setViewportPx] = useState({
    width: 0,
    height: 0
  });
  const [draggingKey, setDraggingKey] = useState(null);
  const selected = selectedKey || currentKey;
  const selectedTile = findHoneycombTile(tiles, selected);
  const metrics = useMemo(() => computeHoneycombClusterMetrics(tiles, EDITOR_METRICS_OPTIONS), [tiles]);
  const neighbors = selectedTile ? getHoneycombNeighbors(selectedTile.q, selectedTile.r) : [];

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setViewportPx({
        width: rect.width,
        height: rect.height
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rawWidthPx = remToPx(metrics.rawWidthRem);
  const rawHeightPx = remToPx(metrics.rawHeightRem);
  const fitScale = useMemo(() => {
    if (!viewportPx.width || !rawWidthPx) {
      return Math.min(1, metrics.displayScale || 1);
    }
    return Math.min(1.12, (viewportPx.width - 40) / rawWidthPx);
  }, [metrics.displayScale, rawWidthPx, viewportPx.width]);
  const fittedWidth = rawWidthPx * fitScale;
  const fittedHeight = rawHeightPx * fitScale;

  const resolveLabel = tile => getTileLabel?.(tile) || tile.label || tile.familyKey || tile.key;
  const resolveIcon = tile => getTileIcon?.(tile) || tile.icon || INFRA_TYPE_ICONS[tile.familyKey] || "mdi:hexagon-outline";

  const emitTiles = nextTiles => {
    onTilesChange?.(nextTiles);
  };

  const selectTile = key => {
    onSelectedKeyChange?.(key);
  };

  const moveSelected = (dq, dr) => {
    if (!selected) return;
    emitTiles(moveHoneycombTile(tiles, selected, dq, dr));
  };

  const setGridShape = nextShape => {
    onTileShapeChange?.(nextShape);
  };
  const dropOnCell = (q, r) => {
    const sourceKey = draggingKey || selected;
    if (!sourceKey) return;
    emitTiles(placeHoneycombTile(tiles, sourceKey, q, r));
    selectTile(sourceKey);
    setDraggingKey(null);
  };

  return <div className={`${styles.wrap} ${variant === "page" ? styles.wrapPage : ""}`}>
      <p className={styles.hint}>{hint}</p>
      <div className={styles.stage}>
        <div ref={viewportRef} className={styles.viewport}>
          <div className={styles.clusterFit} style={{
          width: `${fittedWidth}px`,
          height: `${fittedHeight}px`
        }}>
          <div className={styles.cluster} style={{
          "--hex-layout-scale": metrics.layoutScale,
          ...(isSquareTileShape(tileShape) ? {
            "--tile-h": "var(--hex-w)"
          } : {}),
          width: `${metrics.rawWidthRem}rem`,
          height: `${metrics.rawHeightRem}rem`,
          transform: `scale(${fitScale})`
        }}>
            {neighbors.map(cell => {
            const occupant = findHoneycombTileAt(tiles, cell.q, cell.r);
            if (occupant) return null;
            const {
              x,
              y
            } = honeycombDisplayOffsetRem(cell.q, cell.r, metrics);
            return <button key={`ghost-${cell.id}`} type="button" className={`${styles.ghost} ${shapeStyles[tileShapeClassName(tileShape)] || shapeStyles.shapeHexagon}`} style={{
              "--hex-x": `${x}rem`,
              "--hex-y": `${y}rem`
            }} onClick={() => dropOnCell(cell.q, cell.r)} onDragOver={e => e.preventDefault()} onDrop={e => {
              e.preventDefault();
              dropOnCell(cell.q, cell.r);
            }} aria-label={moveHint} />;
          })}
            {tiles.map(tile => {
            const {
              x,
              y
            } = honeycombDisplayOffsetRem(tile.q ?? 0, tile.r ?? 0, metrics);
            const isCurrent = tile.key === currentKey;
            const isSelected = tile.key === selected;
            return <button key={tile.key} type="button" draggable className={[styles.hex, isCurrent ? styles.hexCurrent : "", isSelected ? styles.hexSelected : "", draggingKey === tile.key ? styles.hexDragging : ""].filter(Boolean).join(" ")} style={{
              "--hex-x": `${x}rem`,
              "--hex-y": `${y}rem`
            }} onClick={() => selectTile(tile.key)} onDragStart={e => {
              setDraggingKey(tile.key);
              selectTile(tile.key);
              e.dataTransfer.setData("text/plain", tile.key);
              e.dataTransfer.effectAllowed = "move";
            }} onDragEnd={() => setDraggingKey(null)} onDragOver={e => e.preventDefault()} onDrop={e => {
              e.preventDefault();
              const source = e.dataTransfer.getData("text/plain") || draggingKey;
              if (!source || source === tile.key) return;
              emitTiles(placeHoneycombTile(tiles, source, tile.q, tile.r));
              selectTile(source);
              setDraggingKey(null);
            }}>
                  <span className={`${styles.hexShape} ${shapeStyles[tileShapeClassName(tileShape)] || shapeStyles.shapeHexagon}`} aria-hidden>
                    <span className={styles.hexInner}>
                      <Icon icon={resolveIcon(tile)} />
                      <span className={styles.hexName}>{resolveLabel(tile)}</span>
                    </span>
                  </span>
                </button>;
          })}
          </div>
          </div>
        </div>
        <div className={styles.controls}>
          <p className={styles.selectedMeta}>
            {selectedLabel}: <strong>{selectedTile ? resolveLabel(selectedTile) : "—"}</strong>
          </p>
          <div className={styles.pad}>
            {HEX_NEIGHBOR_DIRS.map(dir => <button key={dir.id} type="button" className={`${styles.arrow} ${styles[`arrow_${dir.id}`]}`} onClick={() => moveSelected(dir.dq, dir.dr)} aria-label={dir.id} disabled={!selectedTile}>
                <Icon icon={dir.icon} />
              </button>)}
          </div>
        </div>
      </div>
      <div className={styles.shapeBlock}>
        <p className={styles.shapeLabel}>{shapeLabel}</p>
        {shapeHint ? <p className={styles.moveHint}>{shapeHint}</p> : null}
        <TileShapePicker value={tileShape} onChange={setGridShape} labels={shapeLabels} />
      </div>
      <p className={styles.moveHint}>{moveHint}</p>
    </div>;
}
