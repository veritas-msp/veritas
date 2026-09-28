export const TILE_SHAPE_IDS = ["hexagon", "rounded", "circle", "pentagon", "octagon"];
export const DEFAULT_TILE_SHAPE = "hexagon";

const TILE_SHAPE_SET = new Set(TILE_SHAPE_IDS);

/** Polygon outlines drawn via SVG stroke (uniform width). Box/circle use CSS border. */
export const TILE_SVG_STROKE_SHAPES = new Set(["hexagon", "pentagon", "octagon"]);

/** viewBox 0–100; points inset so stroke isn't clipped at edges. */
const TILE_SVG_POLYGONS = {
  hexagon: "50,1.5 98.5,25.75 98.5,74.25 50,98.5 1.5,74.25 1.5,25.75",
  pentagon: "50,2 97,37.5 80,97 20,97 3,37.5",
  octagon: "30,1.5 70,1.5 98.5,30 98.5,70 70,98.5 30,98.5 1.5,70 1.5,30"
};

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

export function usesSvgTileStroke(value) {
  return TILE_SVG_STROKE_SHAPES.has(normalizeTileShape(value));
}

export function getTileSvgPolygonPoints(value) {
  const id = normalizeTileShape(value);
  return TILE_SVG_POLYGONS[id] || TILE_SVG_POLYGONS.hexagon;
}
