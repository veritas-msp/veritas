import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { TECH_NEWS_QUICK_REACTION_EMOJIS, TECH_NEWS_REACTION_EMOJIS } from "../../api/techNews";
import styles from "./HomeTechNewsColumn.module.css";

const PICKER_COLUMNS = 6;
const PICKER_CELL = 32;
const PICKER_PAD = 12;
const PICKER_GAP = 6;
const PICKER_MARGIN = 8;

function getPickerSize(emojiCount) {
  const rows = Math.ceil(emojiCount / PICKER_COLUMNS);
  return {
    width: PICKER_COLUMNS * PICKER_CELL + PICKER_PAD * 2 + (PICKER_COLUMNS - 1) * 4,
    height: rows * PICKER_CELL + PICKER_PAD * 2 + (rows - 1) * 4
  };
}

function getScrollParent(element) {
  let node = element?.parentElement;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function computePickerPosition(anchorEl, pickerSize) {
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const scrollParent = getScrollParent(anchorEl);
  const boundary = scrollParent
    ? scrollParent.getBoundingClientRect()
    : { top: PICKER_MARGIN, bottom: window.innerHeight - PICKER_MARGIN };
  const spaceAbove = rect.top - boundary.top;
  const spaceBelow = boundary.bottom - rect.bottom;
  let top;
  if (spaceBelow >= pickerSize.height + PICKER_GAP || spaceBelow >= spaceAbove) {
    top = rect.bottom + PICKER_GAP;
  } else {
    top = rect.top - pickerSize.height - PICKER_GAP;
  }
  top = Math.max(PICKER_MARGIN, Math.min(top, window.innerHeight - pickerSize.height - PICKER_MARGIN));
  const left = Math.min(
    Math.max(PICKER_MARGIN, rect.right - pickerSize.width),
    window.innerWidth - pickerSize.width - PICKER_MARGIN
  );
  return { top, left };
}

function ReactionPickerMenu({ open, anchorRef, pickerRef, myReaction, pending, onReact, t, pickerSize }) {
  const [position, setPosition] = useState(null);
  const updatePosition = useCallback(() => {
    setPosition(computePickerPosition(anchorRef.current, pickerSize));
  }, [anchorRef, pickerSize]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    updatePosition();
    const scrollParent = getScrollParent(anchorRef.current);
    window.addEventListener("resize", updatePosition);
    scrollParent?.addEventListener("scroll", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePosition);
      scrollParent?.removeEventListener("scroll", updatePosition);
    };
  }, [open, anchorRef, updatePosition]);

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={pickerRef}
      className={`${styles.reactionPickerPopover} ${styles.reactionPickerPopoverPortal}`}
      style={{ top: position.top, left: position.left, width: pickerSize.width }}
      role="menu"
      onPointerDown={event => event.stopPropagation()}
    >
      <p className={styles.reactionPickerTitle}>{t.allReactions}</p>
      <div className={styles.reactionPickerGrid}>
        {TECH_NEWS_REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            className={`${styles.reactionPickerEmoji} ${myReaction === emoji ? styles.reactionPickerEmojiActive : ""}`}
            onClick={e => onReact(e, emoji)}
            disabled={pending}
            role="menuitem"
            title={myReaction === emoji ? t.removeReaction : t.addReaction}
            aria-pressed={myReaction === emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

export default function TechNewsReactions({
  articleId,
  reactions = {},
  myReaction = null,
  pending = false,
  onReact,
  t,
  className
}) {
  const [openEmoji, setOpenEmoji] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const pickerRef = useRef(null);
  const pickerSize = useMemo(() => getPickerSize(TECH_NEWS_REACTION_EMOJIS.length), []);

  const summary = useMemo(() => {
    return TECH_NEWS_REACTION_EMOJIS.map(emoji => ({
      emoji,
      users: Array.isArray(reactions?.[emoji]) ? reactions[emoji] : []
    }))
      .filter(entry => entry.users.length > 0)
      .sort((a, b) => {
        if (b.users.length !== a.users.length) return b.users.length - a.users.length;
        return TECH_NEWS_REACTION_EMOJIS.indexOf(a.emoji) - TECH_NEWS_REACTION_EMOJIS.indexOf(b.emoji);
      });
  }, [reactions]);

  useEffect(() => {
    if (!pickerOpen && !openEmoji) return undefined;
    const onPointerDown = event => {
      if (rootRef.current?.contains(event.target)) return;
      if (pickerRef.current?.contains(event.target)) return;
      setPickerOpen(false);
      setOpenEmoji(null);
    };
    const timerId = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pickerOpen, openEmoji]);

  const handleReact = (event, emoji) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending || typeof onReact !== "function") return;
    onReact(articleId, emoji);
    setPickerOpen(false);
    setOpenEmoji(null);
  };

  const toggleDetails = (event, emoji) => {
    event.preventDefault();
    event.stopPropagation();
    setPickerOpen(false);
    setOpenEmoji(current => (current === emoji ? null : emoji));
  };

  const togglePicker = event => {
    event.preventDefault();
    event.stopPropagation();
    setOpenEmoji(null);
    setPickerOpen(open => !open);
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.reactionsBar} ${styles.reactionsBarCompact}${className ? ` ${className}` : ""}`}
      onClick={e => e.stopPropagation()}
      role="group"
      aria-label={t.reactionsLabel}
    >
      {summary.length > 0 && (
        <div className={styles.reactionSummary}>
          {summary.map(({ emoji, users }) => (
            <div key={emoji} className={styles.reactionChipWrap}>
              <div
                className={`${styles.reactionChip} ${myReaction === emoji ? styles.reactionChipMine : ""}`}
              >
                <button
                  type="button"
                  className={styles.reactionChipEmojiBtn}
                  onClick={e => handleReact(e, emoji)}
                  disabled={pending}
                  title={myReaction === emoji ? t.removeReaction : t.addReaction}
                  aria-pressed={myReaction === emoji}
                >
                  {emoji}
                </button>
                <button
                  type="button"
                  className={styles.reactionChipCountBtn}
                  onClick={e => toggleDetails(e, emoji)}
                  aria-expanded={openEmoji === emoji}
                  title={t.whoReacted}
                >
                  {users.length}
                </button>
              </div>
              {openEmoji === emoji && (
                <div className={styles.reactionPopover} role="tooltip">
                  <p className={styles.reactionPopoverTitle}>{t.reactedWith(emoji)}</p>
                  <ul className={styles.reactionUserList}>
                    {users.map(user => (
                      <li key={user.userId} className={styles.reactionUserItem}>
                        <span className={styles.reactionUserName}>{user.displayName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.reactionActions}>
        <div className={styles.quickReactions} aria-label={t.quickReactionsLabel}>
          {TECH_NEWS_QUICK_REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              className={`${styles.quickReactionBtn} ${myReaction === emoji ? styles.quickReactionBtnActive : ""}`}
              onClick={e => handleReact(e, emoji)}
              disabled={pending}
              title={myReaction === emoji ? t.removeReaction : t.addReaction}
              aria-pressed={myReaction === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className={styles.reactionAddWrap}>
          <button
            ref={anchorRef}
            type="button"
            className={`${styles.reactionAddBtn} ${styles.reactionAddBtnIconOnly} ${pickerOpen ? styles.reactionAddBtnOpen : ""}`}
            onClick={togglePicker}
            disabled={pending}
            aria-label={t.moreReactions}
            aria-expanded={pickerOpen}
            title={t.moreReactions}
          >
            <Icon icon="mdi:emoticon-plus-outline" className={styles.reactionAddIcon} />
          </button>
          <ReactionPickerMenu
            open={pickerOpen}
            anchorRef={anchorRef}
            pickerRef={pickerRef}
            myReaction={myReaction}
            pending={pending}
            onReact={handleReact}
            t={t}
            pickerSize={pickerSize}
          />
        </div>
      </div>
    </div>
  );
}
