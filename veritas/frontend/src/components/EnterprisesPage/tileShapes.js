export const TILE_SHAPE_IDS = ["hexagon", "rounded", "circle", "pentagon", "octagon"];
export const DEFAULT_TILE_SHAPE = "hexagon";

const TILE_SHAPE_SET = new Set(TILE_SHAPE_IDS);

export function normalizeTileShape(value) {
  const raw = String(value || "").trim().toLowerCase();
  return TILE_SHAPE_SET.has(raw) ? raw : DEFAULT_TILE_SHAPE;
}

export function tileShapeClassName(value) {
  const id = normalizeTileShape(value);
  return `shape${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

export function isSquareTileShape(value) {
  return normalizeTileShape(value) !== DEFAULT_TILE_SHAPE;
}
