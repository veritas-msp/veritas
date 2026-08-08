import { Icon } from "@iconify/react";
import styles from "./MspEmptyState.module.css";
export default function MspEmptyState({
  icon,
  title,
  text,
  className = "",
  actionLabel = null,
  onAction = null
}) {
  return <div className={`${styles.emptyState} ${className}`.trim()}>
      {icon ? <Icon icon={icon} className={styles.emptyIcon} aria-hidden /> : null}
      {title ? <p className={styles.emptyTitle}>{title}</p> : null}
      {text ? <p className={styles.emptyText}>{text}</p> : null}
      {actionLabel && typeof onAction === "function" ? <button type="button" className={styles.emptyAction} onClick={onAction}>
          {actionLabel}
        </button> : null}
    </div>;
}
