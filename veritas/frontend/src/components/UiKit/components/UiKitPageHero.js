import { Icon } from "@iconify/react";
import styles from "../uiKitHome.module.css";

export default function UiKitPageHero({
  title,
  subtitle = null,
  icon = null,
  image = null,
  actions = null,
  children = null,
  guideId,
  stackOnMobile = false,
  bare = false,
  className = "",
  brandMarkClassName = ""
}) {
  const showBrand = Boolean(image || icon);
  return (
    <header
      className={`${styles.pageHero}${bare ? ` ${styles.pageHeroBare}` : ""}${stackOnMobile ? ` ${styles.pageHeroStack}` : ""}${className ? ` ${className}` : ""}`}
      data-guide={guideId || undefined}
    >
      <div className={styles.pageHeroMain}>
        {showBrand ? (
          <span
            className={`${styles.pageHeroIcon}${brandMarkClassName ? ` ${brandMarkClassName}` : ""}`}
            aria-hidden
          >
            {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Icon icon={icon} />}
          </span>
        ) : null}
        <div className={styles.pageHeroText}>
          <h1 className={styles.pageHeroTitle}>{title}</h1>
          {subtitle ? <div className={styles.pageHeroSubtitle}>{subtitle}</div> : null}
          {children}
        </div>
      </div>
      {actions ? <div className={styles.pageHeroActions}>{actions}</div> : null}
    </header>
  );
}
