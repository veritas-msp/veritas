import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./TicketDetailPage.module.css";
import { EMOJI_CATEGORIES, loadRecentEmojis, rememberRecentEmoji, searchEmojis } from "./ticketEmojiCatalog";

const MENU_WIDTH = 320;
const MENU_GAP = 6;
const VIEW_PAD = 8;

function computeMenuStyle(buttonEl) {
  if (!buttonEl) return null;
  const rect = buttonEl.getBoundingClientRect();
  const width = Math.min(MENU_WIDTH, window.innerWidth - VIEW_PAD * 2);
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEW_PAD;
  const spaceAbove = rect.top - MENU_GAP - VIEW_PAD;
  const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
  const available = Math.max(180, openUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(380, available);
  let left = rect.left;
  if (left + width > window.innerWidth - VIEW_PAD) left = window.innerWidth - width - VIEW_PAD;
  if (left < VIEW_PAD) left = VIEW_PAD;
  const top = openUp ? Math.max(VIEW_PAD, rect.top - MENU_GAP - maxHeight) : rect.bottom + MENU_GAP;
  return { top, left, width, maxHeight };
}

export default function TicketEmojiPicker({
  onSelect,
  title,
  searchPlaceholder,
  emptyLabel,
  recentLabel,
  categoryLabels = {}
}) {
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [recent, setRecent] = useState(() => loadRecentEmojis());
  const [menuStyle, setMenuStyle] = useState(null);

  const updateMenuPosition = useCallback(() => {
    const next = computeMenuStyle(buttonRef.current);
    if (next) setMenuStyle(next);
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    requestAnimationFrame(() => searchRef.current?.focus());
    const onPointerDown = event => {
      if (wrapRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  const trimmedQuery = query.trim();
  const results = useMemo(() => (trimmedQuery ? searchEmojis(trimmedQuery) : null), [trimmedQuery]);
  const activeEmojis = useMemo(() => {
    if (results) return results;
    const category = EMOJI_CATEGORIES.find(item => item.id === activeCategory) || EMOJI_CATEGORIES[0];
    return category.emojis;
  }, [activeCategory, results]);

  const handleSelect = emoji => {
    setRecent(rememberRecentEmoji(emoji));
    onSelect?.(emoji);
  };

  const menu = open && menuStyle && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          className={styles.emojiMenu}
          role="dialog"
          aria-label={title}
          style={{
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: menuStyle.maxHeight
          }}
        >
          <div className={styles.emojiSearchRow}>
            <Icon icon="mdi:magnify" className={styles.emojiSearchIcon} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              className={styles.emojiSearchInput}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {!trimmedQuery ? (
            <div className={styles.emojiCategoryRow} role="tablist">
              {EMOJI_CATEGORIES.map(category => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category.id}
                  className={`${styles.emojiCategoryBtn} ${activeCategory === category.id ? styles.emojiCategoryBtnActive : ""}`.trim()}
                  title={categoryLabels[category.id] || category.id}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon icon={category.icon} aria-hidden />
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.emojiMenuScroll}>
            {!trimmedQuery && recent.length > 0 ? (
              <>
                <div className={styles.emojiSectionLabel}>{recentLabel}</div>
                <div className={styles.emojiGrid}>
                  {recent.map(emoji => (
                    <button key={`recent-${emoji}`} type="button" className={styles.emojiBtn} onMouseDown={event => event.preventDefault()} onClick={() => handleSelect(emoji)} title={emoji}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {activeEmojis.length > 0 ? (
              <div className={styles.emojiGrid}>
                {activeEmojis.map((item, index) => (
                  <button key={`${item.e}-${index}`} type="button" className={styles.emojiBtn} onMouseDown={event => event.preventDefault()} onClick={() => handleSelect(item.e)} title={item.e}>
                    {item.e}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emojiEmpty}>{emptyLabel}</div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={styles.emojiPickerWrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toolBtn}
        onClick={() => {
          setOpen(prev => {
            if (prev) return false;
            setMenuStyle(computeMenuStyle(buttonRef.current));
            return true;
          });
        }}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon icon="mdi:emoticon-outline" />
      </button>
      {menu}
    </div>
  );
}
