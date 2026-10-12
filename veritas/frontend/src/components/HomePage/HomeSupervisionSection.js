import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  fetchSupervisionAlertsActive,
  fetchSupervisionExclusions
} from "../../api/supervisionAlerts";
import { getLocaleTag } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { buildQueueItemsFromSupervisionAlerts } from "../EquipementPage/supervisionQueueUtils";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import homeStyles from "./HomePage.module.css";
import styles from "./HomeSupervisionSection.module.css";

const SIDEBAR_LIMIT = 7;
const TICKET_TABLE_LIMIT = 5;
const HOME_EVENTS_STRIP_DAYS = 7;

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return String(Math.round(Number(value)));
}

function formatTime(ms, localeTag) {
  if (!Number.isFinite(ms)) return "—";
  try {
    return new Date(ms).toLocaleTimeString(localeTag || undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

function isDeviceMaintenance(row) {
  if (!row || row.active === false) return false;
  return (
    String(row.scope || "").toLowerCase() === "device" &&
    String(row.kind || "maintenance").toLowerCase() === "maintenance"
  );
}

function countMaintenanceDevices(exclusions = []) {
  const ids = new Set();
  for (const row of Array.isArray(exclusions) ? exclusions : []) {
    if (!isDeviceMaintenance(row)) continue;
    const id = String(row?.equipmentId || row?.equipment_id || "").trim();
    if (id) ids.add(id);
  }
  return ids.size;
}

function deviceName(item) {
  return (
    item?.equipment?.name ||
    item?.alertState?.meta?.equipmentName ||
    item?.hostName ||
    item?.title ||
    "—"
  );
}

function alertDescription(item) {
  return (
    item?.subtitle ||
    item?.alertState?.meta?.serviceName ||
    item?.alertState?.meta?.pluginOutput ||
    item?.title ||
    "—"
  );
}

function severityBadgeClass(severity) {
  const s = String(severity || "").toLowerCase();
  if (s === "critical") return styles.badgeCritical;
  if (s === "warning") return styles.badgeWarning;
  return styles.badgeInfo;
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
  return [
    {
      key: "total",
      value: kpis.total,
      label: labels.kpiTotal,
      icon: "mdi:ticket-account",
      tone: "purple",
      viewId: "__builtin_mine__"
    },
    {
      key: "inProgress",
      value: kpis.inProgress,
      label: labels.kpiInProgress,
      icon: "mdi:progress-clock",
      tone: "teal",
      viewId: "__builtin_in_progress__"
    },
    {
      key: "pending",
      value: kpis.pending,
      label: labels.kpiPending,
      icon: "mdi:timer-sand",
      tone: "amber",
      viewId: "__builtin_pending__"
    },
    {
      key: "toValidate",
      value: kpis.toValidate,
      label: labels.kpiToValidate,
      icon: "mdi:clipboard-check-outline",
      tone: "orange",
      viewId: "__builtin_to_validate__"
    }
  ];
}

function Card({ title, icon, actionLabel, onAction, children, className = "" }) {
  return (
    <article className={`${styles.card} ${className}`.trim()}>
      <header className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          {icon ? <Icon icon={icon} className={styles.cardTitleIcon} aria-hidden /> : null}
          <span>{title}</span>
        </h3>
        {actionLabel && onAction ? (
          <button type="button" className={styles.seeAll} onClick={onAction}>
            {actionLabel}
            <Icon icon="mdi:arrow-right" aria-hidden />
          </button>
        ) : null}
      </header>
      <div className={styles.cardBody}>{children}</div>
    </article>
  );
}

function KpiCard({ card, loading, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.kpiCard} ${styles[`kpiTone_${card.tone}`] || ""}`}
      onClick={onClick}
      title={card.label}
      aria-label={`${card.label}: ${formatNumber(card.value)}`}
    >
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon} aria-hidden>
          <Icon icon={card.icon} />
        </span>
        <Icon icon="mdi:chevron-right" className={styles.kpiChevron} aria-hidden />
      </div>
      <strong className={styles.kpiValue}>{loading ? "…" : formatNumber(card.value)}</strong>
      <span className={styles.kpiLabel}>{card.label}</span>
    </button>
  );
}

function PanelHeader({ title, titleMeta = null }) {
  return (
    <div className={homeStyles.panelHeader}>
      <div className={homeStyles.panelHeaderMain}>
        <div className={homeStyles.panelEyebrowRow}>
          <h2 className={homeStyles.panelEyebrow}>{title}</h2>
          {titleMeta}
        </div>
      </div>
    </div>
  );
}

function truncateText(value, max = 72) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatTicketDate(value, localeTag) {
  if (!value) return "—";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return "—";
  try {
    return new Date(ms).toLocaleString(localeTag || undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

function priorityTone(ticket) {
  if (ticket?.isMajorIncident) return "major";
  const p = String(ticket?.priority || "normal").toLowerCase();
  if (p === "urgent" || p === "high") return "high";
  if (p === "low") return "low";
  return "normal";
}

function priorityLabel(ticket, copy) {
  if (ticket?.isMajorIncident) return copy?.priorities?.majorIncident || "Incident majeur";
  const p = String(ticket?.priority || "normal").toLowerCase();
  if (p === "urgent") return copy?.priorities?.urgent || "Urgente";
  if (p === "high") return copy?.priorities?.high || "Haute";
  if (p === "low") return copy?.priorities?.low || "Basse";
  return copy?.priorities?.normal || "Normale";
}

function HomeTicketsTable({ tickets, localeTag, copy, onOpenTicket, family }) {
  const cols = copy?.ticketsTable || {};
  const emptyLabel = copy?.empty?.tickets || "Aucun ticket ne vous est assigné";
  const rows = Array.isArray(tickets) ? tickets : [];

  return (
    <div className={`${homeStyles.homeTableWrap} ${styles.ticketTableInPanel}`}>
      <div className={homeStyles.homeTableScroll}>
        <table className={homeStyles.homeTable}>
          <thead>
            <tr>
              <th scope="col">{cols.number || "N°"}</th>
              <th scope="col">{cols.priority || "Priorité"}</th>
              <th scope="col">{cols.description || "Descriptif"}</th>
              <th scope="col">{cols.company || "Entreprise"}</th>
              <th scope="col">{cols.modified || "Modifié"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(ticket => {
              const title = truncateText(ticket.title || copy?.noTitle || "Sans titre", 64);
              const fullTitle = String(ticket.title || "").trim() || copy?.noTitle || "Sans titre";
              const client = ticket.clientName || copy?.noClient || "—";
              const tone = priorityTone(ticket);
              return (
                <tr
                  key={ticket.id}
                  className={`${homeStyles.homeTableRow} ${
                    ticket.isMajorIncident || tone === "high" ? homeStyles.homeTableRowAlert : ""
                  }`}
                  title={`${fullTitle} · ${client}`}
                  onClick={() => onOpenTicket?.(ticket, family)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenTicket?.(ticket, family);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td className={homeStyles.colNum}>
                    {ticket.ticketNumber ? `#${ticket.ticketNumber}` : `#${ticket.id}`}
                  </td>
                  <td>
                    <span className={`${homeStyles.priorityBadge} ${homeStyles[`priorityBadge_${tone}`] || ""}`}>
                      {priorityLabel(ticket, copy)}
                    </span>
                  </td>
                  <td className={homeStyles.colMain}>{title}</td>
                  <td className={homeStyles.colMuted}>{client}</td>
                  <td className={homeStyles.colDate}>{formatTicketDate(ticket.updatedAt, localeTag)}</td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
                  {emptyLabel}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HomeEventsWeekStrip({ events, locale, copy, onOpen }) {
  const labels = copy?.panels?.events || {};
  const days = useMemo(
    () => buildEventsWeekStrip(events, locale, HOME_EVENTS_STRIP_DAYS),
    [events, locale]
  );
  return (
    <div className={homeStyles.eventsStrip}>
      <div
        className={homeStyles.eventsStripTrack}
        role="list"
        aria-label={labels.stripAria || labels.title}
      >
        <span className={homeStyles.eventsStripLine} aria-hidden />
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
              className={`${homeStyles.eventsDayCell} ${day.isToday ? homeStyles.eventsDayToday : ""} ${
                day.count > 0 ? homeStyles.eventsDayHasEvents : ""
              }`}
              onClick={onOpen}
              aria-label={aria}
              title={aria}
            >
              <span className={homeStyles.eventsDayDate}>
                <span className={homeStyles.eventsDayWeekday}>{weekday}</span>
                <span className={homeStyles.eventsDayNum}>{day.dayNum}</span>
              </span>
              <span className={homeStyles.eventsDayCircle}>
                <span className={homeStyles.eventsDayCount}>{countLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomeSupervisionSection({
  copy,
  locale = "fr",
  onOpenCenter,
  onNavigate,
  assignedTicketStats = null,
  ticketSlaStats = null,
  recentTickets = [],
  upcomingEvents = [],
  showSupportTickets = true,
  showSalesTickets = true,
  showEvents = true,
  userName = ""
}) {
  const localeTag = getLocaleTag(locale);
  const labels = copy?.panels?.supervision || {};
  const ticketLabels = copy?.panels?.tickets || {};
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [maintenanceCount, setMaintenanceCount] = useState(0);

  const load = useCallback(async signal => {
    setLoading(true);
    try {
      const [active, excl] = await Promise.all([
        fetchSupervisionAlertsActive({ signal }).catch(() => []),
        fetchSupervisionExclusions({ signal, limit: 500 }).catch(() => [])
      ]);
      if (signal?.aborted) return;

      const nextQueue = buildQueueItemsFromSupervisionAlerts(active, { noName: "—" });
      const nextExclusions = Array.isArray(excl) ? excl : [];
      setQueue(nextQueue);
      setMaintenanceCount(countMaintenanceDevices(nextExclusions));
    } catch (err) {
      if (err?.name === "AbortError") return;
      setQueue([]);
      setMaintenanceCount(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = createTrackedAbortController("home-supervision");
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openItems = useMemo(
    () => queue.filter(item => !item?.muted && (item.workflowStatus || "open") === "open"),
    [queue]
  );

  const criticalCount = useMemo(
    () =>
      openItems.filter(item => String(item.severity || "").toLowerCase() === "critical").length,
    [openItems]
  );

  const latestAlerts = useMemo(
    () =>
      [...queue]
        .filter(item => !item?.muted)
        .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0))
        .slice(0, SIDEBAR_LIMIT),
    [queue]
  );

  const supportTicketKpiCards = useMemo(
    () => buildTicketKpiCards(assignedTicketStats?.support, ticketLabels),
    [assignedTicketStats?.support, ticketLabels]
  );
  const salesTicketKpiCards = useMemo(
    () => buildTicketKpiCards(assignedTicketStats?.sales, ticketLabels),
    [assignedTicketStats?.sales, ticketLabels]
  );

  const supportTickets = useMemo(
    () =>
      (Array.isArray(recentTickets) ? recentTickets : [])
        .filter(ticket => !isSalesTicket(ticket))
        .slice(0, TICKET_TABLE_LIMIT),
    [recentTickets]
  );
  const salesTickets = useMemo(
    () =>
      (Array.isArray(recentTickets) ? recentTickets : [])
        .filter(ticket => isSalesTicket(ticket))
        .slice(0, TICKET_TABLE_LIMIT),
    [recentTickets]
  );

  const openAssignedTickets = Number(assignedTicketStats?.support?.total) || 0;
  const slaBreached = Number(ticketSlaStats?.breached) || 0;
  const slaNear = Number(ticketSlaStats?.near) || 0;
  const ticketsLoading = ticketSlaStats == null && assignedTicketStats == null;

  const kpiCards = useMemo(
    () => [
      {
        key: "critical",
        value: criticalCount,
        label: labels.kpiCritical || "Alertes critiques",
        icon: "mdi:alert-octagon-outline",
        tone: "rose",
        onClick: "center",
        loading
      },
      {
        key: "maintenance",
        value: maintenanceCount,
        label: labels.kpiMaintenance || "Périphériques en maintenance",
        icon: "mdi:wrench-clock",
        tone: "violet",
        onClick: "center",
        loading
      },
      {
        key: "slaBreached",
        value: slaBreached,
        label: labels.kpiSlaBreached || "SLA dépassés",
        icon: "mdi:shield-alert-outline",
        tone: "red",
        onClick: "tickets",
        loading: ticketsLoading
      },
      {
        key: "slaNear",
        value: slaNear,
        label: labels.kpiSlaNear || "SLA proches",
        icon: "mdi:clock-alert-outline",
        tone: "amber",
        onClick: "tickets",
        loading: ticketsLoading
      },
      {
        key: "ticketsOpen",
        value: openAssignedTickets,
        label: labels.kpiTicketsOpen || "Tickets assignés",
        icon: "mdi:ticket-account",
        tone: "blue",
        onClick: "tickets",
        loading: ticketsLoading
      }
    ],
    [
      criticalCount,
      maintenanceCount,
      slaBreached,
      slaNear,
      openAssignedTickets,
      labels,
      loading,
      ticketsLoading
    ]
  );

  const openCenter = () => onOpenCenter?.();
  const openTickets = () => onNavigate?.("Ticket");
  const openTicket = (ticket, family = "support") => {
    if (ticket?.id && onNavigate) {
      onNavigate(family === "sales" ? "TicketSalesDetail" : "TicketDetail", {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        ticketFamily: family === "sales" ? "sales" : "support",
        fromPage: family === "sales" ? "TicketSales" : "Ticket"
      });
      return;
    }
    onNavigate?.(family === "sales" ? "TicketSales" : "Ticket");
  };
  const openAlert = item => {
    if (item?.equipment && onNavigate) onNavigate("EquipmentDetail", item.equipment);
    else openCenter();
  };

  const sevLabel = sev => {
    const s = String(sev || "").toLowerCase();
    if (s === "critical") return labels.severityCritical || "Critique";
    if (s === "warning") return labels.severityWarning || "Warning";
    return labels.severityInfo || "Info";
  };

  const seeAll = labels.seeAll || "Voir tout";
  const greeting = userName
    ? typeof copy?.heroGreeting === "function"
      ? copy.heroGreeting(userName)
      : interpolate(String(copy?.heroGreeting || "Bonjour, {name} 👋"), { name: userName })
    : copy?.heroTitle || "Tableau de bord";

  const showTicketPanels = showSupportTickets || showSalesTickets;

  return (
    <section className={styles.root} data-guide="home-supervision" data-home-section="supervision" aria-busy={loading}>
      <MspPageHero
        className={styles.hero}
        stackOnMobile
        guideId="home-hero"
        icon="mdi:view-dashboard-outline"
        brandMarkClassName={styles.heroBrand}
        title={greeting}
        subtitle={
          labels.heroSubtitle ||
          copy?.heroSubtitle ||
          "Tout ce qu'il vous faut, au même endroit."
        }
      />

      <div className={`${styles.kpiGrid} ${styles.kpiGridCompact}`} role="list" aria-label={labels.kpiAriaLabel || labels.title}>
        {kpiCards.map(card => (
          <KpiCard
            key={card.key}
            card={card}
            loading={card.loading}
            onClick={card.onClick === "tickets" ? openTickets : openCenter}
          />
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.mainCol}>
          {showTicketPanels ? (
            <div
              className={`${homeStyles.ticketPanelsRow} ${
                showSupportTickets && showSalesTickets ? "" : homeStyles.ticketPanelsRowSingle
              }`.trim()}
              data-guide="home-tickets"
            >
              {showSupportTickets ? (
                <section className={`${homeStyles.panel} ${homeStyles.panelFull}`} data-home-section="support">
                  <PanelHeader title={ticketLabels.supportTitle || "Mes tickets support"} />
                  <div className={`${homeStyles.panelBody} ${homeStyles.panelBodyFlush} ${styles.ticketPanelBody}`}>
                    <div
                      className={`${homeStyles.ticketKpiRow} ${styles.ticketPanelKpis}`}
                      role="list"
                      aria-label={ticketLabels.supportKpiAriaLabel}
                    >
                      {supportTicketKpiCards.map(card => (
                        <button
                          key={card.key}
                          type="button"
                          role="listitem"
                          className={`${homeStyles.ticketKpiCard} ${homeStyles[`kpiTone_${card.tone}`]} ${
                            Number(card.value) > 0 ? homeStyles.kpiLive : ""
                          }`}
                          onClick={() => onNavigate?.("Ticket", card.viewId ? { viewId: card.viewId } : null)}
                          title={card.label}
                          aria-label={`${card.label}: ${formatNumber(card.value)}`}
                        >
                          <span className={homeStyles.kpiIconWrap} aria-hidden>
                            <Icon icon={card.icon} />
                          </span>
                          <span className={homeStyles.kpiValue}>{formatNumber(card.value)}</span>
                          <span className={homeStyles.kpiLabel}>{card.label}</span>
                        </button>
                      ))}
                    </div>
                    <HomeTicketsTable
                      tickets={supportTickets}
                      localeTag={localeTag}
                      copy={copy}
                      family="support"
                      onOpenTicket={openTicket}
                    />
                  </div>
                </section>
              ) : null}

              {showSalesTickets ? (
                <section className={`${homeStyles.panel} ${homeStyles.panelFull}`} data-home-section="sales">
                  <PanelHeader title={ticketLabels.salesTitle || "Mes tickets services"} />
                  <div className={`${homeStyles.panelBody} ${homeStyles.panelBodyFlush} ${styles.ticketPanelBody}`}>
                    <div
                      className={`${homeStyles.ticketKpiRow} ${styles.ticketPanelKpis}`}
                      role="list"
                      aria-label={ticketLabels.salesKpiAriaLabel}
                    >
                      {salesTicketKpiCards.map(card => (
                        <button
                          key={card.key}
                          type="button"
                          role="listitem"
                          className={`${homeStyles.ticketKpiCard} ${homeStyles[`kpiTone_${card.tone}`]} ${
                            Number(card.value) > 0 ? homeStyles.kpiLive : ""
                          }`}
                          onClick={() =>
                            onNavigate?.("TicketSales", card.viewId ? { viewId: card.viewId } : null)
                          }
                          title={card.label}
                          aria-label={`${card.label}: ${formatNumber(card.value)}`}
                        >
                          <span className={homeStyles.kpiIconWrap} aria-hidden>
                            <Icon icon={card.icon} />
                          </span>
                          <span className={homeStyles.kpiValue}>{formatNumber(card.value)}</span>
                          <span className={homeStyles.kpiLabel}>{card.label}</span>
                        </button>
                      ))}
                    </div>
                    <HomeTicketsTable
                      tickets={salesTickets}
                      localeTag={localeTag}
                      copy={copy}
                      family="sales"
                      onOpenTicket={openTicket}
                    />
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {showEvents ? (
            <section
              className={`${homeStyles.panel} ${homeStyles.panelFull} ${homeStyles.eventsPanel}`}
              data-guide="home-events"
              data-home-section="events"
            >
              <PanelHeader
                title={copy?.panels?.events?.title || "Mes événements"}
                titleMeta={
                  <span className={homeStyles.panelTitleMeta}>
                    {copy?.panels?.events?.weekHint || "7 prochains jours"}
                  </span>
                }
              />
              <div className={`${homeStyles.panelBody} ${homeStyles.eventsPanelBody}`}>
                <HomeEventsWeekStrip
                  events={upcomingEvents}
                  locale={locale}
                  copy={copy}
                  onOpen={() => onNavigate?.("Planning")}
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside className={styles.sideCol}>
          <Card
            title={labels.latestTitle || "Alertes récentes"}
            icon="mdi:bell-ring-outline"
            actionLabel={seeAll}
            onAction={openCenter}
          >
            {latestAlerts.length === 0 ? (
              <p className={styles.emptyText}>{labels.emptyAlerts || "Aucune alerte récente"}</p>
            ) : (
              <ul className={styles.latestList}>
                {latestAlerts.map(item => (
                  <li key={item.id || item.queueItemId}>
                    <button type="button" className={styles.latestItem} onClick={() => openAlert(item)}>
                      <span className={`${styles.latestIcon} ${severityBadgeClass(item.severity)}`} aria-hidden>
                        <Icon
                          icon={
                            String(item.severity).toLowerCase() === "critical"
                              ? "mdi:alert-octagon"
                              : String(item.severity).toLowerCase() === "warning"
                                ? "mdi:alert"
                                : "mdi:information-outline"
                          }
                        />
                      </span>
                      <span className={styles.latestCopy}>
                        <strong>{deviceName(item)}</strong>
                        <span>{alertDescription(item)}</span>
                      </span>
                      <span className={styles.latestMeta}>
                        <time>{formatTime(item.sortTime, localeTag)}</time>
                        <span className={`${styles.pill} ${severityBadgeClass(item.severity)}`}>
                          {sevLabel(item.severity)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </section>
  );
}
