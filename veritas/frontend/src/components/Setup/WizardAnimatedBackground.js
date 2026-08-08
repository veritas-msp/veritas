import styles from "./WizardAnimatedBackground.module.css";
export default function WizardAnimatedBackground({
  theme = "light"
}) {
  return <div className={styles.root} data-theme={theme} aria-hidden>
      <div className={styles.baseGradient} />
      <div className={styles.grid} />
      <div className={styles.hexMesh} />
      <svg className={styles.network} viewBox="0 0 1200 800" preserveAspectRatio="none">
        <path className={styles.link} d="M80,120 L320,200 L540,140 L780,260 L1040,180" />
        <path className={`${styles.link} ${styles.linkDelay1}`} d="M60,420 L280,360 L500,480 L720,400 L980,520 L1140,440" />
        <path className={`${styles.link} ${styles.linkDelay2}`} d="M140,640 L360,580 L620,660 L860,560 L1100,620" />
        <circle className={styles.node} cx="320" cy="200" r="4" />
        <circle className={styles.node} cx="540" cy="140" r="3" />
        <circle className={styles.node} cx="780" cy="260" r="4" />
        <circle className={styles.node} cx="500" cy="480" r="3" />
        <circle className={styles.node} cx="720" cy="400" r="4" />
        <circle className={styles.node} cx="620" cy="660" r="3" />
      </svg>
      <div className={styles.orbLayer}>
        <span className={styles.orb} />
        <span className={`${styles.orb} ${styles.orbB}`} />
        <span className={`${styles.orb} ${styles.orbC}`} />
      </div>
      <div className={styles.scanline} />
      <div className={styles.vignette} />
    </div>;
}
