import React from "react";
import styles from "./EnterpriseDetailPage.module.css";

/**
 * Single coordinated skeleton for the cartographie tab (infra map + peripherals).
 * Replaces the two independent section skeletons that caused layout jump.
 */
export default function EnterpriseMapTabSkeleton({
  infraTitle,
  peripheralsTitle,
  loadingAria
}) {
  return (
    <div className={styles.mapTabSkeleton} aria-busy="true" aria-label={loadingAria || undefined}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderMain}>
            <h2 className={styles.panelTitle}>{infraTitle}</h2>
          </div>
        </div>
        <div className={styles.panelBody}>
          <div className={`${styles.skeleton} ${styles.skeletonMap}`} />
          <div className={styles.mapTabSkeletonBrickRow}>
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} />
            <div className={`${styles.skeleton} ${styles.mapTabSkeletonBrick}`} />
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderMain}>
            <h2 className={styles.panelTitle}>{peripheralsTitle}</h2>
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
