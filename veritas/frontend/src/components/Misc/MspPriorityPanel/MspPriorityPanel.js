import dashStyles from "../../CybersecuritePage/AntivirusMspDashboard.module.css";
import MspEmptyState from "../MspEmptyState/MspEmptyState";
import styles from "./MspPriorityPanel.module.css";
export function toneToDotColor(tone) {
  if (tone === "bad" || tone === "critical" || tone === "offline") return "#dc2626";
  if (tone === "warn" || tone === "warning") return "#d97706";
  return "#2b5fab";
}
export default function MspPriorityPanel({
  title,
  countLabel,
  headerAction = null,
  items = [],
  onItemClick,
  emptyIcon = "mdi:shield-check-outline",
  emptyTitle,
  emptyText,
  limit
}) {
  const visibleItems = limit != null ? items.slice(0, limit) : items;
  const showHeaderAside = Boolean(countLabel || headerAction);
  return <section className={dashStyles.priorityPanel}>
      <header className={dashStyles.priorityHeader}>
        <h3 className={dashStyles.priorityTitle}>{title}</h3>
        {showHeaderAside ? <div className={styles.headerAside}>
            {countLabel ? <span className={dashStyles.toolbarMeta}>
                <strong>{countLabel}</strong>
              </span> : null}
            {headerAction}
          </div> : null}
      </header>
      {visibleItems.length === 0 ? emptyTitle ? <div className={styles.emptyWrap}>
            <MspEmptyState icon={emptyIcon} title={emptyTitle} text={emptyText} />
          </div> : null : <div className={dashStyles.priorityList}>
          {visibleItems.map(item => <button key={item.id} type="button" className={dashStyles.priorityItem} onClick={() => onItemClick?.(item)}>
              <span className={dashStyles.priorityDot} style={{
          background: toneToDotColor(item.tone)
        }} />
              <span className={dashStyles.priorityBody}>
                <span className={dashStyles.priorityName}>{item.name}</span>
                {item.meta ? <span className={dashStyles.priorityMeta}>{item.meta}</span> : null}
              </span>
              {item.verb ? <span className={dashStyles.priorityVerb}>{item.verb}</span> : null}
            </button>)}
        </div>}
    </section>;
}
