import React from "react";
import { Icon } from "@iconify/react";
import styles from "./EnterpriseDetailPage.module.css";

/**
 * Coordinated skeleton for cartographie tab (modules strip + peripherals).
 */
export default function EnterpriseMapTabSkeleton({
  peripheralsTitle,
  loadingAria
}) {
  return (
    <div className={styles.mapTabSkeleton} aria-busy="true" aria-label={loadingAria || undefined}>
      <div className={styles.mapTabSkeletonModules} aria-hidden>
        {[0, 1, 2, 3].map(col => (
          <div key={col} className={styles.mapTabSkeletonModuleCol}>
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonModuleLabel}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} />
            {col < 3 ? <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} /> : null}
          </div>
        ))}
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderMain}>
            <h2 className={styles.panelTitle}>
              <Icon icon="mdi:devices" className={styles.panelTitleIcon} aria-hidden />
              {peripheralsTitle}
            </h2>
          </div>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.mapTabSkeletonFilterRow}>
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonChip}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonChip}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonChip}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonChip}`} />
          </div>
          <div className={`${styles.skeleton} ${styles.skeletonTable}`} />
        </div>
      </section>
    </div>
  );
}
