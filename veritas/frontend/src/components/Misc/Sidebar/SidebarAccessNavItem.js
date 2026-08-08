import React from "react";
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
export default function SidebarAccessNavItem({
  showTooltip,
  tooltip,
  className,
  onClick,
  icon,
  label
}) {
  const motionProps = {
    variants: itemVariants,
    initial: "initial",
    animate: "animate",
    exit: "exit",
    className,
    onClick,
    style: {
      listStyle: "none",
      transformOrigin: "center left"
    }
  };
  const content = <>
      <span className={styles.accessNavIcon}>{icon}</span>
      {label != null && label !== false && <span className={styles.accessNavLabel}>{label}</span>}
    </>;
  if (showTooltip && tooltip) {
    return <SidebarTooltip as={motion.li} content={tooltip} {...motionProps}>
        {content}
      </SidebarTooltip>;
  }
  return <motion.li {...motionProps}>{content}</motion.li>;
}
