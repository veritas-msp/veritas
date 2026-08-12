import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import moment from "moment";
import { Icon } from "@iconify/react";
import { getLinkedItemIcon } from "./planningEventFormConfig";
import { getTicketTypeSupportLabel, getTicketTypeIcon } from "../../utils/ticketReminderEvent";
import { resolveSalesTaskTicketLink, sanitizePlanningDescriptionForDisplay } from "../../utils/salesTaskPlanningEvent";
import { getAgentColor, getEventPrimaryAgentId } from "./planningAgentColors";
import { getPlanningEventId } from "./planningEventMove";
import styles from "./PlanningEventHoverCard.module.css";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { getPlanningEventHoverCardCopy } from "./planningEventHoverCardI18n";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useProfileAccess } from "../../hooks/useProfileAccess";
function hasHtmlContent(html) {
  return Boolean((html || "").replace(/<[^>]*>/g, "").trim());
}
function isRichHtml(html) {
  return /<[^>]+>/.test(html || "");
}
function inferAllDay(event) {
  if (event.schedule?.allDay === true) return true;
  if (event.schedule?.allDay === false) return false;
  if (!event.start || !event.end) return false;
  const start = moment(event.start);
  const end = moment(event.end);
  return start.format("HH:mm") === "00:00" && (end.format("HH:mm") === "23:59" || end.format("HH:mm") === "00:00");
}
function formatDateRange(event) {
  if (!event.start || !event.end) return "-";
  const start = moment(event.start);
  const end = moment(event.end);
  const allDay = inferAllDay(event);
  if (allDay) {
    if (start.isSame(end, "day")) {
      return start.format("dddd D MMMM YYYY");
    }
    return `${start.format("D MMM YYYY")} → ${end.format("D MMM YYYY")}`;
  }
  if (start.isSame(end, "day")) {
    return `${start.format("dddd D MMMM YYYY")} · ${start.format("HH:mm")} – ${end.format("HH:mm")}`;
  }
  return `${start.format("D MMM YYYY HH:mm")} → ${end.format("D MMM YYYY HH:mm")}`;
}
function formatTicketReminderTitle(event, copy) {
  const reminderTitle = (event.title || copy?.defaults?.reminder || "Reminder").trim();
  const ticketNumber = event.ticketNumber;
  if (ticketNumber) {
    return `#${ticketNumber} · ${reminderTitle}`;
  }
  return reminderTitle;
}
function DetailRow({
  icon,
  label,
  children,
  className = ""
}) {
  if (children == null || children === "" || children === false) return null;
  return <div className={`${styles.row} ${className}`.trim()}>
      <div className={styles.rowLabel}>
        {icon ? <Icon icon={icon} aria-hidden /> : null}
        <span>{label}</span>
      </div>
      <div className={styles.rowValue}>{children}</div>
    </div>;
}
function InteractiveValue({
  onClick,
  children
}) {
  if (!onClick) return children;
  return <button type="button" className={styles.linkValue} onClick={event => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  }}>
      {children}
    </button>;
}
function getPlanningEventLinks(event, onNavigate, {
  canOpenTicket = true,
  access = {}
} = {}) {
  const ticketLink = resolveSalesTaskTicketLink(event);
  const ticketId = ticketLink?.ticketId || event?.ticketId || null;
  const ticketNumber = ticketLink?.ticketNumber || event?.ticketNumber || null;
  const isSales = Boolean(
    ticketLink?.isSalesPmTask ||
      event?.isSalesPmTask ||
      event?.salesKind === "prestation" ||
      event?.salesKind === "installation" ||
      ticketLink?.kind === "prestation" ||
      ticketLink?.kind === "installation"
  );
  const hasTicketModuleAccess = isSales ? access.TicketSales !== false : access.Ticket !== false;
  const openTicket = ticketId && onNavigate && canOpenTicket && hasTicketModuleAccess ? () => {
    onNavigate(isSales ? "TicketSalesDetail" : "TicketDetail", {
      ticketId,
      ticketNumber,
      title: event.title,
      fromPage: isSales ? "TicketSales" : "Ticket"
    });
  } : null;
  const openClient = event.clientId && onNavigate ? () => {
    onNavigate("ContratDetail", {
      clientId: event.clientId,
      name: event.clientName
    });
  } : null;
  return {
    openTicket,
    openClient,
    ticketId,
    ticketNumber,
    isSales
  };
}
function getUserLabel(user, copy) {
  return user?.name || user?.nom || user?.username || user?.email || copy?.defaults?.user || "User";
}
function useAgentDropdownPosition(isOpen, anchorRef, {
  offset = 4,
  preferUp = false
} = {}) {
  const [style, setStyle] = useState(null);
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef?.current) {
      setStyle(null);
      return undefined;
    }
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const target = anchor.querySelector("input") || anchor;
      const rect = target.getBoundingClientRect();
      const minWidth = 180;
      const width = Math.max(rect.width, minWidth);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      const spaceBelow = window.innerHeight - rect.bottom - offset - 8;
      const spaceAbove = rect.top - offset - 8;
      const preferredHeight = 150;
      const openUp = preferUp || spaceBelow < preferredHeight + 8 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(96, Math.min(preferredHeight, openUp ? spaceAbove : spaceBelow));
      setStyle({
        position: "fixed",
        top: openUp ? rect.top - offset : rect.bottom + offset,
        left,
        width,
        maxHeight,
        transform: openUp ? "translateY(-100%)" : undefined,
        zIndex: 2147483647,
        pointerEvents: "auto"
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef, offset, preferUp]);
  return style;
}
function AgentSuggestDropdownPortal({
  isOpen,
  style,
  hasQuery,
  filteredUsers,
  highlight,
  assignedUserId,
  onHighlight,
  onPick,
  copy
}) {
  if (!isOpen || !style) return null;
  return createPortal(<div className={styles.agentSuggestDropdownPortal} style={style} role="listbox" data-planning-agent-dropdown>
      {!hasQuery ? <div className={styles.agentSuggestHint}>
          {copy?.assignee?.typeToSearch || "Type a character to search"}
        </div> : filteredUsers.length === 0 ? <div className={styles.agentSuggestHint}>
          {copy?.assignee?.noAgentFound || "No assignee found"}
        </div> : filteredUsers.map((user, index) => {
      const uid = String(user.id);
      const label = getUserLabel(user, copy);
      return <button key={user.id} type="button" role="option" aria-selected={highlight === index} className={`${styles.agentSuggestOption} ${highlight === index ? styles.agentSuggestOptionActive : ""} ${uid === assignedUserId ? styles.agentSuggestOptionCurrent : ""}`} onMouseEnter={() => onHighlight(index)} onMouseDown={mouseEvent => mouseEvent.preventDefault()} onClick={clickEvent => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        onPick(user);
      }}>
              <span className={styles.agentSuggestOptionDot} style={{
          backgroundColor: getAgentColor(user.id)
        }} aria-hidden />
              <span>{label}</span>
            </button>;
    })}
    </div>, document.body);
}
function AgentAssignField({
  event,
  users,
  onAssignAgent,
  disabled = false,
  copy
}) {
  const wrapRef = useRef(null);
  const suggestWrapRef = useRef(null);
  const inputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [search, setSearch] = useState("");
  const [assignedUserId, setAssignedUserId] = useState(() => getEventPrimaryAgentId(event) || "");
  const [assignedUserName, setAssignedUserName] = useState(() => event?.assignedUserName || "");
  const closeEditor = () => {
    setEditing(false);
    setOpen(false);
    setSearch("");
    setHighlight(0);
  };
  useEffect(() => {
    setAssignedUserId(getEventPrimaryAgentId(event) || "");
    setAssignedUserName(event?.assignedUserName || "");
    setEditing(false);
    setOpen(false);
    setSearch("");
    setHighlight(0);
  }, [event]);
  useEffect(() => {
    const onDocClick = docEvent => {
      if (wrapRef.current?.contains(docEvent.target)) return;
      if (docEvent.target.closest("[data-planning-agent-dropdown]")) return;
      closeEditor();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 1) return [];
    const pool = [...(users || [])].sort((a, b) => getUserLabel(a, copy).localeCompare(getUserLabel(b, copy), copy?.locale || "fr", {
      sensitivity: "base"
    }));
    return pool.filter(user => {
      const label = getUserLabel(user, copy).toLowerCase();
      const email = String(user.email || "").toLowerCase();
      return label.includes(query) || email.includes(query);
    }).slice(0, 12);
  }, [users, search, copy]);
  const pickUser = async user => {
    if (!user?.id || !onAssignAgent) return;
    const nextId = String(user.id);
    if (nextId === assignedUserId) {
      closeEditor();
      return;
    }
    setSaving(true);
    try {
      const result = await onAssignAgent(event, nextId);
      const label = getUserLabel(user, copy);
      if (result?.assignedUserId) {
        setAssignedUserId(String(result.assignedUserId));
        setAssignedUserName(result.assignedUserName || label);
      } else {
        setAssignedUserId(nextId);
        setAssignedUserName(label);
      }
      setSearch("");
      closeEditor();
    } finally {
      setSaving(false);
    }
  };
  const startEditing = pointerEvent => {
    pointerEvent.stopPropagation();
    if (disabled || saving) return;
    setEditing(true);
    setOpen(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };
  const handleInputChange = changeEvent => {
    changeEvent.stopPropagation();
    const value = changeEvent.target.value;
    setSearch(value);
    setHighlight(0);
    setOpen(true);
  };
  const handleFocus = focusEvent => {
    focusEvent.stopPropagation();
    setOpen(true);
    if (!search.trim()) {
      requestAnimationFrame(() => focusEvent.target.select());
    }
  };
  const handleKeyDown = keyEvent => {
    keyEvent.stopPropagation();
    if (keyEvent.key === "Escape") {
      closeEditor();
      return;
    }
    if (search.trim().length < 1) return;
    if (!open || filteredUsers.length === 0) return;
    if (keyEvent.key === "ArrowDown") {
      keyEvent.preventDefault();
      setHighlight(h => Math.min(h + 1, filteredUsers.length - 1));
    } else if (keyEvent.key === "ArrowUp") {
      keyEvent.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (keyEvent.key === "Enter") {
      keyEvent.preventDefault();
      const picked = filteredUsers[highlight];
      if (picked) pickUser(picked);
    }
  };
  const inputValue = search.length > 0 ? search : assignedUserName;
  const showDropdown = Boolean(users?.length) && editing && open && !saving;
  const hasQuery = search.trim().length >= 1;
  const dropdownStyle = useAgentDropdownPosition(showDropdown, suggestWrapRef, {
    preferUp: true
  });
  if (!users?.length) {
    return assignedUserName || "-";
  }
  return <div className={styles.agentAssignWrap} ref={wrapRef}>
      <span className={styles.agentAssignDot} style={{
      backgroundColor: getAgentColor(assignedUserId)
    }} aria-hidden />
      {!editing ? <button type="button" className={`${styles.agentDisplayBtn} ${!assignedUserName ? styles.agentDisplayBtnEmpty : ""}`} onClick={startEditing} disabled={disabled || saving} aria-label={copy?.assignee?.change || "Change assignee"}>
          {assignedUserName || copy?.assignee?.choose || "Choose…"}
        </button> : <div className={styles.agentSuggestWrap} ref={suggestWrapRef}>
          <input ref={inputRef} type="text" className={styles.agentSuggestInput} value={inputValue} onChange={handleInputChange} onFocus={handleFocus} onBlur={() => {
        window.setTimeout(() => {
          const active = document.activeElement;
          if (wrapRef.current?.contains(active)) return;
          if (active?.closest("[data-planning-agent-dropdown]")) return;
          closeEditor();
        }, 120);
      }} onKeyDown={handleKeyDown} onClick={clickEvent => clickEvent.stopPropagation()} disabled={disabled || saving} placeholder={copy?.assignee?.search || "Search…"} aria-label={copy?.assignee?.change || "Change assignee"} aria-expanded={showDropdown} aria-haspopup="listbox" autoComplete="off" />
          <AgentSuggestDropdownPortal isOpen={showDropdown} style={dropdownStyle} hasQuery={hasQuery} filteredUsers={filteredUsers} highlight={highlight} assignedUserId={assignedUserId} onHighlight={setHighlight} onPick={pickUser} copy={copy} />
        </div>}
      {saving ? <span className={styles.agentAssignSaving}>…</span> : null}
    </div>;
}
function CardFooter({
  isCampaign,
  onEdit,
  onClose,
  copy
}) {
  if (!onEdit) return null;
  return <div className={styles.footer}>
      {onClose ? <button type="button" className={styles.footerBtnSecondary} onClick={event => {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }}>
          {copy?.footer?.close || "Close"}
        </button> : null}
      <button type="button" className={styles.footerBtnPrimary} onClick={event => {
      event.preventDefault();
      event.stopPropagation();
      onEdit();
    }}>
        <Icon icon={isCampaign ? "mdi:arrow-right" : "mdi:pencil-outline"} aria-hidden />
        {isCampaign ? copy?.footer?.viewCampaign || "View campaign" : copy?.footer?.edit || "Edit"}
      </button>
    </div>;
}
function TicketReminderCard({
  event,
  scheduleDetails,
  hasDescription,
  description,
  onNavigate,
  onEdit,
  onClose,
  users,
  onAssignAgent,
  canAssignAgent,
  canOpenTicket,
  access,
  copy
}) {
  const {
    openTicket,
    openClient
  } = getPlanningEventLinks(event, onNavigate, {
    canOpenTicket,
    access
  });
  const ticketTypeLabel = getTicketTypeSupportLabel(event.ticketType);
  const ticketTypeIcon = getTicketTypeIcon(event.ticketType);
  return <div className={styles.card}>
      <div className={styles.header}>
        <span className={`${styles.typeBadge} ${styles.type_ticket_reminder}`}>
          <Icon icon={ticketTypeIcon} aria-hidden />
          {ticketTypeLabel}
        </span>
        <h4 className={styles.title}>
          <InteractiveValue onClick={openTicket}>
            {formatTicketReminderTitle(event, copy)}
          </InteractiveValue>
        </h4>
      </div>

      <div className={styles.body}>
        <DetailRow icon="mdi:clock-outline" label={copy?.labels?.date || "Date"}>
          {formatDateRange(event)}
          {scheduleDetails.length > 0 && <div className={styles.subValue}>{scheduleDetails.join(" · ")}</div>}
        </DetailRow>

        <DetailRow icon="mdi:office-building-outline" label={copy?.labels?.client || "Client"}>
          <InteractiveValue onClick={openClient}>
            {event.clientName}
          </InteractiveValue>
        </DetailRow>

        <DetailRow icon="mdi:account-group-outline" label={copy?.labels?.agent || "Agent"} className={styles.rowAgent}>
          {canAssignAgent && onAssignAgent ? <AgentAssignField event={event} users={users} onAssignAgent={onAssignAgent} copy={copy} /> : event.assignedUserName}
        </DetailRow>

        <DetailRow icon="mdi:calendar-plus" label={copy?.labels?.creation || "Created"}>
          {event.createdAt ? moment(event.createdAt).format("DD/MM/YYYY HH:mm") : null}
        </DetailRow>

        <DetailRow icon="mdi:calendar-edit" label={copy?.labels?.updated || "Updated"}>
          {event.updatedAt ? moment(event.updatedAt).format("DD/MM/YYYY HH:mm") : null}
        </DetailRow>

        {hasDescription && <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Icon icon="mdi:text-box-outline" aria-hidden />
              {copy?.labels?.description || "Description"}
            </div>
            {isRichHtml(description) ? <div className={styles.richText} dangerouslySetInnerHTML={{
          __html: sanitizeHtml(description)
        }} /> : <div className={styles.richText}>{description}</div>}
          </div>}
      </div>
      <CardFooter isCampaign={false} onEdit={onEdit} onClose={onClose} copy={copy} />
    </div>;
}
export default function PlanningEventHoverCard({
  event,
  onNavigate,
  onEdit,
  onClose,
  users = [],
  onAssignAgent,
  copy: copyProp
}) {
  const copy = copyProp || getPlanningEventHoverCardCopy("fr");
  const {
    can
  } = usePermissions();
  const {
    user
  } = useAuthContext();
  const access = useProfileAccess(user?.profile);
  const canOpenTicket = can("planning.open_ticket");
  const {
    openClient,
    openTicket,
    ticketId,
    ticketNumber
  } = getPlanningEventLinks(event || {}, onNavigate, {
    canOpenTicket,
    access
  });
  if (!event) return null;
  if (event.privacy_redacted) {
    const allDayRedacted = inferAllDay(event);
    return <div className={styles.card}>
        <div className={styles.header}>
          <span className={`${styles.typeBadge} ${styles.type_other || ""}`}>
            <Icon icon="mdi:calendar-lock-outline" aria-hidden />
            {copy.defaults.busy || "Busy"}
          </span>
          <h4 className={styles.title}>{copy.defaults.busy || "Busy"}</h4>
        </div>
        <div className={styles.body}>
          <DetailRow icon="mdi:clock-outline" label={copy.labels?.dates || copy.labels?.date || "Date"}>
            {formatDateRange(event)}
            {allDayRedacted ? <div className={styles.subValue}>{copy.schedule?.allDay}</div> : null}
          </DetailRow>
        </div>
        <CardFooter isCampaign={false} onEdit={undefined} onClose={onClose} copy={copy} />
      </div>;
  }
  const isCampaign = Boolean(event._isCampaign);
  const resolvedSalesLink = resolveSalesTaskTicketLink(event);
  const isTicketReminder = Boolean(event.isTicketReminder || (event.ticketId && !event.isSalesPmTask && !resolvedSalesLink?.isSalesPmTask));
  const canAssignAgent = Boolean(onAssignAgent && !isCampaign && getPlanningEventId(event));
  const hasTicketLink = Boolean(openTicket && (ticketId || ticketNumber));
  const ticketLabel = ticketNumber ? `#${ticketNumber}` : copy.labels.openTicket;
  const campaign = event._campaignData || {};
  const typeKey = event.resource || event.type || "other";
  const typeLabel = copy.getEventTypeLabel(typeKey);
  const allDay = inferAllDay(event);
  const linkedItems = Array.isArray(event.linkedItems) ? event.linkedItems : [];
  const todos = Array.isArray(event.todos) ? event.todos : [];
  const notes = Array.isArray(event.notes) ? event.notes : [];
  const description = sanitizePlanningDescriptionForDisplay(event.description);
  const hasDescription = hasHtmlContent(description);
  const scheduleDetails = [];
  if (allDay) {
    scheduleDetails.push(copy.schedule.allDay);
    if (event.schedule?.businessDaysOnly !== false) {
      scheduleDetails.push(copy.schedule.businessDaysOnly);
    }
    if (Number(event.schedule?.durationDays) > 0) {
      scheduleDetails.push(copy.formatDurationDays(event.schedule.durationDays));
    }
  }
  if (isTicketReminder && !isCampaign) {
    return <TicketReminderCard event={event} scheduleDetails={scheduleDetails} hasDescription={hasDescription} description={description} onNavigate={onNavigate} onEdit={onEdit} onClose={onClose} users={users} onAssignAgent={onAssignAgent} canAssignAgent={canAssignAgent} canOpenTicket={canOpenTicket} access={access} copy={copy} />;
  }
  return <div className={styles.card}>
      <div className={styles.header}>
        <span className={`${styles.typeBadge} ${styles[`type_${typeKey}`] || ""}`}>
          <Icon icon={isCampaign ? "mdi:shield-lock" : "mdi:calendar-text-outline"} aria-hidden />
          {typeLabel}
        </span>
        <h4 className={styles.title}>
          <InteractiveValue onClick={openTicket}>
            {event.title || copy.defaults.event}
          </InteractiveValue>
        </h4>
      </div>

      <div className={styles.body}>
        <DetailRow icon="mdi:clock-outline" label={copy.labels.dates}>
          {formatDateRange(event)}
          {scheduleDetails.length > 0 && <div className={styles.subValue}>{scheduleDetails.join(" · ")}</div>}
        </DetailRow>

        {event.clientName && <DetailRow icon="mdi:office-building-outline" label={copy.labels.client}>
            <InteractiveValue onClick={openClient}>
              {event.clientName}
            </InteractiveValue>
          </DetailRow>}

        {hasTicketLink && <DetailRow icon="mdi:ticket-outline" label={copy.labels.ticket}>
            <InteractiveValue onClick={openTicket}>
              {ticketLabel}
            </InteractiveValue>
          </DetailRow>}

        {(canAssignAgent || event.assignedUserName) && <DetailRow icon="mdi:account-group-outline" label={copy.labels.agent} className={styles.rowAgent}>
            {canAssignAgent ? <AgentAssignField event={event} users={users} onAssignAgent={onAssignAgent} copy={copy} /> : event.assignedUserName}
          </DetailRow>}

        {isCampaign && <>
            {campaign.status && <DetailRow icon="mdi:flag-outline" label={copy.labels.campaignStatus}>
                {copy.getCampaignStatusLabel(campaign.status)}
              </DetailRow>}
            {campaign.type && <DetailRow icon="mdi:shield-outline" label={copy.labels.campaignType}>
                {copy.getCampaignTypeLabel(campaign.type)}
              </DetailRow>}
            {typeof campaign.global_progress === "number" && <DetailRow icon="mdi:progress-check" label={copy.labels.progress}>
                {Math.round(campaign.global_progress)} %
              </DetailRow>}
          </>}

        {event.equipmentName && <DetailRow icon="mdi:server-outline" label={copy.labels.equipment}>
            {event.equipmentName}
          </DetailRow>}

        {event.serviceName && <DetailRow icon="mdi:cloud-outline" label={copy.labels.service}>
            {event.serviceName}
          </DetailRow>}

        {linkedItems.length > 0 && <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Icon icon="mdi:cube-outline" aria-hidden />
              {copy.formatLinkedObjects(linkedItems.length)}
            </div>
            <ul className={styles.objectList}>
              {linkedItems.map((item, index) => <li key={`${item.id}-${index}`} className={styles.objectItem}>
                  <Icon icon={getLinkedItemIcon(item)} aria-hidden />
                  <span className={styles.objectLabel}>{item.label || item.id}</span>
                  <span className={styles.objectMeta}>
                    {[item.type, item.group].filter(Boolean).join(" · ")}
                  </span>
                </li>)}
            </ul>
          </div>}

        {event.equipmentId && linkedItems.length === 0 && !event.equipmentName && !event.serviceName && <DetailRow icon="mdi:tag-outline" label={copy.labels.mainObject}>
            {String(event.equipmentId)}
          </DetailRow>}

        {event.creatorUserName && <DetailRow icon="mdi:account-edit-outline" label={copy.labels.createdBy}>
            {event.creatorUserName}
          </DetailRow>}

        {event.createdAt && <DetailRow icon="mdi:calendar-plus" label={copy.labels.creation}>
            {moment(event.createdAt).format("DD/MM/YYYY HH:mm")}
          </DetailRow>}

        {event.updatedAt && <DetailRow icon="mdi:calendar-edit" label={copy.labels.updated}>
            {moment(event.updatedAt).format("DD/MM/YYYY HH:mm")}
          </DetailRow>}

        {hasDescription && <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Icon icon="mdi:text-box-outline" aria-hidden />
              {copy.labels.description}
            </div>
            {isRichHtml(description) ? <div className={styles.richText} dangerouslySetInnerHTML={{
          __html: sanitizeHtml(description)
        }} /> : <div className={styles.richText}>{description}</div>}
          </div>}

        {todos.length > 0 && <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Icon icon="mdi:format-list-checks" aria-hidden />
              {copy.formatTodos(todos.filter(t => t.done).length, todos.length)}
            </div>
            <ul className={styles.todoList}>
              {todos.map(todo => <li key={todo.id || todo.text} className={`${styles.todoItem} ${todo.done ? styles.todoDone : ""}`} style={{
            "--todo-color": todo.color || "#15d1a0"
          }}>
                  <span className={styles.todoMark} aria-hidden />
                  <span>{todo.text}</span>
                </li>)}
            </ul>
          </div>}

        {notes.length > 0 && <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Icon icon="mdi:note-text-outline" aria-hidden />
              {copy.formatNotes(notes.length)}
            </div>
            <ul className={styles.noteList}>
              {notes.map(note => <li key={note.id || note.text} className={styles.noteItem}>
                  <p>{note.text}</p>
                  {note.createdAt && <span className={styles.noteDate}>
                      {moment(note.createdAt).format("DD/MM/YYYY HH:mm")}
                    </span>}
                </li>)}
            </ul>
          </div>}

        {!isCampaign && hasTicketLink ? null : !isCampaign && event.id ? (
          <DetailRow icon="mdi:identifier" label={copy.labels.reference}>
            #{event.id}
          </DetailRow>
        ) : null}
      </div>
      <CardFooter isCampaign={isCampaign} onEdit={onEdit} onClose={onClose} copy={copy} />
    </div>;
}
