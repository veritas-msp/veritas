import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from "react";
import { Icon } from "@iconify/react";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useProfileAccess } from "../../hooks/useProfileAccess";
import { fetchHomeDashboard } from "../../api/stats";
import HomeTechNewsColumn from "./HomeTechNewsColumn";
import { getHomePageCopy } from "./homePageI18n";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getHomePageGuideSteps } from "../PageGuide/homePageGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { buildHomeTodoActions } from "./homeTodoActions";
import { getHomeEventTypeMeta } from "./homeEventTypes";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
import styles from "./HomePage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";

const HOME_LIST_LIMIT = 5;

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
    key: "new",
    value: kpis.new,
    label: labels.kpiNew,
    icon: "mdi:ticket-confirmation-outline",
    tone: "blue",
    viewId: "__builtin_new__"
  }, {
    key: "pending",
    value: kpis.pending,
    label: labels.kpiPending,
    icon: "mdi:timer-sand",
    tone: "amber",
    viewId: "__builtin_pending__"
  }, {
    key: "inProgress",
    value: kpis.inProgress,
    label: labels.kpiInProgress,
    icon: "mdi:progress-clock",
    tone: "teal",
    viewId: "__builtin_in_progress__"
  }, {
    key: "toValidate",
    value: kpis.toValidate,
    label: labels.kpiToValidate,
    icon: "mdi:clipboard-check-outline",
    tone: "orange",
    viewId: "__builtin_to_validate__"
  }, {
    key: "total",
    value: kpis.total,
    label: labels.kpiTotal,
    icon: "mdi:ticket-account",
    tone: "purple",
    viewId: "__builtin_mine__"
  }];
}

export default function HomePage({
  onNavigate,
  isCommunity = false
}) {
  const {
    user
  } = useAuthContext();
  const { can } = usePermissions();
  const access = useProfileAccess(user?.profile);
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const abortRef = useRef(null);
  const userName = useMemo(() => {
    const pseudo = String(user?.username || "").trim();
    if (pseudo) return pseudo;
    if (!user?.email) return "";
    const local = user.email.split("@")[0];
    return formatDisplayNameFromEmailLocal(local);
  }, [user]);
  const todayLabel = useMemo(() => formatters.formatLongDate(new Date()), [formatters]);
  const copy = useMemo(() => getHomePageCopy(locale), [locale]);
  const loadDashboard = useCallback((options = {}) => {
    const {
      soft = false
    } = options;
    if (abortRef.current) abortRef.current.abort();
    const controller = createTrackedAbortController();
    abortRef.current = controller;
    if (soft) {
      setRefreshing(true);
    } else {
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
      setRefreshing(false);
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
    locale,
    limit: HOME_LIST_LIMIT
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
  const canCreateSupport = can("home.create_support") && canAccessSupport;
  const canCreateSales = can("home.create_sales") && canAccessSales && !isCommunity;
  const canCreateEvent = can("home.create_event") && showEventsAndTodo;
  const orgName = dashboard?.organizationName || "Veritas";

  return <div className={`${styles.pageWrapper} ${styles.pageAlive}`}>
      <div className={styles.pageLayout}>
        <div className={styles.dashboardMain}>
          <div data-guide="home-hero" className={styles.reveal} style={{ "--reveal-delay": "0ms" }}>
            <MspPageHero className={styles.homeHero} eyebrow={orgName} title={userName ? copy.heroGreeting(userName) : copy.heroTitle} subtitle={copy.heroSubtitle} icon="mdi:view-dashboard-outline" actions={<div className={styles.heroAside}>
                  <div className={styles.heroMeta}>
                    <Icon icon="mdi:calendar-today" className={styles.heroMetaIcon} />
                    <span className={styles.heroDate}>{todayLabel}</span>
                  </div>
                  <button type="button" className={styles.refreshBtn} onClick={() => loadDashboard({
                soft: true
              })} disabled={loading || refreshing} title={copy.refresh} aria-label={copy.refresh}>
                    <Icon icon="mdi:refresh" className={refreshing ? styles.spinning : ""} aria-hidden />
                  </button>
                </div>} />
          </div>

          {loading && !dashboard ? <HomeSkeleton showEventsAndTodo={showEventsAndTodo} /> : null}

          {loadError ? <div className={styles.errorBanner} role="alert">
              <p className={styles.errorBannerText}>{loadError}</p>
              <button type="button" className={styles.errorRetry} onClick={() => loadDashboard()}>
                {copy.retry}
              </button>
            </div> : null}

          {dashboard ? <>
              <div className={styles.opsStack}>
                {showSupportTickets || showSalesTickets ? <div className={`${styles.ticketPanelsRow} ${showSupportTickets && showSalesTickets ? "" : styles.ticketPanelsRowSingle} ${styles.reveal}`.trim()} style={{ "--reveal-delay": "60ms" }} data-guide="home-tickets">
                  {showSupportTickets ? <section className={`${styles.panel} ${styles.panelFull}`}>
                    <PanelHeader title={copy.panels.tickets.supportTitle} actionLabel={copy.panels.tickets.supportAction} onAction={() => navigate("Ticket")} addLabel={canCreateSupport ? copy.panels.tickets.supportAdd : null} onAdd={canCreateSupport ? () => navigate("TicketCreate") : null} eyebrow />
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

                  {showSalesTickets ? <section className={`${styles.panel} ${styles.panelFull}`}>
                      <PanelHeader title={copy.panels.tickets.salesTitle} actionLabel={copy.panels.tickets.salesAction} onAction={() => navigate("TicketSales")} addLabel={canCreateSales ? copy.panels.tickets.salesAdd : null} onAdd={canCreateSales ? () => navigate("TicketSalesCreate") : null} eyebrow />
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

                {showEventsAndTodo ? <section className={`${styles.panel} ${styles.panelFull} ${styles.reveal}`} style={{ "--reveal-delay": "140ms" }} data-guide="home-events">
                    <PanelHeader title={copy.panels.events.title} titleMeta={<span className={styles.panelTitleMeta}>{copy.panels.events.weekHint}</span>} actionLabel={copy.panels.events.action} onAction={() => navigate("Planning")} addLabel={canCreateEvent ? copy.panels.events.add : null} onAdd={canCreateEvent ? () => setEventModalOpen(true) : null} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      {visibleEvents.length > 0 ? <HomeEventsList events={visibleEvents} locale={locale} copy={copy} formatEventRange={formatters.formatEventRange} onOpen={() => navigate("Planning")} /> : <EmptyState icon="mdi:calendar-blank-outline" text={copy.empty.events} />}
                    </div>
                  </section> : null}

                {showEventsAndTodo ? <section className={`${styles.panel} ${styles.panelFull} ${styles.reveal}`} style={{ "--reveal-delay": "200ms" }} data-guide="home-todo">
                    <PanelHeader title={copy.panels.todo.title} actionLabel={copy.panels.todo.action} onAction={() => navigate("Hardware")} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      <HomeTodoList actions={todoActions} copy={copy} onNavigate={navigate} />
                    </div>
                  </section> : null}
              </div>
            </> : null}
        </div>

        <div className={`${styles.newsAside} ${styles.reveal}`} style={{ "--reveal-delay": "100ms" }} data-guide="home-news">
          <HomeTechNewsColumn locale={locale} />
        </div>
      </div>

      {showEventsAndTodo ? <PlanningEventModalBridge open={eventModalOpen} editingEvent={null} onClose={() => setEventModalOpen(false)} onSaved={() => {
      setEventModalOpen(false);
      loadDashboard({
        soft: true
      });
    }} /> : null}

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

function HomeEventsList({
  events,
  locale,
  copy,
  formatEventRange,
  onOpen
}) {
  const cols = copy.eventsTable;
  return <div className={styles.homeTableWrap}>
      <table className={styles.homeTable}>
        <thead>
          <tr>
            <th scope="col">{cols.when}</th>
            <th scope="col">{cols.type}</th>
            <th scope="col">{cols.title}</th>
            <th scope="col">{cols.company}</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => {
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
    </div>;
}

function HomeTodoList({
  actions,
  copy,
  onNavigate
}) {
  const [expandedId, setExpandedId] = useState(null);
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
            <th scope="col">{cols.source}</th>
            <th scope="col">{cols.label}</th>
            <th scope="col">{cols.title}</th>
            <th scope="col">{cols.detail}</th>
          </tr>
        </thead>
        <tbody>
          {actions.map(action => {
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
    </div>;
}

function PanelHeader({
  icon,
  title,
  titleMeta = null,
  actionLabel,
  onAction,
  addLabel = null,
  onAdd = null,
  eyebrow = false,
  headerMeta = null
}) {
  const hasActions = Boolean(onAction || onAdd);
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
      {hasActions ? <div className={styles.panelActions}>
          {onAdd ? <button type="button" className={`${styles.panelIconBtn} ${styles.panelIconBtnPrimary}`} onClick={onAdd} title={addLabel || undefined} aria-label={addLabel || undefined}>
              <Icon icon="mdi:plus" aria-hidden />
            </button> : null}
          {onAction ? <button type="button" className={styles.panelIconBtn} onClick={onAction} title={actionLabel || undefined} aria-label={actionLabel || undefined}>
              <Icon icon="mdi:arrow-top-right" aria-hidden />
            </button> : null}
        </div> : null}
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
