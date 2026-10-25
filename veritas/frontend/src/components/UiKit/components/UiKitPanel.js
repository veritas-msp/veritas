import { Icon } from "@iconify/react";
import styles from "../uiKitHome.module.css";

export default function UiKitPanel({
  title,
  description = null,
  icon = null,
  titleMeta = null,
  action = null,
  children,
  flush = false,
  bare = false,
  className = "",
  bodyClassName = "",
  "data-home-section": dataHomeSection
}) {
  const showHeader = Boolean(title || action || titleMeta);
  return (
    <section
      className={`${styles.panel}${bare ? ` ${styles.panelBare}` : ""}${className ? ` ${className}` : ""}`}
      data-home-section={dataHomeSection || undefined}
    >
      {showHeader ? (
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderMain}>
            {title ? (
              <div className={styles.panelTitleBlock}>
                <div className={styles.panelTitleRow}>
                  {icon ? (
                    <span className={styles.panelTitleIcon} aria-hidden>
                      <Icon icon={icon} />
                    </span>
                  ) : null}
                  <h2 className={styles.panelTitle}>{title}</h2>
                </div>
                {description ? <p className={styles.panelDescription}>{description}</p> : null}
              </div>
            ) : (
              <span />
            )}
            {titleMeta}
            {action}
          </div>
        </div>
      ) : null}
      <div
        className={`${styles.panelBody}${flush || !showHeader ? ` ${styles.panelBodyFlush}` : ""}${bodyClassName ? ` ${bodyClassName}` : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
