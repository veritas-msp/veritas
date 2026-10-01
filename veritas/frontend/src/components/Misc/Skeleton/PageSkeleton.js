import styles from "./PageSkeleton.module.css";

/** Bloc shimmer de base. */
export function SkeletonBone({ className = "", style, ...props }) {
  return <div className={`${styles.bone} ${className}`.trim()} style={style} {...props} />;
}

/**
 * Skeleton de page unifié — volontairement minimal.
 * - variant="list" : en-tête + lignes (entreprises / contacts)
 * - variant="panels" : panneaux empilés (accueil)
 */
export default function PageSkeleton({
  variant = "list",
  rows = 8,
  panels = 2,
  label,
  className = ""
}) {
  const count = Math.max(1, Number(rows) || 8);
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

  return (
    <div
      className={`${styles.root} ${styles.list} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label || undefined}
    >
      <SkeletonBone className={styles.listHead} />
      <div className={styles.listRows}>
        {Array.from({ length: count }, (_, index) => (
          <div key={`row-${index}`} className={styles.listRow}>
            <SkeletonBone className={styles.listCellWide} />
            <SkeletonBone className={styles.listCell} />
            <SkeletonBone className={styles.listCell} />
            <SkeletonBone className={styles.listCellNarrow} />
          </div>
        ))}
      </div>
    </div>
  );
}
