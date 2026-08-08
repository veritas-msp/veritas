import React from "react";
import styles from "./EnterpriseDetailPage.module.css";
export default function EnterpriseDetailSkeleton() {
  return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} msp-page-grid`}>
      <header className={styles.pageHero}>
        <div className={styles.heroRow}>
          <div className={`${styles.skeleton} ${styles.skeletonBackBtn}`} />
          <div className={styles.heroMain}>
            <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
            <div className={styles.heroText}>
              <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
              <div className={styles.skeletonMetaRow}>
                <div className={`${styles.skeleton} ${styles.skeletonMetaPill}`} />
                <div className={`${styles.skeleton} ${styles.skeletonMetaPill}`} />
                <div className={`${styles.skeleton} ${styles.skeletonMetaPill}`} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.pageBody}>
        <div className={styles.pageGrid}>
          <main className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={`${styles.skeleton} ${styles.skeletonPanelTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonMap}`} />
            </section>
            <section className={styles.panel}>
              <div className={`${styles.skeleton} ${styles.skeletonPanelTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonTable}`} />
            </section>
          </main>
          <aside className={styles.asidePanel}>
            <section className={styles.sidebarSection}>
              <div className={`${styles.skeleton} ${styles.skeletonPanelTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarBlock}`} />
            </section>
            <section className={styles.sidebarSection}>
              <div className={`${styles.skeleton} ${styles.skeletonPanelTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarBlock}`} />
            </section>
          </aside>
        </div>
      </div>
    </div>;
}
