import { Icon } from "@iconify/react";
import cyberStyles from "../../CybersecuritePage/CybersecuritePage.module.css";
export default function MspPageHero({
  eyebrow,
  title,
  subtitle,
  icon,
  brandMarkClassName = "",
  className = "",
  actions = null,
  children = null
}) {
  return <header className={`${cyberStyles.mspHero} ${className}`.trim()}>
      <div className={cyberStyles.mspHeroMain}>
        {icon ? <div className={`${cyberStyles.mspBrandMark} ${brandMarkClassName}`.trim()} aria-hidden>
            <Icon icon={icon} className={cyberStyles.mspBrandMarkIcon} />
          </div> : null}
        <div className={cyberStyles.mspHeroCopy}>
          {eyebrow ? <span className={cyberStyles.mspEyebrow}>{eyebrow}</span> : null}
          <h1 className={cyberStyles.mspTitle}>{title}</h1>
          {subtitle ? <p className={cyberStyles.mspSubtitle}>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className={cyberStyles.mspHeroActions}>{actions}</div> : null}
      {children}
    </header>;
}
