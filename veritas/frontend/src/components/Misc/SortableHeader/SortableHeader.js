import React from "react";
import SortIcon from "./SortIcon";
import styles from "./SortableHeader.module.css";

/**
 * En-tête de colonne triable (th > bouton + icônes).
 * Props sortBy / sortDirection (MSP) ou sortKey / sortDir (supervision).
 */
export default function SortableHeader({
  column,
  label,
  sortBy,
  sortDirection,
  sortKey,
  sortDir,
  sortOrder,
  onSort,
  className = "",
  buttonClassName = "",
  ariaLabel,
  /** true = padding sur le th parent (CRM/MSP) ; false = style DocumentsHub */
  compact = true,
  as = "th"
}) {
  const activeKey = sortBy ?? sortKey;
  const direction = sortDirection ?? sortDir ?? sortOrder ?? "asc";
  const active = activeKey === column;
  const ariaSort = active ? (direction === "asc" ? "ascending" : "descending") : "none";

  const button = (
    <button
      type="button"
      className={`${styles.sortButton} ${compact ? styles.sortButtonCompact : ""} ${buttonClassName}`.trim()}
      onClick={e => {
        e.stopPropagation();
        onSort?.(column);
      }}
      aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
      aria-pressed={active}
    >
      <span>{label}</span>
      <SortIcon active={active} direction={direction} />
    </button>
  );

  if (as === "button") return button;

  return (
    <th
      className={`${compact ? "" : styles.sortableTh} ${className}`.trim()}
      aria-sort={ariaSort}
    >
      {button}
    </th>
  );
}

export { SortIcon };
export { cycleSortState, applyCycleSort } from "./cycleSortState";
