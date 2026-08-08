import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import styles from "./EmbeddedEquipmentActionsMenu.module.css";
const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;
function getMenuPosition(triggerEl, menuEl) {
  if (!triggerEl) return null;
  const triggerRect = triggerEl.getBoundingClientRect();
  const menuWidth = menuEl?.offsetWidth || 240;
  const menuHeight = menuEl?.offsetHeight || 220;
  let top = triggerRect.bottom + MENU_GAP;
  let left = triggerRect.right - menuWidth;
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }
  if (left + menuWidth > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - menuWidth - VIEWPORT_PADDING;
  }
  if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = triggerRect.top - menuHeight - MENU_GAP;
  }
  return {
    position: "fixed",
    top: Math.max(VIEWPORT_PADDING, top),
    left: Math.max(VIEWPORT_PADDING, left),
    zIndex: 10050
  };
}
export default function EmbeddedEquipmentActionsMenu({
  menuKey,
  openMenuKey,
  onOpenChange,
  items = [],
  isPro = false
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const isOpen = openMenuKey === menuKey;
  const updateMenuPosition = () => {
    const nextStyle = getMenuPosition(triggerRef.current, menuRef.current);
    if (nextStyle) setMenuStyle(nextStyle);
  };
  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    const raf = window.requestAnimationFrame(updateMenuPosition);
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, items.length]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleReposition = () => updateMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(null);
    };
    const handleEscape = event => {
      if (event.key === "Escape") onOpenChange(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onOpenChange]);
  if (!items.length) return null;
  const menuContent = isOpen ? <div ref={menuRef} className={styles.menu} style={menuStyle || undefined} role="menu">
      {items.map((item, index) => {
      if (item.type === "divider") {
        return <div key={`divider-${index}`} className={styles.divider} role="separator" />;
      }
      return <button key={item.id} type="button" role="menuitem" className={[styles.menuItem, item.active ? styles.menuItemActive : undefined, item.danger ? styles.menuItemDanger : undefined].filter(Boolean).join(" ")} disabled={item.disabled} onClick={event => {
        event.stopPropagation();
        onOpenChange(null);
        if (item.proOnly && !isPro) {
          item.onClick?.();
          return;
        }
        item.onClick?.();
      }}>
            {item.icon ? <Icon icon={item.icon} width={18} height={18} aria-hidden /> : null}
            <span className={styles.menuItemLabel}>{item.label}</span>
            {item.proOnly && !isPro ? <ProFeatureBadge variant="inline" className={styles.menuProBadge} /> : null}
          </button>;
    })}
    </div> : null;
  return <div className={styles.root} ref={rootRef} onClick={event => event.stopPropagation()}>
      <button ref={triggerRef} type="button" className={styles.trigger} aria-label="Actions" aria-haspopup="menu" aria-expanded={isOpen} onClick={event => {
      event.stopPropagation();
      onOpenChange(isOpen ? null : menuKey);
    }}>
        <Icon icon="mdi:dots-horizontal" aria-hidden />
      </button>
      {menuContent && typeof document !== "undefined" ? createPortal(menuContent, document.body) : null}
    </div>;
}
