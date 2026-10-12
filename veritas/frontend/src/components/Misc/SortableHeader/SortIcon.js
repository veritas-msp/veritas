import React from "react";
import { Icon } from "@iconify/react";
import styles from "./SortableHeader.module.css";

/** Icône de tri DocumentsHub : double chevron inactif, flèche unique actif. */
export default function SortIcon({
  active = false,
  direction = "asc",
  className = ""
}) {
  const icon = active
    ? direction === "asc"
      ? "mdi:arrow-up"
      : "mdi:arrow-down"
    : "mdi:unfold-more-horizontal";
  return (
    <Icon
      icon={icon}
      className={`${styles.sortIcon} ${active ? styles.sortIconActive : ""} ${className}`.trim()}
      aria-hidden
    />
  );
}
