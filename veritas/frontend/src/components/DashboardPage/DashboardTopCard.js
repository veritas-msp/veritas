import { Icon } from "@iconify/react";
import { CHART_COLORS } from "./DashboardCharts";
import styles from "./DashboardTopCard.module.css";
export default function DashboardTopCard({
  title,
  icon,
  items = [],
  previewCount = 5,
  emptyLabel,
  viewAllLabel,
  othersLabel,
  onOpen
}) {
  if (!items?.length) {
    return <article className={styles.card}>
        <h3 className={styles.cardTitle}>
          {icon ? <Icon icon={icon} aria-hidden /> : null}
          {title}
        </h3>
        <p className={styles.emptyHint}>{emptyLabel}</p>
      </article>;
  }
  const preview = items.slice(0, previewCount);
  const max = Math.max(...preview.map(item => item.count), 1);
  const hiddenCount = Math.max(0, items.length - preview.length);
  return <button type="button" className={styles.card} onClick={onOpen} aria-haspopup="dialog">
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          {icon ? <Icon icon={icon} aria-hidden /> : null}
          {title}
        </h3>
        <span className={styles.cardHint}>{viewAllLabel}</span>
      </div>

      <ol className={styles.list}>
        {preview.map((item, index) => <li key={item.name} className={styles.row}>
            <span className={styles.rank}>{index + 1}</span>
            <div className={styles.rowBody}>
              <div className={styles.rowMeta}>
                <span className={styles.rowName}>{item.name}</span>
                <span className={styles.rowCount}>
                  {item.count}
                  {item.pct != null ? ` · ${item.pct}%` : ""}
                </span>
              </div>
              <div className={styles.rowTrack}>
                <span className={styles.rowFill} style={{
              width: `${Math.round(item.count / max * 100)}%`,
              background: CHART_COLORS[index % CHART_COLORS.length]
            }} />
              </div>
            </div>
          </li>)}
      </ol>

      {hiddenCount > 0 ? <span className={styles.moreHint}>
          {othersLabel || `+${hiddenCount}`}
        </span> : null}
    </button>;
}
