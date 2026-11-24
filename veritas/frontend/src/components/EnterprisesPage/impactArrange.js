function boxOf(node) {
  const isGroup = node.data?.nodeType === "group";
  const width = Number(node.measured?.width || node.width || node.style?.width || (isGroup ? node.data?.width : 0));
  const height = Number(node.measured?.height || node.height || node.style?.height || (isGroup ? node.data?.height : 0));
  const w = Number.isFinite(width) && width > 0 ? width : (isGroup ? 360 : 188);
  const h = Number.isFinite(height) && height > 0 ? height : (isGroup ? 220 : 64);
  const x = Number(node.position?.x) || 0;
  const y = Number(node.position?.y) || 0;
  return { id: node.id, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function place(box, cx, cy) {
  return {
    x: Math.round(cx - box.w / 2),
    y: Math.round(cy - box.h / 2)
  };
}

/** Aligne ou répartit la sélection. Les positions renvoyées sont le coin haut-gauche. */
export function arrangeSelection(nodes, mode) {
  const boxes = (Array.isArray(nodes) ? nodes : []).filter(Boolean).map(boxOf);
  if (boxes.length < 2) return new Map();
  const positions = new Map();
  if (mode === "horizontal") {
    const mid = (Math.min(...boxes.map(box => box.cy)) + Math.max(...boxes.map(box => box.cy))) / 2;
    boxes.forEach(box => positions.set(box.id, { x: Math.round(box.x), y: Math.round(mid - box.h / 2) }));
    return positions;
  }
  if (mode === "vertical") {
    const mid = (Math.min(...boxes.map(box => box.cx)) + Math.max(...boxes.map(box => box.cx))) / 2;
    boxes.forEach(box => positions.set(box.id, { x: Math.round(mid - box.w / 2), y: Math.round(box.y) }));
    return positions;
  }
  if (mode === "grid") {
    const ordered = [...boxes].sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));
    const cols = Math.ceil(Math.sqrt(ordered.length));
    const cellW = Math.max(...ordered.map(box => box.w)) + 40;
    const cellH = Math.max(...ordered.map(box => box.h)) + 28;
    const originX = Math.min(...ordered.map(box => box.x));
    const originY = Math.min(...ordered.map(box => box.y));
    ordered.forEach((box, index) => {
      positions.set(box.id, {
        x: Math.round(originX + (index % cols) * cellW),
        y: Math.round(originY + Math.floor(index / cols) * cellH)
      });
    });
    return positions;
  }
  const cx = boxes.reduce((sum, box) => sum + box.cx, 0) / boxes.length;
  const cy = boxes.reduce((sum, box) => sum + box.cy, 0) / boxes.length;
  const ordered = [...boxes].sort((a, b) => Math.atan2(a.cy - cy, a.cx - cx) - Math.atan2(b.cy - cy, b.cx - cx));
  const span = Math.max(...ordered.map(box => Math.max(box.w, box.h)), 160);
  const radius = Math.max(span * 1.15, (ordered.length * (span + 24)) / (2 * Math.PI));
  const rx = mode === "oval" ? radius * 1.55 : radius;
  const ry = mode === "oval" ? radius * 0.72 : radius;
  ordered.forEach((box, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / ordered.length;
    positions.set(box.id, place(box, cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry));
  });
  return positions;
}
