import { TILE_SHAPE_IDS, normalizeTileShape, tileShapeClassName } from "../EnterprisesPage/tileShapes";
import shapeStyles from "../EnterprisesPage/honeycombTileShapes.module.css";
import styles from "./TileShapePicker.module.css";

export default function TileShapePicker({
  value,
  onChange,
  labels = {},
  disabled = false
}) {
  const selected = normalizeTileShape(value);
  return <div className={styles.grid} role="listbox" aria-label={labels.title || "Shape"}>
      {TILE_SHAPE_IDS.map(id => {
      const active = id === selected;
      return <button key={id} type="button" role="option" aria-selected={active} disabled={disabled} className={`${styles.swatch} ${active ? styles.swatchActive : ""}`} title={labels[id] || id} onClick={() => onChange?.(id)}>
            <span className={`${styles.preview} ${id === "hexagon" ? styles.previewHex : ""} ${shapeStyles[tileShapeClassName(id)] || ""}`} aria-hidden />
            <span className={styles.caption}>{labels[id] || id}</span>
          </button>;
    })}
    </div>;
}
