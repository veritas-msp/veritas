import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useProfileAccess } from "../../hooks/useProfileAccess";
import { fetchHomeDashboard } from "../../api/stats";
import HomeTechNewsColumn from "./HomeTechNewsColumn";
import HomeSupervisionSection from "./HomeSupervisionSection";
import { getHomePageCopy } from "./homePageI18n";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getHomePageGuideSteps } from "../PageGuide/homePageGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import HomePageSkeleton from "./HomePageSkeleton";
import styles from "./HomePage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { getLocaleTag } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";

const HOME_EVENTS_STRIP_DAYS = 7;

function formatDisplayNameFromEmailLocal(local) {
  if (!local) return "";
  const parts = local.split(/[._+\-]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return String(Math.round(Number(value)));
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function eventOverlapsLocalDay(event, dayStart) {
  if (!event?.start) return false;
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return false;
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  let end = event.end ? new Date(event.end) : start;
  if (Number.isNaN(end.getTime())) end = start;
  // all-day / exclusive end: if end === start, treat as same-day
  if (end.getTime() === start.getTime()) {
    return start >= dayStart && start < dayEnd;
  }
  return start < dayEnd && end > dayStart;
}

function buildEventsWeekStrip(events, locale, days = HOME_EVENTS_STRIP_DAYS) {
  const localeTag = getLocaleTag(locale);
  const list = Array.isArray(events) ? events : [];
  const today = startOfLocalDay();
  const daysOut = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const count = list.reduce((acc, event) => (eventOverlapsLocalDay(event, day) ? acc + 1 : acc), 0);
    daysOut.push({
      key: `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`,
      date: day,
      isToday: i === 0,
      count,
      weekday: day.toLocaleDateString(localeTag || undefined, { weekday: "short" }),
      dayNum: day.toLocaleDateString(localeTag || undefined, { day: "2-digit" })
    });
  }
  return daysOut;
}
function getAssignedTicketKpis(stats) {
  const source = stats || {};
  const neu = Number(source.new) || 0;
  const pending = Number(source.pending) || 0;
  const inProgress = Number(source.inProgress) || 0;
  const toValidate = Number(source.toValidate) || 0;
  const total = Number(source.total);
  return {
    new: neu,
    pending,
    inProgress,
    toValidate,
    total: Number.isFinite(total) ? total : neu + pending + inProgress
  };
}
function buildTicketKpiCards(stats, labels) {
  const kpis = getAssignedTicketKpis(stats);
  return [{
    key: "total",
    value: kpis.total,
    label: labels.kpiTotal,
    icon: "mdi:ticket-account",
    tone: "purple",
    viewId: "__builtin_mine__"
  }, {
    key: "inProgress",
    value: kpis.inProgress,
    label: labels.kpiInProgress,
    icon: "mdi:progress-clock",
    tone: "teal",
    viewId: "__builtin_in_progress__"
  }, {
    key: "pending",
    value: kpis.pending,
    label: labels.kpiPending,
    icon: "mdi:timer-sand",
    tone: "amber",
    viewId: "__builtin_pending__"
  }, {
    key: "toValidate",
    value: kpis.toValidate,
    label: labels.kpiToValidate,
    icon: "mdi:clipboard-check-outline",
    tone: "orange",
    viewId: "__builtin_to_validate__"
  }];
}

export default function HomePage({
  onNavigate,
  isCommunity = false
}) {
  const {
    user
  } = useAuthContext();
  const access = useProfileAccess(user?.profile);
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const { isPhone } = useBreakpoint();
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const abortRef = useRef(null);
  const userName = useMemo(() => {
    const pseudo = String(user?.username || "").trim();
    if (pseudo) return pseudo;
    if (!user?.email) return "";
    const local = user.email.split("@")[0];
    return formatDisplayNameFromEmailLocal(local);
  }, [user]);
  const todayLabel = useMemo(() => {
    if (isPhone) {
      return new Date().toLocaleDateString(locale || "fr", {
        day: "2-digit",
        month: "2-digit"
      });
    }
    return formatters.formatLongDate(new Date());
  }, [formatters, isPhone, locale]);
  const copy = useMemo(() => getHomePageCopy(locale), [locale]);
  const loadDashboard = useCallback((options = {}) => {
    const {
      soft = false
    } = options;
    if (abortRef.current) abortRef.current.abort();
    const controller = createTrackedAbortController();
    abortRef.current = controller;
    if (!soft) {
      setLoading(true);
    }
    setLoadError("");
    fetchHomeDashboard({
      signal: controller.signal
    }).then(dashboardData => {
      setDashboard(dashboardData);
    }).catch(err => {
      if (err.name === "AbortError") return;
      setLoadError(err.message || copy.errorLoad);
      if (!soft) setDashboard(null);
    }).finally(() => {
      if (abortRef.current !== controller) return;
      setLoading(false);
    });
  }, [copy.errorLoad]);
  useEffect(() => {
    loadDashboard();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboard]);
  const navigate = useCallback((type, data) => {
    if (typeof onNavigate === "function") onNavigate(type, data);
  }, [onNavigate]);
  const supportTicketKpiCards = useMemo(
    () => buildTicketKpiCards(dashboard?.assignedTicketStats?.support, copy.panels.tickets),
    [dashboard?.assignedTicketStats?.support, copy.panels.tickets]
  );
  const salesTicketKpiCards = useMemo(
    () => buildTicketKpiCards(dashboard?.assignedTicketStats?.sales, copy.panels.tickets),
    [dashboard?.assignedTicketStats?.sales, copy.panels.tickets]
  );
  const upcomingEvents = dashboard?.upcomingEvents || [];
  const visibleEvents = upcomingEvents;
  const homeGuideSteps = useMemo(() => getHomePageGuideSteps({
    isCommunity,
    locale
  }), [isCommunity, locale]);
  const canAccessSupport = access.Ticket !== false;
  const canAccessSales = access.TicketSales !== false;
  const canAccessPlanning = access.Planning !== false;
  const canAccessSupervision = access.Hardware !== false;
  const showSupportTickets = canAccessSupport;
  const showSalesTickets = !isCommunity && canAccessSales;
  const showEvents = !isCommunity && canAccessPlanning;
  const showSupervision = !isCommunity && canAccessSupervision;
  const mobileTabs = useMemo(() => {
    const tabs = [];
    if (showSupportTickets) {
      tabs.push({
        id: "support",
        label: copy.mobileTabs.support,
        icon: "mdi:message-processing-outline"
      });
    }
    if (showSalesTickets) {
      tabs.push({
        id: "sales",
        label: copy.mobileTabs.services,
        icon: "mdi:briefcase-outline"
      });
    }
    if (showEvents) {
      tabs.push({
        id: "events",
        label: copy.mobileTabs.events,
        icon: "mdi:calendar-month-outline"
      });
    }
    if (showSupervision) {
      tabs.push({
        id: "supervision",
        label: copy.mobileTabs.supervision,
        icon: "mdi:monitor-dashboard"
      });
    }
    return tabs;
  }, [copy.mobileTabs, showEvents, showSalesTickets, showSupervision, showSupportTickets]);
  const [mobileSection, setMobileSection] = useState("support");
  useEffect(() => {
    if (!mobileTabs.some(tab => tab.id === mobileSection)) {
      setMobileSection(mobileTabs[0]?.id || "support");
    }
  }, [mobileSection, mobileTabs]);
  if (showSupervision) {
    const showDashboardSkeleton = loading && !dashboard;
    return (
      <div className={styles.pageWrapper}>
        {showDashboardSkeleton ? (
          <HomePageSkeleton label={copy.loading} showNews />
        ) : (
          <div className={styles.pageLayout}>
            <div className={styles.dashboardMain}>
              {loadError ? (
                <div className={styles.errorBanner} role="alert">
                  <p className={styles.errorBannerText}>{loadError}</p>
                  <button type="button" className={styles.errorRetry} onClick={() => loadDashboard()}>
                    {copy.retry}
                  </button>
                </div>
              ) : null}
              <HomeSupervisionSection
                copy={copy}
                locale={locale}
                userName={userName}
                assignedTicketStats={dashboard?.assignedTicketStats || null}
                ticketSlaStats={dashboard?.ticketSlaStats || null}
                recentTickets={dashboard?.recentTickets || []}
                upcomingEvents={visibleEvents}
                showSupportTickets={showSupportTickets}
                showSalesTickets={showSalesTickets}
                showEvents={showEvents}
                onOpenCenter={() => navigate("Hardware")}
                onNavigate={navigate}
              />
            </div>
            <div className={styles.newsAside} data-guide="home-news">
              <HomeTechNewsColumn locale={locale} />
            </div>
          </div>
        )}
        <PageGuideTour
          open={pageGuideOpen}
          steps={homeGuideSteps}
          title={copy.guide.tourTitle}
          locale={locale}
          onClose={() => setPageGuideOpen(false)}
        />
      </div>
    );
  }

  return <div className={styles.pageWrapper}>
      <div className={styles.pageLayout}>
        <div className={styles.dashboardMain}>
          <div data-guide="home-hero">
            <div className={styles.homeHeroWrap}>
              <MspPageHero className={styles.homeHero} stackOnMobile title={userName ? copy.heroGreeting(userName) : copy.heroTitle} subtitle={isPhone ? null : copy.heroSubtitle} icon="mdi:view-dashboard-outline" />
              <div className={styles.heroAside}>
                <div className={styles.heroMeta}>
                  <Icon icon="mdi:calendar-today" className={styles.heroMetaIcon} />
                  <span className={styles.heroDate}>{todayLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {loading && !dashboard ? (
            <PageSkeleton
              variant="panels"
              panels={showEvents ? 2 : 1}
              label={copy.loading}
              className={styles.pageSkeleton}
            />
          ) : null}

          {loadError ? <div className={styles.errorBanner} role="alert">
              <p className={styles.errorBannerText}>{loadError}</p>
              <button type="button" className={styles.errorRetry} onClick={() => loadDashboard()}>
                {copy.retry}
              </button>
            </div> : null}

          {dashboard ? <>
              {mobileTabs.length > 1 ? <div className={styles.mobileSectionTabs} role="tablist" aria-label={copy.mobileTabs.aria}>
                  {mobileTabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={mobileSection === tab.id} className={`${styles.mobileSectionTab} ${mobileSection === tab.id ? styles.mobileSectionTabActive : ""}`} onClick={() => setMobileSection(tab.id)}>
                      <Icon icon={tab.icon} className={styles.mobileSectionTabIcon} aria-hidden />
                      <span>{tab.label}</span>
                    </button>)}
                </div> : null}
              <div className={styles.opsStack} data-mobile-section={mobileSection}>
                {showSupportTickets || showSalesTickets ? <div className={`${styles.ticketPanelsRow} ${showSupportTickets && showSalesTickets ? "" : styles.ticketPanelsRowSingle}`.trim()} data-guide="home-tickets">
                  {showSupportTickets ? <section className={`${styles.panel} ${styles.panelFull}`} data-home-section="support">
                    <PanelHeader title={copy.panels.tickets.supportTitle} eyebrow />
                    <div className={styles.panelBody}>
                      <div className={styles.ticketKpiRow} role="list" aria-label={copy.panels.tickets.supportKpiAriaLabel}>
                        {supportTicketKpiCards.map(card => <button key={card.key} type="button" role="listitem" className={`${styles.ticketKpiCard} ${styles[`kpiTone_${card.tone}`]} ${Number(card.value) > 0 ? styles.kpiLive : ""}`} onClick={() => navigate("Ticket", card.viewId ? { viewId: card.viewId } : null)} title={card.label} aria-label={`${card.label}: ${formatNumber(card.value)}`}>
                            <span className={styles.kpiIconWrap} aria-hidden>
                              <Icon icon={card.icon} />
                            </span>
                            <span className={styles.kpiValue}>{formatNumber(card.value)}</span>
                            <span className={styles.kpiLabel}>{card.label}</span>
                          </button>)}
                      </div>
                    </div>
                  </section> : null}

                  {showSalesTickets ? <section className={`${styles.panel} ${styles.panelFull}`} data-home-section="sales">
                      <PanelHeader title={copy.panels.tickets.salesTitle} eyebrow />
                      <div className={styles.panelBody}>
                        <div className={styles.ticketKpiRow} role="list" aria-label={copy.panels.tickets.salesKpiAriaLabel}>
                          {salesTicketKpiCards.map(card => <button key={card.key} type="button" role="listitem" className={`${styles.ticketKpiCard} ${styles[`kpiTone_${card.tone}`]} ${Number(card.value) > 0 ? styles.kpiLive : ""}`} onClick={() => navigate("TicketSales", card.viewId ? { viewId: card.viewId } : null)} title={card.label} aria-label={`${card.label}: ${formatNumber(card.value)}`}>
                              <span className={styles.kpiIconWrap} aria-hidden>
                                <Icon icon={card.icon} />
                              </span>
                              <span className={styles.kpiValue}>{formatNumber(card.value)}</span>
                              <span className={styles.kpiLabel}>{card.label}</span>
                            </button>)}
                        </div>
                      </div>
                    </section> : null}
                </div> : null}

                {showEvents ? <section className={`${styles.panel} ${styles.panelFull} ${styles.eventsPanel}`} data-guide="home-events" data-home-section="events">
                    <PanelHeader title={copy.panels.events.title} titleMeta={<span className={styles.panelTitleMeta}>{copy.panels.events.weekHint}</span>} eyebrow />
                    <div className={`${styles.panelBody} ${styles.eventsPanelBody}`}>
                      <HomeEventsWeekStrip
                        events={visibleEvents}
                        locale={locale}
                        copy={copy}
                        onOpen={() => navigate("Planning")}
                      />
                    </div>
                  </section> : null}
              </div>
            </> : null}
        </div>

        <div className={styles.newsAside} data-guide="home-news">
          <HomeTechNewsColumn locale={locale} />
        </div>
      </div>

      <PageGuideTour open={pageGuideOpen} steps={homeGuideSteps} title={copy.guide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}

function HomeEventsWeekStrip({
  events,
  locale,
  copy,
  onOpen
}) {
  const labels = copy?.panels?.events || {};
  const days = useMemo(
    () => buildEventsWeekStrip(events, locale, HOME_EVENTS_STRIP_DAYS),
    [events, locale]
  );
  return (
    <div className={styles.eventsStrip}>
      <div
        className={styles.eventsStripTrack}
        role="list"
        aria-label={labels.stripAria || labels.title}
      >
        <span className={styles.eventsStripLine} aria-hidden />
        {days.map(day => {
          const weekday = day.isToday ? labels.today || day.weekday : day.weekday;
          const dayLabel = `${weekday} ${day.dayNum}`;
          const countLabel = interpolate(labels.dayCount || "{count}", { count: day.count });
          const aria = interpolate(labels.dayAria || "{day}: {count}", {
            day: dayLabel,
            count: day.count
          });
          return (
            <button
              key={day.key}
              type="button"
              role="listitem"
              className={`${styles.eventsDayCell} ${day.isToday ? styles.eventsDayToday : ""} ${
                day.count > 0 ? styles.eventsDayHasEvents : ""
              }`}
              onClick={onOpen}
              aria-label={aria}
              title={aria}
            >
              <span className={styles.eventsDayDate}>
                <span className={styles.eventsDayWeekday}>{weekday}</span>
                <span className={styles.eventsDayNum}>{day.dayNum}</span>
              </span>
              <span className={styles.eventsDayCircle}>
                <span className={styles.eventsDayCount}>{countLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  titleMeta = null,
  eyebrow = false,
  headerMeta = null
}) {
  return <div className={styles.panelHeader}>
      <div className={styles.panelHeaderMain}>
        {eyebrow ? <div className={styles.panelEyebrowRow}>
            <h2 className={styles.panelEyebrow}>{title}</h2>
            {titleMeta}
          </div> : <div className={styles.panelTitleRow}>
            {icon ? <Icon icon={icon} className={styles.panelIcon} /> : null}
            <h2 className={styles.panelTitle}>{title}</h2>
          </div>}
        {headerMeta}
      </div>
    </div>;
}
