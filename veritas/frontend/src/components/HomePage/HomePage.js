import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useProfileAccess } from "../../hooks/useProfileAccess";
import { fetchHomeDashboard } from "../../api/stats";
import HomeTechNewsColumn from "./HomeTechNewsColumn";
import { getHomePageCopy } from "./homePageI18n";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getHomePageGuideSteps } from "../PageGuide/homePageGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { getHomeEventTypeMeta } from "./homeEventTypes";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import styles from "./HomePage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { formatPageInfo, getCommonCopy } from "../../i18n/commonI18n";
import { interpolate } from "../../i18n/translate";

const HOME_LIST_LIMIT = 5;
const HOME_LIST_MIN_ROWS = 3;
const HOME_LIST_MAX_ROWS = 24;
const HOME_LIST_ROW_HEIGHT = 41;
const HOME_LIST_PAGER_HEIGHT = 42;

function compareHomeTableValues(left, right, direction) {
  const dir = direction === "desc" ? -1 : 1;
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * dir;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base"
  }) * dir;
}

function useHomeTableSort(items, resolveValue) {
  const [sort, setSort] = useState({
    key: null,
    direction: "asc"
  });
  const toggleSort = useCallback(columnKey => {
    setSort(prev => prev.key === columnKey ? {
      key: columnKey,
      direction: prev.direction === "asc" ? "desc" : "asc"
    } : {
      key: columnKey,
      direction: "asc"
    });
  }, []);
  const sortedItems = useMemo(() => {
    if (!sort.key) return items;
    return [...items].sort((a, b) => compareHomeTableValues(resolveValue(a, sort.key), resolveValue(b, sort.key), sort.direction));
  }, [items, resolveValue, sort.direction, sort.key]);
  return {
    sortedItems,
    sort,
    toggleSort
  };
}

function useHomeListPagination(items, pageSize = HOME_LIST_LIMIT, resetKey = "") {
  const [page, setPage] = useState(1);
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(pageSize) || HOME_LIST_LIMIT);
  useEffect(() => {
    setPage(1);
  }, [list.length, resetKey, size]);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paginatedItems = useMemo(() => list.slice((currentPage - 1) * size, currentPage * size), [list, currentPage, size]);
  return {
    page: currentPage,
    setPage,
    totalPages,
    paginatedItems,
    showPager: list.length > size
  };
}

function useHomeFitPageSize(wrapRef, itemCount = 0) {
  const [pageSize, setPageSize] = useState(HOME_LIST_LIMIT);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      const wrapH = el.clientHeight;
      if (wrapH < 48) return;
      const head = el.querySelector("thead");
      const headH = head?.getBoundingClientRect().height || 34;
      const availableWithoutPager = Math.max(0, wrapH - headH);
      let rows = Math.floor(availableWithoutPager / HOME_LIST_ROW_HEIGHT);
      if (itemCount > Math.max(rows, HOME_LIST_MIN_ROWS)) {
        rows = Math.floor(Math.max(0, wrapH - headH - HOME_LIST_PAGER_HEIGHT) / HOME_LIST_ROW_HEIGHT);
      }
      const next = Math.min(HOME_LIST_MAX_ROWS, Math.max(HOME_LIST_MIN_ROWS, rows || HOME_LIST_MIN_ROWS));
      setPageSize(prev => prev === next ? prev : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [itemCount, wrapRef]);
  return pageSize;
}

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
function truncateText(value, max = 72) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
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
  const showSupportTickets = canAccessSupport;
  const showSalesTickets = !isCommunity && canAccessSales;
  const showEvents = !isCommunity && canAccessPlanning;
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
        icon: "mdi:briefcase-edit-outline"
      });
    }
    if (showEvents) {
      tabs.push({
        id: "events",
        label: copy.mobileTabs.events,
        icon: "mdi:calendar-month-outline"
      });
    }
    return tabs;
  }, [copy.mobileTabs, showEvents, showSalesTickets, showSupportTickets]);
  const [mobileSection, setMobileSection] = useState("support");
  useEffect(() => {
    if (!mobileTabs.some(tab => tab.id === mobileSection)) {
      setMobileSection(mobileTabs[0]?.id || "support");
    }
  }, [mobileSection, mobileTabs]);
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

                {showEvents ? <section className={`${styles.panel} ${styles.panelFull}`} data-guide="home-events" data-home-section="events">
                    <PanelHeader title={copy.panels.events.title} titleMeta={<span className={styles.panelTitleMeta}>{copy.panels.events.weekHint}</span>} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      {visibleEvents.length > 0 ? <HomeEventsList events={visibleEvents} locale={locale} copy={copy} formatEventRange={formatters.formatEventRange} onOpen={() => navigate("Planning")} /> : <div className={styles.emptyWrap}>
                          <MspEmptyState
                            className={styles.emptyStateFill}
                            icon="mdi:sleep"
                            title={copy.empty.eventsTitle}
                            text={copy.empty.eventsText}
                          />
                        </div>}
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

function HomeListPager({
  page,
  totalPages,
  onPageChange,
  locale,
  ariaLabel
}) {
  if (totalPages <= 1) return null;
  const common = getCommonCopy(locale);
  return <div className={styles.homeListPager} role="navigation" aria-label={ariaLabel}>
      <button type="button" className={styles.homeListPagerBtn} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label={common.prevPage}>
        <Icon icon="mdi:chevron-left" aria-hidden />
      </button>
      <span className={styles.homeListPagerInfo}>{formatPageInfo(locale, page, totalPages)}</span>
      <button type="button" className={styles.homeListPagerBtn} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label={common.nextPage}>
        <Icon icon="mdi:chevron-right" aria-hidden />
      </button>
    </div>;
}

function HomeSortableTh({
  columnKey,
  label,
  sort,
  onSort,
  sortByTemplate
}) {
  const isSorted = sort.key === columnKey;
  const handleActivate = () => onSort(columnKey);
  const handleKeyDown = event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };
  return <th scope="col" className={styles.homeSortableTh} onClick={handleActivate} onKeyDown={handleKeyDown} tabIndex={0} aria-sort={isSorted ? sort.direction === "asc" ? "ascending" : "descending" : "none"} title={interpolate(sortByTemplate, {
    column: label
  })}>
      <span className={styles.homeThContent}>
        {label}
        <Icon icon={isSorted ? sort.direction === "asc" ? "mdi:arrow-up" : "mdi:arrow-down" : "mdi:unfold-more-horizontal"} className={styles.homeSortIcon} aria-hidden />
      </span>
    </th>;
}

function HomeEventsList({
  events,
  locale,
  copy,
  formatEventRange,
  onOpen
}) {
  const wrapRef = useRef(null);
  const resolveEventSortValue = useCallback((event, key) => {
    switch (key) {
      case "when":
        return event.start ? new Date(event.start).getTime() : null;
      case "type":
        return getHomeEventTypeMeta(event.type, event.typeLabel, locale).label;
      case "title":
        return String(event.title || "").trim() || copy.noTitle;
      case "company":
        return event.clientName || copy.noClient;
      default:
        return null;
    }
  }, [copy.noClient, copy.noTitle, locale]);
  const {
    sortedItems,
    sort,
    toggleSort
  } = useHomeTableSort(events, resolveEventSortValue);
  const pageSize = useHomeFitPageSize(wrapRef, sortedItems.length);
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    showPager
  } = useHomeListPagination(sortedItems, pageSize, `${sort.key}:${sort.direction}`);
  const cols = copy.eventsTable;
  return <div className={styles.homeTableWrap} ref={wrapRef}>
      <div className={styles.homeTableScroll}>
        <table className={styles.homeTable}>
          <thead>
            <tr>
              <HomeSortableTh columnKey="when" label={cols.when} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
              <HomeSortableTh columnKey="type" label={cols.type} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
              <HomeSortableTh columnKey="title" label={cols.title} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
              <HomeSortableTh columnKey="company" label={cols.company} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map(event => {
            const typeMeta = getHomeEventTypeMeta(event.type, event.typeLabel, locale);
            const title = truncateText(String(event.title || "").trim() || copy.noTitle, 72);
            const fullTitle = String(event.title || "").trim() || copy.noTitle;
            const clientLabel = event.clientName || copy.noClient;
            const whenLabel = formatEventRange(event.start, event.end, {
              allDay: event.allDay
            });
            return <tr key={event.id} className={styles.homeTableRow} title={`${fullTitle} · ${clientLabel}`} onClick={onOpen} onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }} tabIndex={0} role="link">
                  <td className={styles.colDate}>{whenLabel}</td>
                  <td>
                    <span className={styles.typeBadge}>
                      <Icon icon={typeMeta.icon} aria-hidden />
                      {typeMeta.label}
                    </span>
                  </td>
                  <td className={styles.colMain}>{title}</td>
                  <td className={styles.colMuted}>{clientLabel}</td>
                </tr>;
          })}
          </tbody>
        </table>
      </div>
      {showPager ? <HomeListPager page={page} totalPages={totalPages} onPageChange={setPage} locale={locale} ariaLabel={copy.panels.events.pagerAria} /> : null}
    </div>;
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
