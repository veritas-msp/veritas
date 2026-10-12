/** Dégradé conique lissé selon les parts de chaque statut (pas de coupures brutales). */
export function buildParkConicGradient(segments, emptyColor = "#cbd5e1") {
  const list = (Array.isArray(segments) ? segments : []).filter(row => Number(row?.value) > 0);
  const total = list.reduce((sum, row) => sum + Number(row.value), 0);
  if (!total) {
    return `conic-gradient(from -90deg, ${emptyColor} 0% 100%)`;
  }
  const stops = [];
  let pct = 0;
  list.forEach((row, index) => {
    const span = (Number(row.value) / total) * 100;
    const nextPct = pct + span;
    const blend = Math.min(3.2, span / 2.8);
    if (index === 0) {
      stops.push(`${row.color} 0%`);
    } else {
      const prevColor = list[index - 1].color;
      stops.push(`${prevColor} ${Math.max(0, pct - blend)}%`);
      stops.push(`${row.color} ${Math.min(100, pct + blend)}%`);
    }
    if (index === list.length - 1) {
      stops.push(`${row.color} 100%`);
    } else {
      stops.push(`${row.color} ${Math.max(pct, nextPct - blend)}%`);
    }
    pct = nextPct;
  });
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}
