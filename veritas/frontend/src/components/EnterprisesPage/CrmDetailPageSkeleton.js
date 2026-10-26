import React from "react";
import layout from "./EnterpriseDetailPage.module.css";
import { uiKitLayoutsStyles as finderKit } from "../UiKit";
import sk from "./CrmDetailPageSkeleton.module.css";

/**
 * Shared CRM detail skeleton (entreprise / contact / prestataire).
 * Mirrors the live finder layout: hero + left nav + content + right aside.
 */
export default function CrmDetailPageSkeleton({
  loadingAria = "Chargement…",
  className = "",
  /** Optional real title from navigation — avoids title flash */
  titleHint = "",
  showTitleIcon = false,
  showMidSlot = false,
  tabCount = 7,
  secondaryCount = 6,
  /** "map" | "activity" | "portal" | "panels" | "overview" */
  body = "map",
  showAside = true,
  asideSections = 7,
  asideActionCount = 5
}) {
  const tabs = Math.max(0, Number(tabCount) || 0);
  const secondary = Math.max(0, Number(secondaryCount) || 0);
  const sections = Math.max(1, Number(asideSections) || 4);
  const actions = Math.max(0, Number(asideActionCount) || 0);
  const rootClass = [
    layout.contratDetailPage,
    layout.enterpriseDetailPage,
    className,
    "msp-page-grid"
  ]
    .filter(Boolean)
    .join(" ");

  const mainColumnExtra =
    body === "activity" || body === "portal"
      ? layout.mainColumnActivity
      : body === "overview"
        ? layout.mainColumnOverview
        : layout.mainColumnMap;

  const renderBody = () => {
    if (body === "portal") {
      return (
        <div className={sk.portalLayout} aria-hidden>
          <div className={sk.portalAside}>
            <div className={sk.portalMetaStack}>
              <span className={`${sk.bone} ${sk.portalMetaLine}`} />
              <span className={`${sk.bone} ${sk.portalMetaLineShort}`} />
              <span className={`${sk.bone} ${sk.portalMetaLine}`} />
            </div>
            <div className={sk.portalQuickBlock}>
              <span className={`${sk.bone} ${sk.portalQuickTitle}`} />
              <div className={sk.portalQuickGrid}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={sk.portalQuickTile}>
                    <span className={`${sk.bone} ${sk.portalQuickIcon}`} />
                    <span className={`${sk.bone} ${sk.portalQuickLabel}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={sk.portalMain}>
            <div className={sk.portalLoginHead}>
              <span className={`${sk.bone} ${sk.portalLoginTitle}`} />
              <span className={`${sk.bone} ${sk.portalLoginHint}`} />
            </div>
            <div className={sk.tableShell}>
              <div className={sk.tableHeadRow}>
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className={`${sk.bone} ${sk.tableHeadCell}`} />
                ))}
              </div>
              {Array.from({ length: 6 }, (_, row) => (
                <div key={row} className={sk.portalLoginRow}>
                  <span className={`${sk.bone} ${sk.statusDot}`} />
                  <span className={`${sk.bone} ${sk.tableCellWide}`} />
                  <span className={`${sk.bone} ${sk.tableCell}`} />
                  <span className={`${sk.bone} ${sk.tableCell}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (body === "activity") {
      return (
        <div className={sk.activityLayout} aria-hidden>
          <div className={sk.activityCard}>
            <div className={sk.activityCardHead}>
              <span className={`${sk.bone} ${sk.activityHeadTitle}`} />
              <span className={`${sk.bone} ${sk.activityHeadCount}`} />
            </div>
            <div className={sk.activityCardBody}>
              <div className={sk.mapToolbar}>
                <span className={`${sk.bone} ${sk.searchBar}`} />
                <div className={sk.mapToolbarActions}>
                  <span className={`${sk.bone} ${sk.actionBtn}`} />
                  <span className={`${sk.bone} ${sk.actionBtn}`} />
                </div>
              </div>
              <div className={sk.tableShell}>
                <div className={sk.tableHeadRow}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} className={`${sk.bone} ${sk.tableHeadCell}`} />
                  ))}
                </div>
                {Array.from({ length: 8 }, (_, row) => (
                  <div key={row} className={sk.activityRow}>
                    <span className={`${sk.bone} ${sk.statusDot}`} />
                    <span className={`${sk.bone} ${sk.tableCellWide}`} />
                    <span className={`${sk.bone} ${sk.tableCell}`} />
                    <span className={`${sk.bone} ${sk.tableCell}`} />
                    <span className={`${sk.bone} ${sk.tableCell}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (body === "panels") {
      return (
        <div className={sk.panelsStack} aria-hidden>
          <section className={sk.panel}>
            <div className={sk.panelHead} />
            <div className={sk.coordGrid}>
              {[0, 1, 2].map(i => (
                <div key={i} className={`${sk.bone} ${sk.coordCard}`} />
              ))}
            </div>
          </section>
          <section className={sk.panel}>
            <div className={sk.panelHead} />
            <div className={`${sk.bone} ${sk.panelBody}`} />
          </section>
        </div>
      );
    }
    if (body === "overview") {
      return (
        <div className={sk.overviewGrid} aria-hidden>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <article key={i} className={sk.overviewCard}>
              <div className={sk.overviewCardHead} />
              <div className={`${sk.bone} ${sk.overviewCardBody}`} />
            </article>
          ))}
        </div>
      );
    }
    /* Default: map / périphériques — toolbar + table */
    return (
      <div className={sk.mapLayout} aria-hidden>
        <div className={sk.mapToolbar}>
          <span className={`${sk.bone} ${sk.searchBar}`} />
          <div className={sk.mapToolbarActions}>
            <span className={`${sk.bone} ${sk.actionBtn}`} />
            <span className={`${sk.bone} ${sk.actionBtn}`} />
          </div>
        </div>
        <div className={sk.tableShell}>
          <div className={sk.tableHeadRow}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <span key={i} className={`${sk.bone} ${sk.tableHeadCell}`} />
            ))}
          </div>
          {Array.from({ length: 10 }, (_, row) => (
            <div key={row} className={sk.tableRow}>
              <span className={`${sk.bone} ${sk.statusDot}`} />
              <span className={`${sk.bone} ${sk.tableCellWide}`} />
              <span className={`${sk.bone} ${sk.tableCell}`} />
              <span className={`${sk.bone} ${sk.tableCell}`} />
              <span className={`${sk.bone} ${sk.tableCell}`} />
              <span className={`${sk.bone} ${sk.tableCell}`} />
              <div className={sk.tableRowActions}>
                <span className={`${sk.bone} ${sk.actionBtn}`} />
                <span className={`${sk.bone} ${sk.actionBtn}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={rootClass} aria-busy="true" aria-label={loadingAria}>
      <header className={layout.pageHero}>
        <div className={layout.heroTop}>
          <div className={layout.heroIdentityBlock}>
            <div className={layout.heroCover} aria-hidden />
            <div className={layout.heroIdentityRow}>
              <div className={layout.heroMain}>
                {showTitleIcon ? (
                  <span className={`${sk.bone} ${sk.titleIconHero}`} aria-hidden />
                ) : null}
                <div className={layout.heroText}>
                  <div className={layout.heroTitle}>
                    <span className={`${sk.bone} ${sk.statusDot}`} aria-hidden />
                    {titleHint ? (
                      <span className={sk.titleHint}>{titleHint}</span>
                    ) : (
                      <span className={`${sk.bone} ${sk.titleBar}`} aria-hidden />
                    )}
                  </div>
                </div>
              </div>
              <div className={layout.heroMeta} aria-hidden>
                <span className={`${sk.bone} ${sk.metaPill} ${sk.metaPillWide}`} />
                <span className={`${sk.bone} ${sk.metaPill}`} />
              </div>
              {showMidSlot ? (
                <div className={layout.heroPlanningFrise} aria-hidden>
                  <div className={`${sk.bone} ${sk.midSlotChip}`} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className={`${layout.pageBody} ${layout.pageBodyFill}`.trim()}>
        {showAside ? (
          <div className={layout.pageGrid}>
            <main className={`${layout.mainColumn} ${layout.mainColumnFinder} ${mainColumnExtra}`.trim()}>
              {tabs > 0 ? (
                <div className={`${finderKit.finderLayout} ${layout.enterpriseFinderLayout}`}>
                  <aside className={`${finderKit.finderSidebar} ${layout.enterpriseFinderSidebar}`} aria-hidden>
                    <nav className={`${finderKit.finderPrimary} ${layout.finderPrimaryNav}`}>
                      {Array.from({ length: tabs }, (_, i) => (
                        <span key={i} className={`${sk.bone} ${sk.finderItem}`} />
                      ))}
                    </nav>
                    {secondary > 0 ? (
                      <div className={`${finderKit.finderSecondary} ${layout.finderSecondary}`}>
                        <span className={`${sk.bone} ${sk.finderSecTitle}`} />
                        <div className={sk.finderSecList}>
                          {Array.from({ length: secondary }, (_, i) => (
                            <span key={i} className={`${sk.bone} ${sk.finderSecItem}`} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                  <div className={`${finderKit.finderContent} ${layout.enterpriseFinderContent}`}>
                    {renderBody()}
                  </div>
                </div>
              ) : (
                renderBody()
              )}
            </main>

            <aside className={`${layout.asideStack} ${layout.asidePanel}`} aria-hidden>
              <div className={`${layout.rightSidebarContent} ${sk.asideInner}`}>
                {actions > 0 ? (
                  <div className={sk.asideToolbar}>
                    {Array.from({ length: actions }, (_, i) => (
                      <span key={i} className={`${sk.bone} ${sk.asideActionBtn}`} />
                    ))}
                  </div>
                ) : null}
                {Array.from({ length: sections }, (_, i) => (
                  <div key={i} className={sk.asideSection}>
                    <div className={sk.asideHeader}>
                      <span className={`${sk.bone} ${sk.asideTitle}`} />
                      <span className={`${sk.bone} ${sk.asideCount}`} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <main className={layout.mainColumn}>{renderBody()}</main>
        )}
      </div>
    </div>
  );
}
