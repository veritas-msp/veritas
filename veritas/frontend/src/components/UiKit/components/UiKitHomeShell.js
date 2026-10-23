import styles from "../uiKitHome.module.css";

/**
 * Shell page Accueil UI Kit — top (board) + bottom (news full width).
 * Occupe toute la hauteur disponible du contentWrapper.
 */
export default function UiKitHomeShell({ top, bottom, className = "" }) {
  return (
    <div className={`${styles.homeShell}${className ? ` ${className}` : ""}`}>
      <div className={styles.homeShellTop}>{top}</div>
      {bottom ? (
        <div className={styles.homeShellBottom} data-guide="home-news">
          {bottom}
        </div>
      ) : null}
    </div>
  );
}
