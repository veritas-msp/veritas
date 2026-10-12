import { Icon } from "@iconify/react";
import cyberStyles from "../../CybersecuritePage/CybersecuritePage.module.css";
export default function MspPageHero({
  eyebrow,
  title,
  subtitle,
  icon,
  image = null,
  brandMarkClassName = "",
  className = "",
  actions = null,
  children = null,
  guideId,
  stackOnMobile = false
}) {
  const showBrand = Boolean(image || icon);
  return <header className={`${cyberStyles.mspHero} ${stackOnMobile ? cyberStyles.mspHeroStack : ""} ${className}`.trim()} data-guide={guideId || undefined}>
      <div className={cyberStyles.mspHeroMain}>
        {showBrand ? <div className={`${cyberStyles.mspBrandMark} ${image ? cyberStyles.mspBrandMarkLogo : ""} ${brandMarkClassName}`.trim()} aria-hidden>
            {image ? <img src={image} alt="" className={cyberStyles.mspBrandMarkImg} /> : <Icon icon={icon} className={cyberStyles.mspBrandMarkIcon} />}
          </div> : null}
        <div className={cyberStyles.mspHeroCopy}>
          {eyebrow ? <span className={cyberStyles.mspEyebrow}>{eyebrow}</span> : null}
          <h1 className={cyberStyles.mspTitle}>{title}</h1>
          {subtitle ? <p className={cyberStyles.mspSubtitle}>{subtitle}</p> : null}
          {children}
        </div>
      </div>
      {actions ? <div className={cyberStyles.mspHeroActions}>{actions}</div> : null}
    </header>;
}
