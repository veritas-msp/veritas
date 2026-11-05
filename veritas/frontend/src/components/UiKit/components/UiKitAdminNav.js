import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "../uiKitAdmin.module.css";
import UiKitScrollFadeShell from "./UiKitScrollFadeShell";
import AdminAnimatedIcon, { useAdminIconHover } from "../../AdminPage/AdminAnimatedIcon";

function isItemActive(item, activeKey) {
  return activeKey === item.key && !item.proOnly;
}

function AdminNavItemButton({
  item,
  className,
  onClick,
  "aria-current": ariaCurrent,
  "aria-disabled": ariaDisabled,
  "aria-expanded": ariaExpanded,
  children,
  iconSize = 18
}) {
  const { animRef, onMouseEnter, onMouseLeave } = useAdminIconHover();
  const showIcon = Boolean(item?.icon || item?.key);

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
      aria-disabled={ariaDisabled}
      aria-expanded={ariaExpanded}
      onMouseEnter={showIcon ? onMouseEnter : undefined}
      onMouseLeave={showIcon ? onMouseLeave : undefined}
    >
      {showIcon ? (
        <span className={styles.adminNavIcon} aria-hidden>
          <AdminAnimatedIcon iconKey={item.key} iconify={item.icon} size={iconSize} animRef={animRef} />
        </span>
      ) : null}
      {children}
    </button>
  );
}

function AdminNavSectionTitle({ section }) {
  const { animRef, onMouseEnter, onMouseLeave } = useAdminIconHover();
  const showIcon = Boolean(section.icon || section.id);
  if (!section.title) return null;
  return (
    <div
      className={styles.adminNavSectionTitle}
      onMouseEnter={showIcon ? onMouseEnter : undefined}
      onMouseLeave={showIcon ? onMouseLeave : undefined}
    >
      {showIcon ? (
        <span className={styles.adminNavSectionIcon} aria-hidden>
          <AdminAnimatedIcon iconKey={section.id} iconify={section.icon} size={14} animRef={animRef} />
        </span>
      ) : null}
      <span>{section.title}</span>
    </div>
  );
}

/**
 * Navigation administration réutilisable (recherche, sections, groupes, badge Pro, indicateur glissant).
 *
 * sections: [{ title, id?, icon?, items: [{ key, label, description, icon, proOnly?, children? }] }]
 */
export default function UiKitAdminNav({
  sections = [],
  activeKey,
  searchValue = "",
  onSearchChange,
  onSearchClear,
  searchPlaceholder = "Rechercher un menu…",
  clearSearchLabel = "Effacer la recherche",
  noResultsLabel = "",
  onItemClick,
  isGroupExpanded = () => false,
  onToggleGroup,
  renderProBadge
}) {
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    ready: false
  });

  const expandedKey = sections
    .flatMap(section => section.items)
    .filter(item => item.children && isGroupExpanded(item.key))
    .map(item => item.key)
    .join("|");
  const sectionsKey = sections
    .map(section => `${section.title || ""}:${section.items.map(item => item.key).join(",")}`)
    .join("|");

  useLayoutEffect(() => {
    const root = navRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-current="page"]');
      if (!active) {
        setIndicator(prev => (prev.ready || prev.height ? { ...prev, ready: false, height: 0 } : prev));
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      const next = {
        top: Math.round(r.top - rootRect.top),
        left: Math.round(r.left - rootRect.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        ready: true
      };
      setIndicator(prev =>
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.ready
          ? prev
          : next
      );
    };
    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeKey, expandedKey, sectionsKey, searchValue]);

  const renderLabelRow = item => (
    <span className={styles.adminNavItemLabelRow}>
      <span className={styles.adminNavItemLabel}>{item.label}</span>
      {item.proOnly && renderProBadge ? renderProBadge(item) : null}
    </span>
  );

  const itemClass = (item, extra = "") =>
    [
      styles.adminNavItem,
      extra,
      isItemActive(item, activeKey) ? styles.adminNavItemActive : "",
      item.proOnly ? styles.adminNavItemProLocked : ""
    ]
      .filter(Boolean)
      .join(" ");

  const isEmpty = sections.length === 0;
  const hasSearch = Boolean(String(searchValue || "").trim());

  return (
    <>
      <div className={styles.adminMenuTop}>
        <label className={styles.adminMenuSearch}>
          <Icon icon="mdi:magnify" className={styles.adminMenuSearchIcon} aria-hidden />
          <input
            type="search"
            className={styles.adminMenuSearchInput}
            value={searchValue}
            onChange={event => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {searchValue ? (
            <button
              type="button"
              className={styles.adminMenuSearchClear}
              onClick={() => (onSearchClear ? onSearchClear() : onSearchChange?.(""))}
              aria-label={clearSearchLabel}
            >
              <Icon icon="mdi:close" aria-hidden />
            </button>
          ) : null}
        </label>
      </div>
      <UiKitScrollFadeShell
        className={styles.adminMenuNav}
        deps={[sections.length, searchValue, activeKey, expandedKey]}
      >
        <div className={styles.adminNavTrack} ref={navRef}>
          {indicator.ready ? (
            <span
              className={styles.adminNavIndicator}
              style={{
                transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
                width: indicator.width,
                height: indicator.height
              }}
              aria-hidden
            />
          ) : null}
          {isEmpty && hasSearch ? <p className={styles.adminNavEmpty}>{noResultsLabel}</p> : null}
          {sections.map(section => (
            <div key={section.title || section.items[0]?.key} className={styles.adminNavSection}>
              <AdminNavSectionTitle section={section} />
              <ul className={styles.adminNavList}>
                {section.items.map(item => {
                  if (item.children) {
                    const expanded = isGroupExpanded(item.key);
                    const hasActiveChild = item.children.some(child => isItemActive(child, activeKey));
                    return (
                      <li key={item.key} className={styles.adminNavGroup}>
                        <AdminNavItemButton
                          item={item}
                          className={`${styles.adminNavItem} ${styles.adminNavGroupToggle}${hasActiveChild ? ` ${styles.adminNavGroupActive}` : ""}`}
                          onClick={() => onToggleGroup?.(item.key)}
                          aria-expanded={expanded}
                        >
                          <span className={styles.adminNavItemText}>
                            {renderLabelRow(item)}
                            <span className={styles.adminNavItemDesc}>{item.description}</span>
                          </span>
                          <Icon
                            icon="mdi:chevron-down"
                            className={`${styles.adminNavGroupChevron}${expanded ? ` ${styles.adminNavGroupChevronOpen}` : ""}`}
                            aria-hidden
                          />
                        </AdminNavItemButton>
                        {expanded ? (
                          <ul className={`${styles.adminNavSubList} ${styles.adminNavSubListOpen}`}>
                            {item.children.map(child => (
                              <li key={child.key}>
                                <AdminNavItemButton
                                  item={child}
                                  className={itemClass(child, styles.adminNavSubItem)}
                                  onClick={() => onItemClick?.(child)}
                                  aria-current={isItemActive(child, activeKey) ? "page" : undefined}
                                  aria-disabled={child.proOnly || undefined}
                                  iconSize={16}
                                >
                                  <span className={styles.adminNavItemText}>
                                    {renderLabelRow(child)}
                                    <span className={styles.adminNavItemDesc}>{child.description}</span>
                                  </span>
                                </AdminNavItemButton>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  }
                  return (
                    <li key={item.key}>
                      <AdminNavItemButton
                        item={item}
                        className={itemClass(item)}
                        onClick={() => onItemClick?.(item)}
                        aria-current={isItemActive(item, activeKey) ? "page" : undefined}
                        aria-disabled={item.proOnly || undefined}
                      >
                        <span className={styles.adminNavItemText}>
                          {renderLabelRow(item)}
                          <span className={styles.adminNavItemDesc}>{item.description}</span>
                        </span>
                      </AdminNavItemButton>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </UiKitScrollFadeShell>
    </>
  );
}
