import React from "react";
import { Icon } from "@iconify/react";
import styles from "./EquipmentEmptyState.module.css";

/**
 * État vide unifié (icône + titre / sous-titre centrés).
 */
export default function EquipmentEmptyState({
  icon = "mdi:information-outline",
  title = null,
  subtitle = null,
  message,
  children = null,
  className = "",
  compact = false
}) {
  const heading = title || null;
  const detail = subtitle || message || null;
  if (!heading && !detail && !children) return null;
  return (
    <div
      className={`${styles.emptyState} ${compact ? styles.emptyStateCompact : ""} ${className || ""}`.trim()}
      role="status"
    >
      {icon ? <Icon icon={icon} className={styles.emptyStateIcon} aria-hidden /> : null}
      {heading ? <p className={styles.emptyStateTitle}>{heading}</p> : null}
      {detail ? <p className={styles.emptyStateText}>{detail}</p> : null}
      {children}
    </div>
  );
}
