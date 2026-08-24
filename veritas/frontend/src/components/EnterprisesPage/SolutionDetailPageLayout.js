import { Icon } from "@iconify/react";
import { FaArrowLeft } from "react-icons/fa";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "./EnterprisesPage.module.css";
import styles from "./SolutionDetailPageLayout.module.css";

const BRAND_MARK = {
  gravityzone: styles.brandMarkGravityZone,
  mailinblack: styles.brandMarkMailinblack,
  microsoft: styles.brandMarkMicrosoft
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
  refreshing = false,
  loadingMessage = "Loading…",
  onRefresh,
  onRefreshSave,
  refreshLabel = "Refresh",
  refreshSaveLabel = "Refresh and save",
  extraActions = null,
  footerHint,
  navEntries = [],
  activeSection,
  onSectionChange,
  navAriaLabel = "Sections",
  children
}) {
  const accentKey = ["gravityzone", "mailinblack", "microsoft"].includes(accent) ? accent : "default";
  const busy = loading || refreshing;
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
                    disabled={busy}
                    aria-label={refreshLabel}
                    title={refreshLabel}
                  >
                    <Icon icon={busy ? "mdi:loading" : "mdi:refresh"} className={busy ? styles.spin : ""} aria-hidden />
                  </button>
                ) : null}
                {onRefreshSave ? (
                  <button type="button" className={layout.primaryBtn} onClick={onRefreshSave} disabled={busy}>
                    <Icon icon="mdi:cloud-sync-outline" aria-hidden />
                    {refreshSaveLabel}
                  </button>
                ) : null}
                {extraActions}
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
                      {refreshing ? (
                        <div className={styles.refreshOverlay} aria-live="polite">
                          <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
                          <span>{loadingMessage}</span>
                        </div>
                      ) : null}
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
