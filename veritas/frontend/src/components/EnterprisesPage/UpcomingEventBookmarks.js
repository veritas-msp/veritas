import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaCalendarAlt, FaPlus } from "react-icons/fa";
import SmartTooltip from "../SmartTooltip";
import ProFeatureLock from "../Misc/ProFeature/ProFeatureLock";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { notifyProFeature } from "../Misc/ProFeature/proFeatureUtils";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { parseEventDescription } from "../PlanningPage/planningEventFormShared";
import { getPlanningEventTypeIcon } from "../PlanningPage/planningEventTypes";
import styles from "./UpcomingEventBookmarks.module.css";
import cardStyles from "./EnterpriseEventBookmarks.module.css";
import HeroBookmarkCollapseHeader from "./HeroBookmarkCollapseHeader";
import { useHeroBookmarkCollapse } from "../../hooks/useHeroBookmarkCollapse";
const LOCALE_BCP47 = {
  fr: "en-US",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const DEFAULT_EVENT_BOOKMARK_LABELS = {
  barAria: "Recent and upcoming events",
  sectionRecent: "Recent",
  sectionUpcoming: "Upcoming",
  noneRecent30Days: "None in the last 30 days",
  noneUpcoming: "Nothing planned",
  empty: "No recent or planned events",
  today: "Today",
  tomorrow: "Tomorrow",
  daysAgo: "{count} days ago",
  untitledEvent: "Untitled",
  defaultEventType: "Event",
  planningPanelTitle: "Schedule",
  openPlanning: "View schedule",
  openPlanningAria: "View schedule",
  openPlanningPro: "Schedule · Veritas Pro",
  openPlanningProTooltip: "Schedule · available with Veritas Pro",
  createEvent: "Create event",
  createEventAria: "Create event",
  createEventPro: "Create event · Veritas Pro",
  createEventProTooltip: "Create event · available with Veritas Pro",
  formatEventAria: "{title}, {when}, {type}",
  assignedAgent: "Agent: {name}",
  linkedTicket: "Ticket {number}",
  durationDays: "{count} days",
  durationOneDay: "1 day",
  panelTitle: "Schedule",
  collapsePanelAria: "Hide schedule",
  expandPanelAria: "Show schedule",
  summaryCounts: "{recent} recent · {upcoming} upcoming",
  summaryLoading: "Loading…",
  summaryEmpty: "No events",
  summaryProLocked: "Veritas Pro"
};
const EVENT_TYPE_ACCENTS = {
  intervention: "#e11d48",
  presentation: "#7c3aed",
  maintenance: "#d97706",
  maintenance_preventive: "#ca8a04",
  mise_a_jour: "#2563eb",
  integration_monitoring: "#0891b2",
  other: "#64748b"
};
function getLocaleTag(locale) {
  return LOCALE_BCP47[locale] || LOCALE_BCP47.fr;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function getRelativeLabel(startDate, locale, labels) {
  const today = startOfDay(new Date());
  const target = startOfDay(startDate);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.tomorrow;
  if (diffDays > 1 && diffDays < 7) {
    return startDate.toLocaleDateString(getLocaleTag(locale), {
      weekday: "long"
    });
  }
  return null;
}
function getPastRelativeLabel(endDate, locale, labels) {
  const today = startOfDay(new Date());
  const target = startOfDay(endDate);
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays === 0) return labels.today;
  if (diffDays > 1 && diffDays < 7) {
    return interpolate(labels.daysAgo, {
      count: String(diffDays)
    });
  }
  return null;
}
function formatBookmarkRibbon(start, locale) {
  const d = new Date(start);
  const localeTag = getLocaleTag(locale);
  if (Number.isNaN(d.getTime())) {
    return {
      day: "-",
      month: "-",
      year: ""
    };
  }
  return {
    day: d.toLocaleDateString(localeTag, {
      day: "2-digit"
    }),
    month: d.toLocaleDateString(localeTag, {
      month: "short"
    }).replace(".", "").toUpperCase(),
    year: d.getFullYear() !== new Date().getFullYear() ? String(d.getFullYear()) : ""
  };
}
function getEventEndValue(event) {
  return event?.event_end ?? event?.["end"] ?? event?.end ?? null;
}
function getEventStartValue(event) {
  return event?.event_start ?? event?.["start"] ?? event?.start ?? null;
}
function formatEventTimeLine(start, end, locale) {
  const localeTag = getLocaleTag(locale);
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime())) return "";
  const timeOpts = {
    hour: "2-digit",
    minute: "2-digit"
  };
  const sameDay = !Number.isNaN(e.getTime()) && s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${s.toLocaleTimeString(localeTag, timeOpts)} – ${e.toLocaleTimeString(localeTag, timeOpts)}`;
  }
  const dateFmt = {
    day: "2-digit",
    month: "2-digit"
  };
  return `${s.toLocaleDateString(localeTag, dateFmt)} → ${e.toLocaleDateString(localeTag, dateFmt)}`;
}
function formatExpandedDateRange(startRaw, endRaw, locale) {
  const localeTag = getLocaleTag(locale);
  const s = new Date(startRaw);
  const e = new Date(endRaw);
  if (Number.isNaN(s.getTime())) return "";
  const withWeekday = {
    weekday: "short",
    day: "2-digit",
    month: "short"
  };
  if (Number.isNaN(e.getTime()) || s.toDateString() === e.toDateString()) {
    const yearSuffix = s.getFullYear() !== new Date().getFullYear() ? ` ${s.getFullYear()}` : "";
    return `${s.toLocaleDateString(localeTag, withWeekday)}${yearSuffix}`;
  }
  const startFmt = {
    day: "2-digit",
    month: "short"
  };
  const endFmt = s.getFullYear() === e.getFullYear() ? {
    day: "2-digit",
    month: "short"
  } : {
    day: "2-digit",
    month: "short",
    year: "numeric"
  };
  return `${s.toLocaleDateString(localeTag, startFmt)} → ${e.toLocaleDateString(localeTag, endFmt)}`;
}
function getEventDurationLabel(startRaw, endRaw, labels) {
  const s = startOfDay(new Date(startRaw));
  const e = startOfDay(new Date(endRaw));
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const diffDays = Math.round((e - s) / 86400000) + 1;
  if (diffDays <= 1) return null;
  if (diffDays === 1) return labels.durationOneDay;
  return interpolate(labels.durationDays, {
    count: String(diffDays)
  });
}
function resolveEventAssigneeNames(event, users = []) {
  const parsed = parseEventDescription(event?.description);
  const ids = new Set();
  if (event?.assigned_user_id) ids.add(String(event.assigned_user_id));
  if (Array.isArray(parsed.meta?.assignedUserIds)) {
    for (const id of parsed.meta.assignedUserIds) {
      if (id) ids.add(String(id));
    }
  }
  return [...ids].map(id => {
    const user = users.find(row => String(row.id) === id);
    return user?.ticket_helpdesk_display_name || user?.username || user?.name || user?.nom || user?.email || null;
  }).filter(Boolean);
}
function resolveLinkedTicketNumber(event) {
  const parsed = parseEventDescription(event?.description);
  const number = event?.ticket_number ?? event?.ticketNumber ?? parsed.meta?.ticketNumber ?? null;
  const clean = number != null ? String(number).trim() : "";
  return clean || null;
}
const DEFAULT_MENU_LABELS = {
  editEvent: "Edit event",
  goToPlanning: "Go to schedule"
};
const EVENT_TITLE_MAX_LENGTH = 42;
function truncateEventTitle(title, maxLength = EVENT_TITLE_MAX_LENGTH) {
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
function formatCompactEventPeriod(start, end, locale) {
  const localeTag = getLocaleTag(locale);
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime())) return null;
  const dateFmt = {
    day: "2-digit",
    month: "2-digit"
  };
  const timeOpts = {
    hour: "2-digit",
    minute: "2-digit"
  };
  const sameDay = !Number.isNaN(e.getTime()) && s.toDateString() === e.toDateString();
  if (sameDay) {
    return {
      kind: "sameDay",
      label: `${s.toLocaleTimeString(localeTag, timeOpts)} – ${e.toLocaleTimeString(localeTag, timeOpts)}`
    };
  }
  if (Number.isNaN(e.getTime())) {
    return {
      kind: "single",
      label: s.toLocaleDateString(localeTag, dateFmt)
    };
  }
  return {
    kind: "range",
    startLabel: s.toLocaleDateString(localeTag, dateFmt),
    endLabel: e.toLocaleDateString(localeTag, dateFmt)
  };
}
function EventActionMenu({
  anchorEl,
  event,
  labels,
  onEdit,
  onGoToPlanning,
  onClose
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0
  });
  useEffect(() => {
    if (!anchorEl) return undefined;
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 240;
      const viewportPadding = 8;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - viewportPadding) {
        left = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
      }
      setPosition({
        top: rect.bottom + 6,
        left
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorEl]);
  useEffect(() => {
    const handlePointerDown = e => {
      if (menuRef.current?.contains(e.target) || anchorEl?.contains(e.target)) return;
      onClose();
    };
    const handleKeyDown = e => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);
  if (!anchorEl || typeof document === "undefined") return null;
  return createPortal(<div ref={menuRef} className={styles.eventActionMenu} style={{
    top: position.top,
    left: position.left
  }} role="menu" aria-label={event?.title || labels.editEvent}>
      <button type="button" className={styles.eventActionMenuItem} role="menuitem" onClick={() => {
      onClose();
      onEdit?.(event);
    }}>
        <Icon icon="mdi:pencil-outline" aria-hidden />
        <span>{labels.editEvent}</span>
      </button>
      <button type="button" className={styles.eventActionMenuItem} role="menuitem" onClick={() => {
      onClose();
      onGoToPlanning?.(event);
    }}>
        <Icon icon="mdi:calendar-arrow-right" aria-hidden />
        <span>{labels.goToPlanning}</span>
      </button>
    </div>, document.body);
}
function EventBookmark({
  event,
  typeLabels,
  labels,
  locale,
  users = [],
  onClick,
  mode = "upcoming",
  menuOpen = false,
  buttonRef
}) {
  const isRecent = mode === "recent";
  const anchorDate = isRecent ? event.event_end ?? event["end"] ?? event.end ?? event.start : event.start;
  const startRaw = getEventStartValue(event);
  const endRaw = getEventEndValue(event);
  const start = new Date(startRaw);
  const ribbon = formatBookmarkRibbon(anchorDate, locale);
  const relative = isRecent ? getPastRelativeLabel(new Date(endRaw), locale, labels) : getRelativeLabel(start, locale, labels);
  const timeLine = formatEventTimeLine(startRaw, endRaw, locale);
  const typeLabel = typeLabels[event.type] || event.type || labels.defaultEventType;
  const typeIcon = getPlanningEventTypeIcon(event);
  const accent = EVENT_TYPE_ACCENTS[event.type] || EVENT_TYPE_ACCENTS.other;
  const eventTitle = event.title || labels.untitledEvent;
  const {
    display: titleDisplay,
    full: titleFull,
    truncated: titleTruncated
  } = truncateEventTitle(eventTitle);
  const compactPeriod = formatCompactEventPeriod(startRaw, endRaw, locale);
  const whenLabel = relative || `${ribbon.day} ${ribbon.month}`;
  const expandedDateRange = formatExpandedDateRange(startRaw, endRaw, locale);
  const durationLabel = getEventDurationLabel(startRaw, endRaw, labels);
  const assigneeNames = resolveEventAssigneeNames(event, users);
  const assigneeLabel = assigneeNames.length > 0 ? interpolate(labels.assignedAgent, {
    name: assigneeNames.join(", ")
  }) : null;
  const linkedTicketLabel = (() => {
    const ticketNumber = resolveLinkedTicketNumber(event);
    if (!ticketNumber) return null;
    return interpolate(labels.linkedTicket, {
      number: ticketNumber
    });
  })();
  const sameDay = !Number.isNaN(start.getTime()) && !Number.isNaN(new Date(endRaw).getTime()) && start.toDateString() === new Date(endRaw).toDateString();
  const scheduleDetail = sameDay && timeLine ? timeLine : durationLabel;
  const showExpandedDateRange = Boolean(expandedDateRange) && !(durationLabel && !sameDay);
  const expandedDetailItems = [showExpandedDateRange ? {
    icon: "mdi:calendar-range",
    text: expandedDateRange,
    key: "dates"
  } : null, scheduleDetail ? {
    icon: "mdi:clock-outline",
    text: scheduleDetail,
    key: "schedule"
  } : null, assigneeLabel ? {
    icon: "mdi:account-hard-hat",
    text: assigneeLabel,
    key: "agent"
  } : null, linkedTicketLabel ? {
    icon: "mdi:ticket-outline",
    text: linkedTicketLabel,
    key: "ticket"
  } : null].filter(Boolean).slice(0, 2);
  const titleNode = <span className={cardStyles.eventBookmarkTitle} title={titleTruncated ? undefined : titleFull}>
      {titleDisplay}
    </span>;
  return <button ref={buttonRef} type="button" className={`${styles.bookmark} ${cardStyles.eventBookmark} ${isRecent ? styles.bookmarkPast : ""} ${menuOpen ? `${styles.bookmarkMenuOpen} ${cardStyles.eventBookmarkMenuOpen}` : ""}`} style={{
    "--bookmark-accent": accent
  }} onClick={() => onClick?.(event)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label={interpolate(labels.formatEventAria, {
    title: eventTitle,
    when: whenLabel,
    type: typeLabel
  })}>
      <span className={cardStyles.eventBookmarkStack}>
        <span className={cardStyles.eventBookmarkCompact} aria-hidden>
          <span className={`${styles.bookmarkRibbon} ${cardStyles.eventBookmarkCompactRibbon}`}>
            <span className={`${styles.bookmarkDay} ${cardStyles.eventBookmarkCompactDay}`}>{ribbon.day}</span>
            <span className={`${styles.bookmarkMonth} ${cardStyles.eventBookmarkCompactMonth}`}>
              {ribbon.month}
              {ribbon.year ? ` ${ribbon.year}` : ""}
            </span>
          </span>
          <span className={cardStyles.eventBookmarkCompactMid}>
            <span className={cardStyles.eventBookmarkCompactRelativeSlot}>
              {relative ? <span className={cardStyles.eventBookmarkCompactRelative}>{relative}</span> : null}
            </span>
            <span className={cardStyles.eventBookmarkCompactTypeSlot} title={typeLabel}>
              <Icon icon={typeIcon} className={cardStyles.eventBookmarkCompactTypeIcon} aria-hidden />
            </span>
          </span>
          <span className={cardStyles.eventBookmarkCompactTimeSlot}>
            {compactPeriod?.kind === "range" ? <span className={cardStyles.eventBookmarkCompactPeriod}>
                <span className={cardStyles.eventBookmarkCompactPeriodLine}>{compactPeriod.startLabel}</span>
                <span className={cardStyles.eventBookmarkCompactPeriodArrow} aria-hidden>
                  →
                </span>
                <span className={cardStyles.eventBookmarkCompactPeriodLine}>{compactPeriod.endLabel}</span>
              </span> : compactPeriod?.label ? <span className={cardStyles.eventBookmarkCompactTime}>{compactPeriod.label}</span> : null}
          </span>
        </span>

        <span className={cardStyles.eventBookmarkExpanded}>
          <span className={cardStyles.eventBookmarkTop}>
            <span className={cardStyles.eventBookmarkTopMain}>
              <span className={`${styles.bookmarkRibbon} ${cardStyles.eventBookmarkRibbonExpanded}`} aria-hidden>
                <span className={`${styles.bookmarkDay} ${cardStyles.eventBookmarkRibbonDayExpanded}`}>
                  {ribbon.day}
                </span>
                <span className={`${styles.bookmarkMonth} ${cardStyles.eventBookmarkRibbonMonthExpanded}`}>
                  {ribbon.month}
                  {ribbon.year ? ` ${ribbon.year}` : ""}
                </span>
              </span>
              {relative ? <span className={cardStyles.eventBookmarkRelative}>{relative}</span> : null}
            </span>
          </span>
          {titleTruncated ? <SmartTooltip content={titleFull} className={cardStyles.eventBookmarkTitleWrap}>
              {titleNode}
            </SmartTooltip> : <span className={cardStyles.eventBookmarkTitleWrap}>{titleNode}</span>}
          <span className={cardStyles.eventBookmarkDetails}>
            {expandedDetailItems.map(item => <span key={item.key} className={cardStyles.eventBookmarkDetailRow}>
                <Icon icon={item.icon} className={cardStyles.eventBookmarkDetailIcon} aria-hidden />
                <span className={cardStyles.eventBookmarkDetailText}>{item.text}</span>
              </span>)}
          </span>
          <span className={cardStyles.eventBookmarkFoot}>
            <span className={cardStyles.eventBookmarkType} title={typeLabel}>
              <Icon icon={typeIcon} className={cardStyles.eventBookmarkTypeIcon} aria-hidden />
              <span>{typeLabel}</span>
            </span>
          </span>
        </span>
      </span>
    </button>;
}
function BookmarkSkeleton() {
  return <div className={`${styles.bookmarkSkeleton} ${cardStyles.eventBookmarkSkeleton}`} aria-hidden>
      <div className={styles.bookmarkSkeletonRibbon} />
      <div className={styles.bookmarkSkeletonLine} />
      <div className={`${styles.bookmarkSkeletonLine} ${styles.bookmarkSkeletonLineShort}`} />
    </div>;
}
function SectionLabel({
  icon,
  title,
  count,
  variant = "upcoming"
}) {
  return <div className={`${styles.sectionLabel} ${variant === "recent" ? styles.sectionLabelRecent : ""}`} aria-hidden>
      <Icon icon={icon} className={styles.sectionLabelIcon} />
      <span className={styles.sectionLabelTitle}>{title}</span>
      {count != null && <span className={styles.sectionLabelCount}>{count}</span>}
    </div>;
}
export default function UpcomingEventBookmarks({
  events = [],
  recentEvents = [],
  upcomingEvents,
  loading = false,
  typeLabels = {},
  labels: labelsProp,
  menuLabels = DEFAULT_MENU_LABELS,
  locale: localeProp,
  proFeatureLabel = "Company schedule",
  proFeatureKey = "planning",
  users = [],
  onEditEvent,
  onGoToPlanning,
  onAddEvent,
  onOpenPlanning,
  proLocked = false,
  inPageHero = false,
  collapseStorageKey = "veritas.heroBookmarks.enterpriseEvents.collapsed",
  defaultCollapsed = true
}) {
  const appLocale = useAppLocale();
  const locale = localeProp || appLocale;
  const labels = useMemo(() => ({
    ...DEFAULT_EVENT_BOOKMARK_LABELS,
    ...labelsProp
  }), [labelsProp]);
  const [actionMenu, setActionMenu] = useState(null);
  const bookmarkButtonRefs = useRef(new Map());
  const closeActionMenu = useCallback(() => {
    setActionMenu(null);
  }, []);
  const handleBookmarkClick = useCallback(event => {
    if (proLocked) {
      notifyProFeature(proFeatureLabel, proFeatureKey);
      return;
    }
    const anchorEl = bookmarkButtonRefs.current.get(String(event.id)) || null;
    setActionMenu(current => current?.event?.id === event.id ? null : {
      event,
      anchorEl
    });
  }, [proLocked, proFeatureLabel, proFeatureKey]);
  const registerBookmarkRef = useCallback((eventId, node) => {
    const key = String(eventId);
    if (node) {
      bookmarkButtonRefs.current.set(key, node);
    } else {
      bookmarkButtonRefs.current.delete(key);
    }
  }, []);
  const recent = proLocked ? [] : Array.isArray(recentEvents) ? recentEvents : [];
  const upcoming = proLocked ? [] : Array.isArray(upcomingEvents) ? upcomingEvents : Array.isArray(events) ? events : [];
  const trackRef = useRef(null);
  const [fade, setFade] = useState({
    left: false,
    right: false
  });
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
  }, [updateFade, loading, recent.length, upcoming.length]);
  const isEmpty = !proLocked && !loading && recent.length === 0 && upcoming.length === 0;
  const showLoading = !proLocked && loading;
  const showSections = proLocked || !showLoading && !isEmpty;
  const {
    collapsed,
    toggle
  } = useHeroBookmarkCollapse(collapseStorageKey, defaultCollapsed);
  const handleHeaderToggle = () => {
    toggle();
  };
  const panelSummary = useMemo(() => {
    if (proLocked) return <ProFeatureBadge variant="inline" className={styles.heroHeaderProBadge} />;
    if (showLoading) return labels.summaryLoading;
    if (isEmpty) return labels.summaryEmpty;
    return interpolate(labels.summaryCounts, {
      recent: String(recent.length),
      upcoming: String(upcoming.length)
    });
  }, [proLocked, showLoading, isEmpty, recent.length, upcoming.length, labels]);
  const handleOpenPlanning = () => {
    if (proLocked) {
      notifyProFeature(proFeatureLabel, proFeatureKey);
      return;
    }
    onOpenPlanning?.();
  };
  const handleAddEvent = () => {
    if (proLocked) {
      notifyProFeature(proFeatureLabel, proFeatureKey);
      return;
    }
    onAddEvent?.();
  };
  const bar = <div className={[inPageHero ? styles.barInPageHero : styles.bar, inPageHero ? styles.barInPageHeroShell : "", proLocked && !inPageHero ? styles.barInProPanel : ""].filter(Boolean).join(" ")} aria-label={labels.barAria}>
      <div className={styles.barInner}>
        <div className={[styles.trackWrap, fade.left ? styles.trackFadeLeft : "", fade.right ? styles.trackFadeRight : ""].filter(Boolean).join(" ")}>
          <div className={`${styles.track} ${cardStyles.eventBookmarksTrack}`} ref={trackRef}>
            {showLoading ? <>
                <SectionLabel icon="mdi:history" title={labels.sectionRecent} variant="recent" />
                <BookmarkSkeleton />
                <BookmarkSkeleton />
                <div className={styles.sectionDivider} />
                <SectionLabel icon="mdi:bookmark-multiple-outline" title={labels.sectionUpcoming} />
                <BookmarkSkeleton />
                <BookmarkSkeleton />
              </> : isEmpty ? <div className={styles.empty}>
                <Icon icon="mdi:calendar-blank-outline" aria-hidden />
                <span>{labels.empty}</span>
              </div> : showSections ? <>
                <SectionLabel icon="mdi:history" title={labels.sectionRecent} count={proLocked ? null : recent.length} variant="recent" />
                {recent.length === 0 ? <span className={styles.sectionEmptyHint}>{labels.noneRecent30Days}</span> : recent.map(event => <EventBookmark key={`recent-${event.id}`} event={event} typeLabels={typeLabels} labels={labels} locale={locale} users={users} mode="recent" menuOpen={actionMenu?.event?.id === event.id} buttonRef={node => registerBookmarkRef(event.id, node)} onClick={handleBookmarkClick} />)}

                <div className={styles.sectionDivider} aria-hidden />

                <SectionLabel icon="mdi:bookmark-multiple-outline" title={labels.sectionUpcoming} count={proLocked ? null : upcoming.length} />
                {upcoming.length === 0 ? <span className={styles.sectionEmptyHint}>{labels.noneUpcoming}</span> : upcoming.map(event => <EventBookmark key={`upcoming-${event.id}`} event={event} typeLabels={typeLabels} labels={labels} locale={locale} users={users} mode="upcoming" menuOpen={actionMenu?.event?.id === event.id} buttonRef={node => registerBookmarkRef(event.id, node)} onClick={handleBookmarkClick} />)}
              </> : null}
          </div>
        </div>

        <div className={styles.barActions}>
          <SmartTooltip content={proLocked ? labels.openPlanningProTooltip : labels.openPlanning}>
            <button type="button" className={styles.barActionBtn} onClick={handleOpenPlanning} aria-label={proLocked ? labels.openPlanningPro : labels.openPlanningAria}>
              <FaCalendarAlt aria-hidden />
            </button>
          </SmartTooltip>
          <SmartTooltip content={proLocked ? labels.createEventProTooltip : labels.createEvent}>
            <button type="button" className={`${styles.barActionBtn} ${styles.barActionBtnPrimary}`} onClick={handleAddEvent} aria-label={proLocked ? labels.createEventPro : labels.createEventAria}>
              <FaPlus aria-hidden />
            </button>
          </SmartTooltip>
        </div>
      </div>
    </div>;
  return <>
      {actionMenu ? <EventActionMenu anchorEl={actionMenu.anchorEl} event={actionMenu.event} labels={menuLabels} onEdit={onEditEvent} onGoToPlanning={onGoToPlanning} onClose={closeActionMenu} /> : null}
      {inPageHero ? <div className={[styles.heroBookmarkShell, styles.heroBookmarkShellInPageHero, collapsed ? styles.heroBookmarkShellCollapsed : ""].filter(Boolean).join(" ")} data-bookmarks-collapsed={collapsed ? "true" : "false"}>
          <HeroBookmarkCollapseHeader collapsed={collapsed} onToggle={handleHeaderToggle} icon="mdi:calendar-month-outline" title={labels.panelTitle} summary={panelSummary} expandAria={labels.expandPanelAria} collapseAria={labels.collapsePanelAria} />
          <div className={styles.barCollapsePanel} aria-hidden={collapsed}>
            <ProFeatureLock locked={proLocked} featureLabel={proFeatureLabel} featureKey={proFeatureKey} badgePosition="none" softLocked={proLocked}>
              {bar}
            </ProFeatureLock>
          </div>
        </div> : <div className={proLocked ? styles.barProPanel : undefined}>
          {proLocked ? <div className={styles.barProHeader}>
              <span className={styles.barProTitle}>{labels.planningPanelTitle}</span>
              <ProFeatureBadge variant="inline" />
            </div> : null}
          <ProFeatureLock locked={proLocked} featureLabel={proFeatureLabel} featureKey={proFeatureKey} badgePosition="none" softLocked={proLocked}>
            {bar}
          </ProFeatureLock>
        </div>}
    </>;
}
