import styles from "./DashboardPage.module.css";
export const CHART_COLORS = ["var(--dash-chart-1)", "var(--dash-chart-2)", "var(--dash-chart-3)", "var(--dash-chart-4)", "var(--dash-chart-5)", "var(--dash-chart-6)", "var(--dash-chart-7)", "var(--dash-chart-8)"];
export function buildDistributionItems(entries = []) {
  const total = entries.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
  if (total <= 0) return {
    items: [],
    total: 0
  };
  return {
    total,
    items: entries.map(entry => {
      const name = String(entry.name || entry.label || entry.key || "Autre").trim() || "Autre";
      const count = Number(entry.count) || 0;
      return {
        name,
        count,
        pct: Math.round(count / total * 100)
      };
    })
  };
}
export function DashboardPieChart({
  items,
  total,
  emptyLabel = "No data",
  centerLabel
}) {
  if (!items?.length || total <= 0) {
    return <p className={styles.emptyHint}>{emptyLabel}</p>;
  }
  let cursor = 0;
  const slices = items.map((item, index) => {
    const share = item.count / total;
    const start = cursor * 100;
    cursor += share;
    const end = cursor * 100;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    return {
      ...item,
      color,
      gradient: `${color} ${start}% ${end}%`
    };
  });
  const gradient = slices.map(slice => slice.gradient).join(", ");
  return <div className={styles.pieBlock}>
      <div className={styles.pieChart} style={{
      background: `conic-gradient(${gradient})`
    }} role="img" aria-label={`Distribution across ${total} item${total > 1 ? "s" : ""}`}>
        <div className={styles.pieCenter}>
          <span className={styles.pieCenterValue}>{centerLabel ?? total}</span>
          <span className={styles.pieCenterLabel}>total</span>
        </div>
      </div>
      <ul className={styles.legend}>
        {slices.map(slice => <li key={slice.name} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{
          background: slice.color
        }} />
            <span className={styles.legendText}>
              <span className={styles.legendName}>{slice.name}</span>
              <span className={styles.legendMeta}>
                {slice.count} · {slice.pct}%
              </span>
            </span>
          </li>)}
      </ul>
    </div>;
}
export function DashboardDistributionBars({
  items,
  emptyLabel = "No data"
}) {
  if (!items?.length) {
    return <p className={styles.emptyHint}>{emptyLabel}</p>;
  }
  const max = Math.max(...items.map(item => item.count), 1);
  return <div className={styles.distributionList}>
      {items.map((item, index) => <div key={item.name} className={styles.distributionRow}>
          <div className={styles.distributionMeta}>
            <span className={styles.distributionName}>{item.name}</span>
            <span className={styles.distributionCount}>
              {item.count} ({item.pct}%)
            </span>
          </div>
          <div className={styles.distributionTrack}>
            <span className={styles.distributionFill} style={{
          width: `${Math.round(item.count / max * 100)}%`,
          background: CHART_COLORS[index % CHART_COLORS.length]
        }} />
          </div>
        </div>)}
    </div>;
}
