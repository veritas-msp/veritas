import { Icon } from "@iconify/react";
import styles from "./ClientPortalPages.module.css";

export default function PortalTabBar({
  items = [],
  activeKey,
  onChange,
  ariaLabel,
  className = ""
}) {
  if (!items.length) return null;
  return (
    <div
      className={`${styles.tabBar} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map(item => {
        const active = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`.trim()}
            onClick={() => onChange?.(item.key)}
          >
            {item.icon ? <Icon icon={item.icon} className={styles.tabIcon} aria-hidden /> : null}
            <span className={styles.tabLabel}>{item.label}</span>
            {item.count != null ? <span className={styles.tabCount}>{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
