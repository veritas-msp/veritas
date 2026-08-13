import { Icon } from "@iconify/react";
import { FaArrowLeft } from "react-icons/fa";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "./EnterprisesPage.module.css";
import styles from "./SolutionDetailPageLayout.module.css";

const BRAND_MARK = {
  gravityzone: styles.brandMarkGravityZone,
  mailinblack: styles.brandMarkMailinblack
};

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
  const accentKey = ["gravityzone", "mailinblack"].includes(accent) ? accent : "default";
  return (
    <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            icon={titleIcon}
            brandMarkClassName={BRAND_MARK[accentKey] || ""}
            actions={
              <>
                {onBack ? (
                  <button type="button" className={styles.backBtn} onClick={onBack}>
                    <FaArrowLeft aria-hidden />
                    <span>{backLabel}</span>
                  </button>
                ) : null}
                {onRefresh ? (
                  <button
                    type="button"
                    className={layout.iconBtn}
                    onClick={onRefresh}
                    disabled={loading}
                    aria-label={refreshLabel}
                    title={refreshLabel}
                  >
                    <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? styles.spin : ""} aria-hidden />
                  </button>
                ) : null}
                {onRefreshSave ? (
                  <button type="button" className={layout.primaryBtn} onClick={onRefreshSave} disabled={loading}>
                    <Icon icon="mdi:cloud-sync-outline" aria-hidden />
                    {refreshSaveLabel}
                  </button>
                ) : null}
              </>
            }
          />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={styles.viewsLayout}>
                <aside className={styles.viewsPane} aria-label={navAriaLabel}>
                  <div className={styles.viewsPaneHeader}>
                    <span className={styles.viewsTitle}>{navAriaLabel}</span>
                  </div>
                  <nav className={styles.viewsList}>
                    {navEntries.map((entry) =>
                      entry.type === "group" ? (
                        <div key={entry.key} className={styles.viewsGroupLabel}>
                          {entry.label}
                        </div>
                      ) : (
                        <button
                          key={entry.key}
                          type="button"
                          className={`${styles.viewItem} ${activeSection === entry.section.id ? styles.viewItemActive : ""}`}
                          onClick={() => onSectionChange?.(entry.section.id)}
                          aria-current={activeSection === entry.section.id ? "true" : undefined}
                          title={entry.section.description || entry.section.label}
                        >
                          <Icon icon={entry.section.icon} className={styles.viewItemIcon} aria-hidden />
                          <span className={styles.viewItemMain}>
                            <span className={styles.viewItemLabel}>{entry.section.label}</span>
                          </span>
                        </button>
                      )
                    )}
                  </nav>
                  {footerHint ? <p className={styles.viewsFooterHint}>{footerHint}</p> : null}
                </aside>

                <div className={styles.mainColumn}>
                  {loading ? (
                    <div className={layout.stateBox}>
                      <Icon icon="mdi:loading" className={layout.spinning} />
                      <span>{loadingMessage}</span>
                    </div>
                  ) : (
                    <div className={styles.tablePanel}>
                      <div className={styles.tableScroll}>{children}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
