import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { TECH_NEWS_REACTION_EMOJIS } from "../../api/techNews";
import styles from "./HomeTechNewsColumn.module.css";
const PICKER_WIDTH = 184;
const PICKER_HEIGHT = 96;
const PICKER_GAP = 6;
const PICKER_MARGIN = 8;
function getScrollParent(element) {
  let node = element?.parentElement;
  while (node) {
    const {
      overflowY
    } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
function computePickerPosition(anchorEl) {
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const scrollParent = getScrollParent(anchorEl);
  const boundary = scrollParent ? scrollParent.getBoundingClientRect() : {
    top: PICKER_MARGIN,
    bottom: window.innerHeight - PICKER_MARGIN
  };
  const spaceAbove = rect.top - boundary.top;
  const spaceBelow = boundary.bottom - rect.bottom;
  let top;
  if (spaceBelow >= PICKER_HEIGHT + PICKER_GAP || spaceBelow >= spaceAbove) {
    top = rect.bottom + PICKER_GAP;
  } else {
    top = rect.top - PICKER_HEIGHT - PICKER_GAP;
  }
  top = Math.max(PICKER_MARGIN, Math.min(top, window.innerHeight - PICKER_HEIGHT - PICKER_MARGIN));
  const left = Math.min(Math.max(PICKER_MARGIN, rect.right - PICKER_WIDTH), window.innerWidth - PICKER_WIDTH - PICKER_MARGIN);
  return {
    top,
    left
  };
}
function ReactionPickerMenu({
  open,
  anchorRef,
  pickerRef,
  myReaction,
  pending,
  onReact,
  t
}) {
  const [position, setPosition] = useState(null);
  const updatePosition = useCallback(() => {
    setPosition(computePickerPosition(anchorRef.current));
  }, [anchorRef]);
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    updatePosition();
    const scrollParent = getScrollParent(anchorRef.current);
    window.addEventListener("resize", updatePosition);
    scrollParent?.addEventListener("scroll", updatePosition, {
      passive: true
    });
    return () => {
      window.removeEventListener("resize", updatePosition);
      scrollParent?.removeEventListener("scroll", updatePosition);
    };
  }, [open, anchorRef, updatePosition]);
  if (!open || !position) return null;
  return createPortal(<div ref={pickerRef} className={`${styles.reactionPickerPopover} ${styles.reactionPickerPopoverPortal}`} style={{
    top: position.top,
    left: position.left
  }} role="menu" onPointerDown={event => event.stopPropagation()}>
      {TECH_NEWS_REACTION_EMOJIS.map(emoji => <button key={emoji} type="button" className={`${styles.reactionPickerEmoji} ${myReaction === emoji ? styles.reactionPickerEmojiActive : ""}`} onClick={e => onReact(e, emoji)} disabled={pending} role="menuitem" title={myReaction === emoji ? t.removeReaction : t.addReaction} aria-pressed={myReaction === emoji}>
          {emoji}
        </button>)}
    </div>, document.body);
}
export default function TechNewsReactions({
  articleId,
  reactions = {},
  myReaction = null,
  pending = false,
  onReact,
  t
}) {
  const [openEmoji, setOpenEmoji] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const pickerRef = useRef(null);
  const summary = useMemo(() => {
    return TECH_NEWS_REACTION_EMOJIS.map(emoji => ({
      emoji,
      users: Array.isArray(reactions?.[emoji]) ? reactions[emoji] : []
    })).filter(entry => entry.users.length > 0);
  }, [reactions]);
  const showTextReactBtn = summary.length === 0 && !myReaction;
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onPointerDown = event => {
      if (rootRef.current?.contains(event.target)) return;
      if (pickerRef.current?.contains(event.target)) return;
      setPickerOpen(false);
    };
    const timerId = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pickerOpen]);
  const handleReact = (event, emoji) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending || typeof onReact !== "function") return;
    onReact(articleId, emoji);
    setPickerOpen(false);
  };
  const toggleDetails = (event, emoji) => {
    event.preventDefault();
    event.stopPropagation();
    setPickerOpen(false);
    setOpenEmoji(current => current === emoji ? null : emoji);
  };
  const togglePicker = event => {
    event.preventDefault();
    event.stopPropagation();
    setOpenEmoji(null);
    setPickerOpen(open => !open);
  };
  return <div ref={rootRef} className={`${styles.reactionsBar} ${styles.reactionsBarCompact}`} onClick={e => e.stopPropagation()} role="group" aria-label={t.reactionsLabel}>
      {summary.length > 0 && <div className={styles.reactionSummary}>
          {summary.map(({
        emoji,
        users
      }) => <div key={emoji} className={styles.reactionChipWrap}>
              <button type="button" className={`${styles.reactionChip} ${myReaction === emoji ? styles.reactionChipMine : ""}`} onClick={e => toggleDetails(e, emoji)} aria-expanded={openEmoji === emoji}>
                <span className={styles.reactionChipEmoji}>{emoji}</span>
                <span className={styles.reactionChipCount}>{users.length}</span>
              </button>
              {openEmoji === emoji && <div className={styles.reactionPopover} role="tooltip">
                  <p className={styles.reactionPopoverTitle}>{t.reactedWith(emoji)}</p>
                  <ul className={styles.reactionUserList}>
                    {users.map(user => <li key={user.userId} className={styles.reactionUserItem}>
                        <span className={styles.reactionUserName}>{user.displayName}</span>
                      </li>)}
                  </ul>
                </div>}
            </div>)}
        </div>}

      <div className={styles.reactionAddWrap}>
        {showTextReactBtn ? <button ref={anchorRef} type="button" className={styles.reactionAddBtn} onClick={togglePicker} disabled={pending} aria-label={t.reactAction} aria-expanded={pickerOpen}>
            <Icon icon="mdi:emoticon-happy-outline" className={styles.reactionAddIcon} />
            <span className={styles.reactionAddText}>{t.reactAction}</span>
          </button> : <button ref={anchorRef} type="button" className={`${styles.reactionAddBtn} ${styles.reactionAddBtnIconOnly} ${myReaction ? styles.reactionAddBtnActive : ""}`} onClick={togglePicker} disabled={pending} aria-label={myReaction ? t.changeReaction : t.reactAction} aria-expanded={pickerOpen} title={myReaction ? `${t.changeReaction} (${myReaction})` : t.reactAction}>
            {myReaction ? <span className={styles.reactionAddMine}>{myReaction}</span> : <Icon icon="mdi:emoticon-plus-outline" className={styles.reactionAddIcon} />}
          </button>}
        <ReactionPickerMenu open={pickerOpen} anchorRef={anchorRef} pickerRef={pickerRef} myReaction={myReaction} pending={pending} onReact={handleReact} t={t} />
      </div>
    </div>;
}
