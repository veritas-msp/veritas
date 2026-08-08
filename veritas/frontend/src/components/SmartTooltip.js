import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import useSmartTooltip from '../hooks/useSmartTooltip';
import styles from './SmartTooltip.module.css';
const SHOW_DELAY_MS = 400;
const HIDE_DELAY_MS = 80;
const INTERACTIVE_HIDE_DELAY_MS = 450;
const CLICK_POPOVER_GAP = 12;
const VIEWPORT_EDGE_PADDING = 12;
const PLANNING_POPOVER_MAX_HEIGHT = 520;
const PLANNING_POPOVER_ESTIMATED_WIDTH = 440;
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function getPlanningPopoverEstimatedHeight() {
  return Math.min(window.innerHeight * 0.7, PLANNING_POPOVER_MAX_HEIGHT);
}
function computePlanningPopoverCoords({
  pointer,
  triggerRect,
  popoverWidth,
  popoverHeight
}) {
  const pad = VIEWPORT_EDGE_PADDING;
  const gap = CLICK_POPOVER_GAP;
  const width = popoverWidth || PLANNING_POPOVER_ESTIMATED_WIDTH;
  const height = popoverHeight || getPlanningPopoverEstimatedHeight();
  const anchorX = pointer?.x ?? triggerRect.left + triggerRect.width / 2;
  const anchorTop = pointer?.y ?? triggerRect.top;
  const anchorBottom = pointer?.y ?? triggerRect.bottom;
  const spaceBelow = window.innerHeight - anchorBottom - pad;
  const spaceAbove = anchorTop - pad;
  const openBelow = spaceBelow >= height + gap || spaceBelow >= spaceAbove;
  let top = openBelow ? anchorBottom + gap : anchorTop - gap - height;
  let left = anchorX - Math.min(32, width * 0.18);
  top = clamp(top, pad, Math.max(pad, window.innerHeight - pad - height));
  left = clamp(left, pad, Math.max(pad, window.innerWidth - pad - width));
  return {
    top,
    left,
    transform: 'none'
  };
}
function getPortalStyle(rect, position, {
  isInteractiveSurface = false,
  isClickTrigger = false
} = {}) {
  const gap = isClickTrigger || position === 'bottom-start' || position === 'bottom-end' ? CLICK_POPOVER_GAP : isInteractiveSurface ? 0 : 10;
  switch (position) {
    case 'top':
      return {
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)'
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: 'translate(-100%, -50%)'
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: 'translateY(-50%)'
      };
    case 'bottom-start':
      return {
        top: rect.bottom + gap,
        left: rect.left,
        transform: 'none'
      };
    case 'bottom-end':
      return {
        top: rect.bottom + gap,
        left: rect.right,
        transform: 'translateX(-100%)'
      };
    case 'top-start':
      return {
        top: rect.top - gap,
        left: rect.left,
        transform: 'translateY(-100%)'
      };
    case 'top-end':
      return {
        top: rect.top - gap,
        left: rect.right,
        transform: 'translate(-100%, -100%)'
      };
    default:
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)'
      };
  }
}
function resolveTooltipPosition(forcedPosition, fallback) {
  if (forcedPosition && ['top', 'bottom', 'left', 'right', 'bottom-start', 'bottom-end', 'top-start', 'top-end'].includes(forcedPosition)) {
    return forcedPosition;
  }
  return fallback;
}
const SmartTooltip = ({
  content,
  children,
  className = '',
  tooltipClassName = '',
  as = 'span',
  trigger = 'hover',
  interactive = false,
  clickSuppressOnDrag = false,
  ...rest
}) => {
  const {
    ref,
    tooltipPosition,
    recheckPosition
  } = useSmartTooltip();
  const Component = as;
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const [activePosition, setActivePosition] = useState('bottom');
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const portalRef = useRef(null);
  const triggerHoveredRef = useRef(false);
  const portalHoveredRef = useRef(false);
  const pointerOriginRef = useRef(null);
  const pointerAnchorRef = useRef(null);
  const dragIntentRef = useRef(false);
  const suppressClickRef = useRef(false);
  const opensOnPrimaryClick = trigger === "click" || trigger === "click-contextmenu";
  const opensOnContextMenu = trigger === "contextmenu" || trigger === "click-contextmenu";
  const isPopoverTrigger = opensOnPrimaryClick || opensOnContextMenu;
  const isInteractiveSurface = interactive || isPopoverTrigger;
  const updateCoords = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const forcedPosition = el.getAttribute('data-tooltip-position');
    const rect = el.getBoundingClientRect();
    const portalTooltipEl = portalRef.current?.querySelector('[role="dialog"], [role="tooltip"]');
    const measuredWidth = portalTooltipEl?.offsetWidth || 0;
    const measuredHeight = portalTooltipEl?.offsetHeight || 0;
    if (forcedPosition === 'planning-popover') {
      const nextCoords = computePlanningPopoverCoords({
        pointer: isPopoverTrigger ? pointerAnchorRef.current : null,
        triggerRect: rect,
        popoverWidth: measuredWidth || PLANNING_POPOVER_ESTIMATED_WIDTH,
        popoverHeight: measuredHeight || getPlanningPopoverEstimatedHeight()
      });
      setActivePosition('planning-popover');
      setCoords(nextCoords);
      return;
    }
    const position = resolveTooltipPosition(forcedPosition, recheckPosition?.() ?? tooltipPosition);
    setActivePosition(position);
    setCoords(getPortalStyle(rect, position, {
      isInteractiveSurface,
      isClickTrigger: isPopoverTrigger
    }));
  }, [ref, tooltipPosition, recheckPosition, isInteractiveSurface, isPopoverTrigger]);
  const storePointerAnchor = useCallback(event => {
    if (event?.clientX == null || event?.clientY == null) return;
    pointerAnchorRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  }, []);
  const clearTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const scheduleHide = useCallback(() => {
    clearTimers();
    const delay = isInteractiveSurface ? INTERACTIVE_HIDE_DELAY_MS : HIDE_DELAY_MS;
    hideTimerRef.current = setTimeout(() => {
      if (isInteractiveSurface && !isPopoverTrigger) {
        if (!triggerHoveredRef.current && !portalHoveredRef.current) {
          setVisible(false);
        }
        return;
      }
      setVisible(false);
    }, delay);
  }, [interactive, isPopoverTrigger, isInteractiveSurface]);
  const handleMouseEnter = () => {
    if (isPopoverTrigger) return;
    triggerHoveredRef.current = true;
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      updateCoords();
      setVisible(true);
    }, SHOW_DELAY_MS);
  };
  const handleMouseLeave = () => {
    if (isPopoverTrigger) return;
    triggerHoveredRef.current = false;
    if (interactive) {
      scheduleHide();
      return;
    }
    clearTimers();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, HIDE_DELAY_MS);
  };
  const handlePortalMouseEnter = () => {
    if (!isInteractiveSurface || isPopoverTrigger) return;
    portalHoveredRef.current = true;
    clearTimers();
  };
  const handlePortalMouseLeave = () => {
    if (!isInteractiveSurface || isPopoverTrigger) return;
    portalHoveredRef.current = false;
    scheduleHide();
  };
  const openTooltip = useCallback(() => {
    updateCoords();
    setVisible(true);
  }, [updateCoords]);
  const closeTooltip = useCallback(() => {
    clearTimers();
    pointerAnchorRef.current = null;
    setVisible(false);
  }, []);
  const shouldSuppressClick = useCallback(() => {
    if (!clickSuppressOnDrag) return false;
    if (suppressClickRef.current || dragIntentRef.current) return true;
    if (document.querySelector('.rbc-addons-dnd-is-dragging')) return true;
    if (document.body.classList.contains('planning-month-event-dragging')) return true;
    if (document.body.classList.contains('planning-event-click-suppressed')) return true;
    return false;
  }, [clickSuppressOnDrag]);
  const handlePointerDown = event => {
    rest.onPointerDown?.(event);
    if (!clickSuppressOnDrag) return;
    pointerOriginRef.current = {
      x: event.clientX,
      y: event.clientY
    };
    dragIntentRef.current = false;
  };
  useEffect(() => {
    if (!clickSuppressOnDrag) return undefined;
    const handlePointerMove = event => {
      if (!pointerOriginRef.current) return;
      const dx = Math.abs(event.clientX - pointerOriginRef.current.x);
      const dy = Math.abs(event.clientY - pointerOriginRef.current.y);
      if (dx > 4 || dy > 4) dragIntentRef.current = true;
    };
    const handlePointerUp = () => {
      pointerOriginRef.current = null;
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [clickSuppressOnDrag]);
  const handleClick = event => {
    rest.onClick?.(event);
    if (!opensOnPrimaryClick || event.defaultPrevented) return;
    if (shouldSuppressClick()) {
      dragIntentRef.current = false;
      suppressClickRef.current = false;
      return;
    }
    storePointerAnchor(event);
    event.stopPropagation();
    if (visible) {
      updateCoords();
      return;
    }
    openTooltip();
  };
  const handleContextMenu = event => {
    rest.onContextMenu?.(event);
    if (!opensOnContextMenu || event.defaultPrevented) return;
    event.preventDefault();
    if (shouldSuppressClick()) return;
    storePointerAnchor(event);
    event.stopPropagation();
    if (visible) {
      updateCoords();
      return;
    }
    openTooltip();
  };
  useEffect(() => {
    if (!isPopoverTrigger || !visible) return undefined;
    const handlePointerDown = event => {
      if (ref.current?.contains(event.target)) return;
      if (portalRef.current?.contains(event.target)) return;
      if (event.target.closest('[data-planning-agent-dropdown]')) return;
      closeTooltip();
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') closeTooltip();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopoverTrigger, visible, ref, closeTooltip]);
  useEffect(() => {
    if (!visible) return undefined;
    const onScrollOrResize = () => updateCoords();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [visible, updateCoords]);
  useLayoutEffect(() => {
    if (!visible || !ref.current) return;
    const forcedPosition = ref.current.getAttribute('data-tooltip-position');
    if (forcedPosition !== 'planning-popover' || !portalRef.current) return;
    updateCoords();
  }, [visible, content, updateCoords, ref]);
  useEffect(() => () => clearTimers(), []);
  if (!content) {
    return <Component ref={ref} className={className} {...rest}>
        {children}
      </Component>;
  }
  const {
    onClick,
    onPointerDown,
    onContextMenu,
    ...componentRest
  } = rest;
  const renderedContent = typeof content === 'function' ? content({
    close: closeTooltip
  }) : content;
  return <>
      <Component ref={ref} className={`${styles.tooltipWrapper} ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onFocus={isPopoverTrigger ? undefined : handleMouseEnter} onBlur={isPopoverTrigger ? undefined : handleMouseLeave} onPointerDown={clickSuppressOnDrag ? handlePointerDown : onPointerDown} onClick={opensOnPrimaryClick ? handleClick : onClick} onContextMenu={opensOnContextMenu ? handleContextMenu : onContextMenu} aria-expanded={isPopoverTrigger ? visible : undefined} {...componentRest}>
        {children}
      </Component>
      {visible && coords && createPortal(<div ref={portalRef} className={`${styles.portalShell} ${isInteractiveSurface ? styles.portalShellInteractive : ''}`.trim()} style={{
      position: 'fixed',
      top: coords.top,
      left: coords.left,
      transform: coords.transform,
      zIndex: 2147483647
    }} onMouseEnter={handlePortalMouseEnter} onMouseLeave={handlePortalMouseLeave}>
            {interactive && !isPopoverTrigger ? <div className={`${styles.hoverBridge} ${styles[`hoverBridge_${activePosition}`] || ''}`} aria-hidden /> : null}
            <div className={`${styles.portalTooltip} ${isInteractiveSurface ? styles.portalTooltipInteractive : ''} ${tooltipClassName}`.trim()} role={opensOnContextMenu && !opensOnPrimaryClick ? "dialog" : isPopoverTrigger ? "dialog" : "tooltip"}>
              {renderedContent}
            </div>
          </div>, document.body)}
    </>;
};
export default SmartTooltip;
