import React, { useRef, useState, useLayoutEffect, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./SidebarTooltip.module.css";
import { SIDEBAR_FLYOUT_GAP_PX } from "../../../utils/sidebarFlyoutPosition";

const GAP = SIDEBAR_FLYOUT_GAP_PX;
const EST_WIDTH = 200;
const DEFAULT_SHOW_DELAY_MS = 400;

/** Un seul tooltip sidebar visible à la fois (évite les bulles « collées »). */
let activeOwner = null;
let activeHide = null;

function claimActiveTooltip(owner, hideFn) {
  if (activeOwner && activeOwner !== owner && typeof activeHide === "function") {
    try {
      activeHide();
    } catch {
      // ignore
    }
  }
  activeOwner = owner;
  activeHide = hideFn;
}

function releaseActiveTooltip(owner) {
  if (activeOwner === owner) {
    activeOwner = null;
    activeHide = null;
  }
}

function resolvePlacement(explicit) {
  if (explicit === "right" || explicit === "bottom" || explicit === "top") return explicit;
  if (typeof document !== "undefined" && document.documentElement?.dataset?.sidebarLayout === "horizontal") {
    return "bottom";
  }
  return "right";
}

const SidebarTooltip = React.forwardRef(function SidebarTooltip({
  as: Component = "span",
  content,
  className = "",
  showDelayMs = DEFAULT_SHOW_DELAY_MS,
  placement: placementProp,
  children,
  ...rest
}, forwardedRef) {
  const triggerRef = useRef(null);
  const showTimerRef = useRef(null);
  const ownerRef = useRef(null);
  if (ownerRef.current == null) ownerRef.current = {};
  const setTriggerRef = useCallback(node => {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState(() => resolvePlacement(placementProp));
  const [pos, setPos] = useState({
    top: 0,
    left: 0
  });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const nextPlacement = resolvePlacement(placementProp);
    const rect = el.getBoundingClientRect();
    setPlacement(nextPlacement);

    if (nextPlacement === "bottom") {
      const left = Math.min(
        Math.max(12 + EST_WIDTH / 2, rect.left + rect.width / 2),
        window.innerWidth - 12 - EST_WIDTH / 2
      );
      setPos({
        top: rect.bottom + GAP,
        left
      });
      return;
    }

    if (nextPlacement === "top") {
      const left = Math.min(
        Math.max(12 + EST_WIDTH / 2, rect.left + rect.width / 2),
        window.innerWidth - 12 - EST_WIDTH / 2
      );
      setPos({
        top: rect.top - GAP,
        left
      });
      return;
    }

    let left = rect.right + GAP;
    left = Math.min(left, window.innerWidth - EST_WIDTH - 12);
    setPos({
      top: rect.top + rect.height / 2,
      left: Math.max(12, left)
    });
  }, [placementProp]);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const onHide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
    releaseActiveTooltip(ownerRef.current);
  }, [clearShowTimer]);

  const onShow = useCallback(() => {
    if (!content) return;
    clearShowTimer();
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      claimActiveTooltip(ownerRef.current, onHide);
      updatePosition();
      setVisible(true);
    }, showDelayMs);
  }, [content, updatePosition, showDelayMs, clearShowTimer, onHide]);

  useEffect(
    () => () => {
      clearShowTimer();
      releaseActiveTooltip(ownerRef.current);
    },
    [clearShowTimer]
  );

  useLayoutEffect(() => {
    if (!visible) return undefined;
    updatePosition();
    const dismiss = () => onHide();
    const onKeyDown = event => {
      if (event.key === "Escape") dismiss();
    };
    const onPointerDown = () => {
      dismiss();
    };
    const onScrollOrResize = () => {
      const el = triggerRef.current;
      if (!el) {
        dismiss();
        return;
      }
      const rect = el.getBoundingClientRect();
      const inView =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth;
      if (!inView) {
        dismiss();
        return;
      }
      updatePosition();
    };

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("blur", dismiss);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    const id = requestAnimationFrame(() => updatePosition());
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("blur", dismiss);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [visible, updatePosition, onHide]);

  if (!content) {
    return (
      <Component ref={setTriggerRef} className={className} {...rest}>
        {children}
      </Component>
    );
  }

  const {
    onMouseEnter: userMouseEnter,
    onMouseLeave: userMouseLeave,
    onFocus: userFocus,
    onBlur: userBlur,
    onPointerDown: userPointerDown,
    onClick: userClick,
    ...domRest
  } = rest;

  const portalStyle =
    placement === "bottom"
      ? {
          position: "fixed",
          top: pos.top,
          left: pos.left,
          transform: "translateX(-50%)",
          zIndex: 200000
        }
      : placement === "top"
        ? {
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            zIndex: 200000
          }
        : {
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateY(-50%)",
            zIndex: 200000
          };

  return (
    <>
      <Component
        ref={setTriggerRef}
        className={className}
        {...domRest}
        onMouseEnter={e => {
          userMouseEnter?.(e);
          onShow();
        }}
        onMouseLeave={e => {
          userMouseLeave?.(e);
          onHide();
        }}
        onFocus={e => {
          userFocus?.(e);
          if (typeof e.currentTarget?.matches === "function" && e.currentTarget.matches(":focus-visible")) {
            onShow();
          }
        }}
        onBlur={e => {
          userBlur?.(e);
          onHide();
        }}
        onPointerDown={e => {
          userPointerDown?.(e);
          onHide();
        }}
        onClick={e => {
          userClick?.(e);
          onHide();
        }}
      >
        {children}
      </Component>
      {visible &&
        createPortal(
          <div
            className={`${styles.root} ${
              placement === "bottom"
                ? styles.placementBottom
                : placement === "top"
                  ? styles.placementTop
                  : styles.placementRight
            }`}
            style={portalStyle}
            role="tooltip"
          >
            <div className={styles.bubble}>{content}</div>
          </div>,
          document.body
        )}
    </>
  );
});

export default SidebarTooltip;
