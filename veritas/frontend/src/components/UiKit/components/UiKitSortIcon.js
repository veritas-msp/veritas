import { Icon } from "@iconify/react";
import styles from "../uiKitTable.module.css";

/** Même double flèche sur chaque en-tête. La colonne active ne change que la couleur. */
export default function UiKitSortIcon({ active = false, direction = "asc", className = "" }) {
  const icon = "mdi:unfold-more-vertical";
  return (
    <Icon
      icon={icon}
      data-direction={active ? direction : undefined}
      className={`${styles.tableSortIcon}${active ? ` ${styles.tableSortIconActive}` : ""}${className ? ` ${className}` : ""}`}
      aria-hidden
    />
  );
}
