import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./ContextMenu.module.css";

/**
 * Generic floating context menu.
 * items: [{ key, label, icon?, danger?, disabled?, separator?, onSelect? }]
 */
export default function ContextMenu({
  x = 0,
  y = 0,
  title = null,
  items = [],
  onClose,
  ariaLabel = "Menu contextuel"
}) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ left: x, top: y });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - rect.width - pad);
    if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - rect.height - pad);
    setCoords({ left, top });
  }, [x, y, items.length, title]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    const onPointerDown = event => {
      if (!menuRef.current?.contains(event.target)) onClose?.();
    };
    const onScroll = () => onClose?.();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  if (!items.length) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: coords.left, top: coords.top }}
      role="menu"
      aria-label={ariaLabel}
    >
      {title ? <div className={styles.contextMenuTitle}>{title}</div> : null}
      {items.map(item =>
        item.separator ? (
          <div key={item.key} className={styles.contextMenuSep} role="separator" />
        ) : (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            className={`${styles.contextMenuItem} ${item.danger ? styles.contextMenuItemDanger : ""}`.trim()}
            disabled={Boolean(item.disabled)}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect?.();
              onClose?.();
            }}
          >
            {item.icon ? <Icon icon={item.icon} aria-hidden /> : null}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>,
    document.body
  );
}
