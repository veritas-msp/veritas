import { Icon } from "@iconify/react";
import styles from "../uiKitPrimitives.module.css";

export default function UiKitEmptyState({
  icon = "mdi:inbox-outline",
  title,
  text,
  bare = false,
  className = ""
}) {
  const rootClass = [
    styles.emptyState,
    bare ? styles.emptyStateBare : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {icon ? <Icon icon={icon} className={styles.emptyIcon} aria-hidden /> : null}
      {title ? <p className={styles.emptyTitle}>{title}</p> : null}
      {text ? <p className={styles.emptyText}>{text}</p> : null}
    </div>
  );
}
