import ProFeatureBadge from "./ProFeatureBadge";
import { notifyProFeature } from "./proFeatureUtils";
import styles from "./ProFeatureLock.module.css";
export default function ProFeatureLock({
  locked = false,
  featureLabel = "This feature",
  featureKey,
  children,
  className = "",
  badgePosition = "corner",
  softLocked = false
}) {
  if (!locked) return children;
  const handleActivate = event => {
    event.preventDefault();
    event.stopPropagation();
    notifyProFeature(featureLabel, featureKey);
  };
  return <div className={`${styles.wrap} ${className}`.trim()}>
      <div className={`${styles.content} ${locked && !softLocked ? styles.contentLocked : ""}`}>
        {children}
      </div>
      <button type="button" className={styles.overlay} onClick={handleActivate} aria-label={`${featureLabel} · available with Veritas Pro`} />
      {badgePosition === "corner" ? <ProFeatureBadge className={styles.badgeCorner} /> : null}
    </div>;
}
