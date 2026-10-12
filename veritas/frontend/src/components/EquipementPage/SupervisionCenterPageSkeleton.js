import { SkeletonBone } from "../Misc/Skeleton/PageSkeleton";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import dashStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import styles from "./SupervisionCenterPage.module.css";
import sk from "./SupervisionCenterPageSkeleton.module.css";

function QueueRow({ cols = 6 }) {
  return (
    <div className={sk.row} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols }, (_, index) => (
        <SkeletonBone
          key={index}
          className={index === 0 ? sk.cellPrimary : sk.cell}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton aligné sur le centre de supervision (file ops + sidebar maintenance).
 */
export default function SupervisionCenterPageSkeleton({ label }) {
  return (
    <div
      className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}
      role="status"
      aria-busy="true"
      aria-label={label || undefined}
    >
      <div className={cyberStyles.mspLayout}>
        <div className={`${cyberStyles.mspMain} ${styles.pageColumn}`}>
          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${layout.contentNoHero}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.contentShell}`}>
              <div className={`${dashStyles.dashboard} ${styles.dashboard}`}>
                <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                  <div className={styles.opsSplit}>
                    <div className={styles.opsMain}>
                      <div className={`${layout.panelCard} ${sk.queueCard}`} aria-hidden>
                        <div className={`${layout.tableSearchBar} ${sk.toolbar}`}>
                          <SkeletonBone className={sk.search} />
                          <div className={sk.chips}>
                            <SkeletonBone className={sk.chipWide} />
                            <SkeletonBone className={sk.chip} />
                            <SkeletonBone className={sk.chip} />
                            <span className={sk.chipSep} />
                            <SkeletonBone className={sk.chip} />
                            <SkeletonBone className={sk.chip} />
                          </div>
                          <div className={sk.actions}>
                            <SkeletonBone className={sk.iconBtn} />
                            <SkeletonBone className={sk.iconBtn} />
                          </div>
                        </div>

                        <div className={sk.table}>
                          <div
                            className={sk.thead}
                            style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
                          >
                            {Array.from({ length: 6 }, (_, index) => (
                              <SkeletonBone key={`th-${index}`} className={sk.th} />
                            ))}
                          </div>
                          <div className={sk.tbody}>
                            {Array.from({ length: 8 }, (_, index) => (
                              <QueueRow key={`row-${index}`} cols={6} />
                            ))}
                          </div>
                        </div>

                        <div className={sk.pagination}>
                          <SkeletonBone className={sk.pagLabel} />
                          <SkeletonBone className={sk.pagInfo} />
                          <div className={sk.pagRight}>
                            <SkeletonBone className={sk.pagBtn} />
                            <SkeletonBone className={sk.pagPage} />
                            <SkeletonBone className={sk.pagBtn} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className={styles.opsSide} aria-hidden>
                      <div className={sk.sideCard}>
                        <div className={sk.sideHead}>
                          <SkeletonBone className={sk.sideIcon} />
                          <SkeletonBone className={sk.sideTitle} />
                        </div>
                        <div className={sk.sideList}>
                          {Array.from({ length: 5 }, (_, index) => (
                            <div key={index} className={sk.sideItem}>
                              <SkeletonBone className={sk.sideAvatar} />
                              <div className={sk.sideCopy}>
                                <SkeletonBone className={sk.sideItemTitle} />
                                <SkeletonBone className={sk.sideItemMeta} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
