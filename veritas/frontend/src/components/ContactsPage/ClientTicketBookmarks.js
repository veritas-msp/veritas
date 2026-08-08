import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaPlus } from "react-icons/fa";
import SmartTooltip from "../SmartTooltip";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy, interpolate } from "./contactDetailI18n";
import { getTicketPageCopy } from "../TicketPage/ticketPageI18n";
import { getTicketSlaDisplay } from "../../utils/ticketSlaUtils";
import { getTicketTypeIcon } from "../../utils/ticketReminderEvent";
import styles from "../EnterprisesPage/UpcomingEventBookmarks.module.css";
import localStyles from "./ClientTicketBookmarks.module.css";
import HeroBookmarkCollapseHeader from "../EnterprisesPage/HeroBookmarkCollapseHeader";
import { useHeroBookmarkCollapse } from "../../hooks/useHeroBookmarkCollapse";
const TICKET_TITLE_MAX_LENGTH = 42;
const TICKET_TYPE_HINTS = {
  incident: "#9aa8bc",
  demande: "#8faed0",
  request: "#8faed0",
  probleme: "#b5a48a",
  changement: "#a8a0c4"
};
function getTicketBookmarkTheme(ticket, isClosed) {
  const ticketTypeKey = normalizeTicketType(ticket?.type);
  const typeHint = TICKET_TYPE_HINTS[ticketTypeKey] || "#94a3b8";
  const isMajor = Boolean(ticket?.is_major_incident);
  if (isClosed) {
    return {
      ribbon: isMajor ? "#7f6a6a" : "#64748b",
      typeHint: isMajor ? "#d97777" : typeHint
    };
  }
  if (isMajor) {
    return {
      ribbon: "#c53030",
      typeHint: "#ef4444"
    };
  }
  const isUrgent = ticket?.priority === "urgent";
  return {
    ribbon: isUrgent ? "#8b7355" : "#5b6d86",
    typeHint
  };
}
function normalizeTicketStatus(status) {
  return status === "open" ? "new" : status;
}
function normalizeTicketType(type) {
  const key = String(type || "").trim().toLowerCase();
  return key === "request" ? "demande" : key;
}
function truncateTicketTitle(title, maxLength = TICKET_TITLE_MAX_LENGTH) {
  const clean = String(title || "").trim();
  if (!clean) return {
    display: "",
    full: "",
    truncated: false
  };
  if (clean.length <= maxLength) {
    return {
      display: clean,
      full: clean,
      truncated: false
    };
  }
  return {
    display: `${clean.slice(0, maxLength).trimEnd()}…`,
    full: clean,
    truncated: true
  };
}
function getTicketCategoryLabel(ticket, bookmarksCopy) {
  const raw = String(ticket?.category || ticket?.category_name || "").trim();
  return raw || bookmarksCopy.noCategory;
}
function formatSatisfactionAverage(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Number.isInteger(num) ? String(num) : num.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}
function getTicketSatisfactionAverage(ticket) {
  const average = ticket?.satisfaction?.averageRating ?? ticket?.satisfaction?.rating;
  const num = Number(average);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}
function resolveTicketAssigneeName(ticket) {
  return ticket?.assigned_email || ticket?.assignedEmail || ticket?.assignee_name || ticket?.assigned_username || null;
}
function TicketBookmark({
  ticket,
  statusLabels,
  onClick,
  mode = "open",
  slaNow,
  clients = [],
  bookmarksCopy,
  ticketCopy,
  formatDate
}) {
  const isClosed = mode === "closed";
  const statusKey = normalizeTicketStatus(ticket?.status);
  const statusLabel = statusLabels[statusKey] || statusLabels[ticket?.status] || bookmarksCopy.ticketFallback;
  const typeLabel = ticketCopy.getTypeLabel(ticket?.type) || bookmarksCopy.defaultTicketType;
  const typeIcon = getTicketTypeIcon(ticket?.type);
  const {
    ribbon: ribbonAccent,
    typeHint
  } = getTicketBookmarkTheme(ticket, isClosed);
  const isMajorIncident = Boolean(ticket?.is_major_incident);
  const ticketNumber = ticket?.ticket_number || ticket?.id || "-";
  const sla = getTicketSlaDisplay(ticket, {
    clients,
    now: slaNow
  });
  const slaToneClass = localStyles[`slaLine_${sla.tone}`] || localStyles.slaLine_neutral;
  const ticketTitle = ticket.title || bookmarksCopy.untitled;
  const {
    display: titleDisplay,
    full: titleFull,
    truncated: titleTruncated
  } = truncateTicketTitle(ticketTitle);
  const categoryLabel = getTicketCategoryLabel(ticket, bookmarksCopy);
  const hasCategory = categoryLabel !== bookmarksCopy.noCategory;
  const satisfactionAverage = getTicketSatisfactionAverage(ticket);
  const satisfactionLabel = satisfactionAverage ? interpolate(bookmarksCopy.satisfactionRating, {
    rating: formatSatisfactionAverage(satisfactionAverage)
  }) : null;
  const priorityVisual = ticketCopy.getPriorityVisual(ticket?.priority, ticket?.is_major_incident);
  const channelMeta = ticketCopy.getChannelMeta(ticket?.channel);
  const assigneeName = resolveTicketAssigneeName(ticket);
  const assigneeLabel = assigneeName ? interpolate(bookmarksCopy.assignedAgent, {
    name: assigneeName
  }) : null;
  const createdLabel = ticket?.created_at ? interpolate(bookmarksCopy.createdAt, {
    date: formatDate(ticket.created_at)
  }) : null;
  const updatedLabel = ticket?.updated_at ? interpolate(bookmarksCopy.updatedAt, {
    date: formatDate(ticket.updated_at)
  }) : null;
  const showCreatedLabel = Boolean(createdLabel) && ticket?.created_at && ticket?.updated_at && new Date(ticket.created_at).getTime() !== new Date(ticket.updated_at).getTime();
  const expandedDetailItems = [priorityVisual?.label ? {
    icon: priorityVisual.icon,
    text: priorityVisual.label,
    key: "priority"
  } : null, channelMeta?.label && channelMeta.label !== "-" ? {
    icon: channelMeta.icon,
    text: channelMeta.label,
    key: "channel"
  } : null, hasCategory ? {
    icon: "mdi:tag-outline",
    text: categoryLabel,
    key: "category"
  } : null, assigneeLabel ? {
    icon: "mdi:account-hard-hat",
    text: assigneeLabel,
    key: "agent"
  } : null, sla.label && sla.label !== "-" ? {
    icon: "mdi:timer-sand",
    text: sla.label,
    key: "sla",
    toneClass: slaToneClass
  } : null, updatedLabel ? {
    icon: "mdi:update",
    text: updatedLabel,
    key: "updated"
  } : null, showCreatedLabel ? {
    icon: "mdi:calendar-plus",
    text: createdLabel,
    key: "created"
  } : null].filter(Boolean).slice(0, 3);
  const titleNode = <span className={localStyles.ticketBookmarkTitle} title={titleTruncated ? undefined : titleFull}>
      {titleDisplay}
    </span>;
  return <button type="button" className={`${styles.bookmark} ${localStyles.ticketBookmark} ${isClosed ? styles.bookmarkPast : ""} ${isMajorIncident && !isClosed ? localStyles.ticketBookmarkMajor : ""}`} style={{
    "--bookmark-accent": ribbonAccent,
    "--bookmark-type-accent": typeHint
  }} onClick={() => onClick?.(ticket)} onAuxClick={e => {
    if (e.button === 1) {
      e.preventDefault();
      onClick?.(ticket, true);
    }
  }} aria-label={interpolate(bookmarksCopy.ticketAria, {
    number: String(ticketNumber),
    title: ticketTitle,
    category: categoryLabel,
    sla: sla.label || "-",
    satisfaction: satisfactionLabel || bookmarksCopy.satisfactionNone
  })}>
      <span className={localStyles.ticketBookmarkStack}>
        <span className={localStyles.ticketBookmarkCompact} aria-hidden>
          <span className={`${styles.bookmarkRibbon} ${localStyles.ticketBookmarkCompactRibbon}`}>
            <span className={`${styles.bookmarkDay} ${localStyles.ticketBookmarkCompactDay}`}>#{ticketNumber}</span>
          </span>
          <span className={localStyles.ticketBookmarkCompactBody}>
            <span className={localStyles.ticketBookmarkCompactStatus}>{statusLabel}</span>
            <span className={localStyles.ticketBookmarkCompactTypeSlot} title={typeLabel}>
              <Icon icon={typeIcon} className={localStyles.ticketBookmarkCompactTypeIcon} aria-hidden />
            </span>
            <span className={localStyles.ticketBookmarkCompactSlaSlot} aria-hidden>
              {satisfactionAverage ? <span className={localStyles.ticketBookmarkCompactRating}>
                  <Icon icon="mdi:star" aria-hidden />
                </span> : sla.label && sla.label !== "-" ? <span className={`${localStyles.ticketBookmarkCompactSla} ${slaToneClass}`}>{sla.label}</span> : null}
            </span>
          </span>
        </span>

        <span className={localStyles.ticketBookmarkExpanded}>
          <span className={localStyles.ticketBookmarkTop}>
            <span className={localStyles.ticketBookmarkTopMain}>
              <span className={`${styles.bookmarkRibbon} ${localStyles.ticketBookmarkRibbonExpanded}`} aria-hidden>
                <span className={`${styles.bookmarkDay} ${localStyles.ticketBookmarkRibbonDayExpanded}`}>
                  #{ticketNumber}
                </span>
              </span>
              <span className={localStyles.ticketBookmarkStatus}>{statusLabel}</span>
            </span>
            {satisfactionAverage ? <span className={localStyles.satisfactionLine} title={satisfactionLabel} aria-label={interpolate(bookmarksCopy.satisfactionAria, {
            rating: formatSatisfactionAverage(satisfactionAverage)
          })}>
                <Icon icon="mdi:star" className={localStyles.satisfactionStar} aria-hidden />
                <span>{formatSatisfactionAverage(satisfactionAverage)}</span>
              </span> : null}
          </span>
          {titleTruncated ? <SmartTooltip content={titleFull} className={localStyles.ticketBookmarkTitleWrap}>
              {titleNode}
            </SmartTooltip> : <span className={localStyles.ticketBookmarkTitleWrap}>{titleNode}</span>}
          <span className={localStyles.ticketBookmarkDetails}>
            {expandedDetailItems.map(item => <span key={item.key} className={localStyles.ticketBookmarkDetailRow}>
                <Icon icon={item.icon} className={localStyles.ticketBookmarkDetailIcon} aria-hidden />
                <span className={`${localStyles.ticketBookmarkDetailText} ${item.toneClass || ""}`.trim()}>
                  {item.text}
                </span>
              </span>)}
          </span>
          <span className={localStyles.ticketBookmarkFoot}>
            <span className={localStyles.ticketBookmarkType} title={typeLabel}>
              <Icon icon={typeIcon} className={localStyles.ticketBookmarkTypeIcon} aria-hidden />
              <span>{typeLabel}</span>
            </span>
          </span>
        </span>
      </span>
    </button>;
}
function BookmarkSkeleton() {
  return <div className={`${styles.bookmarkSkeleton} ${localStyles.ticketBookmarkSkeleton}`} aria-hidden>
      <div className={styles.bookmarkSkeletonRibbon} />
      <div className={styles.bookmarkSkeletonLine} />
      <div className={`${styles.bookmarkSkeletonLine} ${styles.bookmarkSkeletonLineShort}`} />
    </div>;
}
function SectionLabel({
  icon,
  title,
  count,
  variant = "open"
}) {
  return <div className={`${styles.sectionLabel} ${variant === "closed" ? styles.sectionLabelRecent : ""}`} aria-hidden>
      <Icon icon={icon} className={styles.sectionLabelIcon} />
      <span className={styles.sectionLabelTitle}>{title}</span>
      {count != null && <span className={styles.sectionLabelCount}>{count}</span>}
    </div>;
}
export default function ClientTicketBookmarks({
  openTickets = [],
  closedTickets = [],
  loading = false,
  statusLabels = {},
  onTicketClick,
  onCreateTicket,
  onOpenTicketList,
  canCreate = true,
  clients = [],
  inPageHero = false
}) {
  const locale = useAppLocale();
  const {
    formatDate
  } = useAppFormatters();
  const bookmarksCopy = useMemo(() => getContactDetailCopy(locale).bookmarks, [locale]);
  const ticketCopy = useMemo(() => getTicketPageCopy(locale), [locale]);
  const open = Array.isArray(openTickets) ? openTickets : [];
  const closed = Array.isArray(closedTickets) ? closedTickets : [];
  const trackRef = useRef(null);
  const [fade, setFade] = useState({
    left: false,
    right: false
  });
  const [slaNow, setSlaNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const updateFade = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const {
      scrollLeft,
      scrollWidth,
      clientWidth
    } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setFade({
      left: overflow && scrollLeft > 4,
      right: overflow && scrollLeft + clientWidth < scrollWidth - 4
    });
  }, []);
  useEffect(() => {
    updateFade();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateFade, {
      passive: true
    });
    const observer = new ResizeObserver(updateFade);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFade);
      observer.disconnect();
    };
  }, [updateFade, loading, open.length, closed.length]);
  const isEmpty = !loading && open.length === 0 && closed.length === 0;
  const {
    collapsed,
    toggle
  } = useHeroBookmarkCollapse("veritas.heroBookmarks.contactTickets.collapsed");
  const panelSummary = useMemo(() => {
    if (loading) return bookmarksCopy.summaryLoading;
    if (isEmpty) return bookmarksCopy.summaryEmpty;
    return interpolate(bookmarksCopy.summaryCounts, {
      open: String(open.length),
      closed: String(closed.length)
    });
  }, [loading, isEmpty, open.length, closed.length, bookmarksCopy]);
  const bookmarkProps = {
    statusLabels,
    slaNow,
    clients,
    bookmarksCopy,
    ticketCopy,
    formatDate,
    onClick: onTicketClick
  };
  const bar = <div className={[inPageHero ? styles.barInPageHero : styles.bar, inPageHero ? styles.barInPageHeroShell : ""].filter(Boolean).join(" ")} aria-label={bookmarksCopy.ariaLabel}>
      <div className={styles.barInner}>
        <div className={[styles.trackWrap, fade.left ? styles.trackFadeLeft : "", fade.right ? styles.trackFadeRight : ""].filter(Boolean).join(" ")}>
          <div className={`${styles.track} ${localStyles.ticketBookmarksTrack}`} ref={trackRef}>
            {loading ? <>
                <SectionLabel icon="mdi:ticket-outline" title={bookmarksCopy.open} />
                <BookmarkSkeleton />
                <BookmarkSkeleton />
                <div className={styles.sectionDivider} />
                <SectionLabel icon="mdi:archive-outline" title={bookmarksCopy.closed} variant="closed" />
                <BookmarkSkeleton />
              </> : isEmpty ? <div className={styles.empty}>
                <Icon icon="mdi:ticket-outline" aria-hidden />
                <span>{bookmarksCopy.empty}</span>
              </div> : <>
                <SectionLabel icon="mdi:ticket-outline" title={bookmarksCopy.open} count={open.length} />
                {open.length === 0 ? <span className={styles.sectionEmptyHint}>{bookmarksCopy.noOpen}</span> : open.map(ticket => <TicketBookmark key={`open-${ticket.id}`} ticket={ticket} mode="open" {...bookmarkProps} />)}

                <div className={styles.sectionDivider} aria-hidden />

                <SectionLabel icon="mdi:archive-outline" title={bookmarksCopy.closed} count={closed.length} variant="closed" />
                {closed.length === 0 ? <span className={styles.sectionEmptyHint}>{bookmarksCopy.noClosed}</span> : closed.map(ticket => <TicketBookmark key={`closed-${ticket.id}`} ticket={ticket} mode="closed" {...bookmarkProps} />)}
              </>}
          </div>
        </div>

        <div className={styles.barActions}>
          <SmartTooltip content={bookmarksCopy.viewAll}>
            <button type="button" className={styles.barActionBtn} onClick={onOpenTicketList} aria-label={bookmarksCopy.viewAll}>
              <Icon icon="mingcute:ticket-fill" aria-hidden />
            </button>
          </SmartTooltip>
          <SmartTooltip content={canCreate ? bookmarksCopy.createTicket : bookmarksCopy.createTicketNeedEnterprise}>
            <button type="button" className={`${styles.barActionBtn} ${styles.barActionBtnPrimary}`} onClick={onCreateTicket} disabled={!canCreate} aria-label={bookmarksCopy.createTicket}>
              <FaPlus aria-hidden />
            </button>
          </SmartTooltip>
        </div>
      </div>
    </div>;
  if (!inPageHero) {
    return bar;
  }
  return <div className={[styles.heroBookmarkShell, styles.heroBookmarkShellInPageHero, collapsed ? styles.heroBookmarkShellCollapsed : ""].filter(Boolean).join(" ")} data-bookmarks-collapsed={collapsed ? "true" : "false"}>
      <HeroBookmarkCollapseHeader collapsed={collapsed} onToggle={toggle} icon="mdi:ticket-outline" title={bookmarksCopy.panelTitle} summary={panelSummary} expandAria={bookmarksCopy.expandPanelAria} collapseAria={bookmarksCopy.collapsePanelAria} />
      <div className={styles.barCollapsePanel} aria-hidden={collapsed}>
        {bar}
      </div>
    </div>;
}
