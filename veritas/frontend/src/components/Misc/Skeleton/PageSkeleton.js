import styles from "./PageSkeleton.module.css";

/** Bloc shimmer de base. */
export function SkeletonBone({ className = "", style, ...props }) {
  return <div className={`${styles.bone} ${className}`.trim()} style={style} {...props} />;
}

function CrmListSkeleton({ rows, label, className }) {
  const count = Math.max(1, Number(rows) || 12);
  return (
    <div
      className={`${styles.root} ${styles.crmCard} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label || undefined}
    >
      <div className={styles.crmToolbar} aria-hidden>
        <SkeletonBone className={styles.crmSearch} />
        <div className={styles.crmChips}>
          <SkeletonBone className={styles.crmChip} />
          <SkeletonBone className={`${styles.crmChip} ${styles.crmChipSm}`} />
          <span className={styles.crmChipSep} />
          <SkeletonBone className={styles.crmChip} />
          <SkeletonBone className={`${styles.crmChip} ${styles.crmChipWide}`} />
          <SkeletonBone className={styles.crmChip} />
        </div>
        <div className={styles.crmActions}>
          <SkeletonBone className={styles.crmIconBtn} />
          <SkeletonBone className={styles.crmIconBtn} />
          <SkeletonBone className={`${styles.crmIconBtn} ${styles.crmIconBtnPrimary}`} />
        </div>
      </div>

      <div className={styles.crmTableWrap} aria-hidden>
        <div className={styles.crmTableInner}>
          <div className={styles.crmThead}>
            <SkeletonBone className={styles.crmCheck} />
            <SkeletonBone className={styles.crmThNum} />
            <SkeletonBone className={styles.crmThCompany} />
            <SkeletonBone className={styles.crmThStatus} />
            <SkeletonBone className={styles.crmThText} />
            <SkeletonBone className={styles.crmThText} />
            <SkeletonBone className={styles.crmThModules} />
            <SkeletonBone className={styles.crmThDate} />
            <SkeletonBone className={styles.crmThTags} />
            <SkeletonBone className={styles.crmThFav} />
            <span className={styles.crmThChevron} />
          </div>
          <div className={styles.crmRows}>
            {Array.from({ length: count }, (_, index) => (
              <div key={`crm-row-${index}`} className={styles.crmRow}>
                <SkeletonBone className={styles.crmCheck} />
                <SkeletonBone className={styles.crmCellNum} />
                <div className={styles.crmCompany}>
                  <SkeletonBone className={styles.crmCompanyIcon} />
                  <SkeletonBone className={styles.crmCompanyName} />
                </div>
                <SkeletonBone className={styles.crmStatusPill} />
                <SkeletonBone className={styles.crmCellText} />
                <SkeletonBone className={styles.crmCellText} />
                <div className={styles.crmPills}>
                  <SkeletonBone className={styles.crmPill} />
                  <SkeletonBone className={`${styles.crmPill} ${styles.crmPillSm}`} />
                </div>
                <SkeletonBone className={styles.crmCellDate} />
                <div className={styles.crmPills}>
                  <SkeletonBone className={`${styles.crmPill} ${styles.crmPillTag}`} />
                </div>
                <SkeletonBone className={styles.crmFav} />
                <SkeletonBone className={styles.crmChevron} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.crmPagination} aria-hidden>
        <div className={styles.crmPagLeft}>
          <SkeletonBone className={styles.crmPagLabel} />
          <SkeletonBone className={styles.crmPagSelect} />
          <SkeletonBone className={styles.crmPagInfo} />
        </div>
        <div className={styles.crmPagRight}>
          <SkeletonBone className={styles.crmPagBtn} />
          <SkeletonBone className={styles.crmPagPage} />
          <SkeletonBone className={styles.crmPagBtn} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de page unifié.
 * - variant="list" / "crmList" : carte CRM (toolbar + tableau + pagination)
 * - variant="panels" : panneaux empilés (accueil)
 */
export default function PageSkeleton({
  variant = "list",
  rows = 8,
  panels = 2,
  label,
  className = ""
}) {
  const panelCount = Math.max(1, Number(panels) || 2);

  if (variant === "panels") {
    return (
      <div
        className={`${styles.root} ${styles.panels} ${className}`.trim()}
        role="status"
        aria-busy="true"
        aria-label={label || undefined}
      >
        {Array.from({ length: panelCount }, (_, index) => (
          <SkeletonBone
            key={`panel-${index}`}
            className={index === panelCount - 1 ? styles.panelGrow : styles.panel}
          />
        ))}
      </div>
    );
  }

  return <CrmListSkeleton rows={rows} label={label} className={className} />;
}
