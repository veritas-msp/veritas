import React, { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./TicketDetailPage.module.css";

const MENU_WIDTH = 280;
const MENU_GAP = 6;
const VIEW_PAD = 8;

function computeMenuStyle(anchorRect) {
  if (!anchorRect) return null;
  const width = Math.min(MENU_WIDTH, window.innerWidth - VIEW_PAD * 2);
  const estimatedHeight = 260;
  const spaceBelow = window.innerHeight - anchorRect.bottom - MENU_GAP - VIEW_PAD;
  const spaceAbove = anchorRect.top - MENU_GAP - VIEW_PAD;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(estimatedHeight, available);
  let left = anchorRect.left;
  if (left + width > window.innerWidth - VIEW_PAD) left = window.innerWidth - width - VIEW_PAD;
  if (left < VIEW_PAD) left = VIEW_PAD;
  const top = openUp
    ? Math.max(VIEW_PAD, anchorRect.top - MENU_GAP - maxHeight)
    : anchorRect.bottom + MENU_GAP;
  return { top, left, width, maxHeight };
}

/**
 * Floating @mention autocomplete menu (portal).
 */
export default function TicketMentionMenu({
  open,
  anchorRect,
  items = [],
  activeIndex = 0,
  onSelect,
  onClose,
  emptyLabel = "Aucun résultat",
  agentsLabel = "Agents",
  teamsLabel = "Équipes",
  query = ""
}) {
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = React.useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    setMenuStyle(computeMenuStyle(anchorRect));
  }, [open, anchorRect, items.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (menuRef.current?.contains(event.target)) return;
      onClose?.();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const active = menuRef.current.querySelector(`[data-mention-index="${activeIndex}"]`);
    active?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex]);

  if (!open || !menuStyle || typeof document === "undefined") return null;

  const users = items.filter(item => item.kind === "user");
  const teams = items.filter(item => item.kind === "team");

  const renderGroup = (label, groupItems, indexOffset) => {
    if (groupItems.length === 0) return null;
    return (
      <div className={styles.mentionGroup}>
        <div className={styles.mentionGroupLabel}>{label}</div>
        {groupItems.map((item, i) => {
          const index = indexOffset + i;
          const active = index === activeIndex;
          return (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              data-mention-index={index}
              className={`${styles.mentionOption} ${active ? styles.mentionOptionActive : ""}`.trim()}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onSelect?.(item)}
            >
              <Icon icon={item.icon || (item.kind === "team" ? "mdi:account-group-outline" : "mdi:account-outline")} aria-hidden />
              <span className={styles.mentionOptionMain}>
                <span className={styles.mentionOptionLabel}>@{item.label}</span>
                {item.hint ? <span className={styles.mentionOptionHint}>{item.hint}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return createPortal(
    <div
      ref={menuRef}
      className={styles.mentionMenu}
      role="listbox"
      aria-label="Mentions"
      style={{
        top: menuStyle.top,
        left: menuStyle.left,
        width: menuStyle.width,
        maxHeight: menuStyle.maxHeight
      }}
    >
      {items.length === 0 ? (
        <div className={styles.mentionEmpty}>
          {query ? emptyLabel : emptyLabel}
        </div>
      ) : (
        <>
          {renderGroup(agentsLabel, users, 0)}
          {renderGroup(teamsLabel, teams, users.length)}
        </>
      )}
    </div>,
    document.body
  );
}
