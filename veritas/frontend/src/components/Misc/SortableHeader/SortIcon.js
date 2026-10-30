import React from "react";
import { Icon } from "@iconify/react";
import styles from "./SortableHeader.module.css";

/** Icône de tri : double chevron inactif, chevron unique quand la colonne est triée. */
export default function SortIcon({
  active = false,
  direction = "asc",
  className = ""
}) {
  /* Pas d’icône inactive (mdi:unfold-more-horizontal ressemble à un « . » en dark). */
  if (!active) return null;
  const icon = direction === "asc" ? "mdi:chevron-up" : "mdi:chevron-down";
  return (
    <Icon
      icon={icon}
      className={`${styles.sortIcon} ${styles.sortIconActive} ${className}`.trim()}
      aria-hidden
    />
  );
}
