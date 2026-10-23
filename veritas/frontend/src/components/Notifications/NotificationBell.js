import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { BellIcon } from "../Misc/Sidebar/lucideAnimated";
import { useNotifications } from "../../hooks/useNotifications";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { groupNotificationsByPriority, groupArchivedNotifications } from "../../utils/notificationGroups";
import { getNotificationBellCopy, formatNotificationRelativeTime } from "./notificationBellI18n";
import { interpolate } from "../../i18n/translate";
import { fetchTicket } from "../../api/tickets";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import styles from "./NotificationBell.module.css";
import { SIDEBAR_FLYOUT_GAP_PX } from "../../utils/sidebarFlyoutPosition";
function NotificationItem({
  item,
  onOpen,
  onArchive,
  sectionKey,
  archivingId,
  hideArchive,
  copy,
  locale
}) {
  const isArchiving = String(archivingId) === String(item.id);
  return <div className={`${styles.itemRow} ${item.isRead ? styles.itemRead : styles.itemUnread} ${isArchiving ? styles.itemArchiving : ""}`.trim()}>
      <button type="button" className={styles.itemMain} onClick={() => onOpen(item)}>
        <div className={styles.itemTop}>
          <span className={styles.itemTitle}>{item.title}</span>
          {!item.isRead ? <span className={styles.itemDot} aria-hidden /> : null}
        </div>
        {item.body ? <span className={styles.itemBody}>{item.body}</span> : null}
        <span className={styles.itemTime}>
          {formatNotificationRelativeTime(item.createdAt, copy, locale, {
          emphasizeDate: sectionKey === "history" || sectionKey === "archived"
        })}
        </span>
      </button>
      {!hideArchive ? <button type="button" className={styles.archiveBtn} onClick={event => {
      event.stopPropagation();
      onArchive(item);
    }} disabled={isArchiving} aria-label={copy.archiveItemAria} title={copy.archiveItemTitle}>
          <Icon icon={isArchiving ? "mdi:loading" : "mdi:archive-arrow-down-outline"} className={isArchiving ? styles.spin : undefined} />
        </button> : null}
    </div>;
}
export default function NotificationBell({
  onNavigate,
  isCollapsed,
  isMobile,
  isHorizontal = false,
  showIconTooltip,
  TooltipComponent,
  triggerClassName,
  triggerIconClassName,
  rootClassName
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getNotificationBellCopy(locale), [locale]);
  const [open, setOpen] = useState(false);
  const [fixedStyle, setFixedStyle] = useState(null);
  const [listMaxHeight, setListMaxHeight] = useState(520);
  const [archivingId, setArchivingId] = useState(null);
  const [archivingAll, setArchivingAll] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const {
    items,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    showArchived,
    setShowArchived,
    markRead,
    markAllRead,
    archive,
    archiveAll,
    loadMore
  } = useNotifications();
  // Rail vertical : panneau à droite. Barre horizontale : sous le trigger (sinon hors écran).
  // Rail vertical desktop : toujours à droite de la sidebar (comme le menu Compte).
  const openToRight = !isMobile && !isHorizontal;
  const sections = useMemo(() => showArchived ? groupArchivedNotifications(items, copy.sections) : groupNotificationsByPriority(items, copy.sections), [items, showArchived, copy.sections]);
  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !open) return;
    const rect = trigger.getBoundingClientRect();
    const width = 440;
    const gap = SIDEBAR_FLYOUT_GAP_PX;
    const pad = 8;
    const dropdownEl = dropdownRef.current;
    const estimatedHeight = dropdownEl?.offsetHeight || 480;
    const chromeHeight = 116;
    if (openToRight) {
      const maxList = Math.max(280, window.innerHeight - pad * 2 - chromeHeight);
      setListMaxHeight(Math.min(560, maxList));
      // Ancré juste à droite du bouton cloche (pas du bord du rail).
      let top = rect.top;
      if (top + estimatedHeight > window.innerHeight - pad) {
        top = window.innerHeight - pad - estimatedHeight;
      }
      top = Math.max(pad, top);
      let left = Math.round(rect.right + gap);
      left = Math.min(left, window.innerWidth - width - pad);
      left = Math.max(pad, left);
      setFixedStyle({
        position: "fixed",
        top,
        left,
        width,
        transform: "none",
        zIndex: 12000
      });
      return;
    }
    // Aligné à droite du trigger en horizontal (cloche près du bord droit).
    const preferredLeft = isHorizontal ? rect.right - width : rect.left;
    const left = Math.min(Math.max(pad, preferredLeft), window.innerWidth - width - pad);
    const spaceBelow = window.innerHeight - rect.bottom - gap - pad;
    const spaceAbove = rect.top - gap - pad;
    const openUpward = spaceBelow < Math.min(estimatedHeight, 400) && spaceAbove > spaceBelow;
    const maxList = Math.max(280, (openUpward ? spaceAbove : spaceBelow) - chromeHeight);
    setListMaxHeight(Math.min(560, maxList));
    if (openUpward) {
      setFixedStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + gap,
        left,
        width,
        zIndex: 12000
      });
      return;
    }
    setFixedStyle({
      position: "fixed",
      top: Math.min(rect.bottom + gap, window.innerHeight - estimatedHeight - pad),
      left,
      width,
      zIndex: 12000
    });
  }, [open, openToRight, isHorizontal]);
  useLayoutEffect(() => {
    if (!open) {
      setFixedStyle(null);
      setListMaxHeight(520);
      return undefined;
    }
    updateDropdownPosition();
    const frameId = requestAnimationFrame(() => updateDropdownPosition());
    const handleReflow = () => updateDropdownPosition();
    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [open, updateDropdownPosition, items.length, loading, hasMore, sections.length]);
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = event => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);
  const handleOpenNotification = async notification => {
    if (!notification?.isRead && notification?.id) {
      await markRead(notification.id);
    }
    setOpen(false);
    if (notification?.ticketId && onNavigate) {
      let family = String(notification.payload?.ticketFamily || "").toLowerCase();
      let ticketNumber =
        notification.payload?.ticketNumber ?? notification.payload?.ticket_number ?? null;
      let title = notification.payload?.ticketTitle || notification.title;
      // Prestations mis-routed to TicketDetail white-screen; resolve family when payload is missing/wrong.
      if (family !== "sales") {
        try {
          const ticket = await fetchTicket(notification.ticketId);
          if (isSalesTicket(ticket)) {
            family = "sales";
          } else {
            family = "support";
          }
          if (ticketNumber == null || String(ticketNumber).trim() === "") {
            ticketNumber = ticket?.ticket_number ?? ticket?.ticketNumber ?? null;
          }
          if (!title) title = ticket?.title || title;
        } catch {
          family = "support";
        }
      }
      const isSales = family === "sales";
      const page = isSales ? "TicketSalesDetail" : "TicketDetail";
      onNavigate(page, {
        ticketId: notification.ticketId,
        id: notification.ticketId,
        ticketNumber: ticketNumber != null && String(ticketNumber).trim() !== ""
          ? String(ticketNumber).trim().replace(/^#/, "")
          : undefined,
        title,
        ticketFamily: isSales ? "sales" : "support",
        fromPage: isSales ? "TicketSales" : "Ticket"
      });
    }
  };
  const handleArchiveNotification = async notification => {
    if (!notification?.id || archivingId) return;
    setArchivingId(notification.id);
    try {
      await archive(notification.id);
    } finally {
      setArchivingId(null);
    }
  };
  const handleArchiveAll = async () => {
    if (archivingAll || showArchived || items.length === 0) return;
    setArchivingAll(true);
    try {
      await archiveAll();
    } finally {
      setArchivingAll(false);
    }
  };
  const bellIconRef = useRef(null);
  const button = <button type="button" ref={triggerRef} className={`${triggerClassName || styles.trigger} ${open ? styles.triggerOpen : ""} ${!triggerClassName && (!isCollapsed || isMobile) ? styles.triggerExpanded : ""}`} onClick={() => setOpen(value => !value)} onMouseEnter={() => bellIconRef.current?.startAnimation?.()} onMouseLeave={() => bellIconRef.current?.stopAnimation?.()} aria-expanded={open} aria-haspopup="menu" aria-label={unreadCount > 0 ? interpolate(unreadCount > 1 ? copy.triggerUnreadAriaPlural : copy.triggerUnreadAria, {
    count: unreadCount
  }) : copy.triggerAria}>
      <BellIcon ref={bellIconRef} className={triggerIconClassName || styles.triggerIcon} size={20} />
      {unreadCount > 0 ? <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
    </button>;
  return <div className={`${styles.root} ${rootClassName || ""}`.trim()}>
      {showIconTooltip && TooltipComponent ? <TooltipComponent as="span" content={copy.title} className={styles.tooltipHost}>
          {button}
        </TooltipComponent> : button}

      {open && fixedStyle && createPortal(<div ref={dropdownRef} className={styles.dropdown} style={fixedStyle} role="menu" aria-label={copy.title}>
            <div className={styles.dropdownHeader}>
              <div className={styles.dropdownHeaderTop}>
                <span className={styles.dropdownTitle}>{copy.title}</span>
                <div className={styles.viewToggle} role="group" aria-label={copy.filterAria}>
                  <button type="button" className={`${styles.viewToggleBtn} ${!showArchived ? styles.viewToggleBtnActive : ""}`.trim()} onClick={() => setShowArchived(false)} aria-pressed={!showArchived}>
                    {copy.tabs.active}
                  </button>
                  <button type="button" className={`${styles.viewToggleBtn} ${showArchived ? styles.viewToggleBtnActive : ""}`.trim()} onClick={() => setShowArchived(true)} aria-pressed={showArchived}>
                    {copy.tabs.archived}
                  </button>
                </div>
              </div>
              {!showArchived && (unreadCount > 0 || items.length > 0) ? <div className={styles.dropdownHeaderActions}>
                  {!showArchived && unreadCount > 0 ? <span className={styles.unreadPill}>
                      {interpolate(unreadCount > 1 ? copy.unreadPillPlural : copy.unreadPill, {
              count: unreadCount
            })}
                    </span> : <span />}
                  <div className={styles.headerActionBtns}>
                    {unreadCount > 0 ? <button type="button" className={styles.headerActionBtn} onClick={() => markAllRead()}>
                        {copy.markAllRead}
                      </button> : null}
                    {items.length > 0 ? <button type="button" className={styles.headerActionBtn} onClick={handleArchiveAll} disabled={archivingAll}>
                        {archivingAll ? copy.archiving : copy.archiveAll}
                      </button> : null}
                  </div>
                </div> : null}
            </div>

            <div className={styles.list} style={{
        maxHeight: listMaxHeight
      }}>
              {loading && items.length === 0 ? <div className={styles.emptyState}>{copy.loading}</div> : items.length === 0 ? <div className={styles.emptyState}>
                  <div className={`${styles.emptyIconWrap} ${showArchived ? styles.emptyIconWrapMuted : ""}`.trim()} aria-hidden>
                    <Icon icon={showArchived ? "mdi:archive-outline" : "mdi:check-circle-outline"} className={styles.emptyIcon} />
                  </div>
                  <p className={styles.emptyTitle}>
                    {showArchived ? copy.emptyArchivedTitle : copy.emptyActiveTitle}
                  </p>
                  <p className={styles.emptyText}>
                    {showArchived ? copy.emptyArchivedText : copy.emptyActiveText}
                  </p>
                </div> : sections.map(section => <section key={section.key} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionTitle}>{section.label}</span>
                      <span className={styles.sectionCount}>{section.items.length}</span>
                    </div>
                    {section.items.map(item => <NotificationItem key={item.id} item={item} sectionKey={section.key} onOpen={handleOpenNotification} onArchive={handleArchiveNotification} archivingId={archivingId} hideArchive={showArchived} copy={copy} locale={locale} />)}
                  </section>)}
            </div>

            {hasMore ? <div className={styles.dropdownFooter}>
                <button type="button" className={styles.loadMoreBtn} onClick={() => loadMore()} disabled={loadingMore}>
                  {loadingMore ? copy.loading : showArchived ? copy.loadMoreArchived : copy.loadMoreHistory}
                </button>
              </div> : null}
          </div>, document.body)}
    </div>;
}
