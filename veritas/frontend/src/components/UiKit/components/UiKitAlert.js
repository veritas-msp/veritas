import { Icon } from "@iconify/react";
import styles from "../uiKitPrimitives.module.css";

const TONE_CLASS = {
  info: styles.alertInfo,
  success: styles.alertSuccess,
  warn: styles.alertWarn,
  danger: styles.alertDanger
};

const TONE_ICON = {
  info: "mdi:information-outline",
  success: "mdi:check-circle-outline",
  warn: "mdi:alert-outline",
  danger: "mdi:alert-circle-outline"
};

export default function UiKitAlert({
  tone = "info",
  icon,
  children,
  action = null,
  className = "",
  role = "alert"
}) {
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.info;
  const iconName = icon || TONE_ICON[tone] || TONE_ICON.info;
  return (
    <div className={`${styles.alert} ${toneClass}${className ? ` ${className}` : ""}`} role={role}>
      <Icon icon={iconName} className={styles.alertIcon} aria-hidden />
      <div className={styles.alertBody}>
        <div className={styles.alertText}>{children}</div>
        {action}
      </div>
    </div>
  );
}
