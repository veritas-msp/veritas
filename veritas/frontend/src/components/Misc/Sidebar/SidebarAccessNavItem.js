import React, { useRef } from "react";
import { motion } from "framer-motion";
import SidebarTooltip from "./SidebarTooltip";
import styles from "./Sidebar.module.css";
const EASE_OUT = [0.22, 1, 0.36, 1];
const itemVariants = {
  initial: {
    opacity: 0,
    scale: 0.94
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: EASE_OUT
    }
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: {
      duration: 0.14,
      ease: "easeIn"
    }
  }
};

/** Left-click without modifiers → SPA navigation; middle/ctrl/cmd-click → native new tab. */
function shouldUseSpaNavigation(event) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return true;
}

export default function SidebarAccessNavItem({
  showTooltip,
  tooltip,
  className,
  onClick,
  href,
  icon,
  label
}) {
  const iconRef = useRef(null);
  const renderedIcon = React.isValidElement(icon) && icon.type?.lucideAnimated
    ? React.cloneElement(icon, { ref: iconRef })
    : icon;
  const handleClick = event => {
    if (href && shouldUseSpaNavigation(event)) {
      event.preventDefault();
    } else if (href) {
      // Let the browser open a new tab / follow the link (middle-click, Ctrl/Cmd+click, etc.).
      return;
    }
    onClick?.(event);
  };

  const motionProps = {
    variants: itemVariants,
    initial: "initial",
    animate: "animate",
    exit: "exit",
    className,
    onClick: handleClick,
    title: tooltip || undefined,
    style: {
      listStyle: "none",
      transformOrigin: "center left"
    },
    onMouseEnter: () => iconRef.current?.startAnimation?.(),
    onMouseLeave: () => iconRef.current?.stopAnimation?.(),
    ...(href
      ? {
          href,
          role: "listitem"
        }
      : {})
  };
  const content = <>
      <span className={styles.accessNavIcon}>{renderedIcon}</span>
      {label != null && label !== false && <span className={styles.accessNavLabel}>{label}</span>}
    </>;
  const MotionTag = href ? motion.a : motion.li;
  if (showTooltip && tooltip) {
    return <SidebarTooltip as={MotionTag} content={tooltip} {...motionProps}>
        {content}
      </SidebarTooltip>;
  }
  return <MotionTag {...motionProps}>{content}</MotionTag>;
}
