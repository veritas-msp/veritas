import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { getVeritasCommunitySupportLinks } from "../../../config/communitySupport";
import layout from "../../EnterprisesPage/EnterprisesPage.module.css";
import s from "./ReportBugForm.module.css";
import MspPageHero from "../MspPageHero/MspPageHero";
import mspStyles from "../../CybersecuritePage/CybersecuritePage.module.css";
const CHANNELS = [{
  key: "discord",
  icon: "mdi:discord",
  title: "Discord",
  subtitle: "Ask a question or chat live with the Veritas community.",
  accent: "discord",
  linkKey: "discord"
}, {
  key: "github",
  icon: "mdi:github",
  title: "GitHub",
  subtitle: "Report a bug, suggest an improvement, or browse existing issues.",
  accent: "github",
  linkKey: "githubIssues"
}];
function SupportCard({
  href,
  icon,
  title,
  subtitle,
  accent
}) {
  return <a className={`${s.card} ${s[`card_${accent}`]}`} href={href} target="_blank" rel="noopener noreferrer">
      <div className={s.cardIconWrap}>
        <Icon icon={icon} className={s.cardIcon} aria-hidden />
      </div>
      <div className={s.cardBody}>
        <h2 className={s.cardTitle}>{title}</h2>
        <p className={s.cardSubtitle}>{subtitle}</p>
      </div>
      <Icon icon="mdi:arrow-top-right" className={s.cardArrow} aria-hidden />
    </a>;
}
export default function ReportBugForm() {
  const links = useMemo(() => getVeritasCommunitySupportLinks(), []);
  return <div className={`${mspStyles.mspPage} ${layout.page}`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow="Help" title="Support" subtitle="Report a bug, suggest an improvement, or ask a question." icon="mdi:lifebuoy" />
          <main className={mspStyles.mspContent}>
            <div className={layout.shell}>
              <div className={s.grid}>
                {CHANNELS.map(channel => <SupportCard key={channel.key} href={links[channel.linkKey]} icon={channel.icon} title={channel.title} subtitle={channel.subtitle} accent={channel.accent} />)}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>;
}
