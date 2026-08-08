import React from "react";
import { Icon } from "@iconify/react";
import styles from "./UpcomingEventBookmarks.module.css";
export default function HeroBookmarkCollapseHeader({
  collapsed,
  onToggle,
  icon,
  title,
  summary,
  expandAria,
  collapseAria
}) {
  return <button type="button" className={styles.barCollapseToggle} onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? expandAria : collapseAria}>
      <span className={styles.barCollapseToggleMain}>
        <Icon icon={icon} className={styles.barCollapseToggleIcon} aria-hidden />
        <span className={styles.barCollapseToggleTitle}>{title}</span>
        {summary != null && summary !== false ? <span className={typeof summary === "string" || typeof summary === "number" ? styles.barCollapseToggleSummary : styles.barCollapseToggleBadge}>
            {summary}
          </span> : null}
      </span>
      <Icon icon={collapsed ? "mdi:chevron-down" : "mdi:chevron-up"} className={styles.barCollapseChevron} aria-hidden />
    </button>;
}
