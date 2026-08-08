import { useEffect } from "react";
import styles from "./MonitoringFullscreenWrapper.module.css";
export default function MonitoringFullscreenWrapper({
  children,
  onExit
}) {
  useEffect(() => {
    const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('[class*="Sidebar"]') || document.querySelector("aside") || document.querySelector('[role="navigation"]');
    if (sidebar) {
      sidebar.style.display = "none";
      sidebar.style.visibility = "hidden";
    }
    document.body.classList.add("monitoring-report-fullscreen");
    return () => {
      document.body.classList.remove("monitoring-report-fullscreen");
      if (sidebar) {
        sidebar.style.display = "";
        sidebar.style.visibility = "";
      }
    };
  }, []);
  return <div className={styles.fullscreenWrapper}>
      {}
      <div className={styles.content}>
        <div className={styles.scrollArea}>{children}</div>
      </div>
    </div>;
}
