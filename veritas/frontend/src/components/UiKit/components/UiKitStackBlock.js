import { Icon } from "@iconify/react";
import styles from "../uiKitHome.module.css";

/** Bloc section UI Kit (titre + icône + KPI optionnel + corps) — ex. tickets Accueil. */
export default function UiKitStackBlock({
  title,
  icon = null,
  actions = null,
  kpi = null,
  children,
  className = "",
  "data-home-section": dataHomeSection
}) {
  return (
    <div
      className={`${styles.stackBlock}${className ? ` ${className}` : ""}`}
      data-home-section={dataHomeSection || undefined}
    >
      {title || actions ? (
        <div className={styles.stackBlockHeader}>
          <div className={styles.stackBlockHeading}>
            {icon ? (
              <span className={styles.stackBlockIcon} aria-hidden>
                <Icon icon={icon} />
              </span>
            ) : null}
            {title ? <h2 className={styles.stackBlockTitle}>{title}</h2> : null}
          </div>
          {actions ? <div className={styles.stackBlockActions}>{actions}</div> : null}
        </div>
      ) : null}
      {kpi ? <div className={styles.stackBlockKpi}>{kpi}</div> : null}
      <div className={styles.stackBlockBody}>{children}</div>
    </div>
  );
}
