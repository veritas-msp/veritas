import React from "react";
import layout from "./EnterpriseDetailPage.module.css";
import sk from "./CrmDetailPageSkeleton.module.css";

/**
 * Shared CRM detail skeleton (entreprise / contact / prestataire).
 * Uses the same layout classes as the live pages to avoid visual jumps.
 */
export default function CrmDetailPageSkeleton({
  loadingAria = "Chargement…",
  className = "",
  /** Optional real title from navigation — avoids title flash */
  titleHint = "",
  showTitleIcon = false,
  showMidSlot = true,
  tabCount = 4,
  /** "overview" | "activity" | "panels" */
  body = "overview",
  showAside = true,
  asideSections = 4
}) {
  const tabs = Math.max(0, Number(tabCount) || 0);
  const sections = Math.max(1, Number(asideSections) || 4);
  const rootClass = [
    layout.contratDetailPage,
    layout.enterpriseDetailPage,
    className
  ]
    .filter(Boolean)
    .join(" ");

  const renderBody = () => {
    if (body === "activity") {
      return (
        <div className={sk.activityLayout} aria-hidden>
          <div className={sk.kpiRow}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`${sk.bone} ${sk.kpiCard}`} />
            ))}
          </div>
          <div className={sk.activitySplit}>
            {[0, 1].map(i => (
              <section key={i} className={sk.panel}>
                <div className={sk.panelHead} />
                <div className={`${sk.bone} ${sk.panelBody}`} />
              </section>
            ))}
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
  };

  return (
    <div className={rootClass} aria-busy="true" aria-label={loadingAria}>
      <header className={layout.pageHero}>
        <div className={`${layout.heroTop} ${showMidSlot ? "" : layout.heroTopNoMid}`.trim()}>
          <div className={layout.heroIdentityBlock}>
            <div className={layout.heroCover} aria-hidden />
            <div className={layout.heroIdentityRow}>
              <div className={layout.heroMain}>
                {showTitleIcon ? <span className={`${sk.bone} ${sk.titleIcon}`} aria-hidden style={{ width: "3.5rem", height: "3.5rem", borderRadius: 14 }} /> : null}
                <div className={layout.heroText}>
                  <div className={layout.heroTitle}>
                    {titleHint ? (
                      <span className={sk.titleHint}>{titleHint}</span>
                    ) : (
                      <span className={`${sk.bone} ${sk.titleBar}`} aria-hidden />
                    )}
                    <span className={`${sk.bone} ${sk.statusDot}`} aria-hidden />
                  </div>
                  <div className={`${layout.heroMeta} ${sk.metaRow}`} aria-hidden>
                    <span className={`${sk.bone} ${sk.metaPill} ${sk.metaPillWide}`} />
                    <span className={`${sk.bone} ${sk.metaPill}`} />
                  </div>
                </div>
              </div>
              {showMidSlot ? (
                <div className={layout.heroPlanningFrise} aria-hidden>
                  <div className={`${sk.bone} ${sk.midSlotChip}`} style={{ width: "100%", minHeight: "4.5rem", borderRadius: 12 }} />
                </div>
              ) : null}
              <div className={layout.heroRightCluster}>
                <div className={layout.heroActions} aria-hidden>
                  <span className={`${sk.bone} ${sk.actionBtn}`} />
                  <span className={`${sk.bone} ${sk.actionBtn}`} />
                </div>
                <div className={layout.heroKpiStrip} aria-hidden>
                  {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} className={`${sk.bone} ${sk.kpiCard}`} style={{ minWidth: "5.4rem", height: "4.2rem", borderRadius: 12 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={layout.pageBody}>
        {showAside ? (
          <div className={layout.pageGrid}>
            <main className={layout.mainColumn}>
              {tabs > 0 ? (
                <nav className={layout.heroTabBar} aria-hidden>
                  {Array.from({ length: tabs }, (_, i) => (
                    <span
                      key={i}
                      className={`${sk.bone} ${sk.tab} ${i === tabs - 1 ? sk.tabShort : ""}`}
                    />
                  ))}
                </nav>
              ) : null}
              {renderBody()}
            </main>
            <aside className={layout.asidePanel} aria-hidden>
              <div className={`${layout.rightSidebarContent} ${sk.asideInner}`}>
                {Array.from({ length: sections }, (_, i) => (
                  <div key={i} className={sk.asideSection}>
                    <div className={sk.asideHeader}>
                      <span className={`${sk.bone} ${sk.asideTitle}`} />
                      <span className={`${sk.bone} ${sk.asideCount}`} />
                    </div>
                    {i === 0 ? (
                      <div className={`${sk.bone} ${sk.asideBlock} ${sk.asideBlockTall}`} />
                    ) : null}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <main className={layout.mainColumn}>
            {tabs > 0 ? (
              <nav className={layout.heroTabBar} aria-hidden>
                {Array.from({ length: tabs }, (_, i) => (
                  <span
                    key={i}
                    className={`${sk.bone} ${sk.tab} ${i === tabs - 1 ? sk.tabShort : ""}`}
                  />
                ))}
              </nav>
            ) : null}
            {renderBody()}
          </main>
        )}
      </div>
    </div>
  );
}
