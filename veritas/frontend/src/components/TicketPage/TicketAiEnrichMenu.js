import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./TicketDetailPage.module.css";

export const TICKET_ENRICH_MENU_GROUPS = [
  {
    id: "improve",
    items: [
      { id: "enrich", icon: "mdi:auto-fix" },
      { id: "professional", icon: "mdi:briefcase-outline" },
      { id: "friendly", icon: "mdi:hand-heart-outline" },
      { id: "simplify", icon: "mdi:text-short" }
    ]
  },
  {
    id: "transform",
    items: [
      { id: "shorten", icon: "mdi:arrow-collapse-vertical" },
      { id: "expand", icon: "mdi:text-box-plus-outline" },
      { id: "rephrase", icon: "mdi:reload" }
    ]
  },
  {
    id: "structure",
    items: [
      { id: "bullets", icon: "mdi:format-list-bulleted" },
      { id: "steps", icon: "mdi:format-list-numbered" }
    ]
  }
];

function computeMenuStyle(anchorEl) {
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const width = 280;
  const pad = 8;
  const gap = 6;
  let left = rect.left;
  if (left + width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - width - pad);
  const spaceBelow = window.innerHeight - rect.bottom - gap - pad;
  const estimatedHeight = 420;
  const openUp = spaceBelow < 280 && rect.top > spaceBelow;
  const maxHeight = Math.max(220, openUp ? rect.top - gap - pad : spaceBelow);
  const top = openUp ? Math.max(pad, rect.top - gap - Math.min(estimatedHeight, maxHeight)) : rect.bottom + gap;
  return { top, left, width, maxHeight };
}

export default function TicketAiEnrichMenu({
  copy,
  loading = false,
  disabled = false,
  onSelect
}) {
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const updatePosition = useCallback(() => {
    const next = computeMenuStyle(wrapRef.current);
    if (next) setMenuStyle(next);
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (wrapRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const run = mode => {
    setOpen(false);
    onSelect?.(mode);
  };

  const menu = open && menuStyle && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          className={styles.aiEnrichMenu}
          role="menu"
          aria-label={copy.correctAiMenuTitle}
          style={{
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: menuStyle.maxHeight
          }}
        >
          <div className={styles.aiEnrichMenuHead}>{copy.correctAiMenuTitle}</div>
          {TICKET_ENRICH_MENU_GROUPS.map((group, index) => (
            <div key={group.id} className={index > 0 ? styles.aiEnrichGroup : undefined} role="group" aria-label={copy[`correctAiGroup_${group.id}`]}>
              <div className={styles.aiEnrichGroupLabel}>{copy[`correctAiGroup_${group.id}`]}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.aiEnrichItem}
                  role="menuitem"
                  disabled={disabled || loading}
                  onClick={() => run(item.id)}
                >
                  <Icon icon={item.icon} className={styles.aiEnrichItemIcon} aria-hidden />
                  <span className={styles.aiEnrichItemCopy}>
                    <span className={styles.aiEnrichItemTitle}>{copy[`correctAiMode_${item.id}`]}</span>
                    <span className={styles.aiEnrichItemHint}>{copy[`correctAiModeHint_${item.id}`]}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={styles.aiEnrichWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.toolBtn}
        onClick={() => run("enrich")}
        disabled={disabled || loading}
        title={copy.correctAiTitle}
        aria-label={copy.correctAiTitle}
      >
        <Icon icon={loading ? "mdi:loading" : "mdi:auto-fix"} className={loading ? styles.aiToolSpin : undefined} aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.toolBtn} ${styles.aiEnrichChevron}`}
        onClick={() => {
          if (disabled || loading) return;
          setOpen(prev => {
            if (prev) return false;
            setMenuStyle(computeMenuStyle(wrapRef.current));
            return true;
          });
        }}
        disabled={disabled || loading}
        title={copy.correctAiMenuTitle}
        aria-label={copy.correctAiMenuTitle}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon icon="mdi:chevron-down" aria-hidden />
      </button>
      {menu}
    </div>
  );
}
