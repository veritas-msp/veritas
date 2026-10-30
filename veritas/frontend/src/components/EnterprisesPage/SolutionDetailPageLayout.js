import { useEffect, useLayoutEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { FaArrowLeft } from "react-icons/fa";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "./EnterprisesPage.module.css";
import enterpriseStyles from "./EnterpriseDetailPage.module.css";
import { uiKitLayoutsStyles as finderKit, useFinderNavIndicator } from "../UiKit";
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
  titleImage = null,
  subtitle,
  backLabel = "Retour",
  onBack,
  loading = false,
  refreshing = false,
  loadingMessage = "Chargement…",
  onRefresh,
  onRefreshSave,
  refreshLabel = "Actualiser",
  refreshSaveLabel = "Actualiser et enregistrer",
  extraActions = null,
  headerError = null,
  headerMeta = null,
  footerHint,
  navEntries = [],
  activeSection,
  onSectionChange,
  navAriaLabel = "Sections",
  hideNav = false,
  embedded = false,
  children
}) {
  const accentKey = ["gravityzone", "mailinblack", "microsoft"].includes(accent) ? accent : "default";
  const busy = loading || refreshing;
  const showNav = !hideNav && Array.isArray(navEntries) && navEntries.length > 0;
  const [contentEnter, setContentEnter] = useState(true);
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([
    activeSection,
    navEntries.length
  ]);

  useLayoutEffect(() => {
    setContentEnter(false);
  }, [activeSection]);

  useEffect(() => {
    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        if (cancelled) return;
        setContentEnter(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [activeSection]);

  const sectionPanelClass = `${styles.sectionPanel} ${
    contentEnter ? styles.sectionPanelFadeIn : styles.sectionPanelFadePending
  }`;

  const views = (
    <div
      className={`${finderKit.finderLayout} ${styles.solutionFinderLayout} ${
        embedded ? styles.viewsLayoutEmbedded : ""
      } ${showNav ? "" : styles.solutionFinderLayoutNoNav}`.trim()}
    >
      {showNav ? (
        <aside className={finderKit.finderSidebar} aria-label={navAriaLabel}>
          <nav
            ref={navTrackRef}
            className={`${finderKit.finderPrimary} ${finderKit.finderPrimaryAnimated} ${styles.solutionFinderNav}`}
            role="tablist"
            aria-orientation="vertical"
            aria-label={navAriaLabel}
          >
            {navIndicator.ready ? (
              <div
                className={finderKit.finderNavIndicator}
                style={{
                  transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                  height: navIndicator.height
                }}
                aria-hidden
              />
            ) : null}
            <div className={finderKit.finderNavGroup}>
              {navEntries.map(entry =>
                entry.type === "group" ? (
                  <div key={entry.key} className={finderKit.finderNavGroupTitle}>
                    {entry.label}
                  </div>
                ) : (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    aria-selected={activeSection === entry.section.id}
                    aria-current={activeSection === entry.section.id ? "page" : undefined}
                    className={`${finderKit.finderItem} ${
                      activeSection === entry.section.id ? finderKit.finderItemActive : ""
                    }`}
                    onClick={() => onSectionChange?.(entry.section.id)}
                    title={entry.section.description || entry.section.label}
                  >
                    <span className={finderKit.finderItemIcon} aria-hidden>
                      <Icon icon={entry.section.icon} width={18} height={18} />
                    </span>
                    <span className={finderKit.finderItemLabel}>{entry.section.label}</span>
                  </button>
                )
              )}
            </div>
          </nav>
          {footerHint ? <p className={styles.viewsFooterHint}>{footerHint}</p> : null}
        </aside>
      ) : null}

      <div className={`${styles.mainColumn} ${showNav ? "" : styles.mainColumnNoNav}`.trim()}>
        <div className={styles.tablePanel}>
          {busy ? (
            <div className={styles.refreshOverlay} aria-live="polite">
              <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
              <span>{loadingMessage}</span>
            </div>
          ) : null}
          <div key={activeSection} className={`${styles.tableScroll} ${sectionPanelClass}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className={styles.embeddedRoot}>
        {onRefresh || onRefreshSave || extraActions || headerError ? (
          <div className={styles.embeddedToolbar}>
            {headerError ? (
              <div className={styles.headerError} role="alert" title={String(headerError)}>
                <Icon icon="mdi:alert-circle-outline" aria-hidden />
                <span>{headerError}</span>
              </div>
            ) : null}
            {onRefresh ? (
              <button
                type="button"
                className={`${finderKit.btnSquare} ${finderKit.btnSquareSecondary}`}
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
          </div>
        ) : null}
        {views}
      </div>
    );
  }

  const showBrand = Boolean(titleImage || titleIcon);

  return (
    <div
      className={`${mspStyles.mspPage} ${layout.page} ${enterpriseStyles.enterpriseDetailPage} ${styles.solutionDetailPage} msp-page-grid`.trim()}
    >
      <header className={`${enterpriseStyles.pageHero} ${styles.solutionHero}`}>
        <div className={enterpriseStyles.heroTop}>
          <div className={enterpriseStyles.heroIdentityBlock}>
            <div className={`${enterpriseStyles.heroIdentityRow} ${styles.solutionHeroRow}`}>
              <div className={`${enterpriseStyles.heroMain} ${styles.solutionHeroMain}`}>
                {onBack ? (
                  <button type="button" className={styles.backIconBtn} onClick={onBack} aria-label={backLabel} title={backLabel}>
                    <FaArrowLeft aria-hidden />
                  </button>
                ) : null}
                {showBrand ? (
                  <span
                    className={`${enterpriseStyles.heroBrandIcon} ${styles.solutionBrandIcon} ${
                      titleImage ? "" : BRAND_MARK[accentKey] || ""
                    }`.trim()}
                    aria-hidden
                  >
                    {titleImage ? (
                      <img src={titleImage} alt="" className={styles.solutionBrandImg} />
                    ) : (
                      <Icon icon={titleIcon} width={16} height={16} />
                    )}
                  </span>
                ) : null}
                <div className={`${enterpriseStyles.heroText} ${styles.solutionHeroText}`}>
                  {eyebrow ? <span className={styles.solutionEyebrow}>{eyebrow}</span> : null}
                  <h1 className={`${enterpriseStyles.heroTitle} ${styles.solutionTitleLine}`}>
                    <span className={enterpriseStyles.heroTitleName}>{title}</span>
                    {subtitle ? (
                      <>
                        <span className={styles.solutionTitleArrow} aria-hidden>
                          –
                        </span>
                        <span className={styles.solutionTitleClient}>{subtitle}</span>
                      </>
                    ) : null}
                  </h1>
                </div>
              </div>
              <div className={styles.solutionHeroActions}>
                {headerMeta ? <div className={styles.headerMeta}>{headerMeta}</div> : null}
                {headerError ? (
                  <div className={styles.headerError} role="alert" title={String(headerError)}>
                    <Icon icon="mdi:alert-circle-outline" aria-hidden />
                    <span>{headerError}</span>
                  </div>
                ) : null}
                {onRefresh ? (
                  <button
                    type="button"
                    className={`${finderKit.btnSquare} ${finderKit.btnSquareSecondary}`}
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
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`${enterpriseStyles.pageBody} ${enterpriseStyles.pageBodyFill} ${styles.solutionBody}`}>
        <div className={`${enterpriseStyles.pageGrid} ${styles.solutionGrid}`}>
          <div className={`${enterpriseStyles.mainColumn} ${enterpriseStyles.mainColumnFinder} ${styles.solutionMainColumn}`}>
            {views}
          </div>
        </div>
      </div>
    </div>
  );
}
