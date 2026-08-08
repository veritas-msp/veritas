import SetupLanguageSwitcher from "./SetupLanguageSwitcher";
import SetupThemeSwitcher from "./SetupThemeSwitcher";
import SetupCommunityLinks from "./SetupCommunityLinks";
import AppVersion from "../Misc/AppVersion";
import styles from "./SetupWizard.module.css";
export default function SetupWizardLayout({
  step,
  steps,
  stepMeta,
  onStepClick,
  locale,
  onLocaleChange,
  theme = "light",
  onThemeChange,
  themeAriaLabel,
  wideCard = false,
  layoutText,
  children
}) {
  const items = stepMeta || [];
  return <div className={styles.wrapper} data-wizard-theme={theme}>
      <aside className={styles.left}>
        <div className={styles.leftTop}>
          <div className={styles.brandRow}>
            <div className={styles.brand}>
              <div className={styles.brandIcon}>V</div>
              <span className={styles.brandName}>Veritas</span>
              <AppVersion variant="dark" />
            </div>
            <div className={styles.brandTools}>
              {onThemeChange ? <SetupThemeSwitcher theme={theme} onChange={onThemeChange} ariaLabel={themeAriaLabel} /> : null}
              <SetupLanguageSwitcher locale={locale} onChange={onLocaleChange} />
            </div>
          </div>
          <h1 className={styles.leftHeadline}>{layoutText.title}</h1>
          <p className={styles.leftSub}>{layoutText.subtitle}</p>
        </div>

        <ol className={styles.stepList}>
          {items.map(s => {
          const done = steps?.[s.key] ?? false;
          const active = step === s.id;
          const clickable = done || s.id <= step || s.key === "mfa" && steps?.admin && !steps?.mfa;
          return <li key={s.id}>
                <button type="button" className={`${styles.stepItem} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`} disabled={!clickable} onClick={() => clickable && onStepClick?.(s.id)}>
                  <span className={styles.stepNumber}>{done ? "✓" : s.id}</span>
                  <span>{s.label}</span>
                </button>
              </li>;
        })}
        </ol>

        <div className={styles.leftFooter}>
          <SetupCommunityLinks layoutText={layoutText} />
        </div>
      </aside>
      <main className={styles.right}>
        <div className={`${styles.card} ${wideCard ? styles.cardWide : ""}`}>{children}</div>
      </main>
    </div>;
}
