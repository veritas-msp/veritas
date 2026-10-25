import styles from "../uiKitAdmin.module.css";

/**
 * Coque administration : sidebar (UiKitAdminNav) + zone principale.
 */
export default function UiKitAdminShell({
  sidebar,
  children,
  className = "",
  sidebarAriaLabel = "Navigation administration"
}) {
  return (
    <div className={`${styles.adminShell}${className ? ` ${className}` : ""}`}>
      <aside className={styles.adminMenu} aria-label={sidebarAriaLabel}>
        {sidebar}
      </aside>
      <div className={styles.adminShellMain}>{children}</div>
    </div>
  );
}
