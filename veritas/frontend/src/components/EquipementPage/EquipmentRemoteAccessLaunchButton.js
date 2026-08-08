import React from "react";
import { Icon } from "@iconify/react";
import styles from "./EquipmentRemoteAccessLaunchButton.module.css";
export default function EquipmentRemoteAccessLaunchButton({
  label,
  icon,
  onClick,
  title,
  variant = "inline",
  compact = false,
  className = ""
}) {
  return <button type="button" className={`${styles.btn} ${styles[`btn_${variant}`]} ${compact ? styles.btnCompact : ""} ${className}`.trim()} onClick={onClick} title={title || label}>
      <Icon icon={icon} aria-hidden />
      {!compact ? <span>{label}</span> : null}
    </button>;
}
