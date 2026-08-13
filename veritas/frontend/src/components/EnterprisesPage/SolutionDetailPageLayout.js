import { Icon } from "@iconify/react";
import { FaArrowLeft } from "react-icons/fa";
import styles from "./SolutionDetailPageLayout.module.css";
export default function SolutionDetailPageLayout({
  accent = "default",
  eyebrow,
  title,
  titleIcon,
  subtitle,
  backLabel = "Back",
  onBack,
  loading = false,
  loadingMessage = "Loading…",
  onRefresh,
  onRefreshSave,
  refreshLabel = "Refresh",
  refreshSaveLabel = "Refresh and save",
  footerHint,
  navEntries = [],
  activeSection,
  onSectionChange,
  navAriaLabel = "Sections",
  children
}) {
  const accentKey = ["gravityzone", "mailinblack", "default"].includes(accent) ? accent : "default";
  return <div className={styles.page}>
      <div className={`${styles.accentBar} ${styles[`accentBar_${accentKey}`]}`} aria-hidden />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {onBack ? <button type="button" className={styles.backButton} onClick={onBack}>
              <FaArrowLeft aria-hidden />
              <span>{backLabel}</span>
            </button> : null}
          {titleIcon ? <div className={`${styles.headerIconWrap} ${styles[`headerIconWrap_${accentKey}`]}`} aria-hidden>
              <Icon icon={titleIcon} />
            </div> : null}
          <div className={styles.headerCopy}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h1 className={styles.title}>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
        </div>
        <div className={styles.headerActions}>
          {onRefresh ? <button type="button" className={styles.actionBtn} onClick={onRefresh} disabled={loading}>
              <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? styles.spin : ""} aria-hidden />
              {refreshLabel}
            </button> : null}
        </div>
      </header>

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <nav aria-label={navAriaLabel}>
            {navEntries.map(entry => entry.type === "group" ? <div key={entry.key} className={styles.navGroupLabel}>
                  {entry.label}
                </div> : <button key={entry.key} type="button" className={`${styles.navItem} ${activeSection === entry.section.id ? styles.navItemActive : ""}`} onClick={() => onSectionChange?.(entry.section.id)} aria-current={activeSection === entry.section.id ? "step" : undefined}>
                  <Icon icon={entry.section.icon} className={styles.navItemIcon} aria-hidden />
                  <span className={styles.navItemText}>
                    <span className={styles.navItemLabel}>{entry.section.label}</span>
                    <span className={styles.navItemHint}>{entry.section.description}</span>
                  </span>
                </button>)}
          </nav>
        </aside>

        <main className={styles.content}>
          {loading ? <div className={styles.loadingState}>
              <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
              <span>{loadingMessage}</span>
            </div> : children}
        </main>
      </div>

      {footerHint || onRefreshSave ? <footer className={styles.footer}>
          {footerHint ? <span className={styles.footerHint}>{footerHint}</span> : <span />}
          <div className={styles.footerActions}>
            {onRefreshSave ? <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={onRefreshSave} disabled={loading}>
                <Icon icon="mdi:cloud-sync-outline" aria-hidden />
                {refreshSaveLabel}
              </button> : null}
          </div>
        </footer> : null}
    </div>;
}
