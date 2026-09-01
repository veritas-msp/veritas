import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from "react";
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
import { buildHomeTodoActions } from "./homeTodoActions";
import { getHomeEventTypeMeta } from "./homeEventTypes";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import styles from "./HomePage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { formatPageInfo, getCommonCopy } from "../../i18n/commonI18n";
import { interpolate } from "../../i18n/translate";

const HOME_LIST_LIMIT = 5;

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
  useEffect(() => {
    setPage(1);
  }, [list.length, resetKey]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paginatedItems = useMemo(() => list.slice((currentPage - 1) * pageSize, currentPage * pageSize), [list, currentPage, pageSize]);
  return {
    page: currentPage,
    setPage,
    totalPages,
    paginatedItems,
    showPager: list.length > pageSize
  };
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
  const todoActions = useMemo(() => buildHomeTodoActions(dashboard, {
    locale
  }), [dashboard, locale]);
  const homeGuideSteps = useMemo(() => getHomePageGuideSteps({
    isCommunity,
    locale
  }), [isCommunity, locale]);
  const canAccessSupport = access.Ticket !== false;
  const canAccessSales = access.TicketSales !== false;
  const canAccessPlanning = access.Planning !== false;
  const showSupportTickets = canAccessSupport;
  const showSalesTickets = !isCommunity && canAccessSales;
  const showEventsAndTodo = !isCommunity && canAccessPlanning;
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
    if (showEventsAndTodo) {
      tabs.push({
        id: "events",
        label: copy.mobileTabs.events,
        icon: "mdi:calendar-month-outline"
      });
      tabs.push({
        id: "todo",
        label: copy.mobileTabs.todo,
        icon: "mdi:checkbox-marked-outline"
      });
    }
    return tabs;
  }, [copy.mobileTabs, showEventsAndTodo, showSalesTickets, showSupportTickets]);
  const [mobileSection, setMobileSection] = useState("support");
  useEffect(() => {
    if (!mobileTabs.some(tab => tab.id === mobileSection)) {
      setMobileSection(mobileTabs[0]?.id || "support");
    }
  }, [mobileSection, mobileTabs]);
  return <div className={`${styles.pageWrapper} ${styles.pageAlive}`}>
      <div className={styles.pageLayout}>
        <div className={styles.dashboardMain}>
          <div data-guide="home-hero" className={styles.reveal} style={{ "--reveal-delay": "0ms" }}>
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

          {loading && !dashboard ? <HomeSkeleton showEventsAndTodo={showEventsAndTodo} /> : null}

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
                {showSupportTickets || showSalesTickets ? <div className={`${styles.ticketPanelsRow} ${showSupportTickets && showSalesTickets ? "" : styles.ticketPanelsRowSingle} ${styles.reveal}`.trim()} style={{ "--reveal-delay": "60ms" }} data-guide="home-tickets">
                  {showSupportTickets ? <section className={`${styles.panel} ${styles.panelFull}`} data-home-section="support">
                    <PanelHeader title={copy.panels.tickets.supportTitle} eyebrow />
                    <div className={styles.panelBody}>
                      <div className={styles.ticketKpiRow} role="list" aria-label={copy.panels.tickets.supportKpiAriaLabel}>
                        {supportTicketKpiCards.map((card, index) => <button key={card.key} type="button" role="listitem" className={`${styles.ticketKpiCard} ${styles[`kpiTone_${card.tone}`]} ${Number(card.value) > 0 ? styles.kpiLive : ""}`} style={{ "--kpi-delay": `${80 + index * 45}ms` }} onClick={() => navigate("Ticket", card.viewId ? { viewId: card.viewId } : null)} title={card.label} aria-label={`${card.label}: ${formatNumber(card.value)}`}>
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
                          {salesTicketKpiCards.map((card, index) => <button key={card.key} type="button" role="listitem" className={`${styles.ticketKpiCard} ${styles[`kpiTone_${card.tone}`]} ${Number(card.value) > 0 ? styles.kpiLive : ""}`} style={{ "--kpi-delay": `${120 + index * 45}ms` }} onClick={() => navigate("TicketSales", card.viewId ? { viewId: card.viewId } : null)} title={card.label} aria-label={`${card.label}: ${formatNumber(card.value)}`}>
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

                {showEventsAndTodo ? <section className={`${styles.panel} ${styles.panelFull} ${styles.reveal}`} style={{ "--reveal-delay": "140ms" }} data-guide="home-events" data-home-section="events">
                    <PanelHeader title={copy.panels.events.title} titleMeta={<span className={styles.panelTitleMeta}>{copy.panels.events.weekHint}</span>} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      {visibleEvents.length > 0 ? <HomeEventsList events={visibleEvents} locale={locale} copy={copy} formatEventRange={formatters.formatEventRange} onOpen={() => navigate("Planning")} /> : <EmptyState icon="mdi:calendar-blank-outline" text={copy.empty.events} />}
                    </div>
                  </section> : null}

                {showEventsAndTodo ? <section className={`${styles.panel} ${styles.panelFull} ${styles.reveal}`} style={{ "--reveal-delay": "200ms" }} data-guide="home-todo" data-home-section="todo">
                    <PanelHeader title={copy.panels.todo.title} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      <HomeTodoList actions={todoActions} copy={copy} locale={locale} onNavigate={navigate} />
                    </div>
                  </section> : null}
              </div>
            </> : null}
        </div>

        <div className={`${styles.newsAside} ${styles.reveal}`} style={{ "--reveal-delay": "100ms" }} data-guide="home-news">
          <HomeTechNewsColumn locale={locale} />
        </div>
      </div>

      <PageGuideTour open={pageGuideOpen} steps={homeGuideSteps} title={copy.guide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}

function HomeSkeleton({
  showEventsAndTodo
}) {
  return <div className={styles.skeleton} aria-hidden>
      <div className={styles.skeletonOps}>
        <div className={styles.skeletonPanel} />
        {showEventsAndTodo ? <>
            <div className={styles.skeletonPanel} />
            <div className={styles.skeletonPanel} />
          </> : null}
      </div>
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
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    showPager
  } = useHomeListPagination(sortedItems, HOME_LIST_LIMIT, `${sort.key}:${sort.direction}`);
  const cols = copy.eventsTable;
  return <div className={styles.homeTableWrap}>
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
      {showPager ? <HomeListPager page={page} totalPages={totalPages} onPageChange={setPage} locale={locale} ariaLabel={copy.panels.events.pagerAria} /> : null}
    </div>;
}

function HomeTodoList({
  actions,
  copy,
  locale,
  onNavigate
}) {
  const [expandedId, setExpandedId] = useState(null);
  const resolveTodoSortValue = useCallback((action, key) => {
    const toneOrder = {
      bad: 0,
      warn: 1
    };
    switch (key) {
      case "source":
        return action.sourceLabel || "";
      case "label":
        return `${toneOrder[action.tone] ?? 9}\u0000${action.label || ""}`;
      case "title":
        return action.title || "";
      case "detail":
        return action.meta || "";
      default:
        return null;
    }
  }, []);
  const {
    sortedItems,
    sort,
    toggleSort
  } = useHomeTableSort(actions, resolveTodoSortValue);
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    showPager
  } = useHomeListPagination(sortedItems, HOME_LIST_LIMIT, `${sort.key}:${sort.direction}`);
  useEffect(() => {
    setExpandedId(null);
  }, [page, sort.key, sort.direction]);
  if (!actions.length) {
    return <EmptyState icon="mdi:check-circle-outline" text={copy.empty.todo} />;
  }
  const cols = copy.todoTable;
  const openAction = action => {
    if (!action?.navigateType) return;
    onNavigate(action.navigateType, action.navigateData || null);
  };
  return <div className={styles.homeTableWrap}>
      <table className={styles.homeTable}>
        <thead>
          <tr>
            <HomeSortableTh columnKey="source" label={cols.source} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
            <HomeSortableTh columnKey="label" label={cols.label} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
            <HomeSortableTh columnKey="title" label={cols.title} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
            <HomeSortableTh columnKey="detail" label={cols.detail} sort={sort} onSort={toggleSort} sortByTemplate={copy.tableSort.sortBy} />
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map(action => {
            const isBulk = Boolean(action.bulk && action.children?.length);
            const expanded = isBulk && expandedId === action.id;
            return <Fragment key={action.id}>
                <tr
                  className={`${styles.homeTableRow} ${styles[`homeTableRow_${action.tone}`]} ${isBulk ? styles.homeTableRowBulk : ""}`}
                  onClick={() => openAction(action)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openAction(action);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td>
                    <span className={styles.typeBadge}>
                      <Icon icon={action.sourceIcon} aria-hidden />
                      {action.sourceLabel}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.todoToneBadge} ${styles[`todoToneBadge_${action.tone}`]}`}>
                      {action.label}
                      {isBulk ? <span className={styles.todoCountBadge}>{action.count}</span> : null}
                    </span>
                  </td>
                  <td className={styles.colMain}>
                    <span className={styles.todoTitleRow}>
                      <span>{action.title}</span>
                      {isBulk ? <button
                        type="button"
                        className={styles.todoExpandBtn}
                        aria-expanded={expanded}
                        aria-label={expanded ? copy.todo.bulk.collapse : copy.todo.bulk.expand}
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedId(prev => prev === action.id ? null : action.id);
                        }}
                      >
                        <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
                      </button> : null}
                    </span>
                  </td>
                  <td className={styles.colMuted}>{action.meta || "—"}</td>
                </tr>
                {expanded ? action.children.map(child => <tr
                  key={child.id}
                  className={`${styles.homeTableRow} ${styles.homeTableRowChild}`}
                  onClick={() => openAction(child)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openAction(child);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                    <td />
                    <td />
                    <td className={styles.colMain}>{child.title}</td>
                    <td className={styles.colMuted}>{child.meta || "—"}</td>
                  </tr>) : null}
              </Fragment>;
          })}
        </tbody>
      </table>
      {showPager ? <HomeListPager page={page} totalPages={totalPages} onPageChange={setPage} locale={locale} ariaLabel={copy.panels.todo.pagerAria} /> : null}
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

function EmptyState({
  icon,
  text
}) {
  return <div className={styles.emptyState}>
      <Icon icon={icon} className={styles.emptyIcon} />
      <p>{text}</p>
    </div>;
}
