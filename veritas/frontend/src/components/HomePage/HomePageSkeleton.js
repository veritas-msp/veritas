import { SkeletonBone } from "../Misc/Skeleton/PageSkeleton";
import home from "./HomePage.module.css";
import layout from "./HomeSupervisionSection.module.css";
import sk from "./HomePageSkeleton.module.css";

function CardShell({ children, tall, className = "" }) {
  return (
    <div className={`${sk.card} ${tall ? sk.cardTall : ""} ${className}`.trim()} aria-hidden>
      <div className={sk.cardHead}>
        <SkeletonBone className={sk.cardIcon} />
        <SkeletonBone className={sk.cardTitle} />
        <SkeletonBone className={sk.cardAction} />
      </div>
      <div className={sk.cardBody}>{children}</div>
    </div>
  );
}

function ListRows({ count = 5 }) {
  return (
    <div className={sk.list} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={sk.listRow}>
          <SkeletonBone className={sk.listAvatar} />
          <div className={sk.listCopy}>
            <SkeletonBone className={sk.listTitle} />
            <SkeletonBone className={sk.listMeta} />
          </div>
          <SkeletonBone className={sk.listPill} />
        </div>
      ))}
    </div>
  );
}

function TicketPanelBone() {
  return (
    <div className={sk.opsPanel} aria-hidden>
      <SkeletonBone className={sk.opsPanelTitle} />
      <div className={sk.opsKpiRow}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={sk.opsKpi}>
            <SkeletonBone className={sk.opsKpiIcon} />
            <SkeletonBone className={sk.opsKpiValue} />
            <SkeletonBone className={sk.opsKpiLabel} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsAsideSkeleton() {
  return (
    <aside className={`${home.newsAside} ${sk.newsAside}`} aria-hidden>
      <div className={sk.newsCard}>
        <div className={sk.newsHead}>
          <div className={sk.newsHeadText}>
            <SkeletonBone className={sk.newsTitle} />
            <SkeletonBone className={sk.newsSubtitle} />
          </div>
          <SkeletonBone className={sk.newsRefresh} />
        </div>
        <div className={sk.newsFeed}>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={sk.newsItem}>
              <SkeletonBone className={sk.newsThumb} />
              <div className={sk.newsCopy}>
                <SkeletonBone className={sk.newsItemTitle} />
                <SkeletonBone className={sk.newsItemMeta} />
                <SkeletonBone className={sk.newsItemLine} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * Skeleton aligné sur la home supervision
 * (hero + tickets/événements + alertes + news).
 */
export default function HomePageSkeleton({ label, className = "", showNews = true }) {
  return (
    <div
      className={`${home.pageLayout} ${sk.root} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label || undefined}
    >
      <div className={`${home.dashboardMain} ${sk.main}`}>
        <header className={sk.hero} aria-hidden>
          <div className={sk.heroMain}>
            <SkeletonBone className={sk.heroBrand} />
            <div className={sk.heroCopy}>
              <SkeletonBone className={sk.heroTitle} />
              <SkeletonBone className={sk.heroSubtitle} />
            </div>
          </div>
        </header>

        <div className={`${layout.mainStack} ${sk.mainStack}`}>
          <div className={`${sk.opsPanelsRow} ${layout.ticketPanelsGrow}`}>
            <TicketPanelBone />
            <TicketPanelBone />
          </div>
          <div className={`${sk.opsPanel} ${layout.eventsPanel}`}>
            <SkeletonBone className={sk.opsPanelTitle} />
            <div className={sk.eventsStrip}>
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={sk.eventsDay}>
                  <SkeletonBone className={sk.eventsDayLabel} />
                  <SkeletonBone className={sk.eventsDayCircle} />
                </div>
              ))}
            </div>
          </div>
          <CardShell tall className={layout.alertsCard}>
            <ListRows count={6} />
          </CardShell>
        </div>
      </div>

      {showNews ? <NewsAsideSkeleton /> : null}
    </div>
  );
}
