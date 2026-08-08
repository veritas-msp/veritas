import React, { useRef, useState, useLayoutEffect, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./SidebarTooltip.module.css";
const GAP = 10;
const EST_WIDTH = 200;
const DEFAULT_SHOW_DELAY_MS = 400;
export default function SidebarTooltip({
  as: Component = "span",
  content,
  className = "",
  showDelayMs = DEFAULT_SHOW_DELAY_MS,
  children,
  ...rest
}) {
  const triggerRef = useRef(null);
  const showTimerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({
    top: 0,
    left: 0
  });
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    let left = rect.right + GAP;
    left = Math.min(left, window.innerWidth - EST_WIDTH - 12);
    setPos({
      top: rect.top + rect.height / 2,
      left: Math.max(12, left)
    });
  }, []);
  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);
  const onShow = useCallback(() => {
    if (!content) return;
    clearShowTimer();
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      updatePosition();
      setVisible(true);
    }, showDelayMs);
  }, [content, updatePosition, showDelayMs, clearShowTimer]);
  const onHide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer]);
  useEffect(() => () => clearShowTimer(), [clearShowTimer]);
  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const id = requestAnimationFrame(() => updatePosition());
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [visible, updatePosition]);
  if (!content) {
    return <Component ref={triggerRef} className={className} {...rest}>
        {children}
      </Component>;
  }
  const {
    onMouseEnter: userMouseEnter,
    onMouseLeave: userMouseLeave,
    onFocus: userFocus,
    onBlur: userBlur,
    ...domRest
  } = rest;
  return <>
      <Component ref={triggerRef} className={className} {...domRest} onMouseEnter={e => {
      userMouseEnter?.(e);
      onShow();
    }} onMouseLeave={e => {
      userMouseLeave?.(e);
      onHide();
    }} onFocus={e => {
      userFocus?.(e);
      onShow();
    }} onBlur={e => {
      userBlur?.(e);
      onHide();
    }}>
        {children}
      </Component>
      {visible && createPortal(<div className={styles.root} style={{
      position: "fixed",
      top: pos.top,
      left: pos.left,
      transform: "translateY(-50%)",
      zIndex: 200000
    }} role="tooltip">
            <div className={styles.bubble}>{content}</div>
          </div>, document.body)}
    </>;
}
