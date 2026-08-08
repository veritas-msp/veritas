import { Icon } from "@iconify/react";
import { VERITAS_DISCORD_URL, VERITAS_GITHUB_URL, VERITAS_WEBSITE_URL } from "./setupConstants";
import styles from "./SetupWizard.module.css";
const COMMUNITY_LINKS = [{
  key: "discord",
  href: VERITAS_DISCORD_URL,
  icon: "simple-icons:discord",
  tileClass: styles.communityTileDiscord,
  labelKey: "linkDiscord",
  ariaKey: "discord"
}, {
  key: "website",
  href: VERITAS_WEBSITE_URL,
  icon: "mdi:web",
  tileClass: styles.communityTileWeb,
  labelKey: "linkWebsite",
  ariaKey: "websiteAria"
}, {
  key: "github",
  href: VERITAS_GITHUB_URL,
  icon: "simple-icons:github",
  tileClass: styles.communityTileGithub,
  labelKey: "linkGithub",
  ariaKey: "githubAria"
}];
export default function SetupCommunityLinks({
  layoutText
}) {
  return <div className={styles.communityBlock}>
      <p className={styles.communityTitle}>{layoutText.communityTitle}</p>
      <div className={styles.communityGrid}>
        {COMMUNITY_LINKS.map(link => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className={`${styles.communityTile} ${link.tileClass}`} aria-label={layoutText[link.ariaKey] || layoutText[link.labelKey]}>
            <span className={styles.communityTileIconWrap} aria-hidden="true">
              <Icon icon={link.icon} className={styles.communityTileIcon} />
            </span>
            <span className={styles.communityTileLabel}>{layoutText[link.labelKey]}</span>
          </a>)}
      </div>
      <p className={styles.communityHint}>{layoutText.communityHint}</p>
    </div>;
}
