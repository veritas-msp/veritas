import React from "react";
import { Icon } from "@iconify/react";
import styles from "./EquipmentEmptyState.module.css";

/**
 * État vide unifié (icône + message centrés), aligné sur
 * « Aucun service CheckMK » de la carte État des services.
 */
export default function EquipmentEmptyState({
  icon = "mdi:information-outline",
  message,
  children = null,
  className = "",
  compact = false
}) {
  if (!message && !children) return null;
  return (
    <div
      className={`${styles.emptyState} ${compact ? styles.emptyStateCompact : ""} ${className || ""}`.trim()}
      role="status"
    >
      {icon ? <Icon icon={icon} className={styles.emptyStateIcon} aria-hidden /> : null}
      {message ? <p className={styles.emptyStateText}>{message}</p> : null}
      {children}
    </div>
  );
}
