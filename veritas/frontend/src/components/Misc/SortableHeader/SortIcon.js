import React from "react";
import { Icon } from "@iconify/react";
import styles from "./SortableHeader.module.css";

/** Icône de tri : double chevron inactif, chevron unique quand la colonne est triée. */
export default function SortIcon({
  active = false,
  direction = "asc",
  className = ""
}) {
  const icon = active
    ? direction === "asc"
      ? "mdi:chevron-up"
      : "mdi:chevron-down"
    : "mdi:unfold-more-horizontal";
  return (
    <Icon
      icon={icon}
      className={`${styles.sortIcon} ${active ? styles.sortIconActive : ""} ${className}`.trim()}
      aria-hidden
    />
  );
}
