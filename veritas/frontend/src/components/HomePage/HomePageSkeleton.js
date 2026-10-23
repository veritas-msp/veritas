import { SkeletonBone } from "../Misc/Skeleton/PageSkeleton";
import { UiKitHomeBoard, UiKitHomeShell } from "../UiKit";
import home from "./HomePage.module.css";
import sk from "./HomePageSkeleton.module.css";

function EventsCardBone() {
  return (
    <div className={sk.eventsCard} aria-hidden>
      <div className={sk.eventsHead}>
        <SkeletonBone className={sk.eventsIcon} />
        <SkeletonBone className={sk.eventsTitle} />
      </div>
      <div className={sk.eventsWeek}>
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className={sk.eventsDay}>
            <SkeletonBone className={sk.eventsDayLabel} />
            <SkeletonBone className={sk.eventsDayNum} />
          </div>
        ))}
      </div>
      <div className={sk.eventsBody}>
        <SkeletonBone className={sk.eventsEmpty} />
      </div>
    </div>
  );
}

function TicketPanelBone() {
  return (
    <div className={sk.ticketCard} aria-hidden>
      <div className={sk.ticketHead}>
        <div className={sk.ticketHeading}>
          <SkeletonBone className={sk.ticketIcon} />
          <SkeletonBone className={sk.ticketTitle} />
        </div>
        <div className={sk.toggle}>
          <SkeletonBone className={`${sk.toggleBtn} ${sk.toggleBtnOn}`} />
          <SkeletonBone className={sk.toggleBtn} />
        </div>
      </div>
      <div className={sk.kpiRow}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={sk.kpiPill}>
            <SkeletonBone className={sk.kpiValue} />
            <SkeletonBone className={sk.kpiLabel} />
          </div>
        ))}
      </div>
      <div className={sk.ticketTable}>
        <div className={sk.tableHead}>
          <SkeletonBone className={sk.colNum} />
          <SkeletonBone className={sk.colTitle} />
          <SkeletonBone className={sk.colCompany} />
          <SkeletonBone className={sk.colStatus} />
          <SkeletonBone className={sk.colPriority} />
          <SkeletonBone className={sk.colSla} />
          <SkeletonBone className={`${sk.colDate} ${sk.colCreated}`} />
          <SkeletonBone className={sk.colDate} />
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={sk.tableRow}>
            <SkeletonBone className={sk.colNum} />
            <SkeletonBone className={sk.colTitle} />
            <SkeletonBone className={sk.colCompany} />
            <SkeletonBone className={sk.colStatus} />
            <SkeletonBone className={sk.colPriority} />
            <SkeletonBone className={sk.colSla} />
            <SkeletonBone className={`${sk.colDate} ${sk.colCreated}`} />
            <SkeletonBone className={sk.colDate} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsBottomSkeleton() {
  return (
    <aside className={sk.newsCard} aria-hidden>
      <div className={sk.newsHead}>
        <div className={sk.newsHeading}>
          <SkeletonBone className={sk.newsIcon} />
          <div className={sk.newsHeadText}>
            <SkeletonBone className={sk.newsTitle} />
            <SkeletonBone className={sk.newsSubtitle} />
          </div>
        </div>
        <SkeletonBone className={sk.newsRefresh} />
      </div>
      <div className={sk.newsFeed}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={sk.newsItem}>
            <SkeletonBone className={sk.newsBadge} />
            <div className={sk.newsCopy}>
              <SkeletonBone className={sk.newsItemMeta} />
              <SkeletonBone className={sk.newsItemTitle} />
              <SkeletonBone className={sk.newsItemLine} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

/** Skeleton Accueil — même shell que la page (salutation, événements, tickets, fil). */
export default function HomePageSkeleton({ label, className = "", showNews = true }) {
  return (
    <div
      className={`${home.pageWrapper} ${sk.root} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label || undefined}
    >
      <UiKitHomeShell
        top={
          <UiKitHomeBoard
            title={<SkeletonBone className={sk.heroTitle} />}
            subtitle={<SkeletonBone className={sk.heroSubtitle} />}
            events={<EventsCardBone />}
            tickets={<TicketPanelBone />}
          />
        }
        bottom={showNews ? <NewsBottomSkeleton /> : null}
      />
    </div>
  );
}
