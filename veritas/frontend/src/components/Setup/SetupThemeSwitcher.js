import { Icon } from "@iconify/react";
import styles from "./SetupWizard.module.css";
export default function SetupThemeSwitcher({
  theme,
  onChange,
  ariaLabel
}) {
  const isDark = theme === "dark";
  return <button type="button" className={`${styles.toolBtn} ${isDark ? styles.toolBtnActive : ""}`} onClick={() => onChange(isDark ? "light" : "dark")} aria-label={ariaLabel} title={ariaLabel}>
      <Icon icon={isDark ? "mdi:weather-night" : "mdi:white-balance-sunny"} aria-hidden />
    </button>;
}
